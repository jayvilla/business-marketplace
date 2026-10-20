using System.Net;
using System.Text.Json;
using BusinessMarketplace.Api.Data;
using BusinessMarketplace.Api.Dtos;
using BusinessMarketplace.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace BusinessMarketplace.Api.Tests.Integration;

/// <summary>
/// The seeder against the Phase 3.9 PostgreSQL container.
///
/// <see cref="IAsyncLifetime"/> is <c>beforeEach</c> plus <c>afterEach</c>.
/// xUnit builds a new class instance per test, so <see cref="InitializeAsync"/>
/// truncates the table before every case. The container is shared with the
/// other PostgreSQL tests and runs them one at a time. The database name is
/// <c>business_marketplace_test</c>, not the development database.
///
/// A second seed inserting nothing is the idempotency regression. An edited
/// title that survives <c>--seed</c> is the "do not upsert" regression.
/// Reset restoring only the generated ids is the opt-in regression.
/// </summary>
[Collection(PostgresCollection.Name)]
[Trait("Category", "Integration")]
public sealed class DevelopmentSeedTests : IAsyncLifetime
{
    private static readonly Guid StrangerId = Guid.Parse("01900000-0000-7000-8000-0000000000c0");

    private readonly PostgresFixture _postgres;

    public DevelopmentSeedTests(PostgresFixture postgres)
    {
        _postgres = postgres;
    }

    public Task InitializeAsync() => _postgres.ResetAsync([]);

    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task Seed_InsertsMissingRows_AndLeavesExistingRowsAlone()
    {
        var generated = BusinessListingSeedGenerator.Create();
        var edited = generated[0];
        edited.Title = "Edited Before Seed";

        await using (var scope = _postgres.Factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            db.BusinessListings.Add(Stranger());
            db.BusinessListings.Add(edited);
            await db.SaveChangesAsync();
        }

        var first = await SeedAsync();
        var second = await SeedAsync();

        Assert.Equal(SampleBusinessListings.All.Count, first.SampleInserted);
        Assert.Equal(BusinessListingSeedGenerator.Count - 1, first.GeneratedInserted);
        Assert.Equal(0, second.SampleInserted);
        Assert.Equal(0, second.GeneratedInserted);

        await using var check = _postgres.Factory.Services.CreateAsyncScope();
        var stored = check.ServiceProvider.GetRequiredService<AppDbContext>();
        var rows = await stored.BusinessListings.AsNoTracking().ToListAsync();
        var generatedIds = generated.Select(listing => listing.Id).ToHashSet();

        Assert.Equal(SampleBusinessListings.All.Count + generated.Count + 1, rows.Count);
        Assert.Equal(rows.Count, rows.Select(listing => listing.Id).Distinct().Count());
        Assert.Equal(generated.Count, rows.Count(listing => generatedIds.Contains(listing.Id)));
        Assert.Equal("Edited Before Seed", rows.Single(listing => listing.Id == edited.Id).Title);
        Assert.Equal("Kept On Purpose", rows.Single(listing => listing.Id == StrangerId).Title);
        Assert.Contains(rows, listing => listing.Title == "Elm Street Bistro");
    }

    [Fact]
    public async Task ResetGenerated_ReplacesGeneratedRowsAndPreservesTheRest()
    {
        await SeedAsync();
        var original = BusinessListingSeedGenerator.Create().First(listing => listing.Status == ListingStatus.Active);

        await using (var scope = _postgres.Factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            db.BusinessListings.Add(Stranger());
            var row = await db.BusinessListings.SingleAsync(listing => listing.Id == original.Id);
            row.Title = "Edited After Seed";
            await db.SaveChangesAsync();
        }

        await using (var scope = _postgres.Factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var replaced = await DevelopmentListingSeeder.ResetGeneratedAsync(db);
            Assert.Equal(BusinessListingSeedGenerator.Count, replaced);
        }

        await using var check = _postgres.Factory.Services.CreateAsyncScope();
        var stored = check.ServiceProvider.GetRequiredService<AppDbContext>();
        var restored = await stored.BusinessListings.AsNoTracking()
            .SingleAsync(listing => listing.Id == original.Id);
        var stranger = await stored.BusinessListings.AsNoTracking()
            .SingleAsync(listing => listing.Id == StrangerId);
        var sample = await stored.BusinessListings.AsNoTracking()
            .SingleAsync(listing => listing.Title == "Elm Street Bistro");

        Assert.Equal(original.Title, restored.Title);
        Assert.Equal(original.AskingPrice, restored.AskingPrice);
        Assert.Equal(original.Status, restored.Status);
        Assert.Equal("Kept On Purpose", stranger.Title);
        Assert.Equal(ListingStatus.Active, sample.Status);
        var generatedIds = BusinessListingSeedGenerator.Create().Select(listing => listing.Id).ToArray();
        Assert.Equal(
            BusinessListingSeedGenerator.Count,
            await stored.BusinessListings.CountAsync(listing => generatedIds.Contains(listing.Id)));
    }

