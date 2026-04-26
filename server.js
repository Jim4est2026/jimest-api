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

    // --- AUTO MEMORY UPDATE ---
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

Example:
"For your $300 budget, I recommend starting with Carrd for a simple landing page because it is low-cost, beginner-friendly, and fast to launch."

## Let's Start Building
Choose ONE recommended action and briefly explain why it is the best starting point.

Then present 3 actionable things Jimest can create immediately.

Make it feel like you are ready to execute, not just suggest.

Example tone:
"The best place to start is outreach validation. I can create your first outreach message now."

## Next Step Options
1. Create the first outreach message
2. Draft the landing page copy
3. Build a 7-day validation plan

---

User request:
${message}
`,
    });

    res.json({
      reply: response.output_text,
      memory: businessMemory
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});