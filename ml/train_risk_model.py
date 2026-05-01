"""
Train the risk prediction model.

Supports two modes:
  1. DB mode  : reads real project + client data via DB_URL env variable
  2. Synthetic : generates synthetic data as fallback (default)

Features : annual_revenue, estimated_budget, sector_code
Labels   : 0=low, 1=medium, 2=high

Usage:
    python train_risk_model.py                        # synthetic data
    DB_URL=mysql+pymysql://... python train_risk_model.py  # real data
"""

import os
import sys
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score
from sklearn.preprocessing import StandardScaler
import joblib

from constants import RISK_LABELS, RISK_CODES, sector_name_to_code

MIN_DB_SAMPLES = 30  # Minimum records needed to use DB data


def load_db_data(db_url: str):
    """Attempt to load training data from the database."""
    try:
        import sqlalchemy
        engine = sqlalchemy.create_engine(db_url)
        query = """
            SELECT
                c.annual_revenue,
                p.estimated_budget,
                c.sector,
                c.risk_level
            FROM projects p
            JOIN clients c ON p.client_id = c.id
            WHERE c.annual_revenue IS NOT NULL
              AND p.estimated_budget IS NOT NULL
              AND c.risk_level IS NOT NULL
        """
        df = pd.read_sql(query, engine)
        if len(df) < MIN_DB_SAMPLES:
            print(f"[DB] Only {len(df)} records found (need {MIN_DB_SAMPLES}). Using synthetic data.", file=sys.stderr)
            return None
        print(f"[DB] Loaded {len(df)} real records for training.", file=sys.stderr)
        df['sector_code'] = df['sector'].apply(sector_name_to_code)
        df['risk'] = df['risk_level'].map(RISK_CODES).fillna(1).astype(int)
        return df[['annual_revenue', 'estimated_budget', 'sector_code', 'risk']].dropna()
    except Exception as exc:
        print(f"[DB] Could not load DB data: {exc}. Using synthetic data.", file=sys.stderr)
        return None


def generate_synthetic_data(n_samples=1000):
    """Generate synthetic training data with realistic distributions."""
    np.random.seed(42)

    annual_revenue = np.random.lognormal(mean=12, sigma=1.5, size=n_samples)
    annual_revenue = np.clip(annual_revenue, 10_000, 10_000_000)

    # Budget: between 0.5% and 60% of revenue
    budget_pct = np.random.beta(1.5, 5, size=n_samples) * 0.6
    estimated_budget = annual_revenue * budget_pct
    estimated_budget = np.clip(estimated_budget, 500, 800_000)

    sector_code = np.random.randint(0, 11, size=n_samples)

    budget_ratio = estimated_budget / (annual_revenue + 1)

    # Risk rules
    risk = np.where(
        budget_ratio > 0.30, 2,
        np.where(budget_ratio > 0.10, 1, 0)
    )

    # High-risk sectors (finance=7, real-estate=9) add noise upward
    high_risk_sector = np.isin(sector_code, [7, 9])
    risk = np.clip(risk + np.where(high_risk_sector, 1, 0), 0, 2)

    # Low-revenue clients are inherently riskier
    low_revenue = annual_revenue < 50_000
    risk = np.clip(risk + np.where(low_revenue, 1, 0), 0, 2)

    return pd.DataFrame({
        'annual_revenue': annual_revenue,
        'estimated_budget': estimated_budget,
        'sector_code': sector_code,
        'risk': risk.astype(int),
    })


def train(df):
    """Train and return (model, scaler, report_dict)."""
    X = df[['annual_revenue', 'estimated_budget', 'sector_code']].values
    y = df['risk'].values

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled, y, test_size=0.2, random_state=42, stratify=y
    )

    model = RandomForestClassifier(
        n_estimators=200,
        max_depth=10,
        min_samples_split=5,
        random_state=42,
        class_weight='balanced',
        n_jobs=-1,
    )
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    report = classification_report(
        y_test, y_pred,
        target_names=['low', 'medium', 'high'],
        output_dict=True,
    )
    report['accuracy'] = acc
    return model, scaler, report


def main():
    db_url = os.environ.get('DB_URL', '')
    df = None
    data_source = 'synthetic'

    if db_url:
        df = load_db_data(db_url)
        if df is not None:
            data_source = 'database'

    if df is None:
        print("[TRAIN] Generating synthetic training data...")
        df = generate_synthetic_data(1000)

    print(f"[TRAIN] Training risk model on {len(df)} samples (source: {data_source})...")
    model, scaler, report = train(df)

    os.makedirs('models', exist_ok=True)
    joblib.dump(model, 'models/risk_model.pkl')
    joblib.dump(scaler, 'models/risk_scaler.pkl')

    acc = round(report['accuracy'] * 100, 2)
    print(f"[TRAIN] Accuracy: {acc}%")
    print("[TRAIN] Classification report:")
    for label in ['low', 'medium', 'high']:
        m = report.get(label, {})
        print(f"  {label:8s}  precision={m.get('precision', 0):.2f}  recall={m.get('recall', 0):.2f}  f1={m.get('f1-score', 0):.2f}")
    print(f"[TRAIN] Models saved to models/risk_model.pkl + models/risk_scaler.pkl")
    print(f"ACCURACY:{acc}")     # parsed by Node.js controller
    print(f"DATA_SOURCE:{data_source}")


if __name__ == '__main__':
    main()