    [Fact]
    public async Task SeededCatalog_ServesOnlyActiveRowsThroughTheApi()
    {
        await SeedAsync();
        var generated = BusinessListingSeedGenerator.Create();
        var active = generated.First(listing => listing.Status == ListingStatus.Active);
        var hidden = generated.First(listing => listing.Status != ListingStatus.Active);
        var expectedActive = generated.Count(listing => listing.Status == ListingStatus.Active)
            + SampleBusinessListings.All.Count(listing => listing.Status == ListingStatus.Active);
        var expectedCategory = generated.Count(listing =>
                listing.Status == ListingStatus.Active && listing.Category == active.Category)
            + SampleBusinessListings.All.Count(listing =>
                listing.Status == ListingStatus.Active && listing.Category == active.Category);

        var client = _postgres.Factory.CreateClient();
        var page = await ReadPage(client, "/api/listings");
        var filtered = await ReadPage(
            client,
            $"/api/listings?category={active.Category}&pageSize=24");
        var found = await ReadPage(
            client,
            $"/api/listings?search={Uri.EscapeDataString(active.Title)}");
        var hiddenSearch = await ReadPage(
            client,
            $"/api/listings?search={Uri.EscapeDataString(hidden.Title)}");
        var empty = await ReadPage(client, "/api/listings?search=zzzz-no-such-fictional-business");
        var priced = await ReadPage(
            client,
            "/api/listings?minPrice=450000&maxPrice=450000&sortBy=AskingPrice&sortDirection=Asc&pageSize=24");
        var firstPricePage = await ReadPage(
            client,
            "/api/listings?pageSize=6&sortBy=AskingPrice&sortDirection=Asc");
        var second = await ReadPage(
            client,
            "/api/listings?page=2&pageSize=6&sortBy=AskingPrice&sortDirection=Asc");
        var detail = await client.GetAsync($"/api/listings/{active.Id}");
        var hiddenDetail = await client.GetAsync($"/api/listings/{hidden.Id}");

        Assert.NotNull(page);
        Assert.Equal(expectedActive, page.TotalCount);
        Assert.Equal(1, page.Page);
        Assert.Equal(6, page.PageSize);
        Assert.Equal(6, page.Items.Count);

        Assert.NotNull(filtered);
        Assert.Equal(expectedCategory, filtered.TotalCount);
        Assert.All(filtered.Items, item => Assert.Equal(active.Category, item.Category));

        Assert.NotNull(found);
        Assert.Equal(active.Id, Assert.Single(found.Items).Id);
        Assert.Null(Assert.Single(found.Items).ImageUrl);

        Assert.NotNull(hiddenSearch);
        Assert.Equal(0, hiddenSearch.TotalCount);
        Assert.Empty(hiddenSearch.Items);

        Assert.NotNull(empty);
        Assert.Equal(0, empty.TotalCount);
        Assert.Empty(empty.Items);

        Assert.NotNull(priced);
        Assert.True(priced.TotalCount >= 2);
        Assert.All(priced.Items, item => Assert.Equal(450_000m, item.AskingPrice));
        Assert.Equal(
            priced.Items.Select(item => item.Id).OrderBy(id => id).ToArray(),
            priced.Items.Select(item => item.Id).ToArray());

        Assert.NotNull(firstPricePage);
        Assert.NotNull(second);
        Assert.Equal(2, second.Page);
        Assert.Equal(expectedActive, second.TotalCount);
        Assert.Equal(6, second.Items.Count);
        Assert.NotEqual(firstPricePage.Items[0].Id, second.Items[0].Id);
        Assert.True(PricesDoNotDecrease(firstPricePage));
        Assert.True(PricesDoNotDecrease(second));
        Assert.True(firstPricePage.Items[^1].AskingPrice <= second.Items[0].AskingPrice);

        Assert.Equal(HttpStatusCode.OK, detail.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, hiddenDetail.StatusCode);
    }

    private async Task<DevelopmentSeedResult> SeedAsync()
    {
        await using var scope = _postgres.Factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return await DevelopmentListingSeeder.SeedAsync(db);
    }

    private static bool PricesDoNotDecrease(BusinessListingPageDto page)
    {
        return page.Items.Zip(page.Items.Skip(1)).All(pair => pair.First.AskingPrice <= pair.Second.AskingPrice);
    }

    private static async Task<BusinessListingPageDto?> ReadPage(HttpClient client, string path)
    {
        var response = await client.GetAsync(path);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return JsonSerializer.Deserialize<BusinessListingPageDto>(body, JsonSerializerOptions.Web);
    }

    private static BusinessListing Stranger()
    {
        var at = new DateTimeOffset(2026, 1, 1, 15, 0, 0, TimeSpan.Zero);
        return new BusinessListing
        {
            Id = StrangerId,
            Title = "Kept On Purpose",
            Description = "A row the seed command must not delete or replace.",
            AskingPrice = 100_000m,
            AnnualRevenue = 80_000m,
            CashFlow = 10_000m,
            City = "Boise",
            State = "ID",
            Category = BusinessCategory.Other,
            Status = ListingStatus.Active,
            ImageUrl = null,
            CreatedAt = at,
            UpdatedAt = at,
        };
    }
}
