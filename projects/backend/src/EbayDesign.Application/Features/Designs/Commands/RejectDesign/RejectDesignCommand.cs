using MediatR;

namespace EbayDesign.Application.Features.Designs.Commands.RejectDesign;

public record RejectDesignCommand(Guid DesignRequestId, string Reason) : IRequest;
