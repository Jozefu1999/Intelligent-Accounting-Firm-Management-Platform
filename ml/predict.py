"""
Predict risk level for a project.
Called from Node.js via child_process.

Usage:
    python predict.py '[annual_revenue, estimated_budget, sector_code]'
"""

import sys
import json
import joblib
import os

RISK_LABELS = {0: 'low', 1: 'medium', 2: 'high'}

def predict_risk(features):
    model_path = os.path.join(os.path.dirname(__file__), 'models', 'risk_model.pkl')
    model = joblib.load(model_path)

    prediction = model.predict([features])[0]
    probabilities = model.predict_proba([features])[0]

    return {
        'risk_level': RISK_LABELS.get(prediction, 'unknown'),
        'score': round(float(probabilities.max()), 4),
        'probabilities': {
            'low': round(float(probabilities[0]), 4),
            'medium': round(float(probabilities[1]), 4),
            'high': round(float(probabilities[2]), 4),
        }
    }

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'No features provided'}))
        sys.exit(1)

    features = json.loads(sys.argv[1])
    result = predict_risk(features)
    print(json.dumps(result))
