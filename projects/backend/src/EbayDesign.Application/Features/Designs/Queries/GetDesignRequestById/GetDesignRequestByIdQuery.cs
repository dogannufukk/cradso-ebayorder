using EbayDesign.Application.Features.Designs.Queries.GetDesignsByOrder;
using MediatR;

namespace EbayDesign.Application.Features.Designs.Queries.GetDesignRequestById;

public record GetDesignRequestByIdQuery(Guid Id) : IRequest<DesignRequestDto?>;
