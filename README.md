This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL database
- pnpm (or npm/yarn)

### Setup

1. **Install dependencies:**
```bash
pnpm install
```

2. **Set up environment variables:**

Create a `.env` file in the root directory with the following variables:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# Better Auth
BETTER_AUTH_SECRET=your-secret-key-minimum-32-characters-long
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional: Trusted origins for CORS
BETTER_AUTH_TRUSTED_ORIGINS=http://localhost:3000

# OpenAI API (required for video transcription)
OPENAI_API_KEY=your-openai-api-key-here

# Backboard.io API (optional, for RAG and vector database)
BACKBOARD_API_KEY=your-backboard-api-key-here
BACKBOARD_API_URL=https://app.backboard.io/api
BACKBOARD_LLM_PROVIDER=openai  # Optional: LLM provider (default: openai)
BACKBOARD_MODEL_NAME=gpt-4o    # Optional: Model name (default: gpt-4o)
```

Generate a secure secret for `BETTER_AUTH_SECRET`:
```bash
openssl rand -base64 32
```

3. **Set up the database:**

Run database migrations:
```bash
pnpm db:push
```

**Note:** If you encounter a `TypeError: Cannot read properties of undefined (reading 'replace')` error when running `db:generate`, this is a known bug in drizzle-kit 0.31.8. Use `db:push` instead, which syncs your schema without introspection.

4. **Run the development server:**
```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Authentication

This project uses [Better Auth](https://www.better-auth.com) for authentication. The setup includes:

- Email/Password authentication
- Session management
- Protected routes

### Auth Files

- `src/lib/auth.ts` - Server-side auth configuration
- `src/lib/auth-client.ts` - Client-side auth utilities
- `src/lib/auth-server.ts` - Server-side auth helpers
- `src/app/api/auth/[...all]/route.ts` - Auth API routes
- `src/app/sign-in/page.tsx` - Sign in/Sign up page

### Usage

**Client-side:**
```typescript
import { useSession, signIn, signOut } from '@/lib/auth-client';

// Get current session
const { data: session } = useSession();

// Sign in
await signIn.email({ email, password });

// Sign out
await signOut();
```

**Server-side:**
```typescript
import { getSession } from '@/lib/auth-server';

const session = await getSession();
```

## Backboard.io Integration (RAG & Vector Database)

This project integrates with [Backboard.io](https://backboard.io) using their official [SDK](https://app.backboard.io/quickstart) for advanced RAG (Retrieval-Augmented Generation) and vector database capabilities. This enables:

- **Semantic Search**: Automatically retrieves relevant profile sections for each script segment
- **Vector Database**: Stores backboard profile data as memory/embeddings for efficient retrieval
- **Minimal Changes**: Only uses relevant context, making more precise repurposing
- **Scalability**: Handles large profiles efficiently with hybrid search (BM25 + vector)
- **Persistent Memory**: Profile data persists across conversations

### Setup

1. Sign up for [Backboard.io](https://backboard.io) and get your API key from the [quickstart guide](https://app.backboard.io/quickstart)
2. Add `BACKBOARD_API_KEY` to your `.env` file
3. The SDK is already installed (`backboard-sdk` package)
4. The system will automatically:
   - Create an assistant for each user
   - Index their backboard profile data as memory
   - Use RAG for script repurposing

### How It Works

1. **Profile Indexing**: When a user completes onboarding, their profile is chunked by section and added as memory to their assistant in backboard.io
2. **RAG Retrieval**: For each script segment, the system uses backboard.io's memory feature with `memory: "auto"` mode, which automatically performs semantic search to find the most relevant profile sections
3. **Contextual Repurposing**: Only the relevant context is retrieved and used, making the repurposing more accurate and minimal

### SDK Usage

The integration uses the official `backboard-sdk` package:
- **Assistants**: Each user gets their own assistant to store their profile
- **Memory**: Profile sections are stored as memory chunks for semantic retrieval
- **Threads**: Conversation threads are used for script repurposing with RAG enabled
- **Memory Modes**: Uses "auto" mode which enables both search (retrieval) and write (storage)

### Fallback

If `BACKBOARD_API_KEY` is not configured, the system falls back to a simple prompt-based approach that includes all profile data in the context.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
