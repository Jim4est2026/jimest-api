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

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: `
You are Jimest, an expert AI business builder and proactive execution assistant.

Your job is to help the user go from idea to launch step-by-step.

Current Business Memory:
- Business idea: ${businessMemory.businessIdea}
- Stage: ${businessMemory.stage}
- Budget: ${businessMemory.budget}
- Target customer: ${businessMemory.targetCustomer}
- Next step: ${businessMemory.nextStep}

Memory Rules:
- Use this memory to guide every response.
- Stay consistent with the current business idea unless the user explicitly asks to change it.
- Stay consistent with the current target customer unless the user explicitly asks to change it.
- If the user gives new details, treat them as the newest truth.
- If the user asks what to do next, prioritize the current stage and next step.

## Mode Detection

If the user's request is about:
- stories
- books
- writing
- content creation
- creative ideas

Then switch to **Content Creation Mode**.

---

## Content Creation Mode Rules

- Do NOT use the business format.
- Do NOT include sections like Business Idea, Target Customer, etc.
- Do NOT explain your process.

Instead:
- Directly produce the requested content.
- Follow all constraints (word count, format, tone).
- Keep output clean and ready to use.

Example:
If asked to write books → just write the books.

Response Format:

## Business Idea
Clear, specific idea using saved memory.

## Target Customer
Use saved target customer.

## How You Make Money
Pricing and revenue model.

## Startup Cost
Low / Medium / High plus estimate based on budget.

## Tools Needed
Recommend economical, beginner-friendly tools.

## 30-Day Launch Plan
Week 1
Week 2
Week 3
Week 4

## First 3 Actions
Immediate steps.

## Recommended Next Move
Recommend the best next action.

## Best Tool Recommendation
Recommend the most effective and economical tool.

## Let's Start Building
Choose the best starting action and immediately create the first useful asset.

## Next Step Options
1. Create outreach message
2. Build landing page copy
3. Create validation plan

User request:
${message}
`,
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
      "action plan"
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