# GameVaultAI

GameVaultAI is a full-stack application for organizing a personal video game library and tracking gameplay. Users can search and import games from RAWG, manage collections and progress, record play sessions, and review statistics and activity history. Optional personalized recommendations and session-note summaries use the Google Gemini API.

> BYOP eligibility has not been confirmed. GameVaultAI consumes an external LLM API for optional product features; this integration is disclosed below and has not been removed or hidden.

## Features

- Account registration and JWT authentication, with username/email sign-in and optional Discord OAuth.
- Personal game library with search, filters, favorites, and pagination.
- Game search and import through RAWG.
- Game status, platform, rating, playtime, genres, and completion tracking.
- Gameplay sessions, history, and statistics.
- Session screenshots stored locally or in optional Supabase Storage.
- Optional local gameplay recording stored in the browser's IndexedDB.
- Optional Gemini-powered game recommendations and session-note analysis.

## AI Integration

Gemini provides two supplementary features: personalized game recommendations based on a user's library, and summaries of notes written for recent gameplay sessions. The backend sends requests to Google's external Gemini API. GameVaultAI does not develop, train, fine-tune, host, or serve AI models, and it does not operate model inference infrastructure.

For recommendations, the prompt contains each library game's title, platform, status, favorite flag, personal rating, hours played, genres, and Metacritic score. For session analysis, it contains the game title, session timestamp, duration, and the user's note. The analysis includes at most 30 recent sessions, and each note is truncated to 700 characters. These fields can describe a person's interests and play habits; free-text notes may contain identifying information. Usernames and email addresses are not included in either prompt by the current implementation.

The application does not attach session images or gameplay videos to Gemini. Session images are sent to the GameVaultAI backend and stored on local disk or optional Supabase Storage. Gameplay recordings stay in the browser's IndexedDB and are not uploaded to the backend. The code does not persist Gemini prompts or responses; data handling and retention by Google are governed by the provider's terms and settings.

Library management, RAWG search/import, sessions, statistics, and local recording do not call Gemini and remain available when its API key is absent or the service is unavailable. Only recommendations and session-note analysis depend on Gemini. RAWG search/import is a separate external integration and still requires its own API key.

RAWG searches send the search text to RAWG. Import and screenshot requests use RAWG game IDs, and recommendation titles are also searched there to add cover art. The backend makes the API requests, while the browser loads cover and screenshot URLs returned by RAWG directly from their image hosts. Those image hosts can receive the browser's network metadata, such as its IP address. GameVaultAI does not include account usernames or email addresses in these RAWG requests. The backend sends its RAWG API key as a query parameter; deployment logs should redact query strings.

### BYOP project description

> GameVaultAI is a full-stack personal game library and gameplay tracking application built with React, TypeScript, Python, FastAPI, and PostgreSQL. It helps users organize game collections, track play sessions, review statistics, and discover titles through RAWG. Optional recommendations and session-note summaries use the external Google Gemini API; the project does not develop or host AI models.

## Data and privacy

PostgreSQL stores account usernames, email addresses, password hashes (nullable for accounts created through Discord), the Discord account ID when linked, game-library records, gameplay-session records, and image metadata. Passwords are hashed before storage. Optional Discord sign-in uses Discord OAuth2 to obtain the account's verified email and ID; the app does not retain Discord access tokens. Session images themselves are stored on local disk by default or in a configured private Supabase Storage bucket. The browser stores the GameVaultAI JWT in `localStorage` and gameplay video blobs in IndexedDB. Clips can be downloaded by the user and are removed if deleted in the app or browser data is cleared.

When a user chooses Discord sign-in, the browser is redirected to Discord and Discord returns the verified email and account ID to the backend through the configured OAuth callback. This exchange is optional and does not occur during username/email sign-in.

Uploaded session images are stored as received; the application does not remove EXIF or other embedded image metadata. Images, free-text notes, and screen recordings may contain personal information or information about other people. Screen recordings, including captured audio when available, stay in browser IndexedDB and are not sent to the backend. The app currently has no account deletion or data export endpoint; database account records remain until removed by the deployment operator. Users can delete individual games, sessions, and session images through the app.

