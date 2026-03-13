import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";

type RoleCode = "ADMIN" | "CUSTOMER" | "SELLER";
type PaymentStatus =
  | "PENDING"
  | "REQUIRES_ACTION"
  | "SUCCEEDED"
  | "FAILED"
  | "REFUNDED"
  | "PARTIALLY_REFUNDED";
type CheckoutStatus =
  | "STARTED"
  | "PAYMENT_PENDING"
  | "COMPLETED"
  | "FAILED"
  | "EXPIRED";
type OrderStatus =
  | "CREATED"
  | "PAYMENT_PENDING"
  | "PAID"
  | "PROCESSING"
  | "SHIPPED"
  | "COMPLETED"
  | "CANCELED"
  | "REFUNDED";
type PromotionType =
  | "PERCENTAGE"
  | "FIXED_AMOUNT"
  | "CART_THRESHOLD"
  | "CATEGORY_DISCOUNT"
  | "BUY_X_GET_Y";
type PromotionStackingMode = "STACKABLE" | "EXCLUSIVE";

interface Money {
  amount: number;
  currency: "RON";
}

interface SessionUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: Array<{ code: RoleCode; name: string }>;
}

interface DemoUser extends SessionUser {
  password: string;
  sellerId?: string;
}

interface Category {
  categoryId: string;
  name: string;
  slug: string;
  description: string;
  parentId: string | null;
  sortOrder: number;
  isActive: boolean;
}

interface Variant {
  id: string;
  title: string;
  attributes: Array<{ name: string; value: string }>;
}

interface Product {
  productId: string;
  categoryId: string;
  brandName: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string;
  highlights: string[];
  variants: Variant[];
  gallery: Array<{ url: string; altText: string }>;
  specifications: Array<{
    title: string;
    items: Array<{ label: string; value: string }>;
  }>;
  relatedProductIds: string[];
  status: "ACTIVE" | "DRAFT" | "ARCHIVED";
  updatedAt: string;
}

interface Seller {
  sellerId: string;
  slug: string;
  displayName: string;
  legalName: string;
  contactEmail: string;
  status: "PENDING" | "ACTIVE" | "SUSPENDED";
  ownerUserId: string;
}

interface InventoryRecord {
  inventoryItemId: string;
  onHand: number;
  reserved: number;
  safetyStock: number;
}

interface Listing {
  listingId: string;
  productId: string;
  sellerId: string;
  sellerSku: string;
  variantId: string | null;
  priceAmount: number;
  compareAtAmount: number | null;
  leadTimeDays: number;
  isActive: boolean;
  status: "ACTIVE" | "DRAFT" | "ARCHIVED";
  inventory: InventoryRecord;
  createdAt: string;
  updatedAt: string;
}

interface CartLine {
  itemId: string;
  listingId: string;
  quantity: number;
}

interface CartState {
  cartId: string;
  userId: string;
  status: "ACTIVE" | "CONVERTED" | "ABANDONED";
  couponCode: string | null;
  items: CartLine[];
  activeCheckoutSessionId: string | null;
  updatedAt: string;
}

interface DiscountSummary {
  promotionId: string | null;
  couponCode: string | null;
  label: string;
  description: string;
  amount: Money;
}

interface Reservation {
  reservationId: string;
  inventoryItemId: string;
  listingId: string;
  quantity: number;
  status: "ACTIVE" | "RELEASED" | "CONSUMED" | "EXPIRED";
  expiresAt: string;
}

interface PaymentAttempt {
  attemptId: string;
  checkoutSessionId: string;
  provider: "stripe";
  providerPaymentIntentId: string;
  clientSecret: string | null;
  status: PaymentStatus;
  amount: Money;
  createdAt: string;
  updatedAt: string;
}

interface CheckoutState {
  checkoutSessionId: string;
  cartId: string;
  userId: string;
  status: CheckoutStatus;
  amount: Money;
  discounts: DiscountSummary[];
  reservationExpiresAt: string;
  reservations: Reservation[];
  paymentAttempts: PaymentAttempt[];
  orderNumber: string | null;
  createdAt: string;
  updatedAt: string;
}

interface OrderLine {
  orderItemId: string;
  listingId: string;
  quantity: number;
  unitPrice: Money;
  totalPrice: Money;
}

interface RefundRecord {
  refundId: string;
  amount: Money;
  status: "SUCCEEDED" | "FAILED" | "PENDING";
  reason: string | null;
}

interface OrderState {
  orderId: string;
  number: string;
  userId: string | null;
  sellerId: string | null;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  subtotal: Money;
  discountTotal: Money;
  total: Money;
  itemCount: number;
  items: OrderLine[];
  discounts: DiscountSummary[];
  placedAt: string | null;
  createdAt: string;
  updatedAt: string;
  statusHistory: Array<{ status: OrderStatus; note: string | null; createdAt: string }>;
  refunds: RefundRecord[];
}

interface PromotionRule {
  name: string;
  configuration: {
    percentage?: number;
    amount?: number;
    thresholdAmount?: number;
    categorySlugs?: string[];
    listingIds?: string[];
    buyQuantity?: number;
    getQuantity?: number;
  };
}

interface PromotionRecord {
  promotionId: string;
  name: string;
  code: string | null;
  description: string;
  type: PromotionType;
  stackingMode: PromotionStackingMode;
  priority: number;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  rules: PromotionRule[];
  coupons: Array<{
    couponId: string;
    code: string;
    status: "ACTIVE" | "DISABLED" | "EXPIRED";
    usageLimit: number | null;
    startsAt: string | null;
    endsAt: string | null;
  }>;
}

interface JobRun {
  jobId: string;
  scope: string;
  status: "SUCCEEDED" | "FAILED" | "PENDING";
  requestedByEmail: string | null;
  createdAt: string;
}

interface SyncLog {
  logId: string;
  documentId: string | null;
  message: string | null;
  status: "SUCCEEDED" | "FAILED" | "PENDING";
  createdAt: string;
}

interface MockState {
  users: Record<string, DemoUser>;
  sessions: Record<string, string>;
  categories: Category[];
  products: Product[];
  sellers: Seller[];
  listings: Listing[];
  carts: Record<string, CartState>;
  checkouts: Record<string, CheckoutState>;
  orders: OrderState[];
  promotions: PromotionRecord[];
  jobs: JobRun[];
  syncLogs: SyncLog[];
  nextOrderCounter: number;
}

const port = Number(process.env.MOCK_API_PORT ?? 4000);
const currency: Money["currency"] = "RON";

function money(amount: number): Money {
  return {
    amount,
    currency
  };
}

function iso(offsetMinutes = 0) {
  return new Date(Date.now() + offsetMinutes * 60_000).toISOString();
}

