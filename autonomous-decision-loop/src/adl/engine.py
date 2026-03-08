from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass
import hashlib
from pathlib import Path
from typing import Iterable

TRIGGER_PATTERNS = [
    r"\bnext steps?\b",
    r"\bnext:\b",
    r"\bremaining\b",
    r"\bfollow[- ]?up\b",
    r"\bif you want\b",
    r"\bi can\b",
    r"\byou may want to\b",
    r"\bwould you like\b",
    r"\bnatural next steps\b",
    r"원하면",
    r"다음",
    r"남은 것",
    r"다음 단계",
    r"이어서",
    r"바로 .*하겠습니다",
]
QUESTION_PATTERNS = [
    r"\?$",
    r"결정해 주세요",
    r"알려주세요",
    r"어떻게 할지",
    r"which would you like",
    r"please confirm",
]
LOW_VALUE_PATTERNS = [r"\bpush\b", r"\bcommit\b", r"\bcleanup\b", r"\bdocs?\b", r"\bpolish\b"]
HIGH_VALUE_PATTERNS = [
    r"\bdeploy\b",
    r"\bvalidation\b",
    r"\bverify\b",
    r"\bfix\b",
    r"\bdebug\b",
    r"\brestart\b",
    r"\btest\b",
    r"\bbuild\b",
    r"\bopenstack\b",
    r"\bec2\b",
    r"\beks\b",
    r"실연동",
    r"재검증",
    r"재배포",
    r"검증",
    r"수정",
]
NEXT_WORK_PATTERN = re.compile(r"(?im)^\s*NEXT_WORK\s*:\s*(YES|NO)\s*$")
TASK_PATTERN = re.compile(r"(?im)^\s*TASK\s*:\s*(.+?)\s*$")
CONTENT_FALLBACK_ENABLED = str(os.environ.get("ADL_CONTENT_FALLBACK", "0")).strip().lower() in {
    "1",
    "true",
    "yes",
    "on",
}


@dataclass(frozen=True)
class Decision:
    continue_loop: bool
    focus: str
    declared_status: str
    signature: str = ""
    prompt: str = ""
    reason: str = ""

    @property
    def should_continue(self) -> bool:
        return self.continue_loop

    @property
    def status(self) -> str:
        return self.declared_status


def normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip().lower()


def contains_any(text: str, patterns: Iterable[str]) -> bool:
    return any(re.search(pattern, text, re.IGNORECASE | re.MULTILINE) for pattern in patterns)


def numbered_options(text: str) -> list[str]:
    multiline = re.findall(r"(?m)^\s*\d+\.\s+(.+)$", text)
    if multiline:
        return [item.strip() for item in multiline if item.strip()]
    inline = re.split(r"\s+(?=\d+\.\s+)", text)
    options: list[str] = []
    for chunk in inline:
        match = re.match(r"^\d+\.\s+(.+)$", chunk.strip())
        if match:
            options.append(match.group(1).strip())
    return options


def declared_next_work_status(text: str) -> str:
    match = NEXT_WORK_PATTERN.search(text or "")
    return match.group(1).upper() if match else ""


def declared_task(text: str) -> str:
    match = TASK_PATTERN.search(text or "")
    return match.group(1).strip() if match else ""


def should_continue(text: str) -> bool:
    if not text.strip():
        return False
    status = declared_next_work_status(text)
    if status == "YES":
        return True
    if status == "NO":
        return False
    if not CONTENT_FALLBACK_ENABLED:
        return False
    if contains_any(text, TRIGGER_PATTERNS):
        return True
    return len(numbered_options(text)) >= 2


def score_option(option: str) -> int:
    score = 0
    if contains_any(option, HIGH_VALUE_PATTERNS):
        score += 10
    if contains_any(option, LOW_VALUE_PATTERNS):
        score -= 3
    if contains_any(option, QUESTION_PATTERNS):
        score -= 2
    return score


def choose_focus(text: str) -> str:
    task = declared_task(text)
    if task:
        return task
    options = numbered_options(text)
    if not options:
        return "현재 응답에서 직접 제안한 가장 가치 높은 후속 작업"
    return sorted(options, key=score_option, reverse=True)[0]


