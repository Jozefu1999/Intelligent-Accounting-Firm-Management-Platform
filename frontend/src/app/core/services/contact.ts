import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ContactMessage } from '../models';

export interface ContactPayload {
  nom: string;
  email: string;
  sujet: string;
  project_id?: number | null;
  message: string;
  user_id: number;
}

@Injectable({
  providedIn: 'root',
})
export class ContactService {
  private readonly apiUrl = `${environment.apiUrl}/contact`;

  constructor(private http: HttpClient) {}

  sendMessage(payload: ContactPayload): Observable<{ message: string; contact: ContactMessage }> {
    return this.http.post<{ message: string; contact: ContactMessage }>(this.apiUrl, payload);
  }

  getMessages(): Observable<ContactMessage[]> {
    return this.http.get<ContactMessage[]>(`${this.apiUrl}?user_id=me`);
  }
}
