using MediatR;

namespace EbayDesign.Application.Features.Orders.Commands.DeleteOrder;

public record DeleteOrderCommand(Guid OrderId) : IRequest;
