"""
Train the project type classification model.

Predicts the TYPE of a project based on financial and contextual features.

Features:
  - annual_revenue      : client's annual revenue (EUR)
  - estimated_budget    : project estimated budget (EUR)
  - budget_ratio        : budget / annual_revenue
  - sector_code         : numeric sector (0-10)
  - priority_code       : 0=low, 1=medium, 2=high
  - duration_days       : project duration in days (start → due date)

Labels (project type):
  0 = creation
  1 = development
  2 = audit
  3 = consulting
  4 = other

Usage:
    python train_classification_model.py
    DB_URL=mysql+pymysql://... python train_classification_model.py
"""

import os
import sys
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score
from sklearn.preprocessing import StandardScaler
import joblib

from constants import PROJECT_TYPE_LABELS, PROJECT_TYPE_CODES, PRIORITY_CODES, sector_name_to_code

MIN_DB_SAMPLES = 30


def load_db_data(db_url: str):
    """Load real project data from the database."""
    try:
        import sqlalchemy
        engine = sqlalchemy.create_engine(db_url)
        query = """
            SELECT
                c.annual_revenue,
                p.estimated_budget,
                c.sector,
                p.priority,
                p.start_date,
                p.due_date,
                p.type
            FROM projects p
            JOIN clients c ON p.client_id = c.id
            WHERE c.annual_revenue IS NOT NULL
              AND p.estimated_budget IS NOT NULL
              AND p.type IS NOT NULL
              AND p.type != 'other'
        """
        df = pd.read_sql(query, engine)
        if len(df) < MIN_DB_SAMPLES:
            print(f"[DB] Only {len(df)} typed records. Using synthetic data.", file=sys.stderr)
            return None
        print(f"[DB] Loaded {len(df)} real project records.", file=sys.stderr)

        df['sector_code'] = df['sector'].apply(sector_name_to_code)
        df['priority_code'] = df['priority'].map(PRIORITY_CODES).fillna(1).astype(int)
        df['type_code'] = df['type'].map(PROJECT_TYPE_CODES).fillna(4).astype(int)

        df['start_date'] = pd.to_datetime(df['start_date'], errors='coerce')
        df['due_date'] = pd.to_datetime(df['due_date'], errors='coerce')
        df['duration_days'] = (df['due_date'] - df['start_date']).dt.days.fillna(90)

        df['budget_ratio'] = df['estimated_budget'] / (df['annual_revenue'] + 1)

        cols = ['annual_revenue', 'estimated_budget', 'budget_ratio',
                'sector_code', 'priority_code', 'duration_days', 'type_code']
        return df[cols].dropna()
    except Exception as exc:
        print(f"[DB] Error: {exc}. Using synthetic data.", file=sys.stderr)
        return None


