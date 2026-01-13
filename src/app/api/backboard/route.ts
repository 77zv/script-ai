import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { db } from "@/db";
import { backboardProfile, type BackboardAnswers } from "@/db/schema/backboard-schema";
import { eq } from "drizzle-orm";

// GET - Fetch user's backboard profile
export async function GET() {
  try {
    const session = await getSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await db
      .select()
      .from(backboardProfile)
      .where(eq(backboardProfile.userId, session.user.id))
      .limit(1);

    if (profile.length === 0) {
      return NextResponse.json({ profile: null });
    }

    return NextResponse.json({ profile: profile[0] });
  } catch (error) {
    console.error("Error fetching backboard profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch backboard profile" },
      { status: 500 }
    );
  }
}

// POST/PUT - Create or update user's backboard profile
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { answers } = body as { answers: BackboardAnswers };

    if (!answers) {
      return NextResponse.json(
        { error: "Answers are required" },
        { status: 400 }
      );
    }

    // Check if profile exists
    const existing = await db
      .select()
      .from(backboardProfile)
      .where(eq(backboardProfile.userId, session.user.id))
      .limit(1);

    if (existing.length > 0) {
      // Update existing profile
      const updated = await db
        .update(backboardProfile)
        .set({ answers })
        .where(eq(backboardProfile.userId, session.user.id))
        .returning();

      return NextResponse.json({ profile: updated[0] });
    } else {
      // Create new profile
      const id = crypto.randomUUID();
      const newProfile = await db
        .insert(backboardProfile)
        .values({
          id,
          userId: session.user.id,
          answers,
        })
        .returning();

      return NextResponse.json({ profile: newProfile[0] }, { status: 201 });
    }
  } catch (error) {
    console.error("Error saving backboard profile:", error);
    return NextResponse.json(
      { error: "Failed to save backboard profile" },
      { status: 500 }
    );
  }
}
