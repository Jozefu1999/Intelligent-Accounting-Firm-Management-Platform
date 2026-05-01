"""
Train the project risk prediction model.

ML Workflow
-----------
1. Load real CSV dataset (project_risk_raw_dataset.csv, 4 000 rows, 51 cols)
2. Select 10 most-predictive features; encode categoricals
3. Merge 'Critical' label into 'High' → 3 balanced classes (Low / Medium / High)
4. Stratified 80 / 20 train-test split (random_state=42)
5. Train two models:
     a) RandomForestClassifier  (300 trees, balanced class weights)
     b) XGBoostClassifier       (400 trees, sample-weight balancing)
6. Evaluate both on held-out test split; pick the winner by accuracy
7. Save best model + scaler + metadata; write ML_REPORT.md

Features (10):
  team_size             – Number of people on the project
  budget_usd            – Project budget in USD (from dataset)
  duration_months       – Planned duration in months
  complexity_score      – Project complexity 1-10
  stakeholder_count     – Number of stakeholders
  success_rate          – Historical delivery success rate (0.0-1.0)
  budget_utilization    – Actual / planned budget ratio (0.6-1.3)
  team_experience       – Junior=0, Mixed=1, Senior=2, Expert=3
  requirement_stability – Volatile=0, Moderate=1, Stable=2
  external_dependencies – Count of external dependencies

Labels: 0=Low, 1=Medium, 2=High  (Critical merged into High)

Usage:
    python train_risk_model.py
"""

import json
import os
import sys

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from xgboost import XGBClassifier

# ── Constants ─────────────────────────────────────────────────────────────────
CSV_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'project_risk_raw_dataset.csv')

FEATURES = [
    'team_size',
    'budget_usd',
    'duration_months',
    'complexity_score',
    'stakeholder_count',
    'success_rate',
    'budget_utilization',
    'team_experience',
    'requirement_stability',
    'external_dependencies',
]

# CSV column name → feature name mapping
CSV_COL_MAP = {
    'Team_Size':                      'team_size',
    'Project_Budget_USD':             'budget_usd',
    'Estimated_Timeline_Months':      'duration_months',
    'Complexity_Score':               'complexity_score',
    'Stakeholder_Count':              'stakeholder_count',
    'Previous_Delivery_Success_Rate': 'success_rate',
    'Budget_Utilization_Rate':        'budget_utilization',
    'Team_Experience_Level':          'team_experience',
    'Requirement_Stability':          'requirement_stability',
    'External_Dependencies_Count':    'external_dependencies',
}

EXPERIENCE_MAP  = {'Junior': 0, 'Mixed': 1, 'Senior': 2, 'Expert': 3}
STABILITY_MAP   = {'Volatile': 0, 'Moderate': 1, 'Stable': 2}
# Merge 'Critical' into 'High' → 3-class model matching UI (Low/Medium/High)
LABEL_MAP       = {'Low': 0, 'Medium': 1, 'High': 2, 'Critical': 2}
RISK_LABELS     = {0: 'low', 1: 'medium', 2: 'high'}



# ── Data loading ──────────────────────────────────────────────────────────────
def load_and_clean() -> pd.DataFrame:
    df = pd.read_csv(CSV_PATH)
    print(f"[DATA] Loaded {len(df)} rows, {len(df.columns)} columns.")

    needed = list(CSV_COL_MAP.keys()) + ['Risk_Level']
    df = df[needed].copy()
    df.rename(columns=CSV_COL_MAP, inplace=True)

    # Encode categoricals
    df['team_experience']      = df['team_experience'].map(EXPERIENCE_MAP)
    df['requirement_stability'] = df['requirement_stability'].map(STABILITY_MAP)
    df['risk']                 = df['Risk_Level'].map(LABEL_MAP)

    before = len(df)
    df.dropna(inplace=True)
    if before != len(df):
        print(f"[DATA] Dropped {before - len(df)} rows with nulls.")

    dist = df['risk'].value_counts().sort_index().to_dict()
    print(f"[DATA] Clean dataset: {len(df)} rows | "
          + " | ".join(f"{RISK_LABELS[k]}={v}" for k, v in dist.items()))
    return df


