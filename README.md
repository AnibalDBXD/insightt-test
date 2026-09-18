# Task App — Full Stack JavaScript (React) Technical Test

Multi-language (EN/ES) Task List with authentication and a full Task CRUD, built with Next.js (Pages Router, client-side rendering), MongoDB Atlas, and Amazon Cognito.

**Live (production):** https://insightt-test.vercel.app

## Features

- Register / login with email and password (Amazon Cognito, with inline email-verification step when the pool requires confirmation)
- Task CRUD: create, edit, delete
- Status state machine: `PENDING → IN_PROGRESS → DONE → ARCHIVED` (invalid transitions rejected)
- Mark as done: owner-only, idempotent, safe against concurrent double-marks
- A task marked DONE cannot be edited, except a title typo fix
- All API calls protected with Cognito access-token (JWT) verification
- Zod validation on both frontend (forms) and backend (API)
- Request/response logging middleware (timestamp, actor, input, output, flattened error details)
- English and Spanish UI (i18next) with a language switcher
- Responsive Material UI board, accessible forms and toasts
- Jest unit tests (backend + frontend), Cypress E2E for the core flow

## Requirements

- Node.js 22+
- A MongoDB Atlas cluster (cloud.mongodb.com)
- An Amazon Cognito User Pool + App Client

## Setup

```bash
npm install
cp .env.example .env.local
# fill in the values, then:
npm run dev
```

### Cognito setup

1. Create a **User Pool** (allow self sign-up, email attribute, optional email verification).
2. Create an **App Client** with:
   - No client secret (or set `COGNITO_CLIENT_SECRET` if you enable one)
   - Auth flows: `ALLOW_USER_PASSWORD_AUTH`, `ALLOW_USER_SIGN_UP`/`ALLOW_REFRESH_TOKEN_AUTH`
3. Copy region / pool id / client id into `.env.local` (server + `NEXT_PUBLIC_*` copies).

### Environment variables

See `.env.example`. Server-only vars (`MONGODB_URI`, `COGNITO_*`) stay secret; `NEXT_PUBLIC_COGNITO_*` configure the browser session.

## Architecture

Client-side rendered Next.js app. Pages talk to the same-origin API routes via React Query; API routes verify the Cognito JWT, validate with Zod, and persist to MongoDB.

```
src/
├── pages/
│   ├── _app.tsx / _document.tsx      # Providers: React Query, MUI theme, i18n
│   ├── index.tsx                     # Redirects to /tasks or /login
│   ├── login.tsx / register.tsx      # Auth screens (client-side rendered)
│   ├── tasks.tsx                     # Task board (protected page)
│   └── api/
│       ├── auth/register.ts          # Cognito SignUp (+ Mongo user mirror)
│       ├── auth/confirm.ts           # ConfirmSignUp with emailed code
│       ├── auth/login.ts             # InitiateAuth → tokens + user mirror
│       ├── tasks/index.ts            # GET list (owner's), POST create
│       ├── tasks/[id].ts             # GET / PATCH (DONE: title-only) / DELETE
│       ├── tasks/[id]/status.ts      # POST state-machine move (atomic guard)
│       └── tasks/[id]/done.ts        # POST mark-as-done — see Deployment
├── components/                       # TaskCard, TaskFormDialog, LanguageSwitcher
├── hooks/
│   └── useTasks.ts                   # React Query hooks: list/CRUD/status/done mutations
├── i18n/                             # i18next config + en/es catalogs
├── lib/
│   ├── apiClient.ts                  # fetch wrapper: attaches Bearer token, throws ApiError
│   ├── auth.ts                       # withAuth middleware: JWKS JWT verification
│   ├── cognito.ts                    # Cognito HTTPS API calls (no SDK) + SECRET_HASH
│   ├── db.ts                         # Mongo client singleton, self-healing on failure
│   ├── http.ts                       # ok()/fail() response envelope + ApiErrorCode union
│   ├── logger.ts                     # withLogging middleware: JSON logs, redaction, retry hook
│   ├── taskMapper.ts                 # Mongo doc → TaskDTO (ISO date strings)
│   ├── taskState.ts                  # Status state machine + mark-done rules
│   ├── types.ts                      # TaskDTO — shared wire format
│   └── validation/                   # Zod schemas + parseBody (field error flattening)
└── styles/                           # MUI theme + status colors
```

