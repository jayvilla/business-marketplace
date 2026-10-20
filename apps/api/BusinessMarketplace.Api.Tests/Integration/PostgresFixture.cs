using BusinessMarketplace.Api.Data;
using BusinessMarketplace.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Testcontainers.PostgreSql;

namespace BusinessMarketplace.Api.Tests.Integration;

/// <summary>
/// Starts PostgreSQL in Docker and points a test host at it.
///
/// <see cref="IAsyncLifetime"/> is the async form of setup and teardown.
/// <c>InitializeAsync</c> runs before any test in the collection.
/// <c>DisposeAsync</c> stops the container. A Jest <c>beforeAll</c> that
/// returns a promise is the same idea. The container is not the database
/// from docker-compose.yml, and the database name is not
/// <c>business_marketplace</c>, so a mistake cannot wipe the development seed.
///
/// Testcontainers is the .NET form of the same library used from Jest.
/// The image tag matches the development compose file: postgres:17.
/// </summary>
public sealed class PostgresFixture : IAsyncLifetime
{
    public const string DatabaseName = "business_marketplace_test";

    private PostgreSqlContainer? _container;

    public PostgresApiFactory Factory { get; private set; } = null!;

    public async Task InitializeAsync()
    {
        _container = new PostgreSqlBuilder("postgres:17")
            .WithDatabase(DatabaseName)
            .WithUsername("test")
            .WithPassword("test")
            .Build();

        await _container.StartAsync();

        Factory = new PostgresApiFactory(_container.GetConnectionString());

        await using var scope = Factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var connectionString = db.Database.GetConnectionString() ?? "";
        if (!connectionString.Contains(DatabaseName, StringComparison.Ordinal))
        {
            throw new InvalidOperationException(
                "The test host is not using the isolated PostgreSQL database.");
        }

        await db.Database.MigrateAsync();
    }

    public async Task ResetAsync(IReadOnlyList<BusinessListing> listings)
    {
        await using var scope = Factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await db.Database.ExecuteSqlRawAsync("TRUNCATE TABLE \"BusinessListings\"");
        db.BusinessListings.AddRange(listings);
        await db.SaveChangesAsync();
    }

    public async Task DisposeAsync()
    {
        await Factory.DisposeAsync();
        if (_container is not null)
        {
            await _container.DisposeAsync();
        }
    }
}
