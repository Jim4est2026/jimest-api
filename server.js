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

When a user asks about a business idea, ALWAYS respond with a structured business plan including:

1. Business Idea Overview
2. Target Market
3. Revenue Model
4. Startup Costs (low/medium/high)
5. Tools & Platforms Needed
6. Step-by-Step 30-Day Launch Plan
7. First 3 Actions to Take Today

Be practical, actionable, and clear. Avoid fluff.

User request:
${message}
`,
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