#!/usr/bin/env python3
"""Local learning-observer bridge for the Adaptive Flow Engine.

The Vite app calls this local endpoint. This bridge calls the local
OpenAI-compatible CLIProxyAPI service and returns a validated JSON observation
shape for the frontend Safety Governor to filter.
"""

from __future__ import annotations

import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Lock
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
TELEMETRY_LOG_PATH = Path(
    os.environ.get(
        "FLOW_OBSERVER_TELEMETRY_LOG",
        str(ROOT / "output" / "telemetry" / "childlearn-events.jsonl"),
    )
).expanduser()
SYNC_STATE_DIR = Path(
    os.environ.get(
        "FLOW_OBSERVER_SYNC_STATE_DIR",
        str(ROOT / "output" / "sync" / "child-state"),
    )
).expanduser()
SYNC_STATE_SCHEMA_VERSION = "childlearn.learning-state.v1"
SYNC_LOCK = Lock()
LEARNING_STORAGE_KEYS = {
    "childlearn.session-stats",
    "childlearn.app-state-v1",
    "childlearn.combo-state",
    "childlearn.combo-max",
    "childlearn.rank-stars",
    "childlearn.dda-state",
    "childlearn.number-spirits",
    "childlearn.reward-garden",
    "childlearn.daily-first-win",
    "childlearn.m78-stickers",
    "childlearn.ability-profile-v1",
}


def load_env_file(path: Path) -> None:
    if not path.exists():
        return

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


def env_int(name: str, default: int) -> int:
    try:
        return int(os.environ.get(name, str(default)))
    except ValueError:
        return default


load_env_file(ROOT / ".env.local")

HOST = os.environ.get("FLOW_OBSERVER_HOST", "127.0.0.1")
PORT = env_int("FLOW_OBSERVER_PORT", 8792)
CLIPROXY_BASE_URL = os.environ.get(
    "FLOW_OBSERVER_CLIPROXY_BASE_URL",
    os.environ.get("CLIPROXY_BASE_URL", "http://127.0.0.1:8317/v1"),
).rstrip("/")
MODEL = os.environ.get("FLOW_OBSERVER_MODEL", "gpt-5.4-mini")
REQUEST_TIMEOUT_SECONDS = env_int("FLOW_OBSERVER_REQUEST_TIMEOUT_SECONDS", 45)
ALLOWED_ORIGIN = os.environ.get(
    "FLOW_OBSERVER_ALLOWED_ORIGIN",
    os.environ.get("APP_ORIGIN", "http://localhost:5173"),
)
CLIPROXY_API_KEY = (
    os.environ.get("FLOW_OBSERVER_CLIPROXY_API_KEY")
    or os.environ.get("CLIPROXY_API_KEY")
)


