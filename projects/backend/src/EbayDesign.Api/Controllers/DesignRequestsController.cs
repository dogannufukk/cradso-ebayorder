using EbayDesign.Application.Features.Designs.Commands.ApproveDesign;
using EbayDesign.Application.Features.Designs.Commands.ApprovePrint;
using EbayDesign.Application.Features.Designs.Commands.CreateDesignRequest;
using EbayDesign.Application.Features.Designs.Commands.DeleteDesignFile;
using EbayDesign.Application.Features.Designs.Commands.RejectDesign;
using EbayDesign.Application.Features.Designs.Commands.RejectPrint;
using EbayDesign.Application.Features.Designs.Commands.SubmitForApproval;
using EbayDesign.Application.Features.Designs.Commands.UploadDesignFile;
using EbayDesign.Application.Features.Designs.Queries.GetDesignRequestById;
using EbayDesign.Application.Features.Designs.Queries.GetDesignsByOrder;
using EbayDesign.Domain.Enums;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace EbayDesign.Api.Controllers;

[ApiController]
[Route("api/design-requests")]
public class DesignRequestsController : ControllerBase
{
    private readonly IMediator _mediator;

    public DesignRequestsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpPost]
    public async Task<ActionResult<Guid>> Create([FromBody] CreateDesignRequestRequest request,
        CancellationToken cancellationToken)
    {
        var id = await _mediator.Send(new CreateDesignRequestCommand(
            request.OrderId, request.OrderItemId, request.Type), cancellationToken);
        return Created($"/api/design-requests/{id}", id);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetDesignRequestByIdQuery(id), cancellationToken);
        if (result is null) return NotFound();
        return Ok(result);
    }

    [HttpGet("by-order/{orderId:guid}")]
    public async Task<IActionResult> GetByOrder(Guid orderId, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetDesignsByOrderQuery(orderId), cancellationToken);
        return Ok(result);
    }

    [HttpPost("{id:guid}/files")]
    public async Task<ActionResult<Guid>> UploadFile(Guid id, IFormFile file,
        CancellationToken cancellationToken)
    {
        if (file == null || file.Length == 0)
            return BadRequest("No file provided.");

        var extension = Path.GetExtension(file.FileName).TrimStart('.').ToLowerInvariant();

        var fileId = await _mediator.Send(new UploadDesignFileCommand(
            id, file.OpenReadStream(), file.FileName, extension,
            file.Length, UploadedBy.Admin
        ), cancellationToken);

        return Created($"/api/design-requests/{id}/files/{fileId}", fileId);
    }

    [HttpDelete("{id:guid}/files/{fileId:guid}")]
    public async Task<IActionResult> DeleteFile(Guid id, Guid fileId, CancellationToken cancellationToken)
    {
        await _mediator.Send(new DeleteDesignFileCommand(id, fileId), cancellationToken);
        return NoContent();
    }

    [HttpPatch("{id:guid}/submit-for-approval")]
    public async Task<IActionResult> SubmitForApproval(Guid id, CancellationToken cancellationToken)
    {
        await _mediator.Send(new SubmitForApprovalCommand(id), cancellationToken);
        return NoContent();
    }

    [HttpPatch("{id:guid}/approve-print")]
    public async Task<IActionResult> ApprovePrint(Guid id, CancellationToken cancellationToken)
    {
        await _mediator.Send(new ApprovePrintCommand(id), cancellationToken);
        return NoContent();
    }

    [HttpPatch("{id:guid}/reject-print")]
    public async Task<IActionResult> RejectPrint(Guid id, [FromBody] RejectPrintRequest request, CancellationToken cancellationToken)
    {
        await _mediator.Send(new RejectPrintCommand(id, request.Reason), cancellationToken);
        return NoContent();
    }

    [HttpPatch("{id:guid}/approve")]
    public async Task<IActionResult> Approve(Guid id, CancellationToken cancellationToken)
    {
        await _mediator.Send(new ApproveDesignCommand(id), cancellationToken);
        return NoContent();
    }

    [HttpPatch("{id:guid}/reject")]
    public async Task<IActionResult> Reject(Guid id, [FromBody] RejectDesignRequest request,
        CancellationToken cancellationToken)
    {
        await _mediator.Send(new RejectDesignCommand(id, request.Reason), cancellationToken);
        return NoContent();
    }
}

public record CreateDesignRequestRequest(Guid OrderId, Guid OrderItemId, DesignRequestType Type);
public record RejectDesignRequest(string Reason);
public record RejectPrintRequest(string Reason);
