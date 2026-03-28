using EbayDesign.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace EbayDesign.Infrastructure.Persistence.Configurations;

public class DesignFileConfiguration : IEntityTypeConfiguration<DesignFile>
{
    public void Configure(EntityTypeBuilder<DesignFile> builder)
    {
        builder.HasKey(f => f.Id);
        builder.Property(f => f.Id).HasDefaultValueSql("NEWSEQUENTIALID()");

        builder.Property(f => f.FileName).HasMaxLength(300).IsRequired();
        builder.Property(f => f.FileType).HasMaxLength(10).IsRequired();
        builder.Property(f => f.FileUrl).HasMaxLength(1000).IsRequired();
        builder.Property(f => f.FileSizeBytes).IsRequired();
        builder.Property(f => f.UploadedBy).IsRequired();
        builder.Property(f => f.Version).IsRequired().HasDefaultValue(1);
        builder.Property(f => f.IsActive).IsRequired().HasDefaultValue(true);

        builder.HasIndex(f => f.DesignRequestId);
        builder.Ignore(f => f.DomainEvents);
    }
}
