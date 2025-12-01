// File: netlify/functions/rag-analysis.js
// ==========================================
// 1. IMPORTS
// ==========================================
const { GoogleGenAI } = require("@google/genai");
const ai = new GoogleGenAI({});
const fs = require("fs");
const path = require("path");

// ==========================================
// 2. LOAD JSON DATA (Netlify-compatible)
// ==========================================

const jsonPath = path.resolve("data.json");

// Đọc JSON static (được commit lên GitHub, Netlify đọc được)
let records = [];

try {
  const raw = fs.readFileSync(jsonPath, "utf8");
  records = JSON.parse(raw);
} catch (err) {
  console.error("Lỗi đọc data.json:", err);
  records = []; // fallback
}
// ==========================================
// 3. NETLIFY HANDLER
// ==========================================
exports.handler = async (event) => {
  // CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "86400",
      },
      body: "",
    };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { user_query } = JSON.parse(event.body);

    // SYSTEM PROMPT
    const system_prompt = `
You are a Senior Business Analyst.
Analyze provided business logs (auto-generated from Mass Mailing Excel data).
Provide strategic insights, trends, anomalies, and recommendations.
Base your answer ONLY on the dataset.
`.trim();

    const full_prompt = `${system_prompt}\n\n${BUSINESS_DATA}\n\nQuestion: ${user_query}`;

    // CALL GEMINI
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: full_prompt,
      config: { temperature: 0.2 },
    });

    const bot_answer = response.text.trim();

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ answer: bot_answer }),
    };
  } catch (error) {
    console.error("Gemini Error:", error);

    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        error: "AI Internal Error. Check GEMINI_API_KEY or file structure.",
      }),
    };
  }
};
