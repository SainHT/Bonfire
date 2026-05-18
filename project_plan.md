# Bonfire: Project Plan & Architecture

## 1. Executive Summary & Philosophy
**Mission:** To solve the public health crisis of urban loneliness by enabling real-world, interest-driven human connection at scale.
**Core Philosophy:** Frame discovery around "What do you enjoy doing?" rather than "Are you lonely?". Create organic, repeated interactions centered around shared hobbies.

## 2. MVP Scope (Phase 1: Aggregator & Discovery)
*   **Target Locations:** Delft, Den Haag, Rotterdam.
*   **Target Demographic:** Incoming students and individuals struggling to find like-minded people.
*   **Objective:** Scrape, normalize, and catalog local communities, then recommend them contextually based on user interests.

## 3. Tech Stack
*   **Backend:** FastAPI (Python)
*   **Database:** Raw JSON files (acting as a lightweight NoSQL datastore for rapid iteration)
*   **Frontend:** React
*   **AI Integration:** Gemma 4 or GPT mini (for both data extraction/normalization and user recommendation matching)

## 3.5. Color Scheme
*   **Background:** `#FAF6F0`
*   **Secondary (Bonfire Orange):** `#C85C36`
*   **Accents:** `#DF9F4F`
*   **Cards/Surfaces:** `#FFFDFB`
*   **Main text:** `#2A201C`

## 4. Planned Code Structure
```text
Bonfire/
├── backend/
│   ├── data/
│   │   └── communities.json           # Raw JSON NoSQL Database
│   ├── prompts/
│   │   ├── club_onboarding_prompt.txt # (Existing) 
│   │   ├── recommendation_prompt.txt  # (Existing) Tuned for student matching
│   │   └── extraction_prompt.txt      # Prompt for AI to normalize scraped data
│   ├── main.py                        # FastAPI application entry point
│   ├── models.py                      # Pydantic schemas (Community, Event, UserContext)
│   ├── services/
│   │   ├── storage_service.py         # Thread-safe JSON read/write operations
│   │   ├── recommender_service.py     # Semantic search recommendations
│   │   ├── recommender.py             # Embedding-based community matching
│   │   └── scraper_service.py         # Web scraping orchestration
│   ├── api/
│   │   └── routes.py                  # API endpoints (/recommend, /ingest)
│   └── requirements.txt
└── frontend/                          # React Application
    ├── package.json
    ├── src/
    │   ├── components/
    │   │   ├── DiscoveryFeed.tsx      # UI for displaying recommended clubs
    │   │   └── InterestInput.tsx      # UI for capturing user context ("What do you enjoy?")
    │   ├── pages/
    │   │   └── Home.tsx
    │   ├── services/
    │   │   └── api.ts                 # Axios/Fetch calls to FastAPI backend
    │   └── App.tsx
```

## 5. Strategic Development Prompts
Use these prompts or mental frameworks when developing specific areas of the platform:

### Prompt 1: The "Anti-Stigma" Recommendation Engine
> **Constraint:** "When generating recommendations using the LLM, the output must strictly frame the connection around shared interests and positive community engagement. Never mention loneliness, isolation, or 'making friends'. Focus completely on the activity, the location (Delft/Den Haag/Rotterdam), and why it fits the student's stated interests."

### Prompt 2: The LLM JSON Extractor (Aggregator)
> **Constraint:** "When analyzing scraped HTML or text from university boards or city forums, extract the entity strictly according to the Pydantic `Community` schema. If a field (like 'contact_email') is missing, output `null`. Do not hallucinate missing data. Focus on categorizing the 'niche' accurately so the matching engine can find it later."

### Prompt 3: UI/UX Framing (React Frontend)
> **Constraint:** "The UI must feel like a vibrant discovery engine, not a therapy app. The primary call-to-action should be 'What do you want to do this weekend?' or 'Explore your city'. Use student-friendly, energetic styling while keeping the UX dead-simple."

## 6. Next Steps for Development
1.  **Define Pydantic Models:** Write the exact schema in `backend/models.py`.
2.  **Mock JSON Data:** Create 5-10 mock entries in `backend/data/communities.json` representing clubs in Delft/Rotterdam.
3.  **Build FastAPI Endpoints:** Stand up the `/recommend` endpoint interacting with the mock JSON and LLM API.
4.  **Bootstrap React App:** Standard Vite + React setup prioritizing the interest input form.