namespace BusinessMarketplace.Api.Tests.Integration;

/// <summary>
/// One PostgreSQL container for every test in this collection.
///
/// xUnit runs tests in different classes in parallel, the way Jest workers
/// do. Tests that share a database cannot do that: one test's TRUNCATE
/// would delete rows another test is reading. A collection runs its tests
/// one at a time. The fixture is constructed once, which is
/// <c>beforeAll</c> for the collection, and disposed after the last test.
/// </summary>
[CollectionDefinition(Name)]
public sealed class PostgresCollection : ICollectionFixture<PostgresFixture>
{
    public const string Name = "PostgreSQL";
}
