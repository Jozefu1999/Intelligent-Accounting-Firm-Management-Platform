"""
Predict risk level for a project.
Called from Node.js via child_process.

The saved model is a sklearn Pipeline:
StandardScaler -> SelectKBest -> final classifier.

The frontend/backend provide direct project-risk inputs. Three engineered features are
computed here before inference so production matches training.
"""

from __future__ import annotations

import json
import os
import sys
from typing import Any

import joblib

RISK_LABELS = {0: "low", 1: "medium", 2: "high"}

BASE_FEATURES = [
    "team_size",
    "budget_usd",
    "duration_months",
    "complexity_score",
    "stakeholder_count",
    "past_similar_projects",
    "external_dependencies",
    "change_request_frequency",
    "team_turnover_rate",
    "vendor_reliability",
    "schedule_pressure",
    "budget_utilization",
    "resource_availability",
    "success_rate",
    "technical_debt",
    "team_experience",
    "requirement_stability",
    "risk_management_maturity",
    "documentation_quality",
]

ENGINEERED_FEATURES = [
    "budget_per_person",
    "timeline_pressure",
    "team_effectiveness",
]

DEFAULTS = {
    "team_size": 13,
    "budget_usd": 1_000_000,
    "duration_months": 17,
    "complexity_score": 6.0,
    "stakeholder_count": 10,
    "past_similar_projects": 2,
    "external_dependencies": 3,
    "change_request_frequency": 1.37,
    "team_turnover_rate": 0.27,
    "vendor_reliability": 0.73,
    "schedule_pressure": 0.0,
    "budget_utilization": 0.94,
    "resource_availability": 0.65,
    "success_rate": 0.77,
    "technical_debt": 0.0,
    "team_experience": 1,
    "requirement_stability": 1,
    "risk_management_maturity": 1,
    "documentation_quality": 1,
}

VALUE_MAPS = {
    "team_experience": {"junior": 0, "mixed": 1, "senior": 2, "expert": 3},
    "requirement_stability": {"volatile": 0, "moderate": 1, "stable": 2},
    "risk_management_maturity": {"basic": 0, "formal": 1, "advanced": 2},
    "documentation_quality": {"poor": 0, "basic": 1, "good": 2, "excellent": 3},
}


def load_artifacts():
    base = os.path.dirname(os.path.abspath(__file__))
    model_path = os.path.join(base, "models", "risk_model.pkl")
    meta_path = os.path.join(base, "models", "risk_meta.json")

    model = joblib.load(model_path)
    meta = {}
    if os.path.exists(meta_path):
        with open(meta_path, encoding="utf-8") as handle:
            meta = json.load(handle)
    return model, meta


def coerce_feature(name: str, raw_value: Any, defaults: dict[str, float]) -> float:
    if raw_value is None or raw_value == "":
        return float(defaults.get(name, DEFAULTS.get(name, 0)))

    if isinstance(raw_value, str) and name in VALUE_MAPS:
        normalized = raw_value.strip().lower()
        if normalized in VALUE_MAPS[name]:
            return float(VALUE_MAPS[name][normalized])

    return float(raw_value)


def build_feature_values(data: dict[str, Any], meta: dict[str, Any]) -> dict[str, float]:
    defaults = {**DEFAULTS, **meta.get("feature_defaults", {})}

    values = {
        name: coerce_feature(name, data.get(name), defaults)
        for name in BASE_FEATURES
    }

    values["budget_per_person"] = values["budget_usd"] / max(values["team_size"], 1)
    values["timeline_pressure"] = values["complexity_score"] / max(values["duration_months"], 1)
    values["team_effectiveness"] = values["team_experience"] * values["success_rate"]
    return values


def predict_risk(data: dict[str, Any]):
    model, meta = load_artifacts()

    if data.get("team_size") is None or data.get("budget_usd") is None:
        raise ValueError("team_size and budget_usd are required")

    feature_values = build_feature_values(data, meta)
    feature_order = meta.get("features") or (BASE_FEATURES + ENGINEERED_FEATURES)
    features = [[feature_values[name] for name in feature_order]]

    prediction = model.predict(features)[0]
    probabilities = model.predict_proba(features)[0]
    classes = list(getattr(model, "classes_", []))

    prob_dict = {
        RISK_LABELS.get(int(label), str(label)): round(float(probabilities[index]), 4)
        for index, label in enumerate(classes)
    }
    for key in ("low", "medium", "high"):
        prob_dict.setdefault(key, 0.0)

    return {
        "risk_level": RISK_LABELS.get(int(prediction), "unknown"),
        "score": round(float(probabilities.max()), 4),
        "probabilities": prob_dict,
        "model": {
            "algorithm": meta.get("algorithm"),
            "accuracy": meta.get("test_accuracy_pct"),
            "selected_features": meta.get("selected_features", []),
        },
    }


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No input provided"}))
        sys.exit(1)

    try:
        payload = json.loads(sys.argv[1])
        print(json.dumps(predict_risk(payload)))
    except Exception as exc:
        print(json.dumps({"error": str(exc)}))
        sys.exit(1)