### Cross-cutting rules

- **Auth:** every protected route wraps its handler with `withAuth` (JWT check against the Cognito JWKS); ownership is enforced per-task (`task.userId === token.sub`), never by query params.
- **Validation:** Zod schemas in `src/lib/validation` are shared; validation messages are stable codes (`REQUIRED`, `TITLE_TOO_LONG`) that the UI translates via i18n.
- **Errors:** single machine-readable envelope `{ "error": { "code": "...", "details": {...} } }`, built by `fail()` in `src/lib/http.ts`.
- **Concurrency:** status moves and mark-done use atomic `findOneAndUpdate` with the previous status in the filter — exactly one concurrent caller wins; losers re-read and get an idempotent/409 answer.
- **Logging:** `withLogging` wraps every route: one JSON line per request (timestamp, actor, method, path, query, redacted body/headers, status, duration) and one per error (flattened `errorName`/`errorMessage`/`errorCode`/`errorStack` for log viewers).
- **Resilience:** the Mongo client is a per-process singleton; a failed connect is never cached, and a dead topology is dropped so the next request reconnects.

## API

| Method | Endpoint               | Rules |
| ------ | ---------------------- | ----- |
| POST   | `/api/auth/register`   | Zod-validated sign-up (Cognito `SignUp`) |
| POST   | `/api/auth/confirm`    | Confirm signup code (when required) |
| POST   | `/api/auth/login`      | `USER_PASSWORD_AUTH`, returns tokens |
| GET    | `/api/tasks`           | Owner's tasks only |
| POST   | `/api/tasks`           | Create (status `PENDING`) |
| PATCH  | `/api/tasks/:id`       | Edit; owner-only; DONE tasks accept title fixes only |
| DELETE | `/api/tasks/:id`       | Owner-only |
| POST   | `/api/tasks/:id/status`| State machine enforced atomically |
| POST   | `/api/tasks/:id/done`  | Owner-only, idempotent (repeat calls return `alreadyDone: true`) |

Every request is logged by middleware (`src/lib/logger.ts`) with timestamp, actor, method, path, query, redacted headers/body, status and duration.

## Deployment (Vercel)

The app deploys to Vercel (Hobby plan, no credit card): <https://insightt-test.vercel.app>.

- Every Next.js API route runs as its own **Vercel Serverless Function** (shown as `ƒ` in the build output). In particular, **`POST /api/tasks/:id/done` is a dedicated cloud function** — the "Cloud Function / Resolver / Web Service" requirement is satisfied by a serverless function running the mark-as-done logic.
- Environment variables are configured per environment in the Vercel project (same keys as `.env.example`); nothing secret lives in the repo.
- MongoDB Atlas **Network Access** must allow `0.0.0.0/0` — serverless hosts use dynamic IPs. The credentials in `MONGODB_URI` are the actual gate.
- Deploy: `npx vercel --prod` (or connect the repo in the Vercel dashboard for push deploys).

## Testing

```bash
npm test          # Jest unit tests (backend endpoints, state machine, schemas, frontend components)
npm run e2e       # Cypress core flow (requires a running app + credentials)
npm run cypress:open
```

Cypress needs an already-confirmed Cognito user:

```bash
CYPRESS_TEST_EMAIL=user@example.com CYPRESS_TEST_PASSWORD=... npm run e2e
```

The Cypress spec covers: anonymous redirect to login, email+password login, create task, `PENDING → IN_PROGRESS → DONE` moves, and an API-level invalid-transition rejection (409).
