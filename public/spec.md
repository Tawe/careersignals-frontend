# Career Signals API – Micro Frontend Spec

Goal: A lightweight, production-ready micro frontend that demos the three Career Signals API endpoints (profile analysis, role fit, bullet suggestions). Emphasis on quick setup, clear API usage, and shareable demo links.

## 1. Scope & Objectives
- Showcase the API with a minimal, clean UI.
- Support all 3 endpoints with real calls.
- Allow switching between stub (no AI key) and AI-enabled mode.
- Provide copy/paste-ready cURL examples for each call.
- Be deployable as a static site (e.g., Vercel/Netlify) with a single-page micro frontend.

## 2. Tech Stack (suggested)
- Framework: React or Next.js (app router) with client-only data fetch (no backend needed).
- Styling: Tailwind or minimal CSS modules.
- HTTP: fetch/axios with request/response logging to console.
- State: Local component state; optional lightweight store (Zustand/Context) for API key + base URL.

## 3. Pages / Views
Single-page with tabs/sections:
1) **Profile Analysis**
2) **Role Fit**
3) **Bullet Suggestions**
4) **API Reference** (inline)

## 4. Core Features
- Input forms for each endpoint with sensible defaults (from MOCK_DATA.md/request.json).
- API key input (stored in memory only) and base URL input (default to `https://x8ki-letl-twmt.n7.xano.io/api:career_signals`).
- Toggle: “Use Authorization header” vs “Use test_api_key in body” (for demo).
- Submit and show:
  - Status code, latency, request body, response JSON (pretty printed).
  - Copy cURL button (built from current form state).
- Minimal validation and inline errors.
- Persist form values in localStorage (optional, dev-friendly).

## 5. Forms (per endpoint)

### 5.1 Profile Analysis (POST /v1/analyze/profile)
Fields:
- profile_text (textarea, required)
- locale (text, default `en-US`)
- include_leadership_signals (checkbox)
- include_risk_signals (checkbox)
- test_api_key (text, optional; only if “body key” mode)

### 5.2 Role Fit (POST /v1/analyze/role-fit)
Fields:
- profile_text (textarea, required)
- job_description (textarea, required)
- locale (text, default `en-US`)
- target_seniority_hint (text, optional)
- weightings (skills/domain/seniority/leadership as numbers; defaults 0.5/0.2/0.2/0.1)
- test_api_key (optional; only if “body key” mode)

### 5.3 Bullet Suggestions (POST /v1/suggest/bullets)
Fields:
- profile_text (textarea, required)
- job_description (textarea, optional)
- role_title (text, optional, default “VP of Engineering”)
- max_bullets (number, default 6)
- test_api_key (optional; only if “body key” mode)

## 6. Authentication Modes
- Mode A (recommended): Authorization header `Bearer <apiKey>`.
- Mode B (demo): `test_api_key` in body.
UI toggle to pick mode; render fields accordingly.

## 7. Environment & Config
- `VITE_API_BASE_URL` (default `https://x8ki-letl-twmt.n7.xano.io/api:career_signals`)
- `VITE_DEFAULT_API_KEY` (optional for demo; otherwise user enters)
- Safe to keep keys empty in code; expect user input at runtime.

## 8. UX / UI
- Top bar: Base URL input, API key input, auth mode toggle.
- Tabs for the three endpoints.
- Each tab: left side form, right side response panel.
- Response panel: status code, time, JSON pretty print, copy response as JSON button, copy cURL button.
- Error banner for non-2xx with parsed message.
- Footer: link to docs/spec and cURL examples.

## 9. cURL Builder (per tab)
Build cURL from current form state:
- URL = `${baseUrl}/v1/analyze/profile` etc.
- Headers: Content-Type, Authorization (if header mode).
- Body: JSON from form (include test_api_key only in body mode).
Provide “Copy cURL” button.

## 10. Sample Defaults (seed values)
Use the same sample as in `request.json`:
- profile_text: “Senior Software Engineer with 10+ years …”
- locale: “en-US”
- options: include_leadership_signals=true, include_risk_signals=true
Role Fit: add a concise JD placeholder.
Bullets: role_title “VP of Engineering”, max_bullets 6.

## 11. Error Handling
- Show HTTP status and parsed JSON error (`code`, `message`, `details`).
- If JSON parse fails, show raw text.
- Validate required fields client-side (profile_text, JD where required).

## 12. Performance & Logging
- Log request/response to console (dev aid).
- Show simple latency measurement in UI.
- No heavy analytics.

## 13. Testing Plan (frontend)
- Happy path for all three endpoints with header auth.
- Happy path with `test_api_key` mode.
- Missing required fields -> client validation.
- Invalid API key -> 401 displayed.
- Rate limit scenario (if possible) -> show 429.

## 14. Deployment
- Static deploy (Vercel/Netlify). No server required.
- Environment vars set at build time; allow runtime overrides via UI fields.

## 15. Nice-to-Haves (optional)
- Dark mode toggle.
- Save/load presets for requests.
- Minimal auth key masking toggle (show/hide).

## 16. Deliverables
- Single-page micro frontend that can be opened and used without backend changes.
- README with setup: `npm install`, `npm run dev`, `npm run build`.
- Note in README: Do not hardcode real API keys; use runtime input.

