using EbayDesign.Application.Features.Settings.Commands.UpdateSetting;
using EbayDesign.Application.Features.Settings.Queries.GetSettings;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EbayDesign.Api.Controllers;

[ApiController]
[Route("api/settings")]
[Authorize]
public class SettingsController : ControllerBase
{
    private readonly IMediator _mediator;

    public SettingsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetSettingsQuery(), cancellationToken);
        return Ok(result);
    }

    [HttpPut]
    public async Task<IActionResult> Update([FromBody] UpdateSettingRequest request, CancellationToken cancellationToken)
    {
        await _mediator.Send(new UpdateSettingCommand(request.Key, request.Value), cancellationToken);
        return Ok(new { message = "Setting updated." });
    }

    [HttpGet("portal-otp-required")]
    [AllowAnonymous]
    public async Task<IActionResult> GetPortalOtpRequired(CancellationToken cancellationToken)
    {
        var settings = await _mediator.Send(new GetSettingsQuery(), cancellationToken);
        var otpSetting = settings.FirstOrDefault(s => s.Key == "portal.otp.required");
        var required = otpSetting?.Value?.ToLower() == "true";
        return Ok(new { required });
    }
}

public record UpdateSettingRequest(string Key, string Value);
