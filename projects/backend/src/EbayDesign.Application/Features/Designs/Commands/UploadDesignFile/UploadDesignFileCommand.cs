using EbayDesign.Domain.Enums;
using MediatR;

namespace EbayDesign.Application.Features.Designs.Commands.UploadDesignFile;

public record UploadDesignFileCommand(
    Guid DesignRequestId,
    Stream FileStream,
    string FileName,
    string FileType,
    long FileSizeBytes,
    UploadedBy UploadedBy
) : IRequest<Guid>;
