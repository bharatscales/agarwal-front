# Agarwal Flexible Packaging ERP Frontend

Frontend for the internal ERP system used by Agarwal Flexible Packaging. The app provides authenticated access to operational modules and a data-heavy UI for managing core records.

## Highlights
- JWT-based login with protected routes
- Sidebar layout with module navigation
- Data tables for users, transports, parties, and requisitions
- Themed UI components built on Radix primitives

## Tech Stack
- React 19 + TypeScript
- React Router (v7)
- Vite
- Tailwind CSS
- Radix UI + TanStack Table
- Axios

## Requirements
- Node.js 18+
- npm

## Setup
```bash
cd frontend/agarwal-front
npm install
```

### Configure API base URL
The API base URL is controlled via `VITE_API_BASE_URL`. If not set, the app falls back to the production API URL.

Create `.env.local` in `frontend/agarwal-front`:
```bash
VITE_API_BASE_URL=http://localhost:8000
```

### Run locally
```bash
npm run dev
```

Open `http://localhost:5173`.

## Scripts
- `npm run dev` - start Vite dev server
- `npm run build` - typecheck and build
- `npm run preview` - preview production build
- `npm run lint` - run ESLint

## Project Structure
```
src/
├── components/         # Reusable UI and table components
├── conf/               # App configuration (API base URL)
├── contexts/           # Auth and theme contexts
├── lib/                # API clients, enums, utils
├── pages/              # Route-level pages
├── App.tsx             # Routes and app shell
└── main.tsx            # Entry point
```

## Backend
This frontend expects a FastAPI backend. See the backend repository in `backend/agarwal-api` for API setup and documentation.

## License
Proprietary software for Agarwal Flexible Packaging.
