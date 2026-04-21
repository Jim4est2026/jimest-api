const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Simple API key middleware
const API_KEY = process.env.API_KEY || "testkey123";

function auth(req, res, next) {
  const header = req.headers["authorization"];
  if (!header || header !== `Bearer ${API_KEY}`) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
  next();
}

// In-memory storage
let leads = [];
let followups = [];

// Save Lead
app.post("/api/leads", auth, (req, res) => {
  const lead = {
    id: Date.now().toString(),
    ...req.body,
  };

  leads.push(lead);

  res.json({
    success: true,
    leadId: lead.id,
    message: "Lead saved successfully",
  });
});

// Draft Outreach
app.post("/api/outreach/draft", auth, (req, res) => {
  const { targetName, purpose } = req.body;

  const messageDraft = `Hi ${targetName}, I wanted to reach out regarding ${purpose}. Let me know if you're open to chatting!`;

  res.json({
    success: true,
    messageDraft,
  });
});

// Schedule Follow-up
app.post("/api/followups", auth, (req, res) => {
  const followup = {
    id: Date.now().toString(),
    ...req.body,
  };

  followups.push(followup);

  res.json({
    success: true,
    followupId: followup.id,
    message: "Follow-up scheduled",
  });
});

// Daily Summary
app.get("/api/summary/daily", auth, (req, res) => {
  res.json({
    success: true,
    date: new Date().toISOString().split("T")[0],
    newLeads: leads.length,
    followupsDue: followups.length,
    bookedJobs: 0,
    notes: ["System running"],
  });
});

// Health check
app.get("/", (req, res) => {
  res.send("Jimest API is running");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});