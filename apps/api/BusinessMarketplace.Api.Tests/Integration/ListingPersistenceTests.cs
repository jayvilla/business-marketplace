using System.Net;
using System.Text.Json;
using BusinessMarketplace.Api.Data;
using BusinessMarketplace.Api.Dtos;
using BusinessMarketplace.Api.Models;
using BusinessMarketplace.Api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace BusinessMarketplace.Api.Tests.Integration;

/// <summary>
/// The listing service and the HTTP pipeline against PostgreSQL.
///
/// The catalog double used by the other HTTP tests runs the same LINQ
/// operators in memory. These tests exist where that is not evidence:
/// EF has to translate the query, numeric(18,2) has to round-trip, and
/// the enum has to be stored as its name. A failed SaveChanges here is a
/// database constraint, not a C# exception invented by the test.
///
/// Each test gets a new class instance, and <see cref="InitializeAsync"/>
/// replaces the rows. That is the isolation. The container stays up.
/// Fixtures are local to this class. They are not the development seed.
/// </summary>
[Collection(PostgresCollection.Name)]
[Trait("Category", "Integration")]
public sealed class ListingPersistenceTests : IAsyncLifetime
{
    private static readonly Guid HarborId = Guid.Parse("01900000-0000-7000-8000-000000000301");
    private static readonly Guid CedarId = Guid.Parse("01900000-0000-7000-8000-000000000302");
    private static readonly Guid AlpineId = Guid.Parse("01900000-0000-7000-8000-000000000303");
    private static readonly Guid DraftId = Guid.Parse("01900000-0000-7000-8000-000000000304");
    private static readonly Guid PendingId = Guid.Parse("01900000-0000-7000-8000-000000000305");
    private static readonly Guid SoldId = Guid.Parse("01900000-0000-7000-8000-000000000306");

    private static readonly DateTimeOffset HarborCreated = new(2024, 1, 1, 15, 0, 0, TimeSpan.Zero);
    private static readonly DateTimeOffset CedarCreated = new(2024, 1, 2, 15, 0, 0, TimeSpan.Zero);
    private static readonly DateTimeOffset AlpineCreated = new(2025, 6, 1, 15, 0, 0, TimeSpan.Zero);

    private readonly PostgresFixture _postgres;

    public ListingPersistenceTests(PostgresFixture postgres)
    {
        _postgres = postgres;
    }

