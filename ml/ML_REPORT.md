# ML Risk Prediction - Model Report

Generated automatically by `train_risk_model.py`.

---

## 1. Goal

Predict the risk level of a project using a supervised classification model trained on the real CSV dataset. The target is `Risk_Level`. The original labels `High` and `Critical` are merged into one `high` class so the application predicts the three levels used in the UI: `low`, `medium`, `high`.

---

## 2. Exploratory Data Analysis (EDA)

| Property | Value |
|---|---|
| Dataset | `project_risk_raw_dataset.csv` |
| Raw rows | 4000 |
| Raw columns | 51 |
| Clean rows used | 3209 |
| Dropped rows | 791 |
| Candidate input features | 22 |
| Train split | 2567 rows (80%) |
| Test split | 642 rows (20%) |

### Raw Target Distribution

| Original Risk_Level | Rows |
|---|---|
| Medium | 1396 |
| High | 1036 |
| Low | 806 |
| Critical | 762 |

### Final Target Distribution

| Model class | Rows |
|---|---|
| low | 751 |
| medium | 1173 |
| high | 1285 |

---

## 3. Preprocessing

1. Selected direct project-risk columns from the CSV instead of using all 51 columns.
2. Encoded ordinal categorical fields:
   - `Team_Experience_Level`: Junior=0, Mixed=1, Senior=2, Expert=3
   - `Requirement_Stability`: Volatile=0, Moderate=1, Stable=2
   - `Risk_Management_Maturity`: Basic=0, Formal=1, Advanced=2
   - `Documentation_Quality`: Poor=0, Basic=1, Good=2, Excellent=3
3. Merged `Critical` into `High` for the application-level three-class target.
4. Added three engineered interaction features.
5. Performed a stratified 80/20 train-test split.
6. StandardScaler is fitted only inside the training pipeline to avoid data leakage.

### Candidate Features

| Feature | Source / Formula | Why it matters |
|---|---|---|
| team_size | Team_Size | Number of people on the project. |
| budget_usd | Project_Budget_USD | Project budget amount. |
| duration_months | Estimated_Timeline_Months | Planned duration in months. |
| complexity_score | Complexity_Score | Project complexity on a 1-10 scale. |
| stakeholder_count | Stakeholder_Count | Number of stakeholders involved. |
| past_similar_projects | Past_Similar_Projects | Team/company experience with similar work. |
| external_dependencies | External_Dependencies_Count | Number of outside vendors/systems. |
| change_request_frequency | Change_Request_Frequency | Expected/observed change request rate. |
| team_turnover_rate | Team_Turnover_Rate | Share of team turnover, 0.0-1.0. |
| vendor_reliability | Vendor_Reliability_Score | Vendor reliability, 0.0-1.0. |
| schedule_pressure | Schedule_Pressure | Schedule compression pressure, 0.0-1.0. |
| budget_utilization | Budget_Utilization_Rate | Actual/planned spend ratio. |
| resource_availability | Resource_Availability | Resource availability, 0.0-1.0. |
| success_rate | Previous_Delivery_Success_Rate | Previous delivery success rate, 0.0-1.0. |
| technical_debt | Technical_Debt_Level | Technical debt level, 0.0-1.0. |
| team_experience | Team_Experience_Level | Ordinal: Junior=0, Mixed=1, Senior=2, Expert=3. |
| requirement_stability | Requirement_Stability | Ordinal: Volatile=0, Moderate=1, Stable=2. |
| risk_management_maturity | Risk_Management_Maturity | Ordinal: Basic=0, Formal=1, Advanced=2. |
| documentation_quality | Documentation_Quality | Ordinal: Poor=0, Basic=1, Good=2, Excellent=3. |
| budget_per_person | budget_usd / team_size | Engineered: resource capacity per person. |
| timeline_pressure | complexity_score / duration_months | Engineered: complexity per time unit. |
| team_effectiveness | team_experience * success_rate | Engineered: team maturity combined with track record. |

---

## 4. Feature Selection - SelectKBest

`SelectKBest(f_classif)` is used inside GridSearchCV. The grid tests different values of `k` (`10`, `12`, `15`, and `all`) so each model can choose how many features it needs.

### Top SelectKBest Scores

| Rank | Feature | F-score | p-value |
|---|---|---|---|
| 1 | team_effectiveness | 190.917 | 5.11e-78 |
| 2 | team_experience | 166.144 | 1.42e-68 |
| 3 | complexity_score | 154.031 | 6.74e-64 |
| 4 | duration_months | 99.256 | 3.03e-42 |
| 5 | risk_management_maturity | 91.700 | 3.43e-39 |
| 6 | external_dependencies | 76.219 | 7e-33 |
| 7 | team_turnover_rate | 71.139 | 8.54e-31 |
| 8 | budget_usd | 43.251 | 3.36e-19 |
| 9 | past_similar_projects | 42.312 | 8.33e-19 |
| 10 | team_size | 35.133 | 8.86e-16 |
| 11 | success_rate | 30.749 | 6.36e-14 |
| 12 | stakeholder_count | 29.952 | 1.39e-13 |
| 13 | requirement_stability | 23.625 | 6.81e-11 |
| 14 | documentation_quality | 17.847 | 2.01e-08 |
| 15 | resource_availability | 13.419 | 1.59e-06 |

