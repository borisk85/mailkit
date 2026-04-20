"""MailKit feasibility spike — entry point.

Прогоняет 4 фазы: Cloudflare -> Brevo -> Gmail -> E2E test.
Логирует в stdout + spike.log.

Запуск:
    python spike.py

Единственная человеческая интеракция — OAuth в браузере при первом запуске
(и возможно клик по verification link в Gmail на Phase 3).
"""

import logging
import os
import sys
import traceback
from dataclasses import dataclass

from dotenv import load_dotenv


LOG_FILE = "spike.log"


def setup_logging() -> logging.Logger:
    logger = logging.getLogger()
    logger.setLevel(logging.INFO)

    for h in list(logger.handlers):
        logger.removeHandler(h)

    fmt = logging.Formatter("%(asctime)s %(levelname)s [%(name)s] %(message)s",
                            datefmt="%H:%M:%S")

    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, ValueError):
        pass

    sh = logging.StreamHandler(sys.stdout)
    sh.setFormatter(fmt)
    logger.addHandler(sh)

    fh = logging.FileHandler(LOG_FILE, mode="w", encoding="utf-8")
    fh.setFormatter(fmt)
    logger.addHandler(fh)

    logging.getLogger("urllib3").setLevel(logging.WARNING)
    logging.getLogger("googleapiclient").setLevel(logging.WARNING)
    logging.getLogger("google").setLevel(logging.WARNING)
    return logger


@dataclass
class Config:
    cf_token: str
    cf_zone_id: str
    brevo_api_key: str
    gmail_client_id: str
    gmail_client_secret: str
    domain: str
    target_email: str
    forward_to: str


def load_config() -> Config:
    load_dotenv()
    required = [
        "CLOUDFLARE_API_TOKEN", "CLOUDFLARE_ZONE_ID", "BREVO_API_KEY",
        "GMAIL_CLIENT_ID", "GMAIL_CLIENT_SECRET",
        "DOMAIN", "TARGET_EMAIL", "FORWARD_TO",
    ]
    missing = [k for k in required if not os.getenv(k)]
    if missing:
        print(f"FATAL: missing env vars: {', '.join(missing)}", file=sys.stderr)
        sys.exit(2)
    return Config(
        cf_token=os.environ["CLOUDFLARE_API_TOKEN"],
        cf_zone_id=os.environ["CLOUDFLARE_ZONE_ID"],
        brevo_api_key=os.environ["BREVO_API_KEY"],
        gmail_client_id=os.environ["GMAIL_CLIENT_ID"],
        gmail_client_secret=os.environ["GMAIL_CLIENT_SECRET"],
        domain=os.environ["DOMAIN"],
        target_email=os.environ["TARGET_EMAIL"],
        forward_to=os.environ["FORWARD_TO"],
    )


def main() -> int:
    log = setup_logging()
    cfg = load_config()

    log.info(f"MailKit spike: domain={cfg.domain}, "
            f"target={cfg.target_email}, forward={cfg.forward_to}")

    phase_results = {}
    failed_phase = None

    from modules import cloudflare, brevo, gmail, e2e

    try:
        cf_client = cloudflare.run_phase1(
            cfg.cf_token, cfg.cf_zone_id, cfg.domain,
            cfg.target_email, cfg.forward_to)
        phase_results["phase1"] = {"status": "ok"}
    except Exception as e:
        log.exception(f"[PHASE 1] FAILED: {e}")
        phase_results["phase1"] = {"status": "fail", "error": str(e)}
        failed_phase = 1

    phase2 = None
    if failed_phase is None:
        try:
            phase2 = brevo.run_phase2(cfg.brevo_api_key, cf_client, cfg.domain)
            dns_results = phase2.get("dns_results", [])
            phase_results["phase2"] = {
                "status": "ok" if phase2.get("verified") else "partial",
                "verified": phase2.get("verified"),
                "smtp_source": phase2.get("smtp", {}).get("source"),
                "dns_results": dns_results,
            }
        except Exception as e:
            log.exception(f"[PHASE 2] FAILED: {e}")
            phase_results["phase2"] = {"status": "fail", "error": str(e),
                                       "trace": traceback.format_exc()}
            failed_phase = 2

    if failed_phase is None:
        try:
            phase3 = gmail.run_phase3(
                cfg.gmail_client_id, cfg.gmail_client_secret,
                cfg.target_email, phase2["smtp"])
            phase_results["phase3"] = {
                "status": "ok" if phase3.get("verified") else "partial",
                "sendAs_status": phase3.get("status"),
                "code": phase3.get("code"),
                "link": phase3.get("link"),
                "note": phase3.get("note"),
            }
            if not phase3.get("verified"):
                log.warning("[PHASE 3] Send-As not auto-verified — см. phase3.note")
        except Exception as e:
            log.exception(f"[PHASE 3] FAILED: {e}")
            phase_results["phase3"] = {"status": "fail", "error": str(e)}
            failed_phase = 3

    if failed_phase is None and phase_results["phase3"]["status"] == "ok":
        try:
            phase4 = e2e.run_phase4(phase3["service"], cfg.target_email, cfg.forward_to)
            auth = phase4.get("auth") or {}
            all_pass = auth.get("spf_pass") and auth.get("dkim_pass") and auth.get("dmarc_pass")
            phase_results["phase4"] = {
                "status": "ok" if phase4.get("arrived") and all_pass else "partial",
                "arrived": phase4.get("arrived"),
                "auth": auth,
            }
        except Exception as e:
            log.exception(f"[PHASE 4] FAILED: {e}")
            phase_results["phase4"] = {"status": "fail", "error": str(e)}
            failed_phase = 4
    elif failed_phase is None:
        log.warning("[PHASE 4] SKIPPED — Send-As not verified, E2E test невозможен")
        phase_results["phase4"] = {"status": "skipped",
                                   "reason": "Send-As not verified in Phase 3"}

    log.info("=" * 60)
    log.info("SUMMARY")
    log.info("=" * 60)
    for phase_name, res in phase_results.items():
        status = res.get("status", "?")
        mark = {"ok": "OK", "partial": "PARTIAL", "fail": "FAIL",
                "skipped": "SKIP"}.get(status, "?")
        log.info(f"  {phase_name}: {mark} {res}")

    if failed_phase:
        log.error(f"FAIL: blocked at Phase {failed_phase}")
        print(f"\nBLOCKED at Phase {failed_phase}", file=sys.stderr)
        return 1

    all_ok = all(r.get("status") == "ok" for r in phase_results.values())
    if all_ok:
        log.info("SUCCESS: all phases green")
        return 0
    log.warning("PARTIAL: spike complete with warnings (см. SUMMARY)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
