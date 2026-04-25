import { useCallback, useEffect, useMemo, useRef } from 'react';
import { resolveRuntimeUrl } from '../network/runtimeUrl';
import { track } from '../telemetry/track';
import type { VoiceLine } from './voiceLines';

const CONFIGURED_TTS_URL =
  import.meta.env.VITE_TTS_URL?.trim() ||
  import.meta.env.VITE_EDGE_TTS_URL?.trim() ||
  '';
const CONFIGURED_TTS_PROVIDER = import.meta.env.VITE_TTS_PROVIDER?.trim();
const DEFAULT_VOICE = 'zh-CN-XiaoxiaoNeural';
const DEFAULT_VOLUME = '+0%';
const DEFAULT_PITCH = '-2Hz';
const configuredRequestTimeoutMs = Number(import.meta.env.VITE_TTS_REQUEST_TIMEOUT_MS);
const REQUEST_TIMEOUT_MS =
  Number.isFinite(configuredRequestTimeoutMs) && configuredRequestTimeoutMs > 0
    ? configuredRequestTimeoutMs
    : 30000;
const MIN_PLAYBACK_WAIT_MS = 1800;
const MAX_PLAYBACK_WAIT_MS = 11000;
const FALLBACK_PLAYBACK_GUARD_MS = 30000;
const PLAYBACK_END_GRACE_MS = 1800;
const AUDIO_TAIL_FADE_MS = 620;
const AUDIO_FADE_INTERVAL_MS = 40;
const MAX_AUDIO_CACHE_ITEMS = 40;

function getRuntimeTtsUrl() {
  return resolveRuntimeUrl(CONFIGURED_TTS_URL);
}

function getRemoteTtsProvider(ttsUrl: string): Exclude<
  VoicePlaybackResult['provider'],
  'browser-speech' | 'none'
> {
  if (
    CONFIGURED_TTS_PROVIDER === 'edge-tts' ||
    CONFIGURED_TTS_PROVIDER === 'indextts2' ||
    CONFIGURED_TTS_PROVIDER === 'volcengine'
  ) {
    return CONFIGURED_TTS_PROVIDER;
  }

  return ttsUrl.toLowerCase().includes('volcengine') ||
    ttsUrl.includes(':8791/') ||
    ttsUrl.includes(':8793/')
    ? 'volcengine'
    : ttsUrl.toLowerCase().includes('indextts') ||
        ttsUrl.includes(':8789/')
      ? 'indextts2'
      : 'edge-tts';
}

interface SpeakOptions {
  notifyOnUnsupported?: boolean;
}

export interface VoicePlaybackResult {
  provider: 'edge-tts' | 'indextts2' | 'volcengine' | 'browser-speech' | 'none';
  status: 'finished' | 'stopped' | 'unavailable';
}

interface ActivePlayback {
  complete: (result: VoicePlaybackResult) => void;
}

interface ActiveWebAudioPlayback {
  source: AudioBufferSourceNode;
  stop: () => void;
}

interface CachedAudioData {
  contentType: string;
  audioData: ArrayBuffer;
}

type WebAudioWindow = Window & {
  webkitAudioContext?: typeof AudioContext;
};

const STOPPED_RESULT: VoicePlaybackResult = {
  provider: 'none',
  status: 'stopped',
};
const audioDataCache = new Map<string, CachedAudioData>();

function createFinishedResult(
  provider: VoicePlaybackResult['provider'],
): VoicePlaybackResult {
  return {
    provider,
    status: 'finished',
  };
}

function createUnavailableResult(): VoicePlaybackResult {
  return {
    provider: 'none',
    status: 'unavailable',
  };
}

function createAudioCacheKey({
  provider,
  text,
  voice,
  rate,
  volume,
  pitch,
}: {
  provider: VoicePlaybackResult['provider'];
  text: string;
  voice: string;
  rate?: string;
  volume: string;
  pitch: string;
}) {
  return JSON.stringify({ provider, text, voice, rate, volume, pitch });
}

