import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { db } from "@/db";
import { videoScript } from "@/db/schema/video-schema";
import { backboardProfile, type BackboardAnswers } from "@/db/schema/backboard-schema";
import { eq, desc } from "drizzle-orm";
import OpenAI from "openai";
import { toFile } from "openai";
import {
  getOrCreateThread,
  repurposeScriptWithRAG,
  getOrCreateAssistant,
  indexBackboardProfile,
} from "@/lib/backboard-client";

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
// Generate repurposed script using backboard.io RAG (line-by-line)
async function generateRepurposedScript(
  originalScript: string,
  backboardAnswers: BackboardAnswers,
  userId: string,
  assistantId: string
): Promise<string> {
  // Create a new thread for this video
  const threadId = await getOrCreateThread(assistantId);
  
  // Parse script into segments, preserving newline structure
  // Split by double newlines to get segments (matching original format)
  const segments = originalScript.split(/\n\s*\n/).filter(seg => seg.trim().length > 0);
  
  // Repurpose each segment using RAG
  const repurposedSegments: string[] = [];
  for (const segment of segments) {
    const repurposed = await repurposeScriptWithRAG(threadId, assistantId, segment.trim());
    repurposedSegments.push(repurposed);
  }
  
  // Join with double newlines (matching original format)
  return repurposedSegments.join("\n\n");
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
            // If profile exists but not indexed, try to index it now
            if (!profile[0].assistantId) {
              console.log("Profile exists but not indexed, attempting to index now...");
              try {
                const assistantId = await getOrCreateAssistant(session.user.id);
                const memoryIds = await indexBackboardProfile(
                  assistantId,
                  profile[0].answers as Record<string, unknown>
                );
                
                // Update profile with assistant ID and memory IDs
                await db
                  .update(backboardProfile)
                  .set({
                    assistantId,
                    memoryIds,
                  })
                  .where(eq(backboardProfile.userId, session.user.id));
                
                console.log("Profile successfully indexed");
                
                // Now generate repurposed script
                repurposedScript = await generateRepurposedScript(
                  transcription,
                  profile[0].answers,
                  session.user.id,
                  assistantId
                );
              } catch (indexError) {
                console.error("Error indexing profile:", indexError);
                // If indexing fails, don't store repurposed script (leave it null)
                repurposedScript = null;
              }
            } else {
              // Profile is already indexed, generate repurposed script
              repurposedScript = await generateRepurposedScript(
                transcription,
                profile[0].answers,
                session.user.id,
                profile[0].assistantId
              );
            }
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