SYSTEM_PROMPT = """\
You are the Flow Observer for a math practice app used by a 4.5-year-old child.

Product thesis:
- Commercial-style math progression is only the curriculum skeleton.
- The app's core advantage is the adaptive flow layer: keep challenge close to
  the child's current ability, not the average child in a fixed level.
- You are not the final decision system and you must not generate questions.
- Analyze only the supplied LearningBatchReport as short-term evidence.

Flow principles to apply:
1. Challenge-skill balance: flow happens when questions are neither automatic
   nor overwhelming. Too easy suggests boredom risk; too hard suggests anxiety
   or shutdown risk.
2. Clear micro-goal: a young child should know what to do from the visual,
   audio, and interaction. If misses look caused by wording, layout, answer
   affordance, or unclear representation, mark ui_confusion or
   item_design_problem instead of skill_gap.
3. Immediate feedback and recovery: wrong-first-then-correct with hints,
   voice replay, or visual support is stretch, not hard. Hard means support is
   not rescuing the child.
4. Sense of control: rapid clicks, repeated replays, interrupted feedback,
   abandonment, or long idle gaps may mean low control or attention load rather
   than math weakness.
5. Concentration and tempo: compare first half vs second half. A second-half
   drop, slower responses, more idle events, or broader errors points to
   fatigue or attention_drop; do not downgrade long-term ability from that.
6. One-dimension adjustment: recommend changing only one main dimension at a
   time: number_range, operation_type, presentation_type, visual_support,
   option_distance, batch_size, or feedback_strength.

State rubric:
- easy: high first-try accuracy, very high final accuracy, fast responses, low
  hint/replay use, and no second-half drop. Recommend increase_slightly with a
  small challenge lane.
- flow: good final accuracy, moderate effort, stable tempo, low distress
  signals, and some learnable effort. Recommend maintain.
- stretch: errors are recoverable, support works, engagement remains stable,
  and the child is close to the edge of ability. Recommend
  maintain_with_support, usually by adding visual_support, wider
  option_distance, or stronger feedback.
- hard: low final accuracy, repeated wrong finals on the same tag, or hints do
  not rescue performance, without a better fatigue/UI explanation. Recommend
  decrease_slightly.
- fatigue: deterioration across the batch, slower pace, idle/replay/rapid-click
  signals, or broad errors across tags. Recommend reduce_batch_or_pace and do
  not infer skill loss.
- unstable: evidence is weak, contradictory, too small, or mostly confounded by
  UI/item quality.

Special rules for a 4.5-year-old non-reader:
- Treat story or text-heavy failures as possible language or UI load unless
  audio-supported evidence clearly shows a math gap.
- Prefer presentation_type, visual_support, option_distance, feedback_strength,
  or batch_size adjustments before number_range when the issue may be cognitive
  load, attention, UI confusion, or fatigue.
- A single batch can tune the next few questions, but it must not redefine the
  child's long-term ability.
- Never recommend jumping multiple levels or increasing several dimensions at
  once.

Return one JSON object with exactly these top-level fields:
overallState, confidence, stateReason, primaryIssue, masteredSkills,
weakSkills, riskSignals, doNotInfer, recommendation, uxSuggestions.

Allowed overallState values:
easy, flow, stretch, hard, fatigue, unstable.

Allowed primaryIssue values:
skill_gap, cognitive_load, attention_drop, fatigue, ui_confusion,
item_design_problem, careless_or_motor_error, uncertain.

Allowed recommendation.direction values:
increase_slightly, maintain, maintain_with_support, decrease_slightly,
reduce_batch_or_pace, review_item_quality.

Allowed recommendation.adjustmentDimension values:
number_range, operation_type, presentation_type, visual_support,
option_distance, batch_size, feedback_strength, none.

recommendation.suggestedMix must contain non-negative numbers:
confidence, review, current, challenge.

JSON discipline:
- Use confidence 0..1. Prefer lower confidence when evidence is weak.
- masteredSkills and weakSkills must be evidence statements with sample counts.
- riskSignals should name observed risks, not speculation.
- doNotInfer should explicitly protect against unsafe conclusions.
- uxSuggestions should be concrete, child-facing product changes.
"""


def cors_origin(handler: BaseHTTPRequestHandler) -> str:
    return handler.headers.get("Origin") or ALLOWED_ORIGIN


def send_cors_headers(handler: BaseHTTPRequestHandler) -> None:
    handler.send_header("Access-Control-Allow-Origin", cors_origin(handler))
    handler.send_header("Access-Control-Allow-Methods", "POST, OPTIONS, GET")
    handler.send_header("Access-Control-Allow-Headers", "Content-Type")
    handler.send_header("Vary", "Origin")


def json_response(handler: BaseHTTPRequestHandler, status: int, payload: Any) -> None:
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(body)))
    send_cors_headers(handler)
    handler.end_headers()
    handler.wfile.write(body)


def read_json_request(handler: BaseHTTPRequestHandler) -> Any:
    length = int(handler.headers.get("Content-Length", "0"))
    raw = handler.rfile.read(length)
    if not raw:
        return {}
    return json.loads(raw.decode("utf-8"))


