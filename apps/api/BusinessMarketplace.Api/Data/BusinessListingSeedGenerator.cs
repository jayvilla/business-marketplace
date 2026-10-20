using BusinessMarketplace.Api.Models;

namespace BusinessMarketplace.Api.Data;

/// <summary>
/// Builds 500 fictional listings for the development seed.
///
/// The same inputs always produce the same rows. Nothing in this class
/// calls <see cref="Guid.NewGuid"/>, <see cref="Random.Shared"/>, or
/// <see cref="DateTimeOffset.UtcNow"/>. Those would change every run, and
/// a second seed could not tell a new listing from one already stored.
///
/// <see cref="System.Random"/> with <see cref="RandomSeed"/> is the seeded
/// generator. It is the C# equivalent of <c>faker.seed(3102026)</c> or
/// <c>seedrandom</c> in a TypeScript script. <c>Math.random()</c> and
/// <c>crypto.randomUUID()</c> are not seeded, so they cannot do this job.
/// The .NET algorithm for <see cref="System.Random"/> is stable for a given
/// runtime. The seed number is what a later reader changes on purpose.
///
/// Status counts are assigned exactly, then shuffled. Drawing a status at
/// random for each row would not guarantee 425 Active listings.
/// The shuffle is Fisher-Yates: walk from the end, swap with an earlier
/// index chosen by the seeded generator. Without that shuffle the table
/// would be 425 Active rows, then 35 Pending, then 25 Sold, then 15 Draft.
///
/// Money stays in <see cref="decimal"/>. A <c>double</c> cannot store 0.10
/// exactly, and a Prisma <c>Decimal</c> or a TypeORM <c>numeric</c> column
/// is the same choice. Asking price, revenue, and cash flow are separate
/// figures. Revenue is derived from the asking price by a category multiple,
/// and cash flow is a margin of that revenue, then either figure may be
/// withheld. Withholding is how the Angular card's null fallback is exercised.
///
/// <see cref="ImageUrl"/> is always null. The Angular client already
/// substitutes a local SVG when the URL is null, and the sample catalog's
/// <c>images.example</c> host is a documentation name that does not resolve.
/// Inventing a URL on a public image host would be a broken photo, and
/// committing 500 image files is not useful. The card's placeholder is the
/// reliable source.
///
/// Identifiers use the prefix <c>01910000-0000-7000-8000</c>. The 11 sample
/// listings use <c>01900000-0000-7000-8000</c>, so the two sets do not
/// collide and a reset can delete one set without touching the other.
/// Sequence 1 is <c>...0001</c> and sequence 500 is <c>...01f4</c>.
///
/// Dates are offsets from <see cref="ReferenceDate"/>, not from the clock.
/// The window is 730 days, this generator's definition of 24 months.
/// To move the window, change <see cref="ReferenceDate"/> and run
/// <c>--seed --reset-generated</c>. A plain <c>--seed</c> will not rewrite
/// rows that already exist.
///
/// To change how many listings are generated, change <see cref="Count"/> and
/// the four status quotas so they still add up to <see cref="Count"/>.
/// <see cref="Create"/> throws when they do not. The unit test locks the
/// current quotas at 500, 425, 35, 25, and 15.
/// </summary>
internal static class BusinessListingSeedGenerator
{
    internal const int Count = 500;

    internal const int ActiveCount = 425;

    internal const int PendingCount = 35;

    internal const int SoldCount = 25;

    internal const int DraftCount = 15;

    /// <summary>
    /// Seed for <see cref="System.Random"/>. Changing it reshuffles statuses.
    /// </summary>
    internal const int RandomSeed = 3_102_026;

    /// <summary>
    /// The clock the generator pretends is "now". Listings are created in
    /// the 730 days before this instant, and none are updated after it.
    /// </summary>
    internal static readonly DateTimeOffset ReferenceDate = new(2026, 10, 1, 0, 0, 0, TimeSpan.Zero);

    internal const decimal MinimumAskingPrice = 50_000m;

    internal const decimal MaximumAskingPrice = 10_000_000m;

    internal const decimal RepeatedMidPrice = 450_000m;

    internal const decimal RepeatedLowPrice = 75_000m;

    internal const decimal RepeatedHighPrice = 2_500_000m;

    private const int HistoryDays = 730;

    private static readonly BusinessCategory[] Categories =
    [
        BusinessCategory.Restaurant,
        BusinessCategory.Retail,
        BusinessCategory.Technology,
        BusinessCategory.Healthcare,
        BusinessCategory.Manufacturing,
        BusinessCategory.ProfessionalServices,
        BusinessCategory.Other,
    ];