function readCachedAudioData(key: string) {
  const cached = audioDataCache.get(key);
  if (!cached) {
    return null;
  }

  audioDataCache.delete(key);
  audioDataCache.set(key, cached);
  return {
    ...cached,
    audioData: cached.audioData.slice(0),
  };
}

function writeCachedAudioData(key: string, value: CachedAudioData) {
  audioDataCache.set(key, {
    contentType: value.contentType,
    audioData: value.audioData.slice(0),
  });

  while (audioDataCache.size > MAX_AUDIO_CACHE_ITEMS) {
    const oldestKey = audioDataCache.keys().next().value;
    if (!oldestKey) {
      return;
    }
    audioDataCache.delete(oldestKey);
  }
}

function estimatePlaybackWaitMs(text: string) {
  const punctuationPause = (text.match(/[，。！？,.!?]/g)?.length ?? 0) * 180;
  const spokenUnits = Array.from(text).filter((char) => char.trim()).length;
  return Math.min(
    Math.max(spokenUnits * 170 + punctuationPause + 900, MIN_PLAYBACK_WAIT_MS),
    MAX_PLAYBACK_WAIT_MS,
  );
}

function rateToSpeechSynthesis(rate?: string) {
  if (!rate) {
    return 0.95;
  }

  const match = rate.match(/^([+-]\d+)%$/);
  if (!match) {
    return 0.95;
  }

  const parsed = 1 + Number(match[1]) / 100;
  return Math.min(Math.max(parsed, 0.65), 1.25);
}

function canUseBrowserVoice() {
  return (
    typeof window !== 'undefined' &&
    Boolean(window.speechSynthesis) &&
    typeof SpeechSynthesisUtterance !== 'undefined'
  );
}

function revokeUrl(url: string) {
  window.setTimeout(() => URL.revokeObjectURL(url), 500);
}

function tailFadeMsForDuration(durationSeconds: number) {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return AUDIO_TAIL_FADE_MS;
  }

  return Math.min(AUDIO_TAIL_FADE_MS, Math.max(220, durationSeconds * 1000 * 0.22));
}

function startAudioTailFade(audio: HTMLAudioElement) {
  const baseVolume = audio.volume || 1;
  let isFading = false;

  const updateVolume = () => {
    if (!Number.isFinite(audio.duration) || audio.duration <= 0) {
      return;
    }

    const remainingMs = Math.max((audio.duration - audio.currentTime) * 1000, 0);
    const fadeMs = tailFadeMsForDuration(audio.duration);

    if (remainingMs > fadeMs && !isFading) {
      return;
    }

    isFading = true;
    const fadeRatio = Math.min(Math.max(remainingMs / fadeMs, 0), 1);
    audio.volume = Math.max(baseVolume * fadeRatio, 0.03);
  };

  const intervalId = window.setInterval(updateVolume, AUDIO_FADE_INTERVAL_MS);
  audio.addEventListener('timeupdate', updateVolume);
  audio.addEventListener('loadedmetadata', updateVolume);
  audio.addEventListener('durationchange', updateVolume);

  return () => {
    window.clearInterval(intervalId);
    audio.removeEventListener('timeupdate', updateVolume);
    audio.removeEventListener('loadedmetadata', updateVolume);
    audio.removeEventListener('durationchange', updateVolume);
    audio.volume = baseVolume;
  };
}

let audioOutputPrimed = false;
let audioOutputPrimePending = false;
let reusableAudioElement: HTMLAudioElement | null = null;
let audioOutputPrimeUrl: string | null = null;
let sharedAudioContext: AudioContext | null = null;

function getSharedAudioContext() {
  if (typeof window === 'undefined') {
    return null;
  }

  if (sharedAudioContext?.state === 'closed') {
    sharedAudioContext = null;
  }

  if (sharedAudioContext) {
    return sharedAudioContext;
  }

  const AudioContextConstructor =
    window.AudioContext ?? (window as WebAudioWindow).webkitAudioContext;
  if (!AudioContextConstructor) {
    return null;
  }

  sharedAudioContext = new AudioContextConstructor();
  return sharedAudioContext;
}

