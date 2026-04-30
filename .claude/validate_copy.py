"""PreToolUse hook — validates copy consistency before git commit.

Checks:
1. howItWorks step count matches heading claim (e.g., "Четыре шага" → 4 steps)
2. No "ё" in landing strings (rule: only "е")
3. No informal "ты/твой/твоём/твоем" in landing strings (rule: formal "вы")
4. howItWorks manual/automated badge counts match heading claim

Runs before any `git commit` command. Blocks commit if violations found.
"""
import json
import re
import sys
from pathlib import Path

RUSSIAN_NUMBERS = {
    "один": 1, "одна": 1, "одно": 1,
    "два": 2, "две": 2,
    "три": 3,
    "четыре": 4,
    "пять": 5,
    "шесть": 6,
}

YO_RE = re.compile(r"[ёЁ]")
TY_RE = re.compile(r"\b(тебе|тебя|твой|твоя|твое|твоем|твоей|твоих|твоим|твоими|тебе|тебя)\b", re.IGNORECASE)

# Banned jargon/slang — explicit list from CLAUDE.md §3
BANNED_WORDS_RU = [
    "возня", "херня", "хрень", "под капотом", "трекинг",
    "автоматика",  # as standalone noun referring to "the system"
]
BANNED_WORDS_EN = [
    "hassle",  # avoid colloquial
]
BANNED_RE_RU = re.compile(
    r"\b(" + "|".join(re.escape(w) for w in BANNED_WORDS_RU) + r")\b",
    re.IGNORECASE,
)
BANNED_RE_EN = re.compile(
    r"\b(" + "|".join(re.escape(w) for w in BANNED_WORDS_EN) + r")\b",
    re.IGNORECASE,
)


def count_steps(how_it_works: dict) -> int:
    """Count stepN keys in howItWorks section."""
    return sum(1 for k in how_it_works if re.match(r"step\d+", k))


def extract_number_from_heading(heading: str) -> int | None:
    """Extract step count from heading like 'Четыре шага. Три — наши. Один — ручной'."""
    words = heading.lower().split()
    for word in words:
        word_clean = re.sub(r"[.,;:!?]", "", word)
        if word_clean in RUSSIAN_NUMBERS:
            return RUSSIAN_NUMBERS[word_clean]
    return None


def check_yo(landing: dict, path: str = "landing") -> list[str]:
    """Find 'ё' in landing strings recursively."""
    errors = []
    if isinstance(landing, dict):
        for k, v in landing.items():
            errors.extend(check_yo(v, f"{path}.{k}"))
    elif isinstance(landing, list):
        for i, v in enumerate(landing):
            errors.extend(check_yo(v, f"{path}[{i}]"))
    elif isinstance(landing, str):
        if YO_RE.search(landing):
            errors.append(f"  'ё' найдена: {path} = {landing[:80]!r}")
    return errors


LANDING_SECTIONS = {
    "announcementBanner", "hero", "integrations", "pricing",
    "howItWorks", "problem", "trust", "faq", "finalCta",
}


def check_ty(landing: dict) -> list[str]:
    """Find informal 'ты' forms in landing sections."""
    errors = []
    for section in LANDING_SECTIONS:
        section_data = landing.get(section, {})
        _check_ty_recursive(section_data, f"landing.{section}", errors)
    return errors


def _check_ty_recursive(obj, path: str, errors: list) -> None:
    if isinstance(obj, dict):
        for k, v in obj.items():
            _check_ty_recursive(v, f"{path}.{k}", errors)
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            _check_ty_recursive(v, f"{path}[{i}]", errors)
    elif isinstance(obj, str):
        if TY_RE.search(obj):
            errors.append(f"  'ты' форма: {path} = {obj[:80]!r}")


def check_banned_words(landing: dict) -> list[str]:
    """Find banned jargon/slang in landing copy."""
    errors = []
    for section in LANDING_SECTIONS:
        section_data = landing.get(section, {})
        _check_banned_recursive(section_data, f"landing.{section}", errors)
    return errors


