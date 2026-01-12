import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { db } from "@/db";
import { videoScript } from "@/db/schema/video-schema";
import { eq, desc } from "drizzle-orm";
import OpenAI from "openai";
import { toFile } from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
          response_format: "text",
        });

        transcription = transcriptionResponse as unknown as string;

        // Update the script with transcription
        const updatedScript = await db
          .update(videoScript)
          .set({ script: transcription })
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
