using MediatR;

namespace EbayDesign.Application.Features.Designs.Commands.ApprovePrint;

public record ApprovePrintCommand(Guid DesignRequestId) : IRequest;