    /// <summary>
    /// City and state pairs. The state is the two-letter code the sample
    /// catalog already uses, so a card reads "Bend, OR". The 15 states
    /// required for this phase are all present, with a large market and a
    /// smaller one in each.
    /// </summary>
    internal static readonly IReadOnlyList<SeedLocation> Locations =
    [
        new("Los Angeles", "CA"),
        new("Fresno", "CA"),
        new("Sacramento", "CA"),
        new("Houston", "TX"),
        new("Austin", "TX"),
        new("El Paso", "TX"),
        new("Miami", "FL"),
        new("Tampa", "FL"),
        new("Gainesville", "FL"),
        new("New York", "NY"),
        new("Buffalo", "NY"),
        new("Albany", "NY"),
        new("Seattle", "WA"),
        new("Spokane", "WA"),
        new("Tacoma", "WA"),
        new("Phoenix", "AZ"),
        new("Tucson", "AZ"),
        new("Flagstaff", "AZ"),
        new("Denver", "CO"),
        new("Colorado Springs", "CO"),
        new("Fort Collins", "CO"),
        new("Las Vegas", "NV"),
        new("Reno", "NV"),
        new("Portland", "OR"),
        new("Bend", "OR"),
        new("Eugene", "OR"),
        new("Atlanta", "GA"),
        new("Savannah", "GA"),
        new("Charlotte", "NC"),
        new("Asheville", "NC"),
        new("Raleigh", "NC"),
        new("Chicago", "IL"),
        new("Peoria", "IL"),
        new("Boston", "MA"),
        new("Worcester", "MA"),
        new("Nashville", "TN"),
        new("Chattanooga", "TN"),
        new("Memphis", "TN"),
        new("Philadelphia", "PA"),
        new("Pittsburgh", "PA"),
        new("Lancaster", "PA"),
    ];

    private static readonly string[] Stems =
    [
        "Harbor", "Cedar", "Mesa", "Northline", "King Street", "Lakeshore",
        "Elm", "Highline", "Cascade", "Beacon", "Gulf", "Sonoran",
        "Redwood", "Ironwood", "Bluefin", "Lantern", "Cobalt", "Fieldstone",
        "Marigold", "Pinetop", "Silverline", "Westwind", "Brightpath", "Copperline",
        "Fairhaven", "Stonebridge", "Willow", "Summit", "Riverbend", "Oakmont",
    ];

    private static readonly IReadOnlyDictionary<BusinessCategory, string[]> Kinds =
        new Dictionary<BusinessCategory, string[]>
        {
            [BusinessCategory.Restaurant] =
            [
                "Coffee Shop", "Bakery", "Casual Dining", "Catering Business",
                "Pizzeria", "Breakfast Cafe", "Neighborhood Bistro", "Dessert Shop",
            ],
            [BusinessCategory.Retail] =
            [
                "Boutique", "Specialty Store", "Convenience Store", "Outdoor Shop",
                "Home Store", "Gift Shop", "Pet Supply Store", "Corner Market",
            ],
            [BusinessCategory.Technology] =
            [
                "SaaS Platform", "IT Services", "Software Consultancy", "Managed Hosting",
                "App Studio", "Data Practice", "Integration Shop", "Product Studio",
            ],
            [BusinessCategory.Healthcare] =
            [
                "Medical Billing", "Home Care Services", "Healthcare Staffing", "Dental Practice",
                "Physical Therapy", "Urgent Care Clinic", "Pharmacy", "Pediatric Practice",
            ],
            [BusinessCategory.Manufacturing] =
            [
                "Specialty Fabrication", "Packaging", "Equipment Manufacturing", "Machine Shop",
                "Metal Works", "Print Shop", "Food Production", "Component Plant",
            ],
            [BusinessCategory.ProfessionalServices] =
            [
                "Accounting Firm", "Marketing Agency", "Consulting Business", "Law Practice",
                "Design Studio", "Staffing Agency", "Bookkeeping Firm", "Advisory Practice",
            ],
            [BusinessCategory.Other] =
            [
                "Landscaping", "Cleaning Services", "Automotive Services", "Car Wash",
                "Self Storage", "Fitness Studio", "Daycare", "Laundry Service",
            ],
        };

    internal static Guid IdForIndex(int index)
    {
        var sequence = index + 1;
        return Guid.Parse($"01910000-0000-7000-8000-{sequence:x12}");
    }

