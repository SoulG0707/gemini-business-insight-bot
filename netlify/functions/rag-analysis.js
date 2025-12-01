// File: netlify/functions/rag-analysis.js
// Đọc JSON tự động + xử lý AI

const fs = require("fs");
const path = require("path");
const { GoogleGenAI } = require("@google/genai");

// Lấy API Key từ Netlify
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// Hàm load data.json
function loadBusinessData() {
  try {
    const filePath = path.join(__dirname, "data.json");
    const raw = fs.readFileSync(filePath, "utf8");
    const rows = JSON.parse(raw);

    // Convert JSON → text cho Gemini
    let text = "[START BUSINESS DATA LOGS]\n";
    text += "## AUTO-GENERATED MARKETING LOGS ##\n\n";

    rows.forEach((item, idx) => {
      text += `- Email #${idx + 1}\n`;
      text += `  - Subject: "${item["Subject"]}"\n`;
      text += `  - Responsible: ${item["Responsible"]}\n`;
      text += `  - Sent: ${item["Sent"]}\n`;
      text += `  - Received Ratio: ${item["Received Ratio"]}%\n`;
      text += `  - Opened Ratio: ${item["Opened Ratio"]}%\n`;
      text += `  - Click Ratio: ${item["Number of Clicks"]}%\n`;
      text += `  - Replied Ratio: ${item["Replied Ratio"]}%\n`;
      text += `  - Status: ${item["Status"]}\n\n`;
    });

    text += "[END BUSINESS DATA LOGS]\n";

    return text;
  } catch (err) {
    console.error("Lỗi đọc data.json:", err);
    return "[START BUSINESS DATA LOGS]\n(No data loaded)\n[END BUSINESS DATA LOGS]";
  }
}

// Load data.json mỗi lần function được gọi
const BUSINESS_DATA = loadBusinessData();

exports.handler = async (event) => {
  // CORS
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: "",
    };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { user_query } = JSON.parse(event.body || "{}");

    const system_prompt = `
You are a Senior Business Analyst. You analyze marketing email logs and extract insights. 
Use only the provided data. Provide trends, root-cause analysis, and actionable suggestions.
    `.trim();

    const full_prompt = `${system_prompt}\n\n${BUSINESS_DATA}\n\nUser Question: ${user_query}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: full_prompt,
      config: { temperature: 0.2 },
    });

    const bot_answer = response.text().trim();

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
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ error: "Gemini API Error" }),
    };
  }
};
