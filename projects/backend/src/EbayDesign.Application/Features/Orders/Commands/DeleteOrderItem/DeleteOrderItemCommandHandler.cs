using EbayDesign.Application.Common.Interfaces;
using EbayDesign.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EbayDesign.Application.Features.Orders.Commands.DeleteOrderItem;

public class DeleteOrderItemCommandHandler : IRequestHandler<DeleteOrderItemCommand>
{
    private readonly IApplicationDbContext _context;

    public DeleteOrderItemCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task Handle(DeleteOrderItemCommand request, CancellationToken cancellationToken)
    {
        var order = await _context.Orders
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == request.OrderId, cancellationToken)
            ?? throw new KeyNotFoundException($"Order with ID {request.OrderId} not found.");

        if (order.Status != OrderStatus.Draft && order.Status != OrderStatus.WaitingDesign)
            throw new InvalidOperationException("Cannot remove items from an order that is already in progress.");

        var item = order.Items.FirstOrDefault(i => i.Id == request.ItemId)
            ?? throw new KeyNotFoundException($"Order item with ID {request.ItemId} not found.");

        if (order.Items.Count <= 1)
            throw new InvalidOperationException("Cannot remove the last item from an order.");

        // Remove associated design request
        var designRequest = await _context.DesignRequests
            .FirstOrDefaultAsync(dr => dr.OrderItemId == request.ItemId, cancellationToken);

        if (designRequest != null)
            _context.DesignRequests.Remove(designRequest);

        _context.OrderItems.Remove(item);
        await _context.SaveChangesAsync(cancellationToken);
    }
}
