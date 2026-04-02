using EbayDesign.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EbayDesign.Application.Features.Portal.Queries.GetPortalOrder;

public class GetPortalOrderQueryHandler : IRequestHandler<GetPortalOrderQuery, PortalOrderDto>
{
    private readonly IApplicationDbContext _context;
    private readonly IFileStorageService _fileStorage;

    public GetPortalOrderQueryHandler(IApplicationDbContext context, IFileStorageService fileStorage)
    {
        _context = context;
        _fileStorage = fileStorage;
    }

    public async Task<PortalOrderDto> Handle(GetPortalOrderQuery request, CancellationToken cancellationToken)
    {
        // Find the design request by token to identify the order
        var designRequest = await _context.DesignRequests
            .AsNoTracking()
            .FirstOrDefaultAsync(d => d.ApprovalToken == request.Token, cancellationToken)
            ?? throw new KeyNotFoundException("Invalid or expired design link.");

        if (designRequest.TokenExpiresAt.HasValue && designRequest.TokenExpiresAt.Value < DateTime.UtcNow)
            throw new InvalidOperationException("This design link has expired.");

        // Check if OTP is required
        var otpSetting = await _context.SystemSettings
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Key == "portal.otp.required", cancellationToken);
        var otpRequired = otpSetting?.Value?.ToLower() == "true";

        if (otpRequired && (designRequest.OtpVerifiedUntil == null || designRequest.OtpVerifiedUntil < DateTime.UtcNow))
            throw new UnauthorizedAccessException("OTP verification required.");

        // Load the full order with all design requests
        var order = await _context.Orders
            .AsNoTracking()
            .Include(o => o.Customer)
            .Include(o => o.Items)
            .Include(o => o.DesignRequests)
                .ThenInclude(dr => dr.Files)
            .FirstOrDefaultAsync(o => o.Id == designRequest.OrderId, cancellationToken)
            ?? throw new KeyNotFoundException("Order not found.");

        var items = new List<PortalOrderItemDto>();

        foreach (var item in order.Items)
        {
            var dr = order.DesignRequests.FirstOrDefault(d => d.OrderItemId == item.Id);
            if (dr == null) continue;

            var activeFiles = new List<PortalFileDto>();
            var allFiles = new List<PortalFileDto>();

            foreach (var file in dr.Files.OrderByDescending(f => f.Version).ThenByDescending(f => f.CreatedDate))
            {
                var previewUrl = _fileStorage.GeneratePreSignedUrl(file.FileUrl, TimeSpan.FromHours(1));
                var dto = new PortalFileDto(
                    file.FileName, file.FileType, previewUrl, file.Version,
                    file.IsActive, file.UploadedBy.ToString(), file.RejectionReason);
                allFiles.Add(dto);
                if (file.IsActive) activeFiles.Add(dto);
            }

            items.Add(new PortalOrderItemDto(
                dr.Id, item.SKU, item.Quantity, item.Description,
                dr.Type, dr.Status, dr.RejectionReason, dr.ApprovalToken, activeFiles, allFiles
            ));
        }

        return new PortalOrderDto(order.EbayOrderNo, order.Customer.CustomerName, items);
    }
}
