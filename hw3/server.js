/**
 * HW3 – Lead Capture + Validation + AI Classification — Local Test Server
 * -----------------------------------------------------------------------
 * POST /lead  (requires x-api-key header)
 *
 * Pipeline:
 *   1. Validate Lead Fields   (name, email, message)
 *   2. AI – Classify Intent & Urgency  (OpenAI gpt-4o-mini)
 *   3. Save Full Record to Google Sheets (7 columns)
 *   4. Return Enriched Response
 *
 * Prerequisites:
 *   - credentials.json  (Google Service Account key)
 *   - OPENAI_API_KEY     (environment variable or .env)
 */

const express = require("express");
const { google } = require("googleapis");
const { OpenAI } = require("openai");
const path = require("path");
const crypto = require("crypto");

// ─── Configuration ──────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY || crypto.randomBytes(24).toString("hex");
const SPREADSHEET_ID = "1-8ymgdlvWunxenAQmPzSHT3EKkQME3Jhf8in9siL_JY";
const SHEET_NAME = "Leads_HW3";
const CREDENTIALS_PATH = path.join(__dirname, "credentials.json");

// ─── Google Sheets Auth ─────────────────────────────────────────────────────
let sheetsClient;

async function initSheets() {
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: CREDENTIALS_PATH,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    const authClient = await auth.getClient();
    sheetsClient = google.sheets({ version: "v4", auth: authClient });
    console.log("✅  Google Sheets API authenticated");
  } catch (err) {
    console.error("⚠️  Google Sheets auth failed:", err.message);
    console.error("   Place your Service Account credentials.json in the project root.");
  }
}

// ─── Mock AI Client (no OpenAI key needed) ─────────────────────────────────
const MOCK_AI_RESPONSE = { intent: "Sales", urgency: "High" };

function initOpenAI() {
  console.log("🤖  AI Classification: running in MOCK mode (Sales / High)");
}

// ─── Node 1: Validate Lead Fields ──────────────────────────────────────────
function validateLead(body) {
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim();
  const message = String(body.message || "").trim();
  const errors = [];

  if (!name) errors.push("Missing field: name");
  if (!email) errors.push("Missing field: email");

  const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
  if (email && !EMAIL_REGEX.test(email)) {
    errors.push(`Invalid email format: "${email}"`);
  }
  if (!message) errors.push("Missing field: message");

  const status = errors.length === 0 ? "Valid" : "Invalid";

  return {
    name,
    email,
    message,
    status,
    validationErrors: errors,
    validationErrorStr: errors.join("; ") || "None",
    isValid: status === "Valid",
  };
}

// ─── Node 2: AI – Classify Intent & Urgency ────────────────────────────────
const SYSTEM_PROMPT = `You are a lead classification assistant for a B2B SaaS company.
Your task is to analyze incoming lead messages and classify them across two dimensions.

INTENT — Choose EXACTLY ONE:
  - Sales: pricing, plans, purchasing
  - Support: technical issue, bug, product help
  - Partnership: collaborate, integrate, reseller
  - General: does not fit any of the above

URGENCY — Choose EXACTLY ONE:
  - High: urgent language, hard deadlines, critical failures
  - Medium: actionable but not time-sensitive
  - Low: exploratory, informational

CONSTRAINTS:
  - Respond ONLY with valid JSON. No explanation. No markdown.
  - Default: {"intent":"General","urgency":"Low"}

Output: {"intent": "...", "urgency": "..."}`;

async function classifyLead(validated) {
  // ── MOCK MODE: returns fixed Sales/High for testing ──────────────────────
  console.log("   🤖  [MOCK] Skipping real OpenAI call.");
  console.log(`   🤖  Input → Name: "${validated.name}" | Message: "${validated.message}"`);
  console.log("   🤖  Mock response:", JSON.stringify(MOCK_AI_RESPONSE));
  return { ...MOCK_AI_RESPONSE };
}

// ─── Node 3: Save to Google Sheets ─────────────────────────────────────────
async function saveToSheets(validated, classification) {
  const timestamp = new Date().toISOString();
  const row = [
    validated.name,
    validated.email,
    validated.message,
    timestamp,
    validated.status,
    classification.intent,
    classification.urgency,
  ];

  if (!sheetsClient) {
    console.log("   ⚠️  Sheets not connected – row would be:", JSON.stringify(row));
    return { appended: false, row };
  }

  try {
    await sheetsClient.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:G`,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [row] },
    });
    console.log("   ✅  Row appended to Google Sheets");
    return { appended: true, row };
  } catch (err) {
    console.error("   ⚠️  Sheets append error:", err.message);
    return { appended: false, row, error: err.message };
  }
}

// ─── Express App ────────────────────────────────────────────────────────────
const app = express();
app.use(express.json());

// API Key middleware
app.use("/lead", (req, res, next) => {
  const key = req.headers["x-api-key"];
  if (!key || key !== API_KEY) {
    return res.status(401).json({ error: "Unauthorized – invalid or missing x-api-key" });
  }
  next();
});

// POST /lead – main workflow endpoint
app.post("/lead", async (req, res) => {
  console.log("\n─── Incoming POST /lead ───");
  console.log("   Body:", JSON.stringify(req.body));

  // Step 1: Validate
  const validated = validateLead(req.body);
  console.log("   [1] Validation:", validated.status, validated.validationErrorStr);

  // Step 2: AI Classification
  console.log("   [2] AI Classification...");
  const classification = await classifyLead(validated);
  console.log("   [2] Result:", JSON.stringify(classification));

  // Step 3: Save to Google Sheets
  console.log("   [3] Saving to Google Sheets...");
  const sheetResult = await saveToSheets(validated, classification);

  // Step 4: Return enriched response
  const response = {
    success: true,
    status: validated.status,
    intent: classification.intent,
    urgency: classification.urgency,
    errors: validated.validationErrorStr,
  };

  console.log("   [4] Response:", JSON.stringify(response));
  res.status(200).json(response);
});

// Health check
app.get("/", (req, res) => {
  res.json({
    workflow: "HW3 – Lead Capture + Validation + AI Classification",
    status: "active",
    endpoint: "POST /lead",
    requiresHeader: "x-api-key",
  });
});

// ─── Start Server ───────────────────────────────────────────────────────────
async function start() {
  initOpenAI();
  await initSheets();

  app.listen(PORT, () => {
    console.log("\n══════════════════════════════════════════════════════════");
    console.log("  HW3 – Lead Capture + Validation + AI Classification");
    console.log("  Workflow Status: ✅ ACTIVE");
    console.log("══════════════════════════════════════════════════════════");
    console.log(`  Endpoint URL:  http://localhost:${PORT}/lead`);
    console.log(`  Method:        POST`);
    console.log(`  x-api-key:     ${API_KEY}`);
    console.log(`  Spreadsheet:   ${SPREADSHEET_ID}`);
    console.log(`  Sheet:         ${SHEET_NAME}`);
    console.log("══════════════════════════════════════════════════════════\n");
  });
}

start();
