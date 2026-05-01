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

Engineered features (computed automatically if model expects 13 features):
  budget_per_person   = budget_usd / team_size
  timeline_pressure   = complexity_score / duration_months
  team_effectiveness  = team_experience * success_rate

Usage:
    python predict.py '{"team_size": 8, "budget_usd": 400000, ...}'
"""

import json
import os
import sys

import joblib

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
    meta_path   = os.path.join(base, 'models', 'risk_meta.json')
    model  = joblib.load(model_path)
    scaler = joblib.load(scaler_path) if os.path.exists(scaler_path) else None
    meta   = json.load(open(meta_path)) if os.path.exists(meta_path) else {}
    return model, scaler, meta


def predict_risk(data: dict):
    model, scaler, meta = load_models()

    # ── Extract the 10 base inputs ────────────────────────────────────────────
    team_size       = float(data['team_size'])
    budget_usd      = float(data['budget_usd'])
    duration_months = float(data.get('duration_months',       FEATURE_DEFAULTS['duration_months']))
    complexity_score = float(data.get('complexity_score',     FEATURE_DEFAULTS['complexity_score']))
    stakeholder_count = float(data.get('stakeholder_count',   FEATURE_DEFAULTS['stakeholder_count']))
    success_rate    = float(data.get('success_rate',          FEATURE_DEFAULTS['success_rate']))
    budget_util     = float(data.get('budget_utilization',    FEATURE_DEFAULTS['budget_utilization']))
    team_exp        = float(data.get('team_experience',       FEATURE_DEFAULTS['team_experience']))
    req_stability   = float(data.get('requirement_stability', FEATURE_DEFAULTS['requirement_stability']))
    ext_deps        = float(data.get('external_dependencies', FEATURE_DEFAULTS['external_dependencies']))

    features = [
        team_size, budget_usd, duration_months, complexity_score,
        stakeholder_count, success_rate, budget_util,
        team_exp, req_stability, ext_deps,
    ]

    # ── Append engineered features if the saved model expects 13 ─────────────
    n_features = meta.get('n_features', 10)
    if n_features >= 13:
        budget_per_person  = budget_usd / max(team_size, 1)
        timeline_pressure  = complexity_score / max(duration_months, 1)
        team_effectiveness = team_exp * success_rate
        features += [budget_per_person, timeline_pressure, team_effectiveness]

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
