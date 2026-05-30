import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { finalize, timeout } from 'rxjs';
import { AiBusinessPlan, BusinessPlanContent, Project } from '../../../core/models';
import { AiService } from '../../../core/services/ai';
import { ProjectService } from '../../../core/services/project';

@Component({
  selector: 'app-business-plan',
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  templateUrl: './business-plan.html',
  styleUrl: './business-plan.scss',
})
export class BusinessPlan implements OnInit {
  projects: Project[] = [];
  generatedPlan: AiBusinessPlan | null = null;
  isProjectsLoading = false;
  isGenerating = false;
  errorMessage = '';
  successMessage = '';
  activeTab = 'overview';

  readonly tabs = [
    { id: 'overview', label: 'Overview', icon: 'summarize' },
    { id: 'phases', label: 'Phases', icon: 'view_timeline' },
    { id: 'risks', label: 'Risks & Budget', icon: 'shield' },
  ];

  private readonly destroyRef = inject(DestroyRef);
  private readonly formBuilder = inject(FormBuilder);

  readonly form = this.formBuilder.nonNullable.group({
    projectId: [0, [Validators.required, Validators.min(1)]],
  });

  constructor(
    private aiService: AiService,
    private projectService: ProjectService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadProjects();
  }

  get selectedProject(): Project | null {
    const selectedId = this.form.controls.projectId.value;
    return this.projects.find((p) => p.id === selectedId) ?? null;
  }

  get plan(): BusinessPlanContent | null {
    return this.generatedPlan?.content ?? null;
  }

  loadProjects(): void {
    this.isProjectsLoading = true;
    this.errorMessage = '';

    this.projectService.getAll()
      .pipe(timeout(15000), takeUntilDestroyed(this.destroyRef), finalize(() => {
        this.isProjectsLoading = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (projects) => {
          this.projects = projects ?? [];
          if (this.projects.length > 0 && this.form.controls.projectId.value <= 0) {
            this.form.controls.projectId.setValue(this.projects[0].id);
          }
          this.cdr.detectChanges();
        },
        error: () => {
          this.projects = [];
          this.errorMessage = 'Unable to load projects.';
          this.cdr.detectChanges();
        },
      });
  }

  generateBusinessPlan(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const projectId = this.form.controls.projectId.value;
    if (projectId <= 0) {
      this.errorMessage = 'Select a project before generating.';
      this.cdr.detectChanges();
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';
    this.isGenerating = true;

    this.aiService.generateBusinessPlan(projectId)
      .pipe(timeout(60000), takeUntilDestroyed(this.destroyRef), finalize(() => {
        this.isGenerating = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (response) => {
          this.generatedPlan = this.normalizePlan(response);
          this.successMessage = 'Project plan generated successfully!';
          this.cdr.detectChanges();
        },
        error: (error: unknown) => {
          this.generatedPlan = null;
          this.errorMessage = this.getErrorMessage(error);
          this.cdr.detectChanges();
        },
      });
  }

  getImpactColor(impact: string): string {
    switch (impact?.toLowerCase()) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-slate-600 bg-slate-50 border-slate-200';
    }
  }

  private normalizePlan(response: AiBusinessPlan | null | undefined): AiBusinessPlan {
    const fallbackProjectId = this.form.controls.projectId.value;
    const fallback: AiBusinessPlan = { id: 0, project_id: fallbackProjectId, content: {} };

    if (!response || typeof response !== 'object') return fallback;

    let rawContent = response.content;

    if (typeof rawContent === 'string') {
      try {
        rawContent = JSON.parse(rawContent);
      } catch {
        return { ...response, content: { overview: rawContent as unknown as string } };
      }
    }

    if (rawContent && typeof rawContent === 'object' && !Array.isArray(rawContent)) {
      return { ...response, content: rawContent as BusinessPlanContent };
    }

    return { ...response, content: {} };
  }

  private getErrorMessage(error: unknown): string {
    if (typeof error === 'object' && error !== null && 'name' in error) {
      if ((error as { name?: string }).name === 'TimeoutError') {
        return 'Generation timed out. The AI might be overloaded — try again shortly.';
      }
    }

    if (error instanceof HttpErrorResponse) {
      const msg = typeof error.error?.message === 'string' ? error.error.message.trim() : '';

      if (msg) {
        if (/invalid api key|unauthorized/i.test(msg)) {
          return 'AI API key is invalid. Check GROQ_API_KEY in backend/.env.';
        }
        if (/quota|rate limit|too many/i.test(msg)) {
          return 'AI rate limit reached. Wait a moment and try again.';
        }
        if (/model not found|unknown model/i.test(msg)) {
          return 'AI model is unavailable. Check XAI_MODEL in backend/.env.';
        }
        return msg;
      }

      if (error.status === 0) {
        return 'Backend server is unreachable. Verify it is running.';
      }
    }

    return 'Plan generation failed. Please try again.';
  }
}
