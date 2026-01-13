import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { db } from "@/db";
import { videoScript } from "@/db/schema/video-schema";
import { backboardProfile, type BackboardAnswers } from "@/db/schema/backboard-schema";
import { eq, desc } from "drizzle-orm";
import OpenAI from "openai";
import { toFile } from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper function to format timestamp (seconds to MM:SS format)
function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

// Format transcription as a script with timestamps
function formatTranscriptionAsScript(transcriptionResponse: {
  text?: string;
  segments?: Array<{ start: number; text: string }>;
} | string): string {
  // If response is a string (fallback), return as is
  if (typeof transcriptionResponse === "string") {
    return transcriptionResponse;
  }

  // If response has segments, format them as a script
  if (transcriptionResponse.segments && Array.isArray(transcriptionResponse.segments)) {
    const segments = transcriptionResponse.segments;
    return segments
      .map((segment: { start: number; text: string }) => {
        const startTime = formatTimestamp(segment.start);
        const text = segment.text.trim();
        return `[${startTime}] ${text}`;
      })
      .join("\n\n");
  }

  // If response has text but no segments, return text with basic formatting
  if (transcriptionResponse.text) {
    // Split by sentences and add line breaks
    return transcriptionResponse.text
      .replace(/([.!?])\s+/g, "$1\n\n")
      .trim();
  }

  // Fallback: return stringified response
  return JSON.stringify(transcriptionResponse);
}

// Parse script into segments (by timestamps or lines)
function parseScriptSegments(script: string): Array<{ timestamp?: string; text: string }> {
  const segments: Array<{ timestamp?: string; text: string }> = [];
  
  // Split by double newlines (paragraph breaks) or timestamp markers
  const lines = script.split(/\n\n+/);
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    // Check if line starts with a timestamp [MM:SS]
    const timestampMatch = trimmed.match(/^\[(\d+:\d+)\]\s*(.+)$/);
    if (timestampMatch) {
      segments.push({
        timestamp: timestampMatch[1],
        text: timestampMatch[2],
      });
    } else {
      // No timestamp, just text
      segments.push({ text: trimmed });
    }
  }
  
  return segments;
}

// Format segments back into script format
function formatSegmentsToScript(segments: Array<{ timestamp?: string; text: string }>): string {
  return segments
    .map((segment) => {
      if (segment.timestamp) {
        return `[${segment.timestamp}] ${segment.text}`;
      }
      return segment.text;
    })
    .join("\n\n");
}

// Generate repurposed script based on backboard profile (line-by-line with minimal changes)
async function generateRepurposedScript(
  originalScript: string,
  backboardAnswers: BackboardAnswers
): Promise<string> {
  try {
    // Build context from backboard answers
    const context = buildBackboardContext(backboardAnswers);
    
    // Parse script into segments
    const segments = parseScriptSegments(originalScript);
    
    if (segments.length === 0) {
      return originalScript;
    }
    
    // Process segments in batches to avoid token limits and maintain context
    const batchSize = 10; // Process 10 segments at a time
    const repurposedSegments: Array<{ timestamp?: string; text: string }> = [];
    
    for (let i = 0; i < segments.length; i += batchSize) {
      const batch = segments.slice(i, i + batchSize);
      
      // Build batch context
      const batchText = batch
        .map((seg, idx) => {
          const num = i + idx + 1;
          if (seg.timestamp) {
            return `${num}. [${seg.timestamp}] ${seg.text}`;
          }
          return `${num}. ${seg.text}`;
        })
        .join("\n");
      
      const prompt = `You are a content repurposing expert. Repurpose ONLY the following segments from a video transcript to match the creator's voice and style. Make MINIMAL changes - only adapt what's necessary (tone, word choice, examples) while preserving the core message and structure.

CREATOR PROFILE:
${context}

ORIGINAL SEGMENTS:
${batchText}

CRITICAL INSTRUCTIONS:
1. Repurpose each segment INDIVIDUALLY with MINIMAL changes
2. Keep the EXACT same meaning and core message
3. Only change: word choice, tone, examples, or phrasing to match their voice
4. Preserve ALL timestamps exactly as shown [MM:SS]
5. Keep the same structure and flow
6. If a segment doesn't need changes, return it as-is
7. Respect their red lines (words/phrases to avoid)
8. Return ONLY the repurposed segments in the same numbered format

Return the repurposed segments in this exact format:
1. [timestamp if present] repurposed text
2. [timestamp if present] repurposed text
...`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a precise content repurposing specialist. You make minimal, surgical changes to adapt content to a creator's voice while preserving the original meaning and structure.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.3, // Lower temperature for more consistent, minimal changes
        max_tokens: 2000,
      });

      const repurposedText = response.choices[0]?.message?.content || "";
      
      // Parse the repurposed segments
      const repurposedLines = repurposedText.split(/\n+/);
      for (let j = 0; j < batch.length && j < repurposedLines.length; j++) {
        const line = repurposedLines[j].trim();
        if (!line) continue;
        
        // Extract segment number and content
        const match = line.match(/^\d+\.\s*(?:\[(\d+:\d+)\]\s*)?(.+)$/);
        if (match) {
          repurposedSegments.push({
            timestamp: match[1] || batch[j].timestamp,
            text: match[2].trim(),
          });
        } else {
          // Fallback: try to preserve timestamp if present
          const timestampMatch = line.match(/^\[(\d+:\d+)\]\s*(.+)$/);
          if (timestampMatch) {
            repurposedSegments.push({
              timestamp: timestampMatch[1],
              text: timestampMatch[2].trim(),
            });
          } else {
            // No timestamp, use original segment's timestamp if it had one
            repurposedSegments.push({
              timestamp: batch[j].timestamp,
              text: line,
            });
          }
        }
      }
      
      // If we didn't get enough segments back, use originals as fallback
      while (repurposedSegments.length < i + batch.length) {
        const originalIdx = repurposedSegments.length;
        if (originalIdx < segments.length) {
          repurposedSegments.push(segments[originalIdx]);
        }
      }
    }
    
    // Format back to script
    return formatSegmentsToScript(repurposedSegments);
  } catch (error) {
    console.error("Error generating repurposed script:", error);
    // Return original script if repurposing fails
    return originalScript;
  }
}