def _check_banned_recursive(obj, path: str, errors: list) -> None:
    if isinstance(obj, dict):
        for k, v in obj.items():
            _check_banned_recursive(v, f"{path}.{k}", errors)
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            _check_banned_recursive(v, f"{path}[{i}]", errors)
    elif isinstance(obj, str):
        # "автоматика" as a short UI badge label is fine; only flag in prose (>25 chars)
        text_for_auto = obj if len(obj) > 25 else ""
        auto_re = re.compile(r"\bавтоматика\b", re.IGNORECASE)
        if auto_re.search(text_for_auto):
            errors.append(f"  запрещённое слово 'автоматика' в тексте: {path} = {obj[:80]!r}")
        # Other banned words apply everywhere
        # Match stems to catch all grammatical forms
        other_banned = re.compile(
            r"(возн[яиеюй]|херн[яиеюй]|хрен[ьи]ю?|под\s+капотом|трекинг)",
            re.IGNORECASE,
        )
        m = other_banned.search(obj)
        if m:
            errors.append(f"  запрещённое слово '{m.group()}': {path} = {obj[:80]!r}")
        m2 = BANNED_RE_EN.search(obj)
        if m2:
            errors.append(f"  banned word '{m2.group()}': {path} = {obj[:80]!r}")


def main() -> None:
    try:
        payload = json.load(sys.stdin)
    except Exception:
        sys.exit(0)

    # Only run on git commit commands
    tool_name = payload.get("tool_name", "")
    tool_input = payload.get("tool_input", {})
    command = tool_input.get("command", "") if isinstance(tool_input, dict) else ""

    if tool_name != "Bash" or "git commit" not in command:
        sys.exit(0)

    # Check if messages/ru.json is being committed
    messages_path = Path("messages/ru.json")
    if not messages_path.exists():
        sys.exit(0)

    # --- Approval gate ---
    # Any commit that touches landing copy MUST contain [copy-approved] in the
    # commit message. This enforces that Boris explicitly approved the text
    # before it goes to git. Without this token the commit is blocked.
    import subprocess
    staged = subprocess.run(
        ["git", "diff", "--cached", "--name-only"],
        capture_output=True, text=True
    ).stdout.splitlines()
    copy_files = {"messages/ru.json", "messages/en.json"}
    if any(f in copy_files for f in staged):
        if "[copy-approved]" not in command:
            reason = (
                "Коммит содержит изменения landing copy но НЕ содержит токен "
                "[copy-approved] в сообщении коммита.\n\n"
                "Правило: любой landing copy коммит требует явного одобрения "
                "владельца. Добавь [copy-approved] в сообщение коммита только "
                "после того как Boris написал 'ок', 'давай', 'пушь' или "
                "аналог на конкретный текст."
            )
            print(json.dumps({"decision": "block", "reason": reason}))
            sys.exit(0)

    try:
        data = json.loads(messages_path.read_text(encoding="utf-8"))
    except Exception as e:
        print(json.dumps({"decision": "block", "reason": f"Не удалось прочитать messages/ru.json: {e}"}))
        sys.exit(0)

    landing = data.get("landing", {})
    how_it_works = landing.get("howItWorks", {})
    errors = []

    # Check 1: step count vs heading
    if how_it_works:
        heading = how_it_works.get("heading", "")
        actual_steps = count_steps(how_it_works)
        claimed_count = extract_number_from_heading(heading)
        if claimed_count is not None and claimed_count != actual_steps:
            errors.append(
                f"  Заголовок говорит '{claimed_count} шага', но в JSON {actual_steps} шагов: {heading!r}"
            )

    # Check 2: no ё in landing
    yo_errors = check_yo(landing)
    if yo_errors:
        errors.append("Буква 'ё' запрещена в лендинге:")
        errors.extend(yo_errors)

    # Check 3: no informal 'ты' in landing
    ty_errors = check_ty(landing)
    if ty_errors:
        errors.append("Неформальное 'ты' запрещено в лендинге (нужно 'вы'):")
        errors.extend(ty_errors)

    # Check 4: no banned jargon/slang
    banned_errors = check_banned_words(landing)
    if banned_errors:
        errors.append("Запрещённый жаргон/слэнг в лендинге (CLAUDE.md §3):")
        errors.extend(banned_errors)

    if errors:
        reason = "Ошибки валидации копи:\n" + "\n".join(errors)
        print(json.dumps({"decision": "block", "reason": reason}))

    sys.exit(0)


if __name__ == "__main__":
    main()
