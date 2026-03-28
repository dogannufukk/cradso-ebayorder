using EbayDesign.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace EbayDesign.Infrastructure.Persistence.Configurations;

public class ShipmentConfiguration : IEntityTypeConfiguration<Shipment>
{
    public void Configure(EntityTypeBuilder<Shipment> builder)
    {
        builder.HasKey(s => s.Id);
        builder.Property(s => s.Id).HasDefaultValueSql("NEWSEQUENTIALID()");

        builder.Property(s => s.TrackingNumber).HasMaxLength(100).IsRequired();
        builder.Property(s => s.Carrier).HasMaxLength(50).IsRequired().HasDefaultValue("RoyalMail");
        builder.Property(s => s.DeliveryType).IsRequired();
        builder.Property(s => s.ShipmentDate).IsRequired();

        builder.HasIndex(s => s.OrderId);
        builder.Ignore(s => s.DomainEvents);
    }
}
