import { CatalogBrowser } from "../../components/catalog-browser";
import { StorefrontChrome } from "../../components/storefront-chrome";
import { searchCatalog } from "../../lib/storefront-api";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function SearchPage({
  searchParams
}: {
  searchParams: Promise<SearchParams>;
}): Promise<React.JSX.Element> {
  const resolvedSearchParams = await searchParams;
  const results = await searchCatalog(resolvedSearchParams);

  return (
    <StorefrontChrome>
      <CatalogBrowser
        action="/search"
        description="Search runs through the dedicated product projection so browsing stays separate from the transactional store of record."
        eyebrow="Search results"
        results={results}
        searchParams={resolvedSearchParams}
        title="Search the Velora catalog"
      />
    </StorefrontChrome>
  );
}
