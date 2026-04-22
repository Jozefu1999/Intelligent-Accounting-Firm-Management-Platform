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
  statusMessage = 'Ready to start model retraining.';
  lastRun = '-';
  accuracy = '-';

  runRetrain(): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.statusMessage = 'Execution in progress...';

    setTimeout(() => {
      this.isRunning = false;
      this.statusMessage = 'Last retrain completed successfully.';
      this.lastRun = new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date());
      this.accuracy = '86.4%';
    }, 900);
  }
}
