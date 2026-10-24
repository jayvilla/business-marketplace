# Phase 4.7 — Forms and user interactions

This note is for a React and TypeScript developer learning Vue 3. The listings filter form already committed search, category, price, and sort. This phase tightens validation, error text, and the blocked-price presentation. It does not add a form library or a new filter.

## A. Existing form architecture

`ListingFilters.vue` is a `<form>`. It owns the draft. It does not read the router and it does not call `getListings`. It emits `change` with a `ListingFilters` value. `ListingsView` turns that into a `ListingQuery`, forces page 1, and `router.push`es.

The committed query is `parseListingQuery(route.query)`. The form receives it as a prop and copies it into the inputs when it is not already what the inputs say. Back and Forward arrive as that prop change.

Search, minimum price, and maximum price wait 300ms. Category and sort publish on `change`. Submit and Clear filters publish immediately and cancel the timer, so Enter does not also leave a second commit waiting.

## B. Vue v-model

On a native input, `v-model="search"` is `:value="search"` plus an input listener that writes `search.value`. The template does not use `.value`. Script does.

That is the opposite shape of a React controlled input. React's `value` and `onChange` are both written by you, and `onChange` usually calls `setState` with the event. Vue's `v-model` hides that pair. The ref is the state.

It is also different from an Angular `FormControl`. The control there is the value, the validators, and the status. Vue has no control object. The ref is the value. Validation is a function we call when a commit is attempted.

`v-model` is used on the three text fields because the only job of the binding is to keep the draft string. The timer is a separate `@input="scheduleText"`. Assigning `search.value` from the route watch does not fire `input`, so Back does not look like a keystroke.

`v-model.trim` is not used. It would remove a trailing space while the user is still typing the next word. Trim happens in `readFilters`, at commit time.

`v-model.number` is not used. An empty price would become a number, and a word would become `NaN`. Empty must stay "no bound." A word must stay a word so the error can name it. Prices stay strings until `parseDraftPrice`.

The selects stay on `:value` and `@change`. The handler writes the ref only when the value is one of `LISTING_CATEGORIES` or `LISTING_SORTS`. `v-model` would accept whatever string the element produced.

## C. Validation

`parseDraftPrice` is the price rule. The form and the URL parser both call it.

| Draft                        | Result                                                             |
| ---------------------------- | ------------------------------------------------------------------ |
| Empty                        | `null`. The bound is unset.                                        |
| `0`                          | `0`. Zero is a real minimum, not "empty."                          |
| `10.5`                       | `10.5`                                                             |
| `1000000000`                 | Allowed. That is the API maximum.                                  |
| `-5`                         | Not committed. "Minimum price must be zero or greater."            |
| `abc`, `10.`, `.5`           | Not committed. "Enter a price as a number zero or greater."        |
| `1000000001`                 | Not committed. "Maximum price cannot exceed $1,000,000,000."       |
| Minimum greater than maximum | Not committed. "Minimum price cannot be greater than the maximum." |

Search is trimmed. Longer than 200 characters is not committed. The input's `maxlength` is the same number, so a normal keystroke cannot pass it. The check still runs, because the ref is not the attribute.

Category and sort are the fixed lists. Anything else in a URL is dropped and the address is rewritten. The selects cannot offer another value.

A URL uses the same price grammar and then a different policy. A negative, a word, or a price above the maximum becomes "no bound," and `replace` removes the key. The user is not sitting in that field. An inverted pair of otherwise valid prices is kept. The API would answer 400. The page shows the alert and does not send the request.

## D. Draft versus committed state

An invalid draft emits nothing. The previous URL stays, and the previous request stays. The user still sees the bad text, the message, and Clear filters. Silently deleting what they typed would look like the field had never changed.

A valid draft, after the delay or on submit, becomes the URL. Page returns to 1. Sort and the other filters are included.

Those are different moments. The draft can be wrong for as long as the user is correcting it. The URL is only written when `readFilters` returns a value the API can accept, or when the URL itself arrived already inverted. In that second case the values are committed because the link put them there. The form does not add a second copy of the same alert. The results column is the one announcement. Clearing or editing back to a valid range leaves that state through the normal commit.

## E. Touched and dirty state

There is no touched flag and no dirty flag.

The error is shown when a commit is attempted and refused: the 300ms timer, Enter, or a select change that publishes the whole form. That is the moment the URL would have changed and did not. Waiting for blur would leave the address unchanged with no message after the timer had already run.

Dirty is "the draft differs from the committed query." Clear filters does not need that comparison. It is enabled when the draft has a search, a category, or a price, including an invalid price. Sort alone does not enable it. The flag is a `computed` of those fields.

