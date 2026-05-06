"""
Train the project risk prediction model from the real CSV dataset.

Workflow implemented for the PFE risk-prediction module:
1. Exploratory Data Analysis (EDA)
2. Preprocessing and feature engineering
3. Baseline modelling with exactly 5 models:
   - K-Nearest Neighbors (KNN)
   - Logistic Regression
   - Decision Tree, with a saved tree visualization
   - Random Forest, with saved feature importance
   - XGBoost
4. Feature selection with SelectKBest
5. Fine-tuning with GridSearchCV
6. Final model selection on a held-out test split
7. Save the final inference pipeline and write ML_REPORT.md

The model intentionally uses a selected set of direct project-risk drivers from the
dataset, not all CSV columns. The frontend provides these inputs; three engineered
features are computed automatically during training and prediction.
"""

from __future__ import annotations

import json
import sys
import warnings
from collections import OrderedDict
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.base import clone
from sklearn.ensemble import RandomForestClassifier
from sklearn.feature_selection import SelectKBest, f_classif
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from sklearn.model_selection import GridSearchCV, StratifiedKFold, train_test_split
from sklearn.neighbors import KNeighborsClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.tree import DecisionTreeClassifier
from xgboost import XGBClassifier

try:
    import matplotlib.pyplot as plt
    from sklearn.metrics import ConfusionMatrixDisplay
    from sklearn.tree import plot_tree
    PLOTS_AVAILABLE = True
except ImportError:
    PLOTS_AVAILABLE = False

warnings.filterwarnings("ignore")

BASE_DIR = Path(__file__).resolve().parent
CSV_PATH = BASE_DIR / "project_risk_raw_dataset.csv"
MODEL_DIR = BASE_DIR / "models"
OUTPUT_DIR = BASE_DIR / "outputs"
REPORT_PATH = BASE_DIR / "ML_REPORT.md"

MODEL_DIR.mkdir(exist_ok=True)
OUTPUT_DIR.mkdir(exist_ok=True)

RANDOM_STATE = 42
TEST_SIZE = 0.2
CV = StratifiedKFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE)

RISK_LABELS = {0: "low", 1: "medium", 2: "high"}
LABEL_MAP = {"Low": 0, "Medium": 1, "High": 2, "Critical": 2}

CSV_COL_MAP = OrderedDict([
    ("Team_Size", "team_size"),
    ("Project_Budget_USD", "budget_usd"),
    ("Estimated_Timeline_Months", "duration_months"),
    ("Complexity_Score", "complexity_score"),
    ("Stakeholder_Count", "stakeholder_count"),
    ("Past_Similar_Projects", "past_similar_projects"),
    ("External_Dependencies_Count", "external_dependencies"),
    ("Change_Request_Frequency", "change_request_frequency"),
    ("Team_Turnover_Rate", "team_turnover_rate"),
    ("Vendor_Reliability_Score", "vendor_reliability"),
    ("Schedule_Pressure", "schedule_pressure"),
    ("Budget_Utilization_Rate", "budget_utilization"),
    ("Resource_Availability", "resource_availability"),
    ("Previous_Delivery_Success_Rate", "success_rate"),
    ("Technical_Debt_Level", "technical_debt"),
    ("Team_Experience_Level", "team_experience"),
    ("Requirement_Stability", "requirement_stability"),
    ("Risk_Management_Maturity", "risk_management_maturity"),
    ("Documentation_Quality", "documentation_quality"),
])

BASE_FEATURES = list(CSV_COL_MAP.values())
ENGINEERED_FEATURES = [
    "budget_per_person",
    "timeline_pressure",
    "team_effectiveness",
]
MODEL_INPUT_FEATURES = BASE_FEATURES + ENGINEERED_FEATURES

