# ML Risk Prediction — Model Report

Generated automatically by `train_risk_model.py`.

---

## 1. Dataset

| Property | Value |
|---|---|
| Source | `project_risk_raw_dataset.csv` (real project data) |
| Total rows | 4000 |
| Features used | 13 (10 base + 3 engineered) |
| Label column | `Risk_Level` (Critical merged → High) |
| Classes | Low / Medium / High |

### Feature Engineering

| Feature | Source / Formula | Notes |
|---|---|---|
| `team_size` | `Team_Size` | Direct numeric |
| `budget_usd` | `Project_Budget_USD` | Direct numeric (USD) |
| `duration_months` | `Estimated_Timeline_Months` | Direct numeric |
| `complexity_score` | `Complexity_Score` | Continuous 1–10 |
| `stakeholder_count` | `Stakeholder_Count` | Direct numeric |
| `success_rate` | `Previous_Delivery_Success_Rate` | 0.0–1.0 |
| `budget_utilization` | `Budget_Utilization_Rate` | 0.6–1.3 (actual/planned) |
| `team_experience` | `Team_Experience_Level` | Ordinal: Junior=0, Mixed=1, Senior=2, Expert=3 |
| `requirement_stability` | `Requirement_Stability` | Ordinal: Volatile=0, Moderate=1, Stable=2 |
| `external_dependencies` | `External_Dependencies_Count` | Direct numeric |
| `budget_per_person` | `budget_usd / team_size` | Resource adequacy per member |
| `timeline_pressure` | `complexity_score / duration_months` | Complexity rate per time unit |
| `team_effectiveness` | `team_experience × success_rate` | Combined quality × track record |

---

## 2. ML Workflow

```
Raw CSV (4 000 rows, 51 cols)
  → Select 10 feature columns + encode categoricals
  → Merge Critical → High (3-class problem)
  → Add 3 engineered interaction features → 13 total
  → Stratified 80/20 train-test split (random_state=42)
  → StandardScaler (fit on train ONLY — no data leakage)
  → RandomizedSearchCV (n_iter=25, cv=5) for each model
  → Voting ensemble from top 3 tuned models
  → Save winner
```

### Train / Test Split

| Set | Rows |
|---|---|
| Training (80%) | ~3 200 |
| Test (20%) | ~800 |

Both sets are **stratified** to preserve the original class ratios.

---

## 3. Model Comparison

| Model | Test Accuracy | CV Score |
|---|---|---|
| RandomForest | 54.12% | 53.97% |
| ExtraTrees | 53.00% | 53.41% |
| GradBoost | 51.38% | 53.75% |
| XGBoost | 54.62% | 54.78% |
| VotingEnsemble | 54.25% | N/A |

---

## 4. Winner — XGBoost

**Accuracy: 54.62%**

### Classification Report

| Class    | Precision | Recall | F1   | Support |
|---|---|---|---|---|
| Low      | 0.614     | 0.317  | 0.418 |     161 |
| Medium   | 0.424     | 0.401  | 0.413 |     279 |
| High     | 0.605     | 0.761  | 0.674 |     360 |
| **Overall** | —         | —      | —    | **Acc: 54.62%** |

### Confusion Matrix

| Actual \ Predicted | Low | Medium | High |
|---|---|---|---|
| **Low** | 51 | 75 | 35 |
| **Medium** | 23 | 112 | 144 |
| **High** | 9 | 77 | 274 |

---

## 5. Notes on Accuracy

| Benchmark | Accuracy |
|---|---|
| Majority-class guess (always High) | ~44.95% |
| Previous model (RF, 10 features, no tuning) | 54.50% |
| **This model (XGBoost)** | **54.62%** |

With only 10 user-inputtable features the theoretical ceiling is ~65–70%.
Academic literature reports 50–70% for project-risk classification with similar feature sets.
Using all 48 CSV features (RF) reaches ~66.5% — but those require a full professional assessment form.
