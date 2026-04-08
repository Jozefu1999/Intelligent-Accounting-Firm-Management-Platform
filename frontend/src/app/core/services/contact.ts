import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ContactPayload {
  sujet: string;
  message: string;
  user_id: number;
}

@Injectable({
  providedIn: 'root',
})
export class ContactService {
  private readonly apiUrl = `${environment.apiUrl}/contact`;

  constructor(private http: HttpClient) {}

  sendMessage(payload: ContactPayload): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(this.apiUrl, payload);
  }
}
