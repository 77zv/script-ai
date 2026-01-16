# Backboard.io Integration Guide

This document explains how [Backboard.io](https://backboard.io) is integrated into this repository for RAG (Retrieval-Augmented Generation) and vector database capabilities.

## Overview

Backboard.io provides a vector database and RAG infrastructure that enables semantic search and contextual AI responses. In this project, it's used to:

1. **Store user profile data** as semantic memory chunks
2. **Retrieve relevant context** when repurposing video scripts
3. **Personalize content** based on user background, voice, and preferences
4. **Learn from user edits** by storing valuable prompts as memories

## Architecture

### Core Components

#### 1. Backboard Client ([`src/lib/backboard-client.ts`](file:///Users/antonyli/WebstormProjects/script-ai/src/lib/backboard-client.ts))

The main integration layer that wraps the official `backboard-sdk` package. Key functions:

- **`getOrCreateAssistant(userId)`** - Creates a dedicated assistant for each user to store their profile
- **`indexBackboardProfile(assistantId, profileData, existingMemoryIds)`** - Converts profile data into semantic chunks and stores them as memories
- **`createNewThread(assistantId)`** - Creates fresh conversation threads for each video repurposing session
- **`repurposeScriptWithRAG(threadId, assistantId, scriptLine)`** - Uses RAG to repurpose script lines with relevant profile context
- **`storePromptAsMemory(assistantId, prompt, selectedText)`** - Stores valuable user editing preferences as memories

#### 2. Database Schema ([`src/db/schema/backboard-schema.ts`](file:///Users/antonyli/WebstormProjects/script-ai/src/db/schema/backboard-schema.ts))

Defines the structure for storing user profiles and tracking Backboard.io resources:

```typescript
export const backboardProfile = pgTable("backboard_profile", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  answers: jsonb("answers").$type<BackboardAnswers>().notNull(),
  assistantId: text("assistant_id"),        // Backboard.io assistant ID
  memoryIds: jsonb("memory_ids").$type<string[]>(),  // Memory IDs for cleanup
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

The `BackboardAnswers` interface contains 10 sections covering:
- Who you are (bio, field, background)
- Journey & motivation
- Proof & credibility
- Target audience
- Voice & communication style
- Beliefs & principles
- Stories & moments
- Project specifics
- Preferences & boundaries
- Content patterns

#### 3. API Routes

**[`src/app/api/backboard/route.ts`](file:///Users/antonyli/WebstormProjects/script-ai/src/app/api/backboard/route.ts)** - Profile management
- `GET` - Fetch user's profile
- `POST` - Create/update profile and automatically index in Backboard.io

**[`src/app/api/videos/route.ts`](file:///Users/antonyli/WebstormProjects/script-ai/src/app/api/videos/route.ts)** - Video processing
- Transcribes videos using OpenAI Whisper
- Automatically repurposes scripts using Backboard.io RAG

## How It Works

### 1. Profile Indexing Flow

When a user completes onboarding:

```
User completes onboarding
    ↓
POST /api/backboard
    ↓
getOrCreateAssistant(userId)
    ↓
indexBackboardProfile(assistantId, profileData)
    ↓
buildProfileChunks() - Converts JSON to semantic text
    ↓
backboardClient.addMemory() - Stores each chunk
    ↓
Store assistantId & memoryIds in database
```

**Example semantic chunk:**

```
WHO YOU ARE - BACKGROUND AND FIELD:
Bio (age, location, current role/field): 24, Toronto, software engineer at a startup
What you're building/working on: Building an AI-powered video editing tool
What you want to be remembered for: Making video editing accessible to everyone

IMPORTANT: Extract the creator's field/industry, university/education, and career path from the bio above.
```

### 2. Script Repurposing Flow

When a video is uploaded:

```
User uploads video
    ↓
OpenAI Whisper transcribes video
    ↓
Fetch user's backboard profile
    ↓
createNewThread(assistantId) - Fresh context per video
    ↓
For each script line:
    repurposeScriptWithRAG(threadId, assistantId, line)
        ↓
    backboardClient.addMessage() with memory: "readonly"
        ↓
    Backboard.io performs semantic search
        ↓
    Returns relevant profile sections
        ↓
    LLM repurposes line with context
    ↓
Store repurposed script in database
```

**Key feature:** Uses `memory: "readonly"` mode to search memories without creating new ones during repurposing.

### 3. RAG Prompt Strategy

The repurposing prompt is designed for **minimal, precise changes**:

```typescript
const response = await backboardClient.addMessage(threadId, {
  content: `Repurpose this line to match the creator's actual background and field. 
  Make MINIMAL changes - keep the same length, tone, style, and structure. 
  Only replace generic references with the creator's specific details.
  
  ORIGINAL LINE:
  ${scriptLine}
  
  CRITICAL RULES - PRESERVE STYLE AND LENGTH:
  1. Keep the EXACT same length - don't add extra words or details
  2. Keep the EXACT same tone and style - match the original's energy and pacing
  3. Keep the EXACT same structure - don't rearrange or add clauses
  4. Only replace generic references with creator's specific details
  5. Preserve timestamps if present [MM:SS] exactly as shown
  ...`,
  llm_provider: process.env.BACKBOARD_LLM_PROVIDER || "openai",
  model_name: process.env.BACKBOARD_MODEL_NAME || "gpt-4o",
  memory: "readonly", // Enable RAG without writing new memories
});
```

**Example transformation:**

| Original | Repurposed (for CS student at Queens) |
|----------|---------------------------------------|
| "I'm a finance student at McGill" | "I'm a computer science student at Queens University" |
| "I landed a consulting internship" | "I landed a software engineering internship" |

## Configuration

### Environment Variables

```env
# Required for Backboard.io integration
BACKBOARD_API_KEY=your-backboard-api-key-here
BACKBOARD_API_URL=https://app.backboard.io/api

# Optional: LLM configuration
BACKBOARD_LLM_PROVIDER=openai  # Default: openai
BACKBOARD_MODEL_NAME=gpt-4o    # Default: gpt-4o
```

### Getting Your API Key

1. Sign up at [Backboard.io](https://backboard.io)
2. Visit the [quickstart guide](https://app.backboard.io/quickstart)
3. Copy your API key
4. Add to `.env` file

### SDK Installation

The official SDK is already installed:

```json
{
  "dependencies": {
    "backboard-sdk": "^1.4.6"
  }
}
```

## Key Features

### 1. Semantic Search

Backboard.io uses hybrid search (BM25 + vector embeddings) to find the most relevant profile sections for each script line. This means:

- Only relevant context is retrieved (not the entire profile)
- More accurate repurposing with less token usage
- Better handling of large profiles

### 2. Memory Management

The system tracks memory IDs for cleanup:

```typescript
// When updating a profile, delete old memories first
if (existingMemoryIds && existingMemoryIds.length > 0) {
  for (const memoryId of existingMemoryIds) {
    await backboardClient.deleteMemory(assistantId, memoryId);
  }
}

// Then add new memories
const memoryIds = await indexBackboardProfile(assistantId, profileData);

// Store IDs for future cleanup
await db.update(backboardProfile).set({ memoryIds });
```

### 3. Thread Isolation

Each video gets a fresh thread to avoid context pollution:

```typescript
// Always create a new thread for each video
export async function createNewThread(assistantId: string): Promise<string> {
  const backboardClient = getClient();
  const thread = await backboardClient.createThread(assistantId);
  return thread.threadId;
}
```

### 4. Intelligent Prompt Storage

The system automatically determines if user prompts are worth storing as memories:

```typescript
async function isPromptWorthStoring(prompt: string, selectedText: string): Promise<boolean> {
  // Check for preference/style indicators
  const preferenceKeywords = [
    'more casual', 'more formal', 'tone', 'style', 'voice', 
    'prefer', 'always', 'never', 'avoid', 'instead'
  ];
  
  // Only store prompts that reveal preferences, not one-off edits
  return hasPreferenceKeyword || isGeneralPreference;
}
```

## Error Handling

The integration includes graceful fallbacks:

```typescript
try {
  const assistantId = await getOrCreateAssistant(session.user.id);
  const memoryIds = await indexBackboardProfile(assistantId, answers);
  // ... update database
} catch (error) {
  console.error("Error indexing profile in backboard.io:", error);
  // Continue even if indexing fails - profile is still saved locally
}
```

If `BACKBOARD_API_KEY` is not configured:
- Profile data is still saved in the local database
- Repurposing falls back to a simple prompt-based approach
- No errors are thrown to the user

## Data Flow Diagram

```
┌─────────────────┐
│  User Profile   │
│   (Onboarding)  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────┐
│  buildProfileChunks()           │
│  - Converts JSON to semantic    │
│  - Creates searchable chunks    │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Backboard.io Assistant         │
│  - One per user                 │
│  - Stores memories              │
│  - Enables semantic search      │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Memory Chunks (Vector DB)      │
│  - WHO YOU ARE                  │
│  - YOUR JOURNEY                 │
│  - PROOF & CREDIBILITY          │
│  - YOUR AUDIENCE                │
│  - VOICE & STYLE                │
│  - etc.                         │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Video Upload                   │
│  - Transcribe with Whisper      │
│  - Create new thread            │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  For each script line:          │
│  repurposeScriptWithRAG()       │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Backboard.io RAG               │
│  - Semantic search memories     │
│  - Retrieve relevant context    │
│  - LLM repurposes with context  │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Repurposed Script              │
│  - Personalized to user         │
│  - Minimal changes              │
│  - Stored in database           │
└─────────────────────────────────┘
```

## Benefits Over Simple Prompting

| Feature | Simple Prompting | Backboard.io RAG |
|---------|-----------------|------------------|
| Context retrieval | Entire profile in prompt | Only relevant sections |
| Token usage | High (full profile each time) | Low (selective retrieval) |
| Scalability | Poor (hits token limits) | Excellent (hybrid search) |
| Accuracy | Generic context | Precise context |
| Memory persistence | None | Persistent across sessions |
| Learning from edits | Manual | Automatic (stores preferences) |

## Future Enhancements

Potential improvements to the Backboard.io integration:

1. **User preference learning** - Automatically store and learn from user edits
2. **Multi-modal memories** - Store example videos, images, or audio clips
3. **Collaborative filtering** - Learn from similar users' preferences
4. **A/B testing** - Compare RAG vs. non-RAG repurposing quality
5. **Memory analytics** - Track which memories are most frequently retrieved

## Troubleshooting

### Profile not being indexed

Check the logs for errors:
```bash
# Look for indexing errors
grep "Error indexing profile" logs
```

Verify assistant was created:
```sql
SELECT assistantId FROM backboard_profile WHERE userId = 'user-id';
```

### RAG not retrieving relevant context

Ensure memories were created:
```sql
SELECT memoryIds FROM backboard_profile WHERE userId = 'user-id';
```

Check memory count in Backboard.io dashboard.

### API key issues

Verify environment variable is set:
```bash
echo $BACKBOARD_API_KEY
```

Test the connection:
```typescript
const client = new BackboardClient({ apiKey: process.env.BACKBOARD_API_KEY });
const assistants = await client.listAssistants();
console.log(assistants);
```

## Resources

- [Backboard.io Documentation](https://backboard.io)
- [Backboard SDK Quickstart](https://app.backboard.io/quickstart)
- [Official SDK on npm](https://www.npmjs.com/package/backboard-sdk)
- [RAG Best Practices](https://backboard.io/docs/rag-best-practices)

## Summary

Backboard.io is used as the **vector database and RAG infrastructure** for this project, enabling:

- ✅ Semantic storage of user profiles
- ✅ Intelligent context retrieval during script repurposing
- ✅ Personalized content generation
- ✅ Scalable memory management
- ✅ Learning from user preferences

The integration is production-ready with proper error handling, memory management, and graceful fallbacks.
