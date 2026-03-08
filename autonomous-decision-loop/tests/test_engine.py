from __future__ import annotations

import json
import unittest
from pathlib import Path
from unittest.mock import patch

from adl.engine import build_followup_prompt, choose_focus, classify_response, extract_claude_transcript_text


class EngineTests(unittest.TestCase):
    def test_continue_on_next_work_yes(self) -> None:
        text = "NEXT_WORK: YES\nTASK: redeploy\nRESULT: pending\nRISK: none"
        decision = classify_response(text)
        self.assertTrue(decision.continue_loop)
        self.assertEqual(decision.focus, "redeploy")

    def test_stop_on_next_work_no(self) -> None:
        text = "NEXT_WORK: NO\nSTATE: complete"
        decision = classify_response(text)
        self.assertFalse(decision.continue_loop)
        self.assertEqual(decision.focus, "")

    def test_numbered_options_do_not_continue_without_contract_by_default(self) -> None:
        text = "Next steps:\n1. Push docs\n2. Redeploy DEV backend and verify"
        decision = classify_response(text)
        self.assertFalse(decision.continue_loop)
        self.assertEqual(decision.reason, "missing-contract")

    def test_numbered_options_choose_high_value_when_fallback_enabled(self) -> None:
        text = "Next steps:\n1. Push docs\n2. Redeploy DEV backend and verify"
        with patch.dict("os.environ", {"ADL_CONTENT_FALLBACK": "1"}):
            with patch("adl.engine.CONTENT_FALLBACK_ENABLED", True):
                decision = classify_response(text)
        self.assertTrue(decision.continue_loop)
        self.assertIn("redeploy", decision.focus.lower())

    def test_build_followup_prompt_mentions_hint(self) -> None:
        text = "Next steps:\n1. Fix auth bug\n2. Push"
        prompt = build_followup_prompt(text)
        self.assertIn("Fix auth bug", prompt)
        self.assertIn("최종 답변 첫 줄은 반드시 `NEXT_WORK: YES` 또는 `NEXT_WORK: NO`", prompt)

    def test_choose_focus_remains_high_value_for_options(self) -> None:
        text = "1. Push docs\n2. Fix auth bug and redeploy"
        self.assertIn("fix auth bug", choose_focus(text).lower())

    def test_extract_claude_transcript_text(self) -> None:
        tmpdir = Path(self.id().replace(".", "_"))
        tmpdir.mkdir(exist_ok=True)
        try:
            path = tmpdir / "transcript.jsonl"
            lines = [
                json.dumps({"message": {"content": [{"type": "text", "text": "hello"}]}, "role": "user"}),
                json.dumps(
                    {
                        "message": {
                            "content": [{"type": "text", "text": "NEXT_WORK: YES\nTASK: Fix auth"}]
                        },
                        "role": "assistant",
                    }
                ),
            ]
            path.write_text("\n".join(lines), encoding="utf-8")
            self.assertIn("TASK: Fix auth", extract_claude_transcript_text(path))
        finally:
            if tmpdir.exists():
                for child in tmpdir.iterdir():
                    child.unlink()
                tmpdir.rmdir()


if __name__ == "__main__":
    unittest.main()
