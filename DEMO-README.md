# Script AI - Hackathon Demo Script

## 🎯 Demo Overview
**Product**: Script AI - AI-powered video script personalization  
**Duration**: 3 minutes  
**Focus**: Script personalizing + Chat + Backboard.io integration

---

## 📋 Pre-Demo Setup
- [ ] App running at `http://localhost:3000`
- [ ] Sample video ready (30-60 seconds)
- [ ] Pre-filled profile answers ready to paste
- [ ] Clear cookies or use incognito

---

## 🎬 3-Minute Demo Script

### **[0:00 - 0:20] Hook & Problem**

> "Ever watch a YouTube video with great advice, but it's not for you? Finance when you're in tech? Harvard when you're at Queens?"
>
> "**Script AI** personalizes any video script to YOUR background automatically."

**[Action]**: Show landing page.

---

### **[0:20 - 1:10] Profile Creation**

> "First, we build your profile with 10 questions about your background, field, voice, and audience."

**[Action]**: Click "Get Started", quickly fill 2-3 sections:
- **Bio**: "22, Toronto, CS student at Queens"
- **Field**: "Software engineering and AI"
- **Voice**: "Casual, uses tech analogies"

> "Here's where **Backboard.io** comes in. We use their **vector database** to store your profile as **semantic memory chunks**—one per section. This enables **hybrid search** (BM25 + vector embeddings) to retrieve ONLY relevant context later."

**[Action]**: Click "Complete Onboarding"

---

### **[1:10 - 2:10] Video Personalization**

> "Now let's upload a video about landing a finance internship at McGill."

**[Action]**: Upload video, wait for processing

> "We transcribe with **OpenAI Whisper**, then use **Backboard.io's RAG** to personalize each line."

**[Action]**: Show side-by-side comparison

| Original | Personalized |
|----------|--------------|
| "finance student at McGill" | "CS student at Queens" |
| "consulting internship" | "software engineering internship" |

> "For each line, Backboard.io:"
> 1. "Creates a **thread** for this video"
> 2. "Does **semantic search** across my memory chunks"
> 3. "Retrieves only relevant sections (e.g., 'WHO YOU ARE')"
> 4. "LLM repurposes with precise context"
>
> "Way more efficient than dumping the entire profile into every prompt."

---

### **[2:10 - 2:50] Chat Feature**

> "Want to refine? Use our **chat feature**."

**[Action]**: Click a line, type: "Make this more casual"

> "The system can **learn from your edits**—if it detects a reusable preference, it stores it as a **new memory** in Backboard.io. Next video, it remembers you prefer casual tone."

---

### **[2:50 - 3:00] Closing**

> "To recap: Profile → **Backboard.io vector DB** → Upload video → **RAG-powered personalization** → Chat to refine → **System learns**."
>
> "Backboard.io gave us production-ready RAG infrastructure—semantic search, memory management, and persistent learning—out of the box. Thanks!"

---

## 🎤 Quick Q&A Answers

**Q: Why Backboard.io?**
> "Saved weeks of dev. We'd need to build vector DB, embeddings, chunking, search, and memory management. Their SDK gave us hybrid search (BM25 + vector) in a few API calls."

**Q: How accurate?**
> "Very—RAG retrieves only relevant context. If a line mentions education, it pulls 'WHO YOU ARE' memory, not 'YOUR AUDIENCE.'"

---

## 🛠️ Tech Stack (If Asked)
- **Frontend**: Next.js 14
- **Database**: PostgreSQL + Drizzle ORM
- **Transcription**: OpenAI Whisper
- **RAG/Vector DB**: Backboard.io SDK
- **LLM**: GPT-4o via Backboard.io

### Backboard.io Integration:
- `getOrCreateAssistant()` - One assistant per user
- `indexBackboardProfile()` - Chunks profile into 10 memories
- `repurposeScriptWithRAG()` - RAG with `memory: readonly` mode
- Memory IDs tracked for cleanup on profile updates

---

## 🚀 Backup Plan
- **Video fails**: Show screenshots of before/after
- **API issues**: Explain fallback (local prompting)
- **Chat breaks**: Focus on core personalization

---

Good luck! 🎉
