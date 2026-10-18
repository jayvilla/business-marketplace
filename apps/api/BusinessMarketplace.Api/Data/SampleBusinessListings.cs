using BusinessMarketplace.Api.Models;

namespace BusinessMarketplace.Api.Data;

/// <summary>
/// Fictional listings inserted by the development seed command. Names,
/// places, and figures are invented.
///
/// The API does not read this array at request time. PostgreSQL does.
/// The array is the source the seeder copies, once, into rows whose ids
/// match these values.
///
/// Ids and timestamps are fixed so a test can ask for the same listing
/// twice and get the same identity. The type does not call Guid.NewGuid
/// or DateTimeOffset.UtcNow.
/// </summary>
internal static class SampleBusinessListings
{
    internal static IReadOnlyList<BusinessListing> All { get; } = Create();

    private static BusinessListing[] Create()
    {
        return
        [
            CreateListing(
                "01900000-0000-7000-8000-000000000001",
                "Elm Street Bistro",
                "A 42-seat dinner restaurant on a streetcar corner, with a short wine list and a leased dining room.",
                875_000m,
                1_240_000m,
                186_000m,
                "Portland",
                "OR",
                BusinessCategory.Restaurant,
                ListingStatus.Active,
                "https://images.example/elm-street-bistro.jpg",
                At(2025, 3, 12),
                At(2026, 1, 8)),
            CreateListing(
                "01900000-0000-7000-8000-000000000002",
                "Highline Outfitters",
                "A single-location outdoor shop selling packs, boots, and seasonal outerwear to local residents and visitors.",
                320_000m,
                540_000m,
                72_000m,
                "Bozeman",
                "MT",
                BusinessCategory.Retail,
                ListingStatus.Active,
                "https://images.example/highline-outfitters.jpg",
                At(2025, 5, 2),
                At(2026, 2, 14)),
            CreateListing(
                "01900000-0000-7000-8000-000000000003",
                "Northline Software",
                "A ten-person product studio building scheduling software for independent clinics, with recurring licenses.",
                2_400_000m,
                3_100_000m,
                640_000m,
                "Austin",
                "TX",
                BusinessCategory.Technology,
                ListingStatus.Active,
                "https://images.example/northline-software.jpg",
                At(2024, 11, 19),
                At(2026, 3, 1)),
            CreateListing(
                "01900000-0000-7000-8000-000000000004",
                "Mesa Pediatrics",
                "A two-physician pediatric practice with an established patient panel. Cash flow was not disclosed.",
                1_150_000m,
                980_000m,
                null,
                "Tucson",
                "AZ",
                BusinessCategory.Healthcare,
                ListingStatus.Active,
                "https://images.example/mesa-pediatrics.jpg",
                At(2025, 6, 20),
                At(2026, 4, 3)),
            CreateListing(
                "01900000-0000-7000-8000-000000000005",
                "Lakeshore Precision",
                "A small machine shop producing custom brackets and housings for regional equipment makers.",
                4_750_000m,
                8_200_000m,
                910_000m,
                "Milwaukee",
                "WI",
                BusinessCategory.Manufacturing,
                ListingStatus.Active,
                "https://images.example/lakeshore-precision.jpg",
                At(2024, 8, 9),
                At(2026, 1, 22)),
            CreateListing(
                "01900000-0000-7000-8000-000000000006",
                "Northbridge Accounting",
                "A bookkeeping and tax firm serving owner-operated shops, with staff who stay through tax season.",
                690_000m,
                1_050_000m,
                245_000m,
                "Chicago",
                "IL",
                BusinessCategory.ProfessionalServices,
                ListingStatus.Active,
                "https://images.example/northbridge-accounting.jpg",
                At(2025, 1, 15),
                At(2026, 2, 28)),
            CreateListing(
                "01900000-0000-7000-8000-000000000007",
                "Gulf Breeze Car Wash",
                "An express tunnel wash with monthly memberships. Annual revenue was not disclosed.",
                1_800_000m,
                null,
                310_000m,
                "Tampa",
                "FL",
                BusinessCategory.Other,
                ListingStatus.Active,
                "https://images.example/gulf-breeze-car-wash.jpg",
                At(2025, 7, 4),
                At(2026, 5, 11)),
            CreateListing(
                "01900000-0000-7000-8000-000000000008",
                "King Street Bakery",
                "A retail bakery with morning counter service and standing wholesale orders from two cafes.",
                540_000m,
                720_000m,
                98_000m,
                "Charleston",
                "SC",
                BusinessCategory.Restaurant,
                ListingStatus.Active,
                "https://images.example/king-street-bakery.jpg",
                At(2025, 9, 1),
                At(2026, 6, 2)),
            CreateListing(
                "01900000-0000-7000-8000-000000000009",
                "Cascade Analytics",
                "A draft listing for a three-person analytics consultancy. The seller has not published it.",
                1_200_000m,
                800_000m,
                150_000m,
                "Denver",
                "CO",
                BusinessCategory.Technology,
                ListingStatus.Draft,
                null,
                At(2026, 7, 18),
                At(2026, 8, 1)),
            CreateListing(
                "01900000-0000-7000-8000-00000000000a",
                "Sonoran Home Goods",
                "A home-goods shop under an accepted offer. The sale has not closed.",
                410_000m,
                600_000m,
                80_000m,
                "Phoenix",
                "AZ",
                BusinessCategory.Retail,
                ListingStatus.Pending,
                "https://images.example/sonoran-home-goods.jpg",
                At(2025, 10, 9),
                At(2026, 8, 20)),
            CreateListing(
                "01900000-0000-7000-8000-00000000000b",
                "Beacon Dental",
                "A single-dentist practice whose sale has already closed.",
                1_350_000m,
                1_600_000m,
                390_000m,
                "Boston",
                "MA",
                BusinessCategory.Healthcare,
                ListingStatus.Sold,
                "https://images.example/beacon-dental.jpg",
                At(2024, 4, 2),
                At(2025, 12, 16)),
        ];
    }

    private static DateTimeOffset At(int year, int month, int day)
    {
        return new DateTimeOffset(year, month, day, 15, 0, 0, TimeSpan.Zero);
    }

    private static BusinessListing CreateListing(
        string id,
        string title,
        string description,
        decimal askingPrice,
        decimal? annualRevenue,
        decimal? cashFlow,
        string city,
        string state,
        BusinessCategory category,
        ListingStatus status,
        string? imageUrl,
        DateTimeOffset createdAt,
        DateTimeOffset updatedAt)
    {
        return new BusinessListing
        {
            Id = Guid.Parse(id),
            Title = title,
            Description = description,
            AskingPrice = askingPrice,
            AnnualRevenue = annualRevenue,
            CashFlow = cashFlow,
            City = city,
            State = state,
            Category = category,
            Status = status,
            ImageUrl = imageUrl,
            CreatedAt = createdAt,
            UpdatedAt = updatedAt,
        };
    }
}
