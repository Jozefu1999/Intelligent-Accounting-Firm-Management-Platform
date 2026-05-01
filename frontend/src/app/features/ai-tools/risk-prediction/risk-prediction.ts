import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { finalize, timeout } from 'rxjs';
import { RiskPredictionRequest, RiskPredictionResponse } from '../../../core/models';
import { AiService } from '../../../core/services/ai';

export const SECTOR_OPTIONS = [
  { name: 'Agriculture', value: 'agriculture' },
  { name: 'Construction', value: 'construction' },
  { name: 'Manufacturing', value: 'manufacturing' },
  { name: 'Retail', value: 'retail' },
  { name: 'Transport', value: 'transport' },
  { name: 'Hospitality', value: 'hospitality' },
  { name: 'Information Technology', value: 'information technology' },
  { name: 'Finance', value: 'finance' },
  { name: 'Healthcare', value: 'healthcare' },
  { name: 'Real Estate', value: 'real estate' },
  { name: 'Consulting', value: 'consulting' },
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

  readonly sectorOptions = SECTOR_OPTIONS;
  readonly probabilityLevels: Array<'low' | 'medium' | 'high'> = ['low', 'medium', 'high'];

  private readonly destroyRef = inject(DestroyRef);
  private readonly formBuilder = inject(FormBuilder);

  readonly form = this.formBuilder.nonNullable.group({
    // Financial
    annualRevenue: [500000, [Validators.required, Validators.min(1)]],
    estimatedBudget: [80000, [Validators.required, Validators.min(1)]],
    sector: ['retail', [Validators.required]],
    // Project
    durationDays: [90, [Validators.required, Validators.min(1), Validators.max(1825)]],
    teamSize: [4, [Validators.required, Validators.min(1), Validators.max(200)]],
    complexityScore: [2, [Validators.required, Validators.min(1), Validators.max(5)]],
    stakeholderCount: [5, [Validators.required, Validators.min(1)]],
    // Client health
    debtRatio: [30, [Validators.required, Validators.min(0), Validators.max(100)]],
    successRate: [70, [Validators.required, Validators.min(0), Validators.max(100)]],
  });

  constructor(
    private aiService: AiService,
    private cdr: ChangeDetectorRef,
  ) {}

  predictRisk(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();

    const payload: RiskPredictionRequest = {
      annual_revenue: v.annualRevenue,
      estimated_budget: v.estimatedBudget,
      sector: v.sector,
      duration_days: v.durationDays,
      team_size: v.teamSize,
      debt_ratio: v.debtRatio / 100,         // user enters 0-100, model expects 0.0-1.0
      success_rate: v.successRate / 100,      // same
      complexity_score: v.complexityScore,
      stakeholder_count: v.stakeholderCount,
    };

    this.errorMessage = '';
    this.successMessage = '';
    this.isPredicting = true;

    this.aiService.predictRisk(payload)
      .pipe(timeout(30000))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .pipe(finalize(() => {
        this.isPredicting = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (response) => {
          this.prediction = this.normalizePrediction(response);
          this.successMessage = 'Prediction completed successfully.';
          this.cdr.detectChanges();
        },
        error: (error: unknown) => {
          this.prediction = null;
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

  getProbabilityBarClass(level: 'low' | 'medium' | 'high'): string {
    return `bar-${level}`;
  }

  getProbabilityLabel(level: 'low' | 'medium' | 'high'): string {
    return { low: 'Low', medium: 'Medium', high: 'High' }[level];
  }

  toPercent(value: number): number {
    return Math.round(value * 100);
  }

  getSectorLabel(value: string): string {
    return this.sectorOptions.find(s => s.value === value)?.name ?? value;
  }

  getComplexityLabel(score: number): string {
    const labels: Record<number, string> = { 1: 'Very simple', 2: 'Simple', 3: 'Moderate', 4: 'Complex', 5: 'Very complex' };
    return labels[score] ?? String(score);
  }

  private normalizePrediction(response: RiskPredictionResponse | null | undefined): RiskPredictionResponse {
    const fallback: RiskPredictionResponse = {
      risk_level: 'unknown',
      score: 0,
      probabilities: { low: 0, medium: 0, high: 0 },
    };

    if (!response || typeof response !== 'object') {
      return fallback;
    }

    return {
      risk_level: typeof response.risk_level === 'string' ? response.risk_level : 'unknown',
      score: this.normalizeProbability(response.score),
      probabilities: {
        low: this.normalizeProbability(response.probabilities?.low),
        medium: this.normalizeProbability(response.probabilities?.medium),
        high: this.normalizeProbability(response.probabilities?.high),
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

  errorMessage = '';
  successMessage = '';

  readonly probabilityLevels: Array<'low' | 'medium' | 'high'> = ['low', 'medium', 'high'];

  private readonly destroyRef = inject(DestroyRef);
  private readonly formBuilder = inject(FormBuilder);

  readonly form = this.formBuilder.nonNullable.group({
    annualRevenue: [250000, [Validators.required, Validators.min(0)]],
    estimatedBudget: [50000, [Validators.required, Validators.min(0)]],
    sectorCode: [1, [Validators.required, Validators.min(0)]],
  });

  constructor(
    private aiService: AiService,
    private cdr: ChangeDetectorRef,
  ) {}

  predictRisk(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const annualRevenue = Number(this.form.controls.annualRevenue.value);
    const estimatedBudget = Number(this.form.controls.estimatedBudget.value);
    const sectorCode = Number(this.form.controls.sectorCode.value);

    if (!Number.isFinite(annualRevenue) || !Number.isFinite(estimatedBudget) || !Number.isFinite(sectorCode)) {
      this.errorMessage = 'All fields must contain valid numbers.';
      this.cdr.detectChanges();
      return;
    }

    const payload: RiskPredictionRequest = {
      annual_revenue: annualRevenue,
      estimated_budget: estimatedBudget,
      sector_code: sectorCode,
    };

    this.errorMessage = '';
    this.successMessage = '';
    this.isPredicting = true;

    this.aiService.predictRisk(payload)
      .pipe(timeout(30000))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .pipe(finalize(() => {
        this.isPredicting = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (response) => {
          this.prediction = this.normalizePrediction(response);
          this.successMessage = 'Prediction completed successfully.';
          this.cdr.detectChanges();
        },
        error: (error: unknown) => {
          this.prediction = null;
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
    const normalized = level.trim().toLowerCase();

    if (normalized === 'high') {
      return 'High risk';
    }

    if (normalized === 'medium') {
      return 'Medium risk';
    }

    if (normalized === 'low') {
      return 'Low risk';
    }

    return 'Unknown';
  }

  getRiskClass(level: string): string {
    const normalized = level.trim().toLowerCase();

    if (normalized === 'high') {
      return 'risk-high';
    }

    if (normalized === 'medium') {
      return 'risk-medium';
    }

    return 'risk-low';
  }

  getProbability(level: 'low' | 'medium' | 'high'): number {
    return this.prediction?.probabilities[level] ?? 0;
  }

  getProbabilityWidth(level: 'low' | 'medium' | 'high'): string {
    return `${this.toPercent(this.getProbability(level))}%`;
  }

  getProbabilityBarClass(level: 'low' | 'medium' | 'high'): string {
    return `bar-${level}`;
  }

  getProbabilityLabel(level: 'low' | 'medium' | 'high'): string {
    if (level === 'low') {
      return 'Low';
    }

    if (level === 'high') {
      return 'High';
    }

    return 'Medium';
  }

  toPercent(value: number): number {
    return Math.round(value * 100);
  }

  private normalizePrediction(response: RiskPredictionResponse | null | undefined): RiskPredictionResponse {
    const fallback: RiskPredictionResponse = {
      risk_level: 'unknown',
      score: 0,
      probabilities: {
        low: 0,
        medium: 0,
        high: 0,
      },
    };

    if (!response || typeof response !== 'object') {
      return fallback;
    }

    const probabilities = response.probabilities;

    return {
      risk_level: typeof response.risk_level === 'string' ? response.risk_level : 'unknown',
      score: this.normalizeProbability(response.score),
      probabilities: {
        low: this.normalizeProbability(probabilities?.low),
        medium: this.normalizeProbability(probabilities?.medium),
        high: this.normalizeProbability(probabilities?.high),
      },
    };
  }

  private normalizeProbability(value: unknown): number {
    const numberValue = typeof value === 'number' ? value : Number(value);

    if (!Number.isFinite(numberValue) || numberValue < 0) {
      return 0;
    }

    if (numberValue > 1) {
      return 1;
    }

    return Number(numberValue.toFixed(4));
  }

  private getErrorMessage(error: unknown, timeoutMessage: string, defaultMessage: string): string {
    if (typeof error === 'object' && error !== null && 'name' in error) {
      const errorName = (error as { name?: string }).name;
      if (errorName === 'TimeoutError') {
        return timeoutMessage;
      }
    }

    if (error instanceof HttpErrorResponse) {
      const backendMessage =
        typeof error.error === 'object' && error.error !== null && 'message' in error.error
          ? (error.error as { message?: unknown }).message
          : undefined;

      if (typeof backendMessage === 'string' && backendMessage.trim().length > 0) {
        return backendMessage;
      }

      if (error.status === 0) {
        return 'API server is unreachable. Verify that the backend is running.';
      }
    }

    return defaultMessage;
  }
}

