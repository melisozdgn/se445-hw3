
# SE445 HW3 – Logic & Intelligent Processing
## Lead Capture with Validation + AI Classification — SE 445 Prompt Engineering

---

## Overview
This project enhances the HW2 pipeline with two additional intelligence layers:
1. **Validation** — checks all fields for presence and correct email format; flags leads as Valid/Invalid
2. **AI Classification** — uses an LLM to analyze the message and output Intent + Urgency

Every lead (valid or invalid) is saved to Google Sheets with a full 7-column record.

---

## Architecture
```
HTTP POST /lead
    ↓
[1] Validate Lead Fields  (Function Node)
    → checks name, email format, message
    → sets status = "Valid" | "Invalid"
    ↓
[2] AI – Classify Intent & Urgency  (LLM Node)
    → analyzes message field
    → returns intent: Sales|Support|Partnership|General
    → returns urgency: High|Medium|Low
    ↓
[3] Save Full Record to Google Sheets  (Connector Node)
    → appends 7-column row: name, email, message, timestamp, status, intent, urgency
    ↓
[4] Return Enriched Response  (HTTP Response Node)
    → 200 OK with { success, status, intent, urgency, errors }
```

---

## Prerequisites
- Google Antigravity account
- Google Sheet with headers in row 1:
  `Name | Email | Message | Timestamp | Status | Intent | Urgency`
- LLM API key configured in Antigravity (Settings → AI Models)

---

## Setup Instructions

### 1. Import the Workflow
1. Open Antigravity → Workflows → Import
2. Upload `workflow/hw3_workflow.json`

### 2. Configure Google Sheets Connector
1. Click **Save Full Record to Google Sheets** node
2. Connect your Google account via OAuth2
3. Set `spreadsheetId` to your sheet's ID
4. Confirm `sheetName` = `Leads`

### 3. Configure LLM (AI Node)
1. Click **AI – Classify Intent & Urgency** node
2. Select model: `gpt-4o-mini` (or your preferred model)
3. The system and user prompts are pre-filled from the workflow JSON
4. Temperature is set to 0.2 for consistent classification

### 4. Activate & Test
Click **Activate Workflow**, then run the tests below.

---

## Test Cases

### Test 1 – Valid lead, Sales + High urgency
```bash
curl -X POST https://YOUR_ENDPOINT/lead \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_KEY" \
  -d '{"name":"Jane Doe","email":"jane@example.com","message":"We need the enterprise plan before Friday for our board presentation."}'
```
Expected: `{ "status": "Valid", "intent": "Sales", "urgency": "High" }`

### Test 2 – Invalid email format
```bash
curl -X POST https://YOUR_ENDPOINT/lead \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_KEY" \
  -d '{"name":"Bob","email":"bob-at-example.com","message":"Partnership inquiry"}'
```
Expected: `{ "status": "Invalid", "intent": "Partnership", "urgency": "Medium" }`
Lead IS saved to Sheet with Status = Invalid.

### Test 3 – Missing email
```bash
curl -X POST https://YOUR_ENDPOINT/lead \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_KEY" \
  -d '{"name":"Alice","message":"API stopped working urgently!"}'
```
Expected: `{ "status": "Invalid", "intent": "Support", "urgency": "High" }`

### Test 4 – Empty body
```bash
curl -X POST https://YOUR_ENDPOINT/lead \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_KEY" \
  -d '{}'
```
Expected: `{ "status": "Invalid", "intent": "General", "urgency": "Low" }`

---

## Google Sheet Schema (7 columns)
| Col | Header    | Source                    | Allowed Values                          |
|-----|-----------|---------------------------|-----------------------------------------|
| A   | Name      | body.name                 | Any string                              |
| B   | Email     | body.email                | Any string (may be malformed)           |
| C   | Message   | body.message              | Any string                              |
| D   | Timestamp | Server ($now)             | ISO 8601 datetime                       |
| E   | Status    | validateLead.status       | Valid \| Invalid                        |
| F   | Intent    | classifyLead.intent       | Sales \| Support \| Partnership \| General |
| G   | Urgency   | classifyLead.urgency      | High \| Medium \| Low                   |

---

## AI Prompt Strategy
- **System prompt**: defines label sets explicitly, forces JSON-only output, sets default fallback
- **User prompt**: dynamically injects name + message per request
- **Temperature**: 0.2 → deterministic classification
- **max_tokens**: 60 → prevents verbose responses
- **response_format**: json_object → safe JSON.parse()
- **Fallback**: if parse fails → intent="General", urgency="Low"

