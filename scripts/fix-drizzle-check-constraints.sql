-- Script to identify and optionally remove problematic CHECK constraints
-- that cause drizzle-kit introspection errors

-- 1. List all CHECK constraints in the public schema
SELECT 
    conname AS constraint_name,
    conrelid::regclass AS table_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint 
WHERE contype = 'c' 
  AND connamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
ORDER BY conrelid::regclass::text, conname;

-- 2. If you find problematic constraints, you can drop them with:
-- ALTER TABLE table_name DROP CONSTRAINT constraint_name;

-- 3. Common problematic constraints from BetterAuth might include:
--    - Constraints on user table
--    - Constraints on session table  
--    - Constraints on account table

-- After removing problematic constraints, try running 'pnpm db:push' again
