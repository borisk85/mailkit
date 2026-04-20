"""Phase 3 — Gmail OAuth + Send-As + verification code intercept.

Самый рисковый этап:
- Send-As создается через API (работает).
- Gmail отсылает verification email с 9-значным кодом + ссылкой.
- ЧЕРЕЗ API можно только `sendAs.verify(verificationAddress)` — это повторная отправка письма,
  а не ввод кода. Завершение верификации требует клика по ссылке/ввода кода.
- Workaround #1: перехватить письмо, вытащить ссылку, сделать GET от имени юзера (cookies Gmail).
- Workaround #2: парсить 9-значный код и показывать юзеру — полуручной шаг.
Спайк проверяет оба подхода и честно фиксирует что сработало.
"""

import base64
import logging
import os
import re
import time
from typing import Optional

import requests
from google.auth.transport.requests import Request as GoogleRequest
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError


log = logging.getLogger(__name__)

SCOPES = [
    "https://www.googleapis.com/auth/gmail.settings.sharing",
    "https://www.googleapis.com/auth/gmail.settings.basic",
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.modify",
    "https://www.googleapis.com/auth/gmail.send",
]


def _client_config_from_env(client_id: str, client_secret: str) -> dict:
    return {
        "installed": {
            "client_id": client_id,
            "client_secret": client_secret,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
            "redirect_uris": ["http://localhost"],
        }
    }


def gmail_service(client_id: str, client_secret: str,
                  token_path: str = "token.json"):
    creds: Optional[Credentials] = None
    if os.path.exists(token_path):
        try:
            creds = Credentials.from_authorized_user_file(token_path, SCOPES)
        except Exception as e:
            log.warning(f"[PHASE 3] token.json unreadable ({e}), removing and re-auth")
            os.remove(token_path)
            creds = None

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(GoogleRequest())
        else:
            flow = InstalledAppFlow.from_client_config(
                _client_config_from_env(client_id, client_secret), SCOPES)
            creds = flow.run_local_server(port=0,
                                         prompt="consent", authorization_prompt_message="")
        with open(token_path, "w", encoding="utf-8") as f:
            f.write(creds.to_json())
        log.info(f"[PHASE 3] OAuth token saved to {token_path}")
    return build("gmail", "v1", credentials=creds, cache_discovery=False)


def create_send_as(svc, target_email: str, smtp: dict) -> dict:
    if not smtp.get("username") or not smtp.get("password"):
        raise RuntimeError("SMTP credentials missing — Send-As cannot be created")
    body = {
        "sendAsEmail": target_email,
        "displayName": target_email.split("@")[0].title(),
        "replyToAddress": target_email,
        "signature": "",
        "isPrimary": False,
        "treatAsAlias": True,
        "smtpMsa": {
            "host": smtp["host"],
            "port": int(smtp["port"]),
            "username": smtp["username"],
            "password": smtp["password"],
            "securityMode": "starttls",
        },
    }
    try:
        result = svc.users().settings().sendAs().create(userId="me", body=body).execute()
        log.info(f"[PHASE 3] Send-As created: {target_email} "
                f"(status={result.get('verificationStatus')})")
        return result
    except HttpError as e:
        err_text = str(e)
        if "alreadyExists" in err_text or (hasattr(e, "resp") and e.resp.status == 409) \
           or "duplicate" in err_text.lower():
            log.info(f"[PHASE 3] Send-As {target_email} already exists")
            return svc.users().settings().sendAs().get(
                userId="me", sendAsEmail=target_email).execute()
        raise


def _decode_parts(payload: dict) -> str:
    out = []
    stack = [payload]
    while stack:
        p = stack.pop()
        for sub in p.get("parts", []) or []:
            stack.append(sub)
        data = (p.get("body", {}) or {}).get("data")
        if data:
            try:
                out.append(base64.urlsafe_b64decode(data + "===").decode("utf-8", errors="ignore"))
            except Exception:
                pass
    return "\n".join(out)


