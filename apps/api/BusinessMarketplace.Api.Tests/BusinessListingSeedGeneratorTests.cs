using BusinessMarketplace.Api.Data;
using BusinessMarketplace.Api.Models;

namespace BusinessMarketplace.Api.Tests;

/// <summary>
/// The generator is a pure function: no database and no clock.
///
/// These are unit tests in the Jest sense. A <see cref="FactAttribute"/> is
/// one case, like <c>it('...')</c>. A <see cref="TheoryAttribute"/> is
/// <c>it.each</c>: the same body, several inputs. Nothing here is marked
/// Integration, so <c>nx test-unit api</c> runs it and Docker is not required.
///
/// The assertions lock the seed contract. A later edit that groups every
/// Active row together, draws a random Guid, or uses today's date will fail
/// here before it reaches PostgreSQL.
/// </summary>
public sealed class BusinessListingSeedGeneratorTests
{
    private static readonly string[] RequiredStates =
    [
        "CA", "TX", "FL", "NY", "WA", "AZ", "CO", "NV", "OR", "GA", "NC", "IL", "MA", "TN", "PA",
    ];

    [Fact]
    public void Create_ReturnsFiveHundredListingsWithTheRequiredStatusMix()
    {
        var listings = BusinessListingSeedGenerator.Create();

        Assert.Equal(500, listings.Count);
        Assert.Equal(500, BusinessListingSeedGenerator.Count);
        Assert.Equal(425, listings.Count(listing => listing.Status == ListingStatus.Active));
        Assert.Equal(35, listings.Count(listing => listing.Status == ListingStatus.Pending));
        Assert.Equal(25, listings.Count(listing => listing.Status == ListingStatus.Sold));
        Assert.Equal(15, listings.Count(listing => listing.Status == ListingStatus.Draft));
        Assert.True(StatusRuns(listings) > 10);
    }

    [Fact]
    public void Create_UsesEveryCategoryAndOnlyDefinedValues()
    {
        var listings = BusinessListingSeedGenerator.Create();

        Assert.All(listings, listing => Assert.True(Enum.IsDefined(listing.Category)));
        Assert.All(
            Enum.GetValues<BusinessCategory>(),
            category => Assert.Contains(listings, listing => listing.Category == category));
    }

    [Fact]
    public void Create_UsesRealCityStatePairsAcrossTheRequiredStates()
    {
        var listings = BusinessListingSeedGenerator.Create();
        var pairs = BusinessListingSeedGenerator.Locations
            .Select(location => (location.City, location.State))
            .ToHashSet();

        Assert.All(listings, listing => Assert.Contains((listing.City, listing.State), pairs));
        Assert.All(RequiredStates, state => Assert.Contains(listings, listing => listing.State == state));
        Assert.Contains(listings, listing => listing.City == "Bend" && listing.State == "OR");
        Assert.Contains(listings, listing => listing.City == "Peoria" && listing.State == "IL");
        Assert.Contains(listings, listing => listing.City == "Flagstaff" && listing.State == "AZ");
        Assert.Contains(listings, listing => listing.City == "Lancaster" && listing.State == "PA");
    }

    [Fact]
    public void Create_KeepsMoneyInRangeAndAllowsMissingFigures()
    {
        var listings = BusinessListingSeedGenerator.Create();

        Assert.All(listings, listing =>
        {
            Assert.InRange(
                listing.AskingPrice,
                BusinessListingSeedGenerator.MinimumAskingPrice,
                BusinessListingSeedGenerator.MaximumAskingPrice);
            Assert.Equal(listing.AskingPrice, decimal.Round(listing.AskingPrice, 2));

            if (listing.AnnualRevenue is { } revenue)
            {
                Assert.True(revenue > 0m);
                Assert.Equal(revenue, decimal.Round(revenue, 2));
            }

            if (listing.CashFlow is { } cashFlow)
            {
                Assert.True(cashFlow > 0m);
                Assert.Equal(cashFlow, decimal.Round(cashFlow, 2));
            }

            if (listing.AnnualRevenue is { } disclosedRevenue && listing.CashFlow is { } disclosedCashFlow)
            {
                Assert.True(disclosedCashFlow < disclosedRevenue);
            }
        });

        Assert.Contains(listings, listing => listing.AnnualRevenue is null);
        Assert.Contains(listings, listing => listing.CashFlow is null);
        Assert.Contains(listings, listing => listing.AnnualRevenue is null && listing.CashFlow is null);
        Assert.Contains(listings, listing => listing.AskingPrice == BusinessListingSeedGenerator.RepeatedLowPrice);
        Assert.Contains(listings, listing => listing.AskingPrice == BusinessListingSeedGenerator.MaximumAskingPrice);
        Assert.True(listings.Count(listing => listing.AskingPrice == BusinessListingSeedGenerator.RepeatedMidPrice) >= 2);
        Assert.True(listings.Count(listing => listing.AskingPrice == BusinessListingSeedGenerator.RepeatedHighPrice) >= 2);
    }

