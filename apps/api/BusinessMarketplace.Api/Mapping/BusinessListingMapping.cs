using BusinessMarketplace.Api.Dtos;
using BusinessMarketplace.Api.Models;

namespace BusinessMarketplace.Api.Mapping;

/// <summary>
/// Copies a <see cref="BusinessListing"/> into the two response shapes.
///
/// An extension method is a static method whose first parameter is marked
/// <c>this</c>. The call site reads <c>listing.ToDto()</c>. The compiler
/// rewrites that to <c>BusinessListingMapping.ToDto(listing)</c>. The
/// method is visible only in files that import this namespace, so it is
/// closer to an imported function than to a method declared on the class.
/// The entity therefore does not reference the DTOs.
///
/// The body is an object initializer: <c>Property = value</c> inside the
/// braces, instead of assigning each property on a later line. <c>required</c>
/// members on the DTO make a forgotten field a compile error. That is the
/// practical advantage of writing the copy out by hand in an application
/// this size. A mapping library moves the same assignments into configuration
/// that fails when a request hits the missing member, or into a profile
/// test that re-implements this method. Two short methods do not need that.
///
/// Strings are immutable, and the other fields are structs, so the DTO
/// holds its own values. Changing the entity after this returns does not
/// change the DTO. A future collection property would not have that
/// protection unless this method copied the collection too.
/// </summary>
public static class BusinessListingMapping
{
    public static BusinessListingDto ToDto(this BusinessListing listing)
    {
        ArgumentNullException.ThrowIfNull(listing);

        return new BusinessListingDto
        {
            Id = listing.Id,
            Title = listing.Title,
            Description = listing.Description,
            AskingPrice = listing.AskingPrice,
            AnnualRevenue = listing.AnnualRevenue,
            CashFlow = listing.CashFlow,
            City = listing.City,
            State = listing.State,
            Category = listing.Category,
            Status = listing.Status,
            ImageUrl = listing.ImageUrl,
            CreatedAt = listing.CreatedAt,
            UpdatedAt = listing.UpdatedAt,
        };
    }

    public static BusinessListingSummaryDto ToSummaryDto(this BusinessListing listing)
    {
        ArgumentNullException.ThrowIfNull(listing);

        return new BusinessListingSummaryDto
        {
            Id = listing.Id,
            Title = listing.Title,
            Description = listing.Description,
            AskingPrice = listing.AskingPrice,
            AnnualRevenue = listing.AnnualRevenue,
            CashFlow = listing.CashFlow,
            City = listing.City,
            State = listing.State,
            Category = listing.Category,
            ImageUrl = listing.ImageUrl,
        };
    }
}