def find_verification_message(svc, target_email: str, since_ts: int,
                              timeout_s: int = 180) -> Optional[dict]:
    """Ищет письмо от Gmail с кодом верификации Send-As для target_email.

    Gmail отправляет письмо с темой 'Gmail Confirmation - Send Mail as <email>'.
    Поскольку TARGET_EMAIL форвардится на FORWARD_TO, письмо приходит в inbox владельца.
    """
    queries = [
        f'subject:"Gmail Confirmation" {target_email} after:{since_ts}',
        f'from:noreply@google.com subject:Confirmation {target_email} after:{since_ts}',
        f'subject:"Send Mail as" {target_email} after:{since_ts}',
    ]
    deadline = time.time() + timeout_s
    attempts = 0
    while time.time() < deadline:
        attempts += 1
        for q in queries:
            resp = svc.users().messages().list(userId="me", q=q, maxResults=5).execute()
            msgs = resp.get("messages") or []
            if msgs:
                full = svc.users().messages().get(
                    userId="me", id=msgs[0]["id"], format="full").execute()
                log.info(f"[PHASE 3] verification email found (attempt {attempts}, query='{q[:60]}')")
                return full
        log.info(f"[PHASE 3] verification email not yet, polling... "
                f"(attempt {attempts}, remaining {int(deadline-time.time())}s)")
        time.sleep(10)
    log.warning(f"[PHASE 3] verification email NOT found within {timeout_s}s")
    return None


def extract_code_and_link(message: dict) -> dict:
    payload = message.get("payload", {})
    body = _decode_parts(payload)

    code_match = re.search(r"\b(\d{9})\b", body)
    link_match = re.search(r"https://mail[-\w]*\.google\.com/[^\s\"<>]+", body)

    headers = {h["name"].lower(): h["value"] for h in payload.get("headers", [])}
    subject = headers.get("subject", "")

    result = {
        "code": code_match.group(1) if code_match else None,
        "link": link_match.group(0) if link_match else None,
        "subject": subject,
        "body_snippet": body[:400].replace("\n", " "),
    }
    log.info(f"[PHASE 3] extracted: code={result['code']}, "
            f"has_link={bool(result['link'])}, subject='{subject}'")
    return result


def try_verify_via_link(link: str, creds_token: Optional[str] = None) -> bool:
    """Попытка завершить верификацию через GET на ссылку.

    Без cookies Gmail-сессии это скорее всего вернет login page, но попытаться стоит.
    """
    if not link:
        return False
    try:
        headers = {"User-Agent": "Mozilla/5.0 MailKit-Spike"}
        if creds_token:
            headers["Authorization"] = f"Bearer {creds_token}"
        r = requests.get(link, headers=headers, allow_redirects=True, timeout=20)
        log.info(f"[PHASE 3] verification link GET -> {r.status_code}, "
                f"final_url={r.url[:100]}")
        body_lower = r.text.lower()
        if "confirmation success" in body_lower or "you have successfully" in body_lower \
           or "verified" in body_lower:
            return True
        return False
    except Exception as e:
        log.warning(f"[PHASE 3] verification link GET failed: {e}")
        return False


def check_send_as_verified(svc, target_email: str) -> str:
    data = svc.users().settings().sendAs().get(
        userId="me", sendAsEmail=target_email).execute()
    status = data.get("verificationStatus", "unknown")
    log.info(f"[PHASE 3] current Send-As verificationStatus={status}")
    return status


def run_phase3(client_id: str, client_secret: str, target_email: str,
               smtp: dict, token_path: str = "token.json") -> dict:
    log.info("[PHASE 3] Gmail — start")
    svc = gmail_service(client_id, client_secret, token_path=token_path)

    since_ts = int(time.time())
    send_as = create_send_as(svc, target_email, smtp)

    status = check_send_as_verified(svc, target_email)
    if status == "accepted":
        log.info("[PHASE 3] Send-As already verified — done")
        return {"service": svc, "send_as": send_as, "verified": True,
                "code": None, "link": None, "status": status}

    msg = find_verification_message(svc, target_email, since_ts - 5, timeout_s=180)
    if not msg:
        log.warning("[PHASE 3] no verification email — partial success")
        return {"service": svc, "send_as": send_as, "verified": False,
                "code": None, "link": None, "status": status,
                "note": "verification email не пришел (форвард настроен, но письма нет в inbox)"}

    parsed = extract_code_and_link(msg)

    link_ok = try_verify_via_link(parsed["link"]) if parsed["link"] else False

    try:
        svc.users().settings().sendAs().verify(
            userId="me", sendAsEmail=target_email).execute()
        log.info("[PHASE 3] sendAs.verify triggered (requests re-send of verification email)")
    except HttpError as e:
        log.info(f"[PHASE 3] sendAs.verify returned: {e}")

    time.sleep(3)
    status = check_send_as_verified(svc, target_email)
    verified = status == "accepted"

    return {
        "service": svc, "send_as": send_as,
        "verified": verified, "status": status,
        "code": parsed["code"], "link": parsed["link"],
        "link_click_worked": link_ok,
        "note": ("Send-As auto-verified" if verified else
                 "код и ссылка извлечены из inbox; клик по ссылке без Gmail-cookies не завершает "
                 "верификацию. Юзер должен кликнуть ссылку в Gmail UI либо ввести код в Settings."),
    }
