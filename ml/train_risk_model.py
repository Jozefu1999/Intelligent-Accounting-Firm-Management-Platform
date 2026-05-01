"""
Train the risk prediction model.

Supports two modes:
  1. DB mode  : reads real project + client data via DB_URL env variable
  2. Synthetic : generates synthetic data as fallback (default)

Features (9):
  annual_revenue       – Client annual revenue in TND
  estimated_budget     – Project budget in TND
  sector_code          – Industry sector (0-10, see constants.py)
  duration_days        – Planned project duration in days
  team_size            – Number of people assigned to the project
  debt_ratio           – Client debt-to-asset ratio (0.0-1.0)
  success_rate         – Historical project success rate (0.0-1.0)
  complexity_score     – Project complexity (1=simple … 5=very complex)
  stakeholder_count    – Number of stakeholders involved

Labels: 0=low, 1=medium, 2=high

Usage:
    python train_risk_model.py                        # synthetic data
    DB_URL=mysql+pymysql://... python train_risk_model.py  # real data
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

from constants import RISK_LABELS, RISK_CODES, sector_name_to_code

MIN_DB_SAMPLES = 30  # Minimum records needed to use DB data

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
    'budget_ratio',   # log1p(estimated_budget / annual_revenue) — key financial stress indicator
]


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
                p.duration_days,
                p.team_size,
                c.debt_ratio,
                c.success_rate,
                p.complexity_score,
                p.stakeholder_count,
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
        # Fill missing optional columns with sensible defaults
        df['duration_days'] = df['duration_days'].fillna(90)
        df['team_size'] = df['team_size'].fillna(3)
        df['debt_ratio'] = df['debt_ratio'].fillna(0.3)
        df['success_rate'] = df['success_rate'].fillna(0.65)
        df['complexity_score'] = df['complexity_score'].fillna(2)
        df['stakeholder_count'] = df['stakeholder_count'].fillna(3)
        df['budget_ratio'] = np.log1p(df['estimated_budget'] / np.maximum(df['annual_revenue'], 1.0))
        return df[FEATURES + ['risk']].dropna()
    except Exception as exc:
        print(f"[DB] Could not load DB data: {exc}. Using synthetic data.", file=sys.stderr)
        return None


def generate_synthetic_data(n_samples=2000):
    """
    Generate synthetic training data with realistic Tunisian market distributions.
    Classes are explicitly balanced (1/3 each) to avoid label imbalance.
    """
    np.random.seed(42)
    n_per_class = n_samples // 3
    frames = []

    for risk_class in [0, 1, 2]:  # 0=low, 1=medium, 2=high
        n = n_per_class

        if risk_class == 0:  # Low risk profile
            annual_revenue = np.random.lognormal(mean=13.0, sigma=0.8, size=n)  # larger firms
            budget_pct = np.random.beta(1.2, 8, size=n) * 0.08              # very low budget/revenue (≤8%)
            debt_ratio = np.random.beta(2, 8, size=n)                       # low debt (mean ~0.2)
            success_rate = np.random.beta(7, 2, size=n)                     # good history (mean ~0.78)
            complexity_score = np.random.choice([1, 2], size=n, p=[0.55, 0.45])
            duration_days = np.random.randint(14, 120, size=n)
            team_size = np.random.randint(2, 15, size=n)
            stakeholder_count = np.random.randint(1, 8, size=n)
            sector_code = np.random.choice([0, 2, 3, 4, 8, 10], size=n)    # safer sectors
            annual_revenue = np.clip(annual_revenue, 20_000, 5_000_000)
            estimated_budget = np.clip(annual_revenue * budget_pct, 1_000, 500_000)

        elif risk_class == 1:  # Medium risk profile
            annual_revenue = np.random.lognormal(mean=12.2, sigma=1.1, size=n)
            budget_pct = np.random.beta(2, 5, size=n) * 0.25               # moderate budget (≤25%)
            debt_ratio = np.random.beta(3, 5, size=n)                       # moderate debt (mean ~0.375)
            success_rate = np.random.beta(4, 3, size=n)                     # average history (mean ~0.57)
            complexity_score = np.random.choice([2, 3, 4], size=n, p=[0.3, 0.45, 0.25])
            duration_days = np.random.randint(60, 300, size=n)
            team_size = np.random.randint(2, 12, size=n)
            stakeholder_count = np.random.randint(2, 14, size=n)
            sector_code = np.random.randint(0, 11, size=n)
            annual_revenue = np.clip(annual_revenue, 20_000, 5_000_000)
            estimated_budget = np.clip(annual_revenue * budget_pct, 1_000, 1_000_000)

        else:  # High risk profile
            annual_revenue = np.random.lognormal(mean=11.0, sigma=1.4, size=n)  # smaller firms
            annual_revenue = np.clip(annual_revenue, 1_000, 500_000)
            # Mix three budget overextension tiers so the model learns:
            #   tier 1 (40%): moderate overrun  — budget is 30-100% of revenue
            #   tier 2 (35%): severe overrun    — budget is 1-100× revenue
            #   tier 3 (25%): catastrophic overrun — budget is 100-5000× revenue
            n1 = int(n * 0.40)
            n2 = int(n * 0.35)
            n3 = n - n1 - n2
            br1 = np.random.beta(3, 3, n1) * 0.70 + 0.30          # 0.30 – 1.00
            br2 = np.random.uniform(1.0, 100.0, n2)                # 1× – 100×
            br3 = np.random.uniform(100.0, 5000.0, n3)             # 100× – 5000×
            budget_ratio_raw = np.concatenate([br1, br2, br3])
            np.random.shuffle(budget_ratio_raw)
            estimated_budget = annual_revenue * budget_ratio_raw
            debt_ratio = np.random.beta(6, 3, size=n)                       # high debt (mean ~0.67)
            success_rate = np.random.beta(2, 6, size=n)                     # poor history (mean ~0.25)
            complexity_score = np.random.choice([3, 4, 5], size=n, p=[0.2, 0.4, 0.4])
            duration_days = np.random.randint(180, 730, size=n)
            team_size = np.random.randint(1, 6, size=n)
            stakeholder_count = np.random.randint(8, 21, size=n)
            sector_code = np.random.choice([1, 7, 9], size=n)              # risky sectors

        budget_ratio_col = np.log1p(estimated_budget / np.maximum(annual_revenue, 1.0))

        frames.append(pd.DataFrame({
            'annual_revenue': annual_revenue,
            'estimated_budget': estimated_budget,
            'sector_code': sector_code.astype(float),
            'duration_days': duration_days.astype(float),
            'team_size': team_size.astype(float),
            'debt_ratio': np.clip(debt_ratio, 0.0, 1.0),
            'success_rate': np.clip(success_rate, 0.0, 1.0),
            'complexity_score': complexity_score.astype(float),
            'stakeholder_count': stakeholder_count.astype(float),
            'budget_ratio': budget_ratio_col,
            'risk': risk_class,
        }))

    df = pd.concat(frames, ignore_index=True)
    return df.sample(frac=1, random_state=42).reset_index(drop=True)


def train(df):
    """Train and return (model, scaler, report_dict)."""
    X = df[FEATURES].values
    y = df['risk'].values

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled, y, test_size=0.2, random_state=42, stratify=y
    )

    model = GradientBoostingClassifier(
        n_estimators=300,
        max_depth=5,
        learning_rate=0.08,
        subsample=0.85,
        random_state=42,
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
        df = generate_synthetic_data(2000)

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