function createBaseState(): MockState {
  const users: Record<string, DemoUser> = {
    "customer@velora.local": {
      id: "user-customer",
      email: "customer@velora.local",
      firstName: "Demo",
      lastName: "Customer",
      password: "Demo123!",
      roles: [{ code: "CUSTOMER", name: "Customer" }]
    },
    "admin@velora.local": {
      id: "user-admin",
      email: "admin@velora.local",
      firstName: "Demo",
      lastName: "Admin",
      password: "Demo123!",
      roles: [{ code: "ADMIN", name: "Admin" }]
    },
    "seller@velora.local": {
      id: "user-seller",
      email: "seller@velora.local",
      firstName: "Demo",
      lastName: "Seller",
      password: "Demo123!",
      roles: [{ code: "SELLER", name: "Seller" }],
      sellerId: "seller-1"
    }
  };

  const categories: Category[] = [
    {
      categoryId: "category-phones",
      name: "Phones",
      slug: "phones",
      description: "Premium smartphones, foldables, and connected accessories.",
      parentId: null,
      sortOrder: 10,
      isActive: true
    },
    {
      categoryId: "category-smartphones",
      name: "Smartphones",
      slug: "smartphones",
      description: "Current flagship and mid-range mobile devices.",
      parentId: "category-phones",
      sortOrder: 20,
      isActive: true
    },
    {
      categoryId: "category-audio",
      name: "Audio",
      slug: "audio",
      description: "Wireless earbuds, speakers, and personal audio gear.",
      parentId: null,
      sortOrder: 30,
      isActive: true
    }
  ];

  const sellers: Seller[] = [
    {
      sellerId: "seller-1",
      slug: "north-star-electronics",
      displayName: "North Star Electronics",
      legalName: "North Star Electronics SRL",
      contactEmail: "ops@northstar.local",
      status: "ACTIVE",
      ownerUserId: "user-seller"
    },
    {
      sellerId: "seller-2",
      slug: "aurora-digital",
      displayName: "Aurora Digital",
      legalName: "Aurora Digital Marketplace SRL",
      contactEmail: "supply@aurora.local",
      status: "ACTIVE",
      ownerUserId: "user-admin"
    }
  ];

  const products: Product[] = [
    {
      productId: "product-1",
      categoryId: "category-smartphones",
      brandName: "NordWave",
      slug: "nordwave-edge-s",
      title: "NordWave Edge S",
      subtitle: "512GB / Midnight graphite",
      description:
        "A flagship smartphone with a fast OLED panel, extended battery life, and a polished camera pipeline for daily commerce-ready use.",
      highlights: ["6.7-inch OLED", "512GB storage", "50MP triple camera"],
      variants: [
        {
          id: "variant-1",
          title: "Midnight 512GB",
          attributes: [
            { name: "Color", value: "Midnight" },
            { name: "Storage", value: "512GB" }
          ]
        }
      ],
      gallery: [
        {
          url: "https://placehold.co/720x720.png?text=NordWave+Edge+S&font=source-sans-pro",
          altText: "NordWave Edge S smartphone"
        }
      ],
      specifications: [
        {
          title: "Display",
          items: [
            { label: "Size", value: "6.7 inch" },
            { label: "Refresh rate", value: "120Hz" }
          ]
        },
        {
          title: "Battery",
          items: [
            { label: "Capacity", value: "5000 mAh" },
            { label: "Charging", value: "65W wired" }
          ]
        }
      ],
      relatedProductIds: ["product-2"],
      status: "ACTIVE",
      updatedAt: iso(-120)
    },
    {
      productId: "product-2",
      categoryId: "category-audio",
      brandName: "Soniq",
      slug: "soniq-buds-pro",
      title: "Soniq Buds Pro",
      subtitle: "Adaptive ANC",
      description:
        "Compact true wireless earbuds with adaptive noise cancelling and a balanced sound signature tuned for commute and office use.",
      highlights: ["Adaptive ANC", "36h battery", "Wireless charging"],
      variants: [
        {
          id: "variant-2",
          title: "Matte black",
          attributes: [{ name: "Color", value: "Black" }]
        }
      ],
      gallery: [
        {
          url: "https://placehold.co/720x720.png?text=Soniq+Buds+Pro&font=source-sans-pro",
          altText: "Soniq Buds Pro earbuds"
        }
      ],
      specifications: [
        {
          title: "Connectivity",
          items: [
            { label: "Bluetooth", value: "5.4" },
            { label: "Codec", value: "AAC / SBC / LC3" }
          ]
        }
      ],
      relatedProductIds: ["product-1"],
      status: "ACTIVE",
      updatedAt: iso(-240)
    }
  ];

  const listings: Listing[] = [
    {
      listingId: "listing-1",
      productId: "product-1",
      sellerId: "seller-1",
      sellerSku: "NW-EDGE-S-512",
      variantId: "variant-1",
      priceAmount: 329_900,
      compareAtAmount: 359_900,
      leadTimeDays: 2,
      isActive: true,
      status: "ACTIVE",
      inventory: {
        inventoryItemId: "inventory-1",
        onHand: 4,
        reserved: 0,
        safetyStock: 0
      },
      createdAt: iso(-600),
      updatedAt: iso(-120)
    },
    {
      listingId: "listing-2",
      productId: "product-2",
      sellerId: "seller-2",
      sellerSku: "SQ-BUDS-PRO",
      variantId: "variant-2",
      priceAmount: 64_900,
      compareAtAmount: 79_900,
      leadTimeDays: 1,
      isActive: true,
      status: "ACTIVE",
      inventory: {
        inventoryItemId: "inventory-2",
        onHand: 18,
        reserved: 0,
        safetyStock: 2
      },
      createdAt: iso(-580),
      updatedAt: iso(-240)
    }
  ];

  const sampleOrder: OrderState = {
    orderId: "order-seeded-1",
    number: "VLR-20260313-DEMO0001",
    userId: "user-customer",
    sellerId: "seller-1",
    status: "PAID",
    paymentStatus: "SUCCEEDED",
    subtotal: money(329_900),
    discountTotal: money(0),
    total: money(329_900),
    itemCount: 1,
    items: [
      {
        orderItemId: "order-item-seeded-1",
        listingId: "listing-1",
        quantity: 1,
        unitPrice: money(329_900),
        totalPrice: money(329_900)
      }
    ],
    discounts: [],
    placedAt: iso(-1_440),
    createdAt: iso(-1_445),
    updatedAt: iso(-1_440),
    statusHistory: [
      {
        status: "CREATED",
        note: "Order created from seeded marketplace activity.",
        createdAt: iso(-1_445)
      },
      {
        status: "PAID",
        note: "Payment settled successfully.",
        createdAt: iso(-1_440)
      }
    ],
    refunds: []
  };

  const promotions: PromotionRecord[] = [
    {
      promotionId: "promotion-seeded-1",
      name: "Welcome basket savings",
      code: "WELCOME5",
      description: "A seeded coupon used in local demos and cart repricing checks.",
      type: "PERCENTAGE",
      stackingMode: "STACKABLE",
      priority: 100,
      isActive: true,
      startsAt: iso(-2_880),
      endsAt: null,
      rules: [
        {
          name: "Welcome five percent",
          configuration: {
            percentage: 5
          }
        }
      ],
      coupons: [
        {
          couponId: "coupon-seeded-1",
          code: "WELCOME5",
          status: "ACTIVE",
          usageLimit: null,
          startsAt: iso(-2_880),
          endsAt: null
        }
      ]
    }
  ];

  return {
    users,
    sessions: {},
    categories,
    products,
    sellers,
    listings,
    carts: {
      "user-customer": {
        cartId: "cart-customer-1",
        userId: "user-customer",
        status: "ACTIVE",
        couponCode: null,
        items: [],
        activeCheckoutSessionId: null,
        updatedAt: iso(-60)
      }
    },
    checkouts: {},
    orders: [sampleOrder],
    promotions,
    jobs: [
      {
        jobId: "job-1",
        scope: "catalog-full",
        status: "SUCCEEDED",
        requestedByEmail: "admin@velora.local",
        createdAt: iso(-180)
      }
    ],
    syncLogs: [
      {
        logId: "sync-1",
        documentId: "listing-1",
        message: "Search projection refreshed after catalog sync.",
        status: "SUCCEEDED",
        createdAt: iso(-90)
      }
    ],
    nextOrderCounter: 2
  };
}

const baseState = createBaseState();
let state = structuredClone(baseState);

function resetState() {
  state = structuredClone(baseState);
}

function parseCookies(request: IncomingMessage) {
  const header = request.headers.cookie ?? "";
  const entries = header
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [key, ...value] = entry.split("=");
      return [key ?? "", value.join("=")] as const;
    });

  return Object.fromEntries(entries);
}

function getSessionUser(request: IncomingMessage) {
  const token = parseCookies(request).velora_session;

  if (!token) {
    return null;
  }

  const email = state.sessions[token];

  return email ? state.users[email] ?? null : null;
}

function getRoleUser(request: IncomingMessage, role?: RoleCode) {
  const user = getSessionUser(request);

  if (!user) {
    return {
      ok: false as const,
      statusCode: 401,
      body: {
        message: "Authentication required."
      }
    };
  }

  if (role && !user.roles.some((entry) => entry.code === role)) {
    return {
      ok: false as const,
      statusCode: 403,
      body: {
        message: "Insufficient role scope."
      }
    };
  }

  return {
    ok: true as const,
    user
  };
}

function sendJson(
  response: ServerResponse,
  statusCode: number,
  body: unknown,
  extraHeaders: Record<string, string> = {}
) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    ...extraHeaders
  });
  response.end(JSON.stringify(body));
}

function setCorsHeaders(request: IncomingMessage, response: ServerResponse) {
  const origin = request.headers.origin;

  if (!origin || !origin.startsWith("http://localhost:")) {
    return;
  }

  response.setHeader("Access-Control-Allow-Origin", origin);
  response.setHeader("Access-Control-Allow-Credentials", "true");
  response.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, X-Requested-With"
  );
  response.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
}

