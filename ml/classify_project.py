"""
Predict the TYPE of a project using the trained classification model.
Called from Node.js via child_process.

Input JSON keys:
  annual_revenue   : float   — client's annual revenue (EUR)
  estimated_budget : float   — project estimated budget (EUR)
  sector_code      : int|str — numeric sector code or sector name
  priority         : str     — 'low' | 'medium' | 'high'  (default: 'medium')
  duration_days    : int     — project duration in days    (default: 90)

Usage:
    python classify_project.py '{"annual_revenue": 500000, "estimated_budget": 40000, "sector_code": 7, "priority": "high", "duration_days": 120}'
"""

import sys
import json
import joblib
import os

sys.path.insert(0, os.path.dirname(__file__))
from constants import PROJECT_TYPE_LABELS, PRIORITY_CODES, sector_name_to_code


def load_models():
    base = os.path.dirname(__file__)
    model_path = os.path.join(base, 'models', 'classification_model.pkl')
    scaler_path = os.path.join(base, 'models', 'classification_scaler.pkl')

    if not os.path.exists(model_path):
        raise FileNotFoundError(
            "classification_model.pkl not found. Run train_classification_model.py first."
        )

    model = joblib.load(model_path)
    scaler = joblib.load(scaler_path) if os.path.exists(scaler_path) else None
    return model, scaler


def classify_project(annual_revenue, estimated_budget, sector, priority='medium', duration_days=90):
    model, scaler = load_models()

    sector_code = sector_name_to_code(sector)
    priority_code = PRIORITY_CODES.get(str(priority).lower(), 1)
    budget_ratio = float(estimated_budget) / (float(annual_revenue) + 1)

    features = [
        float(annual_revenue),
        float(estimated_budget),
        budget_ratio,
        float(sector_code),
        float(priority_code),
        float(duration_days),
    ]

    X = [features]
    if scaler is not None:
        X = scaler.transform(X)

    prediction = model.predict(X)[0]
    probabilities = model.predict_proba(X)[0]

    classes = list(model.classes_)
    prob_dict = {PROJECT_TYPE_LABELS.get(int(c), str(c)): round(float(probabilities[i]), 4)
                 for i, c in enumerate(classes)}

    # Ensure all five keys exist
    for key in ('creation', 'development', 'audit', 'consulting', 'other'):
        prob_dict.setdefault(key, 0.0)

    predicted_label = PROJECT_TYPE_LABELS.get(int(prediction), 'other')
    confidence = round(float(probabilities.max()), 4)

    # Build a ranked list of types by probability
    ranked = sorted(prob_dict.items(), key=lambda x: x[1], reverse=True)

    return {
        'predicted_type': predicted_label,
        'confidence': confidence,
        'probabilities': prob_dict,
        'ranking': [{'type': t, 'probability': p} for t, p in ranked],
        'sector_code': sector_code,
    }


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'No features provided'}))
        sys.exit(1)

    try:
        raw = json.loads(sys.argv[1])
        result = classify_project(
            annual_revenue=raw['annual_revenue'],
            estimated_budget=raw['estimated_budget'],
            sector=raw.get('sector_code', raw.get('sector', 5)),
            priority=raw.get('priority', 'medium'),
            duration_days=raw.get('duration_days', 90),
        )
        print(json.dumps(result))
    except Exception as exc:
        print(json.dumps({'error': str(exc)}))
        sys.exit(1)
