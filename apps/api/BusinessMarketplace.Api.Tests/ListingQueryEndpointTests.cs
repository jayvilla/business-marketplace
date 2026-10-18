using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using BusinessMarketplace.Api.Dtos;
using BusinessMarketplace.Api.Services;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace BusinessMarketplace.Api.Tests;

/// <summary>
/// Query contract for GET /api/listings. The sample catalog stands in for
/// PostgreSQL. The filter operators are the ones the EF service uses.
/// </summary>
public class ListingQueryEndpointTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public ListingQueryEndpointTests(WebApplicationFactory<Program> factory)
    {
        _client = factory.WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment(Environments.Development);
            builder.ConfigureTestServices(services =>
            {
                services.AddScoped<IBusinessListingService, SampleCatalogListingService>();
            });
        }).CreateClient();
    }

    [Fact]
    public async Task Search_MatchesTitleCityAndDescriptionWithoutRegardToCase()
    {
        var byTitle = await ReadPage("search=BAKERY");
        Assert.Equal(1, byTitle.TotalCount);
        Assert.Equal("King Street Bakery", byTitle.Items[0].Title);

        var byCity = await ReadPage("search=portland");
        Assert.Equal(["Elm Street Bistro"], byCity.Items.Select(listing => listing.Title).ToArray());
    }

    [Fact]
    public async Task Search_DoesNotReturnUnpublishedRows()
    {
        var page = await ReadPage("search=analytics");

        Assert.Equal(0, page.TotalCount);
        Assert.Empty(page.Items);
    }

    [Fact]
    public async Task Category_LimitsThePage()
    {
        var page = await ReadPage("category=Restaurant");

        Assert.Equal(2, page.TotalCount);
        Assert.Equal(
            ["King Street Bakery", "Elm Street Bistro"],
            page.Items.Select(listing => listing.Title).ToArray());
    }

    [Fact]
    public async Task Category_RejectsAnUnknownName()
    {
        var response = await _client.GetAsync("/api/listings?category=Coffee");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Price_IsInclusiveAndRejectsAnInvertedRange()
    {
        var page = await ReadPage("minPrice=540000&maxPrice=875000");

        Assert.Equal(
            ["Elm Street Bistro", "King Street Bakery", "Northbridge Accounting"],
            page.Items.Select(listing => listing.Title).OrderBy(title => title).ToArray());

        var inverted = await _client.GetAsync("/api/listings?minPrice=10&maxPrice=1");

        Assert.Equal(HttpStatusCode.BadRequest, inverted.StatusCode);
        var problem = await inverted.Content.ReadFromJsonAsync<HttpValidationProblemDetails>();
        Assert.NotNull(problem);
        Assert.Equal(StatusCodes.Status400BadRequest, problem.Status);
    }

    [Fact]
    public async Task Sort_AskingPriceAscending_PutsTheLowestPriceFirst()
    {
        var page = await ReadPage("sortBy=AskingPrice&sortDirection=Asc");

        Assert.Equal("Highline Outfitters", page.Items[0].Title);
        Assert.Equal(320_000m, page.Items[0].AskingPrice);
    }

    [Fact]
    public async Task Sort_AnnualRevenueDescending_PutsUndisclosedRevenueLast()
    {
        var page = await ReadPage("sortBy=AnnualRevenue&sortDirection=Desc&pageSize=8");

        Assert.Equal("Lakeshore Precision", page.Items[0].Title);
        Assert.Equal("Gulf Breeze Car Wash", page.Items[^1].Title);
        Assert.Null(page.Items[^1].AnnualRevenue);
    }

    [Fact]
    public async Task Page_ReturnsTheRequestedSliceAndTheFullMatchCount()
    {
        var page = await ReadPage("page=2");

        Assert.Equal(2, page.Page);
        Assert.Equal(6, page.PageSize);
        Assert.Equal(8, page.TotalCount);
        Assert.Equal(2, page.Items.Count);
        Assert.Equal(
            ["Northline Software", "Lakeshore Precision"],
            page.Items.Select(listing => listing.Title).ToArray());
    }

    [Fact]
    public async Task Page_PastTheEnd_IsEmptyAndKeepsTheTotal()
    {
        var page = await ReadPage("page=9");

        Assert.Equal(9, page.Page);
        Assert.Empty(page.Items);
        Assert.Equal(8, page.TotalCount);
    }

    [Theory]
    [InlineData("page=0")]
    [InlineData("pageSize=100")]
    [InlineData("minPrice=-1")]
    public async Task OutOfRangeNumbers_AreRejected(string query)
    {
        var response = await _client.GetAsync($"/api/listings?{query}");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    private async Task<BusinessListingPageDto> ReadPage(string query)
    {
        var response = await _client.GetAsync($"/api/listings?{query}");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var page = JsonSerializer.Deserialize<BusinessListingPageDto>(
            await response.Content.ReadAsStringAsync(),
            JsonSerializerOptions.Web);

        Assert.NotNull(page);
        return page;
    }
}
