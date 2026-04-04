using MediatR;

namespace EbayDesign.Application.Features.Orders.Commands.UpdateOrder;

public record UpdateOrderCommand(
    Guid OrderId,
    string EbayOrderNo,
    string? Notes,
    List<UpdateOrderItemDto> Items
) : IRequest;

public record UpdateOrderItemDto(
    Guid? Id,
    string SKU,
    string? EbayProductCode,
    int Quantity,
    string? Description
);