    [Fact]
    public void Create_KeepsUpdatedAtOnOrAfterCreatedAtInsideTheReferenceWindow()
    {
        var listings = BusinessListingSeedGenerator.Create();
        var earliest = BusinessListingSeedGenerator.ReferenceDate.AddDays(-730);

        Assert.All(listings, listing =>
        {
            Assert.InRange(listing.CreatedAt, earliest, BusinessListingSeedGenerator.ReferenceDate);
            Assert.InRange(listing.UpdatedAt, listing.CreatedAt, BusinessListingSeedGenerator.ReferenceDate);
        });
    }

    [Fact]
    public void Create_IsDeterministicAndUsesUniqueIdsThatDoNotCollideWithTheSampleCatalog()
    {
        var first = BusinessListingSeedGenerator.Create();
        var second = BusinessListingSeedGenerator.Create();
        var sampleIds = SampleBusinessListings.All.Select(listing => listing.Id).ToHashSet();

        Assert.Equal(first.Select(Signature), second.Select(Signature));
        Assert.Equal(500, first.Select(listing => listing.Id).Distinct().Count());
        Assert.Equal(500, first.Select(listing => listing.Title).Distinct(StringComparer.Ordinal).Count());
        Assert.All(first, listing =>
            Assert.DoesNotContain(
                first,
                other => other.Id != listing.Id
                    && other.Title.Contains(listing.Title, StringComparison.Ordinal)));
        Assert.DoesNotContain(first, listing => sampleIds.Contains(listing.Id));
        Assert.Equal(
            Guid.Parse("01910000-0000-7000-8000-000000000001"),
            BusinessListingSeedGenerator.IdForIndex(0));
        Assert.Equal(
            Guid.Parse("01910000-0000-7000-8000-0000000001f4"),
            BusinessListingSeedGenerator.IdForIndex(499));
        Assert.All(first, listing =>
        {
            Assert.Null(listing.ImageUrl);
            Assert.False(string.IsNullOrWhiteSpace(listing.Title));
            Assert.False(string.IsNullOrWhiteSpace(listing.Description));
            Assert.InRange(listing.Title.Length, 1, 200);
            Assert.InRange(listing.Description.Length, 1, 4000);
        });
    }

    [Theory]
    [InlineData("Production")]
    [InlineData("Staging")]
    [InlineData("Testing")]
    public void Seed_RefusesEveryEnvironmentExceptDevelopment(string environment)
    {
        var exception = Assert.Throws<InvalidOperationException>(() =>
            DevelopmentListingSeeder.EnsureAllowed(environment, resetGenerated: true, seed: true));

        Assert.Contains(environment, exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void Seed_AllowsDevelopmentAndRejectsResetWithoutTheSeedFlag()
    {
        DevelopmentListingSeeder.EnsureAllowed("Development", resetGenerated: false, seed: true);
        DevelopmentListingSeeder.EnsureAllowed("development", resetGenerated: true, seed: true);

        var exception = Assert.Throws<InvalidOperationException>(() =>
            DevelopmentListingSeeder.EnsureAllowed("Development", resetGenerated: true, seed: false));

        Assert.Contains("--seed", exception.Message, StringComparison.Ordinal);
    }

    private static int StatusRuns(IReadOnlyList<BusinessListing> listings)
    {
        var runs = 1;
        for (var index = 1; index < listings.Count; index++)
        {
            if (listings[index].Status != listings[index - 1].Status)
            {
                runs++;
            }
        }

        return runs;
    }

    private static object Signature(BusinessListing listing)
    {
        return (
            listing.Id,
            listing.Title,
            listing.Description,
            listing.AskingPrice,
            listing.AnnualRevenue,
            listing.CashFlow,
            listing.City,
            listing.State,
            listing.Category,
            listing.Status,
            listing.ImageUrl,
            listing.CreatedAt,
            listing.UpdatedAt);
    }
}