def observation_request_payload(report: Any) -> dict[str, Any]:
    return {
        "model": MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": json.dumps(
                    {
                        "schemaVersion": "childlearn.flow-observer.v1",
                        "report": report,
                    },
                    ensure_ascii=False,
                    separators=(",", ":"),
                ),
            },
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0,
    }


def call_cliproxy(report: Any) -> dict[str, Any]:
    if not CLIPROXY_API_KEY:
        raise RuntimeError("missing CLIProxyAPI key")

    request = urllib.request.Request(
        f"{CLIPROXY_BASE_URL}/chat/completions",
        data=json.dumps(observation_request_payload(report)).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {CLIPROXY_API_KEY}",
        },
        method="POST",
    )

    with urllib.request.urlopen(request, timeout=REQUEST_TIMEOUT_SECONDS) as response:
        payload = json.loads(response.read().decode("utf-8"))

    content = payload["choices"][0]["message"]["content"]
    observation = json.loads(content)

    return {
        "observation": observation,
        "model": payload.get("model", MODEL),
        "createdAt": int(time.time()),
    }


def append_telemetry_event(event: Any) -> None:
    if not isinstance(event, dict):
        raise ValueError("telemetry event must be an object")

    TELEMETRY_LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    with TELEMETRY_LOG_PATH.open("a", encoding="utf-8") as file:
        file.write(json.dumps(event, ensure_ascii=False, separators=(",", ":")))
        file.write("\n")


def now_ms() -> int:
    return int(time.time() * 1000)


def safe_child_id(child_id: Any) -> str:
    if not isinstance(child_id, str) or not child_id.strip():
        return "local-child"

    return re.sub(r"[^A-Za-z0-9_.-]", "_", child_id.strip())[:96] or "local-child"


def child_state_path(child_id: str) -> Path:
    return SYNC_STATE_DIR / f"{safe_child_id(child_id)}.json"


def parse_json_string(value: Any) -> Any:
    if not isinstance(value, str):
        return None

    try:
        return json.loads(value)
    except json.JSONDecodeError:
        return None


def numeric(value: Any, default: float = 0) -> float:
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return default

    return parsed if parsed == parsed else default


def stringify_int(value: float) -> str:
    return str(max(0, round(value)))


def merge_number_record(existing_value: Any, incoming_value: Any) -> str:
    merged: dict[str, float] = {}

    for source in (parse_json_string(existing_value), parse_json_string(incoming_value)):
        if not isinstance(source, dict):
            continue
        for key, value in source.items():
            if isinstance(key, str):
                merged[key] = max(merged.get(key, 0), max(0, numeric(value)))

    return json.dumps(merged, ensure_ascii=False, separators=(",", ":"))


def merge_number_fields(existing_value: Any, incoming_value: Any, fields: list[str]) -> str:
    existing = parse_json_string(existing_value)
    incoming = parse_json_string(incoming_value)
    existing_record = existing if isinstance(existing, dict) else {}
    incoming_record = incoming if isinstance(incoming, dict) else {}
    merged = {
        field: max(
            max(0, numeric(existing_record.get(field))),
            max(0, numeric(incoming_record.get(field))),
        )
        for field in fields
    }
    return json.dumps(merged, ensure_ascii=False, separators=(",", ":"))


def merge_combo_state(existing_value: Any, incoming_value: Any) -> str:
    existing = parse_json_string(existing_value)
    incoming = parse_json_string(incoming_value)
    existing_record = existing if isinstance(existing, dict) else {}
    incoming_record = incoming if isinstance(incoming, dict) else {}

    return json.dumps(
        {
            "current": max(
                max(0, numeric(existing_record.get("current"))),
                max(0, numeric(incoming_record.get("current"))),
            ),
            "maxEver": max(
                max(0, numeric(existing_record.get("maxEver"))),
                max(0, numeric(incoming_record.get("maxEver"))),
            ),
        },
        ensure_ascii=False,
        separators=(",", ":"),
    )


