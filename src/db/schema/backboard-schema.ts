import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, index, jsonb } from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

// Backboard.io onboarding answers structure
export interface BackboardAnswers {
  // 1. Who you are (anchor facts)
  whoYouAre?: {
    bio?: string; // age range, where you're from, what you do now
    building?: string; // your app: 2–4 sentences
    remember?: string; // one sentence, what you want people to remember you for
  };
  
  // 2. Your journey & motivation
  whyProduct?: {
    whenStartedCaring?: string; // when did you first start caring about this field or area
    experiences?: string; // experiences that made you realize "this needs to be fixed"
    exactMoment?: string; // exact moment or story that pushed you to start this project
    relationshipEvolution?: string; // how has your relationship with this field evolved
  };
  
  // 3. Proof & credibility (why trust you)
  proof?: {
    builtBefore?: string; // projects, work, achievements
    numbers?: string; // users, revenue, growth, impact, metrics, etc.
    wins?: string; // notable wins, successes, what worked well
    losses?: string; // setbacks, failures, what you learned from
  };
  
  // 4. Your audience (who you communicate with)
  targetAudience?: {
    talkingTo?: string; // describe 1–2 concrete personas
    strugglingWith?: string; // what are they struggling with right now
    secretlyWant?: string; // what do they secretly want but won't say out loud
    wantThemToDo?: string; // what do you want them to do after engaging with your work
  };
  
  // 5. Your voice & communication style
  voiceStyle?: {
    howTalkOnline?: string; // tone, style, formality, pacing, emojis, swearing, etc.
    adjacentCreators?: string; // 3 people or voices that feel similar to your style
    hateInContent?: string; // what you dislike in communication or content
    speakingAs?: string; // "I", "we", or "you" (and do you switch?)
  };
  
  // 6. Beliefs & principles (your philosophy)
  beliefs?: {
    socialMedia?: string; // what do you believe about your field or industry
    buildingProducts?: string; // what do you believe about building, creating, problem-solving
    workLearning?: string; // beliefs about work, learning, creativity, money, life
    contrarianTakes?: string; // strong contrarian takes or unconventional opinions
  };
  
  // 7. Stories & moments
  stories?: {
    momentProvesCare?: string; // moment that proves you care deeply about this area
    helpedSomeone?: string; // time you helped someone (or yourself) achieve a real result
    failedAndChanged?: string; // time you failed and what changed after
    deepInCulture?: string; // moment that shows how deeply you understand or are involved in this field
  };
  
  // 8. Project specifics (for context & calls to action)
  productSpecifics?: {
    whatDoesItDo?: string; // what exactly does your project or work do in one sentence
    stage?: string; // idea, development, beta, live, v2, etc.
    oneAction?: string; // the ONE action you want people to take
    nonNegotiablePhrases?: string; // non-negotiable phrases or positioning
  };
  
  // 9. Preferences & boundaries (safety & brand)
  preferences?: {
    neverFake?: string; // topics you never want to misrepresent or fake
    avoidEntirely?: string; // topics you avoid entirely
    okayWithFlexing?: string; // okay with sharing achievements if true? Or keep it humble?
    neverUse?: string; // words/phrases you never want used
  };
  
  // 10. Communication patterns you like (templates & styles)
  contentPatterns?: {
    hookFormulas?: string; // 3–5 opening patterns or hooks you like
    storytellingPatterns?: string; // 3–5 storytelling patterns you like
    recurringSeries?: string; // recurring themes or series ideas
  };
}

export const backboardProfile = pgTable(
  "backboard_profile",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" })
      .unique(),
    answers: jsonb("answers").$type<BackboardAnswers>().notNull(),
    assistantId: text("assistant_id"), // Store backboard.io assistant ID
    memoryIds: jsonb("memory_ids").$type<string[]>(), // Store memory IDs for cleanup
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("backboard_profile_userId_idx").on(table.userId)]
);

export const backboardProfileRelations = relations(backboardProfile, ({ one }) => ({
  user: one(user, {
    fields: [backboardProfile.userId],
    references: [user.id],
  }),
}));
