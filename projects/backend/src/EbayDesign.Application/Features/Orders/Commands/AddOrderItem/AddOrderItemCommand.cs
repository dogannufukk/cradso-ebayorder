using EbayDesign.Domain.Enums;
using MediatR;

namespace EbayDesign.Application.Features.Orders.Commands.AddOrderItem;

public record AddOrderItemCommand(
    Guid OrderId,
    string SKU,
    string? EbayProductCode,
    int Quantity,
    string? Description,
    DesignRequestType DesignType
) : IRequest<Guid>;
