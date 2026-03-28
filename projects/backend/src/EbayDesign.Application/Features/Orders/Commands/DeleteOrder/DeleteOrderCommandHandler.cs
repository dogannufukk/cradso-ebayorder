using EbayDesign.Application.Common.Interfaces;
using EbayDesign.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EbayDesign.Application.Features.Orders.Commands.DeleteOrder;

public class DeleteOrderCommandHandler : IRequestHandler<DeleteOrderCommand>
{
    private readonly IApplicationDbContext _context;

    public DeleteOrderCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task Handle(DeleteOrderCommand request, CancellationToken cancellationToken)
    {
        var order = await _context.Orders
            .Include(o => o.Items)
            .Include(o => o.DesignRequests)
                .ThenInclude(dr => dr.Files)
            .FirstOrDefaultAsync(o => o.Id == request.OrderId, cancellationToken)
            ?? throw new KeyNotFoundException($"Order {request.OrderId} not found.");

        if (order.Status != OrderStatus.Draft)
            throw new InvalidOperationException("Only orders in Draft status can be deleted.");

        foreach (var dr in order.DesignRequests)
            _context.DesignFiles.RemoveRange(dr.Files);

        _context.DesignRequests.RemoveRange(order.DesignRequests);
        _context.OrderItems.RemoveRange(order.Items);
        _context.Orders.Remove(order);

        await _context.SaveChangesAsync(cancellationToken);
    }
}
