# Legacy API Prober to SDK Generator (TypeScript Demo)

This repo demonstrates an **API probing tool** that can integrate with brittle legacy APIs where:
- **Docs are wrong or incomplete**
- APIs differ across **versions**
- Customers have **custom configurations** (auth headers, tokens, 2FA/OAuth, JSON vs XML)
- Some tasks require **multi-step flows** (e.g., call a GET template endpoint before creating an order)

The prober:
1. “Researches” available documentation (simulated by reading docs files)
2. Receives a list of **business actions** (create/read orders, read/post invoices)
3. Determines whether it needs **read vs write** access
4. Uses **OpenAI** to try plausible variants
5. **Validates** success by reading the created resource back and checking fields
6. Writes a clean **agent reasoning log** JSON file you can show in a demo
7. Outputs a callable **TypeScript SDK** that supports multiple versions/customers

---

## What this demo includes

### Dummy Legacy APIs (Express)
- `v1` (docs correct): JSON, POST create order, `commodity_code_id`, no template step
- `v2` (docs intentionally wrong): actual behavior requires XML + PUT + `commodity_code_id` + template step, plus different auth requirements

### Customers
- `customer_a` on v1 (token-based)
- `customer_b` on v2 (oauth + 2FA + special header)

---

## Quickstart

### 0) Prereqs
- Node.js 18+ recommended

### 1) Install
```bash
npm install
export OPENAI_API_KEY="YOUR_KEY"
```
Start the dummy legacy servers (Terminal 1)
```bash
npm run dev:servers
```
<img width="479" height="127" alt="image" src="https://github.com/user-attachments/assets/8c1002c7-3de2-4fdb-8c3f-369ad9eacd42" />

Run the prober + generate outputs (Terminal 2)
```bash
npm run probe
```
The agent:
1. Reads documentation
2. Propose/try variants (JSON/XML, POST/PUT, param name variants)
3. Detects prerequisite GET /order-template for v2
4. Validates by readback
5. Writes reasoning logs
6. Generates generated/sdk.ts

<img width="424" height="81" alt="Screenshot 2026-03-02 at 7 02 10 PM" src="https://github.com/user-attachments/assets/ef6d5160-e745-4ec6-9fb2-94c0165010e9" />
Agent reads both legacy API documentation files before starting the probe

<img width="805" height="471" alt="Screenshot 2026-03-02 at 7 02 27 PM" src="https://github.com/user-attachments/assets/c5c0c932-70c3-4eb7-aeef-6f8255545b52" />
Agent probes customer_b (v1), uses LLM hints, tries a create-order call, and successfully discovers the correct API contract

<img width="813" height="473" alt="Screenshot 2026-03-02 at 7 03 06 PM" src="https://github.com/user-attachments/assets/4ae540e6-2ff2-4332-9e3e-c6e330451534" />
Agent probes customer_a (v1) and confirms the documented API works as expected

<img width="792" height="916" alt="Screenshot 2026-03-02 at 7 03 33 PM" src="https://github.com/user-attachments/assets/e20b8343-f4dd-4702-b1a9-b9bbc4b89361" />
Agent simulates a customer upgrade to v2, tries multiple API variants, finds the correct XML + PUT contract, validates it, and generates an SDK

```bash
Run the command after closing servers
npm test
```
<img width="978" height="141" alt="Screenshot 2026-03-02 at 7 15 44 PM" src="https://github.com/user-attachments/assets/d76f28d9-8372-4bed-8c4b-494b87365cc4" />
All automated tests pass, verifying that the agent correctly adapts to both documented (v1) and incorrectly documented (v2) API versions.
