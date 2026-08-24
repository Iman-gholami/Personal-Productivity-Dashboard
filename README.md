# LifeOS

A premium, dark-mode personal productivity workspace for managing work, learning, and daily reflection.

## Getting started

```bash
cp .env.example .env
npm install
npm run dev       # Next.js UI on :3000
npm run api       # Express API on :4000
```

The UI ships with realistic demo data and gracefully works without the API. Connect MongoDB and run the API to enable persistence. The data model is user-scoped from day one so multi-user authorization can be added without a migration.

## Architecture

- `app/` — Next.js App Router pages and global design system
- `components/` — reusable dashboard, navigation, chart, and work components
- `lib/` — typed fixtures and shared domain types
- `server/` — Express API, MongoDB models, validation, and JWT middleware
