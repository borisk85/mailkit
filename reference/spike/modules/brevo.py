"""Phase 2 — Brevo sender domain + DKIM + brevo_code DNS + SMTP credentials."""

import logging
import os
import time
from typing import Optional

import requests
from tenacity import retry, stop_after_attempt, wait_fixed


log = logging.getLogger(__name__)

BREVO_BASE = "https://api.brevo.com/v3"
SMTP_HOST = "smtp-relay.brevo.com"
SMTP_PORT = 587


class BrevoError(RuntimeError):
    pass


class BrevoClient:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.s = requests.Session()
        self.s.headers.update({
            "api-key": api_key,
            "accept": "application/json",
            "content-type": "application/json",
        })

    @retry(stop=stop_after_attempt(3), wait=wait_fixed(2), reraise=True)
    def _req(self, method: str, path: str, **kw) -> requests.Response:
        url = f"{BREVO_BASE}{path}"
        r = self.s.request(method, url, timeout=30, **kw)
        if r.status_code >= 500:
            raise BrevoError(f"{method} {path} -> {r.status_code}: {r.text[:300]}")
        return r

    def get_account(self) -> dict:
        """GET /v3/account — содержит email аккаунта для SMTP username."""
        r = self._req("GET", "/account")
        if not r.ok:
            raise BrevoError(f"get_account failed: {r.status_code} {r.text[:200]}")
        return r.json()

    def get_domain(self, domain: str) -> Optional[dict]:
        r = self._req("GET", f"/senders/domains/{domain}")
        if r.status_code == 404:
            return None
        if not r.ok:
            raise BrevoError(f"get_domain failed: {r.status_code} {r.text[:200]}")
        return r.json()

    def create_domain(self, domain: str) -> dict:
        r = self._req("POST", "/senders/domains", json={"name": domain})
        if r.status_code in (200, 201):
            data = r.json()
            log.info(f"[PHASE 2] domain {domain} created in Brevo")
            return data
        if r.status_code == 400 and "already" in r.text.lower():
            log.info(f"[PHASE 2] domain {domain} already in Brevo")
            existing = self.get_domain(domain)
            if existing:
                return existing
        raise BrevoError(f"create_domain failed: {r.status_code} {r.text[:300]}")

    def authenticate(self, domain: str) -> dict:
        r = self._req("PUT", f"/senders/domains/{domain}/authenticate")
        if r.ok:
            log.info(f"[PHASE 2] authenticate triggered for {domain}")
            return r.json() if r.text else {}
        log.warning(f"[PHASE 2] authenticate returned {r.status_code}: {r.text[:200]}")
        return {}

    def wait_verified(self, domain: str, interval_s: int = 15,
                      timeout_s: int = 300) -> bool:
        deadline = time.time() + timeout_s
        attempts = 0
        while time.time() < deadline:
            attempts += 1
            try:
                self.authenticate(domain)
            except BrevoError as e:
                log.warning(f"[PHASE 2] authenticate error (attempt {attempts}): {e}")
            data = self.get_domain(domain) or {}
            verified = bool(data.get("verified") or data.get("authenticated"))
            dns = data.get("dns_records") or {}

            def _status(key: str):
                rec = dns.get(key)
                if isinstance(rec, dict):
                    return rec.get("status")
                return None

            dkim1 = _status("dkim1Record")
            dkim2 = _status("dkim2Record")
            code_ok = _status("brevo_code")
            log.info(f"[PHASE 2] poll #{attempts}: verified={verified}, "
                    f"dkim1={dkim1}, dkim2={dkim2}, brevo_code={code_ok}")
            if verified:
                return True
            time.sleep(interval_s)
        log.warning(f"[PHASE 2] domain not verified within {timeout_s}s (DNS propagation)")
        return False


def _full_host(host_name: str, domain: str) -> str:
    """Нормализует host_name в FQDN для Cloudflare.

    Brevo возвращает host_name в нескольких форматах в разных полях:
    - "@" — корень домена
    - "" — корень домена
    - "mail._domainkey." — префикс с точкой
    - "mail._domainkey" — относительный префикс без точки
    - "mail._domainkey.mycompany.com" — уже FQDN
    """
    host_name = (host_name or "").strip()
    if not host_name or host_name == "@":
        return domain
    host_name = host_name.rstrip(".")
    if host_name == domain or host_name.endswith(f".{domain}"):
        return host_name
    return f"{host_name}.{domain}"


