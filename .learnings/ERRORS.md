# Errors

Use this file for failures, tool issues, and non-obvious debugging outcomes.

---

## [ERR-YYYYMMDD-001] category

**Logged**: YYYY-MM-DDTHH:MM:SSZ
**Priority**: high
**Status**: pending
**Area**: general

### Summary
Short description of the failure.

### Symptoms
What failed, including the command, tool, or surface involved.

### Diagnosis
What we believe caused the failure.

### Workaround
Temporary mitigation if one exists.

### Suggested Fix
Concrete next action to prevent recurrence.

### Related Files
- path/to/file

### See Also
- Optional reference to related entries such as `LRN-YYYYMMDD-001`

---

## [ERR-20260424-001] tooling

**Logged**: 2026-04-24T12:43:32Z
**Priority**: medium
**Status**: resolved
**Area**: config

### Summary
`npm run build` failed when Vitest config was embedded in `vite.config.ts`.

### Symptoms
TypeScript reported incompatible Vite plugin types from `vite` and Vitest's nested `vite` dependency, plus `test` was not accepted on the Vite user config type.

### Diagnosis
Using `defineConfig` from `vitest/config` in the main Vite config pulled Vitest's Vite types into the app build config.

### Workaround
None needed after the config split.

### Suggested Fix
Keep `vite.config.ts` focused on Vite build settings and place test settings in `vitest.config.ts`.

### Related Files
- vite.config.ts
- vitest.config.ts

### See Also
- None

---

## [ERR-20260424-002] tooling

**Logged**: 2026-04-24T12:46:52Z
**Priority**: low
**Status**: resolved
**Area**: tests

### Summary
The local Playwright CLI screenshot command rejected `--output`.

### Symptoms
`playwright_cli.sh screenshot --output output/playwright/child-learn-home.png` failed with "Unknown option: --output".

### Diagnosis
This wrapper's screenshot command uses `--filename` to choose the saved file path.

### Workaround
Use `--filename output/playwright/<name>.png`.

### Suggested Fix
For future browser verification artifacts, call `playwright_cli.sh screenshot --filename ...`.

### Related Files
- output/playwright/child-learn-home.png

### See Also
- None

---

## [ERR-20260424-003] tooling

**Logged**: 2026-04-24T18:34:26Z
**Priority**: low
**Status**: resolved
**Area**: config

### Summary
`npm run voice:setup` failed once because pip received a truncated package index response.

### Symptoms
`python3 -m pip install -r requirements-voice.txt` crashed with `json.decoder.JSONDecodeError: Unterminated string` while resolving `edge-tts`.

### Diagnosis
The resolver was reading cached/index JSON that appeared incomplete. The package constraints were valid.

### Workaround
Retry the same requirements with `python3 -m pip install --no-cache-dir -r requirements-voice.txt`.

### Suggested Fix
If this recurs, make `voice:setup` use `--no-cache-dir` or document that flag in the voice setup instructions.

### Related Files
- requirements-voice.txt
- package.json

### See Also
- None

---

## [ERR-20260424-004] tooling

**Logged**: 2026-04-24T19:42:24Z
**Priority**: medium
**Status**: resolved
**Area**: config

### Summary
CosyVoice requirements install can fail on `openai-whisper` unless setuptools is constrained.

### Symptoms
`python -m pip install -r requirements.txt` inside the CosyVoice POC venv failed while building `openai-whisper` because the isolated build environment could not import `pkg_resources`.

### Diagnosis
The dependency build path expects setuptools-provided `pkg_resources`, but the unconstrained isolated build did not provide a compatible setuptools environment.

### Workaround
Create a pip constraint file with `setuptools<81` and run install with `PIP_CONSTRAINT=../pip-constraints.txt`.

### Suggested Fix
For future CosyVoice POCs, create the venv with Python 3.10, run `ensurepip`, upgrade pip, then install requirements with the setuptools constraint from the start.

### Related Files
- output/cosyvoice-poc/pip-constraints.txt
- output/cosyvoice-poc/CosyVoice/requirements.txt

### See Also
- LRN-20260424-003

---

## [ERR-20260426-001] tooling

**Logged**: 2026-04-26T03:35:00Z
**Priority**: low
**Status**: resolved
**Area**: tests

### Summary
Vitest in this repo does not support Jest's `--runInBand` flag.

### Symptoms
`npm test -- --runInBand` failed before running tests with `CACError: Unknown option --runInBand`.

### Diagnosis
The project uses Vitest 4.1.5; this CLI does not accept the Jest-style serial execution flag.

### Workaround
Use the repository script directly: `npm test`.

### Suggested Fix
For future one-off test runs, pass only Vitest-supported flags or use the plain project scripts first.

### Related Files
- package.json

### See Also
- None
