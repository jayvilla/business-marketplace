using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using BusinessMarketplace.Api.Dtos;
using BusinessMarketplace.Api.Models;
using BusinessMarketplace.Api.Services;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace BusinessMarketplace.Api.Tests;

public class BusinessListingsEndpointTests : IClassFixture<WebApplicationFactory<Program>>
{
    private static readonly Guid ElmStreetBistroId = Guid.Parse("01900000-0000-7000-8000-000000000001");
    private static readonly Guid CascadeAnalyticsId = Guid.Parse("01900000-0000-7000-8000-000000000009");
    private static readonly Guid SonoranHomeGoodsId = Guid.Parse("01900000-0000-7000-8000-00000000000a");
    private static readonly Guid BeaconDentalId = Guid.Parse("01900000-0000-7000-8000-00000000000b");

    private readonly HttpClient _client;

    public BusinessListingsEndpointTests(WebApplicationFactory<Program> factory)
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
    public async Task GetListings_ReturnsActiveSummaries()
    {
        var response = await _client.GetAsync("/api/listings");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var json = await response.Content.ReadAsStringAsync();
        var page = JsonSerializer.Deserialize<BusinessListingPageDto>(json, JsonSerializerOptions.Web);

        Assert.NotNull(page);
        Assert.Equal(1, page.Page);
        Assert.Equal(ListingQuery.DefaultPageSize, page.PageSize);
        Assert.Equal(8, page.TotalCount);
        Assert.Equal(ListingQuery.DefaultPageSize, page.Items.Count);
        Assert.Equal("King Street Bakery", page.Items[0].Title);
        Assert.Contains(page.Items, listing => listing.Id == ElmStreetBistroId && listing.Title == "Elm Street Bistro");
        Assert.DoesNotContain(page.Items, listing => listing.Id == CascadeAnalyticsId);
        Assert.DoesNotContain(page.Items, listing => listing.Id == SonoranHomeGoodsId);
        Assert.DoesNotContain(page.Items, listing => listing.Id == BeaconDentalId);
        Assert.All(page.Items, listing => Assert.False(string.IsNullOrWhiteSpace(listing.Title)));

        Assert.Contains("\"category\":\"Restaurant\"", json, StringComparison.Ordinal);
        Assert.Contains("\"askingPrice\":", json, StringComparison.Ordinal);
        Assert.DoesNotContain("\"status\"", json, StringComparison.Ordinal);
        Assert.DoesNotContain("createdAt", json, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("Beacon Dental", json, StringComparison.Ordinal);
    }

    [Fact]
    public async Task GetListings_ReturnsEmptyArrayWhenNoneAreActive()
    {
        await using var factory = new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment(Environments.Development);
            builder.ConfigureTestServices(services =>
            {
                services.AddScoped<IBusinessListingService>(_ => new NoActiveListings());
            });
        });
        var client = factory.CreateClient();

        var response = await client.GetAsync("/api/listings");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var page = JsonSerializer.Deserialize<BusinessListingPageDto>(
            await response.Content.ReadAsStringAsync(),
            JsonSerializerOptions.Web);

        Assert.NotNull(page);
        Assert.Empty(page.Items);
        Assert.Equal(0, page.TotalCount);
    }

    [Theory]
    [InlineData("http://localhost:4200")]
    [InlineData("http://localhost:4201")]
    public async Task GetListings_AllowsConfiguredFrontendOrigin(string origin)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, "/api/listings");
        request.Headers.TryAddWithoutValidation("Origin", origin);

        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(origin, response.Headers.GetValues("Access-Control-Allow-Origin").Single());
    }

    [Fact]
    public async Task GetListing_ReturnsActiveDetail()
    {
        var response = await _client.GetAsync($"/api/listings/{ElmStreetBistroId}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var json = await response.Content.ReadAsStringAsync();
        var listing = JsonSerializer.Deserialize<BusinessListingDto>(json, JsonSerializerOptions.Web);

        Assert.NotNull(listing);
        Assert.Equal(ElmStreetBistroId, listing.Id);
        Assert.Equal("Elm Street Bistro", listing.Title);
        Assert.Equal("Portland", listing.City);
        Assert.Equal("OR", listing.State);
        Assert.Equal(875_000m, listing.AskingPrice);
        Assert.Equal(BusinessCategory.Restaurant, listing.Category);
        Assert.Equal(ListingStatus.Active, listing.Status);

        Assert.Contains("\"status\":\"Active\"", json, StringComparison.Ordinal);
        Assert.Contains("\"category\":\"Restaurant\"", json, StringComparison.Ordinal);
        Assert.Contains("\"createdAt\":", json, StringComparison.Ordinal);
    }

    [Fact]
    public async Task GetListing_ReturnsNotFoundForAnUnknownId()
    {
        var response = await _client.GetAsync("/api/listings/01900000-0000-7000-8000-0000000000ff");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);

        var problem = JsonSerializer.Deserialize<ProblemDetails>(
            await response.Content.ReadAsStringAsync(),
            JsonSerializerOptions.Web);

        Assert.NotNull(problem);
        Assert.Equal(StatusCodes.Status404NotFound, problem.Status);
        Assert.Equal("Not Found", problem.Title);
        Assert.Equal("/api/listings/01900000-0000-7000-8000-0000000000ff", problem.Instance);
        Assert.False(string.IsNullOrWhiteSpace(problem.Extensions["traceId"]?.ToString()));
    }

    [Theory]
    [InlineData("01900000-0000-7000-8000-000000000009")]
    [InlineData("01900000-0000-7000-8000-00000000000a")]
    [InlineData("01900000-0000-7000-8000-00000000000b")]
    public async Task GetListing_ReturnsNotFoundWhenTheListingIsNotActive(string id)
    {
        var response = await _client.GetAsync($"/api/listings/{id}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync();
        var problem = JsonSerializer.Deserialize<ProblemDetails>(body, JsonSerializerOptions.Web);

        Assert.NotNull(problem);
        Assert.Equal(StatusCodes.Status404NotFound, problem.Status);
        Assert.DoesNotContain("Cascade Analytics", body, StringComparison.Ordinal);
        Assert.DoesNotContain("Sonoran Home Goods", body, StringComparison.Ordinal);
        Assert.DoesNotContain("Beacon Dental", body, StringComparison.Ordinal);
    }

    [Fact]
    public async Task GetListing_ReturnsValidationProblemForAMalformedId()
    {
        var response = await _client.GetAsync("/api/listings/not-a-guid");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("application/json", response.Content.Headers.ContentType?.MediaType);

        var problem = await response.Content.ReadFromJsonAsync<HttpValidationProblemDetails>();

        Assert.NotNull(problem);
        Assert.Equal(StatusCodes.Status400BadRequest, problem.Status);
        Assert.True(problem.Errors.ContainsKey("id"));
        Assert.Equal("/api/listings/not-a-guid", problem.Instance);
        Assert.False(string.IsNullOrWhiteSpace(problem.Extensions["traceId"]?.ToString()));
    }

    private sealed class NoActiveListings : IBusinessListingService
    {
        public Task<BusinessListingPage> GetActiveListingsAsync(
            ListingQuery query,
            CancellationToken cancellationToken = default)
        {
            return Task.FromResult(new BusinessListingPage([], query.Page, query.PageSize, 0));
        }

        public Task<BusinessListing?> GetByIdAsync(
            Guid id,
            CancellationToken cancellationToken = default)
        {
            return Task.FromResult<BusinessListing?>(null);
        }
    }
}
