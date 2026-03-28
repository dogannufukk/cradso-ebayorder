using MediatR;

namespace EbayDesign.Application.Features.Designs.Commands.RejectPrint;

public record RejectPrintCommand(Guid DesignRequestId, string Reason) : IRequest;
