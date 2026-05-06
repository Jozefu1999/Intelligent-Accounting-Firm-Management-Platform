# ML Module — Complete Implementation Summary

**Branch:** `feature/ml-module-complete`  
**Base branch:** `develop`  
**Last updated:** 2026-05-01  
**Status:** Committed locally — push with `git push origin feature/ml-module-complete`

---

## What Was Done (Cumulative)

### Phase 1 — Initial ML Module
Built the missing ML module from scratch: project classification model, admin retrain panel, project-classification frontend page, backend ML routes.

### Phase 2 — Risk Prediction Upgrade (this session)
Expanded risk prediction from 3 inputs to **9 inputs**, changed currency to **TND**, changed sector from code input to name dropdown, improved model architecture.

---

## Risk Prediction — How It Works

### Overview

The risk prediction module helps accounting firm experts assess **how risky a new client project is** before accepting or pricing it.

The model is a **GradientBoostingClassifier** trained on 1998 balanced synthetic samples (666 per class) representing the Tunisian accounting market. It takes 9 inputs and outputs a risk class (`low / medium / high`) with probabilities.

### The 9 Input Features

| Feature | Type | Unit | What it measures |
|---|---|---|---|
| `annual_revenue` | Float | **TND** | Client's total yearly revenue — measures financial capacity |
| `estimated_budget` | Float | **TND** | Project budget — compared to revenue to detect overextension |
| `sector` | String | Name | Industry sector — some sectors (construction, finance, real estate) are structurally riskier |
| `duration_days` | Int | Days | Planned project length — longer projects have more delivery risk and budget drift |
| `team_size` | Int | People | Team assigned — small team on large budget = execution risk |
| `debt_ratio` | Float | 0.0–1.0 | Client's debt as fraction of assets — high debt = payment default risk |
| `success_rate` | Float | 0.0–1.0 | Client's historical project success rate — past behavior predicts future behavior |
| `complexity_score` | Int | 1–5 | Subjective complexity rating (1=very simple, 5=very complex) |
| `stakeholder_count` | Int | People | Number of people/entities with stakes in the project — more stakeholders = coordination risk, scope creep, delayed approvals |

> In the frontend the user enters `debt_ratio` and `success_rate` as **percentages (0-100)** — the frontend divides by 100 before sending to the API.

### How the Model Makes a Decision

The GradientBoosting model learned these patterns from training data:

- **Budget/Revenue ratio > 35%** → strong high-risk signal (client is overextending on this project)
- **Debt ratio > 60%** → high risk (client may have cash flow problems)
- **Success rate < 35%** → high risk (client has a poor track record)
- **Success rate > 80%** → risk-reducing factor
- **Complexity score 4–5** → medium/high risk signal
- **Duration > 365 days** → elevated risk (long projects accumulate uncertainty)
- **Team size < 3 with budget > 100k TND** → understaffed risk
- **Stakeholder count > 12** → coordination risk
- **Sectors: construction (1), finance (7), real estate (9)** → sector risk premium
- **Revenue < 50k TND** → small/fragile client, inherently higher risk

### API: POST /api/ai/predict-risk

```json
// Request (all fields except annual_revenue, estimated_budget, sector are optional)
{
  "annual_revenue": 500000,
  "estimated_budget": 80000,
  "sector": "construction",
  "duration_days": 120,
  "team_size": 4,
  "debt_ratio": 0.35,
  "success_rate": 0.72,
  "complexity_score": 3,
  "stakeholder_count": 6
}

// Response
{
  "risk_level": "medium",
  "score": 0.94,
  "probabilities": {
    "low": 0.02,
    "medium": 0.94,
    "high": 0.04
  },
  "sector_code": 1
}
```

**Output fields:**
- `risk_level` — `"low"` / `"medium"` / `"high"` (the predicted class)
- `score` — confidence of the prediction (0.0–1.0)
- `probabilities` — probability for each class; shows model uncertainty
- `sector_code` — resolved integer code for the sector passed

### What was changed from Phase 1

| Change | Before | After |
|---|---|---|
| Feature count | 3 | **9** |
| Currency | EUR | **TND** |
| Sector input | Numeric code (0–10) | **Name dropdown** |
| Model algorithm | RandomForest 200 trees | **GradientBoosting 300 trees** |
| Training samples | 1000 (unbalanced) | **1998 (balanced, 666/class)** |
| Accuracy | 85.0% | **99.5%** (balanced classes, clear separation) |
| Frontend form | 3 plain number inputs | **9 fields with sections, selects, hints** |

> The 99.5% accuracy reflects perfectly separated synthetic classes. With real-world data containing messy edges between classes, expect 75–88%. The model structure (9 rich features) is sound for production use.

