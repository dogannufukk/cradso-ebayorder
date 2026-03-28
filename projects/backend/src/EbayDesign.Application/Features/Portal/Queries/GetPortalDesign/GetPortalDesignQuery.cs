using EbayDesign.Domain.Enums;
using MediatR;

namespace EbayDesign.Application.Features.Portal.Queries.GetPortalDesign;

public record GetPortalDesignQuery(string Token) : IRequest<PortalDesignDto>;

public record PortalDesignDto(
    Guid DesignRequestId,
    string EbayOrderNo,
    string ItemSKU,
    DesignRequestType Type,
    DesignRequestStatus Status,
    string? RejectionReason,
    PortalDesignFileDto? ActiveFile
);

public record PortalDesignFileDto(
    string FileName,
    string FileType,
    string PreviewUrl,
    int Version
);
