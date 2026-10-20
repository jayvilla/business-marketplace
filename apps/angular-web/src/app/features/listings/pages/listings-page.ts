import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Title } from '@angular/platform-browser';
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
  listingsErrorLog,
  listingsErrorMessage,
} from '../api/listings-error-message';
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

/**
 * One screen, one of these. A boolean for loading plus a boolean for error
 * can both be true. This union cannot. Empty is `ready` with no rows, so
 * it cannot also be an error.
 *
 * `updating` keeps the previous page on screen and marks it stale. The
 * count for that page is hidden until the new response replaces it.
 * Showing those cards as the answer for the new query would be a lie.
 * Replacing them with skeletons on every keystroke is the flicker this
 * avoids.
 *
 * A new screen state is one more arm of this union. Call sites that
 * switch on `kind` fail to compile until they handle it. That is how
 * the screen can grow without a second set of booleans or a state library.
 */
type ListingsViewState =
  | { readonly kind: 'loading' }
  | { readonly kind: 'updating'; readonly previous: BusinessListingPage }
  | { readonly kind: 'ready'; readonly page: BusinessListingPage }
  | { readonly kind: 'error'; readonly message: string }
  | { readonly kind: 'invalid' };

type RequestEvent =
  | { readonly type: 'loading' }
  | { readonly type: 'ready'; readonly page: BusinessListingPage }
  | { readonly type: 'error'; readonly message: string }
  | { readonly type: 'blocked' };

const initialView: ListingsViewState = { kind: 'loading' };

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
 *
 * `catchError` turns a failed response into an error state and completes
 * normally. Without it the outer stream would die on the first 500, and
 * Retry would have nothing left to subscribe to. RxJS `retry()` would
 * resubscribe by itself and hide that failure. The button below is the
 * retry: it bumps a nonce, `switchMap` starts one new GET, and a second
 * click while that GET is open is ignored.
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

  /**
   * Target for focus after a page change. `tabindex="-1"` lets script
   * focus it without adding it to the tab order.
   */
  private readonly resultsHeading =
    viewChild<ElementRef<HTMLHeadingElement>>('resultsHeading');

  constructor() {
    // The shell stays mounted, so the document title belongs to the route
    // that is showing. The h1 and the tab name stay the same sentence.
    inject(Title).setTitle('Businesses for Sale');
  }

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

  /** What the grid draws. `invalid` never reaches it; the price alert does. */
  readonly gridStatus = computed((): ListingsGridStatus => {
    const state = this.requestState();
    if (state.kind === 'updating') {
      return 'updating';
    }
    if (state.kind === 'ready') {
      return 'ready';
    }
    if (state.kind === 'error') {
      return 'error';
    }
    return 'loading';
  });

  readonly listings = computed((): readonly BusinessListing[] => {
    const state = this.requestState();
    if (state.kind === 'ready') {
      return state.page.items;
    }
    if (state.kind === 'updating') {
      return state.previous.items;
    }
    return [];
  });

  readonly errorMessage = computed(() => {
    const state = this.requestState();
    return state.kind === 'error' ? state.message : '';
  });

  readonly totalCount = computed(() => {
    const page = visiblePage(this.requestState());
    return page?.totalCount ?? 0;
  });

  /** The confirmed total. Hidden while a newer query is still in flight. */
  readonly showCount = computed(
    () => this.requestState().kind === 'ready' && this.totalCount() > 0,
  );

  readonly filtersActive = computed(() => {
    const query = this.query();
    return (
      query.search !== '' ||
      query.category !== null ||
      query.minPrice !== null ||
      query.maxPrice !== null
    );
  });

  readonly emptyMessage = computed(() => {
    const state = this.requestState();
    const page = state.kind === 'ready' ? state.page : null;
    if (
      page &&
      page.totalCount > 0 &&
      page.page > listingPageCount(page.totalCount, page.pageSize)
    ) {
      return 'This page is outside the results.';
    }
    if (this.filtersActive()) {
      return 'No businesses match these filters.';
    }
    return 'No businesses are listed yet.';
  });

  readonly showClearFilters = computed(
    () =>
      this.requestState().kind === 'ready' &&
      this.listings().length === 0 &&
      this.filtersActive(),
  );

  readonly showPagination = computed(() => {
    if (this.priceError() !== null) {
      return false;
    }
    const page = visiblePage(this.requestState());
    if (page === null) {
      return false;
    }
    const pages = listingPageCount(page.totalCount, page.pageSize);
    return pages > 1 || this.query().page > 1;
  });

  readonly paginationPending = computed(
    () => this.requestState().kind === 'updating',
  );

  protected onFiltersChange(filters: ListingFilters): void {
    this.writeQuery({
      ...filters,
      page: 1,
      pageSize: this.query().pageSize,
    });
  }

  protected onPageChange(page: number): void {
    this.writeQuery({ ...this.query(), page });
    // Next or Previous can become disabled on the first or last page.
    // A disabled button leaves the tab order, and the browser drops focus
    // onto the document. The results heading is the start of what changed.
    // Moving there on every page click is the same destination, so the
    // user does not have to guess whether the button survived.
    this.resultsHeading()?.nativeElement.focus();
  }

  /**
   * Same URL, one more GET. Filters and page stay where they are because
   * the nonce is the only thing that changed. A click during `loading` or
   * `updating` would start a second subscription to the same query, so it
   * is ignored. `switchMap` would cancel the first, which is still a
   * duplicate round trip.
   */
  protected retry(): void {
    const kind = this.requestState().kind;
    if (kind === 'loading' || kind === 'updating') {
      return;
    }
    this.retryNonce.update((nonce) => nonce + 1);
  }

  /**
   * The empty-state button and the form's Clear filters write the same
   * query. The address bar remains the only copy. Sort stays, because
   * clear means "remove the filters," and the form does the same.
   */
  protected clearResultFilters(): void {
    this.onFiltersChange({
      search: '',
      category: null,
      minPrice: null,
      maxPrice: null,
      sort: this.query().sort,
    });
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
        console.error(listingsErrorLog(error));
        return of({ type: 'error', message: listingsErrorMessage(error) });
      }),
      // Inside switchMap, so this loading event belongs to the latest
      // query only. The previous request has already been unsubscribed.
      startWith<RequestEvent>({ type: 'loading' }),
    );
  }
}

function reduceView(state: ListingsViewState, event: RequestEvent): ListingsViewState {
  if (event.type === 'blocked') {
    return { kind: 'invalid' };
  }
  if (event.type === 'loading') {
    const previous = visiblePage(state);
    // Every query starts here. That event is what clears an error and
    // replaces a ready page. The previous rows survive only as `updating`,
    // and the next ready or error event discards them. A failed request
    // has nothing honest to keep on screen, so Retry shows skeletons.
    return previous === null
      ? { kind: 'loading' }
      : { kind: 'updating', previous };
  }
  if (event.type === 'error') {
    return { kind: 'error', message: event.message };
  }
  return { kind: 'ready', page: event.page };
}

function visiblePage(state: ListingsViewState): BusinessListingPage | null {
  if (state.kind === 'ready') {
    return state.page;
  }
  if (state.kind === 'updating') {
    return state.previous;
  }
  return null;
}
