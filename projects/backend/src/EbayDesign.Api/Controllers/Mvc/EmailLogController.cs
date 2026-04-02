using EbayDesign.Application.Features.EmailLogs.Commands.RetryEmail;
using EbayDesign.Application.Features.EmailLogs.Queries.GetEmailLogs;
using EbayDesign.Domain.Enums;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EbayDesign.Api.Controllers.Mvc;

[Authorize]
public class EmailLogController : Controller
{
    private readonly IMediator _mediator;

    public EmailLogController(IMediator mediator)
    {
        _mediator = mediator;
    }

    // Page: Email Logs
    public IActionResult Index()
    {
        return View();
    }

    // AJAX: Get email logs
    [HttpGet]
    public async Task<IActionResult> List(int page = 1, int pageSize = 20,
        string? search = null, string? sortBy = null, string? sortDirection = null,
        EmailStatus? status = null, string? toEmail = null, string? subject = null,
        string? templateName = null, string? relatedEntityType = null, string? relatedEntityId = null,
        CancellationToken ct = default)
    {
        var result = await _mediator.Send(new GetEmailLogsQuery(page, pageSize, search, sortBy, sortDirection, status, toEmail, subject, templateName, relatedEntityType, relatedEntityId), ct);
        return Json(result);
    }

    // AJAX: Retry email
    [HttpPost]
    public async Task<IActionResult> Retry(Guid id, CancellationToken ct)
    {
        await _mediator.Send(new RetryEmailCommand(id), ct);
        return Json(new { success = true });
    }
}
