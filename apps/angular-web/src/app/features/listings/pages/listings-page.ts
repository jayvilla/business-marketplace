import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, Observable, of, startWith } from 'rxjs';
import {
  BusinessListingsGrid,
  ListingsGridStatus,
} from '../components/business-listings-grid/business-listings-grid';
import { BusinessListing } from '../models/business-listing';
import { BusinessListingsService } from '../services/business-listings.service';

interface ListingsRequestState {
  readonly status: ListingsGridStatus;
  readonly listings: readonly BusinessListing[];
  readonly errorMessage: string;
}

const loadingState: ListingsRequestState = {
  status: 'loading',
  listings: [],
  errorMessage: '',
};

/**
 * Listings route. It asks for the catalog and passes the result to the grid.
 * It does not build cards and it does not know the URL.
 *
 * `toSignal` subscribes once, in this class's construction, which is when
 * the router creates the page. That is the request. Leaving the route
 * destroys the page, and `toSignal` unsubscribes, which aborts the HTTP
 * call. There is no `subscribe()` to forget in `ngOnDestroy`.
 *
 * `startWith` emits the loading state before the response, so the signal
 * always has a value (`requireSync`). `catchError` turns a failed response
 * into an error state. Without it, the Observable would error, `toSignal`
 * would have nothing to render, and the skeletons would stay up.
 * An empty 200 is not that failure. It is a ready state with no rows.
 */
@Component({
  selector: 'app-listings-page',
  imports: [BusinessListingsGrid],
  templateUrl: './listings-page.html',
  styleUrl: './listings-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListingsPage {
  private readonly listingsService = inject(BusinessListingsService);

  private readonly requestState = toSignal(
    this.listingsService.getListings().pipe(
      map(
        (listings): ListingsRequestState => ({
          status: 'ready',
          listings,
          errorMessage: '',
        }),
      ),
      catchError((error: unknown): Observable<ListingsRequestState> => {
        // HttpClient reports network failures and 4xx/5xx here. The status
        // code stays out of the template. The grid only needs the failure.
        console.error(error instanceof HttpErrorResponse ? error.message : error);
        return of({
          status: 'error',
          listings: [],
          errorMessage: 'Listings could not be loaded.',
        });
      }),
      startWith(loadingState),
    ),
    { requireSync: true },
  );

  readonly status = computed(() => this.requestState().status);
  readonly listings = computed(() => this.requestState().listings);
  readonly errorMessage = computed(() => this.requestState().errorMessage);
}
