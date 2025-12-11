# hocbaichua-v0

This project was created with [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack), a modern TypeScript stack that combines React, TanStack Start, Hono, TRPC, and more.

# Roadmap

- [x] Setup supabase with PostgreSQL
  - [x] Setup database schema and migrations
- [x] Add new schema user_space to manage resources

## Upload documents

- [x] Implement document upload API
  - [x] Using Supabase storage for file storage
  - [x] Store document metadata in PostgreSQL
- [x] Create web UI for document upload

## Authention & Authorization

- [x] Implement authentication with Better-Auth
- [x] Add check authentication for private route
- [x] Add user information in context
- [x] Update the Space API
- [x] Update the Upload API

## Extract data to Vector DB

- [ ] Research vector DB options (e.g., Pinecone, Weaviate, Supabase Vector)
- [ ] Implement data extraction and storage in vector DB with trigger dev
- [ ] Trigger the extract task in Upload API

## Simple Chat Function

- [ ] Implement simple chat interface in web app
- [ ] Implement Q&A ai with Langchain & AI SDK
- [ ] Implement query with vector DB

## Features

- **TypeScript** - For type safety and improved developer experience
- **TanStack Start** - SSR framework with TanStack Router
- **React Native** - Build mobile apps using React
- **Expo** - Tools for React Native development
- **TailwindCSS** - Utility-first CSS for rapid UI development
- **shadcn/ui** - Reusable UI components
- **Hono** - Lightweight, performant server framework
- **tRPC** - End-to-end type-safe APIs
- **Bun** - Runtime environment
- **Drizzle** - TypeScript-first ORM
- **PostgreSQL** - Database engine
- **Authentication** - Better-Auth
- **Turborepo** - Optimized monorepo build system
- **Husky** - Git hooks for code quality

## Getting Started

First, install the dependencies:

```bash
bun install
```

## Database Setup

This project uses PostgreSQL with Drizzle ORM.

1. Make sure you have a PostgreSQL database set up.
2. Update your `apps/server/.env` file with your PostgreSQL connection details.

3. Apply the schema to your database:

```bash
bun run db:push
```

Then, run the development server:

```bash
bun run dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser to see the web application.
Use the Expo Go app to run the mobile application.
The API is running at [http://localhost:3000](http://localhost:3000).

## Project Structure

```
hocbaichua-v0/
├── apps/
│   ├── web/         # Frontend application (React + TanStack Start)
│   ├── native/      # Mobile application (React Native, Expo)
│   └── server/      # Backend API (Hono, TRPC)
├── packages/
│   ├── api/         # API layer / business logic
│   ├── auth/        # Authentication configuration & logic
│   └── db/          # Database schema & queries
```

## Available Scripts

- `bun run dev`: Start all applications in development mode
- `bun run build`: Build all applications
- `bun run dev:web`: Start only the web application
- `bun run dev:server`: Start only the server
- `bun run check-types`: Check TypeScript types across all apps
- `bun run dev:native`: Start the React Native/Expo development server
- `bun run db:push`: Push schema changes to database
- `bun run db:studio`: Open database studio UI
