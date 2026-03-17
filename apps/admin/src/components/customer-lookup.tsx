"use client";

import type { AdminCustomerSummary } from "@velora/contracts";
import { Button } from "@velora/ui";
import { useState } from "react";

import { apiUrl } from "../lib/api-url";
import { InputClassName, SectionShell, TableShell } from "./admin-primitives";
import { StatusPill } from "./status-pill";

export function CustomerLookup({
  initialCustomers
}: {
  initialCustomers: AdminCustomerSummary[];
}) {
  const [customers, setCustomers] = useState(initialCustomers);
  const [query, setQuery] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSearch() {
    setErrorMessage(null);
    const searchParams = new URLSearchParams();

    if (query.trim()) {
      searchParams.set("q", query.trim());
    }

    const response = await fetch(`${apiUrl}/admin/customers?${searchParams.toString()}`, {
      credentials: "include"
    });

    if (!response.ok) {
      setErrorMessage("Customer lookup failed.");
      return;
    }

    setCustomers((await response.json()) as AdminCustomerSummary[]);
  }

  return (
    <SectionShell
      description="Look up customers by identity and review their account state, order footprint, and total spend without leaving the backoffice workspace."
      eyebrow="Customer operations"
      id="customers"
      title="Customer lookup"
    >
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_180px]">
        <input
          className={InputClassName()}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by email or name"
          value={query}
        />
        <Button onClick={() => void handleSearch()} type="button" variant="secondary">
          Search
        </Button>
      </div>

      {errorMessage ? (
        <div className="rounded-[24px] border border-[rgba(185,28,28,0.14)] bg-[rgba(185,28,28,0.05)] px-4 py-3 text-sm text-[rgb(185,28,28)]">
          {errorMessage}
        </div>
      ) : null}

      <TableShell>
        <table className="min-w-full border-collapse bg-white">
          <thead className="sticky top-0 z-10 bg-[rgba(15,23,42,0.04)] text-left text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3 font-semibold">Customer</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Orders</th>
              <th className="px-4 py-3 font-semibold">Total spend</th>
              <th className="px-4 py-3 font-semibold">Last order</th>
              <th className="px-4 py-3 font-semibold">Roles</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer) => (
              <tr
                className="border-t border-[var(--stroke)] text-sm text-[var(--foreground)]"
                key={customer.userId}
              >
                <td className="px-4 py-4">
                  <p className="font-semibold">{customer.fullName}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                    {customer.email}
                  </p>
                </td>
                <td className="px-4 py-4">
                  <StatusPill value={customer.isActive ? "ACTIVE" : "SUSPENDED"} />
                </td>
                <td className="px-4 py-4">{customer.orderCount}</td>
                <td className="px-4 py-4">
                  {(customer.totalSpent.amount / 100).toFixed(2)} {customer.totalSpent.currency}
                </td>
                <td className="px-4 py-4">
                  {customer.lastOrderAt
                    ? new Date(customer.lastOrderAt).toLocaleDateString("en-GB")
                    : "No orders"}
                </td>
                <td className="px-4 py-4">
                  {customer.roles.join(", ")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableShell>
    </SectionShell>
  );
}
