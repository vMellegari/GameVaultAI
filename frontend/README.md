# Frontend

The React, TypeScript, and Vite client is part of the [GameVaultAI project](../README.md). The root README documents the product, privacy and AI data flow, environment setup, deployment, and tests.

## Development

From the repository root, install dependencies and start the API and Vite development server:

```powershell
npm --prefix frontend ci
npm install
npm run dev
```

Set `VITE_API_URL` in `frontend/.env` when the backend is not running at `http://localhost:8000`. This variable is embedded into the frontend at build time and must contain the public API URL in a hosted deployment.

## Quality checks

```powershell
npm --prefix frontend test
npm --prefix frontend run lint
npm --prefix frontend run build
```

See the root [README](../README.md) for the complete application setup and the [roadmap](../ROADMAP.md) for planned work.
