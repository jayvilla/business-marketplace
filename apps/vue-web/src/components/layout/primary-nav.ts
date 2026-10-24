/**
 * Destinations rendered by the header and the footer.
 *
 * The landmarks do not share a component. The header is a disclosure and
 * the footer is a static row, so one component would need a variant for
 * two call sites. The labels and the URL are the part that must stay in
 * step.
 *
 * `to` is `/`, this client's listings screen. The Angular client reaches
 * the same screen at `/listings`. Phase 4.1 kept `/` as the Vue route, and
 * this list follows that contract.
 */
export interface PrimaryNavLink {
  readonly label: string;
  readonly to: string;
}

export const primaryNavLinks: readonly PrimaryNavLink[] = [
  { label: 'Home', to: '/' },
  { label: 'Listings', to: '/' },
];
