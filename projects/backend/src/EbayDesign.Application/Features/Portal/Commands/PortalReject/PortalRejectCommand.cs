using MediatR;

namespace EbayDesign.Application.Features.Portal.Commands.PortalReject;

public record PortalRejectCommand(string Token, string Reason) : IRequest;
