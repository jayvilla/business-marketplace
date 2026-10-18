using BusinessMarketplace.Api.Models;

namespace BusinessMarketplace.Api.Services;

/// <summary>
/// Service result for one filtered page. The controller maps
/// <see cref="Items"/> to summary DTOs. TotalCount is the match count,
/// not <c>Items.Count</c>.
/// </summary>
public sealed record BusinessListingPage(
    IReadOnlyList<BusinessListing> Items,
    int Page,
    int PageSize,
    int TotalCount);
