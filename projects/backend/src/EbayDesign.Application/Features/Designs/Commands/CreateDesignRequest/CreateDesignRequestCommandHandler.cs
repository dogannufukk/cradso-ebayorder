using EbayDesign.Application.Common.Interfaces;
using EbayDesign.Domain.Entities;
using EbayDesign.Domain.Enums;
using EbayDesign.Domain.Events;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EbayDesign.Application.Features.Designs.Commands.CreateDesignRequest;

public class CreateDesignRequestCommandHandler : IRequestHandler<CreateDesignRequestCommand, Guid>
{
    private readonly IApplicationDbContext _context;

    public CreateDesignRequestCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Guid> Handle(CreateDesignRequestCommand request, CancellationToken cancellationToken)
    {
        var order = await _context.Orders
            .FirstOrDefaultAsync(o => o.Id == request.OrderId, cancellationToken)
            ?? throw new KeyNotFoundException($"Order with ID {request.OrderId} not found.");

        var orderItem = await _context.OrderItems
            .FirstOrDefaultAsync(i => i.Id == request.OrderItemId && i.OrderId == request.OrderId, cancellationToken)
            ?? throw new KeyNotFoundException($"Order item with ID {request.OrderItemId} not found.");

        var existing = await _context.DesignRequests
            .AnyAsync(dr => dr.OrderItemId == request.OrderItemId
                && dr.Status != DesignRequestStatus.Rejected, cancellationToken);

        if (existing)
            throw new InvalidOperationException("An active design request already exists for this item.");

        var designRequest = new DesignRequest
        {
            OrderId = request.OrderId,
            OrderItemId = request.OrderItemId,
            Type = request.Type,
            Status = DesignRequestStatus.WaitingUpload
        };
        designRequest.GenerateApprovalToken();
        designRequest.AddDomainEvent(new DesignRequestCreatedEvent(designRequest.Id, request.OrderId, request.Type));

        _context.DesignRequests.Add(designRequest);
        await _context.SaveChangesAsync(cancellationToken);

        return designRequest.Id;
    }
}
