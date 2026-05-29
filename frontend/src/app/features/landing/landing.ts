import { Component, AfterViewInit, ElementRef, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: './landing.html',
  styleUrl: './landing.scss',
})
export class Landing implements AfterViewInit {
  private el = inject(ElementRef);

  ngAfterViewInit() {
    const targets = this.el.nativeElement.querySelectorAll('.reveal');

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry: IntersectionObserverEntry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -60px 0px' }
    );

    targets.forEach((el: Element) => observer.observe(el));
  }
}
