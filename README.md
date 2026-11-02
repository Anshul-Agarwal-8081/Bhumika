# Bhūmikā

Bhūmikā is a role-based career-readiness demo that connects **Discover → Learn → Practice → Compete → Apply → Track**. It is built as a working local prototype rather than a chatbot or a static landing page.

## Run locally

Requirements: Node.js 20.19+ and npm.

```bash
npm install
npm run dev
```

Vite prints the local URL. No API keys or environment variables are required.

## Build

```bash
npm run build
npm run preview
```

The production build is written to `dist/`.

## Demo flow

1. On the dashboard, continue the **Frontend Developer** path or open **Explore roles** and choose **Data Analyst**.
2. Review the role skills, roadmap, and curated resource links.
3. Open a lesson and complete its multiple-choice or scenario practice.
4. Review the score, rubric rationale, strengths, gaps, sample answer, and next practice recommendation.
5. Return to the dashboard to see XP, completed modules, and practice-based skill estimates.
6. Open **Arena**, create a friend challenge, copy its URL/code, and use the local friend-result preview to demonstrate a comparable attempt.
7. Open an **Example listing**, then choose **Prepare an application**.
8. Enter profile facts in **Resume Studio**, build and edit the grounded draft, copy or export/print it, then save it to **Application tracker**.
9. Change an application status. Moving it to **Applied** requires manual confirmation; the prototype never sends an email or submits an application.

## What is included

- Two complete learning paths: Frontend Developer and Data Analyst.
- Curated demo resource cards with provider, type, level, duration/price where available, and direct links.
- Short lessons, a fixed-answer quiz, and realistic text scenarios.
- Deterministic local evaluation with score rationale, rubric, strengths, gaps, sample answer, and next task.
- Local progress persistence for attempts, XP, module completion, streak, arena challenges, profile facts, and applications.
- Seeded example opportunities and leaderboard participants.
- Resume and application drafts generated only from fields entered in the profile. Missing evidence is surfaced as a question.
- Responsive navigation and layouts for laptop, tablet, and mobile widths.

## Architecture

- `src/data.ts` — typed demo roles, skills, modules, challenges, resources, and opportunities.
- `src/types.ts` — shared product entities and state types.
- `src/services/evaluate.ts` — deterministic demo scoring adapter. Replace this boundary with a server-side LLM adapter when a provider is configured; validate structured responses before rendering them.
- `src/services/storage.ts` — localStorage load/save/reset with malformed-data recovery.
- `src/App.tsx` — feature screens and local demo flows.
- `src/index.css` — responsive design system and screen styling; Tailwind CSS is also configured through the Vite plugin.

## Demo limitations

- AI evaluation is a deterministic local heuristic, not a model judgment. The fixed-answer quiz uses an objective answer key.
- Resource cards are curated demo resources, not live-search results.
- Opportunities are example listings, not verified or live job postings.
- Arena participants and rankings are seeded. Friend challenges are asynchronous local demos; there is no account system, server, or cross-device result sync.
- Progress and profile facts stay in the current browser's localStorage. **Reset demo data** clears them.
- Resume Studio does not verify claims or send email. It uses only the facts entered by the learner; review every draft before using it.
- No secrets are stored in the browser. A real model, search, or jobs integration should be called through a server-side endpoint.

## Environment variables

None are used by this prototype. Do not put provider credentials in Vite client-side variables.
