using EbayDesign.Application.Common.Interfaces;
using EbayDesign.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EbayDesign.Application.Features.Designs.Commands.DeleteDesignFile;

public class DeleteDesignFileCommandHandler : IRequestHandler<DeleteDesignFileCommand>
{
    private readonly IApplicationDbContext _context;
    private readonly IFileStorageService _fileStorage;

    public DeleteDesignFileCommandHandler(IApplicationDbContext context, IFileStorageService fileStorage)
    {
        _context = context;
        _fileStorage = fileStorage;
    }

    public async Task Handle(DeleteDesignFileCommand request, CancellationToken cancellationToken)
    {
        var dr = await _context.DesignRequests
            .Include(d => d.Files)
            .FirstOrDefaultAsync(d => d.Id == request.DesignRequestId, cancellationToken)
            ?? throw new KeyNotFoundException("Design request not found.");

        // Only allow deletion in InDesign or PrintApproved status
        if (dr.Status != DesignRequestStatus.InDesign && dr.Status != DesignRequestStatus.PrintApproved)
            throw new InvalidOperationException("Files can only be deleted during the design phase.");

        var file = dr.Files.FirstOrDefault(f => f.Id == request.FileId)
            ?? throw new KeyNotFoundException("File not found.");

        // Only allow deleting admin-uploaded files
        if (file.UploadedBy != UploadedBy.Admin)
            throw new InvalidOperationException("Only admin-uploaded design files can be deleted.");

        await _fileStorage.DeleteAsync(file.FileUrl, cancellationToken);
        _context.DesignFiles.Remove(file);
        await _context.SaveChangesAsync(cancellationToken);
    }
}