ENCODING_MAPS = {
    "team_experience": {"Junior": 0, "Mixed": 1, "Senior": 2, "Expert": 3},
    "requirement_stability": {"Volatile": 0, "Moderate": 1, "Stable": 2},
    "risk_management_maturity": {"Basic": 0, "Formal": 1, "Advanced": 2},
    "documentation_quality": {"Poor": 0, "Basic": 1, "Good": 2, "Excellent": 3},
}

FEATURE_DESCRIPTIONS = OrderedDict([
    ("team_size", ("Team_Size", "Number of people on the project.")),
    ("budget_usd", ("Project_Budget_USD", "Project budget amount.")),
    ("duration_months", ("Estimated_Timeline_Months", "Planned duration in months.")),
    ("complexity_score", ("Complexity_Score", "Project complexity on a 1-10 scale.")),
    ("stakeholder_count", ("Stakeholder_Count", "Number of stakeholders involved.")),
    ("past_similar_projects", ("Past_Similar_Projects", "Team/company experience with similar work.")),
    ("external_dependencies", ("External_Dependencies_Count", "Number of outside vendors/systems.")),
    ("change_request_frequency", ("Change_Request_Frequency", "Expected/observed change request rate.")),
    ("team_turnover_rate", ("Team_Turnover_Rate", "Share of team turnover, 0.0-1.0.")),
    ("vendor_reliability", ("Vendor_Reliability_Score", "Vendor reliability, 0.0-1.0.")),
    ("schedule_pressure", ("Schedule_Pressure", "Schedule compression pressure, 0.0-1.0.")),
    ("budget_utilization", ("Budget_Utilization_Rate", "Actual/planned spend ratio.")),
    ("resource_availability", ("Resource_Availability", "Resource availability, 0.0-1.0.")),
    ("success_rate", ("Previous_Delivery_Success_Rate", "Previous delivery success rate, 0.0-1.0.")),
    ("technical_debt", ("Technical_Debt_Level", "Technical debt level, 0.0-1.0.")),
    ("team_experience", ("Team_Experience_Level", "Ordinal: Junior=0, Mixed=1, Senior=2, Expert=3.")),
    ("requirement_stability", ("Requirement_Stability", "Ordinal: Volatile=0, Moderate=1, Stable=2.")),
    ("risk_management_maturity", ("Risk_Management_Maturity", "Ordinal: Basic=0, Formal=1, Advanced=2.")),
    ("documentation_quality", ("Documentation_Quality", "Ordinal: Poor=0, Basic=1, Good=2, Excellent=3.")),
    ("budget_per_person", ("budget_usd / team_size", "Engineered: resource capacity per person.")),
    ("timeline_pressure", ("complexity_score / duration_months", "Engineered: complexity per time unit.")),
    ("team_effectiveness", ("team_experience * success_rate", "Engineered: team maturity combined with track record.")),
])


def pct(value: float) -> str:
    return f"{value * 100:.2f}%"


def load_raw_dataset() -> pd.DataFrame:
    if not CSV_PATH.exists():
        print(f"[ERROR] CSV not found: {CSV_PATH}", file=sys.stderr)
        sys.exit(1)
    df = pd.read_csv(CSV_PATH)
    print(f"[EDA] Loaded {len(df)} rows, {len(df.columns)} columns.")
    return df


