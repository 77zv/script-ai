#!/usr/bin/env tsx
/**
 * Test script for Video Scripts API
 * 
 * This script tests all CRUD operations for the video scripts API
 * and verifies the database integration.
 * 
 * Usage:
 *   pnpm tsx scripts/test-api.ts
 * 
 * Make sure:
 *   1. Your Next.js dev server is running (pnpm dev)
 *   2. You have a test user account (or the script will create one)
 *   3. Your DATABASE_URL is set in .env
 */

import { config } from "dotenv";
import { resolve } from "path";

// Load environment variables
config({ path: resolve(process.cwd(), ".env") });

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.BETTER_AUTH_URL || "http://localhost:3000";
const TEST_EMAIL = process.env.TEST_EMAIL || `test-${Date.now()}@example.com`;
const TEST_PASSWORD = process.env.TEST_PASSWORD || "TestPassword123!";

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  data?: any;
}

const results: TestResult[] = [];
let authCookies = "";

// Helper function to extract cookies from headers
function extractCookies(headers: Headers): string {
  const cookies: string[] = [];
  headers.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") {
      cookies.push(value);
    }
  });
  return cookies.join("; ");
}

// Helper function to make authenticated requests
async function authenticatedFetch(url: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers);
  if (authCookies) {
    headers.set("Cookie", authCookies);
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });

  // Update cookies from response
  const setCookie = extractCookies(response.headers);
  if (setCookie) {
    // Merge cookies
    const existingCookies = authCookies ? authCookies.split("; ") : [];
    const newCookies = setCookie.split("; ");
    const allCookies = [...existingCookies, ...newCookies];
    authCookies = [...new Set(allCookies)].join("; ");
  }

  return response;
}

// Test helper
async function test(name: string, testFn: () => Promise<any>): Promise<void> {
  try {
    console.log(`\n🧪 Testing: ${name}`);
    const data = await testFn();
    results.push({ name, passed: true, data });
    console.log(`✅ PASSED: ${name}`);
    if (data && typeof data === "object") {
      console.log(`   Data:`, JSON.stringify(data, null, 2).substring(0, 200));
    }
  } catch (error: any) {
    results.push({ name, passed: false, error: error.message });
    console.log(`❌ FAILED: ${name}`);
    console.log(`   Error: ${error.message}`);
    if (error.stack) {
      console.log(`   Stack: ${error.stack.split("\n")[1].trim()}`);
    }
  }
}

// Authentication tests
async function setupAuth() {
  let signUpPassed = false;

  await test("Sign up test user", async () => {
    const response = await fetch(`${BASE_URL}/api/auth/sign-up/email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        name: "Test User",
      }),
      credentials: "include",
    });

    const setCookie = extractCookies(response.headers);
    if (setCookie) {
      authCookies = setCookie;
    }

    // Better Auth returns 200 on success, 400/409 on error
    if (!response.ok) {
      const errorText = await response.text();
      let errorJson;
      try {
        errorJson = JSON.parse(errorText);
      } catch {
        errorJson = { message: errorText };
      }
      throw new Error(`Sign up failed: ${response.status} - ${JSON.stringify(errorJson)}`);
    }

    signUpPassed = true;
    return { email: TEST_EMAIL };
  });

  // If sign up failed, try sign in (user might already exist)
  if (!signUpPassed) {
    await test("Sign in test user", async () => {
      const response = await fetch(`${BASE_URL}/api/auth/sign-in`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: TEST_EMAIL,
          password: TEST_PASSWORD,
        }),
        credentials: "include",
      });

      const setCookie = extractCookies(response.headers);
      if (setCookie) {
        authCookies = setCookie;
      }

      if (!response.ok) {
        const errorText = await response.text();
        let errorJson;
        try {
          errorJson = JSON.parse(errorText);
        } catch {
          errorJson = { message: errorText };
        }
        throw new Error(`Sign in failed: ${response.status} - ${JSON.stringify(errorJson)}`);
      }

      return { email: TEST_EMAIL };
    });
  }
}

// API Tests
async function testGetScripts() {
  await test("GET /api/videos - Fetch all scripts", async () => {
    const response = await authenticatedFetch(`${BASE_URL}/api/videos`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`GET failed: ${response.status} - ${JSON.stringify(error)}`);
    }

    const scripts = await response.json();
    if (!Array.isArray(scripts)) {
      throw new Error("Response is not an array");
    }

    return { count: scripts.length, scripts };
  });
}

async function testCreateScript() {
  let createdScriptId: string | null = null;

  await test("POST /api/videos - Create script with JSON", async () => {
    const response = await authenticatedFetch(`${BASE_URL}/api/videos`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "Test Script",
        script: "This is a test script content.",
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`POST failed: ${response.status} - ${JSON.stringify(error)}`);
    }

    const script = await response.json();
    if (!script.id || !script.name) {
      throw new Error("Response missing required fields");
    }

    createdScriptId = script.id;
    return script;
  });

  return createdScriptId;
}

async function testGetScriptById(scriptId: string) {
  await test("GET /api/videos - Verify script exists", async () => {
    const response = await authenticatedFetch(`${BASE_URL}/api/videos`);
    
    if (!response.ok) {
      throw new Error(`GET failed: ${response.status}`);
    }

    const scripts = await response.json();
    const script = scripts.find((s: any) => s.id === scriptId);
    
    if (!script) {
      throw new Error(`Script with id ${scriptId} not found`);
    }

    return script;
  });
}

async function testUpdateScript(scriptId: string) {
  await test("PATCH /api/videos/[id] - Update script", async () => {
    const response = await authenticatedFetch(`${BASE_URL}/api/videos/${scriptId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        script: "This is the updated script content.",
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`PATCH failed: ${response.status} - ${JSON.stringify(error)}`);
    }

    const script = await response.json();
    if (script.script !== "This is the updated script content.") {
      throw new Error("Script was not updated correctly");
    }

    return script;
  });
}