---

## 5. Baseline Modelling (5 Models)

The baseline step trains the required five models using all candidate features without tuning.

| Baseline model | Held-out test accuracy |
|---|---|
| KNN | 52.02% |
| LogisticRegression | 53.58% |
| DecisionTree | 48.91% |
| RandomForest | 55.61% |
| XGBoost | 57.32% |

---

## 6. Fine-Tuning with GridSearchCV

Each model is tuned with `GridSearchCV` using 5-fold stratified cross-validation. The pipeline is:

```text
StandardScaler -> SelectKBest -> Model
```

| Tuned model | Test accuracy | Best CV score | Selected features |
|---|---|---|---|
| KNN | 52.49% | 52.79% | team_size, budget_usd, duration_months, complexity_score, stakeholder_count, past_similar_projects, external_dependencies, change_request_frequency, team_turnover_rate, vendor_reliability, schedule_pressure, budget_utilization, resource_availability, success_rate, technical_debt, team_experience, requirement_stability, risk_management_maturity, documentation_quality, budget_per_person, timeline_pressure, team_effectiveness |
| LogisticRegression | 53.89% | 55.63% | team_size, budget_usd, duration_months, complexity_score, stakeholder_count, past_similar_projects, external_dependencies, team_turnover_rate, resource_availability, success_rate, team_experience, requirement_stability, risk_management_maturity, documentation_quality, team_effectiveness |
| DecisionTree | 52.49% | 53.84% | team_size, budget_usd, duration_months, complexity_score, past_similar_projects, external_dependencies, team_turnover_rate, team_experience, risk_management_maturity, team_effectiveness |
| RandomForest | 54.36% | 56.25% | team_size, budget_usd, duration_months, complexity_score, stakeholder_count, past_similar_projects, external_dependencies, change_request_frequency, team_turnover_rate, vendor_reliability, schedule_pressure, budget_utilization, resource_availability, success_rate, technical_debt, team_experience, requirement_stability, risk_management_maturity, documentation_quality, budget_per_person, timeline_pressure, team_effectiveness |
| XGBoost | 57.48% | 56.72% | team_size, budget_usd, duration_months, complexity_score, stakeholder_count, past_similar_projects, external_dependencies, change_request_frequency, team_turnover_rate, vendor_reliability, schedule_pressure, budget_utilization, resource_availability, success_rate, technical_debt, team_experience, requirement_stability, risk_management_maturity, documentation_quality, budget_per_person, timeline_pressure, team_effectiveness |

---

## 7. Decision Tree Visualization and Random Forest Importance

The training script generated these interpretation artifacts:

- `outputs\selectkbest_scores.png` (selectkbest scores)
- `outputs\decision_tree_visualization.png` (decision tree)
- `outputs\random_forest_feature_importance.png` (random forest importance)
- `outputs\final_confusion_matrix.png` (final confusion matrix)

The Decision Tree image shows the first three levels of the tuned tree. The Random Forest image ranks the selected features by importance.

---

## 8. Final Selected Model

| Property | Value |
|---|---|
| Best model | XGBoost |
| Test accuracy | 57.48% |
| Selected feature count | 22 |
| Selected features | team_size, budget_usd, duration_months, complexity_score, stakeholder_count, past_similar_projects, external_dependencies, change_request_frequency, team_turnover_rate, vendor_reliability, schedule_pressure, budget_utilization, resource_availability, success_rate, technical_debt, team_experience, requirement_stability, risk_management_maturity, documentation_quality, budget_per_person, timeline_pressure, team_effectiveness |

### Classification Report

| Class | Precision | Recall | F1 | Support |
|---|---|---|---|---|
| Low | 0.622 | 0.493 | 0.550 | 150 |
| Medium | 0.473 | 0.485 | 0.479 | 235 |
| High | 0.642 | 0.704 | 0.672 | 257 |
| Overall | - | - | - | Acc: 57.48% |

### Confusion Matrix

| Actual \ Predicted | Low | Medium | High |
|---|---|---|---|
| **Low** | 74 | 58 | 18 |
| **Medium** | 38 | 114 | 83 |
| **High** | 7 | 69 | 181 |

---

## 9. Result and Conclusion

The final model is selected only after comparing the five required baseline models, applying SelectKBest feature selection, and running GridSearchCV fine-tuning. The saved artifact is a full sklearn pipeline, so production inference applies the same scaler, selected feature subset, and classifier learned during training.

This approach improves the earlier limited 10-input model by adding direct project-risk drivers such as change request frequency, team turnover, vendor reliability, schedule pressure, resource availability, technical debt, risk management maturity, and documentation quality. These inputs have a direct operational relationship with project risk and are more relevant than unrelated financial/client columns.

To retrain:

```bash
cd ml
python train_risk_model.py
```
