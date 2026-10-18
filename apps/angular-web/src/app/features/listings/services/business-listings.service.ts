import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_BASE_URL } from '../../../core/api-base-url';
import { BusinessListingSummary } from '../api/business-listing-summary';
import { toBusinessListing } from '../api/to-business-listing';
import { BusinessListing } from '../models/business-listing';

/**
 * HTTP access for the listings feature.
 *
 * The page does not import `HttpClient`. A component that built the URL
 * would mix the ASP.NET route into the template, and every test of the
 * card would need a fake backend. This class is the only place that knows
 * `GET /api/listings`.
 *
 * `providedIn: 'root'` registers one instance with the application injector.
 * `inject(HttpClient)` reads the client `provideHttpClient()` put there.
 * The same call reads `API_BASE_URL`. Neither is a constructor parameter.
 *
 * The method returns the Observable. It does not subscribe. The caller
 * decides how long the request lives. Subscribing here would start work
 * with nobody listening, or force this class to store the result.
 *
 * Filtering and paging are not parameters yet. They belong on this method
 * later (`page`, `category`) so the card still receives `BusinessListing`
 * and does not learn the query string.
 */
@Injectable({ providedIn: 'root' })
export class BusinessListingsService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  getListings(): Observable<readonly BusinessListing[]> {
    // The generic is not checked against the JSON. Mapping still copies
    // each element so the card never sees `city` or a null image URL.
    return this.http
      .get<readonly BusinessListingSummary[]>(`${this.apiBaseUrl}/api/listings`)
      .pipe(map((summaries) => summaries.map(toBusinessListing)));
  }
}
