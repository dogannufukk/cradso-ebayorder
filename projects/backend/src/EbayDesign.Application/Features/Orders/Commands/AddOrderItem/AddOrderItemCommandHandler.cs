using EbayDesign.Application.Common.Interfaces;
using EbayDesign.Domain.Entities;
using EbayDesign.Domain.Enums;
using EbayDesign.Domain.Events;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EbayDesign.Application.Features.Orders.Commands.AddOrderItem;

public class AddOrderItemCommandHandler : IRequestHandler<AddOrderItemCommand, Guid>
{
    private readonly IApplicationDbContext _context;

    public AddOrderItemCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Guid> Handle(AddOrderItemCommand request, CancellationToken cancellationToken)
    {
        var order = await _context.Orders
            .FirstOrDefaultAsync(o => o.Id == request.OrderId, cancellationToken)
            ?? throw new KeyNotFoundException($"Order with ID {request.OrderId} not found.");

        if (order.Status != OrderStatus.Draft && order.Status != OrderStatus.WaitingDesign)
            throw new InvalidOperationException("Cannot add items to an order that is already in progress.");

        var orderItem = new OrderItem
        {
            Id = Guid.NewGuid(),
            OrderId = order.Id,
            SKU = request.SKU,
            Quantity = request.Quantity,
            Description = request.Description
        };

        _context.OrderItems.Add(orderItem);

        var designRequest = new DesignRequest
        {
            OrderId = order.Id,
            OrderItemId = orderItem.Id,
            Type = request.DesignType,
            Status = DesignRequestStatus.WaitingUpload
        };
        designRequest.GenerateApprovalToken();
        designRequest.AddDomainEvent(new DesignRequestCreatedEvent(designRequest.Id, order.Id, request.DesignType));

        _context.DesignRequests.Add(designRequest);

        await _context.SaveChangesAsync(cancellationToken);
        return orderItem.Id;
    }
}