def preprocess(raw_df: pd.DataFrame) -> tuple[pd.DataFrame, dict]:
    required = list(CSV_COL_MAP.keys()) + ["Risk_Level"]
    missing = [col for col in required if col not in raw_df.columns]
    if missing:
        raise ValueError(f"Missing required CSV columns: {missing}")

    df = raw_df[required].copy().rename(columns=CSV_COL_MAP)

    for feature, mapping in ENCODING_MAPS.items():
        df[feature] = df[feature].map(mapping)

    df["risk"] = df["Risk_Level"].map(LABEL_MAP)
    df["budget_per_person"] = df["budget_usd"] / df["team_size"].clip(lower=1)
    df["timeline_pressure"] = df["complexity_score"] / df["duration_months"].clip(lower=1)
    df["team_effectiveness"] = df["team_experience"] * df["success_rate"]

    before = len(df)
    df = df.dropna(subset=MODEL_INPUT_FEATURES + ["risk"]).copy()
    dropped = before - len(df)

    class_counts = df["risk"].value_counts().sort_index().to_dict()
    eda = {
        "raw_rows": int(len(raw_df)),
        "raw_columns": int(len(raw_df.columns)),
        "clean_rows": int(len(df)),
        "dropped_rows": int(dropped),
        "raw_label_counts": raw_df["Risk_Level"].value_counts().to_dict(),
        "merged_label_counts": {RISK_LABELS[k]: int(v) for k, v in class_counts.items()},
        "missing_selected_values": raw_df[list(CSV_COL_MAP.keys())].isna().sum().to_dict(),
    }

    print(
        "[PREPROCESS] Clean dataset: "
        + f"{len(df)} rows | "
        + " | ".join(f"{RISK_LABELS[k]}={v}" for k, v in class_counts.items())
    )
    return df, eda


def make_baseline_models() -> OrderedDict[str, object]:
    return OrderedDict([
        ("KNN", KNeighborsClassifier(n_neighbors=11)),
        ("LogisticRegression", LogisticRegression(max_iter=2000, class_weight="balanced", random_state=RANDOM_STATE)),
        ("DecisionTree", DecisionTreeClassifier(max_depth=8, class_weight="balanced", random_state=RANDOM_STATE)),
        ("RandomForest", RandomForestClassifier(n_estimators=400, class_weight="balanced", random_state=RANDOM_STATE, n_jobs=-1)),
        ("XGBoost", XGBClassifier(
            n_estimators=500,
            max_depth=4,
            learning_rate=0.05,
            subsample=0.8,
            colsample_bytree=0.8,
            eval_metric="mlogloss",
            random_state=RANDOM_STATE,
            n_jobs=-1,
            verbosity=0,
        )),
    ])


def make_baseline_pipeline(model: object) -> Pipeline:
    return Pipeline([
        ("scaler", StandardScaler()),
        ("select", SelectKBest(score_func=f_classif, k="all")),
        ("model", model),
    ])


def make_grid_spaces() -> OrderedDict[str, tuple[object, dict]]:
    k_values = [10, 12, 15, "all"]
    return OrderedDict([
        ("KNN", (
            KNeighborsClassifier(),
            {
                "select__k": k_values,
                "model__n_neighbors": [7, 11, 15],
                "model__weights": ["uniform", "distance"],
            },
        )),
        ("LogisticRegression", (
            LogisticRegression(max_iter=2500, random_state=RANDOM_STATE),
            {
                "select__k": k_values,
                "model__C": [0.1, 1.0, 3.0],
                "model__class_weight": [None, "balanced"],
            },
        )),
        ("DecisionTree", (
            DecisionTreeClassifier(class_weight="balanced", random_state=RANDOM_STATE),
            {
                "select__k": k_values,
                "model__max_depth": [4, 6, 8, 10],
                "model__min_samples_leaf": [1, 3, 5],
            },
        )),
        ("RandomForest", (
            RandomForestClassifier(n_estimators=400, class_weight="balanced", random_state=RANDOM_STATE, n_jobs=-1),
            {
                "select__k": k_values,
                "model__max_depth": [None, 12, 18],
                "model__min_samples_leaf": [1, 3, 5],
                "model__max_features": ["sqrt", 0.7],
            },
        )),
        ("XGBoost", (
            XGBClassifier(eval_metric="mlogloss", random_state=RANDOM_STATE, n_jobs=-1, verbosity=0),
            {
                "select__k": k_values,
                "model__n_estimators": [300, 500],
                "model__max_depth": [3, 4],
                "model__learning_rate": [0.03, 0.05],
                "model__subsample": [0.8, 1.0],
                "model__colsample_bytree": [0.8],
            },
        )),
    ])


