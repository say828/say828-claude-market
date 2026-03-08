from .engine import (
    Decision,
    build_followup_prompt,
    choose_focus,
    classify_response,
    contains_any,
    declared_next_work_status,
    declared_task,
    extract_claude_transcript_text,
    extract_codex_message,
    normalize,
    numbered_options,
    score_option,
    should_continue,
)


def analyze_message(message: str, runtime: str) -> Decision:
    decision = classify_response(message, runtime=runtime)
    return Decision(
        continue_loop=decision.continue_loop,
        focus=decision.focus,
        declared_status=decision.declared_status,
        signature=decision.signature,
        prompt=decision.prompt,
        reason=decision.reason,
    )