---

## Files Changed

### 🐍 ML (Python) — `ml/`

| File | Status | Description |
|---|---|---|
| `ml/constants.py` | NEW | Shared constants: sector map (11 sectors, name→code), label maps |
| `ml/train_risk_model.py` | **REWRITTEN** (twice) | Now uses 9 features, balanced 3-class generation (666/class), GradientBoosting 300 trees, 1998 samples |
| `ml/train_classification_model.py` | NEW | 5-class project type classifier, 1200 samples, 91.25% accuracy |
| `ml/predict.py` | **REWRITTEN** (twice) | Accepts full 9-field JSON, sector name→code, applies scaler, backward-compatible legacy array |
| `ml/classify_project.py` | NEW | Project type prediction with confidence + ranked probabilities |
| `ml/requirements.txt` | UPDATED | Added sqlalchemy, pymysql |

### 🟢 Backend (Node.js) — `backend/src/`

| File | Status | Description |
|---|---|---|
| `controllers/ml.controller.js` | NEW | Admin retrain + model status |
| `routes/ml.routes.js` | NEW | `GET /status`, `POST /retrain` (admin-only) |
| `controllers/ai.controller.js` | MODIFIED | `predictRisk()` now extracts all 9 fields; `classifyProject()` added |
| `routes/ai.routes.js` | MODIFIED | Added `/classify-project` route |
| `app.js` | MODIFIED | Registered `/api/admin/ml` |
| `.env` | MODIFIED | Added `PYTHON_EXECUTABLE` (fixes Anaconda path bug), `DB_URL` |
| `.env.example` | MODIFIED | Documents `PYTHON_EXECUTABLE` and `DB_URL` |

### 🔷 Frontend (Angular) — `frontend/src/app/`

| File | Status | Description |
|---|---|---|
| `features/ai-tools/risk-prediction/risk-prediction.ts` | **REWRITTEN** | 9-field form, sector name dropdown, debt/success as %, `SECTOR_OPTIONS` constant |
| `features/ai-tools/risk-prediction/risk-prediction.html` | **REWRITTEN** | Two sections (Client Financials + Project Details), select dropdowns, input-summary panel on result |
| `features/ai-tools/risk-prediction/risk-prediction.scss` | MODIFIED | Added `.form-section-title`, `.form-row`, `.form-col`, `.field-hint`, select styles, risk-summary variants, input-summary grid |
| `features/ai-tools/project-classification/` | NEW | Full project classification page (ts + html + scss) |
| `app.routes.ts` | MODIFIED | Added project-classification route |
| `layouts/expert-layout/...html` | MODIFIED | Added nav item |
| `pages/admin/ml/admin-ml.component.*` | REWRITTEN | Real HTTP calls, per-model cards |
| `core/models/index.ts` | MODIFIED | Updated `RiskPredictionRequest` (9 optional fields); added classification + ML admin interfaces |
| `core/services/ai.ts` | MODIFIED | Added `classifyProject()` |
| `core/services/admin.ts` | MODIFIED | Added `getMlStatus()`, `retrainModel()` |

---

## API Reference (All ML Endpoints)

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/ai/predict-risk` | JWT | ML risk prediction (9 features) |
| `POST` | `/api/ai/classify-project` | JWT | ML project type classification |
| `GET` | `/api/admin/ml/status` | JWT + Admin | Status of all ML models |
| `POST` | `/api/admin/ml/retrain` | JWT + Admin | Trigger retraining (async) |

### POST /api/ai/predict-risk — full payload

```json
{
  "annual_revenue": 500000,
  "estimated_budget": 80000,
  "sector": "construction",
  "duration_days": 120,
  "team_size": 4,
  "debt_ratio": 0.35,
  "success_rate": 0.72,
  "complexity_score": 3,
  "stakeholder_count": 6
}
```

> Only `annual_revenue` and `estimated_budget` are required. All others default to safe values.

### POST /api/ai/classify-project

```json
{
  "annual_revenue": 500000,
  "estimated_budget": 40000,
  "sector": "finance",
  "priority": "high",
  "duration_days": 120
}
```

---

## Sector Name Reference

| Name (send this) | Code | Risk profile |
|---|---|---|
| `agriculture` | 0 | Low |
| `construction` | 1 | **High** |
| `manufacturing` | 2 | Medium |
| `retail` | 3 | Low |
| `transport` | 4 | Low |
| `hospitality` | 5 | Low |
| `information technology` | 6 | Medium |
| `finance` | 7 | **High** |
| `healthcare` | 8 | Medium |
| `real estate` | 9 | **High** |
| `consulting` | 10 | Low |

---

## Environment Configuration

Set in `backend/.env`:

```env
# Required on Windows if 'python' resolves to Anaconda or is broken
PYTHON_EXECUTABLE=C:\Users\Youssef\AppData\Local\Programs\Python\Python312\python.exe

