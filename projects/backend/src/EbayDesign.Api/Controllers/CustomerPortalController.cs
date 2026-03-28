using EbayDesign.Application.Features.Portal.Commands.PortalApprove;
using EbayDesign.Application.Features.Portal.Commands.PortalDeleteFile;
using EbayDesign.Application.Features.Portal.Commands.PortalPrepareUpload;
using EbayDesign.Application.Features.Portal.Commands.PortalReject;
using EbayDesign.Application.Features.Portal.Commands.PortalSubmit;
using EbayDesign.Application.Features.Portal.Commands.PortalUpload;
using EbayDesign.Application.Features.Portal.Commands.RequestOtp;
using EbayDesign.Application.Features.Portal.Commands.VerifyOtp;
using EbayDesign.Application.Features.Portal.Queries.GetPortalDesign;
using EbayDesign.Application.Features.Portal.Queries.GetPortalOrder;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace EbayDesign.Api.Controllers;

[ApiController]
[Route("api/portal")]
public class CustomerPortalController : ControllerBase
{
    private readonly IMediator _mediator;

    public CustomerPortalController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet("request-otp/{token}")]
    public async Task<IActionResult> RequestOtp(string token, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new RequestOtpCommand(token), cancellationToken);
        return Ok(result);
    }

    [HttpPost("verify-otp")]
    public async Task<IActionResult> VerifyOtp([FromBody] VerifyOtpRequest request, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new VerifyOtpCommand(request.Token, request.OtpCode), cancellationToken);
        return Ok(result);
    }

    [HttpGet("design/{token}")]
    public async Task<IActionResult> GetDesign(string token, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetPortalDesignQuery(token), cancellationToken);
        return Ok(result);
    }

    [HttpGet("order/{token}")]
    public async Task<IActionResult> GetOrder(string token, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetPortalOrderQuery(token), cancellationToken);
        return Ok(result);
    }

    [HttpPost("design/{token}/upload")]
    public async Task<ActionResult<List<Guid>>> Upload(string token, List<IFormFile> files,
        CancellationToken cancellationToken)
    {
        if (files == null || files.Count == 0)
            return BadRequest("No files provided.");

        // If PrintRejected, deactivate old files before uploading new ones
        await _mediator.Send(new PortalPrepareUploadCommand(token), cancellationToken);

        var fileIds = new List<Guid>();
        foreach (var file in files)
        {
            if (file.Length == 0) continue;
            var extension = Path.GetExtension(file.FileName).TrimStart('.').ToLowerInvariant();
            var fileId = await _mediator.Send(new PortalUploadCommand(
                token, file.OpenReadStream(), file.FileName, extension, file.Length
            ), cancellationToken);
            fileIds.Add(fileId);
        }
        return Created("", fileIds);
    }

    [HttpDelete("design/{token}/files/{fileId}")]
    public async Task<IActionResult> DeleteFile(string token, Guid fileId,
        CancellationToken cancellationToken)
    {
        await _mediator.Send(new PortalDeleteFileCommand(token, fileId), cancellationToken);
        return NoContent();
    }

    [HttpPost("design/{token}/submit")]
    public async Task<IActionResult> Submit(string token, CancellationToken cancellationToken)
    {
        await _mediator.Send(new PortalSubmitCommand(token), cancellationToken);
        return Ok(new { message = "Files submitted for review." });
    }

    [HttpPost("design/{token}/approve")]
    public async Task<IActionResult> Approve(string token, CancellationToken cancellationToken)
    {
        await _mediator.Send(new PortalApproveCommand(token), cancellationToken);
        return Ok(new { message = "Design approved successfully." });
    }

    [HttpPost("design/{token}/reject")]
    public async Task<IActionResult> Reject(string token, [FromBody] PortalRejectRequest request,
        CancellationToken cancellationToken)
    {
        await _mediator.Send(new PortalRejectCommand(token, request.Reason), cancellationToken);
        return Ok(new { message = "Design rejected. We will revise and send a new version." });
    }
}

public record PortalRejectRequest(string Reason);

public record VerifyOtpRequest(string Token, string OtpCode);
