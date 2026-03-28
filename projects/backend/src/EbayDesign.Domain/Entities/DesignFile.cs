using EbayDesign.Domain.Common;
using EbayDesign.Domain.Enums;

namespace EbayDesign.Domain.Entities;

public class DesignFile : BaseEntity
{
    public Guid DesignRequestId { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string FileType { get; set; } = string.Empty;
    public string FileUrl { get; set; } = string.Empty;
    public long FileSizeBytes { get; set; }
    public UploadedBy UploadedBy { get; set; }
    public int Version { get; set; } = 1;
    public bool IsActive { get; set; } = true;
    public string? RejectionReason { get; set; }

    public DesignRequest DesignRequest { get; set; } = null!;
}
