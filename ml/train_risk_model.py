"""
Train a risk prediction model using synthetic data.
The model predicts risk level (low=0, medium=1, high=2) based on:
  - annual_revenue
  - estimated_budget
  - sector_code (numeric encoding of sector)
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
import joblib
import os

# Generate synthetic training data
np.random.seed(42)
n_samples = 500

annual_revenue = np.random.uniform(10000, 5000000, n_samples)
estimated_budget = np.random.uniform(1000, 500000, n_samples)
sector_code = np.random.randint(0, 10, n_samples)

# Risk rules (simplified):
# High risk: low revenue + high budget ratio
# Low risk: high revenue + low budget ratio
budget_ratio = estimated_budget / (annual_revenue + 1)
risk = np.where(
    budget_ratio > 0.3, 2,  # high
    np.where(budget_ratio > 0.1, 1, 0)  # medium / low
)

# Add some noise based on sector
risk = np.clip(risk + np.where(sector_code > 7, 1, 0), 0, 2)

data = pd.DataFrame({
    'annual_revenue': annual_revenue,
    'estimated_budget': estimated_budget,
    'sector_code': sector_code,
    'risk': risk,
})

X = data[['annual_revenue', 'estimated_budget', 'sector_code']]
y = data['risk']

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

model = RandomForestClassifier(n_estimators=100, random_state=42)
model.fit(X_train, y_train)

y_pred = model.predict(X_test)
print("Classification Report:")
print(classification_report(y_test, y_pred, target_names=['low', 'medium', 'high']))

# Save the model next to this script so predict.py can load it reliably
model_dir = os.path.join(os.path.dirname(__file__), 'models')
os.makedirs(model_dir, exist_ok=True)
model_path = os.path.join(model_dir, 'risk_model.pkl')
joblib.dump(model, model_path)
print(f"Model saved to {model_path}")
