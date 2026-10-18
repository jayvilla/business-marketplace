using System.ComponentModel.DataAnnotations;
using BusinessMarketplace.Api.Models;

namespace BusinessMarketplace.Api.Dtos;

/// <summary>
/// Fields <c>GET /api/listings</c> can filter, sort, and page.
///
/// The names are the query-string names. ASP.NET binds them
/// case-insensitively, so <c>minPrice</c> and <c>MinPrice</c> are the same
/// key. Defaults apply when a key is absent. A present key that does not
/// match the type becomes HTTP 400 before the action runs.
///
/// This was added because the collection used to return every active row.
/// Paging that array in the browser would still have downloaded the whole
/// catalog, and a later page of results would not be a page of the database.
/// </summary>
public sealed class ListingQuery : IValidatableObject
{
    public const int DefaultPageSize = 6;

    public const int MaxPageSize = 24;

    public const int MaxSearchLength = 200;

    /// <summary>
    /// Case-insensitive match against title, description, city, and state.
    /// Whitespace is ignored by the service. Longer than
    /// <see cref="MaxSearchLength"/> is a 400.
    /// </summary>
    [StringLength(MaxSearchLength)]
    public string? Search { get; set; }

    /// <summary>
    /// One category identifier, such as <c>Restaurant</c>. Omitted means
    /// every category. An unknown name is a 400.
    /// </summary>
    public BusinessCategory? Category { get; set; }

    /// <summary>
    /// Inclusive lower bound on asking price, in US dollars.
    /// </summary>
    [Range(typeof(decimal), "0", "1000000000")]
    public decimal? MinPrice { get; set; }

    /// <summary>
    /// Inclusive upper bound on asking price, in US dollars.
    /// </summary>
    [Range(typeof(decimal), "0", "1000000000")]
    public decimal? MaxPrice { get; set; }

    /// <summary>
    /// Which column orders the page. Absent means
    /// <see cref="ListingSortField.CreatedAt"/>.
    /// </summary>
    public ListingSortField SortBy { get; set; } = ListingSortField.CreatedAt;

    /// <summary>
    /// Absent means <see cref="ListingSortDirection.Desc"/>, so the default
    /// list is newest first.
    /// </summary>
    public ListingSortDirection SortDirection { get; set; } = ListingSortDirection.Desc;

    /// <summary>
    /// One-based page. Values below 1 are a 400. A page past the last match
    /// is still 200, with an empty <c>items</c> array and the real total.
    /// </summary>
    [Range(1, 10_000)]
    public int Page { get; set; } = 1;

    /// <summary>
    /// Rows in <c>items</c>. The Angular client leaves this off and gets
    /// <see cref="DefaultPageSize"/>. Above <see cref="MaxPageSize"/> is a 400.
    /// </summary>
    [Range(1, MaxPageSize)]
    public int PageSize { get; set; } = DefaultPageSize;

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (MinPrice is { } minPrice && MaxPrice is { } maxPrice && minPrice > maxPrice)
        {
            yield return new ValidationResult(
                "minPrice cannot be greater than maxPrice.",
                [nameof(MinPrice), nameof(MaxPrice)]);
        }
    }
}
