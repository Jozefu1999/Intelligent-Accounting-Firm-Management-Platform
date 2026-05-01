import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { finalize, timeout } from 'rxjs';
import { RiskPredictionRequest, RiskPredictionResponse } from '../../../core/models';
import { AiService } from '../../../core/services/ai';

export const EXPERIENCE_OPTIONS = [
  { label: 'Junior',  value: 0 },
  { label: 'Mixed',   value: 1 },
  { label: 'Senior',  value: 2 },
  { label: 'Expert',  value: 3 },
];

export const STABILITY_OPTIONS = [
  { label: 'Volatile',  value: 0 },
  { label: 'Moderate',  value: 1 },
  { label: 'Stable',    value: 2 },
];

export const COMPLEXITY_OPTIONS = [
  { label: '1 – Very simple',  value: 2  },
  { label: '2 – Simple',       value: 4  },
  { label: '3 – Moderate',     value: 6  },
  { label: '4 – Complex',      value: 8  },
  { label: '5 – Very complex', value: 10 },
];

@Component({
  selector: 'app-risk-prediction',
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  templateUrl: './risk-prediction.html',
  styleUrl: './risk-prediction.scss',
})
export class RiskPrediction {
  prediction: RiskPredictionResponse | null = null;
  isPredicting = false;
  errorMessage = '';
  successMessage = '';

  readonly experienceOptions = EXPERIENCE_OPTIONS;
  readonly stabilityOptions  = STABILITY_OPTIONS;
  readonly complexityOptions = COMPLEXITY_OPTIONS;
  readonly probabilityLevels: Array<'low' | 'medium' | 'high'> = ['low', 'medium', 'high'];

  private readonly destroyRef   = inject(DestroyRef);
  private readonly formBuilder  = inject(FormBuilder);

  readonly form = this.formBuilder.nonNullable.group({
    // Project Financials
    budgetUsd:            [400_000,  [Validators.required, Validators.min(1)]],
    budgetUtilization:    [90,       [Validators.required, Validators.min(60), Validators.max(130)]],
    // Project Details
    durationMonths:       [12,       [Validators.required, Validators.min(1), Validators.max(60)]],
    teamSize:             [8,        [Validators.required, Validators.min(1), Validators.max(50)]],
    complexityScore:      [6,        [Validators.required]],
    stakeholderCount:     [8,        [Validators.required, Validators.min(1), Validators.max(30)]],
    externalDependencies: [2,        [Validators.required, Validators.min(0), Validators.max(10)]],
    // Team & History
    teamExperience:       [1,        [Validators.required]],
    requirementStability: [1,        [Validators.required]],
    successRate:          [75,       [Validators.required, Validators.min(0), Validators.max(100)]],
  });

  constructor(private aiService: AiService, private cdr: ChangeDetectorRef) {}

  predictRisk(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();

    const payload: RiskPredictionRequest = {
      team_size:             v.teamSize,
      budget_usd:            v.budgetUsd,
      duration_months:       v.durationMonths,
      complexity_score:      v.complexityScore,
      stakeholder_count:     v.stakeholderCount,
      success_rate:          v.successRate / 100,
      budget_utilization:    v.budgetUtilization / 100,
      team_experience:       v.teamExperience,
      requirement_stability: v.requirementStability,
      external_dependencies: v.externalDependencies,
    };

    this.errorMessage  = '';
    this.successMessage = '';
    this.isPredicting  = true;

    this.aiService.predictRisk(payload)
      .pipe(timeout(30000))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .pipe(finalize(() => { this.isPredicting = false; this.cdr.detectChanges(); }))
      .subscribe({
        next: (response) => {
          this.prediction    = this.normalizePrediction(response);
          this.successMessage = 'Prediction completed successfully.';
          this.cdr.detectChanges();
        },
        error: (error: unknown) => {
          this.prediction   = null;
          this.errorMessage = this.getErrorMessage(
            error,
            'ML prediction timed out. Please try again shortly.',
            'Risk prediction failed. Check ML configuration.',
          );
          this.cdr.detectChanges();
        },
      });
  }

  getRiskLabel(level: string): string {
    const map: Record<string, string> = { high: 'High risk', medium: 'Medium risk', low: 'Low risk' };
    return map[level.trim().toLowerCase()] ?? 'Unknown';
  }

  getRiskClass(level: string): string {
    const map: Record<string, string> = { high: 'risk-high', medium: 'risk-medium', low: 'risk-low' };
    return map[level.trim().toLowerCase()] ?? 'risk-low';
  }

  getRiskIcon(level: string): string {
    const map: Record<string, string> = { high: 'warning', medium: 'info', low: 'check_circle' };
    return map[level.trim().toLowerCase()] ?? 'help';
  }

  getProbability(level: 'low' | 'medium' | 'high'): number {
    return this.prediction?.probabilities[level] ?? 0;
  }

  getProbabilityWidth(level: 'low' | 'medium' | 'high'): string {
    return `${this.toPercent(this.getProbability(level))}%`;
  }

  getProbabilityBarClass(level: 'low' | 'medium' | 'high'): string { return `bar-${level}`; }

  getProbabilityLabel(level: 'low' | 'medium' | 'high'): string {
    return { low: 'Low', medium: 'Medium', high: 'High' }[level];
  }

  toPercent(value: number): number { return Math.round(value * 100); }

  getComplexityLabel(value: number): string {
    const opt = this.complexityOptions.find(o => o.value === value);
    return opt ? opt.label.split(' – ')[1] : String(value);
  }

  getExperienceLabel(value: number): string {
    return this.experienceOptions.find(o => o.value === value)?.label ?? String(value);
  }

  getStabilityLabel(value: number): string {
    return this.stabilityOptions.find(o => o.value === value)?.label ?? String(value);
  }

  private normalizePrediction(response: RiskPredictionResponse | null | undefined): RiskPredictionResponse {
    const fallback: RiskPredictionResponse = {
      risk_level: 'unknown', score: 0, probabilities: { low: 0, medium: 0, high: 0 },
    };
    if (!response || typeof response !== 'object') return fallback;
    return {
      risk_level: typeof response.risk_level === 'string' ? response.risk_level : 'unknown',
      score:      this.normalizeProbability(response.score),
      probabilities: {
        low:    this.normalizeProbability(response.probabilities?.low),
        medium: this.normalizeProbability(response.probabilities?.medium),
        high:   this.normalizeProbability(response.probabilities?.high),
      },
    };
  }

  private normalizeProbability(value: unknown): number {
    const n = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(n) || n < 0) return 0;
    return Number(Math.min(n, 1).toFixed(4));
  }

  private getErrorMessage(error: unknown, timeoutMessage: string, defaultMessage: string): string {
    if (typeof error === 'object' && error !== null && 'name' in error) {
      if ((error as { name?: string }).name === 'TimeoutError') return timeoutMessage;
    }
    if (error instanceof HttpErrorResponse) {
      return (error.error as { message?: string })?.message ?? defaultMessage;
    }
    return defaultMessage;
  }
}

