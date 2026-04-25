#!/usr/bin/env python3
"""Tiny local IndexTTS2 bridge for cached Child Learn voice lines.

IndexTTS2 is much slower than Edge-TTS on this machine, so this bridge is
intended for cached/offline-generated narration. Uncached requests can take a
while, but repeated requests are served from disk.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
import tempfile
import threading
import time
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_INDEX_REPO = PROJECT_ROOT / "output" / "indextts2-poc" / "index-tts"
DEFAULT_PROMPT = (
    PROJECT_ROOT / "output" / "indextts2-poc" / "prompt" / "zero_shot_prompt.wav"
)
LEGACY_COSYVOICE_PROMPT = (
    PROJECT_ROOT
    / "output"
    / "cosyvoice-poc"
    / "CosyVoice"
    / "asset"
    / "zero_shot_prompt.wav"
)
DEFAULT_CACHE_DIR = PROJECT_ROOT / "output" / "indextts2-voice-cache"
MAX_TEXT_LENGTH = 420

WARM_CALM_VECTOR = [0.18, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.58]
WARM_CALM_PROFILE = {
    "name": "warm_calm_vector",
    "emo_vector": WARM_CALM_VECTOR,
    "emo_alpha": 0.9,
    "use_random": False,
    "top_p": 0.82,
    "top_k": 30,
    "temperature": 0.72,
    "num_beams": 3,
    "interval_silence": 180,
    "max_text_tokens_per_segment": 80,
}


def clean_text(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def resolve_prompt(prompt: Path) -> Path:
    prompt = prompt.expanduser().resolve()
    if prompt.exists():
        return prompt

    if prompt == DEFAULT_PROMPT.resolve() and LEGACY_COSYVOICE_PROMPT.exists():
        return LEGACY_COSYVOICE_PROMPT.resolve()

    return prompt


def cache_key(text: str, prompt: Path, profile: dict[str, Any]) -> str:
    digest = hashlib.sha256(
        json.dumps(
            {
                "text": text,
                "prompt": str(prompt.resolve()),
                "profile": profile,
            },
            ensure_ascii=False,
            sort_keys=True,
        ).encode("utf-8"),
    ).hexdigest()
    return digest


class IndexTTS2Runtime:
    def __init__(self, repo_dir: Path, prompt: Path, device: str | None) -> None:
        self.repo_dir = repo_dir
        self.prompt = prompt
        self.device = device
        self._tts: Any | None = None
        self._lock = threading.Lock()

    @property
    def loaded(self) -> bool:
        return self._tts is not None

    def load(self) -> None:
        if self._tts is not None:
            return

        if not self.repo_dir.exists():
            raise FileNotFoundError(f"IndexTTS2 repo not found: {self.repo_dir}")

        if not self.prompt.exists():
            raise FileNotFoundError(f"Prompt audio not found: {self.prompt}")

        if str(self.repo_dir) not in sys.path:
            sys.path.insert(0, str(self.repo_dir))

        previous_cwd = Path.cwd()
        os.chdir(self.repo_dir)
        try:
            from indextts.infer_v2 import IndexTTS2

            start = time.perf_counter()
            self._tts = IndexTTS2(
                cfg_path=str(self.repo_dir / "checkpoints" / "config.yaml"),
                model_dir=str(self.repo_dir / "checkpoints"),
                use_fp16=False,
                use_cuda_kernel=False,
                use_deepspeed=False,
                device=self.device,
            )
            print(f"IndexTTS2 loaded in {time.perf_counter() - start:.1f}s", flush=True)
        finally:
            os.chdir(previous_cwd)

    def synthesize(self, text: str, output_file: Path) -> None:
        with self._lock:
            self.load()
            assert self._tts is not None

            output_file.parent.mkdir(parents=True, exist_ok=True)
            with tempfile.NamedTemporaryFile(
                suffix=".wav",
                prefix=f"indextts2-{threading.get_ident()}-",
                dir=output_file.parent,
                delete=False,
            ) as tmp:
                tmp_path = Path(tmp.name)

            try:
                self._tts.infer(
                    spk_audio_prompt=str(self.prompt),
                    text=text,
                    output_path=str(tmp_path),
                    emo_vector=WARM_CALM_PROFILE["emo_vector"],
                    emo_alpha=WARM_CALM_PROFILE["emo_alpha"],
                    use_random=WARM_CALM_PROFILE["use_random"],
                    top_p=WARM_CALM_PROFILE["top_p"],
                    top_k=WARM_CALM_PROFILE["top_k"],
                    temperature=WARM_CALM_PROFILE["temperature"],
                    num_beams=WARM_CALM_PROFILE["num_beams"],
                    interval_silence=WARM_CALM_PROFILE["interval_silence"],
                    max_text_tokens_per_segment=WARM_CALM_PROFILE[
                        "max_text_tokens_per_segment"
                    ],
                    verbose=False,
                )
                os.replace(tmp_path, output_file)
            finally:
                tmp_path.unlink(missing_ok=True)


class IndexTTS2Handler(BaseHTTPRequestHandler):
    server_version = "ChildLearnIndexTTS2/0.1"
    protocol_version = "HTTP/1.1"

    def end_headers(self) -> None:
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_OPTIONS(self) -> None:
        self.send_response(HTTPStatus.NO_CONTENT)
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_GET(self) -> None:
        if self.path != "/health":
            self.send_json(HTTPStatus.NOT_FOUND, {"error": "not_found"})
            return

        self.send_json(
            HTTPStatus.OK,
            {
                "ok": True,
                "provider": "indextts2",
                "profile": WARM_CALM_PROFILE["name"],
                "modelLoaded": self.server.runtime.loaded,
                "cacheDir": str(self.server.cache_dir),
                "repoDir": str(self.server.runtime.repo_dir),
                "prompt": str(self.server.runtime.prompt),
            },
        )

    def do_POST(self) -> None:
        if self.path != "/synthesize":
            self.send_json(HTTPStatus.NOT_FOUND, {"error": "not_found"})
            return

        length = int(self.headers.get("Content-Length", "0"))
        if length <= 0 or length > 12_000:
            self.send_json(HTTPStatus.BAD_REQUEST, {"error": "invalid_body"})
            return

        try:
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
        except json.JSONDecodeError:
            self.send_json(HTTPStatus.BAD_REQUEST, {"error": "invalid_json"})
            return

        text = clean_text(payload.get("text"))
        if not text:
            self.send_json(HTTPStatus.BAD_REQUEST, {"error": "empty_text"})
            return

        if len(text) > MAX_TEXT_LENGTH:
            self.send_json(HTTPStatus.BAD_REQUEST, {"error": "text_too_long"})
            return

        cache_file = self.server.cache_dir / (
            f"{cache_key(text, self.server.runtime.prompt, WARM_CALM_PROFILE)}.wav"
        )

        try:
            if not cache_file.exists():
                self.server.runtime.synthesize(text, cache_file)
            self.send_file(cache_file)
        except Exception as exc:  # pragma: no cover - depends on heavy local model
            self.send_json(
                HTTPStatus.BAD_GATEWAY,
                {"error": "tts_failed", "message": str(exc)},
            )

    def send_file(self, file_path: Path) -> None:
        data = file_path.read_bytes()
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", "audio/wav")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def send_json(self, status: HTTPStatus, payload: dict[str, Any]) -> None:
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, format: str, *args: Any) -> None:
        sys.stderr.write("[%s] %s\n" % (self.log_date_time_string(), format % args))


class IndexTTS2Server(ThreadingHTTPServer):
    cache_dir: Path
    runtime: IndexTTS2Runtime


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Serve cached IndexTTS2 synthesis.")
    parser.add_argument("--host", default=os.environ.get("INDEXTTS2_HOST", "127.0.0.1"))
    parser.add_argument(
        "--port",
        type=int,
        default=int(os.environ.get("INDEXTTS2_PORT", "8789")),
    )
    parser.add_argument(
        "--repo-dir",
        type=Path,
        default=Path(os.environ.get("INDEXTTS2_REPO_DIR", str(DEFAULT_INDEX_REPO))),
    )
    parser.add_argument(
        "--prompt",
        type=Path,
        default=Path(os.environ.get("INDEXTTS2_PROMPT", str(DEFAULT_PROMPT))),
    )
    parser.add_argument(
        "--cache-dir",
        type=Path,
        default=Path(os.environ.get("INDEXTTS2_CACHE_DIR", str(DEFAULT_CACHE_DIR))),
    )
    parser.add_argument("--device", default=os.environ.get("INDEXTTS2_DEVICE"))
    parser.add_argument("--preload", action="store_true")
    return parser.parse_args()


def main() -> None:
    os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")

    args = parse_args()
    cache_dir = args.cache_dir.expanduser().resolve()
    cache_dir.mkdir(parents=True, exist_ok=True)

    runtime = IndexTTS2Runtime(
        repo_dir=args.repo_dir.expanduser().resolve(),
        prompt=resolve_prompt(args.prompt),
        device=args.device,
    )

    if args.preload:
        runtime.load()

    server = IndexTTS2Server((args.host, args.port), IndexTTS2Handler)
    server.cache_dir = cache_dir
    server.runtime = runtime

    print(f"IndexTTS2 bridge listening on http://{args.host}:{args.port}")
    print(f"Profile: {WARM_CALM_PROFILE['name']}")
    print(f"Voice cache: {cache_dir}")
    server.serve_forever()


if __name__ == "__main__":
    main()
