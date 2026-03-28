using EbayDesign.Domain.Enums;
using MediatR;

namespace EbayDesign.Application.Features.Orders.Commands.UpdateOrderStatus;

public record UpdateOrderStatusCommand(Guid OrderId, OrderStatus NewStatus) : IRequest;
