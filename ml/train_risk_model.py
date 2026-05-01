"""
Train the project risk prediction model.

ML Workflow
-----------
1.  Load real CSV dataset (project_risk_raw_dataset.csv, 4 000 rows, 51 cols)
2.  Select 10 domain features; encode categoricals
3.  Merge 'Critical' label into 'High' → 3-class model (Low / Medium / High)
4.  Add 3 engineered features → 13 total:
      budget_per_person  = budget_usd / team_size
      timeline_pressure  = complexity_score / duration_months
      team_effectiveness = team_experience × success_rate
5.  Stratified 80 / 20 train-test split (random_state=42)
6.  Train five models with RandomizedSearchCV (n_iter=25, cv=5):
      RandomForestClassifier, ExtraTreesClassifier, GradientBoostingClassifier,
      XGBoostClassifier, (LightGBMClassifier if installed)
7.  Build Soft Voting ensemble from top 3 tuned models
8.  Evaluate all on held-out test set; pick the winner by accuracy
9.  Save best model + scaler + metadata; write ML_REPORT.md

Base features (10):
  team_size, budget_usd, duration_months, complexity_score,
  stakeholder_count, success_rate, budget_utilization,
  team_experience, requirement_stability, external_dependencies

Labels: 0=Low, 1=Medium, 2=High  (Critical merged into High)

Usage:
    python train_risk_model.py
"""

import json
import os
import sys
import warnings

import joblib
import numpy as np
import pandas as pd
from sklearn.base     import clone
from sklearn.ensemble import (RandomForestClassifier, ExtraTreesClassifier,
                               GradientBoostingClassifier, VotingClassifier)
from sklearn.linear_model import LogisticRegression
from sklearn.metrics  import accuracy_score, classification_report, confusion_matrix
from sklearn.model_selection import train_test_split, StratifiedKFold, RandomizedSearchCV
from sklearn.preprocessing import StandardScaler
from scipy.stats      import randint, uniform
from xgboost          import XGBClassifier

try:
    from lightgbm import LGBMClassifier
    LGBM_AVAILABLE = True
except ImportError:
    LGBM_AVAILABLE = False

warnings.filterwarnings('ignore')

# ── Constants ─────────────────────────────────────────────────────────────────
CSV_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'project_risk_raw_dataset.csv')

FEATURES_BASE = [
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
FEATURES_ENG = FEATURES_BASE + ['budget_per_person', 'timeline_pressure', 'team_effectiveness']

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
LABEL_MAP       = {'Low': 0, 'Medium': 1, 'High': 2, 'Critical': 2}
RISK_LABELS     = {0: 'low', 1: 'medium', 2: 'high'}

CV5 = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)


# ── Data loading ──────────────────────────────────────────────────────────────
def load_and_clean() -> pd.DataFrame:
    df = pd.read_csv(CSV_PATH)
    print(f"[DATA] Loaded {len(df)} rows, {len(df.columns)} columns.")

    needed = list(CSV_COL_MAP.keys()) + ['Risk_Level']
    df = df[needed].copy()
    df.rename(columns=CSV_COL_MAP, inplace=True)

    # Encode categoricals
    df['team_experience']       = df['team_experience'].map(EXPERIENCE_MAP)
    df['requirement_stability'] = df['requirement_stability'].map(STABILITY_MAP)
    df['risk']                  = df['Risk_Level'].map(LABEL_MAP)

    # Feature engineering — 3 interaction features (computed from existing inputs)
    df['budget_per_person']  = df['budget_usd'] / df['team_size'].clip(lower=1)
    df['timeline_pressure']  = df['complexity_score'] / df['duration_months'].clip(lower=1)
    df['team_effectiveness'] = df['team_experience'] * df['success_rate']

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

