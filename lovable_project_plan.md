# Bonfire: Lovable AI Developer Prompt

*Copy and paste this entire document into Lovable to generate the frontend React application.*

---

## 1. System Role & Objective
You are an expert React TypeScript developer and UI/UX designer. Your task is to build the frontend for **Bonfire**, a centralized Community Discovery Platform designed to combat urban loneliness for students and young professionals in the Netherlands (specifically Delft, Den Haag, and Rotterdam). 

**Crucial Philosophy:** The UI must feel like a vibrant discovery engine, not a therapy app or a traditional "loneliness" solution. The framing should always be "What do you enjoy doing?" or "Explore your city"—never "Are you lonely?". Focus on shared interests and positive community engagement.

## 2. Technical Stack & Constraints
*   **Framework:** React + Vite + TypeScript.
*   **Styling:** Tailwind CSS + shadcn/ui. 
*   **Animations:** Use Framer Motion for subtle, energetic micro-interactions (especially when rendering the discovery feed).
*   **Backend Constraint:** **DO NOT** build a backend using Supabase, Node.js, or any other DB service. The backend is a separate Python/FastAPI service. 
*   **API Integration:** Create an `src/services/api.ts` file that makes `fetch` or `axios` calls to `http://localhost:8000`. Use mock data temporarily until the real backend is connected.

## 3. Visual Theme & Styling (The "Vibe")
*   **Color Palette:** Modern and warm. Avoid dark, gloomy, or clinical 'medical' colors. Use the following exact color scheme:
    *   **Background:** `#FAF6F0`
    *   **Secondary (Bonfire Orange):** `#C85C36` (symbolizes warmth, energy, and community)
    *   **Accents:** `#DF9F4F`
    *   **Cards/Surfaces:** `#FFFDFB`
    *   **Main text:** `#2A201C`
*   **Typography:** Modern sans-serif (e.g., Inter). 
*   **Components:** Make heavy use of cards with soft, modern shadows. Use pill-tags for categories and interests.

## 4. User Flow & Required Views

### View 1: The Landing / Interest Input
A clean, energetic hero section.
*   **Headline:** "What do you want to do this weekend?"
*   **Inputs:** 
    *   A dropdown for the City (Delft, Den Haag, Rotterdam).
    *   A prominent text input or search bar where users can type their hobbies (e.g., "I'm looking for board games and indie movies").
    *   Dynamic, clickable pill-tags below the input acting as suggestions (e.g., *Bouldering, Tech Startups, Running, DnD, Photography*).
*   **CTA:** A bright primary button: "Discover Communities".

### View 2: The Loading State
*   Since the backend uses an LLM to generate recommendations, the loading state will take 2-5 seconds. 
*   **Do not use a boring spinner.** Use a fun, animated state that says "Scouring local bulletin boards..." or "Matching your vibe..." to keep the user engaged.

### View 3: The Discovery Feed
This is the results page displaying what the AI matched them with.
*   Display a grid or a clean vertical list of `Community Cards`.
*   **Each Card Must Contain:**
    *   Community Name.
    *   Niche/Category Tag.
    *   Location (City).
    *   Description snippet.
    *   `match_reason`: A highlighted section explaining *why* this community fits the user's specific prompt.
    *   **CTA:** "Learn More" or "Go to Website" button.

## 5. API Contract & Mock Data
For your mock data and TypeScript interfaces, expect the FastAPI backend to return an array of objects structured exactly like this:

```typescript
export interface CommunityMatch {
  id: string;
  name: string;
  category: string;
  city: string;
  description_short: string | null;
  description_full: string | null;
  match_reason: string; // The LLM-generated reason for the recommendation
  website_url: string | null;
  contact_email: string | null;
  image_url: string | null;
  estimated_annual_fee_eur: number | null;
  is_university_affiliated: boolean;
  relevance_score: number | null;
}

// MOCK DATA TO USE IN THE UI
export const mockCommunities: CommunityMatch[] = [
  {
    id: "delft-1",
    name: "Uw privacy en ons cookiebeleid",
    category: "Culture",
    city: "Delft",
    description_short: "Privacy and Cookie Policy - Delftse Map Cookie and Privacy Settings...",
    description_full: "Privacy and Cookie Policy - Delftse Map Cookie and Privacy Settings How we use cookies...",
    match_reason: "Because you mentioned you are interested in local culture and online policies.",
    website_url: "https://delftsekaart.nl/privacy-en-cookie-policy",
    contact_email: "info@delftvoorelkaar.nl",
    image_url: "https://delftsekaart.nl/wp-content/uploads/2023/11/Delftse_Poort-1500x430.webp",
    estimated_annual_fee_eur: null,
    is_university_affiliated: false,
    relevance_score: 0.92
  },
  {
    id: "delft-3",
    name": "Organisatie",
    category: "Culture",
    city: "Delft",
    description_short: "At 't Goeie Doelen Winkeltje you can buy second-hand items for a reasonable price...",
    description_full: "`t Goeie Doelen Winkeltje - Delftse Kaart Cookie and Privacy Settings...",
    match_reason: "Matches your interest in vintage shopping and supporting local charities.",
    website_url: "http://www.goededoelen.nu/",
    contact_email: "info@goededoelen.nu",
    image_url: "https://delftsekaart.nl/wp-content/uploads/2023/12/logo-t-Goeie-Doelen-Winkeltje-De-Goeie-Doelen.png",
    estimated_annual_fee_eur: null,
    is_university_affiliated: false,
    relevance_score: 0.88
  }
];
```

Please generate the complete React application based on these specifications.