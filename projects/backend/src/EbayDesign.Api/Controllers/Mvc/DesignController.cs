using EbayDesign.Application.Features.Designs.Commands.ApproveDesign;
using EbayDesign.Application.Features.Designs.Commands.ApprovePrint;
using EbayDesign.Application.Features.Designs.Commands.DeleteDesignFile;
using EbayDesign.Application.Features.Designs.Commands.RejectDesign;
using EbayDesign.Application.Features.Designs.Commands.RejectPrint;
using EbayDesign.Application.Features.Designs.Commands.SubmitForApproval;
using EbayDesign.Application.Features.Designs.Commands.UploadDesignFile;
using EbayDesign.Application.Features.Designs.Queries.GetDesignsByOrder;
using EbayDesign.Domain.Enums;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EbayDesign.Api.Controllers.Mvc;

[Authorize]
public class DesignController : Controller
{
    private readonly IMediator _mediator;

    public DesignController(IMediator mediator)
    {
        _mediator = mediator;
    }

    // AJAX: Get designs by order
    [HttpGet]
    public async Task<IActionResult> ByOrder(Guid orderId, CancellationToken ct)
    {
        var designs = await _mediator.Send(new GetDesignsByOrderQuery(orderId), ct);
        return Json(designs);
    }

    // AJAX: Upload design file
    [HttpPost]
    public async Task<IActionResult> UploadFile(Guid id, IFormFile file, CancellationToken ct)
    {
        var extension = Path.GetExtension(file.FileName).TrimStart('.').ToLowerInvariant();
        var fileId = await _mediator.Send(new UploadDesignFileCommand(id, file.OpenReadStream(), file.FileName, extension, file.Length, UploadedBy.Admin), ct);
        return Json(new { id = fileId });
    }

    // AJAX: Delete design file
    [HttpDelete]
    public async Task<IActionResult> DeleteFile(Guid id, Guid fileId, CancellationToken ct)
    {
        await _mediator.Send(new DeleteDesignFileCommand(id, fileId), ct);
        return Json(new { success = true });
    }

    // AJAX: Submit for approval
    [HttpPatch]
    public async Task<IActionResult> SubmitForApproval(Guid id, CancellationToken ct)
    {
        await _mediator.Send(new SubmitForApprovalCommand(id), ct);
        return Json(new { success = true });
    }

    // AJAX: Approve design
    [HttpPatch]
    public async Task<IActionResult> Approve(Guid id, CancellationToken ct)
    {
        await _mediator.Send(new ApproveDesignCommand(id), ct);
        return Json(new { success = true });
    }

    // AJAX: Reject design
    [HttpPatch]
    public async Task<IActionResult> Reject(Guid id, [FromBody] RejectRequest request, CancellationToken ct)
    {
        await _mediator.Send(new RejectDesignCommand(id, request.Reason), ct);
        return Json(new { success = true });
    }

    // AJAX: Approve print
    [HttpPatch]
    public async Task<IActionResult> ApprovePrint(Guid id, CancellationToken ct)
    {
        await _mediator.Send(new ApprovePrintCommand(id), ct);
        return Json(new { success = true });
    }

    // AJAX: Reject print
    [HttpPatch]
    public async Task<IActionResult> RejectPrint(Guid id, [FromBody] RejectRequest request, CancellationToken ct)
    {
        await _mediator.Send(new RejectPrintCommand(id, request.Reason), ct);
        return Json(new { success = true });
    }

    public record RejectRequest(string Reason);
}
