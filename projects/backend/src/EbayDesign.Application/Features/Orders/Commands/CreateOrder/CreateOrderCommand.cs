using EbayDesign.Domain.Enums;
using MediatR;

namespace EbayDesign.Application.Features.Orders.Commands.CreateOrder;

public record CreateOrderCommand(
    string EbayOrderNo,
    Guid CustomerId,
    string? Notes,
    List<CreateOrderItemDto> Items
) : IRequest<Guid>;

public record CreateOrderItemDto(
    string SKU,
    string? EbayProductCode,
    int Quantity,
    string? Description,
    DesignRequestType DesignType
);
