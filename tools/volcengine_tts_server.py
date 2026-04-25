#!/usr/bin/env python3
"""Local Volcengine/Doubao TTS bridge for the Child Learn frontend."""

from __future__ import annotations

import argparse
import base64
import hashlib
import json
import os
import re
import sys
import tempfile
import threading
import time
import uuid
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CACHE_DIR = PROJECT_ROOT / "output" / "volcengine-voice-cache"
DEFAULT_ENV_FILE = PROJECT_ROOT / ".env.local"
DEFAULT_ENDPOINT = "https://openspeech.bytedance.com/api/v1/tts"
DEFAULT_V3_ENDPOINT = "https://openspeech.bytedance.com/api/v3/tts/unidirectional/sse"
DEFAULT_CLUSTER = "volcano_tts"
DEFAULT_VOICE_TYPE = "zh_female_wenrouxiaoya_moon_bigtts"
DEFAULT_ENCODING = "mp3"
DEFAULT_EMOTION = ""
DEFAULT_RESOURCE_ID = "seed-tts-2.0"
DEFAULT_SAMPLE_RATE = 24000
DEFAULT_SPEED = 0.95
DEFAULT_VOLUME = 1.0
DEFAULT_PITCH = 1.0
MAX_TEXT_LENGTH = 420
V3_AUTH_API_KEY = "api-key"
V3_AUTH_APP_TOKEN = "app-token"

PERCENT_RE = re.compile(r"^[+-]\d{1,3}%$")


