# Task App — Full Stack JavaScript (React) Technical Test

Multi-language (EN/ES) Task List with authentication and a full Task CRUD, built with Next.js (Pages Router, client-side rendering), MongoDB Atlas, and Amazon Cognito.

## Features

- Register / login with email and password (Amazon Cognito, with inline email-verification step when the pool requires confirmation)
- Task CRUD: create, edit, delete
- Status state machine: `PENDING → IN_PROGRESS → DONE → ARCHIVED` (invalid transitions rejected)
- Mark as done: owner-only, idempotent, safe against concurrent double-marks
- A task marked DONE cannot be edited, except a title typo fix
- All API calls protected with Cognito access-token (JWT) verification
- Zod validation on both frontend (forms) and backend (API)
- Request/response logging middleware (timestamp, actor, input, output)
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

Errors use a machine-readable envelope: `{ "error": { "code": "...", "details": {...} } }`, translated by the frontend.

Every request is logged by middleware (`src/lib/logger.ts`) with timestamp, actor, method, path, query, redacted headers/body, status and duration.

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
