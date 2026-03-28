import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ProjectService } from '../../../core/services/project';
import { Project } from '../../../core/models';

@Component({
  selector: 'app-project-list',
  imports: [CommonModule, RouterModule, MatButtonModule, MatIconModule],
  templateUrl: './project-list.html',
  styleUrl: './project-list.scss',
})
export class ProjectList implements OnInit {
  projects: Project[] = [];

  constructor(private projectService: ProjectService) {}

  ngOnInit(): void {
    this.projectService.getAll().subscribe({
      next: (data) => (this.projects = data),
    });
  }

  deleteProject(id: number): void {
    if (confirm('Are you sure you want to delete this project?')) {
      this.projectService.delete(id).subscribe({
        next: () => {
          this.projects = this.projects.filter((p) => p.id !== id);
        },
      });
    }
  }
}
