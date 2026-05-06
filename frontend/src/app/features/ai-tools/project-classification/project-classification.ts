import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { finalize, timeout } from 'rxjs';
import { ProjectClassificationRequest, ProjectClassificationResponse, ProjectClassificationResult, ProjectType } from '../../../core/models';
import { AiService } from '../../../core/services/ai';

export const SECTOR_OPTIONS = [
  { code: 0, label: 'Agriculture' },
  { code: 1, label: 'Construction' },
  { code: 2, label: 'Manufacturing' },
  { code: 3, label: 'Retail' },
  { code: 4, label: 'Transport' },
  { code: 5, label: 'Hospitality' },
  { code: 6, label: 'Information Technology' },
  { code: 7, label: 'Finance' },
  { code: 8, label: 'Healthcare' },
  { code: 9, label: 'Real Estate' },
  { code: 10, label: 'Consulting' },
];

export const PROJECT_TYPE_ICONS: Record<string, string> = {
  creation: 'add_business',
  development: 'code',
  audit: 'fact_check',
  consulting: 'support_agent',
  other: 'category',
};

export const PROJECT_TYPE_LABELS: Record<string, string> = {
  creation: 'Business Creation',
  development: 'Development',
  audit: 'Audit',
  consulting: 'Consulting',
  other: 'Other',
};

@Component({
  selector: 'app-project-classification',
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  templateUrl: './project-classification.html',
  styleUrl: './project-classification.scss',
})
export class ProjectClassification {
  result: ProjectClassificationResponse | null = null;
  isClassifying = false;
  errorMessage = '';
  successMessage = '';

  readonly sectorOptions = SECTOR_OPTIONS;
  readonly projectTypes: ProjectType[] = ['creation', 'development', 'audit', 'consulting', 'other'];

  private readonly destroyRef = inject(DestroyRef);
  private readonly formBuilder = inject(FormBuilder);

  readonly form = this.formBuilder.nonNullable.group({
    annualRevenue: [300000, [Validators.required, Validators.min(0)]],
    estimatedBudget: [60000, [Validators.required, Validators.min(0)]],
    sectorCode: [6, [Validators.required, Validators.min(0)]],
    priority: ['medium' as 'low' | 'medium' | 'high', Validators.required],
    durationDays: [90, [Validators.required, Validators.min(1)]],
  });

  constructor(
    private aiService: AiService,
    private cdr: ChangeDetectorRef,
  ) {}

  classify(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { annualRevenue, estimatedBudget, sectorCode, priority, durationDays } = this.form.getRawValue();

    const payload: ProjectClassificationRequest = {
      annual_revenue: Number(annualRevenue),
      estimated_budget: Number(estimatedBudget),
      sector_code: Number(sectorCode),
      priority,
      duration_days: Number(durationDays),
    };

    this.errorMessage = '';
    this.successMessage = '';
    this.isClassifying = true;

    this.aiService.classifyProject(payload)
      .pipe(timeout(30000))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .pipe(finalize(() => {
        this.isClassifying = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (response) => {
          this.result = response;
          this.successMessage = 'Classification completed successfully.';
          this.cdr.detectChanges();
        },
        error: (error: unknown) => {
          this.result = null;
          this.errorMessage = this.getErrorMessage(error);
          this.cdr.detectChanges();
        },
      });
  }

  getTypeIcon(type: string): string {
    return PROJECT_TYPE_ICONS[type] ?? 'category';
  }

  getTypeLabel(type: string): string {
    return PROJECT_TYPE_LABELS[type] ?? type;
  }

  toPercent(value: number): number {
    return Math.round(value * 100);
  }

  getBarWidth(value: number): string {
    return `${Math.min(100, Math.round(value * 100))}%`;
  }

  getBarClass(type: string, predicted: string): string {
    return type === predicted ? 'bar-predicted' : 'bar-default';
  }

  getRankingRows(): ProjectClassificationResult[] {
    return this.result?.ranking ?? [];
  }

  getSectorLabel(code: number): string {
    return SECTOR_OPTIONS.find(s => s.code === code)?.label ?? `Sector ${code}`;
  }

  private getErrorMessage(error: unknown): string {
    if (typeof error === 'object' && error !== null && 'name' in error) {
      if ((error as { name?: string }).name === 'TimeoutError') {
        return 'Classification timed out. Please try again shortly.';
      }
    }
    if (error instanceof HttpErrorResponse) {
      const msg = error.error?.message ?? error.message;
      return typeof msg === 'string' && msg.length > 0
        ? msg
        : 'Project classification failed. Check ML configuration.';
    }
    return 'Project classification failed. Check ML configuration.';
  }
}
