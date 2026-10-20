using System.Net;
using System.Text.Json;
using BusinessMarketplace.Api.Dtos;
using BusinessMarketplace.Api.Models;
using BusinessMarketplace.Api.Services;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

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

    [Fact]
    public async Task UnexpectedException_IsLoggedWithTheTraceAndStaysOutOfTheBody()
    {
        var logs = new LogCapture();
        await using var factory = new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment(Environments.Development);
            builder.UseSetting(
                "ConnectionStrings:DefaultConnection",
                "Host=127.0.0.1;Port=5432;Database=business_marketplace;Username=postgres;Password=postgres");
            builder.UseSetting("FrontendCors:Origins:0", "http://localhost:4200");
            builder.ConfigureLogging(logging =>
            {
                logging.ClearProviders();
                logging.AddProvider(logs);
                logging.SetMinimumLevel(LogLevel.Information);
            });
            builder.ConfigureTestServices(services =>
            {
                services.AddScoped<IBusinessListingService, ThrowingListingService>();
            });
        });

        var response = await factory.CreateClient().GetAsync("/api/listings");
        var body = await response.Content.ReadAsStringAsync();
        var problem = JsonSerializer.Deserialize<ProblemDetails>(body, JsonSerializerOptions.Web);

        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        Assert.DoesNotContain("super-secret", body, StringComparison.Ordinal);
        var error = Assert.Single(logs.Entries, entry => entry.Level == LogLevel.Error);
        Assert.IsType<InvalidOperationException>(error.Exception);
        Assert.Contains("TraceId", error.Message, StringComparison.Ordinal);
        var traceId = problem?.Extensions["traceId"]?.ToString();
        Assert.False(string.IsNullOrWhiteSpace(traceId));
        Assert.Contains(traceId, error.Message, StringComparison.Ordinal);
    }

    private sealed class LogCapture : ILoggerProvider
    {
        public List<LogEntry> Entries { get; } = [];

        public ILogger CreateLogger(string categoryName) => new CaptureLogger(Entries);

        public void Dispose()
        {
        }

        private sealed class CaptureLogger(List<LogEntry> entries) : ILogger
        {
            public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;

            public bool IsEnabled(LogLevel logLevel) => true;

            public void Log<TState>(
                LogLevel logLevel,
                EventId eventId,
                TState state,
                Exception? exception,
                Func<TState, Exception?, string> formatter)
            {
                entries.Add(new LogEntry(logLevel, formatter(state, exception), exception));
            }
        }
    }

    private sealed record LogEntry(LogLevel Level, string Message, Exception? Exception);

    private sealed class ThrowingListingService : IBusinessListingService
    {
        public Task<BusinessListingPage> GetActiveListingsAsync(
            ListingQuery query,
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
