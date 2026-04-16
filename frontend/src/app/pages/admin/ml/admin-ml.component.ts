import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-admin-ml-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-ml.component.html',
  styleUrl: './admin-ml.component.css',
})
export class AdminMlComponent {
  isRunning = false;
  statusMessage = 'Pret a lancer un entrainement du modele.';
  lastRun = '-';
  accuracy = '-';

  runRetrain(): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.statusMessage = 'Execution en cours...';

    setTimeout(() => {
      this.isRunning = false;
      this.statusMessage = 'Dernier retrain termine avec succes.';
      this.lastRun = new Intl.DateTimeFormat('fr-FR', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date());
      this.accuracy = '86.4%';
    }, 900);
  }
}
