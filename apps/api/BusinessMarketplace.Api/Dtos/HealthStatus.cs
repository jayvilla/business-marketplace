namespace BusinessMarketplace.Api.Dtos;

/// <summary>
/// JSON body for GET /api/health.
///
/// A positional record is an immutable reference type. The compiler writes
/// the constructor and the Status and Message properties, and two instances
/// with the same values compare as equal. That is the usual shape for a
/// small response DTO.
///
/// It is not a TypeScript structural type. The CLR type name is not sent
/// on the wire; System.Text.Json writes the property names, camelCase by
/// default, so clients see { "status", "message" }.
/// </summary>
public sealed record HealthStatus(string Status, string Message);