async function readJson<T>(request: IncomingMessage): Promise<T> {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (chunks.length === 0) {
    return {} as T;
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as T;
}

function findCategoryById(categoryId: string) {
  return state.categories.find((category) => category.categoryId === categoryId) ?? null;
}

function findCategoryBySlug(slug: string) {
  return state.categories.find((category) => category.slug === slug) ?? null;
}

function findProductById(productId: string) {
  return state.products.find((product) => product.productId === productId) ?? null;
}

function findProductBySlug(slug: string) {
  return state.products.find((product) => product.slug === slug) ?? null;
}

function findSellerById(sellerId: string) {
  return state.sellers.find((seller) => seller.sellerId === sellerId) ?? null;
}

function findListingById(listingId: string) {
  return state.listings.find((listing) => listing.listingId === listingId) ?? null;
}

function availableQuantity(listing: Listing) {
  return Math.max(
    listing.inventory.onHand - listing.inventory.reserved - listing.inventory.safetyStock,
    0
  );
}

function isLowStock(listing: Listing) {
  return availableQuantity(listing) <= 5;
}

function buildBreadcrumbs(category: Category) {
  const chain: Category[] = [];
  let current: Category | null = category;

  while (current) {
    chain.unshift(current);
    current = current.parentId ? findCategoryById(current.parentId) : null;
  }

  return chain.map((entry) => ({
    slug: entry.slug,
    name: entry.name
  }));
}

function isDescendantCategory(categoryId: string, requestedSlug: string) {
  let current: Category | null = findCategoryById(categoryId);

  while (current) {
    if (current.slug === requestedSlug) {
      return true;
    }

    current = current.parentId ? findCategoryById(current.parentId) : null;
  }

  return false;
}

function getActiveListings() {
  return state.listings.filter((listing) => listing.isActive && listing.status === "ACTIVE");
}

function buildProductListItem(listing: Listing) {
  const product = findProductById(listing.productId);
  const seller = findSellerById(listing.sellerId);
  const category = product ? findCategoryById(product.categoryId) : null;

  if (!product || !seller || !category) {
    return null;
  }

  const current = money(listing.priceAmount);
  const compareAt = listing.compareAtAmount ? money(listing.compareAtAmount) : null;
  const discountPercentage =
    compareAt && compareAt.amount > current.amount
      ? Math.round(((compareAt.amount - current.amount) / compareAt.amount) * 100)
      : null;

  return {
    listingId: listing.listingId,
    slug: product.slug,
    title: product.title,
    subtitle: product.subtitle,
    description: product.description,
    highlights: product.highlights,
    brand: {
      name: product.brandName
    },
    category: {
      slug: category.slug,
      name: category.name
    },
    seller: {
      sellerId: seller.sellerId,
      name: seller.displayName
    },
    image: product.gallery[0] ?? null,
    pricing: {
      current,
      compareAt,
      discountPercentage
    },
    availability: {
      inStock: availableQuantity(listing) > 0,
      availableQuantity: availableQuantity(listing)
    }
  };
}

function buildSearchResponse(searchParams: URLSearchParams) {
  const query = (searchParams.get("q") ?? "").trim().toLowerCase();
  const category = searchParams.get("category");
  const brands = searchParams.getAll("brand");
  const availability = searchParams.get("availability") ?? "all";
  const minPrice = Number(searchParams.get("minPrice") ?? 0);
  const maxPrice = Number(searchParams.get("maxPrice") ?? Number.MAX_SAFE_INTEGER);
  const sort = searchParams.get("sort") ?? "relevance";

  const sourceItems = getActiveListings()
    .map((listing) => buildProductListItem(listing))
    .filter((item): item is NonNullable<ReturnType<typeof buildProductListItem>> => Boolean(item));

  let items = sourceItems.filter((item) => {
    const matchesQuery =
      !query ||
      item.title.toLowerCase().includes(query) ||
      item.description.toLowerCase().includes(query) ||
      item.brand.name.toLowerCase().includes(query);
    const product = findProductBySlug(item.slug);
    const matchesCategory =
      !category || (product ? isDescendantCategory(product.categoryId, category) : false);
    const matchesBrands = brands.length === 0 || brands.includes(item.brand.name);
    const matchesAvailability =
      availability !== "in_stock" || item.availability.inStock;
    const matchesPrice =
      item.pricing.current.amount >= minPrice * 100 &&
      item.pricing.current.amount <= maxPrice * 100;

    return (
      matchesQuery &&
      matchesCategory &&
      matchesBrands &&
      matchesAvailability &&
      matchesPrice
    );
  });

  if (sort === "price_asc") {
    items = [...items].sort(
      (left, right) => left.pricing.current.amount - right.pricing.current.amount
    );
  } else if (sort === "price_desc") {
    items = [...items].sort(
      (left, right) => right.pricing.current.amount - left.pricing.current.amount
    );
  } else if (sort === "newest") {
    items = [...items].sort((left, right) => {
      const leftProduct = findProductBySlug(left.slug);
      const rightProduct = findProductBySlug(right.slug);

      return (rightProduct?.updatedAt ?? "").localeCompare(leftProduct?.updatedAt ?? "");
    });
  }

  const facets = {
    brands: Array.from(new Set(sourceItems.map((item) => item.brand.name))).map((brand) => ({
      value: brand,
      label: brand,
      count: sourceItems.filter((item) => item.brand.name === brand).length
    })),
    categories: state.categories
      .filter((entry) => entry.parentId === null)
      .map((entry) => ({
        value: entry.slug,
        label: entry.name,
        count: sourceItems.filter((item) => {
          const product = findProductBySlug(item.slug);
          return product ? isDescendantCategory(product.categoryId, entry.slug) : false;
        }).length
      }))
  };

  return {
    source: "mock-opensearch",
    query: query.length > 0 ? query : null,
    appliedFilters: {
      category,
      brands,
      availability,
      minPrice: Number.isFinite(minPrice) && minPrice > 0 ? minPrice : null,
      maxPrice:
        Number.isFinite(maxPrice) && maxPrice !== Number.MAX_SAFE_INTEGER ? maxPrice : null
    },
    availableSorts: [
      { value: "relevance", label: "Relevance" },
      { value: "newest", label: "Newest" },
      { value: "price_asc", label: "Price ascending" },
      { value: "price_desc", label: "Price descending" }
    ],
    facets,
    items,
    pagination: {
      page: 1,
      pageSize: items.length || 1,
      totalItems: items.length,
      totalPages: 1
    }
  };
}

function buildNavigation() {
  const roots = state.categories
    .filter((category) => category.parentId === null && category.isActive)
    .sort((left, right) => left.sortOrder - right.sortOrder);

  const categories = roots.map((root) => {
    const children = state.categories
      .filter((category) => category.parentId === root.categoryId && category.isActive)
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((child) => ({
        slug: child.slug,
        name: child.name,
        description: child.description,
        productCount: getActiveListings().filter((listing) => {
          const product = findProductById(listing.productId);
          return product ? isDescendantCategory(product.categoryId, child.slug) : false;
        }).length
      }));

    return {
      slug: root.slug,
      name: root.name,
      description: root.description,
      productCount: getActiveListings().filter((listing) => {
        const product = findProductById(listing.productId);
        return product ? isDescendantCategory(product.categoryId, root.slug) : false;
      }).length,
      children
    };
  });

  return {
    categories,
    featuredCategories: categories.slice(0, 3)
  };
}

function buildCategoryDetail(slug: string) {
  const category = findCategoryBySlug(slug);

  if (!category) {
    return null;
  }

  const productCount = getActiveListings().filter((listing) => {
    const product = findProductById(listing.productId);
    return product ? isDescendantCategory(product.categoryId, slug) : false;
  }).length;
  const activeProducts = state.products.filter((product) =>
    isDescendantCategory(product.categoryId, slug)
  );
  const childCategories = state.categories
    .filter((entry) => entry.parentId === category.categoryId && entry.isActive)
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map((entry) => ({
      slug: entry.slug,
      name: entry.name,
      description: entry.description,
      productCount: getActiveListings().filter((listing) => {
        const product = findProductById(listing.productId);
        return product ? isDescendantCategory(product.categoryId, entry.slug) : false;
      }).length
    }));

  return {
    categoryId: category.categoryId,
    slug: category.slug,
    name: category.name,
    description: category.description,
    breadcrumbs: buildBreadcrumbs(category),
    childCategories,
    metrics: {
      products: productCount,
      brands: new Set(activeProducts.map((product) => product.brandName)).size,
      sellers: new Set(
        getActiveListings()
          .filter((listing) => {
            const product = findProductById(listing.productId);
            return product ? isDescendantCategory(product.categoryId, slug) : false;
          })
          .map((listing) => listing.sellerId)
      ).size
    }
  };
}

function buildProductDetail(slug: string) {
  const product = findProductBySlug(slug);

  if (!product) {
    return null;
  }

  const category = findCategoryById(product.categoryId);

  if (!category) {
    return null;
  }

  const offers = state.listings
    .filter(
      (listing) =>
        listing.productId === product.productId &&
        listing.isActive &&
        listing.status === "ACTIVE"
    )
    .sort((left, right) => left.priceAmount - right.priceAmount)
    .map((listing) => {
      const seller = findSellerById(listing.sellerId);
      const variant = product.variants.find((entry) => entry.id === listing.variantId) ?? null;

      return {
        listingId: listing.listingId,
        sellerSku: listing.sellerSku,
        seller: {
          sellerId: listing.sellerId,
          name: seller?.displayName ?? "Unknown seller"
        },
        pricing: {
          current: money(listing.priceAmount),
          compareAt: listing.compareAtAmount ? money(listing.compareAtAmount) : null
        },
        availability: {
          inStock: availableQuantity(listing) > 0,
          availableQuantity: availableQuantity(listing),
          leadTimeDays: listing.leadTimeDays
        },
        subtitle: variant?.title ?? product.subtitle
      };
    });

  return {
    productId: product.productId,
    slug: product.slug,
    title: product.title,
    subtitle: product.subtitle,
    description: product.description,
    brand: {
      name: product.brandName
    },
    breadcrumbs: buildBreadcrumbs(category),
    gallery: product.gallery,
    highlights: product.highlights.map((highlight) => {
      const [name, value] = highlight.split(/(?<=^[^0-9]+)\s/);

      return {
        name: name ?? highlight,
        value: value ?? highlight
      };
    }),
    variants: product.variants,
    offers,
    specifications: product.specifications,
    relatedProducts: product.relatedProductIds
      .map((productId) => {
        const relatedListing = getActiveListings().find((entry) => entry.productId === productId);
        return relatedListing ? buildProductListItem(relatedListing) : null;
      })
      .filter((item): item is NonNullable<ReturnType<typeof buildProductListItem>> => Boolean(item))
  };
}

function getActivePromotionSummaries() {
  return state.promotions.filter((promotion) => promotion.isActive);
}

function getCouponPromotion(couponCode: string | null) {
  if (!couponCode) {
    return null;
  }

  const normalized = couponCode.trim().toUpperCase();

  return (
    getActivePromotionSummaries().find((promotion) =>
      promotion.coupons.some(
        (coupon) => coupon.code === normalized && coupon.status === "ACTIVE"
      )
    ) ?? null
  );
}

function calculateCartDiscounts(cart: CartState) {
  const subtotalAmount = cart.items.reduce((sum, item) => {
    const listing = findListingById(item.listingId);
    return sum + (listing ? listing.priceAmount * item.quantity : 0);
  }, 0);
  const promotion = getCouponPromotion(cart.couponCode);

  if (!promotion || promotion.rules.length === 0) {
    return {
      subtotal: money(subtotalAmount),
      discountTotal: money(0),
      total: money(subtotalAmount),
      discounts: [] as DiscountSummary[]
    };
  }

  const rule = promotion.rules[0];
  let discountAmount = 0;

  if (promotion.type === "PERCENTAGE" && rule.configuration.percentage) {
    discountAmount = Math.floor(
      subtotalAmount * (rule.configuration.percentage / 100)
    );
  } else if (promotion.type === "FIXED_AMOUNT" && rule.configuration.amount) {
    discountAmount = rule.configuration.amount;
  } else if (
    promotion.type === "CART_THRESHOLD" &&
    rule.configuration.thresholdAmount &&
    subtotalAmount >= rule.configuration.thresholdAmount
  ) {
    discountAmount =
      rule.configuration.amount ??
      Math.floor(subtotalAmount * ((rule.configuration.percentage ?? 0) / 100));
  }

  discountAmount = Math.max(0, Math.min(discountAmount, subtotalAmount));

  return {
    subtotal: money(subtotalAmount),
    discountTotal: money(discountAmount),
    total: money(subtotalAmount - discountAmount),
    discounts:
      discountAmount > 0
        ? [
            {
              promotionId: promotion.promotionId,
              couponCode: cart.couponCode,
              label: promotion.name,
              description: promotion.description,
              amount: money(discountAmount)
            }
          ]
        : []
  };
}

function getCartForUser(userId: string) {
  const cart = state.carts[userId];

  if (!cart) {
    return null;
  }

  const pricing = calculateCartDiscounts(cart);
  const activeCheckout =
    cart.activeCheckoutSessionId !== null
      ? state.checkouts[cart.activeCheckoutSessionId] ?? null
      : null;

  return {
    cartId: cart.cartId,
    status: cart.status,
    couponCode: cart.couponCode,
    itemCount: cart.items.reduce((sum, item) => sum + item.quantity, 0),
    items: cart.items
      .map((item) => {
        const listing = findListingById(item.listingId);
        const product = listing ? findProductById(listing.productId) : null;
        const seller = listing ? findSellerById(listing.sellerId) : null;

        if (!listing || !product || !seller) {
          return null;
        }

        return {
          itemId: item.itemId,
          listingId: listing.listingId,
          slug: product.slug,
          title: product.title,
          subtitle: product.subtitle,
          image: product.gallery[0] ?? null,
          quantity: item.quantity,
          seller: {
            sellerId: seller.sellerId,
            name: seller.displayName
          },
          availability: {
            inStock: availableQuantity(listing) > 0,
            availableQuantity: availableQuantity(listing),
            leadTimeDays: listing.leadTimeDays
          },
          canFulfill: availableQuantity(listing) >= item.quantity,
          pricing: {
            unit: money(listing.priceAmount),
            lineTotal: money(listing.priceAmount * item.quantity)
          }
        };
      })
      .filter(Boolean),
    totals: pricing,
    discounts: pricing.discounts,
    notes: [
      "Cart totals are recalculated on every mutation.",
      "Checkout creates a time-boxed stock reservation before payment begins.",
      "Payment confirmation settles the reservation into an order."
    ],
    activeCheckout:
      activeCheckout &&
      activeCheckout.status !== "COMPLETED" &&
      activeCheckout.status !== "EXPIRED"
        ? {
            checkoutSessionId: activeCheckout.checkoutSessionId,
            reservationExpiresAt: activeCheckout.reservationExpiresAt,
            reservationCount: activeCheckout.reservations.filter(
              (reservation) => reservation.status === "ACTIVE"
            ).length,
            reservedUnits: activeCheckout.reservations
              .filter((reservation) => reservation.status === "ACTIVE")
              .reduce((sum, reservation) => sum + reservation.quantity, 0)
          }
        : null
  };
}

function buildCheckoutDetail(checkoutSessionId: string) {
  const checkout = state.checkouts[checkoutSessionId];

  if (!checkout) {
    return null;
  }

  return {
    checkoutSessionId: checkout.checkoutSessionId,
    cartId: checkout.cartId,
    status: checkout.status,
    amount: checkout.amount,
    reservationExpiresAt: checkout.reservationExpiresAt,
    discounts: checkout.discounts,
    reservations: checkout.reservations.map((reservation) => {
      const listing = findListingById(reservation.listingId);
      const product = listing ? findProductById(listing.productId) : null;
      const seller = listing ? findSellerById(listing.sellerId) : null;

      return {
        reservationId: reservation.reservationId,
        listingId: reservation.listingId,
        title: product?.title ?? "Unknown product",
        slug: product?.slug ?? "missing-product",
        subtitle: product?.subtitle,
        seller: {
          sellerId: seller?.sellerId ?? "missing-seller",
          name: seller?.displayName ?? "Unknown seller"
        },
        quantity: reservation.quantity,
        expiresAt: reservation.expiresAt
      };
    }),
    paymentAttempts: checkout.paymentAttempts,
    order: checkout.orderNumber
      ? {
          number: checkout.orderNumber
        }
      : null
  };
}

function buildOrderDetail(orderNumber: string) {
  const order = state.orders.find((entry) => entry.number === orderNumber) ?? null;

  if (!order) {
    return null;
  }

  return {
    orderId: order.orderId,
    number: order.number,
    status: order.status,
    paymentStatus: order.paymentStatus,
    subtotal: order.subtotal,
    discountTotal: order.discountTotal,
    total: order.total,
    itemCount: order.itemCount,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    placedAt: order.placedAt,
    discounts: order.discounts,
    items: order.items.map((item) => {
      const listing = findListingById(item.listingId);
      const product = listing ? findProductById(listing.productId) : null;
      const seller = listing ? findSellerById(listing.sellerId) : null;

      return {
        orderItemId: item.orderItemId,
        slug: product?.slug ?? "missing-product",
        title: product?.title ?? "Unknown product",
        seller: {
          sellerId: seller?.sellerId ?? "missing-seller",
          name: seller?.displayName ?? "Unknown seller"
        },
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice
      };
    }),
    statusHistory: order.statusHistory,
    refunds: order.refunds
  };
}

function buildOrderSummary(order: OrderState) {
  const customer = order.userId
    ? Object.values(state.users).find((user) => user.id === order.userId) ?? null
    : null;

  return {
    orderId: order.orderId,
    number: order.number,
    status: order.status,
    paymentStatus: order.paymentStatus,
    total: order.total,
    subtotal: order.subtotal,
    discountTotal: order.discountTotal,
    itemCount: order.itemCount,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    placedAt: order.placedAt,
    customer: customer
      ? {
          label: `${customer.firstName} ${customer.lastName}`,
          email: customer.email
        }
      : null
  };
}

function buildAdminDashboard() {
  return {
    metrics: {
      categories: state.categories.length,
      products: state.products.length,
      activeListings: getActiveListings().length,
      pendingOrders: state.orders.filter((order) =>
        ["CREATED", "PAYMENT_PENDING", "PAID", "PROCESSING"].includes(order.status)
      ).length,
      customers: Object.values(state.users).filter((user) =>
        user.roles.some((role) => role.code === "CUSTOMER")
      ).length,
      activePromotions: getActivePromotionSummaries().length
    },
    notes: [
      "Catalog changes immediately affect storefront browsing and seller operations.",
      "Inventory edits remain visible through the same read model used by shoppers.",
      "Promotion actions are reflected on the next cart repricing pass."
    ]
  };
}

function buildAdminCatalogOptions() {
  return {
    categories: state.categories.map((category) => ({
      categoryId: category.categoryId,
      name: category.name
    })),
    sellers: state.sellers.map((seller) => ({
      sellerId: seller.sellerId,
      displayName: seller.displayName,
      status: seller.status
    }))
  };
}

function buildAdminCategories() {
  return state.categories
    .slice()
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map((category) => ({
      categoryId: category.categoryId,
      parentId: category.parentId,
      parentName: category.parentId ? findCategoryById(category.parentId)?.name ?? null : null,
      name: category.name,
      slug: category.slug,
      description: category.description,
      sortOrder: category.sortOrder,
      isActive: category.isActive,
      productCount: state.products.filter((product) =>
        isDescendantCategory(product.categoryId, category.slug)
      ).length,
      childCount: state.categories.filter(
        (entry) => entry.parentId === category.categoryId
      ).length
    }));
}

function buildAdminProducts() {
  return state.products
    .slice()
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .map((product) => {
      const listing = getActiveListings().find((entry) => entry.productId === product.productId) ?? null;
      const seller = listing ? findSellerById(listing.sellerId) : null;

      return {
        productId: product.productId,
        listingId: listing?.listingId ?? null,
        title: product.title,
        slug: product.slug,
        description: product.description,
        status: product.status,
        categoryId: product.categoryId,
        brandName: product.brandName,
        sellerId: seller?.sellerId ?? null,
        sellerName: seller?.displayName ?? null,
        sellerSku: listing?.sellerSku ?? "",
        variantTitle:
          product.variants.find((entry) => entry.id === listing?.variantId)?.title ?? null,
        leadTimeDays: listing?.leadTimeDays ?? 2,
        price: listing ? money(listing.priceAmount) : null,
        compareAtPrice: listing?.compareAtAmount ? money(listing.compareAtAmount) : null,
        inventory: listing
          ? {
              onHand: listing.inventory.onHand,
              safetyStock: listing.inventory.safetyStock,
              availableQuantity: availableQuantity(listing)
            }
          : null,
        image: product.gallery[0] ?? null,
        listingCount: state.listings.filter((entry) => entry.productId === product.productId).length,
        updatedAt: product.updatedAt
      };
    });
}

function buildAdminInventory(lowStockOnly = false) {
  return state.listings
    .filter((listing) => (lowStockOnly ? isLowStock(listing) : true))
    .map((listing) => {
      const product = findProductById(listing.productId);
      const seller = findSellerById(listing.sellerId);

      return {
        inventoryItemId: listing.inventory.inventoryItemId,
        listingId: listing.listingId,
        productTitle: product?.title ?? "Unknown product",
        sellerName: seller?.displayName ?? "Unknown seller",
        sellerSku: listing.sellerSku,
        status: listing.status,
        onHand: listing.inventory.onHand,
        reserved: listing.inventory.reserved,
        safetyStock: listing.inventory.safetyStock,
        availableQuantity: availableQuantity(listing),
        leadTimeDays: listing.leadTimeDays
      };
    });
}

function buildAdminOrderDetail(number: string) {
  const order = buildOrderDetail(number);

  if (!order) {
    return null;
  }

  const source = state.orders.find((entry) => entry.number === number);
  const customer =
    source?.userId
      ? Object.values(state.users).find((user) => user.id === source.userId) ?? null
      : null;
  const seller = source?.sellerId ? findSellerById(source.sellerId) : null;

  return {
    ...order,
    customer: customer
      ? {
          label: `${customer.firstName} ${customer.lastName}`,
          email: customer.email
        }
      : null,
    seller: seller
      ? {
          label: seller.displayName
        }
      : null
  };
}

function buildAdminCustomers() {
  return Object.values(state.users)
    .filter((user) => user.roles.some((role) => role.code === "CUSTOMER"))
    .map((user) => {
      const orders = state.orders.filter((order) => order.userId === user.id);
      return {
        userId: user.id,
        fullName: `${user.firstName} ${user.lastName}`,
        email: user.email,
        isActive: true,
        roles: user.roles.map((role) => role.code),
        orderCount: orders.length,
        totalSpent: money(orders.reduce((sum, order) => sum + order.total.amount, 0)),
        lastOrderAt: orders[0]?.placedAt ?? null
      };
    });
}

function buildAdminSellers() {
  return state.sellers.map((seller) => {
    const listings = state.listings.filter((listing) => listing.sellerId === seller.sellerId);
    const owner =
      Object.values(state.users).find((user) => user.id === seller.ownerUserId) ?? null;

    return {
      sellerId: seller.sellerId,
      slug: seller.slug,
      displayName: seller.displayName,
      legalName: seller.legalName,
      contactEmail: seller.contactEmail,
      status: seller.status,
      ownerUserEmail: owner?.email ?? null,
      listingCount: listings.length,
      activeListings: listings.filter((listing) => listing.isActive).length,
      lowStockListings: listings.filter((listing) => isLowStock(listing)).length
    };
  });
}

function buildAdminOperations() {
  return {
    metrics: {
      searchDocuments: getActiveListings().length,
      reindexJobs: state.jobs.length,
      activeReservations: Object.values(state.checkouts).reduce(
        (sum, checkout) =>
          sum +
          checkout.reservations.filter((reservation) => reservation.status === "ACTIVE").length,
        0
      )
    },
    recentReindexJobs: state.jobs.slice(0, 5),
    recentSyncLogs: state.syncLogs.slice(0, 5)
  };
}

function buildSellerDashboard(sellerId: string) {
  const seller = findSellerById(sellerId);
  const listings = state.listings.filter((listing) => listing.sellerId === sellerId);
  const orders = state.orders.filter((order) => order.sellerId === sellerId);

  return {
    seller: {
      sellerId,
      displayName: seller?.displayName ?? "Unknown seller",
      status: seller?.status ?? "SUSPENDED"
    },
    metrics: {
      activeListings: listings.filter((listing) => listing.isActive).length,
      lowStockListings: listings.filter((listing) => isLowStock(listing)).length,
      availableUnits: listings.reduce((sum, listing) => sum + availableQuantity(listing), 0),
      reservedUnits: listings.reduce((sum, listing) => sum + listing.inventory.reserved, 0),
      openOrders: orders.filter((order) =>
        ["CREATED", "PAYMENT_PENDING", "PAID", "PROCESSING"].includes(order.status)
      ).length,
      totalOrders: orders.length
    },
    notes: [
      "Inventory edits from this workspace update the same catalog availability shoppers see.",
      "Seller order totals reflect only the active merchant contribution to the order."
    ]
  };
}

function buildSellerListings(sellerId: string) {
  return state.listings
    .filter((listing) => listing.sellerId === sellerId)
    .map((listing) => {
      const product = findProductById(listing.productId);
      const variant =
        product?.variants.find((entry) => entry.id === listing.variantId) ?? null;

      return {
        listingId: listing.listingId,
        inventoryItemId: listing.inventory.inventoryItemId,
        title: product?.title ?? "Unknown product",
        variantTitle: variant?.title ?? null,
        sellerSku: listing.sellerSku,
        status: listing.status,
        isActive: listing.isActive,
        leadTimeDays: listing.leadTimeDays,
        price: money(listing.priceAmount),
        inventory: {
          onHand: listing.inventory.onHand,
          reserved: listing.inventory.reserved,
          safetyStock: listing.inventory.safetyStock,
          availableQuantity: availableQuantity(listing)
        }
      };
    });
}

function buildSellerOrders(sellerId: string) {
  return state.orders
    .filter((order) => order.sellerId === sellerId)
    .map((order) => {
      const customer =
        order.userId
          ? Object.values(state.users).find((user) => user.id === order.userId) ?? null
          : null;

      return {
        orderId: order.orderId,
        number: order.number,
        status: order.status,
        paymentStatus: order.paymentStatus,
        total: order.total,
        itemCount: order.itemCount,
        createdAt: order.createdAt,
        placedAt: order.placedAt,
        customer: {
          label: customer ? `${customer.firstName} ${customer.lastName}` : "Guest",
          email: customer?.email ?? null
        }
      };
    });
}

function generateOrderNumber() {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = String(state.nextOrderCounter).padStart(4, "0");
  state.nextOrderCounter += 1;
  return `VLR-${datePart}-DEMO${suffix}`;
}

function createCheckout(userId: string) {
  const cart = state.carts[userId];

  if (!cart || cart.items.length === 0) {
    return {
      statusCode: 400,
      body: {
        message: "The cart is empty."
      }
    };
  }

  if (cart.activeCheckoutSessionId) {
    return {
      statusCode: 200,
      body: {
        checkoutSessionId: cart.activeCheckoutSessionId
      }
    };
  }

  for (const line of cart.items) {
    const listing = findListingById(line.listingId);

    if (!listing || availableQuantity(listing) < line.quantity) {
      return {
        statusCode: 409,
        body: {
          message: "The requested quantity is no longer available."
        }
      };
    }
  }

  const pricing = calculateCartDiscounts(cart);
  const checkoutSessionId = `checkout-${randomUUID()}`;
  const reservationExpiresAt = iso(15);
  const reservations = cart.items.map((line) => {
    const listing = findListingById(line.listingId)!;
    listing.inventory.reserved += line.quantity;
    listing.updatedAt = iso();

    return {
      reservationId: `reservation-${randomUUID()}`,
      inventoryItemId: listing.inventory.inventoryItemId,
      listingId: line.listingId,
      quantity: line.quantity,
      status: "ACTIVE" as const,
      expiresAt: reservationExpiresAt
    };
  });

  state.checkouts[checkoutSessionId] = {
    checkoutSessionId,
    cartId: cart.cartId,
    userId,
    status: "STARTED",
    amount: pricing.total,
    discounts: pricing.discounts,
    reservationExpiresAt,
    reservations,
    paymentAttempts: [],
    orderNumber: null,
    createdAt: iso(),
    updatedAt: iso()
  };
  cart.activeCheckoutSessionId = checkoutSessionId;
  cart.updatedAt = iso();

  return {
    statusCode: 201,
    body: {
      checkoutSessionId
    }
  };
}

function createPaymentAttempt(userId: string, checkoutSessionId: string) {
  const checkout = state.checkouts[checkoutSessionId];

  if (!checkout || checkout.userId !== userId) {
    return {
      statusCode: 404,
      body: {
        message: "Checkout session not found."
      }
    };
  }

  const existingPendingAttempt =
    checkout.paymentAttempts.find((attempt) => attempt.status === "PENDING") ?? null;

  if (existingPendingAttempt) {
    return {
      statusCode: 200,
      body: existingPendingAttempt
    };
  }

  const attempt: PaymentAttempt = {
    attemptId: `attempt-${randomUUID()}`,
    checkoutSessionId,
    provider: "stripe",
    providerPaymentIntentId: `pi_local_${checkoutSessionId.replace(/[^a-zA-Z0-9]/g, "")}`,
    clientSecret: null,
    status: "PENDING",
    amount: checkout.amount,
    createdAt: iso(),
    updatedAt: iso()
  };

  checkout.paymentAttempts.unshift(attempt);
  checkout.status = "PAYMENT_PENDING";
  checkout.updatedAt = iso();

  return {
    statusCode: 201,
    body: attempt
  };
}

function confirmPaymentAttempt(
  userId: string,
  attemptId: string,
  scenario: "success" | "declined" | "requires_action"
) {
  const checkout = Object.values(state.checkouts).find((entry) =>
    entry.paymentAttempts.some((attempt) => attempt.attemptId === attemptId)
  );

  if (!checkout || checkout.userId !== userId) {
    return {
      statusCode: 404,
      body: {
        message: "Payment attempt not found."
      }
    };
  }

  const attempt = checkout.paymentAttempts.find((entry) => entry.attemptId === attemptId);

  if (!attempt) {
    return {
      statusCode: 404,
      body: {
        message: "Payment attempt not found."
      }
    };
  }

  attempt.updatedAt = iso();

  if (scenario === "declined") {
    attempt.status = "FAILED";
    checkout.status = "FAILED";
    checkout.updatedAt = iso();

    return {
      statusCode: 200,
      body: {
        attempt,
        checkout: {
          status: checkout.status
        },
        order: null,
        message: "Payment failed. The reservation is still active until it expires."
      }
    };
  }

  if (scenario === "requires_action") {
    attempt.status = "REQUIRES_ACTION";
    checkout.status = "PAYMENT_PENDING";
    checkout.updatedAt = iso();

    return {
      statusCode: 200,
      body: {
        attempt,
        checkout: {
          status: checkout.status
        },
        order: null,
        message: "Payment requires additional customer action."
      }
    };
  }

  attempt.status = "SUCCEEDED";
  checkout.status = "COMPLETED";
  checkout.updatedAt = iso();

  if (!checkout.orderNumber) {
    const cart = state.carts[userId];
    const pricing = calculateCartDiscounts(cart);
    const orderNumber = generateOrderNumber();
    const orderItems = cart.items.map((line) => ({
      orderItemId: `order-item-${randomUUID()}`,
      listingId: line.listingId,
      quantity: line.quantity,
      unitPrice: money(findListingById(line.listingId)?.priceAmount ?? 0),
      totalPrice: money((findListingById(line.listingId)?.priceAmount ?? 0) * line.quantity)
    }));
    const sellerIds = new Set(
      cart.items
        .map((line) => findListingById(line.listingId)?.sellerId ?? null)
        .filter((value): value is string => Boolean(value))
    );

    checkout.reservations.forEach((reservation) => {
      const listing = findListingById(reservation.listingId);

      if (listing) {
        listing.inventory.reserved = Math.max(
          listing.inventory.reserved - reservation.quantity,
          0
        );
        listing.inventory.onHand = Math.max(
          listing.inventory.onHand - reservation.quantity,
          0
        );
        listing.updatedAt = iso();
      }

      reservation.status = "CONSUMED";
    });

    const order: OrderState = {
      orderId: `order-${randomUUID()}`,
      number: orderNumber,
      userId,
      sellerId: sellerIds.size === 1 ? Array.from(sellerIds)[0] : null,
      status: "PAID",
      paymentStatus: "SUCCEEDED",
      subtotal: pricing.subtotal,
      discountTotal: pricing.discountTotal,
      total: pricing.total,
      itemCount: cart.items.reduce((sum, line) => sum + line.quantity, 0),
      items: orderItems,
      discounts: checkout.discounts,
      placedAt: iso(),
      createdAt: iso(),
      updatedAt: iso(),
      statusHistory: [
        {
          status: "CREATED",
          note: "Order created from checkout settlement.",
          createdAt: iso()
        },
        {
          status: "PAID",
          note: "Payment settled successfully.",
          createdAt: iso()
        }
      ],
      refunds: []
    };

    state.orders.unshift(order);
    checkout.orderNumber = orderNumber;
    cart.items = [];
    cart.couponCode = null;
    cart.activeCheckoutSessionId = null;
    cart.status = "CONVERTED";
    cart.updatedAt = iso();
  }

  return {
    statusCode: 200,
    body: {
      attempt,
      checkout: {
        status: checkout.status
      },
      order: checkout.orderNumber
        ? {
            number: checkout.orderNumber
          }
        : null,
      message: "Payment settled and the order was created."
    }
  };
}

function updateInventoryRecord(
  inventoryItemId: string,
  input: { onHand: number; safetyStock: number; leadTimeDays: number; note?: string | null }
) {
  const listing = state.listings.find(
    (entry) => entry.inventory.inventoryItemId === inventoryItemId
  );

  if (!listing) {
    return null;
  }

  listing.inventory.onHand = input.onHand;
  listing.inventory.safetyStock = input.safetyStock;
  listing.leadTimeDays = input.leadTimeDays;
  listing.updatedAt = iso();
  state.syncLogs.unshift({
    logId: `sync-${randomUUID()}`,
    documentId: listing.listingId,
    message: input.note ?? "Inventory updated from an operator workflow.",
    status: "SUCCEEDED",
    createdAt: iso()
  });

  return buildAdminInventory(false).find(
    (entry) => entry.inventoryItemId === inventoryItemId
  );
}

function savePromotion(payload: Record<string, unknown>, promotionId?: string) {
  const existing =
    promotionId
      ? state.promotions.find((promotion) => promotion.promotionId === promotionId) ?? null
      : null;
  const nextPromotion: PromotionRecord = {
    promotionId: existing?.promotionId ?? `promotion-${randomUUID()}`,
    name: String(payload.name ?? existing?.name ?? "Promotion"),
    code:
      payload.code === null || payload.code === undefined
        ? null
        : String(payload.code).trim().toUpperCase(),
    description: String(payload.description ?? existing?.description ?? ""),
    type: (payload.type as PromotionType | undefined) ?? existing?.type ?? "PERCENTAGE",
    stackingMode:
      (payload.stackingMode as PromotionStackingMode | undefined) ??
      existing?.stackingMode ??
      "STACKABLE",
    priority: Number(payload.priority ?? existing?.priority ?? 100),
    isActive: Boolean(payload.isActive ?? existing?.isActive ?? true),
    startsAt:
      payload.startsAt === null
        ? null
        : (payload.startsAt as string | undefined) ?? existing?.startsAt ?? null,
    endsAt:
      payload.endsAt === null
        ? null
        : (payload.endsAt as string | undefined) ?? existing?.endsAt ?? null,
    rules: Array.isArray(payload.rule)
      ? (payload.rule as PromotionRule[])
      : payload.rule
        ? [payload.rule as PromotionRule]
        : existing?.rules ?? [],
    coupons: Array.isArray(payload.coupons)
      ? (payload.coupons as Array<Record<string, unknown>>).map((coupon) => ({
          couponId:
            (coupon.couponId as string | undefined) ?? `coupon-${randomUUID()}`,
          code: String(coupon.code ?? "").trim().toUpperCase(),
          status:
            (coupon.status as "ACTIVE" | "DISABLED" | "EXPIRED" | undefined) ?? "ACTIVE",
          usageLimit:
            coupon.usageLimit === null || coupon.usageLimit === undefined
              ? null
              : Number(coupon.usageLimit),
          startsAt:
            coupon.startsAt === null
              ? null
              : (coupon.startsAt as string | undefined) ?? null,
          endsAt:
            coupon.endsAt === null
              ? null
              : (coupon.endsAt as string | undefined) ?? null
        }))
      : existing?.coupons ?? []
  };

  state.promotions = [
    nextPromotion,
    ...state.promotions.filter((promotion) => promotion.promotionId !== nextPromotion.promotionId)
  ].sort((left, right) => left.priority - right.priority);

  return nextPromotion;
}

const server = createServer(async (request, response) => {
  setCorsHeaders(request, response);

  if (request.method === "OPTIONS") {
    response.writeHead(204);
    response.end();
    return;
  }

  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
  const path = url.pathname;

  if (request.method === "POST" && path === "/api/test/reset") {
    resetState();
    sendJson(response, 200, {
      ok: true
    });
    return;
  }

  if (request.method === "GET" && path === "/health") {
    sendJson(response, 200, {
      status: "ok"
    });
    return;
  }

  if (request.method === "POST" && path === "/api/auth/login") {
    const payload = await readJson<{ email?: string; password?: string }>(request);
    const email = payload.email?.trim().toLowerCase() ?? "";
    const password = payload.password ?? "";
    const user = state.users[email];

    if (!user || user.password !== password) {
      sendJson(response, 401, {
        message: "Invalid credentials."
      });
      return;
    }

    const token = `session-${randomUUID()}`;
    state.sessions[token] = user.email;
    sendJson(
      response,
      200,
      {
        sessionToken: token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          roles: user.roles
        }
      },
      {
        "Set-Cookie": `velora_session=${token}; Path=/; HttpOnly; SameSite=Lax`
      }
    );
    return;
  }

  if (request.method === "GET" && path === "/api/auth/session") {
    const user = getSessionUser(request);

    if (!user) {
      sendJson(response, 401, {
        message: "No active session."
      });
      return;
    }

    sendJson(response, 200, {
      sessionToken: "active-session",
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: user.roles
      }
    });
    return;
  }

  if (request.method === "GET" && path === "/api/catalog/overview") {
    sendJson(response, 200, {
      scope: "catalog",
      metrics: {
        products: state.products.length,
        activeListings: getActiveListings().length,
        categories: state.categories.length
      },
      notes: [
        "Catalog counts are sourced from the same read model used by listings and product detail pages."
      ]
    });
    return;
  }

  if (request.method === "GET" && path === "/api/promotions/overview") {
    sendJson(response, 200, {
      scope: "promotions",
      metrics: {
        activePromotions: getActivePromotionSummaries().length,
        coupons: state.promotions.reduce(
          (sum, promotion) => sum + promotion.coupons.length,
          0
        )
      },
      notes: [
        "Promotion metrics include both automatic rules and coupon-triggered incentives."
      ]
    });
    return;
  }

  if (request.method === "GET" && path === "/api/catalog/navigation") {
    sendJson(response, 200, buildNavigation());
    return;
  }

  if (request.method === "GET" && path.startsWith("/api/catalog/categories/")) {
    const slug = decodeURIComponent(path.replace("/api/catalog/categories/", ""));
    const detail = buildCategoryDetail(slug);

    if (!detail) {
      sendJson(response, 404, {
        message: "Category not found."
      });
      return;
    }

    sendJson(response, 200, detail);
    return;
  }

  if (request.method === "GET" && path.startsWith("/api/catalog/products/")) {
    const slug = decodeURIComponent(path.replace("/api/catalog/products/", ""));
    const detail = buildProductDetail(slug);

    if (!detail) {
      sendJson(response, 404, {
        message: "Product not found."
      });
      return;
    }

    sendJson(response, 200, detail);
    return;
  }

  if (request.method === "GET" && path === "/api/search/products") {
    sendJson(response, 200, buildSearchResponse(url.searchParams));
    return;
  }

  if (request.method === "GET" && path === "/api/cart") {
    const session = getRoleUser(request, "CUSTOMER");

    if (!session.ok) {
      sendJson(response, session.statusCode, session.body);
      return;
    }

    sendJson(response, 200, getCartForUser(session.user.id));
    return;
  }

  if (request.method === "POST" && path === "/api/cart/items") {
    const session = getRoleUser(request, "CUSTOMER");

    if (!session.ok) {
      sendJson(response, session.statusCode, session.body);
      return;
    }

    const payload = await readJson<{ listingId?: string; quantity?: number }>(request);
    const listing = payload.listingId ? findListingById(payload.listingId) : null;
    const quantity = Number(payload.quantity ?? 1);

    if (!listing || quantity <= 0) {
      sendJson(response, 400, {
        message: "Invalid cart item payload."
      });
      return;
    }

    const cart = state.carts[session.user.id];
    const currentLine = cart.items.find((entry) => entry.listingId === listing.listingId);

    if (currentLine) {
      currentLine.quantity += quantity;
    } else {
      cart.items.push({
        itemId: `cart-item-${randomUUID()}`,
        listingId: listing.listingId,
        quantity
      });
    }

    cart.updatedAt = iso();
    sendJson(response, 201, getCartForUser(session.user.id));
    return;
  }

  if (request.method === "POST" && path === "/api/cart/coupon") {
    const session = getRoleUser(request, "CUSTOMER");

    if (!session.ok) {
      sendJson(response, session.statusCode, session.body);
      return;
    }

    const payload = await readJson<{ couponCode?: string }>(request);
    const promotion = getCouponPromotion(payload.couponCode?.toUpperCase() ?? null);

    if (!promotion || !payload.couponCode) {
      sendJson(response, 400, {
        message: "Coupon could not be applied."
      });
      return;
    }

    state.carts[session.user.id].couponCode = payload.couponCode.toUpperCase();
    state.carts[session.user.id].updatedAt = iso();
    sendJson(response, 200, getCartForUser(session.user.id));
    return;
  }

  if (request.method === "DELETE" && path === "/api/cart/coupon") {
    const session = getRoleUser(request, "CUSTOMER");

    if (!session.ok) {
      sendJson(response, session.statusCode, session.body);
      return;
    }

    state.carts[session.user.id].couponCode = null;
    state.carts[session.user.id].updatedAt = iso();
    sendJson(response, 200, getCartForUser(session.user.id));
    return;
  }

  if (request.method === "POST" && path === "/api/checkout/sessions") {
    const session = getRoleUser(request, "CUSTOMER");

    if (!session.ok) {
      sendJson(response, session.statusCode, session.body);
      return;
    }

    const result = createCheckout(session.user.id);
    sendJson(response, result.statusCode, result.body);
    return;
  }

  if (
    request.method === "GET" &&
    path.startsWith("/api/checkout/sessions/")
  ) {
    const session = getRoleUser(request, "CUSTOMER");

    if (!session.ok) {
      sendJson(response, session.statusCode, session.body);
      return;
    }

    const checkoutSessionId = decodeURIComponent(
      path.replace("/api/checkout/sessions/", "")
    );
    const checkout = state.checkouts[checkoutSessionId];

    if (!checkout || checkout.userId !== session.user.id) {
      sendJson(response, 404, {
        message: "Checkout session not found."
      });
      return;
    }

    sendJson(response, 200, buildCheckoutDetail(checkoutSessionId));
    return;
  }

  if (
    request.method === "POST" &&
    path.startsWith("/api/payments/checkout-sessions/") &&
    path.endsWith("/attempts")
  ) {
    const session = getRoleUser(request, "CUSTOMER");

    if (!session.ok) {
      sendJson(response, session.statusCode, session.body);
      return;
    }

    const checkoutSessionId = decodeURIComponent(
      path
        .replace("/api/payments/checkout-sessions/", "")
        .replace("/attempts", "")
    );
    const result = createPaymentAttempt(session.user.id, checkoutSessionId);
    sendJson(response, result.statusCode, result.body);
    return;
  }

  if (
    request.method === "POST" &&
    path.startsWith("/api/payments/attempts/") &&
    path.endsWith("/confirm")
  ) {
    const session = getRoleUser(request, "CUSTOMER");

    if (!session.ok) {
      sendJson(response, session.statusCode, session.body);
      return;
    }

    const payload = await readJson<{ scenario?: "success" | "declined" | "requires_action" }>(
      request
    );
    const attemptId = decodeURIComponent(
      path.replace("/api/payments/attempts/", "").replace("/confirm", "")
    );
    const result = confirmPaymentAttempt(
      session.user.id,
      attemptId,
      payload.scenario ?? "success"
    );
    sendJson(response, result.statusCode, result.body);
    return;
  }

  if (request.method === "GET" && path === "/api/orders") {
    const session = getRoleUser(request, "CUSTOMER");

    if (!session.ok) {
      sendJson(response, session.statusCode, session.body);
      return;
    }

    const orders = state.orders
      .filter((order) => order.userId === session.user.id)
      .map((order) => buildOrderSummary(order));
    sendJson(response, 200, orders);
    return;
  }

  if (request.method === "GET" && path.startsWith("/api/orders/")) {
    const session = getRoleUser(request, "CUSTOMER");

    if (!session.ok) {
      sendJson(response, session.statusCode, session.body);
      return;
    }

    const number = decodeURIComponent(path.replace("/api/orders/", ""));
    const order = state.orders.find(
      (entry) => entry.number === number && entry.userId === session.user.id
    );

    if (!order) {
      sendJson(response, 404, {
        message: "Order not found."
      });
      return;
    }

    sendJson(response, 200, buildOrderDetail(number));
    return;
  }

  if (request.method === "GET" && path === "/api/admin/dashboard") {
    const session = getRoleUser(request, "ADMIN");

    if (!session.ok) {
      sendJson(response, session.statusCode, session.body);
      return;
    }

    sendJson(response, 200, buildAdminDashboard());
    return;
  }

  if (request.method === "GET" && path === "/api/admin/catalog-options") {
    const session = getRoleUser(request, "ADMIN");

    if (!session.ok) {
      sendJson(response, session.statusCode, session.body);
      return;
    }

    sendJson(response, 200, buildAdminCatalogOptions());
    return;
  }

  if (request.method === "GET" && path === "/api/admin/categories") {
    const session = getRoleUser(request, "ADMIN");

    if (!session.ok) {
      sendJson(response, session.statusCode, session.body);
      return;
    }

    sendJson(response, 200, buildAdminCategories());
    return;
  }

  if (request.method === "GET" && path === "/api/admin/products") {
    const session = getRoleUser(request, "ADMIN");

    if (!session.ok) {
      sendJson(response, session.statusCode, session.body);
      return;
    }

    sendJson(response, 200, buildAdminProducts());
    return;
  }

  if (request.method === "GET" && path === "/api/admin/inventory") {
    const session = getRoleUser(request, "ADMIN");

    if (!session.ok) {
      sendJson(response, session.statusCode, session.body);
      return;
    }

    sendJson(
      response,
      200,
      buildAdminInventory(url.searchParams.get("lowStock") === "true")
    );
    return;
  }

  if (request.method === "PATCH" && path.startsWith("/api/admin/inventory/")) {
    const session = getRoleUser(request, "ADMIN");

    if (!session.ok) {
      sendJson(response, session.statusCode, session.body);
      return;
    }

    const inventoryItemId = decodeURIComponent(path.replace("/api/admin/inventory/", ""));
    const payload = await readJson<{
      onHand: number;
      safetyStock: number;
      leadTimeDays: number;
      note?: string | null;
    }>(request);
    const nextItem = updateInventoryRecord(inventoryItemId, payload);

    if (!nextItem) {
      sendJson(response, 404, {
        message: "Inventory record not found."
      });
      return;
    }

    sendJson(response, 200, nextItem);
    return;
  }

  if (request.method === "GET" && path === "/api/admin/orders") {
    const session = getRoleUser(request, "ADMIN");

    if (!session.ok) {
      sendJson(response, session.statusCode, session.body);
      return;
    }

    sendJson(response, 200, state.orders.map((order) => buildOrderSummary(order)));
    return;
  }

  if (request.method === "GET" && path.startsWith("/api/admin/orders/")) {
    const session = getRoleUser(request, "ADMIN");

    if (!session.ok) {
      sendJson(response, session.statusCode, session.body);
      return;
    }

    const number = decodeURIComponent(path.replace("/api/admin/orders/", ""));
    const detail = buildAdminOrderDetail(number);

    if (!detail) {
      sendJson(response, 404, {
        message: "Order not found."
      });
      return;
    }

    sendJson(response, 200, detail);
    return;
  }

  if (request.method === "GET" && path === "/api/admin/customers") {
    const session = getRoleUser(request, "ADMIN");

    if (!session.ok) {
      sendJson(response, session.statusCode, session.body);
      return;
    }

    sendJson(response, 200, buildAdminCustomers());
    return;
  }

  if (request.method === "GET" && path === "/api/admin/sellers") {
    const session = getRoleUser(request, "ADMIN");

    if (!session.ok) {
      sendJson(response, session.statusCode, session.body);
      return;
    }

    sendJson(response, 200, buildAdminSellers());
    return;
  }

  if (request.method === "GET" && path === "/api/admin/operations") {
    const session = getRoleUser(request, "ADMIN");

    if (!session.ok) {
      sendJson(response, session.statusCode, session.body);
      return;
    }

    sendJson(response, 200, buildAdminOperations());
    return;
  }

  if (request.method === "POST" && path === "/api/admin/operations/reindex") {
    const session = getRoleUser(request, "ADMIN");

    if (!session.ok) {
      sendJson(response, session.statusCode, session.body);
      return;
    }

    state.jobs.unshift({
      jobId: `job-${randomUUID()}`,
      scope: "catalog-full",
      status: "SUCCEEDED",
      requestedByEmail: session.user.email,
      createdAt: iso()
    });
    state.syncLogs.unshift({
      logId: `sync-${randomUUID()}`,
      documentId: null,
      message: "Full catalog reindex completed.",
      status: "SUCCEEDED",
      createdAt: iso()
    });

    sendJson(response, 200, {
      ok: true
    });
    return;
  }

  if (
    request.method === "POST" &&
    path === "/api/admin/operations/release-expired-reservations"
  ) {
    const session = getRoleUser(request, "ADMIN");

    if (!session.ok) {
      sendJson(response, session.statusCode, session.body);
      return;
    }

    let releasedReservations = 0;
    Object.values(state.checkouts).forEach((checkout) => {
      checkout.reservations.forEach((reservation) => {
        if (reservation.status !== "ACTIVE") {
          return;
        }

        const listing = findListingById(reservation.listingId);

        if (listing) {
          listing.inventory.reserved = Math.max(
            listing.inventory.reserved - reservation.quantity,
            0
          );
        }

        reservation.status = "EXPIRED";
        releasedReservations += 1;
      });
    });

    sendJson(response, 200, {
      releasedReservations
    });
    return;
  }

  if (request.method === "GET" && path === "/api/promotions") {
    const session = getSessionUser(request);

    if (!session) {
      sendJson(response, 401, {
        message: "Authentication required."
      });
      return;
    }

    sendJson(response, 200, state.promotions);
    return;
  }

  if (request.method === "POST" && path === "/api/promotions") {
    const session = getRoleUser(request, "ADMIN");

    if (!session.ok) {
      sendJson(response, session.statusCode, session.body);
      return;
    }

    const payload = await readJson<Record<string, unknown>>(request);
    const promotion = savePromotion(payload);
    sendJson(response, 201, promotion);
    return;
  }

  if (request.method === "PATCH" && path.startsWith("/api/promotions/")) {
    const session = getRoleUser(request, "ADMIN");

    if (!session.ok) {
      sendJson(response, session.statusCode, session.body);
      return;
    }

    const payload = await readJson<Record<string, unknown>>(request);
    const promotionId = decodeURIComponent(path.replace("/api/promotions/", ""));
    const promotion = savePromotion(payload, promotionId);
    sendJson(response, 200, promotion);
    return;
  }

  if (request.method === "GET" && path === "/api/seller/dashboard") {
    const session = getRoleUser(request, "SELLER");

    if (!session.ok) {
      sendJson(response, session.statusCode, session.body);
      return;
    }

    const sellerId = state.users[session.user.email].sellerId;

    if (!sellerId) {
      sendJson(response, 404, {
        message: "Seller profile not found."
      });
      return;
    }

    sendJson(response, 200, buildSellerDashboard(sellerId));
    return;
  }

  if (request.method === "GET" && path === "/api/seller/listings") {
    const session = getRoleUser(request, "SELLER");

    if (!session.ok) {
      sendJson(response, session.statusCode, session.body);
      return;
    }

    const sellerId = state.users[session.user.email].sellerId;

    if (!sellerId) {
      sendJson(response, 404, {
        message: "Seller profile not found."
      });
      return;
    }

    sendJson(response, 200, buildSellerListings(sellerId));
    return;
  }

  if (request.method === "GET" && path === "/api/seller/orders") {
    const session = getRoleUser(request, "SELLER");

    if (!session.ok) {
      sendJson(response, session.statusCode, session.body);
      return;
    }

    const sellerId = state.users[session.user.email].sellerId;

    if (!sellerId) {
      sendJson(response, 404, {
        message: "Seller profile not found."
      });
      return;
    }

    sendJson(response, 200, buildSellerOrders(sellerId));
    return;
  }

  if (request.method === "PATCH" && path.startsWith("/api/seller/inventory/")) {
    const session = getRoleUser(request, "SELLER");

    if (!session.ok) {
      sendJson(response, session.statusCode, session.body);
      return;
    }

    const sellerId = state.users[session.user.email].sellerId;
    const inventoryItemId = decodeURIComponent(path.replace("/api/seller/inventory/", ""));
    const listing = state.listings.find(
      (entry) =>
        entry.inventory.inventoryItemId === inventoryItemId &&
        entry.sellerId === sellerId
    );

    if (!listing) {
      sendJson(response, 404, {
        message: "Inventory record not found."
      });
      return;
    }

    const payload = await readJson<{
      onHand: number;
      safetyStock: number;
      leadTimeDays: number;
      note?: string | null;
    }>(request);
    listing.inventory.onHand = payload.onHand;
    listing.inventory.safetyStock = payload.safetyStock;
    listing.leadTimeDays = payload.leadTimeDays;
    listing.updatedAt = iso();

    sendJson(response, 200, {
      ok: true
    });
    return;
  }

  sendJson(response, 404, {
    message: "Mock route not found.",
    path
  });
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Velora mock API listening on http://localhost:${port}`);
});

function shutdown() {
  server.close(() => {
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
