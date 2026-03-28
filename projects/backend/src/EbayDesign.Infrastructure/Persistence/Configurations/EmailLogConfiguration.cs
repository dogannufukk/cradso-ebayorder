using EbayDesign.Domain.Entities;
using EbayDesign.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace EbayDesign.Infrastructure.Persistence.Configurations;

public class EmailLogConfiguration : IEntityTypeConfiguration<EmailLog>
{
    public void Configure(EntityTypeBuilder<EmailLog> builder)
    {
        builder.HasKey(e => e.Id);

        builder.Property(e => e.ToEmail).IsRequired().HasMaxLength(256);
        builder.Property(e => e.Subject).IsRequired().HasMaxLength(512);
        builder.Property(e => e.TemplateName).IsRequired().HasMaxLength(128);
        builder.Property(e => e.TemplateModel).HasColumnType("nvarchar(max)");
        builder.Property(e => e.Status).HasConversion<int>();
        builder.Property(e => e.ErrorMessage).HasMaxLength(2000);
        builder.Property(e => e.RelatedEntityType).HasMaxLength(128);
        builder.Property(e => e.RelatedEntityId).HasMaxLength(128);

        // Index for queue processing: find pending/failed emails efficiently
        builder.HasIndex(e => new { e.Status, e.NextRetryAt })
            .HasDatabaseName("IX_EmailLogs_Status_NextRetryAt");

        // Index for looking up emails by related entity
        builder.HasIndex(e => e.RelatedEntityId)
            .HasDatabaseName("IX_EmailLogs_RelatedEntityId");

        builder.HasIndex(e => e.CreatedDate)
            .HasDatabaseName("IX_EmailLogs_CreatedDate");
    }
}
