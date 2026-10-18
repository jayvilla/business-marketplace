using BusinessMarketplace.Api.Models;
using BusinessMarketplace.Api.Services;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;

namespace BusinessMarketplace.Api.Tests;

public class BusinessListingServiceTests
{
    private static readonly Guid ElmStreetBistroId = Guid.Parse("01900000-0000-7000-8000-000000000001");
    private static readonly Guid CascadeAnalyticsId = Guid.Parse("01900000-0000-7000-8000-000000000009");
    private static readonly Guid SonoranHomeGoodsId = Guid.Parse("01900000-0000-7000-8000-00000000000a");
    private static readonly Guid BeaconDentalId = Guid.Parse("01900000-0000-7000-8000-00000000000b");

    private readonly BusinessListingService _service = new();

    [Fact]
    public async Task GetActiveListingsAsync_ReturnsOnlyActiveListings()
    {
        var listings = await _service.GetActiveListingsAsync();

        Assert.Equal(8, listings.Count);
        Assert.All(listings, listing => Assert.Equal(ListingStatus.Active, listing.Status));
        Assert.Contains(listings, listing => listing.Id == ElmStreetBistroId);
        Assert.DoesNotContain(listings, listing => listing.Id == CascadeAnalyticsId);
        Assert.DoesNotContain(listings, listing => listing.Id == SonoranHomeGoodsId);
        Assert.DoesNotContain(listings, listing => listing.Id == BeaconDentalId);
    }

    [Fact]
    public async Task GetByIdAsync_ReturnsTheListingForAKnownId()
    {
        var active = await _service.GetByIdAsync(ElmStreetBistroId);
        var draft = await _service.GetByIdAsync(CascadeAnalyticsId);
        var pending = await _service.GetByIdAsync(SonoranHomeGoodsId);
        var sold = await _service.GetByIdAsync(BeaconDentalId);

        Assert.NotNull(active);
        Assert.Equal("Elm Street Bistro", active.Title);
        Assert.Equal(ListingStatus.Active, active.Status);
        Assert.Equal(875_000m, active.AskingPrice);

        Assert.NotNull(draft);
        Assert.Equal("Cascade Analytics", draft.Title);
        Assert.Equal(ListingStatus.Draft, draft.Status);

        Assert.NotNull(pending);
        Assert.Equal("Sonoran Home Goods", pending.Title);
        Assert.Equal(ListingStatus.Pending, pending.Status);

        Assert.NotNull(sold);
        Assert.Equal("Beacon Dental", sold.Title);
        Assert.Equal(ListingStatus.Sold, sold.Status);
    }

    [Fact]
    public async Task GetByIdAsync_ReturnsNullForAnUnknownId()
    {
        var missing = await _service.GetByIdAsync(Guid.Parse("01900000-0000-7000-8000-0000000000ff"));
        var empty = await _service.GetByIdAsync(Guid.Empty);

        Assert.Null(missing);
        Assert.Null(empty);
    }

    [Fact]
    public async Task Queries_ThrowWhenCancellationWasRequested()
    {
        using var canceled = new CancellationTokenSource();
        canceled.Cancel();

        await Assert.ThrowsAsync<OperationCanceledException>(
            () => _service.GetActiveListingsAsync(canceled.Token));
        await Assert.ThrowsAsync<OperationCanceledException>(
            () => _service.GetByIdAsync(ElmStreetBistroId, canceled.Token));
    }

    [Fact]
    public async Task Retrieval_DoesNotChangeTheCatalog()
    {
        var first = await _service.GetActiveListingsAsync();
        var sold = await _service.GetByIdAsync(BeaconDentalId);

        Assert.NotNull(sold);
        Assert.IsType<BusinessListing[]>(first);
        Array.Clear((BusinessListing[])first);

        var second = await _service.GetActiveListingsAsync();
        var soldAgain = await _service.GetByIdAsync(BeaconDentalId);

        Assert.Equal(8, second.Count);
        Assert.Contains(second, listing => listing.Title == "Elm Street Bistro");
        Assert.NotNull(soldAgain);
        Assert.Equal(ListingStatus.Sold, soldAgain.Status);
        Assert.Equal(1_350_000m, soldAgain.AskingPrice);
    }
}

public class BusinessListingServiceRegistrationTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public BusinessListingServiceRegistrationTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory;
    }

    [Fact]
    public void ScopedRegistration_ReusesOneInstanceInsideAScope()
    {
        using var scope = _factory.Services.CreateScope();
        var first = scope.ServiceProvider.GetRequiredService<IBusinessListingService>();
        var second = scope.ServiceProvider.GetRequiredService<IBusinessListingService>();

        Assert.Same(first, second);
        Assert.IsType<BusinessListingService>(first);
    }

    [Fact]
    public void ScopedRegistration_CreatesANewInstanceForAnotherScope()
    {
        using var firstScope = _factory.Services.CreateScope();
        using var secondScope = _factory.Services.CreateScope();

        var first = firstScope.ServiceProvider.GetRequiredService<IBusinessListingService>();
        var second = secondScope.ServiceProvider.GetRequiredService<IBusinessListingService>();

        Assert.NotSame(first, second);
    }
}
