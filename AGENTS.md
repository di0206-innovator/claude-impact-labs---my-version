# AGENTS.md — Master Autonomous Agent Operating System & Harnessing Rules

> **Rasta Hisaab 2.0 (रास्ता हिसाब)**  
> Evidence-First Civic Intelligence & Mumbai Monsoon Road Repair Accountability Platform  
> **Official Repository:** `https://github.com/di0206-innovator/claude-impact-labs---my-version.git`

This document defines the system-wide guardrails, architectural invariants, harnessing protocols, and persona specifications for all AI agents and subagents operating within this codebase.

---

## ⛔ 1. ZERO-TOLERANCE IMMUTABLE GUARDRAILS

Every agent executing in this environment **MUST** obey these rules without exception:

1. **EXCLUSIVE REMOTE REPOSITORY**:
   - The **ONLY** authorized remote repository is:
     ```
     https://github.com/di0206-innovator/claude-impact-labs---my-version.git (origin)
     ```
   - **NEVER** push, mirror, reference, or connect to `https://github.com/TUSHARDHOKRIYA/Claude-Impact-Lab`. That repository is deprecated, removed, and prohibited.

2. **HARD 300-LINE SOURCE FILE CAP**:
   - Every source file (`.ts`, `.tsx`, `.css`, `.mjs`) inside `src/`, `scripts/`, and `infra/` **MUST NEVER EXCEED 300 LINES OF CODE**.
   - Verified via `npm run test:lines`. Any PR or commit failing this check will be rejected immediately.

3. **STRICT DATA SEMANTICS & NO CONFABULATION**:
   - `work_orders.cost_inr` is an **amount billed**, NEVER a confirmed payment.
   - A completed work order is a **recorded completion**, NEVER a verified physical repair.
   - `under_dlp` is a boolean screening hint, NEVER a confirmed contractual liability verdict.
   - Synthetic data must always be disclosed as synthetic. Never claim or imply real citizen identity scraping or official BMC partnership.

4. **READ-ONLY CLAUDE SANDBOX**:
   - Claude AI acts purely as an explanatory and evidence-organizing layer (*"Claude explains, it does not count"*).
   - Claude **CANNOT** mutate database records, execute raw SQL, approve payments, or file official complaints.
   - All financial and statistical calculations must be executed deterministically in TypeScript, never prompted from an LLM.

5. **VERIFICATION BEFORE COMMITTING**:
   - No code may be committed or pushed without executing and passing the full verification pipeline:
     ```bash
     npm run test:lines && npm run typecheck && npm run lint && npx vitest run && npm run build
     ```

---

## 👥 2. SPECIALIST AGENT DIRECTORY & HARNESSING DOCS

Each specialized engineering role on the team operates under a dedicated harnessing specification with explicit responsibilities, inputs, outputs, and guardrails:

| Role | Spec Document | Key Domain |
|---|---|---|
| **Product Strategist** | [`docs/agents/01_PRODUCT_STRATEGIST.md`](docs/agents/01_PRODUCT_STRATEGIST.md) | Civic positioning, problem definition, user journey boundaries |
| **Design Systems & UX** | [`docs/agents/02_DESIGN_SYSTEMS_AND_UX.md`](docs/agents/02_DESIGN_SYSTEMS_AND_UX.md) | Hallmark design principles, UX4G compliance, responsive viewports |
| **Senior Frontend Engineer** | [`docs/agents/03_FRONTEND_ENGINEER.md`](docs/agents/03_FRONTEND_ENGINEER.md) | Next.js 15 Server Components, React 19, modular widgets $\le 300$ lines |
| **Backend & Data Architect** | [`docs/agents/04_BACKEND_DATA_ARCHITECT.md`](docs/agents/04_BACKEND_DATA_ARCHITECT.md) | Modular monolith, repository ports, DynamoDB single-table design |
| **Data Scientist** | [`docs/agents/05_DATA_SCIENTIST.md`](docs/agents/05_DATA_SCIENTIST.md) | 4 audit rules, multi-factor risk algorithms, Bayesian shrinkage |
| **AI / LLM Engineer** | [`docs/agents/06_AI_LLM_ENGINEER.md`](docs/agents/06_AI_LLM_ENGINEER.md) | 12 typed read-only tools, evidence bundles, prompt injection defenses |
| **Geospatial Engineer** | [`docs/agents/07_GEOSPATIAL_ENGINEER.md`](docs/agents/07_GEOSPATIAL_ENGINEER.md) | MapLibre GL 6, Turf geodesic distance, GeoJSON Voronoi approximations |
| **Security & Privacy Engineer**| [`docs/agents/08_SECURITY_AND_PRIVACY.md`](docs/agents/08_SECURITY_AND_PRIVACY.md) | DPDP compliance, zero PII, server-only secret isolation, rate limits |
| **Accessibility Specialist**| [`docs/agents/09_ACCESSIBILITY_SPECIALIST.md`](docs/agents/09_ACCESSIBILITY_SPECIALIST.md) | WCAG 2.2 AA, keyboard focus, $\ge 44\text{px}$ touch targets, contrast |
| **QA & Automation Engineer** | [`docs/agents/10_QA_AUTOMATION_ENGINEER.md`](docs/agents/10_QA_AUTOMATION_ENGINEER.md) | Vitest test suites, line cap enforcement, regression barriers |

---

## 🛠️ 3. HARNESSING PROTOCOL FOR NEW TASKS

When starting or continuing a task, an agent must:

1. **Read-Only Exploration First**:
   - Check `git status` and `git branch`.
   - Never run destructive git commands (`git reset --hard`, `git push --force`).
2. **Consult Specialist Markdown Specs**:
   - Read the relevant specialist file in `docs/agents/` matching the requested changes.
3. **Preserve Existing Architecture**:
   - Respect the established abstractions in `src/lib/rupee/`, `src/lib/passport/`, and `src/lib/matching/`.
4. **Enforce Modular File Hygiene**:
   - If a file approaches 250 lines, proactively factor helper methods or subcomponents into dedicated modules before crossing 300 lines.
5. **Push Exclusively to `origin`**:
   - Ensure the git remote `origin` points to `https://github.com/di0206-innovator/claude-impact-labs---my-version.git`.
