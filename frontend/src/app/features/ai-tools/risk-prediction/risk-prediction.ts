import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { finalize, timeout } from 'rxjs';
import { RiskPredictionRequest, RiskPredictionResponse } from '../../../core/models';
import { AiService } from '../../../core/services/ai';

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
      this.errorMessage = 'Tous les champs doivent contenir des nombres valides.';
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
          this.successMessage = 'Prediction terminee avec succes.';
          this.cdr.detectChanges();
        },
        error: (error: unknown) => {
          this.prediction = null;
          this.errorMessage = this.getErrorMessage(
            error,
            'La prediction ML a pris trop de temps. Reessayez dans un instant.',
            'La prediction du risque a echoue. Verifiez la configuration ML.',
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
        return 'Le serveur API est inaccessible. Verifiez que le backend est lance.';
      }
    }

    return defaultMessage;
  }
}