def signature_for(text: str) -> str:
    digest = hashlib.sha1(normalize(text).encode("utf-8")).hexdigest()
    return digest[:12]


def continue_reason(text: str) -> str:
    status = declared_next_work_status(text)
    if status == "YES":
        return "declared-continue"
    if status == "NO":
        return "declared-stop"
    if not CONTENT_FALLBACK_ENABLED:
        return "missing-contract"
    if contains_any(text, TRIGGER_PATTERNS):
        return "followup-language"
    if len(numbered_options(text)) >= 2:
        return "multiple-options"
    return "no-followup"


def classify_response(text: str, runtime: str = "codex") -> Decision:
    status = declared_next_work_status(text)
    cont = should_continue(text)
    focus = choose_focus(text) if cont else ""
    prompt = build_followup_prompt(text, runtime=runtime) if cont else ""
    return Decision(
        continue_loop=cont,
        focus=focus,
        declared_status=status or ("YES" if cont else "NO"),
        signature=signature_for(text),
        prompt=prompt,
        reason=continue_reason(text),
    )


def build_followup_prompt(text: str, runtime: str = "codex") -> str:
    focus = choose_focus(text)
    prompt = (
        "직전 턴 대화를 먼저 읽고, 직전 사용자 요청과 직전 응답 기준으로 실제로 남아 있는 다음 할 일이 있는지 확인하라. "
        "남은 일이 없으면 새 작업을 만들지 말고 현재 상태만 짧게 정리하라. "
        "남은 일이 있으면 사용자에게 다시 묻지 말고 가장 가치가 큰 하나를 골라 최고 수준으로 끝까지 진행하라. "
        "우선순위는 현재 블로커 해소, 수정, 재배포, 재검증, 실동작 확인 순서다. "
        "직전 턴에서 이미 끝난 일은 반복하지 말고, 필요하면 관련 문서와 검증까지 스스로 이어서 처리하라. "
        "독립적으로 분리되는 비차단 작업이 있으면 서브에이전트에 병렬로 위임하고, 지금 바로 결과가 필요한 핵심 경로 작업은 직접 처리하라. "
        "최종 답변 첫 줄은 반드시 `NEXT_WORK: YES` 또는 `NEXT_WORK: NO` 중 하나만 사용하라. "
        "`NEXT_WORK: NO`이면 둘째 줄에 `STATE: ...`를 적고, 새 작업 제안이나 선택지 섹션은 넣지 말라. "
        "`NEXT_WORK: YES`이면 둘째 줄 `TASK: ...`, 셋째 줄 `RESULT: ...`, 넷째 줄 `RISK: ...` 형식만 사용하라. "
    )
    if runtime == "claude":
        prompt = (
            "Read your immediately previous final answer and continue only if meaningful work still remains. "
            "Do not ask the user for permission again. Pick the single highest-value remaining task and execute it end-to-end. "
            "If nothing meaningful remains, stop normally without inventing new work. "
        ) + prompt
    if focus:
        prompt += f'직전 응답에서 감지한 후속 작업 힌트: "{focus}". '
    prompt += "선택 이유를 길게 설명하지 말고 바로 실행하라."
    return prompt


def extract_codex_message(payload: dict) -> str:
    return str(payload.get("last-assistant-message") or "")


def extract_claude_transcript_text(transcript_path: str | Path) -> str:
    path = Path(transcript_path)
    if not path.exists():
        return ""
    last_text = ""
    for line in path.read_text(encoding="utf-8").splitlines():
        if '"role":"assistant"' not in line and '"role": "assistant"' not in line:
            continue
        try:
            entry = json.loads(line)
        except json.JSONDecodeError:
            continue
        message = entry.get("message") or {}
        content = message.get("content") or []
        texts = [part.get("text", "") for part in content if isinstance(part, dict) and part.get("type") == "text"]
        if texts:
            last_text = "\n".join([text for text in texts if text])
    return last_text
