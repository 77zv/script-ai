/**
 * Backboard.io SDK Integration
 * Uses the official backboard-sdk for vector database and RAG capabilities
 */

import { BackboardClient } from "backboard-sdk";

// Initialize the Backboard client
let client: BackboardClient | null = null;

function getClient(): BackboardClient {
  if (!process.env.BACKBOARD_API_KEY) {
    throw new Error("BACKBOARD_API_KEY is not configured");
  }

  if (!client) {
    client = new BackboardClient({
      apiKey: process.env.BACKBOARD_API_KEY,
      baseUrl: process.env.BACKBOARD_API_URL || "https://app.backboard.io/api",
    });
  }

  return client;
}

/**
 * Create or get an assistant for a user
 */
export async function getOrCreateAssistant(userId: string): Promise<string> {
  const backboardClient = getClient();

  try {
    // List existing assistants to find one for this user
    const assistants = await backboardClient.listAssistants();
    const userAssistant = assistants.find(
      (a: { name?: string }) => a.name === `backboard-profile-${userId}`
    );

    if (userAssistant) {
      return userAssistant.assistantId;
    }

    // Create new assistant for this user
    const assistant = await backboardClient.createAssistant({
      name: `backboard-profile-${userId}`,
      description: `Backboard profile assistant for user ${userId}`,
    });

    return assistant.assistantId;
  } catch (error) {
    console.error("Error getting/creating assistant:", error);
    throw error;
  }
}

/**
 * Create a new thread for repurposing (fresh context for each video)
 */
export async function createNewThread(
  assistantId: string
): Promise<string> {
  const backboardClient = getClient();

  try {
    // Always create a new thread for each video to avoid context pollution
    const thread = await backboardClient.createThread(assistantId);
    return thread.threadId;
  } catch (error) {
    console.error("Error creating thread:", error);
    throw error;
  }
}

/**
 * Create or get a thread for a user (for general use)
 */
export async function getOrCreateThread(
  assistantId: string
): Promise<string> {
  // For repurposing, we want a fresh thread each time
  return createNewThread(assistantId);
}

/**
 * Index backboard profile data as memory in the assistant
 * Returns memory IDs for tracking
 */
export async function indexBackboardProfile(
  assistantId: string,
  profileData: Record<string, unknown>,
  existingMemoryIds?: string[]
): Promise<string[]> {
  const backboardClient = getClient();

  try {
    // First, delete existing memories if provided
    if (existingMemoryIds && existingMemoryIds.length > 0) {
      for (const memoryId of existingMemoryIds) {
        try {
          await backboardClient.deleteMemory(assistantId, memoryId);
        } catch (error) {
          // Memory might already be deleted, continue
          console.warn(`Could not delete memory ${memoryId}:`, error);
        }
      }
    }

    // Convert profile data into semantic memory chunks
    const chunks = buildProfileChunks(profileData);
    const memoryIds: string[] = [];

    // Add each chunk as memory and track IDs
    for (const chunk of chunks) {
      if (chunk.content && chunk.content.trim().length > 0) {
        const memory = await backboardClient.addMemory(assistantId, {
          content: chunk.content,
          metadata: chunk.metadata,
        });
        memoryIds.push(memory.memoryId);
      }
    }

    return memoryIds;
  } catch (error) {
    console.error("Error indexing profile:", error);
    throw error;
  }
}

/**
 * Build semantic chunks from profile data for better RAG retrieval
 * Creates human-readable, searchable content instead of JSON
 */
