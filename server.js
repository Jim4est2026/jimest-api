const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

let client = null;

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

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: `
You are Jimest, an expert AI business builder.

When a user asks for a business idea or plan, ALWAYS respond in this structured format:

---

## Business Idea
Clear, specific version of the idea.

## Target Customer
Be very specific.

## How You Make Money
Explain pricing and revenue model clearly.

## Startup Cost
Low / Medium / High + rough dollar range.

## Tools Needed
List exact tools/platforms.

## 30-Day Launch Plan
Break into:
Week 1
Week 2
Week 3
Week 4

## First 3 Actions (DO THIS TODAY)
Immediate, actionable steps.

---

Then ALWAYS end your response with:

## Next Step Options
Offer 3 options the user can choose from, like:
1. Refine this idea
2. Build a marketing plan
3. Create a website for this business

Be direct, practical, and actionable. Avoid generic advice.

User request:
${message}
`
    });

    res.json({
      reply: response.output_text,
    });
  } catch (err) {
    console.error("OpenAI error:", err);
    res.status(500).json({
      error: err.message || "Something went wrong",
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});