namespace BusinessMarketplace.Api.Configuration;

/// <summary>
/// Browser origins allowed to call the API from local frontend dev servers.
/// Bound from the "FrontendCors" section in appsettings.Development.json.
/// Same idea as a configuration class registered with NestJS ConfigModule:
/// property names match the JSON keys, and Program.cs reads the object
/// instead of calling configuration["FrontendCors:Origins:0"].
/// </summary>
public sealed class FrontendCorsSettings
{
    public const string SectionName = "FrontendCors";

    /// <summary>
    /// Name passed to both AddPolicy and UseCors so the two calls cannot drift.
    /// </summary>
    public const string PolicyName = "Frontend";

    /// <summary>
    /// Exact origins (scheme, host, and port, no trailing slash).
    /// http://localhost:4200 does not match http://127.0.0.1:4200.
    /// </summary>
    public string[] Origins { get; set; } = [];
}
