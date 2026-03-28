using EbayDesign.Domain.Common;

namespace EbayDesign.Domain.Entities;

public class SystemSetting : BaseEntity
{
    public string Key { get; set; } = null!;
    public string Value { get; set; } = null!;
    public string? Description { get; set; }
}
