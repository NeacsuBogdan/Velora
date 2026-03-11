import { CatalogBrowser } from "../../components/catalog-browser";
import { StorefrontChrome } from "../../components/storefront-chrome";
import { searchCatalog } from "../../lib/storefront-api";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function ProductsPage({
  searchParams
}: {
  searchParams: Promise<SearchParams>;
}): Promise<React.JSX.Element> {
  const resolvedSearchParams = await searchParams;
  const results = await searchCatalog(resolvedSearchParams);

  return (
    <StorefrontChrome>
      <CatalogBrowser
        action="/products"
        description="Browse the full seeded marketplace catalog with category, brand, price, and availability filters."
        eyebrow="All products"
        results={results}
        searchParams={resolvedSearchParams}
        title="Marketplace catalog"
      />
    </StorefrontChrome>
  );
}
