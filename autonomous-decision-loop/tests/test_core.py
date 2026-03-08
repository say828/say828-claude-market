import unittest

from adl.core import analyze_message, build_followup_prompt, choose_focus, declared_next_work_status


class CoreTests(unittest.TestCase):
    def test_declared_yes_continues(self):
        msg = "NEXT_WORK: YES\nTASK: redeploy DEV backend"
        decision = analyze_message(msg, runtime="codex")
        self.assertTrue(decision.should_continue)
        self.assertEqual(decision.status, "YES")

    def test_declared_no_stops(self):
        msg = "NEXT_WORK: NO\nSTATE: all requested work is complete"
        decision = analyze_message(msg, runtime="claude")
        self.assertFalse(decision.should_continue)
        self.assertEqual(declared_next_work_status(msg), "NO")

    def test_numbered_options_pick_high_value(self):
        msg = "1. polish docs\n2. redeploy DEV backend and verify"
        self.assertEqual(choose_focus(msg), "redeploy DEV backend and verify")

    def test_prompt_mentions_followup_hint(self):
        prompt = build_followup_prompt("1. update docs\n2. fix deploy", runtime="codex")
        self.assertIn("fix deploy", prompt)
        self.assertIn("직전 응답에서 감지한 후속 작업 힌트", prompt)


if __name__ == "__main__":
    unittest.main()