// Build context string from backboard answers
function buildBackboardContext(answers: BackboardAnswers): string {
  const sections: string[] = [];

  const getValue = (obj: unknown, key: string): string => {
    if (obj && typeof obj === "object" && key in obj) {
      const value = (obj as Record<string, unknown>)[key];
      return typeof value === "string" ? value : "Not provided";
    }
    return "Not provided";
  };

  const whoYouAre = answers.whoYouAre;
  if (whoYouAre) {
    sections.push(`WHO YOU ARE:
- Bio: ${getValue(whoYouAre, "bio")}
- Building: ${getValue(whoYouAre, "building")}
- Remember for: ${getValue(whoYouAre, "remember")}`);
  }

  const whyProduct = answers.whyProduct;
  if (whyProduct) {
    sections.push(`YOUR JOURNEY & MOTIVATION:
- Started caring: ${getValue(whyProduct, "whenStartedCaring")}
- Experiences: ${getValue(whyProduct, "experiences")}
- Exact moment: ${getValue(whyProduct, "exactMoment")}
- Relationship evolution: ${getValue(whyProduct, "relationshipEvolution")}`);
  }

  const proof = answers.proof;
  if (proof) {
    sections.push(`PROOF & CREDIBILITY:
- Built before: ${getValue(proof, "builtBefore")}
- Numbers: ${getValue(proof, "numbers")}
- Wins: ${getValue(proof, "wins")}
- Losses: ${getValue(proof, "losses")}`);
  }

  const targetAudience = answers.targetAudience;
  if (targetAudience) {
    sections.push(`YOUR AUDIENCE:
- Talking to: ${getValue(targetAudience, "talkingTo")}
- Struggling with: ${getValue(targetAudience, "strugglingWith")}
- Secretly want: ${getValue(targetAudience, "secretlyWant")}
- Want them to do: ${getValue(targetAudience, "wantThemToDo")}`);
  }

  const voiceStyle = answers.voiceStyle;
  if (voiceStyle) {
    sections.push(`VOICE & COMMUNICATION STYLE:
- How you communicate: ${getValue(voiceStyle, "howTalkOnline")}
- Similar voices: ${getValue(voiceStyle, "adjacentCreators")}
- Dislikes: ${getValue(voiceStyle, "hateInContent")}
- Speaking as: ${getValue(voiceStyle, "speakingAs")}`);
  }

  const beliefs = answers.beliefs;
  if (beliefs) {
    sections.push(`BELIEFS & PRINCIPLES:
- Your field/industry: ${getValue(beliefs, "socialMedia")}
- Building/creating: ${getValue(beliefs, "buildingProducts")}
- Work/learning/life: ${getValue(beliefs, "workLearning")}
- Contrarian takes: ${getValue(beliefs, "contrarianTakes")}`);
  }

  const stories = answers.stories;
  if (stories) {
    sections.push(`STORIES & MOMENTS:
- Moment proves care: ${getValue(stories, "momentProvesCare")}
- Helped someone: ${getValue(stories, "helpedSomeone")}
- Failed and changed: ${getValue(stories, "failedAndChanged")}
- Deep in culture: ${getValue(stories, "deepInCulture")}`);
  }

  const productSpecifics = answers.productSpecifics;
  if (productSpecifics) {
    sections.push(`PROJECT SPECIFICS:
- What it does: ${getValue(productSpecifics, "whatDoesItDo")}
- Stage: ${getValue(productSpecifics, "stage")}
- One action: ${getValue(productSpecifics, "oneAction")}
- Non-negotiable phrases: ${getValue(productSpecifics, "nonNegotiablePhrases")}`);
  }

  const preferences = answers.preferences;
  if (preferences) {
    sections.push(`PREFERENCES & BOUNDARIES:
- Never fake: ${getValue(preferences, "neverFake")}
- Avoid entirely: ${getValue(preferences, "avoidEntirely")}
- Okay with sharing achievements: ${getValue(preferences, "okayWithFlexing")}
- Never use: ${getValue(preferences, "neverUse")}`);
  }

  const contentPatterns = answers.contentPatterns;
  if (contentPatterns) {
    sections.push(`COMMUNICATION PATTERNS:
- Hook patterns: ${getValue(contentPatterns, "hookFormulas")}
- Storytelling patterns: ${getValue(contentPatterns, "storytellingPatterns")}
- Recurring themes: ${getValue(contentPatterns, "recurringSeries")}`);
  }

  return sections.join("\n\n");
}

