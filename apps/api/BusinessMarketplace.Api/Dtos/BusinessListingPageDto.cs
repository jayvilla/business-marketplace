namespace BusinessMarketplace.Api.Dtos;

/// <summary>
/// One page of listing cards.
///
/// <see cref="Items"/> is only the requested page. <see cref="TotalCount"/>
/// is the number of active rows that match the filters, before skip and
/// take. The client derives the page count from those two numbers. A
/// <c>totalPages</c> field would be a second copy of that division.
///
/// An empty match is 200 with <c>items: []</c> and <c>totalCount: 0</c>.
/// It is not 404 and it is not a bare array. The bare array could not say
/// "8 matches, this page has 6."
/// </summary>
public sealed record BusinessListingPageDto
{
    public required IReadOnlyList<BusinessListingSummaryDto> Items { get; init; }

    public required int Page { get; init; }

    public required int PageSize { get; init; }

    public required int TotalCount { get; init; }
}