def merge_sticker_ids(existing_value: Any, incoming_value: Any) -> str:
    ids: set[str] = set()
    for source in (parse_json_string(existing_value), parse_json_string(incoming_value)):
        if isinstance(source, list):
            ids.update(item for item in source if isinstance(item, str))

    return json.dumps(sorted(ids), ensure_ascii=False, separators=(",", ":"))


def merge_garden(existing_value: Any, incoming_value: Any) -> str:
    existing = parse_json_string(existing_value)
    incoming = parse_json_string(incoming_value)
    existing_record = existing if isinstance(existing, dict) else {}
    incoming_record = incoming if isinstance(incoming, dict) else {}
    badges: set[str] = set()

    for source in (existing_record.get("badges"), incoming_record.get("badges")):
        if isinstance(source, list):
            badges.update(item for item in source if isinstance(item, str))

    watered_days = sorted(
        day
        for day in (existing_record.get("lastWateredDay"), incoming_record.get("lastWateredDay"))
        if isinstance(day, str)
    )

    return json.dumps(
        {
            "lastWateredDay": watered_days[-1] if watered_days else None,
            "streak": max(
                max(0, numeric(existing_record.get("streak"))),
                max(0, numeric(incoming_record.get("streak"))),
            ),
            "totalWaterings": max(
                max(0, numeric(existing_record.get("totalWaterings"))),
                max(0, numeric(incoming_record.get("totalWaterings"))),
            ),
            "fruitCoins": max(
                max(0, numeric(existing_record.get("fruitCoins"))),
                max(0, numeric(incoming_record.get("fruitCoins"))),
            ),
            "badges": sorted(badges),
        },
        ensure_ascii=False,
        separators=(",", ":"),
    )


def merge_ability_profile(existing_value: Any, incoming_value: Any) -> str:
    existing = parse_json_string(existing_value)
    incoming = parse_json_string(incoming_value)
    existing_record = existing if isinstance(existing, dict) else {}
    incoming_record = incoming if isinstance(incoming, dict) else {}
    existing_skills = existing_record.get("skills")
    incoming_skills = incoming_record.get("skills")
    existing_skills = existing_skills if isinstance(existing_skills, dict) else {}
    incoming_skills = incoming_skills if isinstance(incoming_skills, dict) else {}
    numeric_fields = [
        "attempts",
        "firstTryCorrect",
        "finalCorrect",
        "hintUsed",
        "audioReplayUsed",
        "totalFirstResponseTimeMs",
        "totalTimeMs",
        "slowCount",
        "lastSeenAt",
    ]
    skills: dict[str, dict[str, Any]] = {}

    for skill_key in sorted(set(existing_skills.keys()) | set(incoming_skills.keys())):
        existing_skill = existing_skills.get(skill_key)
        incoming_skill = incoming_skills.get(skill_key)
        existing_skill = existing_skill if isinstance(existing_skill, dict) else {}
        incoming_skill = incoming_skill if isinstance(incoming_skill, dict) else {}
        merged_skill = {
            **existing_skill,
            **incoming_skill,
            "key": skill_key,
            "label": incoming_skill.get("label") or existing_skill.get("label") or skill_key,
            "category": incoming_skill.get("category") or existing_skill.get("category") or "能力点",
        }
        for field in numeric_fields:
            merged_skill[field] = max(
                numeric(existing_skill.get(field)),
                numeric(incoming_skill.get(field)),
            )
        skills[skill_key] = merged_skill

    return json.dumps(
        {
            "schemaVersion": 1,
            "updatedAt": max(
                numeric(existing_record.get("updatedAt")),
                numeric(incoming_record.get("updatedAt")),
            ),
            "totalCompletedQuestions": max(
                numeric(existing_record.get("totalCompletedQuestions")),
                numeric(incoming_record.get("totalCompletedQuestions")),
            ),
            "skills": skills,
        },
        ensure_ascii=False,
        separators=(",", ":"),
    )


