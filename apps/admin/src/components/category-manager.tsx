"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { AdminCategorySummary } from "@velora/contracts";
import { upsertAdminCategoryRequestSchema } from "@velora/contracts";
import { Button } from "@velora/ui";
import { startTransition, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { z } from "zod";

import { apiUrl } from "../lib/api-url";
import {
  EmptyState,
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
  category: AdminCategorySummary | null
): z.input<typeof upsertAdminCategoryRequestSchema> {
  return {
    name: category?.name ?? "",
    slug: category?.slug ?? "",
    description: category?.description ?? "",
    parentId: category?.parentId ?? null,
    sortOrder: category?.sortOrder ?? 100,
    isActive: category?.isActive ?? true
  };
}

export function CategoryManager({
  initialCategories
}: {
  initialCategories: AdminCategorySummary[];
}) {
  const router = useRouter();
  const [categories, setCategories] = useState(initialCategories);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    initialCategories[0]?.categoryId ?? null
  );
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const selectedCategory =
    categories.find((category) => category.categoryId === selectedCategoryId) ?? null;
  const form = useForm<z.input<typeof upsertAdminCategoryRequestSchema>>({
    resolver: zodResolver(upsertAdminCategoryRequestSchema),
    defaultValues: toFormValues(selectedCategory)
  });

  useEffect(() => {
    form.reset(toFormValues(selectedCategory));
  }, [form, selectedCategory]);

  function handleCreateNew() {
    setSelectedCategoryId(null);
    setErrorMessage(null);
    setStatusMessage(null);
    form.reset(toFormValues(null));
  }

  const onSubmit = form.handleSubmit((values) => {
    setIsPending(true);
    setErrorMessage(null);
    setStatusMessage(null);

    startTransition(async () => {
      const response = await fetch(
        selectedCategoryId
          ? `${apiUrl}/admin/categories/${selectedCategoryId}`
          : `${apiUrl}/admin/categories`,
        {
          method: selectedCategoryId ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json"
          },
          credentials: "include",
          body: JSON.stringify(values)
        }
      );

      if (!response.ok) {
        setErrorMessage(
          "The category could not be saved. Verify uniqueness and hierarchy rules."
        );
        setIsPending(false);
        return;
      }

      const savedCategory = (await response.json()) as AdminCategorySummary;

      setCategories((current) =>
        [...current.filter((entry) => entry.categoryId !== savedCategory.categoryId), savedCategory].sort(
          (left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name)
        )
      );
      setSelectedCategoryId(savedCategory.categoryId);
      setStatusMessage(selectedCategoryId ? "Category updated." : "Category created.");
      setIsPending(false);
      router.refresh();
    });
  });

  async function handleDelete() {
    if (!selectedCategoryId) {
      return;
    }

    setIsPending(true);
    setErrorMessage(null);
    setStatusMessage(null);

    const response = await fetch(`${apiUrl}/admin/categories/${selectedCategoryId}`, {
      method: "DELETE",
      credentials: "include"
    });

    if (!response.ok) {
      setErrorMessage(
        "This category cannot be deleted until child categories and products are reassigned."
      );
      setIsPending(false);
      return;
    }

    setCategories((current) =>
      current.filter((category) => category.categoryId !== selectedCategoryId)
    );
    setSelectedCategoryId(null);
    form.reset(toFormValues(null));
    setStatusMessage("Category deleted.");
    setIsPending(false);
    router.refresh();
  }

  return (
    <SectionShell
      description="Manage the category tree, merchandising slugs, hierarchy, and activation state that shape storefront navigation and search facets."
      eyebrow="Catalog structure"
      id="categories"
      title="Category management"
    >
      <SplitPanel
        aside={
          <>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-[var(--font-heading)] text-2xl font-semibold tracking-tight">
                  Category tree
                </h3>
                <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                  {categories.length} categories available for merchandising.
                </p>
              </div>
              <Button onClick={handleCreateNew} type="button" variant="secondary">
                New
              </Button>
            </div>

            <div className={ListScrollClassName()}>
              {categories.map((category) => (
                <ListCardButton
                  active={category.categoryId === selectedCategoryId}
                  key={category.categoryId}
                  onClick={() => setSelectedCategoryId(category.categoryId)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[var(--foreground)]">
                        {category.name}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                        {category.slug}
                      </p>
                    </div>
                    <StatusPill value={category.isActive ? "ACTIVE" : "ARCHIVED"} />
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                    Parent: {category.parentName ?? "Root category"}
                  </p>
                  <p className="mt-3 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                    {category.productCount} products - {category.childCount} children
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
              error={form.formState.errors.name?.message}
              label="Category name"
            >
              <input className={InputClassName()} {...form.register("name")} />
            </FieldShell>
            <FieldShell
              error={form.formState.errors.slug?.message}
              hint="Lowercase hyphenated slug used by storefront and search."
              label="Slug"
            >
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
            <FieldShell label="Parent category">
              <select
                className={InputClassName()}
                {...form.register("parentId", {
                  setValueAs: (value) => (value ? value : null)
                })}
              >
                <option value="">Root category</option>
                {categories
                  .filter((category) => category.categoryId !== selectedCategoryId)
                  .map((category) => (
                    <option key={category.categoryId} value={category.categoryId}>
                      {category.name}
                    </option>
                  ))}
              </select>
            </FieldShell>

            <FieldShell
              error={form.formState.errors.sortOrder?.message}
              label="Sort order"
            >
              <input
                className={InputClassName()}
                type="number"
                {...form.register("sortOrder", {
                  valueAsNumber: true
                })}
              />
            </FieldShell>

            <label className="flex items-center gap-3 rounded-[24px] border border-[var(--stroke)] bg-white px-4 py-3 text-sm">
              <input type="checkbox" {...form.register("isActive")} />
              Active in navigation and storefront category pages
            </label>
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
              Category updates refresh affected search documents so navigation and
              filters stay aligned with the transactional catalog.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              {selectedCategoryId ? (
                <Button
                  disabled={isPending}
                  onClick={handleDelete}
                  type="button"
                  variant="ghost"
                >
                  Delete
                </Button>
              ) : null}
              <Button disabled={isPending} type="submit">
                {isPending
                  ? "Saving..."
                  : selectedCategoryId
                    ? "Update category"
                    : "Create category"}
              </Button>
            </div>
          </div>
        </form>

        {categories.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              copy="Categories created here become available immediately in product assignment and storefront navigation."
              title="No categories yet"
            />
          </div>
        ) : null}
      </SplitPanel>
    </SectionShell>
  );
}
