using BusinessMarketplace.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace BusinessMarketplace.Api.Data;

/// <summary>
/// The EF Core session for one operation.
///
/// A DbContext is the unit of work and the change tracker. DbSet is one
/// table (or query root), the way a Prisma model delegate is prisma.listing.
/// LINQ written against BusinessListings is not executed here. It becomes an
/// expression tree, and the PostgreSQL provider turns that tree into SQL
/// when the query is awaited.
///
/// AddDbContext registers this type as scoped: one instance per HTTP request,
/// disposed at the end of the request. A context is not thread-safe. Two
/// queries on the same instance must not run at the same time. A singleton
/// service must not take a context in its constructor, or that one instance
/// would be shared by every request.
/// </summary>
public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    /// <summary>
    /// Listings table. Set&lt;T&gt;() avoids an uninitialized non-nullable
    /// property. EF still discovers the set from this member.
    /// </summary>
    public DbSet<BusinessListing> BusinessListings => Set<BusinessListing>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Each IEntityTypeConfiguration in this assembly is applied.
        // The listing rules live in BusinessListingConfiguration, not here,
        // so this class stays the session and not the schema document.
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
    }
}
