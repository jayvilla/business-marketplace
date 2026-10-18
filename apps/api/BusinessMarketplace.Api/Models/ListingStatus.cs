namespace BusinessMarketplace.Api.Models;

/// <summary>
/// Where a listing is in its sale. The integers are stable for the same
/// reason as <see cref="BusinessCategory"/>: append new members, do not
/// renumber, and leave 0 unnamed so default(ListingStatus) is not Draft.
///
/// No transition is enforced. Draft can be saved, Active is publicly for
/// sale, Pending means an offer is in progress, and Sold means the sale
/// completed. Checking that a Sold listing is not moved backward is a later
/// rule, not a property of this enum.
/// </summary>
public enum ListingStatus
{
    Draft = 1,
    Active = 2,
    Pending = 3,
    Sold = 4,
}
