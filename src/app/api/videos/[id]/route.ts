import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { db } from "@/db";
import { videoScript } from "@/db/schema/video-schema";
import { eq, and } from "drizzle-orm";

// DELETE - Delete a video script
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    await db
      .delete(videoScript)
      .where(
        and(
          eq(videoScript.id, id),
          eq(videoScript.userId, session.user.id)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting video script:", error);
    return NextResponse.json(
      { error: "Failed to delete video script" },
      { status: 500 }
    );
  }
}

// PATCH - Update a video script
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, script } = body;

    const updateData: { name?: string; script?: string | null } = {};
    
    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length === 0) {
        return NextResponse.json(
          { error: "Script name cannot be empty" },
          { status: 400 }
        );
      }
      updateData.name = name.trim();
    }

    if (script !== undefined) {
      updateData.script = script || null;
    }

    const updated = await db
      .update(videoScript)
      .set(updateData)
      .where(
        and(
          eq(videoScript.id, id),
          eq(videoScript.userId, session.user.id)
        )
      )
      .returning();

    if (updated.length === 0) {
      return NextResponse.json(
        { error: "Video script not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(updated[0]);
  } catch (error) {
    console.error("Error updating video script:", error);
    return NextResponse.json(
      { error: "Failed to update video script" },
      { status: 500 }
    );
  }
}
