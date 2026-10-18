using System.Net;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Hosting;

namespace BusinessMarketplace.Api.Tests;

public class OpenApiDocumentTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public OpenApiDocumentTests(WebApplicationFactory<Program> factory)
    {
        _client = factory.WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment(Environments.Development);
        }).CreateClient();
    }

    [Fact]
    public async Task GetOpenApiDocument_DescribesHealthEndpoint()
    {
        var response = await _client.GetAsync("/openapi/v1.json");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var json = await response.Content.ReadAsStringAsync();

        Assert.Contains("/api/health", json, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("/api/listings", json, StringComparison.Ordinal);
        Assert.Contains("/api/listings/{id}", json, StringComparison.Ordinal);
        Assert.Contains("Business Marketplace API", json, StringComparison.Ordinal);
    }

    [Fact]
    public async Task GetSwaggerUi_IsAvailableInDevelopment()
    {
        var response = await _client.GetAsync("/swagger/index.html");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("text/html", response.Content.Headers.ContentType?.MediaType);
    }
}

public class OpenApiProductionTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public OpenApiProductionTests(WebApplicationFactory<Program> factory)
    {
        _client = factory.WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment(Environments.Production);
        }).CreateClient();
    }

    [Fact]
    public async Task GetOpenApiDocument_IsNotRegisteredOutsideDevelopment()
    {
        var response = await _client.GetAsync("/openapi/v1.json");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task GetHealth_StillRespondsOutsideDevelopment()
    {
        var response = await _client.GetAsync("/api/health");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }
}
