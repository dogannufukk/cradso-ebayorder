using EbayDesign.Application.Features.Portal.Commands.PortalApprove;
using EbayDesign.Application.Features.Portal.Commands.PortalDeleteFile;
using EbayDesign.Application.Features.Portal.Commands.PortalPrepareUpload;
using EbayDesign.Application.Features.Portal.Commands.PortalReject;
using EbayDesign.Application.Features.Portal.Commands.PortalSubmit;
using EbayDesign.Application.Features.Portal.Commands.PortalUpload;
using EbayDesign.Application.Features.Portal.Commands.RequestOtp;
using EbayDesign.Application.Features.Portal.Commands.VerifyOtp;
using EbayDesign.Application.Features.Portal.Queries.GetPortalOrder;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EbayDesign.Api.Controllers.Mvc;

[AllowAnonymous]
public class PortalController : Controller
{
    private readonly IMediator _mediator;

    public PortalController(IMediator mediator)
    {
        _mediator = mediator;
    }

    // Page: OTP Verification
    [HttpGet("Portal/Verify/{token}")]
    public IActionResult Verify(string token)
    {
        ViewBag.Token = token;
        return View("Otp");
    }

    // Page: Design Approval
    [HttpGet("Portal/Design/{token}")]
    public IActionResult Design(string token)
    {
        ViewBag.Token = token;
        return View("Approval");
    }

    // AJAX: Request OTP
    [HttpGet]
    public async Task<IActionResult> RequestOtp(string token, CancellationToken ct)
    {
        var result = await _mediator.Send(new RequestOtpCommand(token), ct);
        return Json(result);
    }

    // AJAX: Verify OTP
    [HttpPost]
    public async Task<IActionResult> VerifyOtp([FromBody] VerifyOtpRequest request, CancellationToken ct)
    {
        var result = await _mediator.Send(new VerifyOtpCommand(request.Token, request.OtpCode), ct);
        return Json(result);
    }

    // AJAX: Get order for portal
    [HttpGet]
    public async Task<IActionResult> GetOrder(string token, CancellationToken ct)
    {
        var result = await _mediator.Send(new GetPortalOrderQuery(token), ct);
        return Json(result);
    }

    // AJAX: Upload design files
    [HttpPost]
    public async Task<IActionResult> Upload(string token, List<IFormFile> files, CancellationToken ct)
    {
        await _mediator.Send(new PortalPrepareUploadCommand(token), ct);

        var fileIds = new List<Guid>();
        foreach (var file in files)
        {
            var extension = Path.GetExtension(file.FileName).TrimStart('.').ToLowerInvariant();
            var fileId = await _mediator.Send(new PortalUploadCommand(token, file.OpenReadStream(), file.FileName, extension, file.Length), ct);
            fileIds.Add(fileId);
        }
        return Json(fileIds);
    }

    // AJAX: Delete file
    [HttpDelete]
    public async Task<IActionResult> DeleteFile(string token, Guid fileId, CancellationToken ct)
    {
        await _mediator.Send(new PortalDeleteFileCommand(token, fileId), ct);
        return Json(new { success = true });
    }

    // AJAX: Submit for review
    [HttpPost]
    public async Task<IActionResult> Submit(string token, CancellationToken ct)
    {
        await _mediator.Send(new PortalSubmitCommand(token), ct);
        return Json(new { message = "Files submitted for review" });
    }

    // AJAX: Approve design
    [HttpPost]
    public async Task<IActionResult> Approve(string token, CancellationToken ct)
    {
        await _mediator.Send(new PortalApproveCommand(token), ct);
        return Json(new { message = "Design approved" });
    }

    // AJAX: Reject design
    [HttpPost]
    public async Task<IActionResult> Reject(string token, [FromBody] PortalRejectRequest request, CancellationToken ct)
    {
        await _mediator.Send(new PortalRejectCommand(token, request.Reason), ct);
        return Json(new { message = "Design rejected" });
    }

    public record VerifyOtpRequest(string Token, string OtpCode);
    public record PortalRejectRequest(string Reason);
}