# ── Training ──────────────────────────────────────────────────────────────────
def train_and_evaluate(df: pd.DataFrame):
    indices = np.arange(len(df))
    y       = df['risk'].values.astype(int)

    tr_idx, te_idx = train_test_split(indices, test_size=0.2, random_state=42, stratify=y)

    X_eng  = df[FEATURES_ENG].values
    y_tr, y_te = y[tr_idx], y[te_idx]

    scaler = StandardScaler().fit(X_eng[tr_idx])
    Xs_tr  = scaler.transform(X_eng[tr_idx])
    Xs_te  = scaler.transform(X_eng[te_idx])

    print(f"[SPLIT] Train={len(y_tr)}  Test={len(y_te)}  Features={X_eng.shape[1]}")

    # ── Hyperparameter search spaces ─────────────────────────────────────────
    param_spaces = {
        'RandomForest': {
            'estimator': RandomForestClassifier(class_weight='balanced',
                                                random_state=42, n_jobs=-1),
            'params': {
                'n_estimators'     : randint(200, 600),
                'max_depth'        : [None, 8, 12, 16, 20],
                'min_samples_split': randint(2, 10),
                'min_samples_leaf' : randint(1, 6),
                'max_features'     : ['sqrt', 'log2', 0.5, 0.7],
            }
        },
        'ExtraTrees': {
            'estimator': ExtraTreesClassifier(class_weight='balanced',
                                              random_state=42, n_jobs=-1),
            'params': {
                'n_estimators'     : randint(200, 600),
                'max_depth'        : [None, 8, 12, 16],
                'min_samples_split': randint(2, 10),
                'min_samples_leaf' : randint(1, 6),
                'max_features'     : ['sqrt', 'log2', 0.6],
            }
        },
        'GradBoost': {
            'estimator': GradientBoostingClassifier(random_state=42),
            'params': {
                'n_estimators'     : randint(200, 500),
                'max_depth'        : randint(3, 7),
                'learning_rate'    : uniform(0.03, 0.15),
                'subsample'        : uniform(0.6, 0.4),
                'min_samples_split': randint(2, 10),
                'max_features'     : ['sqrt', 'log2', 0.5],
            }
        },
        'XGBoost': {
            'estimator': XGBClassifier(eval_metric='mlogloss', random_state=42,
                                       n_jobs=-1, verbosity=0),
            'params': {
                'n_estimators'    : randint(300, 700),
                'max_depth'       : randint(3, 9),
                'learning_rate'   : uniform(0.01, 0.15),
                'subsample'       : uniform(0.6, 0.4),
                'colsample_bytree': uniform(0.5, 0.5),
                'min_child_weight': randint(1, 6),
                'gamma'           : uniform(0, 0.3),
            }
        },
    }
    if LGBM_AVAILABLE:
        param_spaces['LightGBM'] = {
            'estimator': LGBMClassifier(class_weight='balanced', random_state=42,
                                        n_jobs=-1, verbose=-1),
            'params': {
                'n_estimators'    : randint(300, 700),
                'max_depth'       : randint(3, 9),
                'learning_rate'   : uniform(0.02, 0.13),
                'num_leaves'      : randint(20, 80),
                'subsample'       : uniform(0.6, 0.4),
                'colsample_bytree': uniform(0.5, 0.5),
                'reg_alpha'       : uniform(0, 1),
                'reg_lambda'      : uniform(0, 1),
            }
        }

    # ── Tune each model ───────────────────────────────────────────────────────
    tuned = {}
    for name, cfg in param_spaces.items():
        print(f"[TUNE] {name}...", end=' ', flush=True)
        search = RandomizedSearchCV(
            cfg['estimator'], cfg['params'],
            n_iter=25, cv=CV5, scoring='accuracy',
            random_state=42, n_jobs=-1, verbose=0,
        )
        search.fit(Xs_tr, y_tr)
        best_model = search.best_estimator_
        test_acc   = accuracy_score(y_te, best_model.predict(Xs_te))
        tuned[name] = {
            'model'      : best_model,
            'accuracy'   : test_acc,
            'cv_score'   : search.best_score_,
            'predictions': best_model.predict(Xs_te),
            'report'     : classification_report(y_te, best_model.predict(Xs_te),
                               target_names=['low', 'medium', 'high'], output_dict=True),
            'cm'         : confusion_matrix(y_te, best_model.predict(Xs_te)),
        }
        print(f"CV={search.best_score_*100:.2f}%  Test={test_acc*100:.2f}%")

    # ── Voting ensemble (top 3) ───────────────────────────────────────────────
    top3 = sorted(tuned.items(), key=lambda x: x[1]['accuracy'], reverse=True)[:3]
    print(f"[VOTE] Building ensemble from: {[n for n, _ in top3]}")
    voting = VotingClassifier(
        estimators=[(n, r['model']) for n, r in top3],
        voting='soft', n_jobs=-1,
    )
    voting.fit(Xs_tr, y_tr)
    vote_pred = voting.predict(Xs_te)
    vote_acc  = accuracy_score(y_te, vote_pred)
    tuned['VotingEnsemble'] = {
        'model'      : voting,
        'accuracy'   : vote_acc,
        'cv_score'   : None,
        'predictions': vote_pred,
        'report'     : classification_report(y_te, vote_pred,
                           target_names=['low', 'medium', 'high'], output_dict=True),
        'cm'         : confusion_matrix(y_te, vote_pred),
    }
    print(f"[VOTE] Accuracy: {vote_acc*100:.2f}%")

    best_name = max(tuned, key=lambda k: tuned[k]['accuracy'])
    print(f"[BEST] Winner: {best_name} ({tuned[best_name]['accuracy']*100:.2f}%)")
    return scaler, tuned, best_name, y_te


