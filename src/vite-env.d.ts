/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TTS_URL?: string;
  readonly VITE_EDGE_TTS_URL?: string;
  readonly VITE_TTS_REQUEST_TIMEOUT_MS?: string;
  readonly VITE_FLOW_OBSERVER_URL?: string;
  readonly VITE_FLOW_OBSERVER_TIMEOUT_MS?: string;
  readonly VITE_TELEMETRY_URL?: string;
  readonly VITE_LEARNING_SYNC_URL?: string;
  readonly VITE_LEARNING_CHILD_ID?: string;
}
