import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_BASE_URL } from '../../../core/api-base-url';
import { BusinessListingPageResponse } from '../api/business-listing-page';
import { toBusinessListing } from '../api/to-business-listing';
import { ListingQuery, serializeListingQuery } from '../models/listing-query';
import { BusinessListing } from '../models/business-listing';

export interface BusinessListingPage {
  readonly items: readonly BusinessListing[];
  readonly page: number;
  readonly pageSize: number;
  readonly totalCount: number;
}

/**
 * HTTP access for the listings feature.
 *
 * The page does not import `HttpClient`. Building the query string in a
 * component would mix the ASP.NET contract into the template. This class
 * is the only place that knows `GET /api/listings`.
 *
 * `providedIn: 'root'` registers one instance. `inject(HttpClient)` reads
 * the client `provideHttpClient()` registered. The method returns the
 * Observable and does not subscribe. The page's `switchMap` is the
 * subscription, so leaving the route or starting a newer query can cancel
 * this one.
 *
 * Filters are query parameters, not a second pass over `items`. The API
 * already dropped the rows that do not match. Filtering the page in the
 * browser would hide rows only from the current page and would still show
 * the server's total.
 */
@Injectable({ providedIn: 'root' })
export class BusinessListingsService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  getListings(query: ListingQuery): Observable<BusinessListingPage> {
    return this.http
      .get<unknown>(`${this.apiBaseUrl}/api/listings`, {
        params: toHttpParams(query),
      })
      .pipe(
        map((response) => {
          // HttpClient's generic does not check the JSON. A 200 that is
          // not a page must fail the request. Mapping a missing `items`
          // array to [] would look like an empty catalog.
          if (!isListingPage(response)) {
            throw new Error('Listing response was not a page.');
          }
          return {
            items: response.items.map(toBusinessListing),
            page: response.page,
            pageSize: response.pageSize,
            totalCount: response.totalCount,
          };
        }),
      );
  }
}

function isListingPage(response: unknown): response is BusinessListingPageResponse {
  if (response === null || typeof response !== 'object') {
    return false;
  }
  const page = response as BusinessListingPageResponse;
  return (
    Array.isArray(page.items) &&
    typeof page.page === 'number' &&
    typeof page.pageSize === 'number' &&
    typeof page.totalCount === 'number'
  );
}

function toHttpParams(query: ListingQuery): HttpParams {
  let params = new HttpParams();
  for (const [key, value] of Object.entries(serializeListingQuery(query))) {
    if (typeof value === 'string' || typeof value === 'number') {
      params = params.set(key, String(value));
    }
  }
  return params;
}
