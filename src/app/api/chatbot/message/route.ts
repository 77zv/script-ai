import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { BackboardClient } from "backboard-sdk";

// Initialize the Backboard client
function getClient(): BackboardClient {
  if (!process.env.BACKBOARD_API_KEY) {
    throw new Error("BACKBOARD_API_KEY is not configured");
  }

  return new BackboardClient({
    apiKey: process.env.BACKBOARD_API_KEY,
    baseUrl: process.env.BACKBOARD_API_URL || "https://app.backboard.io/api",
  });
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { threadId, message, scriptContent } = body as {
      threadId: string;
      message: string;
      scriptContent: string;
    };

    if (!threadId || !message || !scriptContent) {
      return NextResponse.json(
        { error: "threadId, message, and scriptContent are required" },
        { status: 400 }
      );
    }

    const backboardClient = getClient();

    // System prompt for ScriptBot
    const systemPrompt = `You are ScriptBot, a friendly and helpful video script editing assistant.

Your role:
- Help users improve their video scripts
- Be conversational and encouraging
- Provide specific, actionable suggestions
- When suggesting changes, always explain WHY
- Format suggestions clearly
- Ask follow-up questions to understand their goals

Current script the user is editing:
${scriptContent}

Guidelines:
- Keep responses concise (2-3 sentences max for regular responses)
- Use emojis sparingly but appropriately
- When editing, show the EXACT new text in a code block format
- Always ask if they want to apply changes
- Be encouraging and positive
- Focus on making scripts more engaging, clear, and effective

When the user asks for edits:
1. Explain what you're changing and why
2. Show the edited version in a clear format
3. Offer to apply the changes

When suggesting changes, format them like this:
\`\`\`
[Your suggested script changes here]
\`\`\`

Remember: The user is working on a video script, so consider pacing, engagement, hooks, and clarity.`;

    // Add user message to thread
    const response = await backboardClient.addMessage(threadId, {
      content: `${systemPrompt}

User's request: ${message}

Please help them edit their script. If they're asking for specific changes, provide the edited version in a code block.`,
      llm_provider: process.env.BACKBOARD_LLM_PROVIDER || "openai",
      model_name: process.env.BACKBOARD_MODEL_NAME || "gpt-4o",
      memory: "readonly", // Use existing memories but don't create new ones
    });

    // Parse response to extract suggested changes if present
    let suggestedChanges: string | null = null;
    let responseText = response.content.trim();

    // Check if response contains code blocks (suggested changes)
    const codeBlockRegex = /```[\s\S]*?```/g;
    const codeBlocks = responseText.match(codeBlockRegex);

    if (codeBlocks && codeBlocks.length > 0) {
      // Extract the first code block as suggested changes
      suggestedChanges = codeBlocks[0]
        .replace(/```/g, "")
        .trim();
      
      // Remove code blocks from response text
      responseText = responseText.replace(codeBlockRegex, "").trim();
      
      // If response is empty after removing code blocks, add a default message
      if (!responseText) {
        responseText = "Here's my suggested edit:";
      }
    }

    return NextResponse.json({
      response: responseText,
      suggestedChanges,
    });
  } catch (error) {
    console.error("Error sending chatbot message:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
