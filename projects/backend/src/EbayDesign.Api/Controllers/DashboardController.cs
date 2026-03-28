using MediatR;
using Microsoft.AspNetCore.Mvc;
using EbayDesign.Application.Features.Dashboard.Queries.GetDashboardSummary;

namespace EbayDesign.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DashboardController : ControllerBase
{
    private readonly IMediator _mediator;

    public DashboardController(IMediator mediator) => _mediator = mediator;

    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary(CancellationToken ct)
    {
        var result = await _mediator.Send(new GetDashboardSummaryQuery(), ct);
        return Ok(result);
    }
}
