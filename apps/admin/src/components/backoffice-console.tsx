"use client";

import type {
  AdminCatalogOptions,
  AdminCategorySummary,
  AdminCustomerSummary,
  AdminDashboard,
  AdminInventoryItem,
  AdminOperationsOverview,
  AdminOrderDetail,
  AdminOrderSummary,
  AdminProductSummary,
  AdminSellerApplicationSummary,
  AdminSellerSummary,
  PromotionSummary,
} from "@velora/contracts";
import { Badge, Panel, StatTile } from "@velora/ui";

import { SectionShell } from "./admin-primitives";
import { CategoryManager } from "./category-manager";
import { CustomerLookup } from "./customer-lookup";
import { InventoryManager } from "./inventory-manager";
import { OperationsConsole } from "./operations-console";
import { OrderManager } from "./order-manager";
import { ProductManager } from "./product-manager";
import { PromotionConsole } from "./promotion-console";
import { SellerManager } from "./seller-manager";
import { SellerApplicationManager } from "./seller-application-manager";

export function BackofficeConsole({
  dashboard,
  catalogOptions,
  categories,
  products,
  inventory,
  orders,
  orderDetail,
  customers,
  sellerApplications,
  sellers,
  operations,
  promotions,
}: {
  dashboard: AdminDashboard;
  catalogOptions: AdminCatalogOptions;
  categories: AdminCategorySummary[];
  products: AdminProductSummary[];
  inventory: AdminInventoryItem[];
  orders: AdminOrderSummary[];
  orderDetail: AdminOrderDetail | null;
  customers: AdminCustomerSummary[];
  sellerApplications: AdminSellerApplicationSummary[];
  sellers: AdminSellerSummary[];
  operations: AdminOperationsOverview;
  promotions: PromotionSummary[];
}) {
  const quickLinks = [
    ["categories", "Categories"],
    ["products", "Products"],
    ["inventory", "Inventory"],
    ["orders", "Orders"],
    ["customers", "Customers"],
    ["seller-applications", "Onboarding"],
    ["sellers", "Sellers"],
    ["operations", "Operations"],
    ["promotions", "Promotions"],
  ];

  return (
    <div className="space-y-10">
      <section className="grid gap-5 md:grid-cols-3 xl:grid-cols-6">
        <StatTile
          detail="Taxonomy and navigation nodes currently managed in the source-of-truth catalog."
          label="Categories"
          value={String(dashboard.metrics.categories)}
        />
        <StatTile
          detail="Canonical product records across all statuses."
          label="Products"
          value={String(dashboard.metrics.products)}
        />
        <StatTile
          detail="Listings currently exposed to live storefront supply."
          label="Active offers"
          value={String(dashboard.metrics.activeListings)}
        />
        <StatTile
          detail="Orders still requiring fulfilment or settlement attention."
          label="Pending orders"
          value={String(dashboard.metrics.pendingOrders)}
        />
        <StatTile
          detail="Customer accounts available for support and lookup workflows."
          label="Customers"
          value={String(dashboard.metrics.customers)}
        />
        <StatTile
          detail="Promotions currently enabled in the pricing engine."
          label="Active promos"
          value={String(dashboard.metrics.activePromotions)}
        />
      </section>

      <Panel className="space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <Badge>Control plane</Badge>
            <div>
              <h2 className="font-[var(--font-heading)] text-3xl font-semibold tracking-tight">
                Administrative workflows are wired end to end across catalog,
                operations, customer support, and marketplace supply.
              </h2>
              <p className="mt-3 max-w-4xl text-sm leading-7 text-[var(--muted)]">
                Every action writes through the transactional API, records audit
                context, and refreshes the search projection or inventory
                visibility path it affects.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {quickLinks.map(([target, label]) => (
              <a
                className="rounded-full border border-[var(--stroke)] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--foreground)] transition-colors hover:border-[var(--accent)]"
                href={`#${target}`}
                key={target}
              >
                {label}
              </a>
            ))}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {dashboard.notes.map((note) => (
            <div
              className="rounded-[24px] border border-[var(--stroke)] bg-[rgba(255,255,255,0.86)] px-5 py-4 text-sm leading-7 text-[var(--muted)]"
              key={note}
            >
              {note}
            </div>
          ))}
        </div>
      </Panel>

      <CategoryManager initialCategories={categories} />
      <ProductManager initialProducts={products} options={catalogOptions} />
      <InventoryManager initialInventory={inventory} />
      <OrderManager initialOrderDetail={orderDetail} initialOrders={orders} />
      <CustomerLookup initialCustomers={customers} />
      <SellerApplicationManager initialApplications={sellerApplications} />
      <SellerManager initialSellers={sellers} />
      <OperationsConsole initialOperations={operations} />

      <SectionShell
        description="Promotion rules and coupons write directly into the same pricing engine used by cart repricing, checkout snapshots, and order discount lineage."
        eyebrow="Pricing controls"
        id="promotions"
        title="Promotion management"
      >
        <PromotionConsole initialPromotions={promotions} />
      </SectionShell>
    </div>
  );
}
