using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;

namespace BusinessMarketplace.Api.Tests.Integration;

/// <summary>
/// The real API pipeline, with one configuration value replaced.
///
/// <see cref="WebApplicationFactory{TEntryPoint}"/> is supertest plus a
/// NestJS testing module: Kestrel is not bound to port 5000, and the
/// controllers, filters, and EF service are the production ones.
/// The environment is Testing, so appsettings.Development.json is not
/// loaded. That file's connection string would otherwise replace this one
/// and the tests would talk to the development database. UseSetting is
/// enough when no later JSON file defines the same key. The in-memory
/// source is added as well, for the same key.
/// </summary>
public sealed class PostgresApiFactory(string connectionString) : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.UseSetting("ConnectionStrings:DefaultConnection", connectionString);
        builder.ConfigureAppConfiguration((_, configuration) =>
        {
            configuration.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:DefaultConnection"] = connectionString,
            });
        });
    }
}