def clean_text(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def load_env_file(path: Path) -> None:
    if not path.exists():
        return

    for line in path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue
        key, value = stripped.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


def parse_ratio(value: Any, fallback: float, *, minimum: float = 0.5, maximum: float = 2.0) -> float:
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return fallback
    return min(max(parsed, minimum), maximum)


def rate_to_speed_ratio(rate: Any, fallback: float) -> float:
    candidate = clean_text(rate)
    if not PERCENT_RE.fullmatch(candidate):
        return fallback
    return parse_ratio(1 + int(candidate[:-1]) / 100, fallback)


def ratio_to_v3_rate(value: float) -> int:
    return min(max(round((value - 1) * 100), -50), 100)


def cache_key(config: "VolcengineConfig", text: str) -> str:
    digest = hashlib.sha256(
        json.dumps(
            {
                "apiMode": config.api_mode,
                "authMode": config.auth_mode,
                "endpoint": config.endpoint,
                "appid": config.appid,
                "cluster": config.cluster,
                "resourceId": config.resource_id,
                "voiceType": config.voice_type,
                "encoding": config.encoding,
                "emotion": config.emotion,
                "sampleRate": config.sample_rate,
                "speed": config.speed,
                "volume": config.volume,
                "pitch": config.pitch,
                "text": text,
            },
            ensure_ascii=False,
            sort_keys=True,
        ).encode("utf-8")
    ).hexdigest()
    return digest


def mask_id(value: str) -> str:
    if len(value) <= 6:
        return "***"
    return f"{value[:3]}***{value[-3:]}"


class VolcengineConfig:
    def __init__(self, args: argparse.Namespace) -> None:
        self.api_mode = clean_text(
            args.api_mode
            or os.environ.get("VOLCENGINE_TTS_API_MODE")
            or ("v3" if os.environ.get("VOLCENGINE_TTS_ACCESS_KEY") else "v1")
        ).lower()
        self.auth_mode = clean_text(
            args.auth_mode
            or os.environ.get("VOLCENGINE_TTS_AUTH_MODE")
            or V3_AUTH_API_KEY
        ).lower()
        self.endpoint = args.endpoint or os.environ.get("VOLCENGINE_TTS_ENDPOINT")
        if not self.endpoint:
            self.endpoint = DEFAULT_V3_ENDPOINT if self.api_mode == "v3" else DEFAULT_ENDPOINT
        self.appid = clean_text(args.appid or os.environ.get("VOLCENGINE_TTS_APPID"))
        self.access_token = clean_text(
            args.access_token or os.environ.get("VOLCENGINE_TTS_ACCESS_TOKEN")
        )
        if self.auth_mode == V3_AUTH_API_KEY:
            access_key = (
                args.access_key
                or os.environ.get("VOLCENGINE_TTS_API_KEY")
                or os.environ.get("VOLCENGINE_TTS_ACCESS_KEY")
            )
        else:
            access_key = (
                args.access_key
                or os.environ.get("VOLCENGINE_TTS_V3_ACCESS_KEY")
                or os.environ.get("VOLCENGINE_TTS_ACCESS_TOKEN")
                or os.environ.get("VOLCENGINE_TTS_ACCESS_KEY")
                or os.environ.get("VOLCENGINE_TTS_API_KEY")
            )
        self.access_key = clean_text(access_key)
        self.secret_key = clean_text(
            args.secret_key or os.environ.get("VOLCENGINE_TTS_SECRET_KEY")
        )
        self.resource_id = clean_text(
            args.resource_id
            or os.environ.get("VOLCENGINE_TTS_RESOURCE_ID")
            or DEFAULT_RESOURCE_ID
        )
        self.cluster = clean_text(
            args.cluster or os.environ.get("VOLCENGINE_TTS_CLUSTER") or DEFAULT_CLUSTER
        )
        self.voice_type = clean_text(
            args.voice_type
            or os.environ.get("VOLCENGINE_TTS_VOICE_TYPE")
            or DEFAULT_VOICE_TYPE
        )
        self.encoding = clean_text(
            args.encoding or os.environ.get("VOLCENGINE_TTS_ENCODING") or DEFAULT_ENCODING
        )
        self.emotion = clean_text(
            args.emotion or os.environ.get("VOLCENGINE_TTS_EMOTION") or DEFAULT_EMOTION
        )
        self.speed = parse_ratio(
            args.speed or os.environ.get("VOLCENGINE_TTS_SPEED"), DEFAULT_SPEED
        )
        self.volume = parse_ratio(
            args.volume or os.environ.get("VOLCENGINE_TTS_VOLUME"), DEFAULT_VOLUME
        )
        self.pitch = parse_ratio(
            args.pitch or os.environ.get("VOLCENGINE_TTS_PITCH"), DEFAULT_PITCH
        )
        try:
            self.sample_rate = int(
                args.sample_rate
                or os.environ.get("VOLCENGINE_TTS_SAMPLE_RATE")
                or DEFAULT_SAMPLE_RATE
            )
        except (TypeError, ValueError):
            self.sample_rate = DEFAULT_SAMPLE_RATE
        self.timeout = parse_ratio(
            args.timeout or os.environ.get("VOLCENGINE_TTS_TIMEOUT"), 30.0, minimum=2.0, maximum=120.0
        )

    def validate(self) -> None:
        missing = []
        if (self.api_mode != "v3" or self.auth_mode != V3_AUTH_API_KEY) and not self.appid:
            missing.append("VOLCENGINE_TTS_APPID")
        if self.api_mode == "v3" and self.auth_mode == V3_AUTH_API_KEY and not self.access_key:
            missing.append("VOLCENGINE_TTS_ACCESS_KEY or VOLCENGINE_TTS_API_KEY")
        if self.api_mode == "v3" and self.auth_mode != V3_AUTH_API_KEY and not self.access_key:
            missing.append("VOLCENGINE_TTS_ACCESS_KEY")
        if self.api_mode != "v3" and not self.access_token:
            missing.append("VOLCENGINE_TTS_ACCESS_TOKEN")
        if missing:
            raise RuntimeError(f"Missing required Volcengine TTS env: {', '.join(missing)}")

    def health_payload(self, cache_dir: Path) -> dict[str, Any]:
        cache_entries = sum(1 for item in cache_dir.glob("*") if item.is_file())
        return {
            "ok": True,
            "provider": "volcengine",
            "apiMode": self.api_mode,
            "authMode": self.auth_mode,
            "endpoint": self.endpoint,
            "appid": mask_id(self.appid),
            "cluster": self.cluster,
            "resourceId": self.resource_id,
            "voiceType": self.voice_type,
            "encoding": self.encoding,
            "emotion": self.emotion,
            "sampleRate": self.sample_rate,
            "speed": self.speed,
            "volume": self.volume,
            "pitch": self.pitch,
            "cacheDir": str(cache_dir),
            "cacheEntries": cache_entries,
            "hasAccessToken": bool(self.access_token),
            "hasAccessKey": bool(self.access_key),
            "hasApiKey": self.api_mode == "v3" and self.auth_mode == V3_AUTH_API_KEY and bool(self.access_key),
            "hasSecretKey": bool(self.secret_key),
        }

    @staticmethod
    def from_existing(config: "VolcengineConfig", payload: dict[str, Any]) -> "VolcengineConfig":
        clone = object.__new__(VolcengineConfig)
        clone.api_mode = config.api_mode
        clone.auth_mode = config.auth_mode
        clone.endpoint = config.endpoint
        clone.appid = config.appid
        clone.access_token = config.access_token
        clone.access_key = config.access_key
        clone.secret_key = config.secret_key
        clone.resource_id = config.resource_id
        clone.cluster = config.cluster
        clone.voice_type = clean_text(payload.get("voice_type")) or config.voice_type
        clone.encoding = config.encoding
        clone.emotion = clean_text(payload.get("emotion")) or config.emotion
        clone.speed = rate_to_speed_ratio(payload.get("rate"), config.speed)
        clone.speed = parse_ratio(payload.get("speed_ratio"), clone.speed)
        clone.volume = parse_ratio(payload.get("volume_ratio"), config.volume)
        clone.pitch = parse_ratio(payload.get("pitch_ratio"), config.pitch)
        clone.sample_rate = config.sample_rate
        clone.timeout = config.timeout
        return clone


class VolcengineTTSRuntime:
    def __init__(self, config: VolcengineConfig) -> None:
        self.config = config
        self._lock = threading.Lock()

    def synthesize(self, text: str, output_file: Path, overrides: dict[str, Any]) -> None:
        with self._lock:
            output_file.parent.mkdir(parents=True, exist_ok=True)
            with tempfile.NamedTemporaryFile(
                suffix=f".{self.config.encoding}",
                prefix=f"volcengine-tts-{threading.get_ident()}-",
                dir=output_file.parent,
                delete=False,
            ) as tmp:
                tmp_path = Path(tmp.name)

            try:
                audio = self._request_audio(text, overrides)
                tmp_path.write_bytes(audio)
                os.replace(tmp_path, output_file)
            finally:
                tmp_path.unlink(missing_ok=True)

    def _request_audio(self, text: str, overrides: dict[str, Any]) -> bytes:
        if self.config.api_mode == "v3":
            return self._request_audio_v3(text, overrides)
        return self._request_audio_v1(text, overrides)

    def _request_audio_v1(self, text: str, overrides: dict[str, Any]) -> bytes:
        voice_type = clean_text(overrides.get("voice_type")) or self.config.voice_type
        emotion = clean_text(overrides.get("emotion")) or self.config.emotion
        speed = rate_to_speed_ratio(overrides.get("rate"), self.config.speed)
        speed = parse_ratio(overrides.get("speed_ratio"), speed)
        volume = parse_ratio(overrides.get("volume_ratio"), self.config.volume)
        pitch = parse_ratio(overrides.get("pitch_ratio"), self.config.pitch)

        payload: dict[str, Any] = {
            "app": {
                "appid": self.config.appid,
                "token": self.config.access_token,
                "cluster": self.config.cluster,
            },
            "user": {
                "uid": "childLearn-local",
            },
            "audio": {
                "voice_type": voice_type,
                "encoding": self.config.encoding,
                "speed_ratio": speed,
                "volume_ratio": volume,
                "pitch_ratio": pitch,
            },
            "request": {
                "reqid": str(uuid.uuid4()),
                "text": text,
                "text_type": "plain",
                "operation": "query",
                "with_frontend": 1,
                "frontend_type": "unitTson",
            },
        }
        if emotion:
            payload["audio"]["emotion"] = emotion

        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        request = Request(
            self.config.endpoint,
            data=body,
            headers={
                "Authorization": f"Bearer;{self.config.access_token}",
                "Content-Type": "application/json; charset=utf-8",
            },
            method="POST",
        )

        try:
            with urlopen(request, timeout=self.config.timeout) as response:
                raw = response.read()
        except HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"Volcengine TTS HTTP {exc.code}: {detail}") from exc
        except URLError as exc:
            raise RuntimeError(f"Volcengine TTS request failed: {exc.reason}") from exc

        try:
            result = json.loads(raw.decode("utf-8"))
        except json.JSONDecodeError as exc:
            raise RuntimeError("Volcengine TTS returned non-JSON response") from exc

        code = result.get("code")
        if code not in (0, "0", 3000, "3000", None):
            message = result.get("message") or result.get("msg") or "unknown error"
            raise RuntimeError(f"Volcengine TTS code={code}: {message}")

        data = result.get("data")
        if not data:
            raise RuntimeError(f"Volcengine TTS returned empty audio data: {result}")

        try:
            return base64.b64decode(data)
        except Exception as exc:
            raise RuntimeError("Volcengine TTS returned invalid base64 audio") from exc

    def _request_audio_v3(self, text: str, overrides: dict[str, Any]) -> bytes:
        voice_type = clean_text(overrides.get("voice_type")) or self.config.voice_type
        emotion = clean_text(overrides.get("emotion")) or self.config.emotion
        speed = rate_to_speed_ratio(overrides.get("rate"), self.config.speed)
        speed = parse_ratio(overrides.get("speed_ratio"), speed)
        volume = parse_ratio(overrides.get("volume_ratio"), self.config.volume)
        additions = {
            "disable_markdown_filter": True,
            "enable_language_detector": True,
            "enable_latex_tn": True,
            "disable_default_bit_rate": True,
            "max_length_to_filter_parenthesis": 0,
            "cache_config": {"text_type": 1, "use_cache": True},
        }
        payload: dict[str, Any] = {
            "user": {"uid": "childLearn-local"},
            "req_params": {
                "text": text,
                "speaker": voice_type,
                "additions": json.dumps(additions, ensure_ascii=False),
                "audio_params": {
                    "format": self.config.encoding,
                    "sample_rate": self.config.sample_rate,
                    "speech_rate": ratio_to_v3_rate(speed),
                    "loudness_rate": ratio_to_v3_rate(volume),
                },
            },
        }
        if emotion:
            payload["req_params"]["audio_params"]["emotion"] = emotion
            payload["req_params"]["audio_params"]["emotion_scale"] = 3

        headers = {
            "Content-Type": "application/json",
            "Connection": "keep-alive",
            "Accept": "text/event-stream" if self.config.endpoint.endswith("/sse") else "application/json",
            "X-Api-Resource-Id": self.config.resource_id,
            "X-Api-Request-Id": str(uuid.uuid4()),
        }
        if self.config.auth_mode == V3_AUTH_API_KEY:
            headers["X-Api-Key"] = self.config.access_key
        else:
            headers["X-Api-App-Id"] = self.config.appid
            headers["X-Api-Access-Key"] = self.config.access_key

        request = Request(
            self.config.endpoint,
            data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
            headers=headers,
            method="POST",
        )

        try:
            with urlopen(request, timeout=self.config.timeout) as response:
                raw = response.read()
        except HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"Volcengine TTS HTTP {exc.code}: {detail}") from exc
        except URLError as exc:
            raise RuntimeError(f"Volcengine TTS request failed: {exc.reason}") from exc

        audio = bytearray()
        errors: list[Any] = []
        for line in raw.splitlines() or [raw]:
            line = line.strip()
            if not line:
                continue
            if line.startswith(b"event:"):
                continue
            if line.startswith(b"data:"):
                line = line.removeprefix(b"data:").strip()
            if line == b"[DONE]":
                break
            try:
                result = json.loads(line.decode("utf-8"))
            except json.JSONDecodeError:
                continue

            data = result.get("data")
            if data:
                audio.extend(base64.b64decode(data))

            code = result.get("code", 0)
            if code in (20000000, "20000000"):
                break
            if code not in (0, "0", None):
                errors.append(result)

        if audio:
            return bytes(audio)
        if errors:
            raise RuntimeError(f"Volcengine TTS V3 error: {errors[0]}")
        raise RuntimeError("Volcengine TTS V3 returned empty audio data")


