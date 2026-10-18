using System.Net;
using System.Text.Json;
using BusinessMarketplace.Api.Models;
using BusinessMarketplace.Api.Services;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace BusinessMarketplace.Api.Tests;

/// <summary>
/// The throwing service is a test double. There is no production route
/// whose job is to fail.
/// </summary>
public class ErrorHandlingTests
{
    [Theory]
    [InlineData("Development")]
    [InlineData("Production")]
    public async Task UnexpectedException_ReturnsGenericProblemDetails(string environment)
    {
        await using var factory = new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment(environment);
            builder.UseSetting(
                "ConnectionStrings:DefaultConnection",
                "Host=127.0.0.1;Port=5432;Database=business_marketplace;Username=postgres;Password=postgres");
            if (environment == "Development")
            {
                builder.UseSetting("FrontendCors:Origins:0", "http://localhost:4200");
            }

            builder.ConfigureTestServices(services =>
            {
                services.AddScoped<IBusinessListingService, ThrowingListingService>();
            });
        });
        var client = factory.CreateClient();

        var response = await client.GetAsync("/api/listings");
        var body = await response.Content.ReadAsStringAsync();
        var problem = JsonSerializer.Deserialize<ProblemDetails>(body, JsonSerializerOptions.Web);

        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        Assert.NotNull(problem);
        Assert.Equal(500, problem.Status);
        Assert.Equal("An unexpected error occurred.", problem.Title);
        Assert.Equal(
            "The request could not be completed. Use the trace identifier when reporting this error.",
            problem.Detail);
        Assert.Equal("/api/listings", problem.Instance);
        Assert.False(string.IsNullOrWhiteSpace(problem.Extensions["traceId"]?.ToString()));
        Assert.DoesNotContain("super-secret", body, StringComparison.Ordinal);
        Assert.DoesNotContain("secret_table", body, StringComparison.Ordinal);
        Assert.DoesNotContain("ThrowingListingService", body, StringComparison.Ordinal);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
    }

    private sealed class ThrowingListingService : IBusinessListingService
    {
        public Task<IReadOnlyList<BusinessListing>> GetActiveListingsAsync(
            CancellationToken cancellationToken = default)
        {
            throw new InvalidOperationException("Password=super-secret; SELECT * FROM secret_table");
        }

        public Task<BusinessListing?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
        {
            throw new InvalidOperationException("Password=super-secret; SELECT * FROM secret_table");
        }
    }
}
