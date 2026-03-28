using EbayDesign.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace EbayDesign.Infrastructure.Persistence.Configurations;

public class OrderConfiguration : IEntityTypeConfiguration<Order>
{
    public void Configure(EntityTypeBuilder<Order> builder)
    {
        builder.HasKey(o => o.Id);
        builder.Property(o => o.Id).HasDefaultValueSql("NEWSEQUENTIALID()");

        builder.Property(o => o.EbayOrderNo).HasMaxLength(50).IsRequired();
        builder.HasIndex(o => o.EbayOrderNo).IsUnique();

        builder.Property(o => o.Status).IsRequired();
        builder.Property(o => o.Notes).HasColumnType("nvarchar(max)");

        builder.HasOne(o => o.Customer)
            .WithMany(c => c.Orders)
            .HasForeignKey(o => o.CustomerId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(o => o.Items)
            .WithOne(i => i.Order)
            .HasForeignKey(i => i.OrderId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(o => o.DesignRequests)
            .WithOne(dr => dr.Order)
            .HasForeignKey(dr => dr.OrderId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(o => o.Shipment)
            .WithOne(s => s.Order)
            .HasForeignKey<Shipment>(s => s.OrderId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Ignore(o => o.DomainEvents);
    }
}
