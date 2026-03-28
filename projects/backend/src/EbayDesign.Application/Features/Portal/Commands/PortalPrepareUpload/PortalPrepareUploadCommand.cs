using MediatR;

namespace EbayDesign.Application.Features.Portal.Commands.PortalPrepareUpload;

/// <summary>
/// Called before uploading files. If the design request is in PrintRejected status,
/// deactivates old active files so the new upload round gets a fresh version.
/// </summary>
public record PortalPrepareUploadCommand(string Token) : IRequest;
