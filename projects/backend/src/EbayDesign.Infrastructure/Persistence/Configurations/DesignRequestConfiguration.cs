using EbayDesign.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace EbayDesign.Infrastructure.Persistence.Configurations;

public class DesignRequestConfiguration : IEntityTypeConfiguration<DesignRequest>
{
    public void Configure(EntityTypeBuilder<DesignRequest> builder)
    {
        builder.HasKey(dr => dr.Id);
        builder.Property(dr => dr.Id).HasDefaultValueSql("NEWSEQUENTIALID()");

        builder.Property(dr => dr.Type).IsRequired();
        builder.Property(dr => dr.Status).IsRequired();
        builder.Property(dr => dr.RejectionReason).HasColumnType("nvarchar(max)");
        builder.Property(dr => dr.ApprovalToken).HasMaxLength(128);

        builder.HasIndex(dr => dr.OrderId);
        builder.HasIndex(dr => dr.ApprovalToken)
            .HasFilter("[ApprovalToken] IS NOT NULL");

        builder.HasOne(dr => dr.OrderItem)
            .WithOne(oi => oi.DesignRequest)
            .HasForeignKey<DesignRequest>(dr => dr.OrderItemId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(dr => dr.Files)
            .WithOne(f => f.DesignRequest)
            .HasForeignKey(f => f.DesignRequestId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Ignore(dr => dr.DomainEvents);
    }
}