def selected_features_from_pipeline(pipeline: Pipeline) -> list[str]:
    selector = pipeline.named_steps["select"]
    mask = selector.get_support()
    return [feature for feature, selected in zip(MODEL_INPUT_FEATURES, mask) if selected]


def evaluate_pipeline(name: str, pipeline: Pipeline, X_test, y_test) -> dict:
    y_pred = pipeline.predict(X_test)
    return {
        "name": name,
        "pipeline": pipeline,
        "accuracy": accuracy_score(y_test, y_pred),
        "predictions": y_pred,
        "report": classification_report(y_test, y_pred, target_names=["low", "medium", "high"], output_dict=True),
        "cm": confusion_matrix(y_test, y_pred),
        "selected_features": selected_features_from_pipeline(pipeline),
    }


def run_baselines(X_train, X_test, y_train, y_test) -> OrderedDict[str, dict]:
    results = OrderedDict()
    print("[BASELINE] Training 5 baseline models...")
    for name, model in make_baseline_models().items():
        pipeline = make_baseline_pipeline(clone(model))
        pipeline.fit(X_train, y_train)
        result = evaluate_pipeline(name, pipeline, X_test, y_test)
        results[name] = result
        print(f"[BASELINE] {name}: {pct(result['accuracy'])}")
    return results


def run_grid_search(X_train, X_test, y_train, y_test) -> OrderedDict[str, dict]:
    results = OrderedDict()
    print("[GRID] Fine-tuning 5 models with GridSearchCV + SelectKBest...")
    for name, (model, param_grid) in make_grid_spaces().items():
        pipeline = make_baseline_pipeline(model)
        search = GridSearchCV(
            estimator=pipeline,
            param_grid=param_grid,
            scoring="accuracy",
            cv=CV,
            n_jobs=-1,
            refit=True,
            verbose=0,
        )
        print(f"[GRID] {name}...", end=" ", flush=True)
        search.fit(X_train, y_train)
        result = evaluate_pipeline(name, search.best_estimator_, X_test, y_test)
        result["cv_score"] = float(search.best_score_)
        result["best_params"] = search.best_params_
        results[name] = result
        print(f"CV={pct(search.best_score_)} Test={pct(result['accuracy'])}")
    return results


def feature_score_table(X_train, y_train) -> pd.DataFrame:
    selector = SelectKBest(score_func=f_classif, k="all")
    selector.fit(X_train, y_train)
    scores = pd.DataFrame({
        "feature": MODEL_INPUT_FEATURES,
        "score": selector.scores_,
        "p_value": selector.pvalues_,
    }).sort_values("score", ascending=False)
    scores["rank"] = np.arange(1, len(scores) + 1)
    return scores[["rank", "feature", "score", "p_value"]]