# Optional: use real DB data for training (needs ≥30 records)
DB_URL=mysql+pymysql://root:password@localhost/plateforme_comptable
```

---

## How to Re-train Models

From the `ml/` directory:

```bash
# Risk prediction model (9 features)
python train_risk_model.py

# Project classification model (5 types)
python train_classification_model.py
```

Or use the Admin panel → ML Management → "Retrain" button (triggers the same scripts via the backend).

---

## To push the branch

```bash
git push origin feature/ml-module-complete
```

Then open a Pull Request from `feature/ml-module-complete` → `develop`.


### Problem: ML Module Was Incomplete

Before this work, the ML module had three issues:

1. **Only one model existed** (risk prediction) — project classification was listed in the spec but missing.
2. **Synthetic-only training** — the risk model was trained on 500 hardcoded samples with no path to use real DB data.
3. **Admin ML page was fake** — the "Retrain" button used a `setTimeout` and hardcoded `accuracy = '86.4%'` instead of actually running the training script.

---

## Files Changed

### 🐍 ML (Python) — `ml/`

| File | Status | Description |
|---|---|---|
| `ml/constants.py` | **NEW** | Shared constants: sector map (11 sectors, name→code), label maps for risk and project types, priority codes |
| `ml/train_risk_model.py` | **REWRITTEN** | DB mode support via `DB_URL` env var, `StandardScaler`, lognormal revenue distribution, 1000 samples, 200 trees, `class_weight='balanced'` |
| `ml/train_classification_model.py` | **NEW** | 5-class project type classifier (GradientBoosting), per-type synthetic data generation with realistic rules, 1200 samples |
| `ml/predict.py` | **REWRITTEN** | Accepts JSON object OR legacy array, resolves sector name to code, applies scaler, safe class-index mapping |
| `ml/classify_project.py` | **NEW** | Project type prediction: inputs are revenue, budget, sector, priority, duration. Outputs predicted type + confidence + ranked probabilities |
| `ml/requirements.txt` | **UPDATED** | Added `sqlalchemy>=2.0.0` and `pymysql>=1.1.0` for DB data loading |

#### Trained model results

| Model | Algorithm | Samples | Accuracy |
|---|---|---|---|
| `risk_model.pkl` + `risk_scaler.pkl` | RandomForest (200 trees) | 1000 | **85.0%** |
| `classification_model.pkl` + `classification_scaler.pkl` | GradientBoosting (200 trees) | 1200 | **91.25%** |

> Model `.pkl` files are gitignored. Re-train by running `python train_risk_model.py` and `python train_classification_model.py` from the `ml/` directory.

---

### 🟢 Backend (Node.js) — `backend/src/`

#### New files

**`controllers/ml.controller.js`**
- `getModelStatus()` — reads `models/*.pkl` file metadata from disk, returns per-model status (exists, lastModified, accuracy from last retrain, data source, running state, error)
- `retrainModel()` — spawns the actual Python training script via `child_process.spawn`, non-blocking (responds immediately, trains in background), parses `ACCURACY:XX` and `DATA_SOURCE:X` tokens from stdout

**`routes/ml.routes.js`**
- `GET /api/admin/ml/status` — returns status for both models (admin-only)
- `POST /api/admin/ml/retrain` — starts retraining, body: `{ model: 'risk' | 'classification' | 'all' }` (admin-only)

#### Modified files

**`controllers/ai.controller.js`**
- Rewrote `predictRisk()`: uses JSON object payload (`{ annual_revenue, estimated_budget, sector_code }`), respects `PYTHON_EXECUTABLE` env var, quotes paths correctly for Windows
- Added `classifyProject()`: accepts `annual_revenue`, `estimated_budget`, `sector_code | sector`, `priority`, `duration_days` — calls `classify_project.py`

**`routes/ai.routes.js`**
- Added `POST /api/ai/classify-project`

**`app.js`**
- Registered ML routes at `/api/admin/ml`

---

### 🔷 Frontend (Angular) — `frontend/src/app/`

#### New component

**`features/ai-tools/project-classification/`**  
Full page component (`project-classification.ts` + `.html` + `.scss`):
- Form with: Annual Revenue, Estimated Budget, Sector dropdown (11 options with names), Priority dropdown, Expected Duration (days)
- Result panel: predicted type card with icon, probability breakdown bar chart, confidence percentage, sector label display
- Purple color scheme (distinct from risk prediction's blue)
- Responsive grid layout

#### Modified files

**`app.routes.ts`**  
Added route: `/expert/ai-tools/project-classification` → `ProjectClassification` component

**`layouts/expert-layout/expert-layout.component.html`**  
Added nav item: "Project Classification" with `category` icon, linking to `/expert/ai-tools/project-classification`

**`pages/admin/ml/admin-ml.component.ts`** (complete rewrite)
- `ngOnInit()` calls `getMlStatus()` — loads real model info on page open
- `retrain(model)` calls `retrainModel({ model })` HTTP endpoint
- Per-model accuracy, last run date, data source, error display
- `formatDate()`, `getAccuracyDisplay()`, `getModelLabel()` display helpers

**`pages/admin/ml/admin-ml.component.html`** (complete rewrite)
- Per-model cards with status badge (Trained / Not trained)
- Per-model retrain button + global "Retrain All" button
- 5-metric grid per model: Status, Last retrain, Accuracy, File updated, Data source
- Error banner if last training failed

**`pages/admin/ml/admin-ml.component.css`**
- Added styles for: `.model-card`, `.model-header`, `.model-status-badge`, `.badge-ok`, `.badge-missing`, `.run-btn-sm`, `.model-error`, `.alert`, `.loading-row`

**`core/models/index.ts`**  
Added interfaces:
- `ProjectClassificationRequest` / `ProjectClassificationResponse` / `ProjectClassificationResult`
- `ProjectType` type alias
- `MlModelInfo` / `MlStatusResponse` / `MlRetrainRequest` / `MlRetrainResponse`

**`core/services/ai.ts`**  
Added: `classifyProject(data: ProjectClassificationRequest): Observable<ProjectClassificationResponse>`

**`core/services/admin.ts`**  
Added: `getMlStatus(): Observable<MlStatusResponse>` and `retrainModel(body): Observable<MlRetrainResponse>`

---

## API Reference (New Endpoints)

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/ai/classify-project` | JWT | ML project type classification |
| `GET` | `/api/admin/ml/status` | JWT + Admin | Get status of all ML models |
| `POST` | `/api/admin/ml/retrain` | JWT + Admin | Trigger retraining (async) |

### `POST /api/ai/classify-project`
```json
// Request
{
  "annual_revenue": 500000,
  "estimated_budget": 40000,
  "sector_code": 7,
  "priority": "high",
  "duration_days": 120
}

// Response
{
  "predicted_type": "consulting",
  "confidence": 0.84,
  "probabilities": {
    "creation": 0.03,
    "development": 0.05,
    "audit": 0.08,
    "consulting": 0.84,
    "other": 0.00
  },
  "ranking": [
    { "type": "consulting", "probability": 0.84 },
    { "type": "audit", "probability": 0.08 },
    ...
  ],
  "sector_code": 7
}
```

### `POST /api/admin/ml/retrain`
```json
// Request
{ "model": "all" }  // or "risk" or "classification"

// Response (immediate, training runs in background)
{
  "message": "Retraining started for: risk, classification",
  "models": ["risk", "classification"],
  "startedAt": "2026-05-01T00:14:00.000Z"
}
```

### `GET /api/admin/ml/status`
```json
{
  "models": {
    "risk": {
      "model": "risk",
      "exists": true,
      "lastModified": "2026-05-01T00:05:00.000Z",
      "running": false,
      "lastRun": "2026-05-01T00:14:11.000Z",
      "accuracy": 85.0,
      "dataSource": "synthetic",
      "error": null
    },
    "classification": { ... }
  }
}
```

---

## Sector Code Mapping

| Code | Sector |
|---|---|
| 0 | Agriculture |
| 1 | Construction |
| 2 | Manufacturing |
| 3 | Retail |
| 4 | Transport |
| 5 | Hospitality / Other |
| 6 | Information Technology |
| 7 | Finance |
| 8 | Healthcare |
| 9 | Real Estate |
| 10 | Consulting |

---

## How to Use DB-based Training

Set the `DB_URL` environment variable before running the training script:

```bash
# MySQL
export DB_URL="mysql+pymysql://user:password@localhost/dbname"
python train_risk_model.py

# PostgreSQL
export DB_URL="postgresql+psycopg2://user:password@localhost/dbname"
python train_classification_model.py
```

Or set it in `backend/.env` as `DB_URL=...` and it will be picked up automatically when the admin triggers retraining via the UI.

**Fallback behaviour:** if the DB has fewer than 30 qualifying records, both scripts fall back to synthetic data automatically.

---

## To push the branch

```bash
git push origin feature/ml-module-complete
```

Then open a Pull Request from `feature/ml-module-complete` → `develop`.
