using EbayDesign.Application.Common.Interfaces;
using EbayDesign.Application.Features.Shipments.Commands.CreateShipment;
using EbayDesign.Application.Features.Shipments.Queries.GetShipmentByOrder;
using EbayDesign.Domain.Enums;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace EbayDesign.Api.Controllers;

[ApiController]
[Route("api")]
public class ShipmentsController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly IRoyalMailService _royalMailService;

    public ShipmentsController(IMediator mediator, IRoyalMailService royalMailService)
    {
        _mediator = mediator;
        _royalMailService = royalMailService;
    }

    [HttpPost("orders/{orderId:guid}/shipments")]
    public async Task<ActionResult<Guid>> Create(Guid orderId,
        [FromBody] CreateShipmentRequest request, CancellationToken cancellationToken)
    {
        var id = await _mediator.Send(
            new CreateShipmentCommand(orderId, request.TrackingNumber, request.DeliveryType), cancellationToken);
        return CreatedAtAction(nameof(GetByOrder), new { orderId }, id);
    }

    [HttpGet("orders/{orderId:guid}/shipments")]
    public async Task<IActionResult> GetByOrder(Guid orderId, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetShipmentByOrderQuery(orderId), cancellationToken);
        if (result is null) return NotFound();
        return Ok(result);
    }

    [HttpGet("shipments/{id:guid}/tracking")]
    public async Task<IActionResult> GetTracking(Guid id, CancellationToken cancellationToken)
    {
        var shipment = await _mediator.Send(
            new GetShipmentByOrderQuery(id), cancellationToken);

        if (shipment is null) return NotFound();

        var tracking = await _royalMailService.GetTrackingAsync(
            shipment.TrackingNumber, cancellationToken);

        return Ok(tracking);
    }
}

public record CreateShipmentRequest(string TrackingNumber, DeliveryType DeliveryType);