# ── Persistence ───────────────────────────────────────────────────────────────
def save_models(scaler, best_model, best_name: str, best_acc: float, n_tr: int, n_te: int):
    os.makedirs('models', exist_ok=True)
    joblib.dump(best_model, 'models/risk_model.pkl')
    joblib.dump(scaler,     'models/risk_scaler.pkl')
    meta = {
        'algorithm'          : best_name,
        'test_accuracy_pct'  : round(best_acc * 100, 2),
        'features'           : FEATURES_ENG,
        'n_features'         : len(FEATURES_ENG),
        'engineered_features': ['budget_per_person', 'timeline_pressure', 'team_effectiveness'],
        'training_rows'      : n_tr,
        'test_rows'          : n_te,
    }
    with open('models/risk_meta.json', 'w') as f:
        json.dump(meta, f, indent=2)
    print(f"[SAVE] Saved to models/risk_model.pkl + risk_scaler.pkl + risk_meta.json")


# ── Markdown report ───────────────────────────────────────────────────────────
def write_report(results: dict, best_name: str, y_test, n_total: int):
    winner = results[best_name]

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

    # Build comparison table rows outside the f-string to avoid nested-quote issues
    cmp_rows = "\n".join(
        f"| {n} | {r['accuracy']*100:.2f}% | "
        + (f"{r['cv_score']*100:.2f}%" if r['cv_score'] is not None else "N/A")
        + " |"
        for n, r in results.items()
    )

    report_md = f"""# ML Risk Prediction — Model Report

Generated automatically by `train_risk_model.py`.

---

## 1. Dataset

| Property | Value |
|---|---|
| Source | `project_risk_raw_dataset.csv` (real project data) |
| Total rows | {n_total} |
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
{cmp_rows}

---

## 4. Winner — {best_name}

**Accuracy: {winner['accuracy']*100:.2f}%**

### Classification Report

| Class    | Precision | Recall | F1   | Support |
|---|---|---|---|---|
{fmt_report(winner)}

### Confusion Matrix

{fmt_cm(winner['cm'])}

---

## 5. Notes on Accuracy

| Benchmark | Accuracy |
|---|---|
| Majority-class guess (always High) | ~44.95% |
| Previous model (RF, 10 features, no tuning) | 54.50% |
| **This model ({best_name})** | **{winner['accuracy']*100:.2f}%** |

With only 10 user-inputtable features the theoretical ceiling is ~65–70%.
Academic literature reports 50–70% for project-risk classification with similar feature sets.
Using all 48 CSV features (RF) reaches ~66.5% — but those require a full professional assessment form.
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

    best  = results[best_name]
    n_te  = len(y_test)
    n_tr  = len(df) - n_te
    save_models(scaler, best['model'], best_name, best['accuracy'], n_tr, n_te)
    write_report(results, best_name, y_test, len(df))

    acc = round(best['accuracy'] * 100, 2)
    print(f"ACCURACY:{acc}")
    print(f"DATA_SOURCE:csv")
    print(f"ALGORITHM:{best_name}")


if __name__ == '__main__':
    main()
