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
    int Quantity,
    string? Description,
    DesignRequestType DesignType
);
