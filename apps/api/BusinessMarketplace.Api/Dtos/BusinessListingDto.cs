using System.Text.Json.Serialization;
using BusinessMarketplace.Api.Models;

namespace BusinessMarketplace.Api.Dtos;

/// <summary>
/// Full listing returned for a detail view.
///
/// A DTO is the HTTP contract. <see cref="BusinessListing"/> is the
/// in-memory entity. They happen to carry the same facts today. They stay
/// separate so a column, a private note, or a concurrency token can be
/// added to the entity later without becoming JSON. Returning the entity
/// from a controller also breaks as soon as the entity gains a navigation
/// property: the serializer walks it, and the client depends on storage shape.
///
/// This is a record, so two instances with the same property values compare
/// as equal. Properties are init-only. An object initializer can set them,
/// and a later statement cannot. That is the C# form of the readonly fields
/// on the Angular listing type. set would allow a controller to change a
/// response it had already mapped.
///
/// HealthStatus is a positional record because it has two fields. This one
/// is wide, so the properties are named. A 13-argument constructor call
/// hides which value is the city and which is the state.
///
/// Category and Status are written as names ("Restaurant", "Active"), not
/// integers. System.Text.Json's default is the integer. Integers are stable
/// in a database and opaque in a TypeScript client. The converter is on
/// these properties rather than on the enum so the domain type stays free
/// of JSON. Property names are still camelCase (category, askingPrice)
/// because that is the ASP.NET Core JSON default. The enum name itself
/// stays PascalCase; camel-casing the member would be a second rename of
/// the identifier.
///
/// decimal is still a decimal in the CLR. On the wire it is a JSON number,
/// which is what the current Angular model types as number. JavaScript
/// numbers are doubles. Amounts in this marketplace are US dollars at
/// cent precision, which is the range this phase accepts. A string decimal
/// would preserve every scale and would not match that client type.
/// </summary>
public sealed record BusinessListingDto
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

    [JsonConverter(typeof(JsonStringEnumConverter<ListingStatus>))]
    public required ListingStatus Status { get; init; }

    public string? ImageUrl { get; init; }

    public required DateTimeOffset CreatedAt { get; init; }

    public required DateTimeOffset UpdatedAt { get; init; }
}
