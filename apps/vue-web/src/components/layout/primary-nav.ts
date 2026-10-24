/**
 * Destinations rendered by the header and the footer.
 *
 * The landmarks do not share a component. The header is a disclosure and
 * the footer is a static row, so one component would need a variant for
 * two call sites. The labels and the URL are the part that must stay in
 * step.
 *
 * Both items go to `/listings`. There is no separate home screen. Angular
 * marks both links current because the URL matches both. Two current pages
 * is a lie to assistive technology, so only Listings sets `currentPage`.
 */
export interface PrimaryNavLink {
  readonly label: string;
  readonly to: string;
  readonly currentPage: boolean;
}

export const primaryNavLinks: readonly PrimaryNavLink[] = [
  { label: 'Home', to: '/listings', currentPage: false },
  { label: 'Listings', to: '/listings', currentPage: true },
];
