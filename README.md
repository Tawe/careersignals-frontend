# Career Signals Micro Frontend

Single-page React + Vite demo for the three Career Signals API endpoints.

## Quick start

```bash
npm install
npm run dev
```

Then open the printed localhost URL. To build for deploy:

```bash
npm run build
npm run preview
```

## Environment

- `VITE_API_BASE_URL` (default `https://x8ki-letl-twmt.n7.xano.io/api:career_signals`)
- `VITE_DEFAULT_API_KEY` (optional demo key; can stay empty). For quick demos, you can copy `env.example` to `.env` and keep the provided `test-key-123`.

## Features

- Tabs for Profile Analysis, Role Fit, Bullet Suggestions.
- Top bar to set base URL, API key, auth mode (header vs body), and stub mode.
- Forms with sensible defaults plus request validation.
- Response panel shows status, latency, request/response JSON, and copy buttons.
- cURL builder per endpoint that matches current form + auth mode.
- Optional stub responses for demos without an API key.

## Notes

- Keys are stored in-memory/localStorage for convenience; avoid committing real keys.
- All calls are client-side; app is static-deploy ready (Vercel/Netlify).

