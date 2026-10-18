using BusinessMarketplace.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BusinessMarketplace.Api.Data.Configurations;

/// <summary>
/// Relational shape of <see cref="BusinessListing"/>. The domain class stays
/// free of EF attributes. This is the Fluent API, closer to a Prisma schema
/// or a TypeORM entity decorator, kept in one class the context discovers.
///
/// Assumptions, and the checks that do not exist yet:
/// Title fits in 200 characters, description in 4000, city and state in 100.
/// State is still free text ("OR" or "Oregon"), not a code list.
/// Money is US dollars and cents: numeric(18, 2). That is a decimal column,
/// not PostgreSQL real or double precision. 18 digits with 2 scale holds
/// values far above a business asking price and still stores 0.10 exactly.
/// ImageUrl, when present, fits in 2048 characters.
/// Category and Status are stored as the enum member names (Restaurant,
/// Active), the same strings the JSON contract already uses. The integer
/// values on the C# enums are not the column type. Renaming a member is a
/// data change and needs a migration. Zero stays unnamed in C# so an unset
/// enum is not written as Restaurant.
/// CreatedAt and UpdatedAt are supplied by the application. The database
/// does not stamp them.
/// The only index besides the primary key is Status, because the public
/// list query filters on Active. City, category, and price are not indexed
/// until a query filters or sorts on them.
/// </summary>
internal sealed class BusinessListingConfiguration : IEntityTypeConfiguration<BusinessListing>
{
    public void Configure(EntityTypeBuilder<BusinessListing> builder)
    {
        builder.HasKey(listing => listing.Id);
        builder.Property(listing => listing.Id).ValueGeneratedNever();

        builder.Property(listing => listing.Title).IsRequired().HasMaxLength(200);
        builder.Property(listing => listing.Description).IsRequired().HasMaxLength(4000);
        builder.Property(listing => listing.City).IsRequired().HasMaxLength(100);
        builder.Property(listing => listing.State).IsRequired().HasMaxLength(100);

        builder.Property(listing => listing.AskingPrice).HasPrecision(18, 2);
        builder.Property(listing => listing.AnnualRevenue).HasPrecision(18, 2);
        builder.Property(listing => listing.CashFlow).HasPrecision(18, 2);

        builder.Property(listing => listing.Category)
            .HasConversion<string>()
            .HasMaxLength(32)
            .IsRequired();

        builder.Property(listing => listing.Status)
            .HasConversion<string>()
            .HasMaxLength(16)
            .IsRequired();

        builder.Property(listing => listing.ImageUrl).HasMaxLength(2048);

        builder.HasIndex(listing => listing.Status);
    }
}
