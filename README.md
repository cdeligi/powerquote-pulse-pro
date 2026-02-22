# PowerQuotePro

**Copyright © 2025 Carlos Deligi. All Rights Reserved.**

**Project Timeline:** May 2025 - December 2025

## Overview

PowerQuotePro is a comprehensive enterprise quoting system designed for power monitoring and control equipment. The application provides advanced product configuration, quote management, and approval workflows for electrical monitoring systems.

## Technologies

This project is built with:

- **Frontend:** React 18, TypeScript, Vite
- **UI Framework:** shadcn-ui, Tailwind CSS, Radix UI
- **Backend:** Supabase (PostgreSQL, Authentication, Edge Functions)
- **State Management:** TanStack Query, React Context
- **Additional Libraries:** React Router, React Hook Form, Zod validation

## Getting Started

### Prerequisites

- Node.js 18+ and npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)
- Supabase account and project

### Installation

1. Clone the repository:
```sh
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>
```

2. Install dependencies:
```sh
npm install
```

3. Configure environment variables:
```sh
cp .env.example .env
```

Edit `.env` and add your Supabase credentials:
```dotenv
VITE_SUPABASE_URL=<your-supabase-url>
VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

4. Start the development server:
```sh
npm run dev
```

The application will be available at `http://localhost:8080`

## Environment Variables

An `.env.example` file is checked into the repository. Copy it to `.env` and provide your Supabase credentials. The `.env` file is ignored by Git, so you'll need to recreate it whenever you clone the repo.

Required variables:

```dotenv
VITE_SUPABASE_URL=<your-supabase-url>
VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

If you plan to run migrations you will also need to authenticate the Supabase CLI with `SUPABASE_ACCESS_TOKEN`.

## Installing Dependencies

Install all project dependencies with npm:

```sh
npm i
```

## Running the Development Server

Launch the Vite dev server with:

```sh
npm run dev
```

By default, Vite listens on <http://localhost:5173>. This project overrides the
port to `8080` in [`vite.config.ts`](vite.config.ts) under `server.port`. Adjust
that value if you'd like to run the server on a different port.

## Database Migrations

With the Supabase CLI installed and authenticated, apply migrations:

```sh
npx supabase db push
```

## Testing

End-to-end tests are located in the `cypress/` folder:

```sh
# Run tests in headless mode
npx cypress run

# Open interactive test runner
npx cypress open
```

## Deployment

The application can be deployed to any static hosting provider that supports SPA routing. Ensure environment variables are configured in your hosting platform.

## License

This project is proprietary software.

**Copyright © 2025 Carlos Deligi. All Rights Reserved.**

Unauthorized copying, modification, distribution, or use of this software, via any medium, is strictly prohibited without explicit written permission from the copyright holder.

See the [LICENSE](LICENSE) file for full terms.

## KPI Day Conversion Notes (2026-02-21)
- Placeholder entry to verify anti-idle commit.
- KPI "Age" = (now - createdAt)/24h, renderizada com duas casas decimais.
- KPIs convertidos: average cycle/claim/work (admin + finance), backlog average age, leaderboard e trend line.
- Backlog >SLA agora destacado em dias usando SLA configurável (48h = 2d por padrão).

- [ ] Convert KPI widgets to show durations in days

### KPI widgets semantics
- **Avg Total Cycle (d)** = created_at → final decision (finance if required).
- **Avg Admin Claim Age (d)** = created_at → admin claimed_at.
- **Avg Admin Work (d)** = admin claimed_at → admin/overall decision.
- **Avg Finance Claim Age (d)** = finance_required_at → finance claimed_at.
- **Avg Finance Work (d)** = finance claimed_at → finance decision.
- **Backlog Avg Age (d)** = now → last activity timestamp for items still waiting.

### Examples
- 24h (86,400s) ⇒ 1.00d
- 48h (172,800s) ⇒ 2.00d
- 60h (216,000s) ⇒ 2.50d
