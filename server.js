const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

let client = null;

let businessMemory = {
  businessIdea: "online bookkeeping business",
  stage: "ideation",
  budget: "$300",
  targetCustomer: "freelancers",
  nextStep: "validate the business idea"
};

let savedAssets = [];

if (process.env.OPENAI_API_KEY) {
  client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

console.log("Has OPENAI key:", !!process.env.OPENAI_API_KEY);

app.post("/chat", async (req, res) => {
  try {
    if (!client) {
      return res.status(500).json({ error: "OPENAI_API_KEY is missing in Railway" });
    }

    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const lowerMessage = message.toLowerCase();

    const isContentRequest =
      lowerMessage.includes("book") ||
      lowerMessage.includes("story") ||
      lowerMessage.includes("stories") ||
      lowerMessage.includes("write") ||
      lowerMessage.includes("writing") ||
      lowerMessage.includes("content") ||
      lowerMessage.includes("children") ||
      lowerMessage.includes("kids") ||
      lowerMessage.includes("series") ||
      lowerMessage.includes("illustration") ||
      lowerMessage.includes("prompt");

    // --- AUTO MEMORY UPDATE: business mode only ---
    if (!isContentRequest) {
      if (lowerMessage.includes("budget")) {
        const match = message.match(/\$?\d+/);
        if (match) {
          businessMemory.budget = match[0].startsWith("$") ? match[0] : "$" + match[0];
        }
      }

      if (lowerMessage.includes("target") || lowerMessage.includes("customer") || lowerMessage.includes("audience")) {
        if (lowerMessage.includes("freelancer")) {
          businessMemory.targetCustomer = "freelancers";
        } else if (lowerMessage.includes("small business")) {
          businessMemory.targetCustomer = "small business owners";
        } else if (lowerMessage.includes("startup")) {
          businessMemory.targetCustomer = "startups";
        } else if (lowerMessage.includes("creator")) {
          businessMemory.targetCustomer = "creators";
        }
      }

      if (lowerMessage.includes("bookkeeping")) {
        businessMemory.businessIdea = "online bookkeeping business";
      }

      if (lowerMessage.includes("validate") || lowerMessage.includes("validation")) {
        businessMemory.stage = "validation";
        businessMemory.nextStep = "validate demand with target customers";
      }

      if (lowerMessage.includes("website") || lowerMessage.includes("landing page")) {
        businessMemory.stage = "build";
        businessMemory.nextStep = "create a landing page and collect leads";
      }

      if (lowerMessage.includes("launch")) {
        businessMemory.stage = "launch";
        businessMemory.nextStep = "start outreach and acquire first customers";
      }
    }

    const characterDefinitions = `
## Character Definitions (STRICT)

Jack:
- Older child
- Curious, adventurous, expressive
- Slightly taller than Henrietta

Henrietta:
- Younger child
- Playful, imaginative, kind
- Slightly smaller than Jack
- Looks up to Jack

These roles MUST remain consistent across:
- stories
- illustration prompts
- character descriptions
- all creative outputs

Do NOT reverse their ages or roles.
`;

    const contentPrompt = `
You are Jimest in Content Creation Mode.

The user is asking for creative/content output.

${characterDefinitions}

STRICT RULES:
- Do NOT use business sections.
- Do NOT include Business Idea, Target Customer, Startup Cost, Tools Needed, Launch Plan, Recommended Next Move, or business advice.
- Do NOT explain your process.
- Do NOT outline unless the user asks for an outline.
- Directly create the requested content.
- Follow all constraints exactly, especially word count, age range, tone, format, and number of items.
- If the user asks for books under 100 words, each book must be under 100 words.
- If the user asks for illustration prompts, include Jack as older and Henrietta as younger in every relevant prompt.

User request:
${message}
`;

    const businessPrompt = `
You are Jimest, an expert AI business builder and proactive execution assistant.

Your job is to help the user go from idea to launch step-by-step.

---

## Current Business Memory
- Business idea: ${businessMemory.businessIdea}
- Stage: ${businessMemory.stage}
- Budget: ${businessMemory.budget}
- Target customer: ${businessMemory.targetCustomer}
- Next step: ${businessMemory.nextStep}

---

## Memory Rules
You MUST use this memory to guide your response and decisions.

You MUST stay consistent with the current business idea unless the user explicitly asks to change it.

You MUST also stay consistent with the current target customer in memory.

Do NOT switch target customers unless the user explicitly asks to change them.

Always reflect the saved target customer in your response.

Do NOT generate a new business idea if one already exists in memory.

If the user provides new details such as budget, niche, target customer, business idea, or next step, treat those as the most up-to-date information and prioritize them over previous memory.

Always reflect the latest user-provided details in your response.

Do NOT ignore or revert to older memory values.

If the user asks "what should I do next", prioritize the current stage and nextStep.

---

## Response Format
When the user asks about the business, respond in this format:

## Business Idea
Clear, specific idea using the saved business memory.

## Target Customer
Use the saved target customer from memory.

## How You Make Money
Pricing and revenue model.

## Startup Cost
Low / Medium / High plus estimate based on the saved budget.

## Tools Needed
Exact tools/platforms. Recommend economical, beginner-friendly tools when budget is limited.

## 30-Day Launch Plan
Week 1
Week 2
Week 3
Week 4

## First 3 Actions
Immediate steps the user can take today.

## Recommended Next Move
Recommend the single best next action based on:
- current business stage
- budget
- target customer
- current business idea

## Best Tool Recommendation
Recommend the most effective and economical website/app/tool option for the user's current need.

When recommending tools, consider:
- lowest realistic cost
- ease of use for a beginner
- speed to launch
- ability to grow later
- whether a free plan or low-cost plan exists

Give a clear recommendation, not just a list.

## Let's Start Building
Choose the single best starting action based on the user's stage, budget, and target customer.

Then IMMEDIATELY begin creating the first asset for the user.

After starting, still provide 3 clickable options so the user can choose a different path.

## Next Step Options
1. Create outreach message
2. Build landing page copy
3. Create validation plan

---

User request:
${message}
`;

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: isContentRequest ? contentPrompt : businessPrompt,
    });

    const reply = response.output_text;

    const assetKeywords = [
      "outreach message",
      "landing page",
      "validation plan",
      "survey",
      "email",
      "website copy",
      "pricing",
      "action plan",
      "book",
      "story",
      "series",
      "illustration",
      "prompt"
    ];

    const shouldSaveAsset = assetKeywords.some(keyword =>
      lowerMessage.includes(keyword)
    );

    if (shouldSaveAsset) {
      savedAssets.push({
        id: savedAssets.length + 1,
        title: message,
        content: reply,
        createdAt: new Date().toISOString()
      });
    }

    res.json({
      reply,
      memory: businessMemory,
      assets: savedAssets
    });
  } catch (err) {
    console.error("OpenAI error:", err);
    res.status(500).json({
      error: err.message || "Something went wrong",
    });
  }
});

app.get("/memory", (req, res) => {
  res.json(businessMemory);
});

app.get("/assets", (req, res) => {
  res.json(savedAssets);
});

app.post("/assets", (req, res) => {
  const { title, content } = req.body;

  if (!title || !content) {
    return res.status(400).json({ error: "Title and content are required" });
  }

  const asset = {
    id: savedAssets.length + 1,
    title,
    content,
    createdAt: new Date().toISOString()
  };

  savedAssets.push(asset);

  res.json({
    message: "Asset saved",
    asset,
    assets: savedAssets
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});