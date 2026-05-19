# Bonfire

> A hand-kept directory of student associations, sports clubs and creative
> circles — combating urban loneliness through interest-based community
> discovery. Starting in Delft, Den Haag and Rotterdam.
>

Bonfire pairs a FastAPI backend that runs a local semantic-search recommender
(MiniLM via `sentence-transformers`, with on-disk embedding cache) with a
TanStack Start + React 19 frontend that lets you browse, filter and ask "The
Scout" for AI-ranked recommendations in plain English.

---

## Tech stack

### Backend (`backend/`)

| Concern              | Choice                                         |
| -------------------- | ---------------------------------------------- |
| Language / runtime   | Python 3.13                                    |
| Web framework        | FastAPI 0.136 + Uvicorn (ASGI)                 |
| Schemas / validation | Pydantic v2                                    |
| Semantic search      | `sentence-transformers` (MiniLM-L6-v2) + Torch |
| Numerical            | NumPy, scikit-learn                            |
| Persistence          | Plain JSON file (`backend/data/communities.json`) with a thread lock for safe concurrent reads/writes |
| Embedding cache      | Pickled NumPy array next to the JSON; hash-keyed by corpus content |
| Device acceleration  | Apple Metal (MPS) auto-detected, falls back to CUDA, then CPU |

### Frontend (`frontend/`)

| Concern             | Choice                                          |
| ------------------- | ----------------------------------------------- |
| Framework           | React 19 + TanStack Start (Vite-based SSR)      |
| Router              | TanStack Router (file-based, `src/routes/`)     |
| Data fetching       | TanStack Query                                  |
| Styling             | Tailwind CSS v4 + shadcn/ui (Radix primitives)  |
| Animation           | Framer Motion                                   |
| Forms / validation  | React Hook Form + Zod                           |
| Icons               | Lucide                                          |
| Build / dev server  | Vite 7                                          |
| Type system         | TypeScript 5.8 (strict)                         |
| Package manager     | Bun (lockfile committed) — npm also works       |

---

## Architecture at a glance

```
┌──────────────────────┐       HTTP/JSON       ┌─────────────────────────────┐
│  React 19 (TanStack  │ ────────────────────► │  FastAPI / Uvicorn          │
│  Start + Tailwind)   │ ◄──────────────────── │  ├─ /api/communities        │
│                      │                       │  ├─ /api/recommend (POST)   │
│  TanStack Query      │                       │  ├─ /api/recommender/status │
│  Sidebar filters     │                       │  ├─ /api/health             │
│  Pagination (24/pg)  │                       │  └─ /api/niches, /api/cities│
└──────────────────────┘                       └──────────────┬──────────────┘
                                                              │
                                              loads on startup │
                                                              ▼
                                          ┌─────────────────────────────────┐
                                          │  Semantic recommender           │
                                          │  • SentenceTransformer MiniLM   │
                                          │  • Embeddings cached to disk    │
                                          │  • Cosine similarity ranking    │
                                          └──────────────┬──────────────────┘
                                                         │ reads
                                                         ▼
                                          ┌─────────────────────────────────┐
                                          │  backend/data/communities.json  │
                                          └─────────────────────────────────┘
```

**How a recommend call flows:**

1. Frontend's big bar submits → `POST /api/recommend` with
   `{ city, interests, limit }`.
2. Route handler narrows the corpus by city, calls
   `recommender_service.get_recommendations(...)`.
3. The semantic engine encodes the query, dot-products against cached
   community embeddings, returns top-N IDs.
4. The route returns trimmed `CommunityMatch` records in ranked order.
5. Frontend projects those IDs back to full community objects (already
   cached client-side by TanStack Query) and renders them, preserving order.

---

## Prerequisites