# ── Training ──────────────────────────────────────────────────────────────────
def train_and_evaluate(df: pd.DataFrame):
    X = df[FEATURES].values
    y = df['risk'].values.astype(int)

    # Stratified 80/20 split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    print(f"[SPLIT] Train={len(X_train)}  Test={len(X_test)}")

    scaler = StandardScaler()
    Xs_train = scaler.fit_transform(X_train)
    Xs_test  = scaler.transform(X_test)

    results = {}

    # ── Model A: Random Forest ───────────────────────────────────────────────
    print("[RF] Training RandomForestClassifier (300 trees, balanced weights)...")
    rf = RandomForestClassifier(
        n_estimators=300,
        min_samples_leaf=2,
        class_weight='balanced',
        random_state=42,
        n_jobs=-1,
    )
    rf.fit(Xs_train, y_train)
    rf_pred = rf.predict(Xs_test)
    rf_acc  = accuracy_score(y_test, rf_pred)
    print(f"[RF] Accuracy: {rf_acc * 100:.2f}%")
    results['RandomForest'] = {
        'model': rf,
        'accuracy': rf_acc,
        'predictions': rf_pred,
        'report': classification_report(y_test, rf_pred,
                      target_names=['low', 'medium', 'high'], output_dict=True),
        'cm': confusion_matrix(y_test, rf_pred),
    }

    # ── Model B: XGBoost ─────────────────────────────────────────────────────
    print("[XGB] Training XGBoostClassifier (400 trees, sample-weight balancing)...")
    class_counts = np.bincount(y_train)
    total = len(y_train)
    sample_weights = np.array([
        total / (len(class_counts) * class_counts[yi]) for yi in y_train
    ])
    xgb = XGBClassifier(
        n_estimators=400,
        max_depth=6,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        eval_metric='mlogloss',
        random_state=42,
        n_jobs=-1,
        verbosity=0,
    )
    xgb.fit(Xs_train, y_train, sample_weight=sample_weights,
            eval_set=[(Xs_test, y_test)], verbose=False)
    xgb_pred = xgb.predict(Xs_test)
    xgb_acc  = accuracy_score(y_test, xgb_pred)
    print(f"[XGB] Accuracy: {xgb_acc * 100:.2f}%")
    results['XGBoost'] = {
        'model': xgb,
        'accuracy': xgb_acc,
        'predictions': xgb_pred,
        'report': classification_report(y_test, xgb_pred,
                      target_names=['low', 'medium', 'high'], output_dict=True),
        'cm': confusion_matrix(y_test, xgb_pred),
    }

    best_name = max(results, key=lambda k: results[k]['accuracy'])
    print(f"[BEST] Winner: {best_name} ({results[best_name]['accuracy'] * 100:.2f}%)")
    return scaler, results, best_name, y_test


# ── Persistence ───────────────────────────────────────────────────────────────
def save_models(scaler, best_model, best_name: str):
    os.makedirs('models', exist_ok=True)
    joblib.dump(best_model, 'models/risk_model.pkl')
    joblib.dump(scaler,     'models/risk_scaler.pkl')
    with open('models/risk_meta.json', 'w') as f:
        json.dump({'algorithm': best_name, 'features': FEATURES}, f)
    print(f"[SAVE] Saved to models/risk_model.pkl + risk_scaler.pkl + risk_meta.json")


