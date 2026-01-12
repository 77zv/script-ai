# API Testing Guide

This guide explains how to test the Video Scripts API and verify the database integration.

## Quick Start

1. **Start your Next.js dev server:**
   ```bash
   pnpm dev
   ```

2. **Run the test script:**
   ```bash
   pnpm test:api
   ```

The test script will:
- Create a test user account (or use existing credentials)
- Test all CRUD operations (Create, Read, Update, Delete)
- Show pass/fail results for each test
- Provide SQL queries to verify data in the database

## Using Custom Test Credentials

You can use environment variables to specify test credentials:

```bash
TEST_EMAIL=your-test@example.com TEST_PASSWORD=YourPassword123! pnpm test:api
```

Or add them to your `.env` file:
```env
TEST_EMAIL=your-test@example.com
TEST_PASSWORD=YourPassword123!
```

## What Gets Tested

The test script runs the following tests:

1. **Authentication**
   - Sign up a test user (or sign in if user exists)

2. **GET /api/videos**
   - Fetch all video scripts for the authenticated user

3. **POST /api/videos**
   - Create a new video script with JSON

4. **GET /api/videos (verification)**
   - Verify the created script exists in the list

5. **PATCH /api/videos/[id]**
   - Update the script content

6. **DELETE /api/videos/[id]**
   - Delete the script

7. **GET /api/videos (cleanup verification)**
   - Verify the script was deleted

## Database Verification

After running the tests, the script provides SQL queries you can run to verify the data in your database.

### Option 1: Using Drizzle Studio (Recommended)

```bash
pnpm db:studio
```

This opens a web-based GUI where you can browse your database tables visually.

### Option 2: Using psql

Connect to your PostgreSQL database:
```bash
psql $DATABASE_URL
```

Then run the queries provided by the test script output.

### Common Verification Queries

```sql
-- Check all video scripts
SELECT * FROM video_script ORDER BY created_at DESC LIMIT 10;

-- Check a specific user
SELECT * FROM "user" WHERE email = 'test@example.com';

-- Check scripts for a specific user
SELECT vs.* FROM video_script vs 
JOIN "user" u ON vs.user_id = u.id 
WHERE u.email = 'test@example.com'
ORDER BY vs.created_at DESC;

-- Count scripts per user
SELECT u.email, COUNT(vs.id) as script_count
FROM "user" u
LEFT JOIN video_script vs ON u.id = vs.user_id
GROUP BY u.email
ORDER BY script_count DESC;
```

## Troubleshooting

### Test fails with "Unauthorized"

- Make sure your Next.js dev server is running
- Check that authentication is properly configured
- Verify `BETTER_AUTH_SECRET` is set in your `.env` file

### Test fails with connection errors

- Verify your database is running and accessible
- Check that `DATABASE_URL` is correctly set in `.env`
- Ensure the database schema is up to date: `pnpm db:push`

### Tests pass but data not in database

- Check that the database connection is working
- Verify the database URL points to the correct database
- Check database logs for any errors

## Manual Testing

You can also test the API manually using curl:

```bash
# 1. Sign up (or sign in)
curl -X POST http://localhost:3000/api/auth/sign-up/email \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPassword123!","name":"Test User"}' \
  -c cookies.txt

# 2. Get scripts
curl http://localhost:3000/api/videos \
  -b cookies.txt

# 3. Create a script
curl -X POST http://localhost:3000/api/videos \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"name":"My Script","script":"Test content"}'

# 4. Update a script (replace {id} with actual script ID)
curl -X PATCH http://localhost:3000/api/videos/{id} \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"script":"Updated content"}'

# 5. Delete a script (replace {id} with actual script ID)
curl -X DELETE http://localhost:3000/api/videos/{id} \
  -b cookies.txt
```
