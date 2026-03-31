import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-project-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './project-form.html',
  styleUrl: './project-form.scss',
})
export class ProjectForm implements OnInit {
  @Input() clients: any[] = [];
  @Input() projectToEdit: any = null;

  @Output() formSubmit = new EventEmitter<any>();
  @Output() formCancel = new EventEmitter<void>();

  projectForm = new FormGroup({
    titre: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    description: new FormControl('', { nonNullable: true }),
    type: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    statut: new FormControl('en_cours', { nonNullable: true, validators: [Validators.required] }),
    priority: new FormControl('moyenne', { nonNullable: true, validators: [Validators.required] }),
    client_id: new FormControl<number | null>(null, { validators: [Validators.required] }),
  });

  ngOnInit(): void {
    if (this.projectToEdit !== null) {
      this.projectForm.patchValue({
        titre: this.projectToEdit.titre ?? this.projectToEdit.name ?? '',
        description: this.projectToEdit.description ?? '',
        type: this.projectToEdit.type ?? '',
        statut: this.projectToEdit.statut ?? this.projectToEdit.status ?? 'en_cours',
        priority: this.projectToEdit.priority ?? 'moyenne',
        client_id: this.projectToEdit.client_id ?? this.projectToEdit.client?.id ?? null,
      });
    }
  }

  onSubmit(): void {
    if (this.projectForm.invalid) {
      this.projectForm.markAllAsTouched();
      return;
    }

    this.formSubmit.emit(this.projectForm.value);
  }

  onCancel(): void {
    this.formCancel.emit();
  }
}
