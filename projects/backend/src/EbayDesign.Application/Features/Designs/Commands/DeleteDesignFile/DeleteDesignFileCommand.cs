using MediatR;

namespace EbayDesign.Application.Features.Designs.Commands.DeleteDesignFile;

public record DeleteDesignFileCommand(Guid DesignRequestId, Guid FileId) : IRequest;
