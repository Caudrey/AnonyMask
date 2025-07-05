import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = 'http://localhost:8000'; // Your Python API address

  constructor(private http: HttpClient) { }

  // Method to call the /predict endpoint
  getPredictionsExplicit(text: string): Observable<any> {
    const body = { text: text };
    return this.http.post<any>(`${this.apiUrl}/predictExplicit`, body);
  }

  getPredictionsImplicit(text: string): Observable<any> {
    const body = { text: text };
    return this.http.post<any>(`${this.apiUrl}/predictImplicit`, body);
  }
}
