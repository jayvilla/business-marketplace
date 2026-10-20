using BusinessMarketplace.Api.Controllers;
using BusinessMarketplace.Api.Dtos;
using BusinessMarketplace.Api.Models;
using BusinessMarketplace.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging.Abstractions;

namespace BusinessMarketplace.Api.Tests;

/// <summary>
/// The listing controller, called as a class.
///
/// The HTTP tests already send requests through the pipeline. These call
/// the action the way a unit test calls a function. That skips model
/// binding, the problem-details filter, and PostgreSQL. What remains is
/// the decision this class owns: an empty page is 200, and a row that is
/// not Active is 404 even though the service returned it.
///
/// The service is a fake written in the test, not a mocking library.
/// It records the <see cref="CancellationToken"/> so a regression that
/// drops the token fails here. NestJS does the same with a testing-module
/// override of a provider.
/// </summary>
public class BusinessListingsControllerTests
{
    private static readonly Guid ListingId = Guid.Parse("01900000-0000-7000-8000-000000000201");

    [Fact]
    public async Task GetActive_PassesTheCancellationTokenAndReturnsAnEmptyPage()
    {
        var listings = new RecordingListings();
        var controller = new BusinessListingsController(listings, NullLogger<BusinessListingsController>.Instance);
        using var cancellation = new CancellationTokenSource();

        var action = await controller.GetActive(new ListingQuery(), cancellation.Token);

        Assert.Equal(cancellation.Token, listings.Observed);
        var ok = Assert.IsType<OkObjectResult>(action.Result);
        var page = Assert.IsType<BusinessListingPageDto>(ok.Value);
        Assert.Empty(page.Items);
        Assert.Equal(0, page.TotalCount);
    }

    [Fact]
    public async Task GetById_ReturnsNotFoundWhenTheServiceReturnsNull()
    {
        var controller = Controller(detail: null);

        var action = await controller.GetById(ListingId, CancellationToken.None);

        Assert.IsType<NotFoundResult>(action.Result);
    }

    [Theory]
    [InlineData(ListingStatus.Draft)]
    [InlineData(ListingStatus.Pending)]
    [InlineData(ListingStatus.Sold)]
    public async Task GetById_ReturnsNotFoundWhenTheListingIsNotActive(ListingStatus status)
    {
        var controller = Controller(detail: Listing(status));

        var action = await controller.GetById(ListingId, CancellationToken.None);

        Assert.IsType<NotFoundResult>(action.Result);
    }

    [Fact]
    public async Task GetById_ReturnsTheDetailDtoForAnActiveListing()
    {
        var listings = new RecordingListings { Detail = Listing(ListingStatus.Active) };
        var controller = new BusinessListingsController(listings, NullLogger<BusinessListingsController>.Instance);
        using var cancellation = new CancellationTokenSource();

        var action = await controller.GetById(ListingId, cancellation.Token);

        Assert.Equal(cancellation.Token, listings.Observed);
        var ok = Assert.IsType<OkObjectResult>(action.Result);
        var dto = Assert.IsType<BusinessListingDto>(ok.Value);
        Assert.Equal(ListingId, dto.Id);
        Assert.Equal(ListingStatus.Active, dto.Status);
        Assert.Null(dto.CashFlow);
    }

    private static BusinessListingsController Controller(BusinessListing? detail)
    {
        return new BusinessListingsController(
            new RecordingListings { Detail = detail },
            NullLogger<BusinessListingsController>.Instance);
    }

    private static BusinessListing Listing(ListingStatus status)
    {
        return new BusinessListing
        {
            Id = ListingId,
            Title = "Controller fixture",
            Description = "Used only by the controller unit test.",
            AskingPrice = 10m,
            AnnualRevenue = null,
            CashFlow = null,
            City = "Salem",
            State = "OR",
            Category = BusinessCategory.Other,
            Status = status,
            ImageUrl = null,
            CreatedAt = new DateTimeOffset(2026, 1, 1, 0, 0, 0, TimeSpan.Zero),
            UpdatedAt = new DateTimeOffset(2026, 1, 2, 0, 0, 0, TimeSpan.Zero),
        };
    }

    private sealed class RecordingListings : IBusinessListingService
    {
        public CancellationToken Observed { get; private set; }

        public BusinessListing? Detail { get; init; }

        public Task<BusinessListingPage> GetActiveListingsAsync(
            ListingQuery query,
            CancellationToken cancellationToken = default)
        {
            Observed = cancellationToken;
            return Task.FromResult(new BusinessListingPage([], query.Page, query.PageSize, 0));
        }

        public Task<BusinessListing?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
        {
            Observed = cancellationToken;
            return Task.FromResult(Detail);
        }
    }
}
