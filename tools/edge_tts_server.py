#!/usr/bin/env python3
"""Tiny local Edge-TTS bridge for the Child Learn frontend."""

from __future__ import annotations

import argparse
import asyncio
import hashlib
import json
import os
import re
import sys
import tempfile
import threading
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any

try:
    import edge_tts
except ModuleNotFoundError:
    print(
        "edge-tts is not installed. Run `python3 -m pip install -r requirements-voice.txt`.",
        file=sys.stderr,
    )
    raise SystemExit(1)


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CACHE_DIR = PROJECT_ROOT / "output" / "voice-cache"
DEFAULT_VOICE = "zh-CN-XiaoxiaoNeural"
DEFAULT_RATE = "-5%"
DEFAULT_VOLUME = "+0%"
DEFAULT_PITCH = "+0Hz"
MAX_TEXT_LENGTH = 420

PERCENT_RE = re.compile(r"^[+-]\d{1,3}%$")
PITCH_RE = re.compile(r"^[+-]\d{1,4}Hz$")
VOICE_RE = re.compile(r"^[A-Za-z]{2,3}-[A-Za-z]{2,4}-[A-Za-z0-9]+Neural$")


def clean_text(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def clean_percent(value: Any, fallback: str) -> str:
    candidate = clean_text(value)
    return candidate if PERCENT_RE.fullmatch(candidate) else fallback


def clean_pitch(value: Any) -> str:
    candidate = clean_text(value)
    return candidate if PITCH_RE.fullmatch(candidate) else DEFAULT_PITCH


def clean_voice(value: Any) -> str:
    candidate = clean_text(value)
    return candidate if VOICE_RE.fullmatch(candidate) else DEFAULT_VOICE


def cache_key(text: str, voice: str, rate: str, volume: str, pitch: str) -> str:
    digest = hashlib.sha256(
        json.dumps(
            {
                "text": text,
                "voice": voice,
                "rate": rate,
                "volume": volume,
                "pitch": pitch,
            },
            ensure_ascii=False,
            sort_keys=True,
        ).encode("utf-8"),
    ).hexdigest()
    return digest


async def synthesize_to_file(
    output_file: Path,
    text: str,
    voice: str,
    rate: str,
    volume: str,
    pitch: str,
) -> None:
    communicate = edge_tts.Communicate(
        text,
        voice,
        rate=rate,
        volume=volume,
        pitch=pitch,
    )
    with tempfile.NamedTemporaryFile(
        suffix=".mp3",
        prefix=f"edge-tts-{threading.get_ident()}-",
        dir=output_file.parent,
        delete=False,
    ) as tmp:
        tmp_path = Path(tmp.name)

    try:
        await communicate.save(str(tmp_path))
        os.replace(tmp_path, output_file)
    finally:
        tmp_path.unlink(missing_ok=True)


class EdgeTTSHandler(BaseHTTPRequestHandler):
    server_version = "ChildLearnEdgeTTS/0.1"
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
                "voice": DEFAULT_VOICE,
                "cacheDir": str(self.server.cache_dir),
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

        voice = clean_voice(payload.get("voice"))
        rate = clean_percent(payload.get("rate"), DEFAULT_RATE)
        volume = clean_percent(payload.get("volume"), DEFAULT_VOLUME)
        pitch = clean_pitch(payload.get("pitch"))
        cache_file = self.server.cache_dir / f"{cache_key(text, voice, rate, volume, pitch)}.mp3"

        try:
            if not cache_file.exists():
                asyncio.run(synthesize_to_file(cache_file, text, voice, rate, volume, pitch))
            self.send_file(cache_file)
        except Exception as exc:  # pragma: no cover - depends on external Edge endpoint
            self.send_json(
                HTTPStatus.BAD_GATEWAY,
                {"error": "tts_failed", "message": str(exc)},
            )

    def send_file(self, file_path: Path) -> None:
        data = file_path.read_bytes()
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", "audio/mpeg")
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


class EdgeTTSServer(ThreadingHTTPServer):
    cache_dir: Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Serve local Edge-TTS MP3 synthesis.")
    parser.add_argument("--host", default=os.environ.get("EDGE_TTS_HOST", "127.0.0.1"))
    parser.add_argument("--port", type=int, default=int(os.environ.get("EDGE_TTS_PORT", "8788")))
    parser.add_argument(
        "--cache-dir",
        default=os.environ.get("EDGE_TTS_CACHE_DIR", str(DEFAULT_CACHE_DIR)),
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    cache_dir = Path(args.cache_dir).expanduser().resolve()
    cache_dir.mkdir(parents=True, exist_ok=True)

    server = EdgeTTSServer((args.host, args.port), EdgeTTSHandler)
    server.cache_dir = cache_dir

    print(f"Edge-TTS bridge listening on http://{args.host}:{args.port}")
    print(f"Voice cache: {cache_dir}")
    server.serve_forever()


if __name__ == "__main__":
    main()
