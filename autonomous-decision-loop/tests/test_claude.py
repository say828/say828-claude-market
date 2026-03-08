import json
import tempfile
import unittest
from pathlib import Path

from adl.claude import extract_last_assistant_message


class ClaudeTranscriptTests(unittest.TestCase):
    def test_extract_last_assistant_message(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "transcript.jsonl"
            path.write_text(
                json.dumps({"role": "user", "content": [{"text": "hello"}]}) + "\n" +
                json.dumps({"role": "assistant", "content": [{"text": "done"}]}) + "\n" +
                json.dumps({"role": "assistant", "content": [{"text": "next steps: redeploy"}]}) + "\n"
            )
            self.assertEqual(extract_last_assistant_message(str(path)), "next steps: redeploy")


if __name__ == "__main__":
    unittest.main()
