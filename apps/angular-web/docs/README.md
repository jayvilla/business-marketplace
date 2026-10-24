# Angular client documentation

These notes explain the Angular 22 client in `apps/angular-web`. They were written from the source after the Vue client existed, so the comparisons point at the Vue notes and at the API contract. They are not a phase log. The repository does not keep numbered Angular phase documents.

The client is a standalone Angular application. There is no `NgModule`. The listings screen searches, filters, sorts, and pages `GET /api/listings`. It does not import the Vue app or the C# project.

| Document | What it covers |
| --- | --- |
| [Architecture](architecture.md) | Bootstrap, providers, routes, folder layout |
| [Layout](layout.md) | Shell, header, footer, skip link |
| [Listings UI](listings-ui.md) | Cards, grid, placeholders, loading and empty states |
| [API integration](api-integration.md) | `HttpClient`, DTOs, mapping, errors |
| [Search, filter, sort, pagination](search-filter-sort-pagination.md) | Query model and URL |
| [State management](state-management.md) | Signals, `computed`, and RxJS |
| [Forms and validation](forms-validation.md) | Reactive Forms and the price rules |
| [Testing and accessibility](testing-accessibility.md) | `TestBed`, live regions, focus |
| [Performance and review](performance-review.md) | Lazy routes, `OnPush`, recorded build sizes |

Related:

- [ASP.NET Core API docs](../../api/docs/README.md)
- [Vue phase 4.10 comparison](../../vue-web/docs/phase-4.10-final-review-angular-comparison.md)
