import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

/**
 * Note: There's a known bug in drizzle-kit 0.31.8 where both `db:push` and `db:generate`
 * fail with "Cannot read properties of undefined (reading 'replace')" when parsing
 * CHECK constraints during introspection.
 * 
 * This happens because drizzle-kit introspects the database to compare schemas,
 * and encounters problematic CHECK constraints.
 * 
 * Workaround options:
 * 1. Manually remove problematic CHECK constraints from the database
 * 2. Use raw SQL migrations instead
 * 3. Wait for drizzle-kit to fix this bug
 */
export default defineConfig({
  out: './drizzle',
  schema: './src/db/index.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  // Try to minimize introspection issues
  schemaFilter: ['public'],
});