async function testDeleteScript(scriptId: string) {
  await test("DELETE /api/videos/[id] - Delete script", async () => {
    const response = await authenticatedFetch(`${BASE_URL}/api/videos/${scriptId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`DELETE failed: ${response.status} - ${JSON.stringify(error)}`);
    }

    return { success: true };
  });

  await test("GET /api/videos - Verify script is deleted", async () => {
    const response = await authenticatedFetch(`${BASE_URL}/api/videos`);
    
    if (!response.ok) {
      throw new Error(`GET failed: ${response.status}`);
    }

    const scripts = await response.json();
    const script = scripts.find((s: any) => s.id === scriptId);
    
    if (script) {
      throw new Error(`Script with id ${scriptId} still exists after deletion`);
    }

    return { deleted: true };
  });
}

// Main test runner
async function runTests() {
  console.log("=".repeat(60));
  console.log("🧪 Video Scripts API Test Suite");
  console.log("=".repeat(60));
  console.log(`\nBase URL: ${BASE_URL}`);
  console.log(`Test Email: ${TEST_EMAIL}`);
  console.log(`\n⚠️  Make sure your Next.js dev server is running!`);
  console.log("   Run: pnpm dev\n");

  // Wait a bit for user to read
  await new Promise(resolve => setTimeout(resolve, 2000));

  try {
    // Setup authentication
    await setupAuth();

    // Run API tests
    await testGetScripts();
    const scriptId = await testCreateScript();
    
    if (scriptId) {
      await testGetScriptById(scriptId);
      await testUpdateScript(scriptId);
      await testDeleteScript(scriptId);
    }

    // Print results summary
    console.log("\n" + "=".repeat(60));
    console.log("📊 Test Results Summary");
    console.log("=".repeat(60));

    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;

    results.forEach(result => {
      const icon = result.passed ? "✅" : "❌";
      console.log(`${icon} ${result.name}`);
      if (!result.passed && result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });

    console.log("\n" + "=".repeat(60));
    console.log(`Total: ${results.length} tests`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log("=".repeat(60));

    // Print database verification instructions
    if (passed > 0) {
      console.log("\n📋 Database Verification");
      console.log("=".repeat(60));
      console.log("\nTo verify the data in your database, run these SQL queries:\n");
      console.log("1. Check video_script table:");
      console.log("   SELECT * FROM video_script ORDER BY created_at DESC LIMIT 10;\n");
      console.log("2. Check user table:");
      console.log(`   SELECT * FROM \"user\" WHERE email = '${TEST_EMAIL}';\n`);
      console.log("3. Check scripts for your test user:");
      console.log(`   SELECT vs.* FROM video_script vs 
   JOIN \"user\" u ON vs.user_id = u.id 
   WHERE u.email = '${TEST_EMAIL}'
   ORDER BY vs.created_at DESC;\n`);
      console.log("4. Count scripts per user:");
      console.log("   SELECT u.email, COUNT(vs.id) as script_count");
      console.log("   FROM \"user\" u");
      console.log("   LEFT JOIN video_script vs ON u.id = vs.user_id");
      console.log("   GROUP BY u.email");
      console.log("   ORDER BY script_count DESC;\n");
      console.log("💡 Tip: Use 'pnpm db:studio' to open Drizzle Studio for a GUI");
    }

    // Exit with appropriate code
    process.exit(failed > 0 ? 1 : 0);
  } catch (error: any) {
    console.error("\n💥 Fatal error running tests:", error);
    process.exit(1);
  }
}

// Run tests
runTests();