function buildProfileChunks(profileData: Record<string, unknown>): Array<{
  content: string;
  metadata: Record<string, unknown>;
}> {
  const chunks: Array<{ content: string; metadata: Record<string, unknown> }> = [];

  const getValue = (obj: unknown, key: string): string => {
    if (obj && typeof obj === "object" && key in obj) {
      const value = (obj as Record<string, unknown>)[key];
      return typeof value === "string" ? value : "";
    }
    return "";
  };

  // Create semantic, searchable chunks for each section
  if (profileData.whoYouAre) {
    const section = profileData.whoYouAre as Record<string, unknown>;
    const bio = getValue(section, "bio");
    const building = getValue(section, "building");
    const remember = getValue(section, "remember");
    
    if (bio || building || remember) {
      chunks.push({
        content: `WHO YOU ARE - BACKGROUND AND FIELD:
Bio (age, location, current role/field): ${bio || "Not provided"}
What you're building/working on: ${building || "Not provided"}
What you want to be remembered for: ${remember || "Not provided"}

IMPORTANT: Extract the creator's field/industry, university/education, and career path from the bio above. Use this information to replace any generic field references in scripts.`,
        metadata: { section: "whoYouAre", type: "profile" },
      });
    }
  }

  if (profileData.whyProduct) {
    const section = profileData.whyProduct as Record<string, unknown>;
    const whenStarted = getValue(section, "whenStartedCaring");
    const experiences = getValue(section, "experiences");
    const exactMoment = getValue(section, "exactMoment");
    const evolution = getValue(section, "relationshipEvolution");
    
    if (whenStarted || experiences || exactMoment || evolution) {
      chunks.push({
        content: `YOUR JOURNEY AND MOTIVATION:
When you started caring: ${whenStarted || "Not provided"}
Experiences that shaped you: ${experiences || "Not provided"}
The moment that pushed you: ${exactMoment || "Not provided"}
How your relationship evolved: ${evolution || "Not provided"}`,
        metadata: { section: "whyProduct", type: "profile" },
      });
    }
  }

  if (profileData.proof) {
    const section = profileData.proof as Record<string, unknown>;
    const builtBefore = getValue(section, "builtBefore");
    const numbers = getValue(section, "numbers");
    const wins = getValue(section, "wins");
    const losses = getValue(section, "losses");
    
    if (builtBefore || numbers || wins || losses) {
      chunks.push({
        content: `PROOF AND CREDIBILITY:
What you've built before: ${builtBefore || "Not provided"}
Numbers and metrics: ${numbers || "Not provided"}
Notable wins: ${wins || "Not provided"}
Setbacks and learnings: ${losses || "Not provided"}`,
        metadata: { section: "proof", type: "profile" },
      });
    }
  }

  if (profileData.targetAudience) {
    const section = profileData.targetAudience as Record<string, unknown>;
    const talkingTo = getValue(section, "talkingTo");
    const struggling = getValue(section, "strugglingWith");
    const secretlyWant = getValue(section, "secretlyWant");
    const wantThemToDo = getValue(section, "wantThemToDo");
    
    if (talkingTo || struggling || secretlyWant || wantThemToDo) {
      chunks.push({
        content: `YOUR AUDIENCE:
Who you're talking to: ${talkingTo || "Not provided"}
What they're struggling with: ${struggling || "Not provided"}
What they secretly want: ${secretlyWant || "Not provided"}
What you want them to do: ${wantThemToDo || "Not provided"}`,
        metadata: { section: "targetAudience", type: "profile" },
      });
    }
  }

  if (profileData.voiceStyle) {
    const section = profileData.voiceStyle as Record<string, unknown>;
    const howTalk = getValue(section, "howTalkOnline");
    const adjacent = getValue(section, "adjacentCreators");
    const hate = getValue(section, "hateInContent");
    const speakingAs = getValue(section, "speakingAs");
    
    if (howTalk || adjacent || hate || speakingAs) {
      chunks.push({
        content: `VOICE AND COMMUNICATION STYLE:
How you communicate: ${howTalk || "Not provided"}
Similar voices you relate to: ${adjacent || "Not provided"}
What you dislike in content: ${hate || "Not provided"}
Speaking perspective: ${speakingAs || "Not provided"}`,
        metadata: { section: "voiceStyle", type: "profile" },
      });
    }
  }

  if (profileData.beliefs) {
    const section = profileData.beliefs as Record<string, unknown>;
    const field = getValue(section, "socialMedia");
    const building = getValue(section, "buildingProducts");
    const workLearning = getValue(section, "workLearning");
    const contrarian = getValue(section, "contrarianTakes");
    
    if (field || building || workLearning || contrarian) {
      chunks.push({
        content: `BELIEFS AND PRINCIPLES:
Beliefs about your field: ${field || "Not provided"}
Beliefs about building: ${building || "Not provided"}
Beliefs about work and learning: ${workLearning || "Not provided"}
Contrarian takes: ${contrarian || "Not provided"}`,
        metadata: { section: "beliefs", type: "profile" },
      });
    }
  }

  if (profileData.stories) {
    const section = profileData.stories as Record<string, unknown>;
    const momentProves = getValue(section, "momentProvesCare");
    const helped = getValue(section, "helpedSomeone");
    const failed = getValue(section, "failedAndChanged");
    const deepInCulture = getValue(section, "deepInCulture");
    
    if (momentProves || helped || failed || deepInCulture) {
      chunks.push({
        content: `STORIES AND MOMENTS:
Moment that proves you care: ${momentProves || "Not provided"}
Time you helped someone: ${helped || "Not provided"}
Time you failed and learned: ${failed || "Not provided"}
Moment showing deep understanding: ${deepInCulture || "Not provided"}`,
        metadata: { section: "stories", type: "profile" },
      });
    }
  }

  if (profileData.productSpecifics) {
    const section = profileData.productSpecifics as Record<string, unknown>;
    const whatDoesItDo = getValue(section, "whatDoesItDo");
    const stage = getValue(section, "stage");
    const oneAction = getValue(section, "oneAction");
    const phrases = getValue(section, "nonNegotiablePhrases");
    
    if (whatDoesItDo || stage || oneAction || phrases) {
      chunks.push({
        content: `PROJECT SPECIFICS:
What it does: ${whatDoesItDo || "Not provided"}
Current stage: ${stage || "Not provided"}
Primary call to action: ${oneAction || "Not provided"}
Non-negotiable phrases: ${phrases || "Not provided"}`,
        metadata: { section: "productSpecifics", type: "profile" },
      });
    }
  }

  if (profileData.preferences) {
    const section = profileData.preferences as Record<string, unknown>;
    const neverFake = getValue(section, "neverFake");
    const avoid = getValue(section, "avoidEntirely");
    const flexing = getValue(section, "okayWithFlexing");
    const neverUse = getValue(section, "neverUse");
    
    if (neverFake || avoid || flexing || neverUse) {
      chunks.push({
        content: `PREFERENCES AND BOUNDARIES:
Topics you never fake: ${neverFake || "Not provided"}
Topics you avoid: ${avoid || "Not provided"}
Attitude toward achievements: ${flexing || "Not provided"}
Words/phrases to never use: ${neverUse || "Not provided"}`,
        metadata: { section: "preferences", type: "profile" },
      });
    }
  }

  if (profileData.contentPatterns) {
    const section = profileData.contentPatterns as Record<string, unknown>;
    const hooks = getValue(section, "hookFormulas");
    const storytelling = getValue(section, "storytellingPatterns");
    const series = getValue(section, "recurringSeries");
    
    if (hooks || storytelling || series) {
      chunks.push({
        content: `COMMUNICATION PATTERNS:
Hook formulas you like: ${hooks || "Not provided"}
Storytelling patterns: ${storytelling || "Not provided"}
Recurring series ideas: ${series || "Not provided"}`,
        metadata: { section: "contentPatterns", type: "profile" },
      });
    }
  }

  return chunks;
}


