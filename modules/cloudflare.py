"""Phase 1 — Cloudflare Email Routing + DNS records."""

import logging
from typing import Optional

import requests
from tenacity import retry, stop_after_attempt, wait_fixed


log = logging.getLogger(__name__)

CF_BASE = "https://api.cloudflare.com/client/v4"
MX_HOSTS = [
    ("route1.mx.cloudflare.net", 3),
    ("route2.mx.cloudflare.net", 23),
    ("route3.mx.cloudflare.net", 54),
]


class CloudflareError(RuntimeError):
    pass


class CloudflareClient:
    def __init__(self, token: str, zone_id: str, domain: str):
        self.token = token
        self.zone_id = zone_id
        self.domain = domain
        self.s = requests.Session()
        self.s.headers.update({
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        })

    @retry(stop=stop_after_attempt(3), wait=wait_fixed(2), reraise=True)
    def _req(self, method: str, path: str, **kw) -> dict:
        url = f"{CF_BASE}{path}"
        r = self.s.request(method, url, timeout=30, **kw)
        if r.status_code >= 500:
            raise CloudflareError(f"{method} {path} -> {r.status_code}: {r.text[:300]}")
        try:
            data = r.json()
        except ValueError:
            raise CloudflareError(f"non-JSON response: {r.text[:200]}")
        if not r.ok and data.get("success") is False:
            errs = data.get("errors", [])
            raise CloudflareError(f"{method} {path} -> {r.status_code}: {errs}")
        return data

    # ---- email routing ----

    def enable_routing(self) -> dict:
        try:
            r = self._req("POST", f"/zones/{self.zone_id}/email/routing/enable")
            log.info("[PHASE 1] enable email routing — OK")
            return r.get("result", {})
        except CloudflareError as e:
            if "already" in str(e).lower() or "10000" in str(e):
                log.info("[PHASE 1] enable email routing — already enabled")
                return {}
            raise

    def routing_status(self) -> dict:
        r = self._req("GET", f"/zones/{self.zone_id}/email/routing")
        return r.get("result", {}) or {}

    # ---- destination address ----

    def _account_id(self) -> str:
        r = self._req("GET", "/accounts")
        accounts = r.get("result", [])
        if not accounts:
            raise CloudflareError("no accounts visible to token")
        return accounts[0]["id"]

    def ensure_destination(self, email: str) -> dict:
        account_id = self._account_id()
        list_resp = self._req("GET",
                             f"/accounts/{account_id}/email/routing/addresses",
                             params={"per_page": 50})
        for addr in list_resp.get("result", []) or []:
            if addr.get("email") == email:
                verified = addr.get("verified") is not None
                log.info(f"[PHASE 1] destination {email} exists (verified={verified})")
                return addr
        created = self._req("POST",
                           f"/accounts/{account_id}/email/routing/addresses",
                           json={"email": email})
        log.info(f"[PHASE 1] destination {email} created — verification email sent")
        log.warning(f"[PHASE 1] USER ACTION: click verify link in {email} inbox")
        return created.get("result", {})

    # ---- routing rule ----

    def ensure_rule(self, target_email: str, forward_to: str) -> dict:
        rules = self._req("GET", f"/zones/{self.zone_id}/email/routing/rules",
                         params={"per_page": 50})
        for rule in rules.get("result", []) or []:
            for m in rule.get("matchers", []):
                if m.get("value") == target_email:
                    log.info(f"[PHASE 1] routing rule for {target_email} exists")
                    return rule
        payload = {
            "name": f"MailKit: {target_email}",
            "enabled": True,
            "priority": 50,
            "matchers": [{"type": "literal", "field": "to", "value": target_email}],
            "actions": [{"type": "forward", "value": [forward_to]}],
        }
        r = self._req("POST", f"/zones/{self.zone_id}/email/routing/rules", json=payload)
        log.info(f"[PHASE 1] routing rule created: {target_email} -> {forward_to}")
        return r.get("result", {})

    # ---- DNS ----

    def list_dns(self, type_: Optional[str] = None, name: Optional[str] = None) -> list:
        params = {"per_page": 100}
        if type_:
            params["type"] = type_
        if name:
            params["name"] = name
        r = self._req("GET", f"/zones/{self.zone_id}/dns_records", params=params)
        return r.get("result", []) or []

    def add_dns(self, type_: str, name: str, content: str,
                priority: Optional[int] = None, comment: str = "MailKit") -> dict:
        existing = self.list_dns(type_=type_, name=name)
        for rec in existing:
            if rec.get("content") == content:
                log.info(f"[PHASE 1] DNS {type_} {name} already exists")
                return rec
        payload = {"type": type_, "name": name, "content": content, "ttl": 1,
                   "comment": comment}
        if priority is not None:
            payload["priority"] = priority
        r = self._req("POST", f"/zones/{self.zone_id}/dns_records", json=payload)
        log.info(f"[PHASE 1] DNS added: {type_} {name} -> {content[:70]}")
        return r.get("result", {})

    def ensure_mx_records(self) -> None:
        for host, prio in MX_HOSTS:
            self.add_dns("MX", self.domain, host, priority=prio, comment="Cloudflare Email Routing")

    def ensure_spf(self, merge_brevo: bool = True) -> dict:
        """SPF TXT — пытаемся мерджить если уже есть запись v=spf1."""
        txt_records = self.list_dns(type_="TXT", name=self.domain)
        spf_existing = None
        for rec in txt_records:
            content = rec.get("content", "").strip('"')
            if content.startswith("v=spf1"):
                spf_existing = rec
                break
        desired = "v=spf1 include:spf.brevo.com ~all"
        if spf_existing:
            content = spf_existing["content"].strip('"')
            if "include:spf.brevo.com" in content:
                log.info("[PHASE 1] SPF already includes spf.brevo.com")
                return spf_existing
            if merge_brevo:
                parts = content.split()
                new_parts = []
                for p in parts:
                    if p.startswith("v=spf1"):
                        new_parts.append(p)
                        new_parts.append("include:spf.brevo.com")
                    elif p in ("~all", "-all", "+all", "?all"):
                        continue
                    else:
                        new_parts.append(p)
                new_parts.append("~all")
                merged = " ".join(new_parts)
                r = self._req("PUT",
                             f"/zones/{self.zone_id}/dns_records/{spf_existing['id']}",
                             json={"type": "TXT", "name": self.domain, "content": merged,
                                   "ttl": 1, "comment": "MailKit SPF merged"})
                log.info(f"[PHASE 1] SPF merged: {merged}")
                return r.get("result", {})
        return self.add_dns("TXT", self.domain, desired, comment="MailKit SPF")

    def ensure_dmarc(self, target_email: str) -> dict:
        name = f"_dmarc.{self.domain}"
        existing = self.list_dns(type_="TXT", name=name)
        for rec in existing:
            if rec.get("content", "").startswith("\"v=DMARC1") or \
               rec.get("content", "").startswith("v=DMARC1"):
                log.info(f"[PHASE 1] DMARC already exists at {name}")
                return rec
        content = f"v=DMARC1; p=none; rua=mailto:{target_email}"
        return self.add_dns("TXT", name, content, comment="MailKit DMARC")

    def add_dkim(self, host: str, value: str, type_: str = "TXT") -> dict:
        """Прописать DKIM от Brevo."""
        if not host.endswith(self.domain):
            if not host.endswith("."):
                host = f"{host}.{self.domain}" if "." not in host else host
        return self.add_dns(type_, host, value, comment="MailKit Brevo DKIM")


def run_phase1(token: str, zone_id: str, domain: str,
              target_email: str, forward_to: str) -> CloudflareClient:
    log.info("[PHASE 1] Cloudflare — start")
    cf = CloudflareClient(token, zone_id, domain)
    cf.enable_routing()
    cf.ensure_destination(forward_to)
    cf.ensure_mx_records()
    cf.ensure_spf()
    cf.ensure_dmarc(target_email)
    cf.ensure_rule(target_email, forward_to)
    log.info("[PHASE 1] Cloudflare — done")
    return cf
