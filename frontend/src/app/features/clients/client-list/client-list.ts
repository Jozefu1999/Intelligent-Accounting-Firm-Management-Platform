import { ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { finalize } from 'rxjs';
import { ClientService } from '../../../core/services/client';
import { Client } from '../../../core/models';

@Component({
  selector: 'app-client-list',
  imports: [CommonModule, RouterModule, MatButtonModule, MatIconModule],
  templateUrl: './client-list.html',
  styleUrl: './client-list.scss',
})
export class ClientList implements OnInit {
  clients: Client[] = [];
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private clientService: ClientService,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.handleCreatedFlashMessage();
    this.loadClients();
  }

  clearSuccessMessage(): void {
    this.successMessage = '';
    this.cdr.detectChanges();
  }

  loadClients(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.clientService.getAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .pipe(finalize(() => {
        this.isLoading = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (data) => {
          this.clients = data ?? [];
          this.cdr.detectChanges();
        },
        error: () => {
          this.clients = [];
          this.errorMessage = 'Unable to load clients. Please try again.';
          this.cdr.detectChanges();
        },
      });
  }

  deleteClient(id: number): void {
    if (confirm('Are you sure you want to delete this client?')) {
      this.clientService.delete(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: () => {
          this.clients = this.clients.filter((c) => c.id !== id);
          this.cdr.detectChanges();
        },
      });
    }
  }

  private handleCreatedFlashMessage(): void {
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        if (params.get('created') !== '1') {
          return;
        }

        this.successMessage = 'Client created successfully.';
        this.cdr.detectChanges();

        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { created: null },
          queryParamsHandling: 'merge',
          replaceUrl: true,
        });
      });
  }
}
