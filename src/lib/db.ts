// src/lib/db.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL!;

// Disable prefetch to avoid running queries on the Edge
const client = postgres(connectionString, { prepare: false });
export const db = drizzle(client);