// GET - Fetch all video scripts for the current user
export async function GET() {
  try {
    const session = await getSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const scripts = await db
      .select()
      .from(videoScript)
      .where(eq(videoScript.userId, session.user.id))
      .orderBy(desc(videoScript.createdAt));

    return NextResponse.json(scripts);
  } catch (error) {
    console.error("Error fetching video scripts:", error);
    return NextResponse.json(
      { error: "Failed to fetch video scripts" },
      { status: 500 }
    );
  }
}

// POST - Create a new video script with transcription
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key is not configured" },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const name = formData.get("name") as string | null;

    // If file is provided, handle video upload and transcription
    if (file) {
      if (!file.type.startsWith("video/") && !file.type.startsWith("audio/")) {
        return NextResponse.json(
          { error: "File must be a video or audio file" },
          { status: 400 }
        );
      }

      const fileName = name || file.name.replace(/\.[^/.]+$/, "");
      const id = crypto.randomUUID();

      // Create video script entry first
      const newScript = await db
        .insert(videoScript)
        .values({
          id,
          name: fileName.trim(),
          script: null, // Will be updated after transcription
          userId: session.user.id,
        })
        .returning();

      // Convert file to buffer for OpenAI
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Create File object for OpenAI
      const openAIFile = await toFile(buffer, file.name, {
        type: file.type,
      });

      // Transcribe using OpenAI Whisper
      let transcription = "";
      try {
        const transcriptionResponse = await openai.audio.transcriptions.create({
          file: openAIFile,
          model: "whisper-1",
          response_format: "verbose_json",
          timestamp_granularities: ["segment"],
        });

        // Format transcription as a script with timestamps
        transcription = formatTranscriptionAsScript(transcriptionResponse);

        // Get user's backboard profile to generate repurposed script
        let repurposedScript = null;
        try {
          const profile = await db
            .select()
            .from(backboardProfile)
            .where(eq(backboardProfile.userId, session.user.id))
            .limit(1);

          if (profile.length > 0 && profile[0].answers) {
            // Generate repurposed script based on backboard profile
            repurposedScript = await generateRepurposedScript(
              transcription,
              profile[0].answers
            );
          }
        } catch (repurposeError) {
          console.error("Error generating repurposed script:", repurposeError);
          // Continue without repurposed script if generation fails
        }

        // Update the script with transcription and repurposed script
        const updatedScript = await db
          .update(videoScript)
          .set({
            script: transcription,
            repurposedScript: repurposedScript,
          })
          .where(eq(videoScript.id, id))
          .returning();

        return NextResponse.json(updatedScript[0], { status: 201 });
      } catch (transcriptionError) {
        console.error("Error transcribing video:", transcriptionError);
        // Return the script even if transcription failed
        return NextResponse.json(
          {
            ...newScript[0],
            error: "Video uploaded but transcription failed. You can edit the script manually.",
          },
          { status: 201 }
        );
      }
    }

    // Fallback: Handle JSON body (for backwards compatibility)
    const contentType = request.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      const body = await request.json();
      const { name: jsonName, script } = body;

      if (!jsonName || typeof jsonName !== "string" || jsonName.trim().length === 0) {
        return NextResponse.json(
          { error: "Script name is required" },
          { status: 400 }
        );
      }

      const id = crypto.randomUUID();

      const newScript = await db
        .insert(videoScript)
        .values({
          id,
          name: jsonName.trim(),
          script: script || null,
          userId: session.user.id,
        })
        .returning();

      return NextResponse.json(newScript[0], { status: 201 });
    }

    return NextResponse.json(
      { error: "No file or name provided" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error creating video script:", error);
    return NextResponse.json(
      { error: "Failed to create video script" },
      { status: 500 }
    );
  }
}