    public Task InitializeAsync() => _postgres.ResetAsync(Catalog());

    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task Migrations_CreateTheStatusIndex()
    {
        await using var scope = _postgres.Factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var connection = db.Database.GetDbConnection();
        await connection.OpenAsync();
        await using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT indexname
            FROM pg_indexes
            WHERE tablename = 'BusinessListings'
              AND indexname = 'IX_BusinessListings_Status'
            """;
        var indexName = await command.ExecuteScalarAsync();

        Assert.Equal("IX_BusinessListings_Status", indexName);
    }

    [Fact]
    public async Task PublicList_OmitsDraftPendingAndSold()
    {
        var page = await ActivePage(new ListingQuery { PageSize = 24 });

        Assert.Equal(3, page.TotalCount);
        Assert.DoesNotContain(page.Items, listing => listing.Id == DraftId);
        Assert.DoesNotContain(page.Items, listing => listing.Id == PendingId);
        Assert.DoesNotContain(page.Items, listing => listing.Id == SoldId);
    }

    [Fact]
    public async Task Search_MatchesCityWithoutReturningUnpublishedRowsInThatCity()
    {
        var page = await ActivePage(new ListingQuery { Search = "portland", PageSize = 24 });

        Assert.Equal(2, page.TotalCount);
        Assert.Contains(page.Items, listing => listing.Id == HarborId);
        Assert.Contains(page.Items, listing => listing.Id == CedarId);
        Assert.DoesNotContain(page.Items, listing => listing.Id == DraftId);
    }

    [Fact]
    public async Task Filters_CombineCategoryAndAnInclusivePriceRange()
    {
        var page = await ActivePage(new ListingQuery
        {
            Category = BusinessCategory.Restaurant,
            MinPrice = 400_000m,
            MaxPrice = 400_000m,
            PageSize = 24,
        });

        Assert.Equal([HarborId], page.Items.Select(listing => listing.Id).ToArray());
    }

    [Fact]
    public async Task Sort_AskingPriceAscending_BreaksTiesById()
    {
        var page = await ActivePage(new ListingQuery
        {
            SortBy = ListingSortField.AskingPrice,
            SortDirection = ListingSortDirection.Asc,
            PageSize = 24,
        });

        Assert.Equal(
            [HarborId, CedarId, AlpineId],
            page.Items.Select(listing => listing.Id).ToArray());
    }

    [Fact]
    public async Task Sort_AnnualRevenueDescending_PutsNullRevenueLast()
    {
        var page = await ActivePage(new ListingQuery
        {
            SortBy = ListingSortField.AnnualRevenue,
            SortDirection = ListingSortDirection.Desc,
            PageSize = 24,
        });

        Assert.Equal(HarborId, page.Items[0].Id);
        Assert.Equal(AlpineId, page.Items[^1].Id);
        Assert.Null(page.Items[^1].AnnualRevenue);
    }

    [Fact]
    public async Task Page_ReturnsTheSecondSliceAndTheFullMatchCount()
    {
        var page = await ActivePage(new ListingQuery
        {
            SortBy = ListingSortField.AskingPrice,
            SortDirection = ListingSortDirection.Asc,
            Page = 2,
            PageSize = 2,
        });

        Assert.Equal(2, page.Page);
        Assert.Equal(2, page.PageSize);
        Assert.Equal(3, page.TotalCount);
        Assert.Equal([AlpineId], page.Items.Select(listing => listing.Id).ToArray());
    }

    [Fact]
    public async Task Page_PastTheEnd_IsEmptyAndKeepsTheTotal()
    {
        var page = await ActivePage(new ListingQuery { Page = 9, PageSize = 6 });

        Assert.Empty(page.Items);
        Assert.Equal(3, page.TotalCount);
    }

    [Fact]
    public async Task NullableMoneyAndTheEnumName_RoundTrip()
    {
        await using var scope = _postgres.Factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var harbor = await db.BusinessListings.AsNoTracking().SingleAsync(listing => listing.Id == HarborId);
        var alpine = await db.BusinessListings.AsNoTracking().SingleAsync(listing => listing.Id == AlpineId);

        Assert.Equal(10.10m, harbor.CashFlow);
        Assert.Equal(new DateTimeOffset(2024, 1, 1, 15, 0, 0, TimeSpan.Zero), harbor.CreatedAt);
        Assert.Null(alpine.AnnualRevenue);
        Assert.Null(alpine.CashFlow);
        Assert.Null(alpine.ImageUrl);

        var connection = db.Database.GetDbConnection();
        await connection.OpenAsync();
        await using var command = connection.CreateCommand();
        command.CommandText = """SELECT "Category", "Status" FROM "BusinessListings" WHERE "Id" = @id""";
        var parameter = command.CreateParameter();
        parameter.ParameterName = "id";
        parameter.Value = HarborId;
        command.Parameters.Add(parameter);
        await using var reader = await command.ExecuteReaderAsync();
        Assert.True(await reader.ReadAsync());
        Assert.Equal("Restaurant", reader.GetString(0));
        Assert.Equal("Active", reader.GetString(1));
    }

    [Fact]
    public async Task ATitlePastTheColumnLength_IsRejectedByTheDatabase()
    {
        await using var scope = _postgres.Factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.BusinessListings.Add(Listing(
            Guid.Parse("01900000-0000-7000-8000-000000000399"),
            new string('a', 201),
            ListingStatus.Active,
            BusinessCategory.Other,
            1m,
            1m,
            HarborCreated));

        await Assert.ThrowsAsync<DbUpdateException>(() => db.SaveChangesAsync());
    }

    [Fact]
    public async Task ReadOnlyQuery_DoesNotPersistAnEditOfTheReturnedEntity()
    {
        await using var scope = _postgres.Factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var service = scope.ServiceProvider.GetRequiredService<IBusinessListingService>();
        var listing = await service.GetByIdAsync(HarborId);

        Assert.NotNull(listing);
        listing.Title = "Changed in memory";
        await db.SaveChangesAsync();

        await using var check = _postgres.Factory.Services.CreateAsyncScope();
        var again = await check.ServiceProvider
            .GetRequiredService<IBusinessListingService>()
            .GetByIdAsync(HarborId);
        Assert.Equal("Harbor Grill", again?.Title);
    }

    [Fact]
    public async Task GetListings_ReturnsThePostgreSqlPage()
    {
        var client = _postgres.Factory.CreateClient();

        var response = await client.GetAsync("/api/listings?search=harbor&category=Restaurant");
        var json = await response.Content.ReadAsStringAsync();
        var page = JsonSerializer.Deserialize<BusinessListingPageDto>(json, JsonSerializerOptions.Web);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.NotNull(page);
        Assert.Equal(1, page.TotalCount);
        Assert.Equal("Harbor Grill", page.Items[0].Title);
        Assert.Equal(10.10m, page.Items[0].CashFlow);
        Assert.Contains("\"category\":\"Restaurant\"", json, StringComparison.Ordinal);
        Assert.DoesNotContain("Harbor Notes", json, StringComparison.Ordinal);
    }

    [Theory]
    [InlineData("01900000-0000-7000-8000-000000000304")]
    [InlineData("01900000-0000-7000-8000-000000000305")]
    [InlineData("01900000-0000-7000-8000-000000000306")]
    public async Task GetById_HidesListingsThatAreNotActive(string id)
    {
        var client = _postgres.Factory.CreateClient();

        var response = await client.GetAsync($"/api/listings/{id}");
        var body = await response.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Contains("\"status\":404", body, StringComparison.Ordinal);
        Assert.DoesNotContain("Harbor Notes", body, StringComparison.Ordinal);
        Assert.DoesNotContain("Pending Counter", body, StringComparison.Ordinal);
        Assert.DoesNotContain("Sold Kiosk", body, StringComparison.Ordinal);
    }

    [Fact]
    public async Task GetById_ReturnsTheStoredActiveListing()
    {
        var client = _postgres.Factory.CreateClient();

        var response = await client.GetAsync($"/api/listings/{HarborId}");
        var dto = JsonSerializer.Deserialize<BusinessListingDto>(
            await response.Content.ReadAsStringAsync(),
            JsonSerializerOptions.Web);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.NotNull(dto);
        Assert.Equal(ListingStatus.Active, dto.Status);
        Assert.Equal(10.10m, dto.CashFlow);
        Assert.Equal(HarborCreated, dto.CreatedAt);
        Assert.Equal("https://images.example/harbor.jpg", dto.ImageUrl);
    }

    private async Task<BusinessListingPage> ActivePage(ListingQuery query)
    {
        await using var scope = _postgres.Factory.Services.CreateAsyncScope();
        var service = scope.ServiceProvider.GetRequiredService<IBusinessListingService>();
        return await service.GetActiveListingsAsync(query);
    }

    private static IReadOnlyList<BusinessListing> Catalog()
    {
        return
        [
            Listing(HarborId, "Harbor Grill", ListingStatus.Active, BusinessCategory.Restaurant, 400_000m, 100m, HarborCreated, 10.10m, "https://images.example/harbor.jpg"),
            Listing(CedarId, "Cedar Books", ListingStatus.Active, BusinessCategory.Retail, 400_000m, 50m, CedarCreated, 5m, "https://images.example/cedar.jpg"),
            Listing(AlpineId, "Alpine Roasters", ListingStatus.Active, BusinessCategory.Restaurant, 800_000m, null, AlpineCreated, null, null),
            Listing(DraftId, "Harbor Notes", ListingStatus.Draft, BusinessCategory.Technology, 10m, 1m, HarborCreated, null, null),
            Listing(PendingId, "Pending Counter", ListingStatus.Pending, BusinessCategory.Retail, 10m, 1m, HarborCreated, null, null),
            Listing(SoldId, "Sold Kiosk", ListingStatus.Sold, BusinessCategory.Other, 10m, 1m, HarborCreated, null, null),
        ];
    }

    private static BusinessListing Listing(
        Guid id,
        string title,
        ListingStatus status,
        BusinessCategory category,
        decimal askingPrice,
        decimal? annualRevenue,
        DateTimeOffset createdAt,
        decimal? cashFlow = null,
        string? imageUrl = null)
    {
        return new BusinessListing
        {
            Id = id,
            Title = title,
            Description = "A deterministic integration fixture.",
            AskingPrice = askingPrice,
            AnnualRevenue = annualRevenue,
            CashFlow = cashFlow,
            City = title.Contains("Alpine", StringComparison.Ordinal) ? "Bend" : "Portland",
            State = "OR",
            Category = category,
            Status = status,
            ImageUrl = imageUrl,
            CreatedAt = createdAt,
            UpdatedAt = createdAt,
        };
    }
}