def merge_storage_value(
    key: str,
    existing_value: Any,
    incoming_value: Any,
    incoming_is_newer: bool,
) -> str | None:
    if incoming_value is None:
        return existing_value if isinstance(existing_value, str) else None
    if existing_value is None:
        return incoming_value if isinstance(incoming_value, str) else None

    if key in {"childlearn.combo-max", "childlearn.rank-stars"}:
        return stringify_int(max(numeric(existing_value), numeric(incoming_value)))
    if key == "childlearn.session-stats":
        return merge_number_fields(existing_value, incoming_value, ["attempted", "correct", "hintsUsed"])
    if key == "childlearn.combo-state":
        return merge_combo_state(existing_value, incoming_value)
    if key == "childlearn.number-spirits":
        return merge_number_record(existing_value, incoming_value)
    if key == "childlearn.reward-garden":
        return merge_garden(existing_value, incoming_value)
    if key == "childlearn.daily-first-win":
        return sorted([existing_value, incoming_value])[-1]
    if key == "childlearn.m78-stickers":
        return merge_sticker_ids(existing_value, incoming_value)
    if key == "childlearn.ability-profile-v1":
        return merge_ability_profile(existing_value, incoming_value)
    if key in {"childlearn.app-state-v1", "childlearn.dda-state"}:
        return incoming_value if incoming_is_newer else existing_value

    return incoming_value if incoming_is_newer else existing_value


def sanitize_storage(storage: Any) -> dict[str, str]:
    if not isinstance(storage, dict):
        return {}

    return {
        key: value
        for key, value in storage.items()
        if key in LEARNING_STORAGE_KEYS and isinstance(value, str)
    }


def read_child_state(child_id: str) -> dict[str, Any] | None:
    path = child_state_path(child_id)
    if not path.exists():
        return None

    try:
        parsed = json.loads(path.read_text(encoding="utf-8"))
        return parsed if isinstance(parsed, dict) else None
    except json.JSONDecodeError:
        return None


def write_child_state(child_id: str, payload: dict[str, Any]) -> None:
    path = child_state_path(child_id)
    path.parent.mkdir(parents=True, exist_ok=True)
    temp_path = path.with_suffix(".tmp")
    temp_path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True),
        encoding="utf-8",
    )
    temp_path.replace(path)


def upsert_child_state(incoming_state: Any) -> dict[str, Any]:
    if not isinstance(incoming_state, dict):
        raise ValueError("state must be an object")
    if incoming_state.get("schemaVersion") != SYNC_STATE_SCHEMA_VERSION:
        raise ValueError("unsupported schemaVersion")

    child_id = safe_child_id(incoming_state.get("childId"))
    device_id = incoming_state.get("deviceId")
    client_updated_at = int(numeric(incoming_state.get("clientUpdatedAt"), now_ms()))
    incoming_storage = sanitize_storage(incoming_state.get("storage"))

    with SYNC_LOCK:
        existing_payload = read_child_state(child_id)
        existing_state = (
            existing_payload.get("state", {}) if isinstance(existing_payload, dict) else {}
        )
        existing_storage = sanitize_storage(existing_state.get("storage"))
        existing_client_updated_at = int(numeric(existing_state.get("clientUpdatedAt")))
        incoming_is_newer = client_updated_at >= existing_client_updated_at
        merged_storage: dict[str, str] = {}

        for key in LEARNING_STORAGE_KEYS:
            merged_value = merge_storage_value(
                key,
                existing_storage.get(key),
                incoming_storage.get(key),
                incoming_is_newer,
            )
            if isinstance(merged_value, str):
                merged_storage[key] = merged_value

        revision = int(numeric(existing_payload.get("revision") if existing_payload else 0)) + 1
        server_updated_at = now_ms()
        state = {
            "schemaVersion": SYNC_STATE_SCHEMA_VERSION,
            "childId": child_id,
            "deviceId": device_id if isinstance(device_id, str) else "unknown-device",
            "clientUpdatedAt": max(client_updated_at, existing_client_updated_at),
            "storage": merged_storage,
        }
        payload = {
            "ok": True,
            "state": state,
            "revision": revision,
            "serverUpdatedAt": server_updated_at,
        }
        write_child_state(child_id, payload)

    return payload


