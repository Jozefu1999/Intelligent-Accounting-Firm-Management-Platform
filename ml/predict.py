"""
Predict risk level for a project.
Called from Node.js via child_process.

Input JSON keys:
  annual_revenue   : float
  estimated_budget : float
  sector_code      : int OR sector name string (e.g. "finance")

Usage:
    python predict.py '{"annual_revenue": 500000, "estimated_budget": 80000, "sector_code": 7}'
    python predict.py '[500000, 80000, 7]'   # legacy array format
"""

import sys
import json
import joblib
import os

# Add ml/ directory to path for shared constants
sys.path.insert(0, os.path.dirname(__file__))
from constants import RISK_LABELS, sector_name_to_code


def load_models():
    base = os.path.dirname(__file__)
    model_path = os.path.join(base, 'models', 'risk_model.pkl')
    scaler_path = os.path.join(base, 'models', 'risk_scaler.pkl')

    model = joblib.load(model_path)
    # Scaler is optional (older models may not have one)
    scaler = joblib.load(scaler_path) if os.path.exists(scaler_path) else None
    return model, scaler


def predict_risk(annual_revenue, estimated_budget, sector):
    model, scaler = load_models()

    sector_code = sector_name_to_code(sector)
    features = [float(annual_revenue), float(estimated_budget), float(sector_code)]

    X = [features]
    if scaler is not None:
        X = scaler.transform(X)

    prediction = model.predict(X)[0]
    probabilities = model.predict_proba(X)[0]

    # Map class indices to probability dict safely
    classes = list(model.classes_)
    prob_dict = {RISK_LABELS.get(int(c), str(c)): round(float(probabilities[i]), 4)
                 for i, c in enumerate(classes)}

    # Ensure all three keys exist
    for key in ('low', 'medium', 'high'):
        prob_dict.setdefault(key, 0.0)

    return {
        'risk_level': RISK_LABELS.get(int(prediction), 'unknown'),
        'score': round(float(probabilities.max()), 4),
        'probabilities': prob_dict,
        'sector_code': sector_code,
    }


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'No features provided'}))
        sys.exit(1)

    try:
        raw = json.loads(sys.argv[1])
        if isinstance(raw, list):
            # Legacy array format: [annual_revenue, estimated_budget, sector_code]
            annual_revenue, estimated_budget, sector = raw[0], raw[1], raw[2]
        else:
            annual_revenue = raw['annual_revenue']
            estimated_budget = raw['estimated_budget']
            sector = raw.get('sector_code', raw.get('sector', 5))

        result = predict_risk(annual_revenue, estimated_budget, sector)
        print(json.dumps(result))
    except Exception as exc:
        print(json.dumps({'error': str(exc)}))
        sys.exit(1)