def generate_synthetic_data(n_samples=1200):
    """
    Generate synthetic project data.

    Rules:
      - creation   : new company, small-medium revenue, moderate budget, short duration
      - development: medium-large revenue, larger budget, long duration
      - audit      : all sizes, small budget, short duration, finance/manufacturing sector
      - consulting : service/finance sectors, medium budget, medium duration
      - other      : random
    """
    np.random.seed(0)
    rows = []
    types_per_class = n_samples // 5

    # --- creation ---
    rev = np.random.lognormal(11, 1.2, types_per_class)
    rev = np.clip(rev, 10_000, 500_000)
    bud = rev * np.random.uniform(0.05, 0.25, types_per_class)
    sec = np.random.choice([0, 1, 3, 5, 6], types_per_class)
    pri = np.random.choice([1, 2], types_per_class)
    dur = np.random.randint(30, 180, types_per_class)
    for i in range(types_per_class):
        rows.append([rev[i], bud[i], bud[i] / (rev[i] + 1), sec[i], pri[i], dur[i], 0])

    # --- development ---
    rev = np.random.lognormal(13, 1.0, types_per_class)
    rev = np.clip(rev, 100_000, 5_000_000)
    bud = rev * np.random.uniform(0.10, 0.40, types_per_class)
    sec = np.random.choice([1, 2, 6, 3], types_per_class)
    pri = np.random.choice([1, 2], types_per_class)
    dur = np.random.randint(90, 540, types_per_class)
    for i in range(types_per_class):
        rows.append([rev[i], bud[i], bud[i] / (rev[i] + 1), sec[i], pri[i], dur[i], 1])

    # --- audit ---
    rev = np.random.lognormal(12, 1.5, types_per_class)
    rev = np.clip(rev, 50_000, 8_000_000)
    bud = rev * np.random.uniform(0.01, 0.08, types_per_class)
    sec = np.random.choice([2, 7, 3, 8], types_per_class)
    pri = np.random.choice([0, 1], types_per_class)
    dur = np.random.randint(14, 90, types_per_class)
    for i in range(types_per_class):
        rows.append([rev[i], bud[i], bud[i] / (rev[i] + 1), sec[i], pri[i], dur[i], 2])

    # --- consulting ---
    rev = np.random.lognormal(12, 1.2, types_per_class)
    rev = np.clip(rev, 80_000, 3_000_000)
    bud = rev * np.random.uniform(0.05, 0.20, types_per_class)
    sec = np.random.choice([7, 10, 6, 8], types_per_class)
    pri = np.random.choice([1, 2], types_per_class)
    dur = np.random.randint(30, 270, types_per_class)
    for i in range(types_per_class):
        rows.append([rev[i], bud[i], bud[i] / (rev[i] + 1), sec[i], pri[i], dur[i], 3])

    # --- other ---
    rev = np.random.lognormal(12, 1.8, types_per_class)
    rev = np.clip(rev, 10_000, 8_000_000)
    bud = rev * np.random.uniform(0.01, 0.50, types_per_class)
    sec = np.random.randint(0, 11, types_per_class)
    pri = np.random.randint(0, 3, types_per_class)
    dur = np.random.randint(7, 730, types_per_class)
    for i in range(types_per_class):
        rows.append([rev[i], bud[i], bud[i] / (rev[i] + 1), sec[i], pri[i], dur[i], 4])

    cols = ['annual_revenue', 'estimated_budget', 'budget_ratio',
            'sector_code', 'priority_code', 'duration_days', 'type_code']
    return pd.DataFrame(rows, columns=cols)


def train(df):
    """Train and return (model, scaler, report)."""
    feature_cols = ['annual_revenue', 'estimated_budget', 'budget_ratio',
                    'sector_code', 'priority_code', 'duration_days']
    X = df[feature_cols].values
    y = df['type_code'].values

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled, y, test_size=0.2, random_state=42, stratify=y
    )

    model = GradientBoostingClassifier(
        n_estimators=200,
        max_depth=5,
        learning_rate=0.1,
        random_state=42,
    )
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    report = classification_report(
        y_test, y_pred,
        target_names=['creation', 'development', 'audit', 'consulting', 'other'],
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
        print("[TRAIN] Generating synthetic project classification data...")
        df = generate_synthetic_data(1200)

    print(f"[TRAIN] Training project classification model on {len(df)} samples (source: {data_source})...")
    model, scaler, report = train(df)

    os.makedirs('models', exist_ok=True)
    joblib.dump(model, 'models/classification_model.pkl')
    joblib.dump(scaler, 'models/classification_scaler.pkl')

    acc = round(report['accuracy'] * 100, 2)
    print(f"[TRAIN] Accuracy: {acc}%")
    print("[TRAIN] Per-class metrics:")
    for label in ['creation', 'development', 'audit', 'consulting', 'other']:
        m = report.get(label, {})
        print(f"  {label:12s}  precision={m.get('precision', 0):.2f}  recall={m.get('recall', 0):.2f}  f1={m.get('f1-score', 0):.2f}")
    print(f"[TRAIN] Models saved to models/classification_model.pkl + models/classification_scaler.pkl")
    print(f"ACCURACY:{acc}")
    print(f"DATA_SOURCE:{data_source}")


if __name__ == '__main__':
    main()