    internal static IReadOnlyList<BusinessListing> Create()
    {
        var statuses = ShuffledStatuses();
        var listings = new BusinessListing[Count];

        for (var index = 0; index < Count; index++)
        {
            var category = Categories[index % Categories.Length];
            var location = Locations[index % Locations.Count];
            var localIndex = index / Categories.Length;
            var title = TitleFor(category, localIndex);
            var (createdAt, updatedAt) = Timestamps(index);
            var askingPrice = AskingPriceFor(index, category);
            var (revenue, cashFlow) = Financials(index, category, askingPrice);

            listings[index] = new BusinessListing
            {
                Id = IdForIndex(index),
                Title = title,
                Description = DescriptionFor(category, title, location, index),
                AskingPrice = askingPrice,
                AnnualRevenue = revenue,
                CashFlow = cashFlow,
                City = location.City,
                State = location.State,
                Category = category,
                Status = statuses[index],
                ImageUrl = null,
                CreatedAt = createdAt,
                UpdatedAt = updatedAt,
            };
        }

        return listings;
    }

    private static ListingStatus[] ShuffledStatuses()
    {
        var quota = ActiveCount + PendingCount + SoldCount + DraftCount;
        if (quota != Count)
        {
            throw new InvalidOperationException(
                "Listing status quotas must add up to BusinessListingSeedGenerator.Count.");
        }

        var statuses = new ListingStatus[Count];
        var cursor = 0;
        Fill(statuses, ref cursor, ListingStatus.Active, ActiveCount);
        Fill(statuses, ref cursor, ListingStatus.Pending, PendingCount);
        Fill(statuses, ref cursor, ListingStatus.Sold, SoldCount);
        Fill(statuses, ref cursor, ListingStatus.Draft, DraftCount);

        var random = new Random(RandomSeed);
        for (var index = statuses.Length - 1; index > 0; index--)
        {
            var swap = random.Next(index + 1);
            (statuses[index], statuses[swap]) = (statuses[swap], statuses[index]);
        }

        return statuses;
    }

    private static void Fill(ListingStatus[] statuses, ref int cursor, ListingStatus status, int count)
    {
        for (var index = 0; index < count; index++)
        {
            statuses[cursor++] = status;
        }
    }

    private static string TitleFor(BusinessCategory category, int localIndex)
    {
        // Stem period 30 and kind period 8. Their least common multiple is
        // 120, and each category only has about 72 rows, so a pair does not
        // repeat. Using the same index for both would step them together and
        // only a few kinds would ever appear.
        var kinds = Kinds[category];
        var stem = Stems[localIndex % Stems.Length];
        var kind = kinds[localIndex % kinds.Length];
        return $"{stem} {kind}";
    }

    private static string DescriptionFor(
        BusinessCategory category,
        string title,
        SeedLocation location,
        int index)
    {
        var years = 3 + (index % 26);
        var staff = 2 + (index % 48);
        var place = $"{location.City}, {location.State}";
        var opener = category switch
        {
            BusinessCategory.Restaurant =>
                $"{title} is a fictional restaurant business in {place}. It has operated for {years} years with about {staff} people on the payroll.",
            BusinessCategory.Retail =>
                $"{title} is a fictional retail shop in {place}, open for {years} years and staffed by about {staff} people.",
            BusinessCategory.Technology =>
                $"{title} is a fictional technology firm in {place}. A team of about {staff} has sold the product for {years} years.",
            BusinessCategory.Healthcare =>
                $"{title} is a fictional healthcare business in {place}, established {years} years ago, with about {staff} staff.",
            BusinessCategory.Manufacturing =>
                $"{title} is a fictional manufacturing operation in {place}. The plant has run for {years} years with about {staff} employees.",
            BusinessCategory.ProfessionalServices =>
                $"{title} is a fictional professional practice in {place}. It has served local clients for {years} years with a staff of about {staff}.",
            _ =>
                $"{title} is a fictional local service business in {place}, operating for {years} years with about {staff} people.",
        };

        var closing = (index % 3) switch
        {
            0 => "The building is leased, and the sale covers the business, not the real estate.",
            1 => "A transferable lease has several years remaining.",
            _ => "The owner is retiring and the current staff plans to stay.",
        };

        return $"{opener} {closing}";
    }

