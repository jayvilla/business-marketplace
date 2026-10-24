# Reactive Forms and validation

## Purpose

The filter form collects search, category, minimum price, maximum price, and sort. It must not send a value the user is still typing, and it must not send a price the API will reject as text. The page, not the form, writes the URL.

## Architecture

`ListingFiltersForm` in `components/listing-filters/listing-filters.ts`. The template is `listing-filters.html`. `ReactiveFormsModule` is the only forms import. The page passes the committed `ListingQuery` in and listens for `filtersChange`.

## Implementation

The group is non-nullable string and union controls:

```ts
protected readonly form = new FormGroup({
  search: new FormControl('', { nonNullable: true }),
  category: new FormControl<ListingCategory | ''>('', { nonNullable: true }),
  minPrice: new FormControl('', { nonNullable: true }),
  maxPrice: new FormControl('', { nonNullable: true }),
  sort: new FormControl<ListingSort>('newest', { nonNullable: true }),
});
```

Prices stay strings. A numeric control would turn an empty field into `null` or `0` and would make a half-typed decimal awkward. `readPrice` in this file returns `null` for an empty string, `undefined` for anything that is not `^\d+(\.\d+)?$`, and `Number` otherwise. `0` matches the pattern and is a real bound.

`valueChanges` on search, min, and max use `debounceTime(300)` and `distinctUntilChanged`. Category and sort emit on change with no timer. `merge` of those streams calls `publish`. One subscription uses `takeUntilDestroyed()`.

`publish` calls `readFilters`. Search longer than 200 characters sets a field error and returns null, so nothing is emitted. A non-price sets "Enter a price as a number zero or greater." An inverted pair sets "Minimum price cannot be greater than the maximum." A successful read clears the error and emits. The page then writes page 1.

`fieldError` is a signal `{ target, message }`. `target` is `'search'` or `'price'`. The template sets `aria-invalid` and `aria-describedby="listing-filter-error"` only on the controls that own the message. A price error is not announced when Search is focused.

The form does not use `Validators.required`. An empty price is valid and means "no bound". There is no touched or dirty flag. The error appears when a commit is refused. Hiding it until blur would leave the URL unchanged with no explanation after the debounce had already given up.

An `effect` patches the group from the input query. `emitEvent: false` keeps that patch from looking like a keystroke. If `readFilters` already equals the query, the effect only refreshes `filtersActive`.

Clear sets the text fields and category to empty, keeps sort, cancels the pending debounce by writing the controls, and emits immediately.

The form does not enforce the API's maximum of 1,000,000,000 (`[Range]` on `ListingQuery` in the API). A long numeric string can pass `readPrice` and be sent. The server then returns 400, and the page shows "Those filters were rejected." The Vue form refuses that bound locally. See [forms in Vue](../../vue-web/docs/phase-4.7-forms-user-interactions.md).

## Angular concepts

`FormControl` is a value plus a stream of changes. `FormGroup` groups them. `nonNullable: true` means `value` is `string`, not `string | null`.

`valueChanges` is an observable. `debounceTime` is the RxJS operator. It is not a property of the input.

`input.required` and `output` are the signal input and output. The parent binds them in the template.

## React comparison

A controlled input is `value` and `onChange`. `FormControl` stores that pair and adds `valueChanges`. You would debounce with a timeout or a library. Cross-field validation would be a function you call before writing the URL, which is what `readFilters` is.

## Vue comparison

Vue uses `v-model` on the text fields and `@change` on the selects. There is no `FormGroup`. The debounce is one `setTimeout`. The validation messages for non-numeric and inverted prices match. Vue also rejects prices above 1,000,000,000 and a few malformed forms the Angular regex still accepts, such as a leading plus. The shared idea is the same: the draft is local, the URL is the commit, and an invalid draft does not emit.

## Engineering decisions

Reactive Forms was used because the text fields need a stream that can be debounced per control. Template-driven `ngModel` was not added beside it.

Selects are not debounced. Waiting 300ms after choosing a category would feel like a missed click.

Clear does not wait for the timer. The user asked for the empty query now.

## Testing

`listing-filters.spec.ts` uses `fakeAsync` and `tick` for the 300ms debounce. It checks that search does not emit on each keystroke, that submit does not wait out the timer, that clear is immediate, and that the price error is associated with the price fields. `listings-page.spec.ts` checks that an invalid draft does not change the URL and does not add a request.

## Key takeaways

`FormControl` is the controlled input. `debounceTime` belongs on the text streams only. Empty is not zero. The form emits. The page writes the router.
