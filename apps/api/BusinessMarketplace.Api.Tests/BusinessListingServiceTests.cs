using BusinessMarketplace.Api.Services;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace BusinessMarketplace.Api.Tests;

/// <summary>
/// Confirms the container lifetime of the EF listing service. These tests
/// construct the context and do not query PostgreSQL. Query behavior against
/// a real database is not part of this suite.
/// </summary>
public class BusinessListingServiceRegistrationTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public BusinessListingServiceRegistrationTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory.WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment(Environments.Development);
        });
    }

    [Fact]
    public void ScopedRegistration_ReusesOneInstanceInsideAScope()
    {
        using var scope = _factory.Services.CreateScope();
        var first = scope.ServiceProvider.GetRequiredService<IBusinessListingService>();
        var second = scope.ServiceProvider.GetRequiredService<IBusinessListingService>();

        Assert.Same(first, second);
        Assert.IsType<BusinessListingService>(first);
    }

    [Fact]
    public void ScopedRegistration_CreatesANewInstanceForAnotherScope()
    {
        using var firstScope = _factory.Services.CreateScope();
        using var secondScope = _factory.Services.CreateScope();

        var first = firstScope.ServiceProvider.GetRequiredService<IBusinessListingService>();
        var second = secondScope.ServiceProvider.GetRequiredService<IBusinessListingService>();

        Assert.NotSame(first, second);
    }
}