/**
 * Use RAG to repurpose a script line using backboard.io
 */
export async function repurposeScriptWithRAG(
  threadId: string,
  assistantId: string,
  scriptLine: string
): Promise<string> {
  const backboardClient = getClient();

  const response = await backboardClient.addMessage(threadId, {
    content: `Repurpose this line to match the creator's actual background and field. Make MINIMAL changes - keep the same length, tone, style, and structure. Only replace generic references with the creator's specific details.

ORIGINAL LINE:
${scriptLine}

CRITICAL RULES - PRESERVE STYLE AND LENGTH:
1. Keep the EXACT same length - don't add extra words or details
2. Keep the EXACT same tone and style - match the original's energy and pacing
3. Keep the EXACT same structure - don't rearrange or add clauses
4. Only replace generic references with creator's specific details
5. Preserve timestamps if present [MM:SS] exactly as shown

WHAT TO REPLACE (only if present):
- Industry/field references (e.g., "investment banking", "consulting") → Creator's actual field
- University names → Creator's actual university
- Majors/degrees → Creator's actual major/background
- Job titles/career paths → Creator's actual career path

WHAT NOT TO DO:
- DO NOT add extra details, examples, or explanations
- DO NOT change the tone (formal/informal, energetic/calm, etc.)
- DO NOT make the line longer
- DO NOT add clauses like "especially when..." or "especially if..."
- DO NOT change the sentence structure

EXAMPLES:
Original: "I'm a finance student at McGill"
Repurposed (if creator is CS at Queens): "I'm a computer science student at Queens University"
✓ Same length, same tone, only replaced the details

Original: "I don't know who needs to hear this, but college is not real life."
Repurposed: "I don't know who needs to hear this, but college is not real life."
✓ No changes needed - no generic references to replace

Original: "I landed a consulting internship"
Repurposed (if creator is in tech): "I landed a software engineering internship"
✓ Same length, same tone, only replaced the field

CRITICAL OUTPUT FORMAT:
- Return ONLY the repurposed line text
- If timestamp is present in original, include it: [MM:SS] repurposed text
- Keep it the SAME LENGTH and SAME TONE as the original
- Do NOT add extra words or details`,
      llm_provider: process.env.BACKBOARD_LLM_PROVIDER || "openai",
      model_name: process.env.BACKBOARD_MODEL_NAME || "gpt-4o",
      // Enable memory (RAG) - this will automatically retrieve relevant profile context
      memory: "readonly", // readonly = search only (don't write new memories during repurposing)
    });

  return response.content.trim();
}
