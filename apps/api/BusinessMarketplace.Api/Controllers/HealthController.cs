using BusinessMarketplace.Api.Dtos;
using BusinessMarketplace.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace BusinessMarketplace.Api.Controllers;

/// <summary>
/// Process health.
///
/// [ApiController] enables the API conventions: invalid models become a 400
/// automatically, binding sources are inferred, and errors use problem
/// details. ControllerBase has no Razor view helpers because this project
/// does not render HTML.
///
/// The route is written out as api/health so the public path stays lowercase
/// in the OpenAPI document. The token form [Route("api/[controller]")] would
/// also match, using the class name with the Controller suffix removed
/// (Health). NestJS expresses the same prefix as @Controller('health') plus
/// a global prefix.
///
/// [Produces("application/json")] limits content negotiation to JSON. Without
/// it, the generated OpenAPI document also advertises text/plain and text/json.
///
/// The primary constructor parameter is captured as a private field because
/// Get() uses it. Unlike TypeScript's constructor(private readonly healthService),
/// a class primary constructor does not create a property. A record primary
/// constructor does; HealthStatus is the example of that other form.
/// </summary>
[ApiController]
[Produces("application/json")]
[Route("api/health")]
public class HealthController(HealthService healthService) : ControllerBase
{
    /// <summary>
    /// The framework runs this on the async server pipeline even though the
    /// method itself is synchronous. Return Task or ValueTask from an action
    /// only when the body awaits I/O. ActionResult leaves room to return
    /// another status code later; Ok wraps the DTO in HTTP 200.
    /// </summary>
    [HttpGet]
    [ProducesResponseType<HealthStatus>(StatusCodes.Status200OK)]
    public ActionResult<HealthStatus> Get()
    {
        return Ok(healthService.GetStatus());
    }
}