BREVO_DNS_KEYS = (
    "dkim_record", "dkim1Record", "dkim2Record", "brevo_code",
)


def apply_dns_to_cloudflare(cf_client, brevo_data: dict, domain: str) -> list:
    """Записать Brevo DKIM (dkim1/dkim2 новый формат) + brevo_code в Cloudflare.

    dmarc_record из Brevo намеренно пропускаем — Cloudflare добавил DMARC в Phase 1
    (дубль не нужен, и наш DMARC policy лучше сконфигурирован).

    Возвращает список результатов по каждой записи. Ошибки ловятся per-record —
    одна плохая запись не должна ронять всю фазу.
    """
    dns = (brevo_data or {}).get("dns_records") or {}
    log.info(f"[PHASE 2] Brevo DNS payload keys: {list(dns.keys())}")
    results = []

    for rec_key in BREVO_DNS_KEYS:
        rec = dns.get(rec_key)
        if not isinstance(rec, dict):
            continue
        value = rec.get("value")
        if not value:
            log.info(f"[PHASE 2] {rec_key} empty (legacy field?), skipping")
            continue
        raw_host = rec.get("host_name", "")
        host = _full_host(raw_host, domain)
        type_ = (rec.get("type") or "TXT").upper()
        log.info(f"[PHASE 2] add {rec_key}: type={type_} raw_host='{raw_host}' "
                f"-> host='{host}' value_len={len(value)}")
        try:
            cf_client.add_dns(type_, host, value, comment=f"MailKit Brevo {rec_key}")
            results.append({"key": rec_key, "status": "ok", "host": host, "type": type_})
        except Exception as e:
            log.error(f"[PHASE 2] failed to add {rec_key} ({host}): {e}")
            results.append({"key": rec_key, "status": "fail",
                           "host": host, "type": type_, "error": str(e)})
    return results


def smtp_credentials(client: "BrevoClient") -> dict:
    """SMTP credentials для Brevo relay.

    Brevo не отдает SMTP key через API — только через UI. Если юзер заранее положил
    BREVO_SMTP_LOGIN + BREVO_SMTP_KEY в .env, используем их. Иначе берем email
    Brevo-аккаунта (GET /v3/account) + API key как пароль — это работает для
    relay в Brevo (historically master SMTP password = API key).
    """
    user = os.getenv("BREVO_SMTP_LOGIN", "").strip()
    passw = os.getenv("BREVO_SMTP_KEY", "").strip()
    if user and passw:
        log.info("[PHASE 2] SMTP creds source: env (BREVO_SMTP_LOGIN/KEY)")
        return {
            "host": SMTP_HOST, "port": SMTP_PORT,
            "username": user, "password": passw, "source": "env",
        }
    try:
        account = client.get_account()
        email = account.get("email") or ""
        if not email:
            raise BrevoError("account.email empty")
        api_key = os.getenv("BREVO_API_KEY", "")
        log.info(f"[PHASE 2] SMTP creds source: fallback (account.email={email}, password=API key)")
        return {
            "host": SMTP_HOST, "port": SMTP_PORT,
            "username": email, "password": api_key,
            "source": "fallback-account-email",
        }
    except Exception as e:
        log.error(f"[PHASE 2] could not fetch account email: {e}")
        raise


def run_phase2(api_key: str, cf_client, domain: str) -> dict:
    """Возвращает dict: {domain_data, smtp, verified}."""
    log.info("[PHASE 2] Brevo — start")
    client = BrevoClient(api_key)

    existing = client.get_domain(domain)
    if existing:
        log.info(f"[PHASE 2] domain {domain} found in Brevo (verified={existing.get('verified')})")
        data = existing
    else:
        data = client.create_domain(domain)

    dns_results = apply_dns_to_cloudflare(cf_client, data, domain)

    verified = client.wait_verified(domain, interval_s=15, timeout_s=300)

    smtp = smtp_credentials(client)

    log.info("[PHASE 2] Brevo — done")
    return {"domain_data": data, "smtp": smtp, "verified": verified,
            "dns_results": dns_results}
