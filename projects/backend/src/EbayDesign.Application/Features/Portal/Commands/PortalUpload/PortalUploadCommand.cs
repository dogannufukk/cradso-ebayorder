using MediatR;

namespace EbayDesign.Application.Features.Portal.Commands.PortalUpload;

public record PortalUploadCommand(
    string Token,
    Stream FileStream,
    string FileName,
    string FileType,
    long FileSizeBytes
) : IRequest<Guid>;
