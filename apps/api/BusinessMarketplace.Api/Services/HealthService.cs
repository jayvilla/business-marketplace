using BusinessMarketplace.Api.Dtos;

namespace BusinessMarketplace.Api.Services;

/// <summary>
/// Reports whether this API process is up.
///
/// Registered in Program.cs as a singleton, the NestJS default for a
/// provider. There is no interface. The controller depends on this concrete
/// class, and the tests call HTTP rather than a substitute. An interface
/// earns its keep when a second implementation has to be swapped in.
/// </summary>
public sealed class HealthService(ILogger<HealthService> logger)
{
    /// <summary>
    /// Returns the current liveness payload for GET /api/health.
    ///
    /// Synchronous because it does not wait on I/O. Database readiness is
    /// a different question and lives on DatabaseHealthCheck. Putting a
    /// connection attempt here would make a Postgres outage look like the
    /// process itself had stopped.
    /// </summary>
    public HealthStatus GetStatus()
    {
        // {Status} is a named log property, not an interpolated string.
        // A sink can index it later. NestJS Logger formats a string immediately.
        logger.LogInformation("Health check served with status {Status}", "ok");

        return new HealthStatus("ok", "API is running");
    }
}