Resetting interaction state is the route watch. When the committed query is not the draft, the timer is cleared, the inputs are replaced, and the field error is cleared. Back, Forward, and a clear that the page has written into the URL all come through that watch.

## F. Debouncing

One `setTimeout` covers search and both prices. A new keystroke clears the previous deadline. After 300ms, `publish` reads every field, not only the one that changed.

If the read fails, nothing is emitted. The timer does not get to push a partial or a coerced value.

Clear filters, submit, category, and sort call `clearTextTimer` before they publish. A search that was still waiting is either included, if it is valid, or it is dropped because the fields were cleared. It does not fire again afterward.

Unmount clears the timer. The form's watch clears it when the URL moves to a different query. A word typed just before Back cannot commit on top of the restored address.

Choosing a category while a search is pending publishes once, with the search included, and cancels the timer. The later timeout does not emit a duplicate.

## G. Accessibility

Each control has a `<label for>`. The error is one `<p id="listing-filter-error" role="alert">`. `aria-invalid` and `aria-describedby` are set only on the fields that are wrong.

A minimum-price problem does not mark Search or the maximum. A range problem marks both prices, because both numbers are part of it, and it does not mark Search. The alert announces the message when it appears. `aria-describedby` is what the field reads if focus returns to it later. The id does not change.

The committed inverted range is a separate alert in the results column, with the same sentence. The form does not raise a second one for that URL. The grid is not mounted, so "Loading listings." is not in the page and the skeletons are not either. `useListings` reports `blocked` for that case. The grid's status type does not include `blocked`. The view passes a drawable status only on the branch that renders the grid.

Focus stays in the form while the user is typing. It moves to the results heading only after Previous or Next, because those buttons can leave the tab order when they become disabled.

Color is not the error signal. The text is the message, and the field is marked invalid.

## H. Keyboard interactions

The controls are in one form, in source order: search, category, minimum, maximum, sort, Search, Clear filters. Tab and Shift+Tab follow that order. The selects are native. Arrow keys change their options. Enter submits the form. `@submit.prevent` stops a navigation reload. Submit cancels the debounce, so Enter does not commit twice.

Clear filters is `type="button"`. It is not a submit. It is disabled when there is nothing to clear, which removes it from the tab order until the draft has a filter. Escape is not handled here. The header already uses Escape to close its menu. The form does not take that key.

No custom key listener was added. The browser already does this.

## I. React comparison

A React filter form would be `useState` for each draft and `value` plus `onChange` on each input. `v-model` is that pair, written once. You still would not put the committed query in that state. It would be `useSearchParams`, the way this page uses `route.query`.

Validation would be a function called from the debounced effect and from `onSubmit`, not a schema library requirement. `useEffect` plus a timeout is the debounce, and the effect cleanup is `clearTimeout`. The Vue `onUnmounted` and the route watch are that cleanup. The easy bug in React is an effect that writes the search params and also depends on them, so Back fights the draft. This form does not watch its own draft to write the URL. It emits, and the page writes the URL.

## J. Angular comparison

The Angular filter is a `FormGroup` of `FormControl`s. `valueChanges` on search and the prices uses `debounceTime(300)`. Category and sort emit immediately. `emitEvent: false` on the patch from the router is this form's route watch assigning the refs without going through `@input`.

Angular's `Validators` would live on the controls. These rules are one function, `parseDraftPrice`, called at publish time. That keeps the URL parser and the form on the same grammar without a second validator object.

`takeUntilDestroyed` drops the subscriptions. `onUnmounted` clears the timer. `switchMap` on the page is still the abort in `useListings`. An invalid draft never reaches that stream, in either client, because the form does not emit it.

## K. Architectural tradeoffs

A form library would own touched, dirty, and a validator registry. This form has five controls, one cross-field rule, and a commit policy that is "emit or don't." The library's value is a large form with many rules and a standard error object. Adding it here would put a third representation next to the refs and the URL.

The URL stays the committed store. The form stays the draft. `useListings` stays the request. None of those moved.

## L. Improvements made

`parseDraftPrice` is the shared price grammar. Values above $1,000,000,000, negatives, and non-numbers are not sent. A URL that contains one is rewritten. An inverted pair is still blocked, with the same sentence as before.

Text fields use `v-model`. Selects do not. There is still no `.trim` or `.number` modifier, and no touched state.

Field errors name the field. `aria-invalid` is limited to the controls that failed. A range marks both prices.

`useListings` reports `blocked` instead of `loading` when the price range is inverted. The results alert remains, and the grid is not mounted, so the page does not announce a load that is not happening.

Clear filters, the 300ms timer, sort being kept, and page reset were already right. They stayed.
