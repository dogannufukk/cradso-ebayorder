using EbayDesign.Application.Features.Orders.Commands.AddOrderItem;
using EbayDesign.Application.Features.Orders.Commands.CreateOrder;
using EbayDesign.Application.Features.Orders.Commands.DeleteOrder;
using EbayDesign.Application.Features.Orders.Commands.DeleteOrderItem;
using EbayDesign.Application.Features.Orders.Commands.UpdateOrder;
using EbayDesign.Application.Features.Orders.Commands.UpdateOrderStatus;
using EbayDesign.Application.Features.Orders.Queries.GetOrderById;
using EbayDesign.Application.Features.Orders.Queries.GetOrders;
using EbayDesign.Application.Features.Shipments.Commands.CreateShipment;
using EbayDesign.Domain.Enums;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EbayDesign.Api.Controllers.Mvc;

[Authorize]
public class OrderController : Controller
{
    private readonly IMediator _mediator;

    public OrderController(IMediator mediator)
    {
        _mediator = mediator;
    }

    // Page: Order List
    public IActionResult Index()
    {
        return View();
    }

    // Page: Create Order Wizard
    public IActionResult Create()
    {
        return View();
    }

    // Page: Order Detail
    public async Task<IActionResult> Detail(Guid id, CancellationToken ct)
    {
        var order = await _mediator.Send(new GetOrderByIdQuery(id), ct);
        if (order == null) return NotFound();
        return View(order);
    }

    // AJAX: Get orders list (for DataGrid)
    [HttpGet]
    public async Task<IActionResult> List(int page = 1, int pageSize = 20, OrderStatus? status = null,
        string? search = null, string? sortBy = null, string? sortDirection = null,
        string? ebayOrderNo = null, string? customerName = null, string? customerEmail = null,
        CancellationToken ct = default)
    {
        var result = await _mediator.Send(new GetOrdersQuery(page, pageSize, status, search, sortBy, sortDirection, ebayOrderNo, customerName, customerEmail), ct);
        return Json(result);
    }

    // AJAX: Create order
    [HttpPost]
    public async Task<IActionResult> CreateOrder([FromBody] CreateOrderCommand command, CancellationToken ct)
    {
        var id = await _mediator.Send(command, ct);
        return Json(new { id });
    }

    // AJAX: Update order
    [HttpPut]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateOrderRequest request, CancellationToken ct)
    {
        await _mediator.Send(new UpdateOrderCommand(id, request.EbayOrderNo, request.Notes, request.Items), ct);
        return Json(new { success = true });
    }

    // AJAX: Delete order
    [HttpDelete]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await _mediator.Send(new DeleteOrderCommand(id), ct);
        return Json(new { success = true });
    }

    // AJAX: Update order status
    [HttpPatch]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateStatusRequest request, CancellationToken ct)
    {
        await _mediator.Send(new UpdateOrderStatusCommand(id, request.Status), ct);
        return Json(new { success = true });
    }

    // AJAX: Add order item
    [HttpPost]
    public async Task<IActionResult> AddItem(Guid id, [FromBody] AddOrderItemRequest request, CancellationToken ct)
    {
        var itemId = await _mediator.Send(new AddOrderItemCommand(id, request.SKU, request.Quantity, request.Description, request.DesignType), ct);
        return Json(new { id = itemId });
    }

    // AJAX: Delete order item
    [HttpDelete]
    public async Task<IActionResult> DeleteItem(Guid id, Guid itemId, CancellationToken ct)
    {
        await _mediator.Send(new DeleteOrderItemCommand(id, itemId), ct);
        return Json(new { success = true });
    }

    // AJAX: Create shipment
    [HttpPost]
    public async Task<IActionResult> CreateShipment(Guid id, [FromBody] CreateShipmentRequest request, CancellationToken ct)
    {
        var shipmentId = await _mediator.Send(new CreateShipmentCommand(id, request.TrackingNumber, request.DeliveryType), ct);
        return Json(new { id = shipmentId });
    }

    public record UpdateOrderRequest(string EbayOrderNo, string? Notes, List<UpdateOrderItemDto> Items);
    public record UpdateStatusRequest(OrderStatus Status);
    public record AddOrderItemRequest(string SKU, int Quantity, string? Description, DesignRequestType DesignType);
    public record CreateShipmentRequest(string TrackingNumber, DeliveryType DeliveryType);
}
