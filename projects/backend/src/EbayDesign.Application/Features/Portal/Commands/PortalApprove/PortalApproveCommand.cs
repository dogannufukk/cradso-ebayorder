using MediatR;

namespace EbayDesign.Application.Features.Portal.Commands.PortalApprove;

public record PortalApproveCommand(string Token) : IRequest;
