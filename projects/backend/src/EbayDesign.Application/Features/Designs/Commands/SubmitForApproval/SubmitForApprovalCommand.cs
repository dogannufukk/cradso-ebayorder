using MediatR;

namespace EbayDesign.Application.Features.Designs.Commands.SubmitForApproval;

public record SubmitForApprovalCommand(Guid DesignRequestId) : IRequest;
