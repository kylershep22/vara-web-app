// routes/journalPrompt.js
import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { getAuth } from "firebase-admin/auth";
import OpenAI from "openai";

const OPENAI_API_KEY = defineSecret("OPENAI_API_KEY");

export const journalPrompt = onRequest(
  {
    region: "us-central1",
    cors: true,
    enforceAppCheck: true,     // turn off if you haven’t wired App Check yet
    secrets: [OPENAI_API_KEY],
    timeoutSeconds: 120
  },
  async (req, res) => {
    try {
      if (req.method !== "POST") {
        res.status(405).send("Method Not Allowed");
        return;
      }

      // Require Firebase Auth ID token (from the client)
      const authHeader = req.headers.authorization || "";
      const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
      if (!idToken) return res.status(401).json({ error: "Missing auth token" });
      await getAuth().verifyIdToken(idToken);

      const { prompt } = req.body || {};
      if (!prompt || typeof prompt !== "string") {
        return res.status(400).json({ error: "prompt (string) is required" });
      }

      const openai = new OpenAI({ apiKey: OPENAI_API_KEY.value() });

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini", // use your preferred model
        messages: [
          { role: "system", content: "You are a thoughtful journaling assistant." },
          { role: "user", content: prompt }
        ],
        temperature: 0.7
      });

      const text = response.choices?.[0]?.message?.content ?? "";
      res.json({ text, usage: response.usage ?? null });
    } catch (err) {
      console.error("journalPrompt error:", err);
      res.status(500).json({ error: "AI prompt failed" });
    }
  }
);