class VolcengineTTSHandler(BaseHTTPRequestHandler):
    server_version = "ChildLearnVolcengineTTS/0.1"
    protocol_version = "HTTP/1.1"

    def end_headers(self) -> None:
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Expose-Headers", "X-Voice-Cache, X-Voice-Cache-Key")
        super().end_headers()

    def do_OPTIONS(self) -> None:
        self.send_response(HTTPStatus.NO_CONTENT)
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_GET(self) -> None:
        if self.path != "/health":
            self.send_json(HTTPStatus.NOT_FOUND, {"error": "not_found"})
            return

        self.send_json(
            HTTPStatus.OK,
            self.server.runtime.config.health_payload(self.server.cache_dir),
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

        config = self.server.runtime.config
        effective_config = VolcengineConfig.from_existing(config, payload)
        cache_digest = cache_key(effective_config, text)
        cache_file = self.server.cache_dir / f"{cache_digest}.{effective_config.encoding}"

        try:
            cache_status = "HIT" if cache_file.exists() else "MISS"
            if cache_status == "MISS":
                start = time.perf_counter()
                self.server.runtime.synthesize(text, cache_file, payload)
                print(
                    f"Volcengine TTS generated {cache_file.name} in {time.perf_counter() - start:.2f}s",
                    flush=True,
                )
            self.send_file(
                cache_file,
                {
                    "X-Voice-Cache": cache_status,
                    "X-Voice-Cache-Key": cache_digest,
                },
            )
        except Exception as exc:  # pragma: no cover - depends on external service
            self.send_json(
                HTTPStatus.BAD_GATEWAY,
                {"error": "tts_failed", "message": str(exc)},
            )

    def send_file(self, file_path: Path, headers: dict[str, str] | None = None) -> None:
        data = file_path.read_bytes()
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", content_type_for(file_path.suffix))
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "public, max-age=31536000, immutable")
        for key, value in (headers or {}).items():
            self.send_header(key, value)
        self.end_headers()
        self.wfile.write(data)

    def send_json(self, status: HTTPStatus, payload: dict[str, Any]) -> None:
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, format: str, *args: Any) -> None:
        sys.stderr.write("[%s] %s\n" % (self.log_date_time_string(), format % args))


