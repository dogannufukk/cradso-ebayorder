using EbayDesign.Application.Features.Orders.Commands.AddOrderItem;
using EbayDesign.Application.Features.Orders.Commands.CreateOrder;
using EbayDesign.Application.Features.Orders.Commands.DeleteOrder;
using EbayDesign.Application.Features.Orders.Commands.DeleteOrderItem;
using EbayDesign.Application.Features.Orders.Commands.UpdateOrder;
using EbayDesign.Application.Features.Orders.Commands.UpdateOrderStatus;
using EbayDesign.Application.Features.Orders.Queries.GetOrderById;
using EbayDesign.Application.Features.Orders.Queries.GetOrders;
using EbayDesign.Domain.Enums;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace EbayDesign.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class OrdersController : ControllerBase
{
    private readonly IMediator _mediator;

    public OrdersController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpPost]
    public async Task<ActionResult<Guid>> Create([FromBody] CreateOrderCommand command,
        CancellationToken cancellationToken)
    {
        var id = await _mediator.Send(command, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id }, id);
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] OrderStatus? status = null,
        [FromQuery] string? search = null,
        [FromQuery] string? sortBy = null,
        [FromQuery] string? sortDirection = null,
        [FromQuery] string? ebayOrderNo = null,
        [FromQuery] string? customerName = null,
        [FromQuery] string? customerEmail = null,
        CancellationToken cancellationToken = default)
    {
        var result = await _mediator.Send(
            new GetOrdersQuery(page, pageSize, status, search, sortBy, sortDirection,
                ebayOrderNo, customerName, customerEmail), cancellationToken);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetOrderByIdQuery(id), cancellationToken);
        if (result is null) return NotFound();
        return Ok(result);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id,
        [FromBody] UpdateOrderRequest request, CancellationToken cancellationToken)
    {
        await _mediator.Send(new UpdateOrderCommand(
            id, request.EbayOrderNo, request.Notes, request.Items), cancellationToken);
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        await _mediator.Send(new DeleteOrderCommand(id), cancellationToken);
        return NoContent();
    }

    [HttpPatch("{id:guid}/status")]
    public async Task<IActionResult> UpdateStatus(Guid id,
        [FromBody] UpdateStatusRequest request, CancellationToken cancellationToken)
    {
        await _mediator.Send(new UpdateOrderStatusCommand(id, request.Status), cancellationToken);
        return NoContent();
    }

    [HttpPost("{id:guid}/items")]
    public async Task<ActionResult<Guid>> AddItem(Guid id,
        [FromBody] AddOrderItemRequest request, CancellationToken cancellationToken)
    {
        var itemId = await _mediator.Send(new AddOrderItemCommand(
            id, request.SKU, request.Quantity, request.Description, request.DesignType
        ), cancellationToken);
        return Created($"/api/orders/{id}", itemId);
    }

    [HttpDelete("{id:guid}/items/{itemId:guid}")]
    public async Task<IActionResult> DeleteItem(Guid id, Guid itemId,
        CancellationToken cancellationToken)
    {
        await _mediator.Send(new DeleteOrderItemCommand(id, itemId), cancellationToken);
        return NoContent();
    }
}

public record UpdateStatusRequest(OrderStatus Status);

public record UpdateOrderRequest(
    string EbayOrderNo,
    string? Notes,
    List<UpdateOrderItemDto> Items
);

public record AddOrderItemRequest(
    string SKU,
    int Quantity,
    string? Description,
    DesignRequestType DesignType
);
