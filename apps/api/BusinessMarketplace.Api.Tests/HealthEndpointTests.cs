using System.Net;
using System.Net.Http.Json;
using BusinessMarketplace.Api.Controllers;
using Microsoft.AspNetCore.Mvc.Testing;

namespace BusinessMarketplace.Api.Tests;

public class HealthEndpointTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public HealthEndpointTests(WebApplicationFactory<Program> factory)
    {
        _client = factory.CreateClient();
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
}
