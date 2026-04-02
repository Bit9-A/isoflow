# AI Proxy (Gemini)

Simple backend proxy to avoid exposing API keys in the frontend.

## Run

1. Create `.env` in project root (or export vars in shell):

```
GEMINI_API_KEY=your_real_key
AI_PROXY_PORT=8787
GEMINI_MODEL=gemini-1.5-flash
AI_PROXY_ALLOWED_ORIGIN=http://localhost:3000
```

2. Start frontend + proxy:

```
npm run start:with-proxy
```

Frontend uses `/api/ai/stream` (proxied by webpack dev server to `http://localhost:8787`).