function primeWebAudioOutput() {
  const context = getSharedAudioContext();
  if (!context) {
    return null;
  }

  if (context.state === 'suspended') {
    void context.resume().catch(() => undefined);
  }

  try {
    const source = context.createBufferSource();
    source.buffer = context.createBuffer(1, 1, 8000);
    source.connect(context.destination);
    source.start(0);
  } catch {
    // The HTMLAudioElement unlock below is still a useful fallback.
  }

  return context;
}

async function getRunningAudioContext() {
  const context = getSharedAudioContext();
  if (!context) {
    return null;
  }

  if (context.state === 'suspended') {
    try {
      await context.resume();
    } catch {
      return null;
    }
  }

  return context.state === 'running' ? context : null;
}

function writeAscii(view: DataView, offset: number, value: string) {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
}

function createSilentWavUrl() {
  const sampleRate = 8000;
  const sampleCount = 80;
  const dataSize = sampleCount * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(view, 8, 'WAVE');
  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  return URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' }));
}

function isAudioUsingUrl(audio: HTMLAudioElement, url: string) {
  return audio.src === url || audio.currentSrc === url;
}

function getReusableAudioElement() {
  if (reusableAudioElement || typeof document === 'undefined') {
    return reusableAudioElement;
  }

  reusableAudioElement = new Audio();
  reusableAudioElement.preload = 'auto';
  reusableAudioElement.volume = 1;
  reusableAudioElement.setAttribute('playsinline', 'true');
  reusableAudioElement.style.display = 'none';
  document.body.appendChild(reusableAudioElement);

  return reusableAudioElement;
}

function primeAudioOutput() {
  primeWebAudioOutput();

  const audio = getReusableAudioElement();
  if (!audio || audioOutputPrimed || audioOutputPrimePending) {
    return audio;
  }

  audioOutputPrimePending = true;
  const url = createSilentWavUrl();
  audioOutputPrimeUrl = url;
  audio.src = url;
  audio.load();

  const cleanup = () => {
    if (isAudioUsingUrl(audio, url)) {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    }
    if (audioOutputPrimeUrl === url) {
      audioOutputPrimeUrl = null;
    }
    revokeUrl(url);
    audioOutputPrimePending = false;
  };

  void audio
    .play()
    .then(() => {
      audioOutputPrimed = true;
      cleanup();
    })
    .catch(cleanup);

  return audio;
}

function cancelPendingAudioPrime(audio: HTMLAudioElement | null) {
  if (!audioOutputPrimePending || !audioOutputPrimeUrl) {
    return;
  }

  const url = audioOutputPrimeUrl;
  audioOutputPrimePending = false;
  audioOutputPrimeUrl = null;

  if (audio && isAudioUsingUrl(audio, url)) {
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
  }
  revokeUrl(url);
}

function isInterruptedPlayRequest(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError';
}

async function playAudioWithShortRetry(audio: HTMLAudioElement) {
  try {
    await audio.play();
  } catch (error) {
    if (!isInterruptedPlayRequest(error)) {
      throw error;
    }

    await new Promise((resolve) => window.setTimeout(resolve, 90));
    await audio.play();
  }
}

