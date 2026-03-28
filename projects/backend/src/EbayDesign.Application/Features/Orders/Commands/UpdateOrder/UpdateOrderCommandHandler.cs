using EbayDesign.Application.Common.Interfaces;
using EbayDesign.Domain.Entities;
using EbayDesign.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EbayDesign.Application.Features.Orders.Commands.UpdateOrder;

public class UpdateOrderCommandHandler : IRequestHandler<UpdateOrderCommand>
{
    private readonly IApplicationDbContext _context;

    public UpdateOrderCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task Handle(UpdateOrderCommand request, CancellationToken cancellationToken)
    {
        var order = await _context.Orders
            .Include(o => o.Items)
            .Include(o => o.DesignRequests)
            .FirstOrDefaultAsync(o => o.Id == request.OrderId, cancellationToken)
            ?? throw new KeyNotFoundException($"Order {request.OrderId} not found.");

        if (order.Status != OrderStatus.Draft)
            throw new InvalidOperationException("Only orders in Draft status can be edited.");

        order.EbayOrderNo = request.EbayOrderNo;
        order.Notes = request.Notes;

        // Remove items not in the request
        var requestItemIds = request.Items.Where(i => i.Id.HasValue).Select(i => i.Id!.Value).ToHashSet();
        var itemsToRemove = order.Items.Where(i => !requestItemIds.Contains(i.Id)).ToList();
        foreach (var item in itemsToRemove)
        {
            var relatedDesign = order.DesignRequests.FirstOrDefault(dr => dr.OrderItemId == item.Id);
            if (relatedDesign != null)
                _context.DesignRequests.Remove(relatedDesign);
            _context.OrderItems.Remove(item);
        }

        // Update existing and add new items
        foreach (var dto in request.Items)
        {
            if (dto.Id.HasValue)
            {
                var existing = order.Items.FirstOrDefault(i => i.Id == dto.Id.Value);
                if (existing != null)
                {
                    existing.SKU = dto.SKU;
                    existing.Quantity = dto.Quantity;
                    existing.Description = dto.Description;
                }
            }
            else
            {
                var newItem = new OrderItem
                {
                    OrderId = order.Id,
                    SKU = dto.SKU,
                    Quantity = dto.Quantity,
                    Description = dto.Description
                };
                order.Items.Add(newItem);

                var designRequest = new DesignRequest
                {
                    Order = order,
                    OrderItem = newItem,
                    Type = DesignRequestType.CustomerUpload,
                    Status = DesignRequestStatus.WaitingUpload
                };
                designRequest.GenerateApprovalToken();
                order.DesignRequests.Add(designRequest);
            }
        }

        await _context.SaveChangesAsync(cancellationToken);
    }
}
