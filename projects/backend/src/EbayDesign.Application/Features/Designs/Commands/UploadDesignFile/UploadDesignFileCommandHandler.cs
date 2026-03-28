using EbayDesign.Application.Common.Interfaces;
using EbayDesign.Domain.Entities;
using EbayDesign.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EbayDesign.Application.Features.Designs.Commands.UploadDesignFile;

public class UploadDesignFileCommandHandler : IRequestHandler<UploadDesignFileCommand, Guid>
{
    private readonly IApplicationDbContext _context;
    private readonly IFileStorageService _fileStorage;

    private static readonly HashSet<string> AllowedFileTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "pdf", "jpg", "jpeg", "psd", "ai", "tiff", "tif", "png"
    };

    public UploadDesignFileCommandHandler(IApplicationDbContext context, IFileStorageService fileStorage)
    {
        _context = context;
        _fileStorage = fileStorage;
    }

    public async Task<Guid> Handle(UploadDesignFileCommand request, CancellationToken cancellationToken)
    {
        if (!AllowedFileTypes.Contains(request.FileType))
            throw new InvalidOperationException($"File type '{request.FileType}' is not supported. Allowed: {string.Join(", ", AllowedFileTypes)}");

        var designRequest = await _context.DesignRequests
            .Include(dr => dr.Files)
            .FirstOrDefaultAsync(dr => dr.Id == request.DesignRequestId, cancellationToken)
            ?? throw new KeyNotFoundException($"Design request with ID {request.DesignRequestId} not found.");

        if (designRequest.Status == DesignRequestStatus.Approved)
            throw new InvalidOperationException("Cannot upload files to an approved design request.");

        if (designRequest.Status != DesignRequestStatus.WaitingUpload
            && designRequest.Status != DesignRequestStatus.PrintRejected
            && designRequest.Status != DesignRequestStatus.InDesign
            && designRequest.Status != DesignRequestStatus.Rejected
            && designRequest.Status != DesignRequestStatus.WaitingApproval)
            throw new InvalidOperationException($"Cannot upload files when status is '{designRequest.Status}'.");

        // If starting a new round (Rejected → revision, or PrintRejected → re-upload),
        // deactivate old files FIRST so version bumps correctly.
        var needsNewRound =
            (designRequest.Status == DesignRequestStatus.Rejected && request.UploadedBy == UploadedBy.Admin)
            || (designRequest.Status == DesignRequestStatus.PrintRejected && request.UploadedBy == UploadedBy.Customer);

        if (needsNewRound && designRequest.Files.Any(f => f.IsActive))
        {
            foreach (var f in designRequest.Files.Where(f => f.IsActive))
                f.IsActive = false;
        }

        // Determine version — all files in the same submission round share the same version.
        var currentMaxVersion = designRequest.Files.Any()
            ? designRequest.Files.Max(f => f.Version) : 0;
        var activeFiles = designRequest.Files.Where(f => f.IsActive).ToList();

        int version;
        if (activeFiles.Count > 0)
        {
            // Active files exist from current round — use same version
            version = activeFiles.Max(f => f.Version);
        }
        else
        {
            // No active files — new round, bump version
            version = currentMaxVersion + 1;
        }

        // Upload file
        var containerPath = $"designs/{designRequest.OrderId}/{designRequest.Id}/v{version}";
        var uploadResult = await _fileStorage.UploadAsync(
            request.FileStream, request.FileName, containerPath, cancellationToken);

        var designFile = new DesignFile
        {
            DesignRequestId = designRequest.Id,
            FileName = request.FileName,
            FileType = request.FileType.ToLowerInvariant(),
            FileUrl = uploadResult.FileUrl,
            FileSizeBytes = uploadResult.FileSizeBytes,
            UploadedBy = request.UploadedBy,
            Version = version,
            IsActive = true
        };

        _context.DesignFiles.Add(designFile);

        // If admin uploads on Rejected design, transition back to InDesign
        if (designRequest.Status == DesignRequestStatus.Rejected && request.UploadedBy == UploadedBy.Admin)
        {
            designRequest.TransitionTo(DesignRequestStatus.InDesign);

            // Also transition order back to InDesign if it's in Rejected state
            var order = await _context.Orders
                .FirstOrDefaultAsync(o => o.Id == designRequest.OrderId, cancellationToken);
            if (order != null && order.Status == OrderStatus.Rejected)
            {
                order.TransitionTo(OrderStatus.InDesign);
            }
        }

        await _context.SaveChangesAsync(cancellationToken);
        return designFile.Id;
    }
}
