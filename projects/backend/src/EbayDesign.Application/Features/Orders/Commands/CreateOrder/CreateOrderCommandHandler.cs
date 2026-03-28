using EbayDesign.Application.Common.Interfaces;
using EbayDesign.Domain.Entities;
using EbayDesign.Domain.Enums;
using EbayDesign.Domain.Events;
using MediatR;

namespace EbayDesign.Application.Features.Orders.Commands.CreateOrder;

public class CreateOrderCommandHandler : IRequestHandler<CreateOrderCommand, Guid>
{
    private readonly IApplicationDbContext _context;

    public CreateOrderCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Guid> Handle(CreateOrderCommand request, CancellationToken cancellationToken)
    {
        var order = new Order
        {
            EbayOrderNo = request.EbayOrderNo,
            CustomerId = request.CustomerId,
            Status = OrderStatus.Draft,
            Notes = request.Notes
        };

        foreach (var itemDto in request.Items)
        {
            var orderItem = new OrderItem
            {
                SKU = itemDto.SKU,
                Quantity = itemDto.Quantity,
                Description = itemDto.Description
            };
            order.Items.Add(orderItem);

            var designRequest = new DesignRequest
            {
                Order = order,
                OrderItem = orderItem,
                Type = itemDto.DesignType,
                Status = DesignRequestStatus.WaitingUpload
            };
            designRequest.GenerateApprovalToken();
            designRequest.AddDomainEvent(new DesignRequestCreatedEvent(designRequest.Id, order.Id, itemDto.DesignType));
            order.DesignRequests.Add(designRequest);
        }

        order.AddDomainEvent(new OrderCreatedEvent(order.Id));

        _context.Orders.Add(order);
        await _context.SaveChangesAsync(cancellationToken);

        return order.Id;
    }
}
