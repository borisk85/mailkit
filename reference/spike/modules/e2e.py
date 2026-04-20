"""Phase 4 — end-to-end test: send from TARGET_EMAIL, poll FORWARD_TO inbox, verify headers."""

import base64
import logging
import time
import uuid
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

from googleapiclient.errors import HttpError


log = logging.getLogger(__name__)


def build_raw_message(target_email: str, forward_to: str, subject: str, body: str) -> str:
    msg = MIMEMultipart("alternative")
    msg["From"] = target_email
    msg["To"] = forward_to
    msg["Subject"] = subject
    msg.attach(MIMEText(body, "plain", "utf-8"))
    return base64.urlsafe_b64encode(msg.as_bytes()).decode()


def send_test(svc, target_email: str, forward_to: str) -> dict:
    token = uuid.uuid4().hex
    subject = f"MailKit spike {token}"
    body = f"MailKit feasibility test. Token: {token}\nSent from: {target_email}"
    raw = build_raw_message(target_email, forward_to, subject, body)
    try:
        result = svc.users().messages().send(userId="me", body={"raw": raw}).execute()
        log.info(f"[PHASE 4] test email sent: id={result.get('id')}, token={token}")
        return {"token": token, "subject": subject, "message_id": result.get("id")}
    except HttpError as e:
        log.error(f"[PHASE 4] send failed: {e}")
        raise


def poll_inbox(svc, subject: str, since_ts: int, timeout_s: int = 180) -> Optional[dict]:
    deadline = time.time() + timeout_s
    query = f'subject:"{subject}" after:{since_ts}'
    attempts = 0
    while time.time() < deadline:
        attempts += 1
        resp = svc.users().messages().list(userId="me", q=query, maxResults=3).execute()
        msgs = resp.get("messages") or []
        if msgs:
            log.info(f"[PHASE 4] test email arrived (attempt {attempts})")
            return svc.users().messages().get(
                userId="me", id=msgs[0]["id"], format="full").execute()
        log.info(f"[PHASE 4] waiting for test email... "
                f"(attempt {attempts}, remaining {int(deadline-time.time())}s)")
        time.sleep(10)
    log.warning(f"[PHASE 4] test email NOT received within {timeout_s}s")
    return None


def parse_headers(message: dict) -> dict:
    payload = message.get("payload", {})
    headers = {h["name"]: h["value"] for h in payload.get("headers", [])}
    return headers


def extract_auth_results(headers: dict) -> dict:
    """Парсит Authentication-Results / ARC-Authentication-Results для spf/dkim/dmarc."""
    ar = headers.get("Authentication-Results") or \
         headers.get("ARC-Authentication-Results", "")
    ar_l = ar.lower()
    out = {
        "raw": ar,
        "spf_pass": "spf=pass" in ar_l,
        "dkim_pass": "dkim=pass" in ar_l,
        "dmarc_pass": "dmarc=pass" in ar_l,
    }
    log.info(f"[PHASE 4] auth: spf={out['spf_pass']} dkim={out['dkim_pass']} "
            f"dmarc={out['dmarc_pass']}")
    return out


def run_phase4(svc, target_email: str, forward_to: str) -> dict:
    log.info("[PHASE 4] E2E — start")
    since_ts = int(time.time()) - 5
    sent = send_test(svc, target_email, forward_to)
    arrived = poll_inbox(svc, sent["subject"], since_ts, timeout_s=180)
    if not arrived:
        log.error("[PHASE 4] test email did not arrive in forward inbox")
        return {"sent": sent, "arrived": False, "auth": None}
    headers = parse_headers(arrived)
    auth = extract_auth_results(headers)
    log.info("[PHASE 4] E2E — done")
    return {"sent": sent, "arrived": True, "auth": auth,
            "headers_snippet": {k: headers.get(k) for k in
                               ("From", "To", "Subject", "Authentication-Results",
                                "ARC-Authentication-Results", "Received-SPF")}}