class FlowObserverHandler(BaseHTTPRequestHandler):
    server_version = "ChildLearnFlowObserver/1.1"

    def do_OPTIONS(self) -> None:  # noqa: N802
        self.send_response(204)
        send_cors_headers(self)
        self.end_headers()

    def do_GET(self) -> None:  # noqa: N802
        parsed_url = urllib.parse.urlparse(self.path)

        if parsed_url.path == "/sync/child-state":
            params = urllib.parse.parse_qs(parsed_url.query)
            child_id = params.get("childId", ["local-child"])[0]
            with SYNC_LOCK:
                payload = read_child_state(child_id)
            json_response(
                self,
                200,
                payload
                if payload
                else {
                    "ok": True,
                    "state": None,
                    "revision": 0,
                    "serverUpdatedAt": None,
                },
            )
            return

        if parsed_url.path != "/health":
            json_response(self, 404, {"error": "not_found"})
            return

        json_response(
            self,
            200,
            {
                "ok": True,
                "model": MODEL,
                "cliproxyBaseUrl": CLIPROXY_BASE_URL,
                "hasApiKey": bool(CLIPROXY_API_KEY),
            },
        )

    def do_POST(self) -> None:  # noqa: N802
        if self.path == "/track":
            try:
                event = read_json_request(self)
                append_telemetry_event(event)
                json_response(self, 200, {"ok": True})
            except Exception as exc:  # pragma: no cover - runtime diagnostics
                print(f"[flow-observer] telemetry {type(exc).__name__}: {exc}", file=sys.stderr)
                json_response(self, 500, {"error": "telemetry_failed"})
            return

        if self.path == "/sync/child-state":
            try:
                request_payload = read_json_request(self)
                payload = upsert_child_state(request_payload.get("state"))
                json_response(self, 200, payload)
            except ValueError as exc:
                json_response(self, 400, {"error": str(exc)})
            except Exception as exc:  # pragma: no cover - runtime diagnostics
                print(f"[flow-observer] sync {type(exc).__name__}: {exc}", file=sys.stderr)
                json_response(self, 500, {"error": "sync_failed"})
            return

        if self.path != "/observe":
            json_response(self, 404, {"error": "not_found"})
            return

        try:
            request_payload = read_json_request(self)
            report = request_payload.get("report")
            if not report:
                json_response(self, 400, {"error": "missing_report"})
                return

            json_response(self, 200, call_cliproxy(report))
        except urllib.error.HTTPError as exc:
            json_response(self, 502, {"error": "cliproxy_http_error", "status": exc.code})
        except Exception as exc:  # pragma: no cover - runtime diagnostics
            print(f"[flow-observer] {type(exc).__name__}: {exc}", file=sys.stderr)
            json_response(self, 500, {"error": "observer_failed"})

    def log_message(self, format: str, *args: Any) -> None:
        print(f"[flow-observer] {self.address_string()} - {format % args}")


def main() -> None:
    server = ThreadingHTTPServer((HOST, PORT), FlowObserverHandler)
    print(
        f"Flow observer listening on http://{HOST}:{PORT}/observe "
        f"with model {MODEL}; sync state dir: {SYNC_STATE_DIR}"
    )
    server.serve_forever()


if __name__ == "__main__":
    main()
