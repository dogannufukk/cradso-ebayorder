using EbayDesign.Application.Features.Reports.Queries.GetReportData;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EbayDesign.Api.Controllers.Mvc;

[Authorize]
public class ReportController : Controller
{
    private readonly IMediator _mediator;

    public ReportController(IMediator mediator)
    {
        _mediator = mediator;
    }

    public IActionResult Index()
    {
        return View();
    }

    [HttpGet]
    public async Task<IActionResult> Data(CancellationToken ct)
    {
        var data = await _mediator.Send(new GetReportDataQuery(), ct);
        return Json(data);
    }
}
