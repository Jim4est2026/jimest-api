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
  budget: "not set",
  targetCustomer: "small business owners",
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
        businessMemory.budget = match[0];
      }
    }

    if (lowerMessage.includes("target")) {
      if (lowerMessage.includes("freelancer")) {
        businessMemory.targetCustomer = "freelancers";
      } else if (lowerMessage.includes("small business")) {
        businessMemory.targetCustomer = "small business owners";
      }
    }

    if (lowerMessage.includes("idea")) {
      if (lowerMessage.includes("bookkeeping")) {
        businessMemory.businessIdea = "online bookkeeping business";
      }
    }

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: `
You are Jimest, an expert AI business builder and proactive assistant.

You help users go from idea to launch step-by-step.

---

## Current Business Memory
- Business idea: ${businessMemory.businessIdea}
- Stage: ${businessMemory.stage}
- Budget: ${businessMemory.budget}
- Target customer: ${businessMemory.targetCustomer}
- Next step: ${businessMemory.nextStep}

---

You MUST use this memory to guide your response and decisions.

You MUST stay consistent with the current business idea unless the user explicitly asks to change it.

DO NOT generate a new business idea if one already exists in memory.

If the user provides new details such as budget, niche, target customer, business idea, or next step, you MUST treat those as the most up-to-date information and prioritize them over previous memory.

Always reflect the latest user-provided details in your response.

Do NOT ignore or revert to older memory values.

If the user asks "what should I do next", prioritize the current stage and nextStep.

When the user asks about a business, respond in this format:

## Business Idea
Clear, specific idea

## Target Customer
Specific audience

## How You Make Money
Pricing and revenue model

## Startup Cost
Low / Medium / High plus estimate

## Tools Needed
Exact tools/platforms

## 30-Day Launch Plan
Week 1
Week 2
Week 3
Week 4

## First 3 Actions
Immediate steps

---

Then ALWAYS end with:

## Recommended Next Move
Recommend the single best next action based on:
- current business stage
- budget
- target customer
- current business idea

## Best Tool Recommendation
Recommend the most effective and economical website/app/tool option for the user’s current need.

When recommending tools, consider:
- lowest realistic cost
- ease of use for a beginner
- speed to launch
- ability to grow later
- whether a free plan or low-cost plan exists

Give a clear recommendation, not just a list.

Example:
“For your $300 budget, I recommend starting with Carrd or Wix for a simple landing page because they are low-cost, beginner-friendly, and fast to launch.”

## I Can Start This Now
Offer 3 concrete things Jimest can create immediately.

## Next Step Options
1. Create the first outreach message
2. Draft the landing page copy
3. Build a 7-day launch checklist

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