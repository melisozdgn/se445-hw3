/**
 * HW3 – validateLead.js
 * Antigravity Function Node — Step 1: Validation
 *
 * Purpose  : Verify all required fields are present and correctly formatted.
 *            Tag the lead as "Valid" or "Invalid".
 *            NEVER discard a lead — even invalid ones are passed downstream.
 *
 * Input    : input.body  → raw JSON body from the HTTP Trigger
 * Output   : { name, email, message, status, validationErrors[], isValid }
 *
 * Validation Rules:
 *   Rule 1 – name must be present (non-empty string)
 *   Rule 2 – email must be present (non-empty string)
 *   Rule 3 – email must match RFC 5322-lite format
 *   Rule 4 – message must be present (non-empty string)
 */

const body = input.body || {};

// ── 1. Extract and trim all fields ────────────────────────────────────────
const name    = String(body.name    || "").trim();
const email   = String(body.email   || "").trim();
const message = String(body.message || "").trim();

// ── 2. Collect all errors (run ALL checks regardless of earlier failures) ──
const errors = [];

// Rule 1 – name presence
if (!name) {
  errors.push("Missing field: name");
}

// Rule 2 – email presence
if (!email) {
  errors.push("Missing field: email");
}

// Rule 3 – email format (only checked if email is present)
// Pattern: at least one char before @, a domain after @, a dot with 2+ chars TLD
const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
if (email && !EMAIL_REGEX.test(email)) {
  errors.push(`Invalid email format: "${email}"`);
}

// Rule 4 – message presence
if (!message) {
  errors.push("Missing field: message");
}

// ── 3. Determine status flag ───────────────────────────────────────────────
const status  = errors.length === 0 ? "Valid" : "Invalid";
const isValid = status === "Valid";

// ── 4. Return enriched payload (always – never stop the pipeline) ──────────
return {
  name,
  email,
  message,
  status,                            // "Valid" | "Invalid"  → written to Sheet col E
  validationErrors: errors,          // array of strings (for logging)
  validationErrorStr: errors.join("; ") || "None",
  isValid                            // boolean shortcut for downstream nodes
};