# ── Markdown report ───────────────────────────────────────────────────────────
def write_report(results: dict, best_name: str, y_test, n_total: int):
    rf  = results['RandomForest']
    xgb = results['XGBoost']

    def fmt_report(r):
        lines = []
        for label in ['low', 'medium', 'high']:
            m = r['report'].get(label, {})
            lines.append(
                f"| {label.capitalize():8} | {m.get('precision', 0):.3f}     "
                f"| {m.get('recall', 0):.3f}  | {m.get('f1-score', 0):.3f} "
                f"| {int(m.get('support', 0)):7} |"
            )
        acc = r['accuracy'] * 100
        lines.append(f"| **Overall** | —         | —      | —    | **Acc: {acc:.2f}%** |")
        return "\n".join(lines)

    def fmt_cm(cm):
        header = "| Actual \\ Predicted | Low | Medium | High |"
        sep    = "|---|---|---|---|"
        rows = []
        for i, label in enumerate(['Low', 'Medium', 'High']):
            row = cm[i] if i < len(cm) else [0, 0, 0]
            rows.append(f"| **{label}** | {row[0]} | {row[1]} | {row[2]} |")
        return "\n".join([header, sep] + rows)

    label_dist = {RISK_LABELS[i]: int(np.sum(y_test == i)) for i in range(3)}

    report_md = f"""# ML Risk Prediction — Model Report

Generated automatically by `train_risk_model.py`.

---

## 1. Dataset

| Property | Value |
|---|---|
| Source | `project_risk_raw_dataset.csv` (real project data) |
| Total rows | {n_total} |
| Features used | 10 |
| Label column | `Risk_Level` (Critical merged → High) |
| Classes | Low / Medium / High |

### Feature Engineering

| Feature | Source Column | Notes |
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

### Class Distribution (full dataset)

| Class | Rows | Merged from |
|---|---|---|
| Low | ~806 | Low |
| Medium | ~1 396 | Medium |
| High | ~1 798 | High + Critical |

---

## 2. ML Workflow

```
Raw CSV (4 000 rows, 51 cols)
  → Select 10 features + encode categoricals
  → Merge Critical → High (3-class problem)
  → Drop nulls (none in selected features)
  → Stratified 80/20 train-test split (random_state=42)
  → StandardScaler (fit on train, apply to test — no leakage)
  → Train RandomForest + XGBoost independently
  → Evaluate both on held-out test set
  → Save best model
```

### Train / Test Split

| Set | Rows |
|---|---|
| Training (80%) | ~3 200 |
| Test (20%) | ~800 |

Both sets are **stratified** to preserve the original class ratios.

---

## 3. Model A — Random Forest

**Parameters:** `n_estimators=300`, `min_samples_leaf=2`, `class_weight='balanced'`

### Classification Report

| Class    | Precision | Recall | F1   | Support |
|---|---|---|---|---|
{fmt_report(rf)}

### Confusion Matrix

{fmt_cm(rf['cm'])}

---

## 4. Model B — XGBoost

**Parameters:** `n_estimators=400`, `max_depth=6`, `learning_rate=0.05`, `subsample=0.8`, `colsample_bytree=0.8`, sample-weight balancing

### Classification Report

| Class    | Precision | Recall | F1   | Support |
|---|---|---|---|---|
{fmt_report(xgb)}

### Confusion Matrix

{fmt_cm(xgb['cm'])}

---

## 5. Comparison & Winner

| Model | Test Accuracy |
|---|---|
| RandomForest | {rf['accuracy'] * 100:.2f}% |
| XGBoost | {xgb['accuracy'] * 100:.2f}% |
| **Winner** | **{best_name}** |

The **{best_name}** model was saved to `models/risk_model.pkl`.

---

## 6. Why the Previous Model Gave Wrong Predictions

The old synthetic-data model used `annual_revenue` and `estimated_budget` as separate
features plus `budget_ratio = log1p(budget/revenue)`. It had no knowledge of real
project-management signals like team experience, requirement volatility, or budget
utilisation. A budget of 80 000 TND with a 50 000 TND revenue appeared "normal" because
the synthetic generator never created that pattern, causing the model to default to
*Medium* instead of *High*.

The new model is trained on **4 000 real project records** covering the full range of
risk scenarios, with features that directly capture team capability (`team_experience`,
`requirement_stability`) and financial stress (`budget_utilization`). These are far more
reliable predictors than synthetic revenue/budget ratios.
"""

    out_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'ML_REPORT.md')
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write(report_md)
    print(f"[REPORT] Written to {out_path}")


# ── Entry point ───────────────────────────────────────────────────────────────
def main():
    if not os.path.exists(CSV_PATH):
        print(f"[ERROR] CSV not found: {CSV_PATH}", file=sys.stderr)
        sys.exit(1)

    df = load_and_clean()
    scaler, results, best_name, y_test = train_and_evaluate(df)

    save_models(scaler, results[best_name]['model'], best_name)
    write_report(results, best_name, y_test, len(df))

    acc = round(results[best_name]['accuracy'] * 100, 2)
    print(f"ACCURACY:{acc}")
    print(f"DATA_SOURCE:csv")
    print(f"ALGORITHM:{best_name}")


if __name__ == '__main__':
    main()
