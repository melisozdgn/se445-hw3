/**
 * HW3 – classifyLead.js
 * Antigravity LLM Node — Step 2: AI Classification
 *
 * Purpose  : Call an LLM to classify the lead message into:
 *              - Intent  : Sales | Support | Partnership | General
 *              - Urgency : High  | Medium  | Low
 *
 *            This step runs for ALL leads (valid AND invalid).
 *            If the message is empty or the LLM fails, safe defaults are used.
 *
 * Input    : validateLead.name, validateLead.message  (from previous node)
 * Output   : { intent, urgency }
 */

// ── Retrieve data from previous node ──────────────────────────────────────
const name    = input.validateLead?.name    || "";
const message = input.validateLead?.message || "";

// ── System Prompt ──────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are a lead classification assistant for a B2B SaaS company.
Your task is to analyze incoming lead messages and classify them across two dimensions.

INTENT — Choose EXACTLY ONE from this list:
  - Sales       : The lead asks about pricing, plans, purchasing, or upgrading
  - Support     : The lead reports a technical issue, bug, or needs product help
  - Partnership : The lead wants to collaborate, integrate, or become a reseller
  - General     : The message does not clearly fit any of the above

URGENCY — Choose EXACTLY ONE from this list:
  - High   : The message contains urgent language, hard deadlines, or critical failures
  - Medium : The message is actionable but not immediately time-sensitive
  - Low    : The message is exploratory, informational, or shows no time pressure

CONSTRAINTS:
  - Respond ONLY with a valid JSON object. No explanation. No markdown. No preamble.
  - If you are uncertain, use "General" for intent and "Low" for urgency.
  - Base your classification entirely on the message content.

Output format (exactly):
{"intent": "Sales|Support|Partnership|General", "urgency": "High|Medium|Low"}`;

// ── User Prompt (dynamic) ──────────────────────────────────────────────────
const USER_PROMPT = message.trim()
  ? `Classify the following lead message:\n\nName: ${name}\nMessage: ${message}\n\nReturn JSON only.`
  : `The message field is empty. Return the default classification JSON only.`;

// ── Call the LLM via Antigravity ───────────────────────────────────────────
const response = await antigravity.llm({
  model: "gpt-4o-mini",          // fast + cost-efficient; swap to gpt-4o for higher accuracy
  messages: [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user",   content: USER_PROMPT   }
  ],
  temperature: 0.2,              // low temperature → more deterministic label selection
  max_tokens: 60,                // {"intent":"...","urgency":"..."} is always <60 tokens
  response_format: { type: "json_object" }  // force JSON mode
});

// ── Safe defaults ──────────────────────────────────────────────────────────
const VALID_INTENTS   = ["Sales", "Support", "Partnership", "General"];
const VALID_URGENCIES = ["High", "Medium", "Low"];

let intent  = "General";
let urgency = "Low";

// ── Parse and validate the LLM response ───────────────────────────────────
try {
  const raw    = response?.content || response?.choices?.[0]?.message?.content || "{}";
  const parsed = JSON.parse(raw);

  if (VALID_INTENTS.includes(parsed.intent))     intent  = parsed.intent;
  if (VALID_URGENCIES.includes(parsed.urgency))  urgency = parsed.urgency;
} catch (err) {
  // LLM returned non-JSON or timed out — use safe defaults
  console.warn("[classifyLead] AI parse error, using defaults:", err.message);
}

// ── Return classification result ──────────────────────────────────────────
return { intent, urgency };