- macOS / Linux / Windows
- **Python 3.11–3.13** (3.14 has no PyTorch wheels yet — don't use it)
- **Node.js 20+** *or* [**Bun**](https://bun.sh) 1.x

---

## Setup

Clone the repo, then set up each side once:

### 1. Backend

```bash
cd Bonfire

# Create and populate the virtualenv (Python 3.13 recommended)
python3.13 -m venv .venv
./.venv/bin/pip install --upgrade pip
./.venv/bin/pip install -r backend/requirements.txt
```

The install pulls down PyTorch (~200 MB) and Hugging Face's MiniLM weights on
first run. Subsequent boots reuse a local embedding cache
(`backend/data/communities.json.embcache.pkl`) and start in ~1 second.

### 2. Frontend

```bash
cd frontend
bun install        # or: npm install
```

---

## Running it

Open two terminals.

**Terminal A — backend:**

```bash
cd Bonfire
./.venv/bin/python -m uvicorn backend.main:app --reload
```

→ API at `http://127.0.0.1:8000`. Interactive docs at
`http://127.0.0.1:8000/docs`.

On first boot you'll see `Building embeddings for N communities on device=mps`
followed by `✅ Recommender engine ready!`. If you see
`⚠️  Recommender engine not ready - will fall back to basic matching`, run
`./.venv/bin/pip install -r backend/requirements.txt` again.

**Terminal B — frontend:**

```bash
cd Bonfire/frontend
bun run dev        # or: npm run dev
```

→ App at the URL the dev server prints (typically
`http://localhost:5173`). It will call the backend at
`http://localhost:8000` by default.

To point the frontend at a different backend:

```bash
VITE_API_BASE=https://my-bonfire.example.com bun run dev
```

---

## Verifying things work

```bash
# Recommender mode
curl http://127.0.0.1:8000/api/recommender/status
# → {"ready": true, "mode": "semantic", ...}

# A semantic query
curl -X POST http://127.0.0.1:8000/api/recommend \
  -H 'Content-Type: application/json' \
  -d '{"city":"Delft","interests":"board games and bouldering","limit":5}'
```

In the UI: type something into the big bar at the top ("acting group for
beginners", "english-speaking sports in Rotterdam", …) and the board will
re-rank by semantic similarity. The small input in the sidebar does plain
case-insensitive string matching on name / tags / category / short
description.

---

## Project layout

```
Bonfire/
├─ backend/
│  ├─ main.py                       FastAPI app + startup banner
│  ├─ models.py                     Pydantic schemas (Community, *Request/Response)
│  ├─ requirements.txt
│  ├─ api/
│  │  └─ routes.py                  All /api/* endpoints
│  ├─ services/
│  │  ├─ storage_service.py         JSON-backed CRUD with a thread lock
│  │  ├─ recommender_service.py     Lifecycle + fallback wrapper around the index
│  │  └─ recommender.py             SentenceTransformer index, cosine search, cache
│  ├─ data/
│  │  └─ communities.json           Single source of truth (227 records)
│  └─ prompts/                      LLM prompt templates (future LLM-generated match reasons)
├─ frontend/
│  ├─ src/
│  │  ├─ routes/                    TanStack file-based routes (__root, index)
│  │  ├─ components/                DiscoveryFeed, SidebarFilters, CommunityDialog, …
│  │  ├─ services/api.ts            Backend client (fetchCommunities, recommend, helpers)
│  │  ├─ types/index.ts             Shared CommunityMatch / DiscoveryFilters types
│  │  └─ styles.css                 Tailwind entrypoint + theme tokens
│  ├─ vite.config.ts
│  └─ package.json
└─ README.md
```

---

## Configuration reference

| Variable                     | Side     | Purpose                                                |
| ---------------------------- | -------- | ------------------------------------------------------ |
| `BONFIRE_COMMUNITIES_PATH`   | backend  | Override the JSON dataset path (default `backend/data/communities.json`) |
| `BONFIRE_CORS_ORIGINS`       | backend  | Comma-separated allow-list (default `*`). Set this in production. |
| `PORT`                       | backend  | Listen port inside the container (default `7860`)      |
| `VITE_API_BASE`              | frontend | Override backend URL (default `http://localhost:8000`) |

---

## Deployment

### Backend → Hugging Face Spaces (Docker SDK)

The repo root has a `Dockerfile`, a `.dockerignore`, and YAML frontmatter at
the top of this README — together they make the repository a valid Hugging
Face Space.

1. Create a new Space at <https://huggingface.co/new-space> with
   **SDK = Docker** and **App port = 7860**. (The README frontmatter encodes
   the same settings, so they'll auto-fill if you push first.)
2. Add the Space as a git remote and push:

   ```bash
   git remote add hf https://huggingface.co/spaces/<user>/<space-name>
   git push hf main
   ```

3. In the Space → *Settings → Variables and secrets*, set:

   - `BONFIRE_CORS_ORIGINS` = `https://your-frontend.pages.dev` (whatever
     domain your CF Pages site lives on; comma-separate multiple).
   - *(optional)* `BONFIRE_COMMUNITIES_PATH` if you want to swap in a
     different dataset.

The first build takes 3–5 minutes (Torch + MiniLM weights are baked into the
image so cold starts are fast). Subsequent boots take ~5 s for the
embedding-cache rebuild against `communities.json`.

The Space URL becomes your `VITE_API_BASE`, typically
`https://<user>-<space-name>.hf.space`.

#### Local sanity check before pushing

```bash
docker build -t bonfire-backend .
docker run --rm -p 7860:7860 \
  -e BONFIRE_CORS_ORIGINS="http://localhost:5173" \
  bonfire-backend
curl http://127.0.0.1:7860/api/recommender/status
```

### Frontend → Cloudflare Pages / Workers

The frontend is a TanStack Start SSR app built around `@cloudflare/vite-plugin`,
so it deploys as a Cloudflare Worker (via Workers, or "Workers for Pages").

**Option A — `wrangler deploy` from your machine (recommended)**

```bash
cd frontend
npm install -g wrangler          # or: bun add -g wrangler
wrangler login

# Build-time variable: bake the backend URL into the bundle
VITE_API_BASE="https://<user>-<space-name>.hf.space" npm run deploy
```

`npm run deploy` is wired to `vite build && wrangler deploy`. Wrangler reads
`frontend/wrangler.jsonc` (the existing config).

**Option B — Cloudflare Pages via Git connect**

1. <https://dash.cloudflare.com/> → *Pages* → *Connect to Git* → select this
   repo.
2. Configure the build:
   - **Root directory**: `frontend`
   - **Build command**: `npm run build`
   - **Build output**: `dist` (or whatever the build prints — TanStack Start
     usually emits `./dist`)
3. *Settings → Environment variables → Production*:
   - `VITE_API_BASE` = `https://<user>-<space-name>.hf.space`
4. Trigger a deploy.

After the frontend is live, copy its URL back into the Space's
`BONFIRE_CORS_ORIGINS` variable so browser CORS works.

---

## API endpoints

| Method | Path                          | Description                                             |
| ------ | ----------------------------- | ------------------------------------------------------- |
| GET    | `/`                           | Service info + example payload                          |
| GET    | `/api/health`                 | Liveness + recommender-readiness                        |
| GET    | `/api/recommender/status`     | Detailed recommender status (semantic vs. fallback)     |
| POST   | `/api/recommend`              | **AI recommender.** Body: `{ city, interests, limit }`. City must be `Delft`, `Den Haag` or `Rotterdam`. |
| GET    | `/api/communities`            | Full list. `?city=Delft&limit=1000`                     |
| GET    | `/api/communities/{id}`       | Single community by ID                                  |
| POST   | `/api/communities`            | Add a community (JSON body matching `Community` schema) |
| DELETE | `/api/communities/{id}`       | Remove a community                                      |
| GET    | `/api/niches`                 | Distinct categories present in the dataset              |
| GET    | `/api/cities`                 | Distinct cities present in the dataset                  |

OpenAPI/Swagger UI: `http://127.0.0.1:8000/docs`.

---

## Troubleshooting

**`The Scout stumbled: POST /api/recommend failed (422)`**  
Your request body doesn't match the schema — typically a `limit` over 100 or a
city other than `Delft` / `Den Haag` / `Rotterdam`.

**`Recommender engine not ready - will fall back to basic matching`**  
`sentence-transformers` or `torch` is missing from the active venv. Run
`./.venv/bin/pip install -r backend/requirements.txt`. If `pip` can't install
torch, check your Python version — PyTorch ships wheels for 3.9 → 3.13.

**Frontend can't reach the backend (CORS or network error)**  
Make sure uvicorn is running on `http://localhost:8000` (the default), or set
`VITE_API_BASE` to wherever it is.

**Slow first request after boot**  
The recommender lazily builds 384-dimensional embeddings for ~227 communities
on first start, then caches them to disk. Subsequent boots are near-instant.

---

## License

Built by students, for students. No formal license — get in touch before
redistributing.
