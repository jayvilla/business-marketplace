using BusinessMarketplace.Api.Dtos;
using BusinessMarketplace.Api.Models;

namespace BusinessMarketplace.Api.Services;

/// <summary>
/// The filter and sort for the public catalog, as one composable query.
///
/// Both the EF service and the in-memory HTTP test double call this.
/// The operators stay here so a category or price rule cannot be fixed in
/// the test double and left wrong in PostgreSQL. Entity Framework translates
/// <c>Where</c>, <c>OrderBy</c>, <c>Skip</c>, and <c>Take</c> to SQL.
/// The test double runs the same operators against the sample list.
/// Nothing in here loads the table and then filters in memory.
/// </summary>
internal static class ActiveListingQuery
{
    internal static IQueryable<BusinessListing> Apply(
        IQueryable<BusinessListing> source,
        ListingQuery query)
    {
        IQueryable<BusinessListing> filtered = source.Where(listing =>
            listing.Status == ListingStatus.Active);

        var search = query.Search?.Trim();
        if (!string.IsNullOrEmpty(search))
        {
            // ToLower().Contains is a literal substring. EF parameterizes
            // the term and escapes LIKE wildcards, so a search for "%" does
            // not become "match everything."
            var term = search.ToLower();
            filtered = filtered.Where(listing =>
                listing.Title.ToLower().Contains(term)
                || listing.Description.ToLower().Contains(term)
                || listing.City.ToLower().Contains(term)
                || listing.State.ToLower().Contains(term));
        }

        if (query.Category is { } category)
        {
            filtered = filtered.Where(listing => listing.Category == category);
        }

        if (query.MinPrice is { } minPrice)
        {
            filtered = filtered.Where(listing => listing.AskingPrice >= minPrice);
        }

        if (query.MaxPrice is { } maxPrice)
        {
            filtered = filtered.Where(listing => listing.AskingPrice <= maxPrice);
        }

        return Order(filtered, query);
    }

    private static IQueryable<BusinessListing> Order(
        IQueryable<BusinessListing> source,
        ListingQuery query)
    {
        var descending = query.SortDirection == ListingSortDirection.Desc;

        // ThenBy Id keeps a tie from swapping places between requests.
        return query.SortBy switch
        {
            ListingSortField.AskingPrice => descending
                ? source.OrderByDescending(listing => listing.AskingPrice).ThenBy(listing => listing.Id)
                : source.OrderBy(listing => listing.AskingPrice).ThenBy(listing => listing.Id),
            // Null revenue is "not disclosed," so it sorts after real amounts
            // in either direction. PostgreSQL would otherwise put nulls first
            // on a descending sort.
            ListingSortField.AnnualRevenue => descending
                ? source.OrderBy(listing => listing.AnnualRevenue == null)
                    .ThenByDescending(listing => listing.AnnualRevenue)
                    .ThenBy(listing => listing.Id)
                : source.OrderBy(listing => listing.AnnualRevenue == null)
                    .ThenBy(listing => listing.AnnualRevenue)
                    .ThenBy(listing => listing.Id),
            _ => descending
                ? source.OrderByDescending(listing => listing.CreatedAt).ThenBy(listing => listing.Id)
                : source.OrderBy(listing => listing.CreatedAt).ThenBy(listing => listing.Id),
        };
    }
}
