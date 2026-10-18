namespace BusinessMarketplace.Api.Models;

/// <summary>
/// Direction for <see cref="ListingSortField"/>. <see cref="Desc"/> is the
/// default because an omitted direction is newest-first.
/// </summary>
public enum ListingSortDirection
{
    Asc,
    Desc,
}
