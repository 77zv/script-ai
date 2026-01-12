import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { db } from "@/db";
import { videoScript } from "@/db/schema/video-schema";
import { eq, desc } from "drizzle-orm";

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

// POST - Create a new video script
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, script } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
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
        name: name.trim(),
        script: script || null,
        userId: session.user.id,
      })
      .returning();

    return NextResponse.json(newScript[0], { status: 201 });
  } catch (error) {
    console.error("Error creating video script:", error);
    return NextResponse.json(
      { error: "Failed to create video script" },
      { status: 500 }
    );
  }
}
