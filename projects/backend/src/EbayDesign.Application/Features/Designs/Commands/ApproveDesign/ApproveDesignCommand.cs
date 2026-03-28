using MediatR;

namespace EbayDesign.Application.Features.Designs.Commands.ApproveDesign;

public record ApproveDesignCommand(Guid DesignRequestId) : IRequest;
