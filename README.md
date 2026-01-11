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

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
