using System.Net;
using System.Net.Http.Json;
using BusinessMarketplace.Api.Dtos;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using HealthChecks = Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Hosting;

namespace BusinessMarketplace.Api.Tests;

/// <summary>
/// Hosts Program in memory. WebApplicationFactory is the ASP.NET Core
/// stand-in for a NestJS testing module plus supertest: the real pipeline
/// and controllers run, and nothing binds port 5000.
/// </summary>
public class HealthEndpointTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public HealthEndpointTests(WebApplicationFactory<Program> factory)
    {
        _client = factory.WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment(Environments.Development);
        }).CreateClient();
    }

    [Fact]
    public async Task GetHealth_ReturnsRunningStatus()
    {
        var response = await _client.GetAsync("/api/health");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<HealthStatus>();

        Assert.NotNull(body);
        Assert.Equal("ok", body.Status);
        Assert.Equal("API is running", body.Message);
    }

    [Theory]
    [InlineData("http://localhost:4200")]
    [InlineData("http://localhost:4201")]
    public async Task GetHealth_AllowsConfiguredFrontendOrigin(string origin)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, "/api/health");
        request.Headers.TryAddWithoutValidation("Origin", origin);

        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(
            origin,
            response.Headers.GetValues("Access-Control-Allow-Origin").Single());
    }

    [Fact]
    public async Task GetHealth_DoesNotReflectUnknownOrigin()
    {
        // The call still succeeds. Browsers hide the body when this header
        // is missing; the server does not reject the request itself.
        using var request = new HttpRequestMessage(HttpMethod.Get, "/api/health");
        request.Headers.TryAddWithoutValidation("Origin", "http://localhost:9999");

        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.False(response.Headers.Contains("Access-Control-Allow-Origin"));
    }

    [Fact]
    public async Task GetLiveness_ReportsHealthyWithoutADatabaseCall()
    {
        var response = await _client.GetAsync("/api/health/live");
        var body = (await response.Content.ReadAsStringAsync()).Trim();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("Healthy", body);
        Assert.DoesNotContain("Password", body, StringComparison.Ordinal);
        Assert.DoesNotContain("business_marketplace", body, StringComparison.Ordinal);
    }
}

public class ReadinessEndpointTests
{
    [Theory]
    [InlineData(HealthChecks.HealthStatus.Healthy, HttpStatusCode.OK, "Healthy")]
    [InlineData(HealthChecks.HealthStatus.Unhealthy, HttpStatusCode.ServiceUnavailable, "Unhealthy")]
    public async Task GetReadiness_ReportsTheSubstitutedCheck(
        HealthChecks.HealthStatus status,
        HttpStatusCode expectedStatus,
        string expectedBody)
    {
        await using var factory = new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment(Environments.Development);
            builder.ConfigureTestServices(services =>
            {
                services.PostConfigure<HealthChecks.HealthCheckServiceOptions>(options =>
                {
                    var database = options.Registrations.Single(registration => registration.Name == "database");
                    options.Registrations.Remove(database);
                    options.Registrations.Add(new HealthChecks.HealthCheckRegistration(
                        "database",
                        _ => new StaticHealthCheck(status),
                        failureStatus: HealthChecks.HealthStatus.Unhealthy,
                        tags: ["ready"]));
                });
            });
        });
        var client = factory.CreateClient();

        var response = await client.GetAsync("/api/health/ready");
        var body = (await response.Content.ReadAsStringAsync()).Trim();

        Assert.Equal(expectedStatus, response.StatusCode);
        Assert.Equal(expectedBody, body);
        Assert.DoesNotContain("Password", body, StringComparison.Ordinal);
    }

    private sealed class StaticHealthCheck(HealthChecks.HealthStatus status) : HealthChecks.IHealthCheck
    {
        public Task<HealthChecks.HealthCheckResult> CheckHealthAsync(
            HealthChecks.HealthCheckContext context,
            CancellationToken cancellationToken = default)
        {
            return Task.FromResult(new HealthChecks.HealthCheckResult(status, "Password=should-not-appear"));
        }
    }
}
