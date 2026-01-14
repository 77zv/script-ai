import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import {
  getOrCreateAssistant,
  createNewThread,
} from "@/lib/backboard-client";
import { db } from "@/db";
import { backboardProfile } from "@/db/schema/backboard-schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { scriptId, scriptContent } = body as {
      scriptId: string;
      scriptContent: string;
    };

    if (!scriptId) {
      return NextResponse.json(
        { error: "scriptId is required" },
        { status: 400 }
      );
    }

    // scriptContent can be empty, but we'll use empty string as default
    const contentToUse = scriptContent || "";

    // Get or create assistant for the user
    // First check if user has a backboard profile with assistantId
    const profile = await db
      .select()
      .from(backboardProfile)
      .where(eq(backboardProfile.userId, session.user.id))
      .limit(1);

    let assistantId: string;

    if (profile.length > 0 && profile[0].assistantId) {
      assistantId = profile[0].assistantId;
    } else {
      // Create a new assistant for script editing
      assistantId = await getOrCreateAssistant(session.user.id);
    }

    // Create a new thread for this chat session
    const threadId = await createNewThread(assistantId);

    // TODO: Store threadId in database if needed for persistence
    // For now, we'll rely on the client to maintain the threadId

    return NextResponse.json({
      threadId,
      assistantId,
    });

  } catch (error) {
    console.error("Error initializing chatbot:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to initialize chatbot: ${errorMessage}` },
      { status: 500 }
    );
  }
}
