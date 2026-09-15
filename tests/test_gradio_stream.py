"""Exercise the actual streaming functions with a fixture transport and no UI server."""
import ast
import json
import os
from pathlib import Path
import types
import unittest
from unittest.mock import patch

APP = Path(__file__).resolve().parents[1] / "gpt-oss-safeguard" / "app.py"


def load_streaming(environment=None):
    tree = ast.parse(APP.read_text(), filename=str(APP))
    # Gradio constructs its UI at module scope. Load the preceding real config
    # and functions while replacing only the two optional external imports.
    tree.body = tree.body[:next(i for i, n in enumerate(tree.body) if isinstance(n, ast.With))]
    requests = types.ModuleType("requests")
    namespace = {}
    with patch.dict(os.environ, environment or {}, clear=True), patch.dict(
        "sys.modules", {"requests": requests, "gradio": types.ModuleType("gradio")}
    ):
        exec(compile(tree, str(APP), "exec"), namespace)
    return namespace, requests


class Response:
    def __init__(self, chunks):
        self.chunks = chunks

    def raise_for_status(self):
        pass

    def iter_lines(self):
        yield b""
        yield b"not-json"
        for chunk in self.chunks:
            yield json.dumps({"message": {"content": chunk}}).encode()


class StreamingTest(unittest.TestCase):
    def run_stream(self, chunks):
        module, requests = load_streaming()
        captured = {}

        def post(url, **kwargs):
            captured.update(url=url, **kwargs)
            return Response(chunks)

        requests.post = post
        output = list(module["generate_stream"](" policy ", "message", 512, 1, 1, 1))
        return output, captured

    def test_proxy_default_and_explicit_local_override(self):
        module, _ = load_streaming()
        self.assertEqual(module["OLLAMA_URL"], "http://localhost:3456")
        self.assertEqual(module["MODEL_ID"], "gpt-oss-safeguard-20b")
        module, _ = load_streaming({"OLLAMA_URL": "http://localhost:11434", "OLLAMA_MODEL": "local-fixture"})
        self.assertEqual(module["OLLAMA_URL"], "http://localhost:11434")
        self.assertEqual(module["MODEL_ID"], "local-fixture")

    def test_proxy_request_keeps_policy_and_sampling(self):
        _, request = self.run_stream(["analysis reason", "assistantfinal", "PASS"])
        self.assertEqual(request["url"], "http://localhost:3456/api/chat")
        self.assertEqual(request["json"]["model"], "gpt-oss-safeguard-20b")
        self.assertEqual(request["json"]["messages"], [
            {"role": "system", "content": "policy"}, {"role": "user", "content": "message"}
        ])
        self.assertEqual(request["json"]["options"]["num_predict"], 512)
        self.assertTrue(request["stream"])
        self.assertEqual(request["timeout"], 120)

    def test_verdict_survives_marker_and_chunk_boundaries(self):
        for chunks in [
            ["analysis reasonassistantfinalPASS"],
            ["analysis reasonassist", "antfinalPASS"],
            ["analysis reason", "assistantfinal", "PASS"],
        ]:
            with self.subTest(chunks=chunks):
                output, _ = self.run_stream(chunks)
                self.assertEqual(output[-1][:2], ("reason", "PASS"))

    def test_missing_marker_keeps_analysis(self):
        output, _ = self.run_stream(["analysis reason"])
        self.assertEqual(output[-1][:2], ("reason", "(No answer)"))

    def test_empty_analysis_and_repeated_marker_preserve_final_text(self):
        output, _ = self.run_stream(["assistantfinalPASS", " assistantfinal literal"])
        self.assertEqual(output[-1][:2], ("(No analysis)", "PASS assistantfinal literal"))


if __name__ == "__main__":
    unittest.main()
