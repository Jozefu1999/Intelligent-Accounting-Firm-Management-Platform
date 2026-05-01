"""
Predict risk level for a project.
Called from Node.js via child_process.

Input JSON keys (all amounts in TND):
  annual_revenue      : float  – Client annual revenue in TND
  estimated_budget    : float  – Project budget in TND
  sector              : str    – Sector name (e.g. "construction") OR sector_code int
  duration_days       : int    – Planned duration in days (default: 90)
  team_size           : int    – People assigned to project (default: 3)
  debt_ratio          : float  – Client debt ratio 0.0-1.0 (default: 0.3)
  success_rate        : float  – Historical success rate 0.0-1.0 (default: 0.65)
  complexity_score    : int    – Complexity 1-5 (default: 2)
  stakeholder_count   : int    – Number of stakeholders (default: 3)

Usage:
    python predict.py '{"annual_revenue": 200000, "estimated_budget": 40000, "sector": "construction", ...}'
"""

import sys
import json
import joblib
import os

# Add ml/ directory to path for shared constants
sys.path.insert(0, os.path.dirname(__file__))
from constants import RISK_LABELS, sector_name_to_code

FEATURES = [
    'annual_revenue',
    'estimated_budget',
    'sector_code',
    'duration_days',
    'team_size',
    'debt_ratio',
    'success_rate',
    'complexity_score',
    'stakeholder_count',
    'budget_ratio',   # log1p(estimated_budget / annual_revenue)
]

FEATURE_DEFAULTS = {
    'duration_days': 90,
    'team_size': 3,
    'debt_ratio': 0.3,
    'success_rate': 0.65,
    'complexity_score': 2,
    'stakeholder_count': 3,
}


def load_models():
    base = os.path.dirname(__file__)
    model_path = os.path.join(base, 'models', 'risk_model.pkl')
    scaler_path = os.path.join(base, 'models', 'risk_scaler.pkl')

    model = joblib.load(model_path)
    scaler = joblib.load(scaler_path) if os.path.exists(scaler_path) else None
    return model, scaler


def predict_risk(data: dict):
    model, scaler = load_models()

    # Resolve sector name → code
    sector_raw = data.get('sector_code', data.get('sector', 5))
    sector_code = sector_name_to_code(sector_raw)

    # Build feature vector with defaults for optional fields
    annual_revenue = float(data['annual_revenue'])
    estimated_budget = float(data['estimated_budget'])
    budget_ratio = float(__import__('math').log1p(estimated_budget / max(annual_revenue, 1.0)))

    features = [
        annual_revenue,
        estimated_budget,
        float(sector_code),
        float(data.get('duration_days', FEATURE_DEFAULTS['duration_days'])),
        float(data.get('team_size', FEATURE_DEFAULTS['team_size'])),
        float(data.get('debt_ratio', FEATURE_DEFAULTS['debt_ratio'])),
        float(data.get('success_rate', FEATURE_DEFAULTS['success_rate'])),
        float(data.get('complexity_score', FEATURE_DEFAULTS['complexity_score'])),
        float(data.get('stakeholder_count', FEATURE_DEFAULTS['stakeholder_count'])),
        budget_ratio,
    ]

    X = [features]
    if scaler is not None:
        X = scaler.transform(X)

    prediction = model.predict(X)[0]
    probabilities = model.predict_proba(X)[0]

    # Map class indices to probability dict safely
    classes = list(model.classes_)
    prob_dict = {RISK_LABELS.get(int(c), str(c)): round(float(probabilities[i]), 4)
                 for i, c in enumerate(classes)}

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

        # Legacy array format: [annual_revenue, estimated_budget, sector_code]
        if isinstance(raw, list):
            raw = {
                'annual_revenue': raw[0],
                'estimated_budget': raw[1],
                'sector_code': raw[2] if len(raw) > 2 else 5,
            }

        result = predict_risk(raw)
        print(json.dumps(result))
    except Exception as exc:
        print(json.dumps({'error': str(exc)}))
        sys.exit(1)
