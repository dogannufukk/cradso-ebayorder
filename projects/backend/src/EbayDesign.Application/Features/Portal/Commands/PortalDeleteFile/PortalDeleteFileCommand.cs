using MediatR;

namespace EbayDesign.Application.Features.Portal.Commands.PortalDeleteFile;

public record PortalDeleteFileCommand(string Token, Guid FileId) : IRequest;
