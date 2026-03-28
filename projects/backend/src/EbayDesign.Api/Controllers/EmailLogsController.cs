using EbayDesign.Application.Features.EmailLogs.Commands.RetryEmail;
using EbayDesign.Application.Features.EmailLogs.Queries.GetEmailLogs;
using EbayDesign.Domain.Enums;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace EbayDesign.Api.Controllers;

[ApiController]
[Route("api/email-logs")]
public class EmailLogsController : ControllerBase
{
    private readonly IMediator _mediator;

    public EmailLogsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? search = null,
        [FromQuery] string? sortBy = null,
        [FromQuery] string? sortDirection = null,
        [FromQuery] EmailStatus? status = null,
        [FromQuery] string? toEmail = null,
        [FromQuery] string? subject = null,
        [FromQuery] string? templateName = null,
        [FromQuery] string? relatedEntityType = null,
        [FromQuery] string? relatedEntityId = null,
        CancellationToken cancellationToken = default)
    {
        var result = await _mediator.Send(new GetEmailLogsQuery(
            page, pageSize, search, sortBy, sortDirection,
            status, toEmail, subject, templateName,
            relatedEntityType, relatedEntityId), cancellationToken);
        return Ok(result);
    }

    [HttpPost("{id:guid}/retry")]
    public async Task<IActionResult> Retry(Guid id, CancellationToken cancellationToken)
    {
        await _mediator.Send(new RetryEmailCommand(id), cancellationToken);
        return NoContent();
    }
}
