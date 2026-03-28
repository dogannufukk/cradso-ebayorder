using MediatR;

namespace EbayDesign.Application.Features.Portal.Commands.PortalSubmit;

public record PortalSubmitCommand(string Token) : IRequest;
