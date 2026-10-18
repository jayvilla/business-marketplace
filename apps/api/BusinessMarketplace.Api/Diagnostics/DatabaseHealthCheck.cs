using System.Diagnostics;
using BusinessMarketplace.Api.Data;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace BusinessMarketplace.Api.Diagnostics;

/// <summary>
/// Readiness probe for PostgreSQL.
///
/// Liveness answers "is the process running?". Readiness answers "should
/// a load balancer send traffic?". A database outage means this process
/// should stop receiving listing requests. It does not mean the process
/// is dead, so the liveness check does not call this class. Restarting a
/// pod because Postgres is down would only multiply the outage.
///
/// CanConnectAsync opens a connection and closes it. It does not read
/// the listings table. Health checks are singletons, and AppDbContext is
/// scoped, so the check creates a scope instead of taking the context in
/// its constructor. A constructor dependency would capture one context
/// for the life of the process.
/// </summary>
internal sealed class DatabaseHealthCheck(
    IServiceScopeFactory scopeFactory,
    ILogger<DatabaseHealthCheck> logger) : IHealthCheck
{
    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        try
        {
            await using var scope = scopeFactory.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var canConnect = await db.Database.CanConnectAsync(cancellationToken);

            if (canConnect)
            {
                return HealthCheckResult.Healthy();
            }

            logger.LogWarning(
                "Database readiness check could not open a connection. TraceId: {TraceId}",
                Activity.Current?.Id);
            return HealthCheckResult.Unhealthy("The database is not reachable.");
        }
        catch (Exception exception)
        {
            // The result description is a fixed sentence. The exception
            // stays in the log. The health response writer prints only
            // Healthy or Unhealthy, so this description is not the body.
            logger.LogError(
                exception,
                "Database readiness check failed. TraceId: {TraceId}",
                Activity.Current?.Id);
            return HealthCheckResult.Unhealthy("The database is not reachable.");
        }
    }
}
