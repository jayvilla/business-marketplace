namespace BusinessMarketplace.Api.Models;

/// <summary>
/// A business offered for sale.
///
/// This is an entity. <see cref="Id"/> is its identity, so the type is a
/// class. A record would treat two instances with the same field values as
/// equal even when they are two listings. The response DTOs are records
/// because a response is a value: the same fields are the same payload.
///
/// Callers construct it with an object initializer. <c>required</c> is a
/// compile-time demand that the initializer assign the property. It is not
/// the same feature as nullability:
/// a required string must be assigned, and it cannot be null;
/// a decimal? may be left unset, and then it is null.
/// Null on AnnualRevenue, CashFlow, or ImageUrl means "not disclosed".
/// Zero is a real amount, not a placeholder for missing.
///
/// Id and CreatedAt are init-only: they can be assigned while the object
/// is being initialized, and not after. Fields a seller can edit use set.
/// UpdatedAt uses set because a later edit replaces that timestamp on the
/// same object.
///
/// Guid, decimal, and DateTimeOffset are structs. They always have a
/// value, and required is what stops a caller from leaving the zero value
/// (Guid.Empty, 0m, or year 1) in place by forgetting the assignment.
/// string? is a different kind of ?: string is a reference type, and the
/// question mark is a compiler annotation. decimal? is Nullable&lt;decimal&gt;,
/// an actual wrapper type. The two look alike and behave differently.
///
/// This type does not generate an id or a timestamp. A future create path
/// and a future database load both have to supply them, and a load must
/// keep the values already stored. There is no check yet for price range,
/// text length, state codes, or legal status changes.
/// </summary>
public sealed class BusinessListing
{
    /// <summary>
    /// 128-bit identifier. JSON sends a Guid as a string. TypeScript will
    /// see that string. It is not an auto-incrementing number.
    /// </summary>
    public required Guid Id { get; init; }

    public required string Title { get; set; }

    public required string Description { get; set; }

    /// <summary>
    /// Asking price in US dollars, not cents. decimal is base-10.
    /// double and float are binary and cannot store 0.10 exactly, so they
    /// are the wrong type for money. A decimal literal needs an m suffix:
    /// 875000.50m. The bare literal 875000.50 is a double and does not
    /// assign here.
    /// </summary>
    public required decimal AskingPrice { get; set; }

    /// <summary>
    /// Null when the seller has not disclosed revenue.
    /// </summary>
    public decimal? AnnualRevenue { get; set; }

    /// <summary>
    /// Null when the seller has not disclosed cash flow.
    /// </summary>
    public decimal? CashFlow { get; set; }

    public required string City { get; set; }

    /// <summary>
    /// Free text such as "OR" or "Oregon". Not checked against a list.
    /// </summary>
    public required string State { get; set; }

    public required BusinessCategory Category { get; set; }

    public required ListingStatus Status { get; set; }

    /// <summary>
    /// Null when the listing has no photograph. The compiler will not treat
    /// this as a string until a null check (or the null-forgiving !) says so.
    /// </summary>
    public string? ImageUrl { get; set; }

    /// <summary>
    /// Instant plus the offset that was in effect when it was recorded.
    /// DateTime has no offset, so the same ticks can mean local, UTC, or
    /// "unspecified" depending on the machine that reads them.
    /// JSON writes an ISO-8601 string. A TypeScript client receives that
    /// string, not a Date, until it parses the string.
    /// </summary>
    public required DateTimeOffset CreatedAt { get; init; }

    public required DateTimeOffset UpdatedAt { get; set; }
}
