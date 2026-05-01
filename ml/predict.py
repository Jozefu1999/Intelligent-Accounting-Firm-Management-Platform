"""
Predict risk level for a project.
Called from Node.js via child_process.

Input JSON keys:
  team_size             : int    – Team members (required)
  budget_usd            : float  – Project budget in USD/TND (required)
  duration_months       : int    – Duration in months (default: 12)
  complexity_score      : float  – Complexity 1-10 (default: 5)
  stakeholder_count     : int    – Number of stakeholders (default: 8)
  success_rate          : float  – Historical success rate 0.0-1.0 (default: 0.75)
  budget_utilization    : float  – Actual/planned budget ratio 0.6-1.3 (default: 0.95)
  team_experience       : int    – Junior=0, Mixed=1, Senior=2, Expert=3 (default: 1)
  requirement_stability : int    – Volatile=0, Moderate=1, Stable=2 (default: 1)
  external_dependencies : int    – Count of external dependencies (default: 2)

Usage:
    python predict.py '{"team_size": 8, "budget_usd": 400000, ...}'
"""

import json
import os
import sys

import joblib

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

RISK_LABELS = {0: 'low', 1: 'medium', 2: 'high'}

FEATURE_DEFAULTS = {
    'duration_months':       12,
    'complexity_score':      5.0,
    'stakeholder_count':     8,
    'success_rate':          0.75,
    'budget_utilization':    0.95,
    'team_experience':       1,    # Mixed
    'requirement_stability': 1,    # Moderate
    'external_dependencies': 2,
}


def load_models():
    base        = os.path.dirname(os.path.abspath(__file__))
    model_path  = os.path.join(base, 'models', 'risk_model.pkl')
    scaler_path = os.path.join(base, 'models', 'risk_scaler.pkl')
    model  = joblib.load(model_path)
    scaler = joblib.load(scaler_path) if os.path.exists(scaler_path) else None
    return model, scaler


def predict_risk(data: dict):
    model, scaler = load_models()

    features = [
        float(data['team_size']),
        float(data['budget_usd']),
        float(data.get('duration_months',       FEATURE_DEFAULTS['duration_months'])),
        float(data.get('complexity_score',      FEATURE_DEFAULTS['complexity_score'])),
        float(data.get('stakeholder_count',     FEATURE_DEFAULTS['stakeholder_count'])),
        float(data.get('success_rate',          FEATURE_DEFAULTS['success_rate'])),
        float(data.get('budget_utilization',    FEATURE_DEFAULTS['budget_utilization'])),
        float(data.get('team_experience',       FEATURE_DEFAULTS['team_experience'])),
        float(data.get('requirement_stability', FEATURE_DEFAULTS['requirement_stability'])),
        float(data.get('external_dependencies', FEATURE_DEFAULTS['external_dependencies'])),
    ]

    X = [features]
    if scaler is not None:
        X = scaler.transform(X)

    prediction    = model.predict(X)[0]
    probabilities = model.predict_proba(X)[0]

    classes   = list(model.classes_)
    prob_dict = {
        RISK_LABELS.get(int(c), str(c)): round(float(probabilities[i]), 4)
        for i, c in enumerate(classes)
    }
    for key in ('low', 'medium', 'high'):
        prob_dict.setdefault(key, 0.0)

    return {
        'risk_level':    RISK_LABELS.get(int(prediction), 'unknown'),
        'score':         round(float(probabilities.max()), 4),
        'probabilities': prob_dict,
    }


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'No input provided'}))
        sys.exit(1)

    try:
        raw = json.loads(sys.argv[1])
        result = predict_risk(raw)
        print(json.dumps(result))
    except Exception as exc:
        print(json.dumps({'error': str(exc)}))
        sys.exit(1)
