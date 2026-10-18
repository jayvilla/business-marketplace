using System.Text.Json.Serialization;
using BusinessMarketplace.Api.Models;

namespace BusinessMarketplace.Api.Dtos;

/// <summary>
/// Listing card payload.
///
/// The Angular card renders the photograph, category, title, city and state,
/// description, asking price, annual revenue, and cash flow. Id is included
/// so a card can open a detail route. The card does not render it.
///
/// Status and the two timestamps stay on <see cref="BusinessListingDto"/>.
/// A card list should not grow every time the detail view gains a field.
/// City and State stay separate. The Angular model joins them into one
/// location string, and that join is a view concern. The card's featured
/// flag is also a view concern: this domain has no such field.
///
/// Category uses the same string enum converter as the detail DTO.
/// </summary>
public sealed record BusinessListingSummaryDto
{
    public required Guid Id { get; init; }

    public required string Title { get; init; }

    public required string Description { get; init; }

    public required decimal AskingPrice { get; init; }

    public decimal? AnnualRevenue { get; init; }

    public decimal? CashFlow { get; init; }

    public required string City { get; init; }

    public required string State { get; init; }

    [JsonConverter(typeof(JsonStringEnumConverter<BusinessCategory>))]
    public required BusinessCategory Category { get; init; }

    public string? ImageUrl { get; init; }
}
