from __future__ import annotations

import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import adl.state as state_mod


class StateTests(unittest.TestCase):
    def test_advance_stops_after_repeat_limit(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp) / "state"
            with patch.object(state_mod, "STATE_ROOT", root):
                allowed, first = state_mod.advance("codex", "thread/1", "abc", max_repeat=2, max_depth=5)
                self.assertTrue(allowed)
                self.assertEqual(first["repeat_count"], 1)
                self.assertEqual(first["depth"], 1)

                allowed, second = state_mod.advance("codex", "thread/1", "abc", max_repeat=2, max_depth=5)
                self.assertTrue(allowed)
                self.assertEqual(second["repeat_count"], 2)
                self.assertEqual(second["depth"], 1)

                allowed, third = state_mod.advance("codex", "thread/1", "abc", max_repeat=2, max_depth=5)
                self.assertFalse(allowed)
                self.assertEqual(third["repeat_count"], 3)

    def test_reset_state_clears_signature_and_depth(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp) / "state"
            with patch.object(state_mod, "STATE_ROOT", root):
                state_mod.advance("claude", "session:1", "sig-1", max_repeat=2, max_depth=5)
                cleared = state_mod.reset_state("claude", "session:1", last_focus="")
                self.assertEqual(cleared["signature"], "")
                self.assertEqual(cleared["repeat_count"], 0)
                self.assertEqual(cleared["depth"], 0)


if __name__ == "__main__":
    unittest.main()
