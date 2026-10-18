namespace BusinessMarketplace.Api.Models;

/// <summary>
/// What kind of business is for sale.
///
/// Each member has an explicit integer, starting at 1. Those numbers are
/// the stable identity of the member. A later category is appended with the
/// next integer. Inserting a name in the middle must not renumber the rest,
/// because a stored or documented value would silently change meaning.
///
/// Zero is unused. The default of an enum is 0, so an unset
/// BusinessCategory is not Restaurant. Enum.IsDefined is false for 0.
///
/// These identifiers are not the Angular card's display labels. That UI
/// uses strings such as "Coffee shops" and "Professional services". The API
/// value is ProfessionalServices. A client maps the identifier to a label.
/// JSON writes the identifier as a string; that converter sits on the DTOs,
/// which are the HTTP boundary. This enum has no serialization attribute
/// and no EF Core attribute.
/// </summary>
public enum BusinessCategory
{
    Restaurant = 1,
    Retail = 2,
    Technology = 3,
    Healthcare = 4,
    Manufacturing = 5,
    ProfessionalServices = 6,
    Other = 7,
}
