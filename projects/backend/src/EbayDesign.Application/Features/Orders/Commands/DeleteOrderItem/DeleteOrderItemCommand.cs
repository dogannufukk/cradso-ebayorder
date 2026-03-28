using MediatR;

namespace EbayDesign.Application.Features.Orders.Commands.DeleteOrderItem;

public record DeleteOrderItemCommand(Guid OrderId, Guid ItemId) : IRequest;
