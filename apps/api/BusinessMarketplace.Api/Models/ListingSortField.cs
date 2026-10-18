namespace BusinessMarketplace.Api.Models;

/// <summary>
/// Columns a caller may order the public listing page by.
///
/// The summary JSON does not include <see cref="CreatedAt"/>. The column
/// still exists on the row, so "newest" can be ordered in PostgreSQL
/// without adding the timestamp to every card.
/// </summary>
public enum ListingSortField
{
    AskingPrice,
    AnnualRevenue,
    CreatedAt,
}
