using EbayDesign.Domain.Enums;
using MediatR;

namespace EbayDesign.Application.Features.Orders.Commands.AddOrderItem;

public record AddOrderItemCommand(
    Guid OrderId,
    string SKU,
    int Quantity,
    string? Description,
    DesignRequestType DesignType
) : IRequest<Guid>;
