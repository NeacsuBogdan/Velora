"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type {
  AdminOrderDetail,
  AdminOrderSummary,
  RefundRequest,
  UpdateAdminOrderStatusRequest
} from "@velora/contracts";
import {
  refundRequestSchema,
  updateAdminOrderStatusRequestSchema
} from "@velora/contracts";
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
  SplitPanel
} from "./admin-primitives";
import { StatusPill } from "./status-pill";

const orderTransitions: Record<string, string[]> = {
  CREATED: ["PAYMENT_PENDING", "CANCELED"],
  PAYMENT_PENDING: ["PAID", "CANCELED"],
  PAID: ["PROCESSING", "REFUNDED"],
  PROCESSING: ["SHIPPED", "CANCELED", "REFUNDED"],
  SHIPPED: ["COMPLETED", "REFUNDED"],
  COMPLETED: ["REFUNDED"],
  CANCELED: [],
  REFUNDED: []
};

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount / 100);
}

async function readApiErrorMessage(response: Response, fallback: string) {
  try {
    const payload = (await response.json()) as {
      error?: string;
      message?: string | string[];
    };

    if (Array.isArray(payload.message) && payload.message.length > 0) {
      return payload.message.join(" ");
    }

    if (typeof payload.message === "string" && payload.message.trim()) {
      return payload.message;
    }

    if (typeof payload.error === "string" && payload.error.trim()) {
      return payload.error;
    }
  } catch {
    return fallback;
  }

  return fallback;
}

function toStatusFormValues(
  order: AdminOrderDetail | null
): UpdateAdminOrderStatusRequest {
  return {
    status: order?.status ?? "CREATED",
    note: null
  };
}

function toRefundFormValues(): RefundRequest {
  return {
    amount: undefined,
    reason: undefined
  };
}

