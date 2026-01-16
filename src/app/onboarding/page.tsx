"use client";

import { useState, useEffect } from "react";
import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import type { BackboardAnswers } from "@/db/schema/backboard-schema";

export default function Onboarding() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentSection, setCurrentSection] = useState(1);
  const [answers, setAnswers] = useState<BackboardAnswers>({});

  // Redirect if not authenticated
  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/sign-in");
    }
  }, [session, isPending, router]);

  // Load existing profile
  useEffect(() => {
    if (session?.user) {
      fetchProfile();
    }
  }, [session]);

  const fetchProfile = async () => {
    try {
      const response = await fetch("/api/backboard");
      if (response.ok) {
        const data = await response.json();
        if (data.profile?.answers) {
          setAnswers(data.profile.answers);
        }
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/backboard", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ answers }),
      });

      if (response.ok) {
        // Redirect to dashboard after saving
        router.push("/dashboard");
      } else {
        alert("Failed to save profile. Please try again.");
      }
    } catch (error) {
      console.error("Error saving profile:", error);
      alert("Failed to save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const updateAnswer = (section: keyof BackboardAnswers, field: string, value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [section]: {
        ...(prev[section] as any),
        [field]: value,
      },
    }));
  };

  const sections = [
    {
      number: 1,
      title: "Who you are (anchor facts)",
      questions: [
        {
          key: "bio",
          label: "Who are you? (short bio: age range, where you're from, what you do now)",
          placeholder: "e.g., 28, from SF, working in tech...",
        },
        {
          key: "building",
          label: "What are you working on or building right now? (2–4 sentences)",
          placeholder: "Describe what you're working on in 2-4 sentences...",
        },
        {
          key: "remember",
          label: "In one sentence, what do you want people to remember you for?",
          placeholder: "e.g., The person who made X accessible to everyone...",
        },
      ],
    },
    {
      number: 2,
      title: "Your journey & motivation",
      questions: [
        {
          key: "whenStartedCaring",
          label: "When did you first start caring about this field or area?",
          placeholder: "Tell your story...",
        },
        {
          key: "experiences",
          label: 'What experiences made you realize "this needs to be fixed" or "I need to do something about this"?',
          placeholder: "Describe the experiences...",
        },
        {
          key: "exactMoment",
          label: "What was the exact moment or story that pushed you to start this current project?",
          placeholder: "Describe the moment...",
        },
        {
          key: "relationshipEvolution",
          label: "How has your relationship with this field or area evolved over time?",
          placeholder: "Describe the evolution...",
        },
      ],
    },
    {
      number: 3,
      title: "Proof & credibility (why trust you)",
      questions: [
        {
          key: "builtBefore",
          label: "What have you built or accomplished before? (projects, work, achievements)",
          placeholder: "List your previous work or accomplishments...",
        },
        {
          key: "numbers",
          label: "Any relevant numbers or metrics? (users, revenue, growth, impact, etc.)",
          placeholder: "e.g., 10K users, $50K revenue, 5K waitlist, 3 years experience...",
        },
        {
          key: "wins",
          label: "Any notable wins or successes? (what worked well, what you're proud of)",
          placeholder: "Describe your wins...",
        },
        {
          key: "losses",
          label: "Any setbacks or failures that shaped you? (what you learned from)",
          placeholder: "Describe your setbacks and what you learned...",
        },
      ],
    },
    {
      number: 4,
      title: "Your audience (who you communicate with)",
      questions: [
        {
          key: "talkingTo",
          label: "Who is your primary audience? (describe 1–2 concrete personas)",
          placeholder: "e.g., Professionals in their 30s-40s who want to improve their workflow...",
        },
        {
          key: "strugglingWith",
          label: "What are they struggling with right now?",
          placeholder: "Describe their struggles...",
        },
        {
          key: "secretlyWant",
          label: "What do they secretly want but won't say out loud?",
          placeholder: "What do they really want?",
        },
        {
          key: "wantThemToDo",
          label: "What do you want them to do after engaging with your work? (take action, learn, connect, etc.)",
          placeholder: "e.g., Try the product, learn more, reach out...",
        },
      ],
    },
    {
      number: 5,
      title: "Your voice & communication style",
      questions: [
        {
          key: "howTalkOnline",
          label: "How do you communicate? (tone, style, formality, pacing, use of emojis, swearing, etc.)",
          placeholder: "e.g., Casual, professional, uses emojis, no swearing, conversational...",
        },
        {
          key: "adjacentCreators",
          label: "Who are 3 people or voices that feel similar to your style? (for reference only)",
          placeholder: "List 3 people or voices...",
        },
        {
          key: "hateInContent",
          label: "What do you dislike in communication or content? (e.g. fake energy, overpromising, clickbait)",
          placeholder: "What do you hate?",
        },
        {
          key: "speakingAs",
          label: 'Do you speak as "I", "we", or "you"? (and do you switch?)',
          placeholder: "e.g., Mostly 'I', sometimes 'we' when talking about the team...",
        },
      ],
    },
    {
      number: 6,
      title: "Beliefs & principles (your philosophy)",
      questions: [
        {
          key: "socialMedia",
          label: "What are your core beliefs about your field or industry?",
          placeholder: "Your beliefs about your field...",
        },
        {
          key: "buildingProducts",
          label: "What do you believe about building, creating, or problem-solving?",
          placeholder: "Your beliefs about building and creating...",
        },
        {
          key: "workLearning",
          label: "What are your beliefs about work, learning, creativity, money, or life?",
          placeholder: "Your beliefs...",
        },
        {
          key: "contrarianTakes",
          label: "Any strong contrarian takes or unconventional opinions you're comfortable sharing?",
          placeholder: "Your contrarian takes...",
        },
      ],
    },
    {
      number: 7,
      title: "Stories & moments",
      questions: [
        {
          key: "momentProvesCare",
          label: "A moment that proves you care deeply about this area.",
          placeholder: "Tell the story...",
        },
        {
          key: "helpedSomeone",
          label: "A time you helped someone (or yourself) achieve a real result.",
          placeholder: "Tell the story...",
        },
        {
          key: "failedAndChanged",
          label: "A time you failed and what changed after.",
          placeholder: "Tell the story...",
        },
        {
          key: "deepInCulture",
          label: "A moment that shows how deeply you understand or are involved in this field.",
          placeholder: "Tell the story...",
        },
      ],
    },
    {
      number: 8,
      title: "Project specifics (for context & calls to action)",
      questions: [
        {
          key: "whatDoesItDo",
          label: "What exactly does your project or work do in one sentence?",
          placeholder: "One sentence description...",
        },
        {
          key: "stage",
          label: "What stage is it in? (idea, development, beta, live, v2, etc.)",
          placeholder: "e.g., Beta, launching soon...",
        },
        {
          key: "oneAction",
          label: "What's the ONE action you want people to take? (try it, learn more, sign up, etc.)",
          placeholder: "e.g., Try the beta, learn more, sign up...",
        },
        {
          key: "nonNegotiablePhrases",
          label: 'Any non-negotiable phrases or positioning? (e.g. "for professionals", "not another X tool")',
          placeholder: "List your phrases...",
        },
      ],
    },
    {
      number: 9,
      title: "Preferences & boundaries (safety & brand)",
      questions: [
        {
          key: "neverFake",
          label: "Topics you never want to misrepresent or fake? (money, achievements, expertise, etc.)",
          placeholder: "List topics...",
        },
        {
          key: "avoidEntirely",
          label: "Topics you avoid entirely? (politics, controversial subjects, etc.)",
          placeholder: "List topics to avoid...",
        },
        {
          key: "okayWithFlexing",
          label: "Are you okay with sharing achievements if true? Or keep it humble?",
          placeholder: "e.g., Keep it humble, no bragging...",
        },
        {
          key: "neverUse",
          label: "Any words/phrases you never want used?",
          placeholder: "List words/phrases...",
        },
      ],
    },
    {
      number: 10,
      title: "Communication patterns you like (templates & styles)",
      questions: [
        {
          key: "hookFormulas",
          label: "List 3–5 opening patterns or hooks you like. (e.g. \"Most people mess this up…\", \"If you're X, this is for you\")",
          placeholder: "List your hook patterns...",
        },
        {
          key: "storytellingPatterns",
          label: "List 3–5 storytelling patterns you like. (e.g. \"then/now\", \"myth vs reality\", \"3 mistakes\")",
          placeholder: "List your storytelling patterns...",
        },
        {
          key: "recurringSeries",
          label: "Any recurring themes or series ideas? (\"Building X: Day N\", \"Weekly insights\", etc.)",
          placeholder: "List series or themes...",
        },
      ],
    },
  ];

  const currentSectionData = sections.find((s) => s.number === currentSection);
  const sectionKey = [
    "whoYouAre",
    "whyProduct",
    "proof",
    "targetAudience",
    "voiceStyle",
    "beliefs",
    "stories",
    "productSpecifics",
    "preferences",
    "contentPatterns",
  ][currentSection - 1] as keyof BackboardAnswers;

  if (isPending || !session?.user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-gray-300 border-t-black rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto py-12 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Backboard.io Onboarding</h1>
        <p className="text-gray-600">
          Help us understand your voice, style, and brand so we can repurpose your content perfectly.
        </p>
        <div className="mt-4 flex gap-2">
          {sections.map((section) => (
            <button
              key={section.number}
              onClick={() => setCurrentSection(section.number)}
              className={`px-3 py-1 rounded-full text-sm transition-all relative ${
                currentSection === section.number
                  ? "bg-black text-white shadow-[0_4px_0_0_rgba(0,0,0,0.5)] active:shadow-[0_2px_0_0_rgba(0,0,0,0.5)] active:translate-y-[2px]"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300 shadow-[0_4px_0_0_rgba(0,0,0,0.1)] hover:shadow-[0_4px_0_0_rgba(0,0,0,0.15)] active:shadow-[0_2px_0_0_rgba(0,0,0,0.15)] active:translate-y-[2px]"
              }`}
            >
              {section.number}
            </button>
          ))}
        </div>
      </div>

      {currentSectionData && (
        <div className="bg-white rounded-lg border border-gray-200 p-8 shadow-sm">
          <h2 className="text-2xl font-semibold mb-6">{currentSectionData.title}</h2>
          <div className="space-y-6">
            {currentSectionData.questions.map((question) => (
              <div key={question.key}>
                <label className="block text-sm font-medium mb-2 text-gray-700">
                  {question.label}
                </label>
                <textarea
                  value={(answers[sectionKey] as any)?.[question.key] || ""}
                  onChange={(e) => updateAnswer(sectionKey, question.key, e.target.value)}
                  placeholder={question.placeholder}
                  className="w-full p-3 border border-gray-300 rounded-lg text-black min-h-[100px] focus:outline-none focus:ring-2 focus:ring-black resize-y"
                  rows={4}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8 flex justify-between items-center">
        <button
          onClick={() => setCurrentSection(Math.max(1, currentSection - 1))}
          disabled={currentSection === 1}
          className="px-6 py-2 bg-gray-300 text-gray-700 rounded-full hover:bg-gray-400 transition-all relative shadow-[0_4px_0_0_rgba(0,0,0,0.2)] hover:shadow-[0_4px_0_0_rgba(0,0,0,0.25)] active:shadow-[0_2px_0_0_rgba(0,0,0,0.25)] active:translate-y-[2px] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-y-0"
        >
          Previous
        </button>
        <div className="flex gap-4">
          <button
            onClick={saveProfile}
            disabled={saving}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300 transition-all relative shadow-[0_4px_0_0_rgba(0,0,0,0.1)] hover:shadow-[0_4px_0_0_rgba(0,0,0,0.15)] active:shadow-[0_2px_0_0_rgba(0,0,0,0.15)] active:translate-y-[2px] disabled:opacity-50 disabled:shadow-none disabled:translate-y-0"
          >
            {saving ? "Saving..." : "Save Progress"}
          </button>
          {currentSection < 10 ? (
            <button
              onClick={() => setCurrentSection(Math.min(10, currentSection + 1))}
              className="px-6 py-2 bg-black text-white rounded-full hover:bg-gray-800 transition-all relative shadow-[0_4px_0_0_rgba(0,0,0,0.5)] active:shadow-[0_2px_0_0_rgba(0,0,0,0.5)] active:translate-y-[2px]"
            >
              Next
            </button>
          ) : (
            <button
              onClick={saveProfile}
              disabled={saving}
              className="px-6 py-2 bg-black text-white rounded-full hover:bg-gray-800 transition-all relative shadow-[0_4px_0_0_rgba(0,0,0,0.5)] active:shadow-[0_2px_0_0_rgba(0,0,0,0.5)] active:translate-y-[2px] disabled:opacity-50 disabled:shadow-none disabled:translate-y-0"
            >
              {saving ? "Saving..." : "Complete & Go to Dashboard"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
