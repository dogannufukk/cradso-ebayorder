using EbayDesign.Application.Features.Settings.Commands.UpdateSetting;
using EbayDesign.Application.Features.Settings.Queries.GetSettings;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EbayDesign.Api.Controllers.Mvc;

[Authorize]
public class SettingController : Controller
{
    private readonly IMediator _mediator;

    public SettingController(IMediator mediator)
    {
        _mediator = mediator;
    }

    // Page: Settings
    public IActionResult Index()
    {
        return View();
    }

    // AJAX: Get all settings
    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct)
    {
        var settings = await _mediator.Send(new GetSettingsQuery(), ct);
        return Json(settings);
    }

    // AJAX: Update setting
    [HttpPut]
    public async Task<IActionResult> Update([FromBody] UpdateSettingRequest request, CancellationToken ct)
    {
        await _mediator.Send(new UpdateSettingCommand(request.Key, request.Value), ct);
        return Json(new { message = "Setting updated" });
    }

    // AJAX: Get OTP required (public for portal)
    [AllowAnonymous]
    [HttpGet]
    public async Task<IActionResult> OtpRequired(CancellationToken ct)
    {
        var settings = await _mediator.Send(new GetSettingsQuery(), ct);
        var otpSetting = settings.FirstOrDefault(s => s.Key == "portal.otp.required");
        var required = otpSetting?.Value?.ToLowerInvariant() == "true";
        return Json(new { required });
    }

    public record UpdateSettingRequest(string Key, string Value);
}