def content_type_for(suffix: str) -> str:
    if suffix == ".mp3":
        return "audio/mpeg"
    if suffix == ".wav":
        return "audio/wav"
    if suffix == ".ogg":
        return "audio/ogg"
    return "application/octet-stream"


class VolcengineTTSServer(ThreadingHTTPServer):
    cache_dir: Path
    runtime: VolcengineTTSRuntime


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Serve local Volcengine/Doubao TTS.")
    parser.add_argument("--host", default=os.environ.get("VOLCENGINE_TTS_HOST", "127.0.0.1"))
    parser.add_argument(
        "--port",
        type=int,
        default=int(os.environ.get("VOLCENGINE_TTS_PORT", "8793")),
    )
    parser.add_argument("--endpoint", default=None)
    parser.add_argument("--api-mode", default=None, choices=["v1", "v3"])
    parser.add_argument("--auth-mode", default=None, choices=[V3_AUTH_API_KEY, V3_AUTH_APP_TOKEN])
    parser.add_argument("--appid", default=None)
    parser.add_argument("--access-token", default=None)
    parser.add_argument("--access-key", default=None)
    parser.add_argument("--secret-key", default=None)
    parser.add_argument("--resource-id", default=None)
    parser.add_argument("--cluster", default=None)
    parser.add_argument("--voice-type", default=None)
    parser.add_argument("--encoding", default=None)
    parser.add_argument("--emotion", default=None)
    parser.add_argument("--speed", default=None)
    parser.add_argument("--volume", default=None)
    parser.add_argument("--pitch", default=None)
    parser.add_argument("--sample-rate", default=None)
    parser.add_argument("--timeout", default=None)
    parser.add_argument(
        "--cache-dir",
        type=Path,
        default=Path(os.environ.get("VOLCENGINE_TTS_CACHE_DIR", str(DEFAULT_CACHE_DIR))),
    )
    parser.add_argument(
        "--env-file",
        type=Path,
        default=Path(os.environ.get("VOLCENGINE_TTS_ENV_FILE", str(DEFAULT_ENV_FILE))),
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    load_env_file(args.env_file.expanduser().resolve())
    config = VolcengineConfig(args)
    config.validate()

    cache_dir = args.cache_dir.expanduser().resolve()
    cache_dir.mkdir(parents=True, exist_ok=True)

    runtime = VolcengineTTSRuntime(config)
    server = VolcengineTTSServer((args.host, args.port), VolcengineTTSHandler)
    server.cache_dir = cache_dir
    server.runtime = runtime

    print(f"Volcengine TTS bridge listening on http://{args.host}:{args.port}")
    print(
        f"Mode: {config.api_mode} Voice: {config.voice_type} "
        f"emotion={config.emotion or 'none'} resource={config.resource_id}"
    )
    print(f"Voice cache: {cache_dir}")
    server.serve_forever()


if __name__ == "__main__":
    main()
