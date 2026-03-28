using EbayDesign.Domain.Enums;
using MediatR;

namespace EbayDesign.Application.Features.Designs.Queries.GetDesignsByOrder;

public record GetDesignsByOrderQuery(Guid OrderId) : IRequest<List<DesignRequestDto>>;

public record DesignRequestDto(
    Guid Id,
    Guid OrderItemId,
    string ItemSKU,
    DesignRequestType Type,
    DesignRequestStatus Status,
    string? RejectionReason,
    string? ApprovalToken,
    DateTime? TokenExpiresAt,
    DateTime CreatedDate,
    List<DesignFileDto> Files
);

public record DesignFileDto(
    Guid Id,
    string FileName,
    string FileType,
    string FileUrl,
    long FileSizeBytes,
    UploadedBy UploadedBy,
    int Version,
    bool IsActive,
    string? RejectionReason,
    DateTime CreatedDate
);