def save_plots(best_result: dict, tuned_results: OrderedDict[str, dict], feature_scores: pd.DataFrame) -> dict:
    paths = {}
    if not PLOTS_AVAILABLE:
        print("[PLOTS] matplotlib unavailable; skipping plot generation.")
        return paths

    fig, ax = plt.subplots(figsize=(10, 8))
    top_scores = feature_scores.head(18).sort_values("score")
    ax.barh(top_scores["feature"], top_scores["score"], color="#2563eb")
    ax.set_title("SelectKBest ANOVA F-score (top features)")
    ax.set_xlabel("F-score")
    fig.tight_layout()
    out = OUTPUT_DIR / "selectkbest_scores.png"
    fig.savefig(out, dpi=160)
    plt.close(fig)
    paths["selectkbest_scores"] = str(out.relative_to(BASE_DIR))

    tree_pipeline = tuned_results.get("DecisionTree", {}).get("pipeline")
    if tree_pipeline is not None:
        selected = selected_features_from_pipeline(tree_pipeline)
        tree = tree_pipeline.named_steps["model"]
        fig, ax = plt.subplots(figsize=(20, 10))
        plot_tree(
            tree,
            feature_names=selected,
            class_names=["low", "medium", "high"],
            filled=True,
            rounded=True,
            max_depth=3,
            fontsize=8,
            ax=ax,
        )
        ax.set_title("Decision Tree visualization (first 3 levels)")
        fig.tight_layout()
        out = OUTPUT_DIR / "decision_tree_visualization.png"
        fig.savefig(out, dpi=160)
        plt.close(fig)
        paths["decision_tree"] = str(out.relative_to(BASE_DIR))

    rf_pipeline = tuned_results.get("RandomForest", {}).get("pipeline")
    if rf_pipeline is not None:
        selected = selected_features_from_pipeline(rf_pipeline)
        rf = rf_pipeline.named_steps["model"]
        importances = pd.DataFrame({
            "feature": selected,
            "importance": rf.feature_importances_,
        }).sort_values("importance", ascending=False)
        importances.to_csv(OUTPUT_DIR / "random_forest_feature_importance.csv", index=False)

        fig, ax = plt.subplots(figsize=(10, 8))
        top_importance = importances.head(18).sort_values("importance")
        ax.barh(top_importance["feature"], top_importance["importance"], color="#16a34a")
        ax.set_title("Random Forest feature importance")
        ax.set_xlabel("Importance")
        fig.tight_layout()
        out = OUTPUT_DIR / "random_forest_feature_importance.png"
        fig.savefig(out, dpi=160)
        plt.close(fig)
        paths["random_forest_importance"] = str(out.relative_to(BASE_DIR))

    fig, ax = plt.subplots(figsize=(7, 6))
    ConfusionMatrixDisplay(
        confusion_matrix=best_result["cm"],
        display_labels=["low", "medium", "high"],
    ).plot(ax=ax, cmap="Blues", colorbar=False)
    ax.set_title(f"Final confusion matrix - {best_result['name']}")
    fig.tight_layout()
    out = OUTPUT_DIR / "final_confusion_matrix.png"
    fig.savefig(out, dpi=160)
    plt.close(fig)
    paths["final_confusion_matrix"] = str(out.relative_to(BASE_DIR))

    return paths


def markdown_table(rows: list[list[object]], headers: list[str]) -> str:
    table = ["| " + " | ".join(headers) + " |", "|" + "|".join(["---"] * len(headers)) + "|"]
    for row in rows:
        table.append("| " + " | ".join(str(value) for value in row) + " |")
    return "\n".join(table)


def format_report(result: dict) -> str:
    rows = []
    for label in ["low", "medium", "high"]:
        metrics = result["report"].get(label, {})
        rows.append([
            label.capitalize(),
            f"{metrics.get('precision', 0):.3f}",
            f"{metrics.get('recall', 0):.3f}",
            f"{metrics.get('f1-score', 0):.3f}",
            int(metrics.get("support", 0)),
        ])
    rows.append(["Overall", "-", "-", "-", f"Acc: {pct(result['accuracy'])}"])
    return markdown_table(rows, ["Class", "Precision", "Recall", "F1", "Support"])


def format_cm(result: dict) -> str:
    cm = result["cm"]
    rows = []
    for i, label in enumerate(["Low", "Medium", "High"]):
        row = cm[i] if i < len(cm) else [0, 0, 0]
        rows.append([f"**{label}**", int(row[0]), int(row[1]), int(row[2])])
    return markdown_table(rows, ["Actual \\ Predicted", "Low", "Medium", "High"])


