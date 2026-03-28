using EbayDesign.Domain.Enums;
using MediatR;

namespace EbayDesign.Application.Features.Designs.Commands.CreateDesignRequest;

public record CreateDesignRequestCommand(
    Guid OrderId,
    Guid OrderItemId,
    DesignRequestType Type
) : IRequest<Guid>;
