using System.Text.Json;
using BusinessMarketplace.Api.Dtos;
using BusinessMarketplace.Api.Mapping;
using BusinessMarketplace.Api.Models;

namespace BusinessMarketplace.Api.Tests;

public class BusinessListingMappingTests
{
    private static readonly Guid ListingId = Guid.Parse("3f1c0c3e-7b2a-4d6e-9c1f-8a2b6d4e5f70");
    private static readonly DateTimeOffset CreatedAt = new(2026, 4, 1, 15, 30, 0, TimeSpan.Zero);
    private static readonly DateTimeOffset UpdatedAt = new(2026, 10, 18, 11, 0, 0, TimeSpan.Zero);

    [Fact]
    public void ToDto_CopiesEveryField()
    {
        var listing = SampleListing(
            annualRevenue: 420_000.50m,
            cashFlow: 180_000.25m,
            imageUrl: "https://images.example/bistro.jpg");

        var dto = listing.ToDto();

        Assert.Equal(
            new BusinessListingDto
            {
                Id = ListingId,
                Title = "Neighborhood bistro",
                Description = "A sit-down restaurant with a patio.",
                AskingPrice = 875_000.00m,
                AnnualRevenue = 420_000.50m,
                CashFlow = 180_000.25m,
                City = "Portland",
                State = "OR",
                Category = BusinessCategory.Restaurant,
                Status = ListingStatus.Active,
                ImageUrl = "https://images.example/bistro.jpg",
                CreatedAt = CreatedAt,
                UpdatedAt = UpdatedAt,
            },
            dto);

        listing.Title = "Renamed after mapping";

        Assert.Equal("Neighborhood bistro", dto.Title);
    }

    [Fact]
    public void ToSummaryDto_CopiesCardFieldsAndLeavesFinancialsUnset()
    {
        var listing = SampleListing(annualRevenue: null, cashFlow: null, imageUrl: null);

        var summary = listing.ToSummaryDto();

        Assert.Equal(
            new BusinessListingSummaryDto
            {
                Id = ListingId,
                Title = "Neighborhood bistro",
                Description = "A sit-down restaurant with a patio.",
                AskingPrice = 875_000.00m,
                AnnualRevenue = null,
                CashFlow = null,
                City = "Portland",
                State = "OR",
                Category = BusinessCategory.Restaurant,
                ImageUrl = null,
            },
            summary);
    }

    [Fact]
    public void Dto_SerializesEnumsAsMemberNames()
    {
        var dto = SampleListing(
            annualRevenue: 420_000.50m,
            cashFlow: null,
            imageUrl: null).ToDto();

        // Web defaults are the ASP.NET Core JSON settings: camelCase
        // property names. A bare JsonSerializer.Serialize call is not.
        var json = JsonSerializer.Serialize(dto, JsonSerializerOptions.Web);

        Assert.Contains("\"category\":\"Restaurant\"", json, StringComparison.Ordinal);
        Assert.Contains("\"status\":\"Active\"", json, StringComparison.Ordinal);
        Assert.Contains("\"askingPrice\":875000.00", json, StringComparison.Ordinal);
        Assert.DoesNotContain("AskingPrice", json, StringComparison.Ordinal);

        var roundTrip = JsonSerializer.Deserialize<BusinessListingDto>(json, JsonSerializerOptions.Web);

        Assert.Equal(dto, roundTrip);
    }

    [Fact]
    public void SummaryDto_OmitsDetailOnlyFields()
    {
        var json = JsonSerializer.Serialize(
            SampleListing(annualRevenue: null, cashFlow: null, imageUrl: null).ToSummaryDto(),
            JsonSerializerOptions.Web);

        Assert.DoesNotContain("status", json, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("createdAt", json, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("updatedAt", json, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void EnumNumericValues_StayExplicit()
    {
        Assert.Equal(1, (int)BusinessCategory.Restaurant);
        Assert.Equal(2, (int)BusinessCategory.Retail);
        Assert.Equal(3, (int)BusinessCategory.Technology);
        Assert.Equal(4, (int)BusinessCategory.Healthcare);
        Assert.Equal(5, (int)BusinessCategory.Manufacturing);
        Assert.Equal(6, (int)BusinessCategory.ProfessionalServices);
        Assert.Equal(7, (int)BusinessCategory.Other);

        Assert.Equal(1, (int)ListingStatus.Draft);
        Assert.Equal(2, (int)ListingStatus.Active);
        Assert.Equal(3, (int)ListingStatus.Pending);
        Assert.Equal(4, (int)ListingStatus.Sold);

        Assert.False(Enum.IsDefined(default(BusinessCategory)));
        Assert.False(Enum.IsDefined(default(ListingStatus)));
    }

    private static BusinessListing SampleListing(
        decimal? annualRevenue,
        decimal? cashFlow,
        string? imageUrl)
    {
        return new BusinessListing
        {
            Id = ListingId,
            Title = "Neighborhood bistro",
            Description = "A sit-down restaurant with a patio.",
            AskingPrice = 875_000.00m,
            AnnualRevenue = annualRevenue,
            CashFlow = cashFlow,
            City = "Portland",
            State = "OR",
            Category = BusinessCategory.Restaurant,
            Status = ListingStatus.Active,
            ImageUrl = imageUrl,
            CreatedAt = CreatedAt,
            UpdatedAt = UpdatedAt,
        };
    }
}
