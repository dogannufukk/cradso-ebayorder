using EbayDesign.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace EbayDesign.Infrastructure.Persistence.Configurations;

public class OrderItemConfiguration : IEntityTypeConfiguration<OrderItem>
{
    public void Configure(EntityTypeBuilder<OrderItem> builder)
    {
        builder.HasKey(i => i.Id);
        builder.Property(i => i.Id).HasDefaultValueSql("NEWSEQUENTIALID()");

        builder.Property(i => i.SKU).HasMaxLength(100).IsRequired();
        builder.Property(i => i.EbayProductCode).HasMaxLength(200);
        builder.Property(i => i.Quantity).IsRequired().HasDefaultValue(1);
        builder.Property(i => i.Description).HasMaxLength(500);

        builder.HasIndex(i => i.OrderId);
        builder.Ignore(i => i.DomainEvents);
    }
}