The app supports multiple accounts and can process personal data entered by users, even though the project owner reports being its only user so far. Tests use synthetic accounts and fixture data, with mocked RAWG and Gemini calls. A deployment may handle personal data if other people register or enter identifying details in session notes.

## Technology

- **Frontend:** React, TypeScript, Vite
- **Backend:** Python, FastAPI, SQLAlchemy, Pydantic
- **Database and migrations:** PostgreSQL, Alembic
- **External APIs:** RAWG, Google Gemini (optional product features)
- **Storage:** local media directory or optional Supabase Storage
- **Deployment:** Vercel (frontend), Render (backend), Supabase (PostgreSQL / optional storage)
- **Quality:** pytest, ESLint, TypeScript build, GitHub Actions

## Requirements

- Python 3.14+
- Node.js 24 and npm
- Docker Desktop with Docker Compose (for the containerized setup)
- RAWG API key for game search/import
- Gemini API key only for AI recommendations and session-note analysis
- Discord application credentials only if you enable Discord sign-in

## Local setup

Copy the environment template and set a unique random `SECRET_KEY` of at least 32 characters. The API rejects the example placeholder and shorter keys. API keys are optional unless you use their corresponding integrations.

```powershell
Copy-Item .env.example .env
Copy-Item frontend/.env.example frontend/.env
```

Start PostgreSQL and install backend dependencies:

```powershell
docker compose up -d db
python -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
alembic upgrade head
```

Install frontend dependencies and start the API and frontend from the repository root:

```powershell
npm --prefix frontend ci
npm install
npm run dev
```

The frontend and API are available at `http://localhost:5173` and `http://localhost:8000`; API documentation is at `http://localhost:8000/docs`.

Alternatively, run the full stack with Docker Compose:

```powershell
docker compose up --build -d
```

The containerized frontend is available at `http://localhost:8080`. Configure production credentials in the deployment provider's secret settings. Never use the example database password or a placeholder JWT secret in a public deployment. `SUPABASE_SERVICE_ROLE_KEY` belongs only in the backend environment.

See `.env.example`, `frontend/.env.example`, and [frontend/README.md](frontend/README.md) for configuration details. Set `STORAGE_BACKEND=supabase` and configure a private bucket to store session screenshots in Supabase; local disk is the default. `GEMINI_MODEL` and `GEMINI_FALLBACK_MODEL` select the primary and fallback models.

To enable Discord sign-in, create an OAuth2 application in the Discord Developer Portal, set `DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET` in the backend environment, and register the exact `DISCORD_REDIRECT_URI` (default: `http://localhost:8000/auth/discord/callback`) as a redirect URI. Set `FRONTEND_URL` to the frontend origin (default for Vite: `http://localhost:5173`; use `http://localhost:8080` for the Docker Compose frontend). Discord login is hidden until both credentials are configured. The app requests only `identify` and `email`; Discord email must be verified. Users can also sign in with the username or email on their GameVaultAI account.

## Testing and CI

Backend tests use a separate SQLite database and mocks; they do not call RAWG or Gemini. Frontend tests cover language persistence and verify that every literal translation key used by the screens has an English translation. The GitHub Actions workflow runs pytest, frontend tests, ESLint, and the TypeScript/Vite build.

```powershell
pytest -q
npm --prefix frontend test
npm --prefix frontend run lint
npm --prefix frontend run build
```

## Gameplay media

Session screenshots are uploaded to the authenticated backend, which stores them on disk or in Supabase Storage. Each session accepts up to five JPEG, PNG, or WebP images, up to 5 MB each. Screen recordings use browser capture APIs and stay in local IndexedDB; recording requires a supported browser and a secure context such as HTTPS or localhost. The current recording limit is 15 minutes per clip. Video analysis with AI is not implemented.

## License

GameVaultAI's original code and project documentation are licensed under the MIT License; see [LICENSE](LICENSE). Third-party dependencies, assets, and services remain subject to their own terms and licenses.

## Roadmap

See [ROADMAP.md](ROADMAP.md) for planned engineering work and estimates.

## Documentação em português

Leia [README.pt-BR.md](README.pt-BR.md) para a versão em português brasileiro.