    private static decimal AskingPriceFor(int index, BusinessCategory category)
    {
        var band = AskingBand(category);

        // Shared prices give the sort tests a tie to break. The id is the
        // tie-breaker in ActiveListingQuery, so two rows at $450,000 must
        // come back in id order. The low and high repeats are the same idea
        // at the other ends of the market.
        if (index % 17 == 0)
        {
            return RepeatedMidPrice;
        }

        if (index % 29 == 0 && band.Minimum <= RepeatedLowPrice)
        {
            return RepeatedLowPrice;
        }

        if (index % 31 == 0)
        {
            return RepeatedHighPrice;
        }

        if (index % 41 == 0 && band.Minimum <= MinimumAskingPrice)
        {
            return MinimumAskingPrice;
        }

        if (index % 43 == 0 && band.Maximum >= MaximumAskingPrice)
        {
            return MaximumAskingPrice;
        }

        var slot = index / Categories.Length;
        var slots = (Count + Categories.Length - 1) / Categories.Length;
        var price = band.Minimum + ((band.Maximum - band.Minimum) * slot) / (slots - 1);
        var rounded = decimal.Round(price, 0, MidpointRounding.AwayFromZero);
        if (rounded < MinimumAskingPrice)
        {
            return MinimumAskingPrice;
        }

        if (rounded > MaximumAskingPrice)
        {
            return MaximumAskingPrice;
        }

        return rounded;
    }

    private static PriceBand AskingBand(BusinessCategory category)
    {
        return category switch
        {
            BusinessCategory.Restaurant => new PriceBand(80_000m, 2_500_000m),
            BusinessCategory.Retail => new PriceBand(50_000m, 1_800_000m),
            BusinessCategory.Technology => new PriceBand(250_000m, 8_000_000m),
            BusinessCategory.Healthcare => new PriceBand(200_000m, 4_000_000m),
            BusinessCategory.Manufacturing => new PriceBand(400_000m, 10_000_000m),
            BusinessCategory.ProfessionalServices => new PriceBand(150_000m, 3_500_000m),
            _ => new PriceBand(50_000m, 1_200_000m),
        };
    }

    private static (decimal? Revenue, decimal? CashFlow) Financials(
        int index,
        BusinessCategory category,
        decimal askingPrice)
    {
        var revenue = decimal.Round(
            askingPrice * RevenueMultiple(category, index),
            2,
            MidpointRounding.AwayFromZero);
        var cashFlow = decimal.Round(
            revenue * CashMargin(category, index),
            2,
            MidpointRounding.AwayFromZero);

        // Every 11th listing withholds revenue. Every 13th withholds cash
        // flow. Index 0 withholds both. Null means "not disclosed", which
        // is the domain rule, not zero.
        decimal? storedRevenue = index % 11 == 0 ? null : revenue;
        decimal? storedCashFlow = index % 13 == 0 ? null : cashFlow;
        return (storedRevenue, storedCashFlow);
    }

    private static decimal RevenueMultiple(BusinessCategory category, int index)
    {
        var step = index % 5;
        return category switch
        {
            BusinessCategory.Restaurant => 1.40m + (step * 0.15m),
            BusinessCategory.Retail => 1.10m + (step * 0.20m),
            BusinessCategory.Technology => 0.35m + (step * 0.15m),
            BusinessCategory.Healthcare => 0.80m + (step * 0.20m),
            BusinessCategory.Manufacturing => 0.90m + (step * 0.25m),
            BusinessCategory.ProfessionalServices => 0.70m + (step * 0.20m),
            _ => 1.00m + (step * 0.25m),
        };
    }

    private static decimal CashMargin(BusinessCategory category, int index)
    {
        var step = index % 4;
        return category switch
        {
            BusinessCategory.Restaurant => 0.08m + (step * 0.02m),
            BusinessCategory.Retail => 0.10m + (step * 0.02m),
            BusinessCategory.Technology => 0.18m + (step * 0.03m),
            BusinessCategory.Healthcare => 0.12m + (step * 0.03m),
            BusinessCategory.Manufacturing => 0.09m + (step * 0.02m),
            BusinessCategory.ProfessionalServices => 0.20m + (step * 0.04m),
            _ => 0.12m + (step * 0.03m),
        };
    }

    private static (DateTimeOffset CreatedAt, DateTimeOffset UpdatedAt) Timestamps(int index)
    {
        var ageDays = index % HistoryDays;
        var createdAt = ReferenceDate.AddDays(-ageDays).AddHours(-(1 + (index % 12)));
        var spanHours = (int)(ReferenceDate - createdAt).TotalHours;
        var addHours = spanHours == 0 ? 0 : (index * 13) % (spanHours + 1);
        return (createdAt, createdAt.AddHours(addHours));
    }

    private readonly record struct PriceBand(decimal Minimum, decimal Maximum);
}

/// <summary>
/// One city the generator is willing to use. The pair is the constraint:
/// Fresno is only stored with CA.
/// </summary>
internal readonly record struct SeedLocation(string City, string State);
