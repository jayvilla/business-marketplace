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
    /// Returns the current health payload.
    ///
    /// Synchronous because it does not wait on I/O. When a later service
    /// queries a database, that method should return a Task and the
    /// controller should await it. Marking a method async without an await
    /// only allocates a state machine and does not make the work asynchronous.
    /// </summary>
    public HealthStatus GetStatus()
    {
        // {Status} is a named log property, not an interpolated string.
        // A sink can index it later. NestJS Logger formats a string immediately.
        logger.LogInformation("Health check served with status {Status}", "ok");

        return new HealthStatus("ok", "API is running");
    }
}
