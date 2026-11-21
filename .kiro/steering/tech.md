---
inclusion: always
---

# Tech Stack and Conventions

## Stack
- TanStack Start (React 19, file-based routing) on Vite and Nitro
- Tailwind CSS v4 (`src/styles.css`)
- Drizzle ORM with PostgreSQL (Docker, local dev)
- TypeScript, Zod for validation
- pnpm for package management, Biome for lint and format

## Documentation
- Use Context7 to check current docs for Drizzle, TanStack and Docker before writing code that depends on their APIs.
- Follow these best practice guides:

#[[file:DOCKER-POSTGRES-BEST-PRACTICES.md]]

#[[file:TANSTACK-START-BEST-PRACTICES.md]]

## Precedence
- The installed package versions in `package.json` and Context7 docs override the guides when APIs differ. For example, use `@tanstack/react-start` imports and the `inputValidator` method on `createServerFn`, not `@tanstack/start` or `validator`.
- This project's layout and import alias override the guides. Follow the `structure` steering file: server functions in `src/server/`, schema and client in `src/db/`. Use the `#/*` alias (maps to `./src/*`), not `@/`.

## Code Style
- Run `pnpm check` (Biome) before finishing. Don't add ESLint or Prettier.
- Use strict TypeScript. Avoid `any`. Derive types from the Drizzle schema (`$inferSelect`, `$inferInsert`).
- Validate all server function input with Zod at the boundary.

## Architecture
- Data access goes through server functions (`createServerFn`) that call Drizzle. Components and routes never touch the database directly.
- Use `GET` for reads and `POST` for all mutations (create, edit, delete). Don't use `PUT`, `PATCH` or `DELETE`.
- Fetch route data in route `loader`s. Call mutations from components with `useServerFn`.
- Return or throw clear errors from server functions and log details server-side only. Add an `errorComponent` to routes that load data.
- Manage schema with Drizzle migrations (`drizzle-kit generate` then `migrate`). `push` is for local development only.

## Environment and Security
- Keep secrets such as `DATABASE_URL` server-only, in `.env.local`, and never commit them. Only `VITE_`-prefixed variables reach the client.
- Use Drizzle's query builder and `sql` template parameters. Never concatenate user input into SQL.

## Docker
- Postgres runs through `docker-compose.yml` using `postgres:17-alpine` and a named volume. Don't add init scripts. Drizzle owns the schema.
- Don't expose the database port in production configs.