def write_report(
    eda: dict,
    feature_scores: pd.DataFrame,
    baseline_results: OrderedDict[str, dict],
    tuned_results: OrderedDict[str, dict],
    best_result: dict,
    plots: dict,
    train_size: int,
    test_size: int,
) -> None:
    feature_rows = [[feature, source, note] for feature, (source, note) in FEATURE_DESCRIPTIONS.items()]
    baseline_rows = [[name, pct(result["accuracy"])] for name, result in baseline_results.items()]
    tuned_rows = [
        [name, pct(result["accuracy"]), pct(result.get("cv_score", 0)), ", ".join(result["selected_features"])]
        for name, result in tuned_results.items()
    ]
    score_rows = [
        [int(row.rank), row.feature, f"{row.score:.3f}", f"{row.p_value:.3g}"]
        for row in feature_scores.head(15).itertuples(index=False)
    ]

    plot_lines = [f"- `{path}` ({label.replace('_', ' ')})" for label, path in plots.items()]
    if not plot_lines:
        plot_lines.append("- Plot generation skipped because matplotlib is not installed.")

    report = f"""# ML Risk Prediction - Model Report

Generated automatically by `train_risk_model.py`.

---

## 1. Goal

Predict the risk level of a project using a supervised classification model trained on the real CSV dataset. The target is `Risk_Level`. The original labels `High` and `Critical` are merged into one `high` class so the application predicts the three levels used in the UI: `low`, `medium`, `high`.

---

## 2. Exploratory Data Analysis (EDA)

| Property | Value |
|---|---|
| Dataset | `project_risk_raw_dataset.csv` |
| Raw rows | {eda['raw_rows']} |
| Raw columns | {eda['raw_columns']} |
| Clean rows used | {eda['clean_rows']} |
| Dropped rows | {eda['dropped_rows']} |
| Candidate input features | {len(MODEL_INPUT_FEATURES)} |
| Train split | {train_size} rows ({int((1 - TEST_SIZE) * 100)}%) |
| Test split | {test_size} rows ({int(TEST_SIZE * 100)}%) |

### Raw Target Distribution

{markdown_table([[k, v] for k, v in eda['raw_label_counts'].items()], ['Original Risk_Level', 'Rows'])}

### Final Target Distribution

{markdown_table([[k, v] for k, v in eda['merged_label_counts'].items()], ['Model class', 'Rows'])}

---

## 3. Preprocessing

1. Selected direct project-risk columns from the CSV instead of using all 51 columns.
2. Encoded ordinal categorical fields:
   - `Team_Experience_Level`: Junior=0, Mixed=1, Senior=2, Expert=3
   - `Requirement_Stability`: Volatile=0, Moderate=1, Stable=2
   - `Risk_Management_Maturity`: Basic=0, Formal=1, Advanced=2
   - `Documentation_Quality`: Poor=0, Basic=1, Good=2, Excellent=3
3. Merged `Critical` into `High` for the application-level three-class target.
4. Added three engineered interaction features.
5. Performed a stratified 80/20 train-test split.
6. StandardScaler is fitted only inside the training pipeline to avoid data leakage.

### Candidate Features

{markdown_table(feature_rows, ['Feature', 'Source / Formula', 'Why it matters'])}

---

## 4. Feature Selection - SelectKBest

`SelectKBest(f_classif)` is used inside GridSearchCV. The grid tests different values of `k` (`10`, `12`, `15`, and `all`) so each model can choose how many features it needs.

### Top SelectKBest Scores

{markdown_table(score_rows, ['Rank', 'Feature', 'F-score', 'p-value'])}

---

## 5. Baseline Modelling (5 Models)

The baseline step trains the required five models using all candidate features without tuning.

{markdown_table(baseline_rows, ['Baseline model', 'Held-out test accuracy'])}

---

## 6. Fine-Tuning with GridSearchCV

Each model is tuned with `GridSearchCV` using 5-fold stratified cross-validation. The pipeline is:

```text
StandardScaler -> SelectKBest -> Model
```

{markdown_table(tuned_rows, ['Tuned model', 'Test accuracy', 'Best CV score', 'Selected features'])}

---

## 7. Decision Tree Visualization and Random Forest Importance

The training script generated these interpretation artifacts:

{chr(10).join(plot_lines)}

The Decision Tree image shows the first three levels of the tuned tree. The Random Forest image ranks the selected features by importance.

---

## 8. Final Selected Model

| Property | Value |
|---|---|
| Best model | {best_result['name']} |
| Test accuracy | {pct(best_result['accuracy'])} |
| Selected feature count | {len(best_result['selected_features'])} |
| Selected features | {', '.join(best_result['selected_features'])} |

### Classification Report

{format_report(best_result)}

### Confusion Matrix

{format_cm(best_result)}

---

## 9. Result and Conclusion

The final model is selected only after comparing the five required baseline models, applying SelectKBest feature selection, and running GridSearchCV fine-tuning. The saved artifact is a full sklearn pipeline, so production inference applies the same scaler, selected feature subset, and classifier learned during training.

This approach improves the earlier limited 10-input model by adding direct project-risk drivers such as change request frequency, team turnover, vendor reliability, schedule pressure, resource availability, technical debt, risk management maturity, and documentation quality. These inputs have a direct operational relationship with project risk and are more relevant than unrelated financial/client columns.

To retrain:

```bash
cd ml
python train_risk_model.py
```
"""

    REPORT_PATH.write_text(report, encoding="utf-8")
    print(f"[REPORT] Written to {REPORT_PATH}")


