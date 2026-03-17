"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type {
  AdminCatalogOptions,
  AdminProductSummary,
  UpsertAdminProductRequest
} from "@velora/contracts";
import { upsertAdminProductRequestSchema } from "@velora/contracts";
import { Button } from "@velora/ui";
import { startTransition, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";

import { apiUrl } from "../lib/api-url";
import {
  FieldShell,
  InputClassName,
  ListScrollClassName,
  ListCardButton,
  SectionShell,
  SplitPanel,
  TextAreaClassName
} from "./admin-primitives";
import { StatusPill } from "./status-pill";

function toFormValues(
  product: AdminProductSummary | null,
  options: AdminCatalogOptions
): UpsertAdminProductRequest {
  return {
    listingId: product?.listingId ?? null,
    title: product?.title ?? "",
    slug: product?.slug ?? "",
    description: product?.description ?? "",
    status: product?.status ?? "ACTIVE",
    categoryId: product?.categoryId ?? null,
    brandName: product?.brandName ?? null,
    sellerId: product?.sellerId ?? options.sellers[0]?.sellerId ?? "",
    sellerSku: product?.sellerSku ?? "",
    variantTitle: product?.variantTitle ?? null,
    leadTimeDays: product?.leadTimeDays ?? 2,
    priceAmount: product?.price?.amount ?? 0,
    compareAtAmount: product?.compareAtPrice?.amount ?? null,
    onHand: product?.inventory?.onHand ?? 0,
    safetyStock: product?.inventory?.safetyStock ?? 0,
    imageUrl: product?.image?.url ?? null,
    imageAlt: product?.image?.altText ?? null
  };
}

export function ProductManager({
  initialProducts,
  options
}: {
  initialProducts: AdminProductSummary[];
  options: AdminCatalogOptions;
}) {
  const router = useRouter();
  const [products, setProducts] = useState(initialProducts);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    initialProducts[0]?.productId ?? null
  );
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "DRAFT" | "ACTIVE" | "ARCHIVED">(
    "ALL"
  );
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const selectedProduct =
    products.find((product) => product.productId === selectedProductId) ?? null;
  const form = useForm<UpsertAdminProductRequest>({
    resolver: zodResolver(upsertAdminProductRequestSchema),
    defaultValues: toFormValues(selectedProduct, options)
  });

  useEffect(() => {
    form.reset(toFormValues(selectedProduct, options));
  }, [form, options, selectedProduct]);

  function handleCreateNew() {
    setSelectedProductId(null);
    setErrorMessage(null);
    setStatusMessage(null);
    form.reset(toFormValues(null, options));
  }

  async function refreshProducts(nextQuery = query, nextStatus = statusFilter) {
    const searchParams = new URLSearchParams();

    if (nextQuery.trim()) {
      searchParams.set("q", nextQuery.trim());
    }

    if (nextStatus !== "ALL") {
      searchParams.set("status", nextStatus);
    }

    const response = await fetch(`${apiUrl}/admin/products?${searchParams.toString()}`, {
      credentials: "include"
    });

    if (!response.ok) {
      setErrorMessage("Product list refresh failed.");
      return;
    }

    const nextProducts = (await response.json()) as AdminProductSummary[];
    setProducts(nextProducts);
    setSelectedProductId((current) =>
      nextProducts.some((product) => product.productId === current)
        ? current
        : nextProducts[0]?.productId ?? null
    );
  }

  const onSubmit = form.handleSubmit((values) => {
    setIsPending(true);
    setErrorMessage(null);
    setStatusMessage(null);

    startTransition(async () => {
      const response = await fetch(
        selectedProductId
          ? `${apiUrl}/admin/products/${selectedProductId}`
          : `${apiUrl}/admin/products`,
        {
          method: selectedProductId ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json"
          },
          credentials: "include",
          body: JSON.stringify(values)
        }
      );

      if (!response.ok) {
        setErrorMessage(
          "The product could not be saved. Verify slug uniqueness, seller assignment, and stock values."
        );
        setIsPending(false);
        return;
      }

      const savedProduct = (await response.json()) as AdminProductSummary;
      setProducts((current) =>
        [...current.filter((entry) => entry.productId !== savedProduct.productId), savedProduct].sort(
          (left, right) => right.updatedAt.localeCompare(left.updatedAt)
        )
      );
      setSelectedProductId(savedProduct.productId);
      setStatusMessage(selectedProductId ? "Product updated." : "Product created.");
      setIsPending(false);
      router.refresh();
    });
  });

  async function handleArchive() {
    if (!selectedProductId) {
      return;
    }

    setIsPending(true);
    setErrorMessage(null);
    setStatusMessage(null);

    const response = await fetch(`${apiUrl}/admin/products/${selectedProductId}`, {
      method: "DELETE",
      credentials: "include"
    });

    if (!response.ok) {
      setErrorMessage("The product could not be archived.");
      setIsPending(false);
      return;
    }

    const archivedProduct = (await response.json()) as AdminProductSummary;
    setProducts((current) =>
      current.map((product) =>
        product.productId === archivedProduct.productId ? archivedProduct : product
      )
    );
    setSelectedProductId(archivedProduct.productId);
    setStatusMessage("Product archived.");
    setIsPending(false);
    router.refresh();
  }

  return (
    <SectionShell
      description="Create and adjust sellable catalog entries with listing ownership, pricing, stock baseline, and media from a single operator workflow."
      eyebrow="Catalog execution"
      id="products"
      title="Product management"
    >
      <SplitPanel
        aside={
          <>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-[var(--font-heading)] text-2xl font-semibold tracking-tight">
                  Product offers
                </h3>
                <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                  Search by title, slug, or seller SKU.
                </p>
              </div>
              <Button onClick={handleCreateNew} type="button" variant="secondary">
                New
              </Button>
            </div>

            <div className={ListScrollClassName()}>
              <input
                className={InputClassName()}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search products"
                value={query}
              />
              <div className="flex gap-3">
                <select
                  className={InputClassName()}
                  onChange={(event) =>
                    setStatusFilter(
                      event.target.value as "ALL" | "DRAFT" | "ACTIVE" | "ARCHIVED"
                    )
                  }
                  value={statusFilter}
                >
                  <option value="ALL">All statuses</option>
                  <option value="ACTIVE">Active</option>
                  <option value="DRAFT">Draft</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
                <Button
                  onClick={() => void refreshProducts()}
                  type="button"
                  variant="secondary"
                >
                  Filter
                </Button>
              </div>
            </div>

            <div className="grid gap-3">
              {products.map((product) => (
                <ListCardButton
                  active={product.productId === selectedProductId}
                  key={product.productId}
                  onClick={() => setSelectedProductId(product.productId)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[var(--foreground)]">
                        {product.title}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                        {product.slug}
                      </p>
                    </div>
                    <StatusPill value={product.status} />
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                    {product.sellerName ?? "No seller"} -{" "}
                    {product.price
                      ? `${(product.price.amount / 100).toFixed(2)} ${product.price.currency}`
                      : "No active price"}
                  </p>
                  <p className="mt-3 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                    {product.inventory
                      ? `${product.inventory.availableQuantity} available`
                      : "Inventory pending"}{" "}
                    - {product.listingCount} listings
                  </p>
                </ListCardButton>
              ))}
            </div>
          </>
        }
      >
        <form className="grid gap-5" onSubmit={onSubmit}>
          <div className="grid gap-5 md:grid-cols-2">
            <FieldShell
              error={form.formState.errors.title?.message}
              label="Product title"
            >
              <input className={InputClassName()} {...form.register("title")} />
            </FieldShell>
            <FieldShell error={form.formState.errors.slug?.message} label="Slug">
              <input className={InputClassName()} {...form.register("slug")} />
            </FieldShell>
          </div>

          <FieldShell
            error={form.formState.errors.description?.message}
            label="Description"
          >
            <textarea className={TextAreaClassName()} {...form.register("description")} />
          </FieldShell>

          <div className="grid gap-5 md:grid-cols-3">
            <FieldShell label="Status">
              <select className={InputClassName()} {...form.register("status")}>
                <option value="ACTIVE">ACTIVE</option>
                <option value="DRAFT">DRAFT</option>
                <option value="ARCHIVED">ARCHIVED</option>
              </select>
            </FieldShell>
            <FieldShell label="Category">
              <select
                className={InputClassName()}
                {...form.register("categoryId", {
                  setValueAs: (value) => (value ? value : null)
                })}
              >
                <option value="">Unassigned</option>
                {options.categories.map((category) => (
                  <option key={category.categoryId} value={category.categoryId}>
                    {category.name}
                  </option>
                ))}
              </select>
            </FieldShell>
            <FieldShell
              error={form.formState.errors.brandName?.message}
              hint="Existing brand or a new one to create on save."
              label="Brand"
            >
              <input
                className={InputClassName()}
                {...form.register("brandName", {
                  setValueAs: (value) => (value ? value : null)
                })}
              />
            </FieldShell>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            <FieldShell label="Seller">
              <select className={InputClassName()} {...form.register("sellerId")}>
                {options.sellers.map((seller) => (
                  <option key={seller.sellerId} value={seller.sellerId}>
                    {seller.displayName} - {seller.status}
                  </option>
                ))}
              </select>
            </FieldShell>
            <FieldShell
              error={form.formState.errors.sellerSku?.message}
              label="Seller SKU"
            >
              <input className={InputClassName()} {...form.register("sellerSku")} />
            </FieldShell>
            <FieldShell label="Variant title">
              <input
                className={InputClassName()}
                {...form.register("variantTitle", {
                  setValueAs: (value) => (value ? value : null)
                })}
              />
            </FieldShell>
          </div>

          <div className="grid gap-5 md:grid-cols-4">
            <FieldShell
              error={form.formState.errors.priceAmount?.message}
              label="Current price"
            >
              <input
                className={InputClassName()}
                type="number"
                {...form.register("priceAmount", {
                  valueAsNumber: true
                })}
              />
            </FieldShell>
            <FieldShell
              error={form.formState.errors.compareAtAmount?.message}
              label="Compare-at price"
            >
              <input
                className={InputClassName()}
                type="number"
                {...form.register("compareAtAmount", {
                  setValueAs: (value) => (value === "" ? null : Number(value))
                })}
              />
            </FieldShell>
            <FieldShell
              error={form.formState.errors.onHand?.message}
              label="On-hand stock"
            >
              <input
                className={InputClassName()}
                type="number"
                {...form.register("onHand", {
                  valueAsNumber: true
                })}
              />
            </FieldShell>
            <FieldShell
              error={form.formState.errors.safetyStock?.message}
              label="Safety stock"
            >
              <input
                className={InputClassName()}
                type="number"
                {...form.register("safetyStock", {
                  valueAsNumber: true
                })}
              />
            </FieldShell>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            <FieldShell
              error={form.formState.errors.leadTimeDays?.message}
              label="Lead time (days)"
            >
              <input
                className={InputClassName()}
                type="number"
                {...form.register("leadTimeDays", {
                  valueAsNumber: true
                })}
              />
            </FieldShell>
            <FieldShell label="Image URL">
              <input
                className={InputClassName()}
                {...form.register("imageUrl", {
                  setValueAs: (value) => (value ? value : null)
                })}
              />
            </FieldShell>
            <FieldShell label="Image alt">
              <input
                className={InputClassName()}
                {...form.register("imageAlt", {
                  setValueAs: (value) => (value ? value : null)
                })}
              />
            </FieldShell>
          </div>

          {errorMessage ? (
            <div className="rounded-[24px] border border-[rgba(185,28,28,0.14)] bg-[rgba(185,28,28,0.05)] px-4 py-3 text-sm text-[rgb(185,28,28)]">
              {errorMessage}
            </div>
          ) : null}

          {statusMessage ? (
            <div className="rounded-[24px] border border-[rgba(15,118,110,0.14)] bg-[rgba(15,118,110,0.06)] px-4 py-3 text-sm text-[var(--accent)]">
              {statusMessage}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm leading-7 text-[var(--muted)]">
              Pricing and inventory written here immediately feed the live catalog,
              search projection, and downstream checkout availability checks.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              {selectedProductId ? (
                <Button
                  disabled={isPending}
                  onClick={handleArchive}
                  type="button"
                  variant="ghost"
                >
                  Archive
                </Button>
              ) : null}
              <Button disabled={isPending} type="submit">
                {isPending
                  ? "Saving..."
                  : selectedProductId
                    ? "Update product"
                    : "Create product"}
              </Button>
            </div>
          </div>
        </form>
      </SplitPanel>
    </SectionShell>
  );
}