export function useVoicePlayer(onUnavailable?: (message: string) => void) {
  const abortRef = useRef<AbortController | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const activePlaybackRef = useRef<ActivePlayback | null>(null);
  const webAudioPlaybackRef = useRef<ActiveWebAudioPlayback | null>(null);

  const completeActivePlayback = useCallback((result: VoicePlaybackResult) => {
    activePlaybackRef.current?.complete(result);
    activePlaybackRef.current = null;
  }, []);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;

    webAudioPlaybackRef.current?.stop();
    webAudioPlaybackRef.current = null;

    const audio = audioRef.current;
    if (audio) {
      const isPrimingAudio =
        audioOutputPrimePending &&
        Boolean(audioOutputPrimeUrl) &&
        isAudioUsingUrl(audio, audioOutputPrimeUrl ?? '');

      if (!isPrimingAudio) {
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
      }
    }

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }

    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    completeActivePlayback(STOPPED_RESULT);
  }, [completeActivePlayback]);

  const waitForAudioEnd = useCallback(
    (
      audio: HTMLAudioElement,
      url: string,
      text: string,
      provider: Exclude<VoicePlaybackResult['provider'], 'browser-speech' | 'none'>,
    ) =>
      new Promise<VoicePlaybackResult>((resolve) => {
        let isComplete = false;
        let timeoutId = 0;
        const cleanupTailFade = startAudioTailFade(audio);

        const schedulePlaybackGuard = (delayMs: number) => {
          window.clearTimeout(timeoutId);
          timeoutId = window.setTimeout(
            () => complete(createFinishedResult(provider)),
            delayMs,
          );
        };

        const scheduleDurationGuard = () => {
          if (!Number.isFinite(audio.duration) || audio.duration <= 0) {
            return;
          }

          schedulePlaybackGuard(audio.duration * 1000 + PLAYBACK_END_GRACE_MS);
        };

        schedulePlaybackGuard(
          Math.max(estimatePlaybackWaitMs(text), FALLBACK_PLAYBACK_GUARD_MS),
        );

        const releaseAudioUrl = () => {
          cleanupTailFade();
          if (objectUrlRef.current === url) {
            objectUrlRef.current = null;
          }
          if (isAudioUsingUrl(audio, url)) {
            audio.pause();
            audio.removeAttribute('src');
            audio.load();
          }
          revokeUrl(url);
        };

        const complete = (result: VoicePlaybackResult) => {
          if (isComplete) {
            return;
          }

          isComplete = true;
          window.clearTimeout(timeoutId);
          releaseAudioUrl();
          if (activePlaybackRef.current?.complete === complete) {
            activePlaybackRef.current = null;
          }
          resolve(result);
        };

        activePlaybackRef.current = { complete };
        audio.addEventListener('loadedmetadata', scheduleDurationGuard, { once: true });
        audio.addEventListener('durationchange', scheduleDurationGuard, { once: true });
        audio.addEventListener('ended', () => complete(createFinishedResult(provider)), {
          once: true,
        });
        audio.addEventListener('error', () => complete(STOPPED_RESULT), { once: true });
      }),
    [],
  );

  const playWithWebAudio = useCallback(
    async (
      audioData: ArrayBuffer,
      text: string,
      provider: Exclude<VoicePlaybackResult['provider'], 'browser-speech' | 'none'>,
    ) => {
      const context = await getRunningAudioContext();
      if (!context) {
        return null;
      }

      let buffer: AudioBuffer;
      try {
        buffer = await context.decodeAudioData(audioData.slice(0));
      } catch {
        return null;
      }

      return new Promise<VoicePlaybackResult>((resolve) => {
        let isComplete = false;
        let timeoutId = 0;
        const source = context.createBufferSource();
        const gain = context.createGain();
        source.buffer = buffer;
        source.connect(gain);
        gain.connect(context.destination);

        const now = context.currentTime;
        const fadeMs = tailFadeMsForDuration(buffer.duration);
        const fadeStart = now + Math.max(buffer.duration - fadeMs / 1000, 0);
        const fadeEnd = now + Math.max(buffer.duration, 0.01);
        gain.gain.setValueAtTime(1, now);
        gain.gain.setValueAtTime(1, fadeStart);
        gain.gain.linearRampToValueAtTime(0.03, fadeEnd);

        const cleanup = () => {
          window.clearTimeout(timeoutId);
          source.onended = null;
          try {
            source.disconnect();
          } catch {
            // Already disconnected.
          }
          try {
            gain.disconnect();
          } catch {
            // Already disconnected.
          }
          if (webAudioPlaybackRef.current?.source === source) {
            webAudioPlaybackRef.current = null;
          }
        };

        const complete = (result: VoicePlaybackResult) => {
          if (isComplete) {
            return;
          }

          isComplete = true;
          cleanup();
          if (activePlaybackRef.current?.complete === complete) {
            activePlaybackRef.current = null;
          }
          resolve(result);
        };

        const stopPlayback = () => {
          try {
            source.stop();
          } catch {
            // It may have already ended before stop is requested.
          }
          complete(STOPPED_RESULT);
        };

        webAudioPlaybackRef.current = { source, stop: stopPlayback };
        activePlaybackRef.current = { complete };
        timeoutId = window.setTimeout(
          () => complete(createFinishedResult(provider)),
          Math.max(buffer.duration * 1000 + PLAYBACK_END_GRACE_MS, estimatePlaybackWaitMs(text)),
        );
        source.onended = () => complete(createFinishedResult(provider));

        try {
          source.start();
        } catch {
          complete(STOPPED_RESULT);
        }
      });
    },
    [],
  );

  const speakWithBrowserVoice = useCallback((line: VoiceLine) => {
    if (!canUseBrowserVoice()) {
      return null;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(line.text);
    utterance.lang = 'zh-CN';
    utterance.rate = rateToSpeechSynthesis(line.rate);
    utterance.pitch = 0.98;

    return new Promise<VoicePlaybackResult>((resolve) => {
      let isComplete = false;
      const timeoutId = window.setTimeout(
        () => complete(createFinishedResult('browser-speech')),
        estimatePlaybackWaitMs(line.text),
      );

      const complete = (result: VoicePlaybackResult) => {
        if (isComplete) {
          return;
        }

        isComplete = true;
        window.clearTimeout(timeoutId);
        if (activePlaybackRef.current?.complete === complete) {
          activePlaybackRef.current = null;
        }
        resolve(result);
      };

      activePlaybackRef.current = { complete };
      utterance.onend = () => complete(createFinishedResult('browser-speech'));
      utterance.onerror = () => complete(STOPPED_RESULT);
      window.speechSynthesis.speak(utterance);
    });
  }, []);

  const speak = useCallback(
    async (
      line: VoiceLine,
      options: SpeakOptions = {},
    ): Promise<VoicePlaybackResult> => {
      const text = line.text.trim();
      if (!text) {
        return createUnavailableResult();
      }

      stop();
      const primedAudio = primeAudioOutput();

      const controller = new AbortController();
      abortRef.current = controller;
      const ttsUrl = getRuntimeTtsUrl();
      if (!ttsUrl) {
        abortRef.current = null;
        const fallbackResult = await speakWithBrowserVoice({ ...line, text });
        track('voice.play', {
          provider: fallbackResult ? 'browser-speech' : 'unavailable',
          moment: line.moment,
        });
        if (!fallbackResult && options.notifyOnUnsupported) {
          onUnavailable?.('当前浏览器不支持语音播放');
        }
        return fallbackResult ?? createUnavailableResult();
	      }

	      const remoteTtsProvider = getRemoteTtsProvider(ttsUrl);
	      const voice = line.voice ?? DEFAULT_VOICE;
	      const volume = line.volume ?? DEFAULT_VOLUME;
	      const pitch = line.pitch ?? DEFAULT_PITCH;
	      const cacheKey = createAudioCacheKey({
	        provider: remoteTtsProvider,
	        text,
	        voice,
	        rate: line.rate,
	        volume,
	        pitch,
	      });
	      let requestTimedOut = false;
	      const timeoutId = window.setTimeout(() => {
	        requestTimedOut = true;
	        controller.abort();
	      }, REQUEST_TIMEOUT_MS);

	      try {
	        const cachedAudio = readCachedAudioData(cacheKey);
	        let contentType = cachedAudio?.contentType ?? 'audio/mpeg';
	        let audioData = cachedAudio?.audioData ?? null;

	        if (!audioData) {
	          const response = await fetch(ttsUrl, {
	            method: 'POST',
	            headers: {
	              'Content-Type': 'application/json',
	            },
	            body: JSON.stringify({
	              text,
	              voice,
	              rate: line.rate,
	              volume,
	              pitch,
	            }),
	            signal: controller.signal,
	          });

	          if (!response.ok) {
	            throw new Error(`TTS failed: ${response.status}`);
	          }

	          contentType = response.headers.get('content-type') ?? 'audio/mpeg';
	          audioData = await response.arrayBuffer();
	          writeCachedAudioData(cacheKey, { contentType, audioData });
	        }

	        const webAudioPlayback = await playWithWebAudio(
	          audioData,
	          text,
	          remoteTtsProvider,
	        );
	        if (webAudioPlayback) {
	          track('voice.play', {
	            provider: remoteTtsProvider,
	            moment: line.moment,
	            output: cachedAudio ? 'web-audio-cache' : 'web-audio',
	          });
	          return await webAudioPlayback;
	        }

	        const blob = new Blob([audioData], { type: contentType });
	        const url = URL.createObjectURL(blob);
        const audio = primedAudio ?? getReusableAudioElement() ?? new Audio();
        cancelPendingAudioPrime(audio);
        audio.src = url;
        audio.preload = 'auto';
        audio.volume = 1;
        audio.setAttribute('playsinline', 'true');
        audio.style.display = 'none';
        if (!audio.isConnected) {
          document.body.appendChild(audio);
        }
        audio.load();
        objectUrlRef.current = url;
        audioRef.current = audio;
        const playback = waitForAudioEnd(audio, url, text, remoteTtsProvider);
        void playAudioWithShortRetry(audio)
          .then(() => {
            track('voice.play', { provider: remoteTtsProvider, moment: line.moment });
          })
          .catch(() => {
            if (remoteTtsProvider === 'volcengine') {
              onUnavailable?.('浏览器刚刚拦截了语音播放，请再点一次播放语音');
            }
            completeActivePlayback(STOPPED_RESULT);
          });
        return await playback;
      } catch (error) {
        if (objectUrlRef.current) {
          URL.revokeObjectURL(objectUrlRef.current);
          objectUrlRef.current = null;
        }
        audioRef.current = null;

        if (controller.signal.aborted && !requestTimedOut) {
          return STOPPED_RESULT;
        }

        if (remoteTtsProvider === 'volcengine') {
          track('voice.play', {
            provider: 'unavailable',
            moment: line.moment,
          });
          if (options.notifyOnUnsupported) {
            onUnavailable?.('豆包语音暂时不可用');
          }
          return createUnavailableResult();
        }

        const fallbackResult = await speakWithBrowserVoice({ ...line, text });
        const didFallback = Boolean(fallbackResult);
        track('voice.play', {
          provider: didFallback ? 'browser-speech' : 'unavailable',
          moment: line.moment,
        });

        if (!didFallback && options.notifyOnUnsupported) {
          onUnavailable?.('当前浏览器不支持语音播放');
        }

        return fallbackResult ?? createUnavailableResult();
      } finally {
        window.clearTimeout(timeoutId);
        if (abortRef.current === controller) {
          abortRef.current = null;
        }
      }
    },
	    [
	      completeActivePlayback,
	      onUnavailable,
	      playWithWebAudio,
	      speakWithBrowserVoice,
	      stop,
	      waitForAudioEnd,
	    ],
	  );

  useEffect(() => {
    const unlock = () => primeAudioOutput();
    window.addEventListener('pointerdown', unlock, { capture: true, passive: true });
    window.addEventListener('touchend', unlock, { capture: true, passive: true });
    window.addEventListener('keydown', unlock, { capture: true });

    return () => {
      window.removeEventListener('pointerdown', unlock, { capture: true });
      window.removeEventListener('touchend', unlock, { capture: true });
      window.removeEventListener('keydown', unlock, { capture: true });
    };
  }, []);

  useEffect(() => stop, [stop]);

  return useMemo(() => ({ speak, stop }), [speak, stop]);
}