def save_final_model(best_result: dict, df: pd.DataFrame, train_size: int, test_size: int) -> None:
    feature_defaults = {
        feature: float(df[feature].median())
        for feature in MODEL_INPUT_FEATURES
        if feature in df.columns
    }
    meta = {
        "model_artifact": "pipeline",
        "algorithm": best_result["name"],
        "test_accuracy_pct": round(best_result["accuracy"] * 100, 2),
        "features": MODEL_INPUT_FEATURES,
        "base_features": BASE_FEATURES,
        "engineered_features": ENGINEERED_FEATURES,
        "selected_features": best_result["selected_features"],
        "n_features": len(MODEL_INPUT_FEATURES),
        "selected_feature_count": len(best_result["selected_features"]),
        "feature_defaults": feature_defaults,
        "encoding_maps": ENCODING_MAPS,
        "training_rows": train_size,
        "test_rows": test_size,
        "target_labels": RISK_LABELS,
    }

    joblib.dump(best_result["pipeline"], MODEL_DIR / "risk_model.pkl")
    joblib.dump(best_result["pipeline"].named_steps["scaler"], MODEL_DIR / "risk_scaler.pkl")
    (MODEL_DIR / "risk_meta.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")
    print("[SAVE] Saved models/risk_model.pkl, risk_scaler.pkl, risk_meta.json")


def main() -> None:
    raw_df = load_raw_dataset()
    df, eda = preprocess(raw_df)

    X = df[MODEL_INPUT_FEATURES].values
    y = df["risk"].values.astype(int)

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=TEST_SIZE,
        random_state=RANDOM_STATE,
        stratify=y,
    )
    print(f"[SPLIT] Train={len(y_train)} Test={len(y_test)} Features={X.shape[1]}")

    feature_scores = feature_score_table(X_train, y_train)
    feature_scores.to_csv(OUTPUT_DIR / "selectkbest_scores.csv", index=False)

    baseline_results = run_baselines(X_train, X_test, y_train, y_test)
    tuned_results = run_grid_search(X_train, X_test, y_train, y_test)

    best_name = max(tuned_results, key=lambda name: tuned_results[name]["accuracy"])
    best_result = tuned_results[best_name]
    print(f"[BEST] Winner: {best_name} ({pct(best_result['accuracy'])})")

    plots = save_plots(best_result, tuned_results, feature_scores)
    save_final_model(best_result, df, len(y_train), len(y_test))
    write_report(eda, feature_scores, baseline_results, tuned_results, best_result, plots, len(y_train), len(y_test))

    print(f"ACCURACY:{round(best_result['accuracy'] * 100, 2)}")
    print("DATA_SOURCE:csv")
    print(f"ALGORITHM:{best_name}")
    print(f"SELECTED_FEATURES:{','.join(best_result['selected_features'])}")


if __name__ == "__main__":
    main()
