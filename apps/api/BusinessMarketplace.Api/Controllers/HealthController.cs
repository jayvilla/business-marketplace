using Microsoft.AspNetCore.Mvc;

namespace BusinessMarketplace.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HealthController : ControllerBase
{
    [HttpGet]
    public ActionResult<HealthStatus> Get()
    {
        return Ok(new HealthStatus("ok", "API is running"));
    }
}

public sealed record HealthStatus(string Status, string Message);
