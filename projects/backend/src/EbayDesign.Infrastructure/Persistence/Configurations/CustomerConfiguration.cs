using EbayDesign.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace EbayDesign.Infrastructure.Persistence.Configurations;

public class CustomerConfiguration : IEntityTypeConfiguration<Customer>
{
    public void Configure(EntityTypeBuilder<Customer> builder)
    {
        builder.HasKey(c => c.Id);
        builder.Property(c => c.Id).HasDefaultValueSql("NEWSEQUENTIALID()");

        builder.Property(c => c.CustomerName).HasMaxLength(200);
        builder.Property(c => c.EbayUsername).HasMaxLength(200);
        builder.Property(c => c.Email).HasMaxLength(200).IsRequired();
        builder.Property(c => c.Phone).HasMaxLength(20);
        builder.Property(c => c.AddressLine1).HasMaxLength(300);
        builder.Property(c => c.AddressLine2).HasMaxLength(300);
        builder.Property(c => c.City).HasMaxLength(100);
        builder.Property(c => c.County).HasMaxLength(100);
        builder.Property(c => c.PostCode).HasMaxLength(10);
        builder.Property(c => c.Country).HasMaxLength(100).HasDefaultValue("United Kingdom");

        builder.HasIndex(c => c.Email);

        builder.Ignore(c => c.DomainEvents);
    }
}
