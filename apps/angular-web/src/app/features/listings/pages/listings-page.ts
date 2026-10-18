import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import {
  catchError,
  distinctUntilChanged,
  map,
  Observable,
  of,
  scan,
  startWith,
  switchMap,
} from 'rxjs';
import {
  BusinessListingsGrid,
  ListingsGridStatus,
} from '../components/business-listings-grid/business-listings-grid';
import { ListingFiltersForm } from '../components/listing-filters/listing-filters';
import { ListingPagination } from '../components/listing-pagination/listing-pagination';
import { BusinessListing } from '../models/business-listing';
import {
  listingPageCount,
  listingQueryEqual,
  listingQueryNeedsCanonicalUrl,
  ListingFilters,
  ListingQuery,
  parseListingQuery,
  serializeListingQuery,
} from '../models/listing-query';
import {
  BusinessListingPage,
  BusinessListingsService,
} from '../services/business-listings.service';

interface ListingsViewState {
  readonly status: ListingsGridStatus | 'invalid';
  readonly page: BusinessListingPage | null;
  readonly errorMessage: string;
  readonly busy: boolean;
}

type RequestEvent =
  | { readonly type: 'loading' }
  | { readonly type: 'ready'; readonly page: BusinessListingPage }
  | { readonly type: 'error' }
  | { readonly type: 'blocked' };

const initialView: ListingsViewState = {
  status: 'loading',
  page: null,
  errorMessage: '',
  busy: false,
};

/**
 * Listings route. The address bar is the query.
 *
 * `ActivatedRoute.queryParamMap` is that address. Controls do not keep a
 * second copy of the committed search. They emit a change, this class
 * writes the URL, and the param map emits. Browser Back does the same
 * emit, so the form and the request follow one stream.
 *
 * Signals hold the current URL and the latest view. RxJS runs the request
 * because `debounceTime` lives on the form and `switchMap` has to cancel
 * the previous HTTP observable. A signal has no cancel. `toObservable`
 * and `toSignal` are the bridge, and there is still one subscription.
 *
 * `switchMap` unsubscribes from the previous inner observable when the
 * query changes. HttpClient treats that unsubscribe as an abort, so a
 * slow response for "bakery" cannot arrive after the user has already
 * asked for "retail" and overwrite those rows.
 *
 * `distinctUntilChanged` is what stops a URL rewrite that did not change
 * the query from starting that request again.
 */
@Component({
  selector: 'app-listings-page',
  imports: [ListingFiltersForm, BusinessListingsGrid, ListingPagination],
  templateUrl: './listings-page.html',
  styleUrl: './listings-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListingsPage {
  private readonly listingsService = inject(BusinessListingsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly retryNonce = signal(0);

  private readonly queryParams = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  private readonly parsed = computed(() => parseListingQuery(this.queryParams()));

  readonly query = computed(() => this.parsed().query);
  readonly priceError = computed(() => this.parsed().priceError);

  /**
   * A shared link can contain `page=0` or `category=Coffee`. Those are not
   * sent. `replaceUrl` drops them without adding a history entry, so Back
   * does not return to the rejected address. An inverted price range is
   * left in the URL: it is a validation message, not a silent rewrite.
   */
  private readonly canonicalizeUrl = effect(() => {
    const params = this.queryParams();
    const parsed = parseListingQuery(params);
    if (parsed.priceError !== null) {
      return;
    }
    if (!listingQueryNeedsCanonicalUrl(params, parsed.query)) {
      return;
    }
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: serializeListingQuery(parsed.query),
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  });

  private readonly requestState = toSignal(
    toObservable(
      computed(() => ({
        query: this.query(),
        blocked: this.priceError() !== null,
        nonce: this.retryNonce(),
      })),
    ).pipe(
      distinctUntilChanged(
        (left, right) =>
          left.blocked === right.blocked &&
          left.nonce === right.nonce &&
          listingQueryEqual(left.query, right.query),
      ),
      switchMap((request) => this.load(request.query, request.blocked)),
      scan(reduceView, initialView),
    ),
    // toObservable emits on the next turn, so the signal needs a value
    // before that emission. The value is the same loading state scan starts
    // from. A later emission replaces it.
    { initialValue: initialView },
  );

  readonly status = computed(() => {
    const status = this.requestState().status;
    return status === 'invalid' ? 'ready' : status;
  });

  readonly listings = computed(
    (): readonly BusinessListing[] => this.requestState().page?.items ?? [],
  );

  readonly errorMessage = computed(() => this.requestState().errorMessage);
  readonly busy = computed(() => this.requestState().busy);

  readonly totalCount = computed(
    () => this.requestState().page?.totalCount ?? 0,
  );

  readonly emptyMessage = computed(() => {
    const page = this.requestState().page;
    const query = this.query();
    if (
      page &&
      page.totalCount > 0 &&
      page.page > listingPageCount(page.totalCount, page.pageSize)
    ) {
      return 'This page is outside the results.';
    }
    if (
      query.search !== '' ||
      query.category !== null ||
      query.minPrice !== null ||
      query.maxPrice !== null
    ) {
      return 'No businesses match these filters.';
    }
    return 'No businesses are listed yet.';
  });

  readonly showPagination = computed(() => {
    const page = this.requestState().page;
    if (page === null || this.priceError() !== null) {
      return false;
    }
    const pages = listingPageCount(page.totalCount, page.pageSize);
    return pages > 1 || page.page > 1;
  });

  protected onFiltersChange(filters: ListingFilters): void {
    this.writeQuery({
      ...filters,
      page: 1,
      pageSize: this.query().pageSize,
    });
  }

  protected onPageChange(page: number): void {
    this.writeQuery({ ...this.query(), page });
  }

  protected retry(): void {
    this.retryNonce.update((nonce) => nonce + 1);
  }

  private writeQuery(query: ListingQuery): void {
    if (listingQueryEqual(query, this.query())) {
      return;
    }
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: serializeListingQuery(query),
      queryParamsHandling: 'merge',
    });
  }

  private load(query: ListingQuery, blocked: boolean): Observable<RequestEvent> {
    if (blocked) {
      return of({ type: 'blocked' });
    }
    return this.listingsService.getListings(query).pipe(
      map((page): RequestEvent => ({ type: 'ready', page })),
      catchError((error: unknown): Observable<RequestEvent> => {
        console.error(error instanceof HttpErrorResponse ? error.message : error);
        return of({ type: 'error' });
      }),
      // Inside switchMap, so this loading event belongs to the latest
      // query only. The previous request has already been unsubscribed.
      startWith<RequestEvent>({ type: 'loading' }),
    );
  }
}

function reduceView(state: ListingsViewState, event: RequestEvent): ListingsViewState {
  if (event.type === 'blocked') {
    return { ...state, status: 'invalid', busy: false, errorMessage: '' };
  }
  if (event.type === 'loading') {
    if (state.page === null) {
      return { status: 'loading', page: null, errorMessage: '', busy: false };
    }
    // Keep the rows already on screen. Replacing them with skeletons on
    // every keystroke is the flicker this avoids. `busy` is the announcement.
    return { ...state, status: 'ready', busy: true, errorMessage: '' };
  }
  if (event.type === 'error') {
    return {
      status: 'error',
      page: null,
      errorMessage: 'Listings could not be loaded.',
      busy: false,
    };
  }
  return { status: 'ready', page: event.page, errorMessage: '', busy: false };
}