export function OrderManager({
  initialOrders,
  initialOrderDetail
}: {
  initialOrders: AdminOrderSummary[];
  initialOrderDetail: AdminOrderDetail | null;
}) {
  const router = useRouter();
  const [orders, setOrders] = useState(initialOrders);
  const [selectedOrderNumber, setSelectedOrderNumber] = useState<string | null>(
    initialOrderDetail?.number ?? initialOrders[0]?.number ?? null
  );
  const [orderDetail, setOrderDetail] = useState<AdminOrderDetail | null>(
    initialOrderDetail
  );
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const statusForm = useForm<UpdateAdminOrderStatusRequest>({
    resolver: zodResolver(updateAdminOrderStatusRequestSchema),
    defaultValues: toStatusFormValues(orderDetail)
  });
  const refundForm = useForm<RefundRequest>({
    resolver: zodResolver(refundRequestSchema),
    defaultValues: toRefundFormValues()
  });

  useEffect(() => {
    statusForm.reset(toStatusFormValues(orderDetail));
    refundForm.reset(toRefundFormValues());
  }, [orderDetail, refundForm, statusForm]);

  async function fetchOrderDetail(number: string) {
    const response = await fetch(`${apiUrl}/admin/orders/${number}`, {
      credentials: "include"
    });

    if (!response.ok) {
      setErrorMessage("Order detail refresh failed.");
      return;
    }

    setOrderDetail((await response.json()) as AdminOrderDetail);
  }

  async function refreshOrders(nextQuery = query, nextStatus = statusFilter) {
    const searchParams = new URLSearchParams();

    if (nextQuery.trim()) {
      searchParams.set("q", nextQuery.trim());
    }

    if (nextStatus !== "ALL") {
      searchParams.set("status", nextStatus);
    }

    const response = await fetch(`${apiUrl}/admin/orders?${searchParams.toString()}`, {
      credentials: "include"
    });

    if (!response.ok) {
      setErrorMessage("Order list refresh failed.");
      return;
    }

    const nextOrders = (await response.json()) as AdminOrderSummary[];
    setOrders(nextOrders);

    const nextSelectedNumber =
      nextOrders.find((order) => order.number === selectedOrderNumber)?.number ??
      nextOrders[0]?.number ??
      null;
    setSelectedOrderNumber(nextSelectedNumber);

    if (nextSelectedNumber) {
      await fetchOrderDetail(nextSelectedNumber);
    } else {
      setOrderDetail(null);
    }
  }

  async function handleSelectOrder(number: string) {
    setSelectedOrderNumber(number);
    setErrorMessage(null);
    setStatusMessage(null);
    await fetchOrderDetail(number);
  }

  const onUpdateStatus = statusForm.handleSubmit((values) => {
    if (!selectedOrderNumber) {
      return;
    }

    setIsPending(true);
    setErrorMessage(null);
    setStatusMessage(null);

    startTransition(async () => {
      const response = await fetch(
        `${apiUrl}/admin/orders/${selectedOrderNumber}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json"
          },
          credentials: "include",
          body: JSON.stringify(values)
        }
      );

      if (!response.ok) {
        setErrorMessage(
          await readApiErrorMessage(response, "Order status update failed.")
        );
        setIsPending(false);
        return;
      }

      const updatedOrder = (await response.json()) as AdminOrderDetail;
      setOrderDetail(updatedOrder);
      setOrders((current) =>
        current.map((order) =>
          order.number === updatedOrder.number
            ? {
                ...order,
                status: updatedOrder.status,
                paymentStatus: updatedOrder.paymentStatus,
                updatedAt: updatedOrder.updatedAt
              }
            : order
        )
      );
      setStatusMessage("Order status updated.");
      setIsPending(false);
      router.refresh();
    });
  });

  const onRefund = refundForm.handleSubmit((values) => {
    if (!orderDetail) {
      return;
    }

    setIsPending(true);
    setErrorMessage(null);
    setStatusMessage(null);

    startTransition(async () => {
      const response = await fetch(`${apiUrl}/payments/orders/${orderDetail.orderId}/refunds`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify(values)
      });

      if (!response.ok) {
        setErrorMessage(
          await readApiErrorMessage(response, "Refund creation failed.")
        );
        setIsPending(false);
        return;
      }

      setOrderDetail((await response.json()) as AdminOrderDetail);
      await refreshOrders();
      setStatusMessage("Refund recorded.");
      setIsPending(false);
      router.refresh();
    });
  });

  const nextStatuses = orderDetail
    ? [orderDetail.status, ...(orderTransitions[orderDetail.status] ?? [])]
    : ["CREATED"];
  const refundedAmount =
    orderDetail?.refunds.reduce(
      (sum, refund) => (refund.status === "FAILED" ? sum : sum + refund.amount.amount),
      0
    ) ?? 0;
  const remainingRefundableAmount = orderDetail
    ? Math.max(orderDetail.total.amount - refundedAmount, 0)
    : 0;
  const refundEligible =
    (orderDetail?.paymentStatus === "SUCCEEDED" ||
      orderDetail?.paymentStatus === "PARTIALLY_REFUNDED") &&
    remainingRefundableAmount > 0;
  const refundCurrency = orderDetail?.total.currency ?? "RON";
  const refundAmountError = refundForm.formState.errors.amount?.message;
  const deliveryLines = orderDetail?.deliveryAddress
    ? [
        orderDetail.deliveryAddress.fullName,
        orderDetail.deliveryAddress.line1,
        orderDetail.deliveryAddress.line2,
        [orderDetail.deliveryAddress.city, orderDetail.deliveryAddress.state]
          .filter(Boolean)
          .join(", "),
        `${orderDetail.deliveryAddress.postalCode} ${orderDetail.deliveryAddress.countryCode}`,
        orderDetail.deliveryAddress.phone
      ].filter(Boolean)
    : [];

  return (
    <SectionShell
      description="Review lifecycle state, item composition, and refund posture for live orders, with guarded status changes and payment-linked refund actions."
      eyebrow="Order operations"
      id="orders"
      title="Order management"
    >
      <SplitPanel
        aside={
          <>
            <div>
              <h3 className="font-[var(--font-heading)] text-2xl font-semibold tracking-tight">
                Active order queue
              </h3>
              <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                Filter by order number, customer identity, or status.
              </p>
            </div>

            <div className="grid gap-3">
              <input
                className={InputClassName()}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search orders"
                value={query}
              />
              <div className="flex gap-3">
                <select
                  className={InputClassName()}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  value={statusFilter}
                >
                  <option value="ALL">All statuses</option>
                  <option value="CREATED">Created</option>
                  <option value="PAYMENT_PENDING">Payment pending</option>
                  <option value="PAID">Paid</option>
                  <option value="PROCESSING">Processing</option>
                  <option value="SHIPPED">Shipped</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELED">Canceled</option>
                  <option value="REFUNDED">Refunded</option>
                </select>
                <Button onClick={() => void refreshOrders()} type="button" variant="secondary">
                  Filter
                </Button>
              </div>
            </div>

            <div className={ListScrollClassName()}>
              {orders.map((order) => (
                <ListCardButton
                  active={order.number === selectedOrderNumber}
                  key={order.number}
                  onClick={() => void handleSelectOrder(order.number)}
                >
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[var(--foreground)]">
                        {order.number}
                      </p>
                      <p className="mt-1 truncate text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
                        {order.customer?.label ?? "Guest checkout"}
                      </p>
                    </div>
                    <StatusPill value={order.status} />
                  </div>
                  <p className="mt-3 truncate text-sm leading-6 text-[var(--muted)]">
                    {(order.total.amount / 100).toFixed(2)} {order.total.currency} -{" "}
                    {order.itemCount} items
                  </p>
                  <p className="mt-3 truncate text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
                    Payment {order.paymentStatus.toLowerCase().replace(/_/g, " ")}
                  </p>
                </ListCardButton>
              ))}
            </div>
          </>
        }
      >
        {orderDetail ? (
          <div className="space-y-6">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
              <div className="rounded-[24px] border border-[var(--stroke)] bg-[rgba(15,23,42,0.02)] px-5 py-5">
                <div className="flex flex-wrap items-center gap-3">
                  <StatusPill value={orderDetail.status} />
                  <StatusPill value={orderDetail.paymentStatus} />
                </div>
                <div className="mt-5 grid gap-4 text-sm md:grid-cols-2 2xl:grid-cols-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                      Customer
                    </p>
                    <p className="mt-2 break-words text-[var(--foreground)]">
                      {orderDetail.customer?.label ?? "Guest"}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                      Seller
                    </p>
                    <p className="mt-2 break-words text-[var(--foreground)]">
                      {orderDetail.seller?.label ?? "Multi-seller"}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                      Total
                    </p>
                    <p className="mt-2 text-[var(--foreground)]">
                      {(orderDetail.total.amount / 100).toFixed(2)} {orderDetail.total.currency}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4">
                <form className="grid gap-4 rounded-[24px] border border-[var(--stroke)] bg-white px-5 py-5" onSubmit={onUpdateStatus}>
                  <FieldShell label="Next status">
                    <select className={InputClassName()} {...statusForm.register("status")}>
                      {nextStatuses.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </FieldShell>
                  <FieldShell label="Status note">
                    <input
                      className={InputClassName()}
                      {...statusForm.register("note", {
                        setValueAs: (value) => (value ? value : null)
                      })}
                    />
                  </FieldShell>
                  <Button disabled={isPending} type="submit">
                    {isPending ? "Saving..." : "Update status"}
                  </Button>
                </form>

                <form className="grid gap-4 rounded-[24px] border border-[var(--stroke)] bg-white px-5 py-5" onSubmit={onRefund}>
                  <FieldShell
                    error={refundAmountError}
                    hint={`Remaining refundable total: ${formatMoney(
                      remainingRefundableAmount,
                      refundCurrency
                    )}. Leave blank to refund the full remaining balance.`}
                    label={`Refund amount (${refundCurrency})`}
                  >
                    <input
                      className={InputClassName()}
                      inputMode="decimal"
                      max={
                        remainingRefundableAmount > 0
                          ? (remainingRefundableAmount / 100).toFixed(2)
                          : undefined
                      }
                      min="0.01"
                      placeholder={(remainingRefundableAmount / 100).toFixed(2)}
                      step="0.01"
                      type="number"
                      {...refundForm.register("amount", {
                        setValueAs: (value) => {
                          if (value === "") {
                            return undefined;
                          }

                          const parsed = Number(String(value).replace(",", "."));
                          return Number.isFinite(parsed)
                            ? Math.round(parsed * 100)
                            : Number.NaN;
                        },
                        validate: (value) =>
                          value === undefined ||
                          value <= remainingRefundableAmount ||
                          "Refund amount exceeds the remaining refundable total."
                      })}
                    />
                  </FieldShell>
                  <FieldShell label="Refund reason">
                    <input
                      className={InputClassName()}
                      {...refundForm.register("reason", {
                        setValueAs: (value) => (value ? value : undefined)
                      })}
                    />
                  </FieldShell>
                  <Button disabled={!refundEligible || isPending} type="submit" variant="secondary">
                    {remainingRefundableAmount === 0 ? "Fully refunded" : "Create refund"}
                  </Button>
                </form>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <div className="rounded-[24px] border border-[var(--stroke)] bg-white px-5 py-5">
                <h4 className="font-semibold text-[var(--foreground)]">Line items</h4>
                <div className="mt-4 grid gap-3">
                  {orderDetail.items.map((item) => (
                    <div
                      className="rounded-[20px] border border-[var(--stroke)] px-4 py-4 text-sm"
                      key={item.orderItemId}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-[var(--foreground)]">{item.title}</p>
                          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                            {item.seller.name}
                          </p>
                        </div>
                        <p className="text-[var(--foreground)]">
                          {(item.totalPrice.amount / 100).toFixed(2)} {item.totalPrice.currency}
                        </p>
                      </div>
                      <p className="mt-3 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                        Qty {item.quantity} - Unit {(item.unitPrice.amount / 100).toFixed(2)}{" "}
                        {item.unitPrice.currency}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-6">
                <div className="rounded-[24px] border border-[var(--stroke)] bg-white px-5 py-5">
                  <h4 className="font-semibold text-[var(--foreground)]">
                    Delivery and contact
                  </h4>
                  {orderDetail.customerContact ? (
                    <div className="mt-4 grid gap-2 text-sm text-[var(--muted)]">
                      <p className="font-semibold text-[var(--foreground)]">
                        {orderDetail.customerContact.firstName}{" "}
                        {orderDetail.customerContact.lastName}
                      </p>
                      <p>{orderDetail.customerContact.email}</p>
                      {orderDetail.customerContact.phone ? (
                        <p>{orderDetail.customerContact.phone}</p>
                      ) : null}
                    </div>
                  ) : (
                    <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
                      No persisted contact snapshot is available for this order.
                    </p>
                  )}

                  {deliveryLines.length ? (
                    <div className="mt-4 grid gap-2 border-t border-[var(--stroke)] pt-4 text-sm text-[var(--muted)]">
                      {deliveryLines.map((line) => (
                        <p key={line}>{line}</p>
                      ))}
                    </div>
                  ) : null}
                </div>

                {orderDetail.settlement ? (
                  <div className="rounded-[24px] border border-[var(--stroke)] bg-white px-5 py-5">
                    <h4 className="font-semibold text-[var(--foreground)]">
                      Settlement split
                    </h4>
                    <div className="mt-4 grid gap-3 text-sm text-[var(--muted)]">
                      <div className="flex items-center justify-between gap-4">
                        <span>Customer paid</span>
                        <span className="font-semibold text-[var(--foreground)]">
                          {formatMoney(
                            orderDetail.settlement.customerPaidAmount.amount,
                            orderDetail.settlement.customerPaidAmount.currency
                          )}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span>Total discount</span>
                        <span className="font-semibold text-[var(--foreground)]">
                          -{formatMoney(
                            orderDetail.settlement.discountTotal.amount,
                            orderDetail.settlement.discountTotal.currency
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 border-t border-[var(--stroke)] pt-4">
                      {orderDetail.settlement.lines.map((line) => (
                        <div
                          className="rounded-[20px] border border-[var(--stroke)] px-4 py-4 text-sm"
                          key={line.sellerId}
                        >
                          <div className="flex items-center justify-between gap-4">
                            <p className="font-semibold text-[var(--foreground)]">
                              {line.sellerName}
                            </p>
                            <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                              Net {formatMoney(line.netPayoutAmount.amount, line.netPayoutAmount.currency)}
                            </p>
                          </div>
                          <div className="mt-3 grid gap-2 text-[var(--muted)]">
                            <div className="flex items-center justify-between gap-4">
                              <span>Gross</span>
                              <span>{formatMoney(line.grossAmount.amount, line.grossAmount.currency)}</span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <span>Seller-funded</span>
                              <span>-{formatMoney(line.sellerDiscountAmount.amount, line.sellerDiscountAmount.currency)}</span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <span>Platform-funded</span>
                              <span>{formatMoney(line.platformDiscountAmount.amount, line.platformDiscountAmount.currency)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="rounded-[24px] border border-[var(--stroke)] bg-white px-5 py-5">
                  <h4 className="font-semibold text-[var(--foreground)]">Status timeline</h4>
                  <div className="mt-4 grid gap-3">
                    {orderDetail.statusHistory.map((entry, index) => (
                      <div className="flex gap-4 text-sm" key={`${entry.status}-${index}`}>
                        <div className="mt-1 h-2.5 w-2.5 rounded-full bg-[var(--accent)]" />
                        <div>
                          <p className="font-semibold text-[var(--foreground)]">
                            {entry.status}
                          </p>
                          <p className="mt-1 leading-6 text-[var(--muted)]">
                            {entry.note ?? "No note"}
                          </p>
                          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                            {new Date(entry.createdAt).toLocaleString("en-GB")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[24px] border border-[var(--stroke)] bg-white px-5 py-5">
                  <h4 className="font-semibold text-[var(--foreground)]">Refunds</h4>
                  <div className="mt-4 grid gap-3">
                    {orderDetail.refunds.length > 0 ? (
                      orderDetail.refunds.map((refund) => (
                        <div
                          className="rounded-[20px] border border-[var(--stroke)] px-4 py-4 text-sm"
                          key={refund.refundId}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <StatusPill value={refund.status} />
                            <p className="font-semibold text-[var(--foreground)]">
                              {(refund.amount.amount / 100).toFixed(2)} {refund.amount.currency}
                            </p>
                          </div>
                          <p className="mt-2 leading-6 text-[var(--muted)]">
                            {refund.reason ?? "No reason provided"}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm leading-7 text-[var(--muted)]">
                        No refunds have been recorded for this order yet.
                      </p>
                    )}
                  </div>
                </div>
              </div>
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
          </div>
        ) : null}
      </SplitPanel>
    </SectionShell>
  );
}
