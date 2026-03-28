using EbayDesign.Domain.Enums;
using MediatR;

namespace EbayDesign.Application.Features.Portal.Queries.GetPortalOrder;

public record GetPortalOrderQuery(string Token) : IRequest<PortalOrderDto>;

public record PortalOrderDto(
    string EbayOrderNo,
    string CustomerName,
    List<PortalOrderItemDto> Items
);

public record PortalOrderItemDto(
    Guid DesignRequestId,
    string SKU,
    int Quantity,
    string? Description,
    DesignRequestType DesignType,
    DesignRequestStatus Status,
    string? RejectionReason,
    string? ApprovalToken,
    List<PortalFileDto> ActiveFiles
);

public record PortalFileDto(
    string FileName,
    string FileType,
    string PreviewUrl,
    int Version
);
