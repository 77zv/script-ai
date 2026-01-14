import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { db } from "@/db";
import { videoScript } from "@/db/schema/video-schema";
import { backboardProfile } from "@/db/schema/backboard-schema";
import { eq } from "drizzle-orm";
import {
  getOrCreateThread,
  repurposeScriptWithRAG,
  getOrCreateAssistant,
  storePromptAsMemory,
} from "@/lib/backboard-client";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { scriptId, selectedText, prompt, isRepurposed } = body as {
      scriptId: string;
      selectedText: string;
      prompt: string;
      isRepurposed?: boolean;
    };

    if (!scriptId || !selectedText || !prompt) {
      return NextResponse.json(
        { error: "scriptId, selectedText, and prompt are required" },
        { status: 400 }
      );
    }

    // Get the script
    const scripts = await db
      .select()
      .from(videoScript)
      .where(eq(videoScript.id, scriptId))
      .limit(1);

    if (scripts.length === 0) {
      return NextResponse.json({ error: "Script not found" }, { status: 404 });
    }

    const script = scripts[0];

    // Check if user owns this script
    if (script.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Get user's backboard profile
    const profile = await db
      .select()
      .from(backboardProfile)
      .where(eq(backboardProfile.userId, session.user.id))
      .limit(1);

    if (profile.length === 0 || !profile[0].assistantId) {
      return NextResponse.json(
        { error: "Backboard profile not found or not indexed" },
        { status: 400 }
      );
    }

    // Use backboard.io RAG to process the prompt
    const assistantId = profile[0].assistantId;
    const threadId = await getOrCreateThread(assistantId);
    
    // Create a prompt that includes the selected text and user's request
    const fullPrompt = `The user has selected this text from their script:
"${selectedText}"

User's request: ${prompt}

Please modify the selected text according to the user's request. Use the creator's profile information (retrieved via RAG) to ensure the modification matches their voice and style. Return ONLY the modified text, nothing else.`;

    const updatedText = await repurposeScriptWithRAG(
      threadId,
      assistantId,
      fullPrompt
    );

    // Store the prompt as a memory if it's valuable (runs async, doesn't block response)
    storePromptAsMemory(assistantId, prompt, selectedText)
      .then((memoryId) => {
        if (memoryId) {
          console.log(`Stored valuable prompt as memory: ${memoryId}`);
        }
      })
      .catch((error) => {
        console.error("Error storing prompt as memory (non-blocking):", error);
      });

    return NextResponse.json({ updatedText });
  } catch (error) {
    console.error("Error processing prompt:", error);
    return NextResponse.json(
      { error: "Failed to process prompt" },
      { status: 500 }
    );
  }
}
