import { expect, test } from "@playwright/test";

const adminUrl = "http://localhost:3001";
const mockApiUrl = "http://localhost:4000/api";

async function resetMockState(
  request: Parameters<typeof test.beforeEach>[0]["request"],
) {
  const response = await request.post(`${mockApiUrl}/test/reset`);
  expect(response.ok()).toBeTruthy();
}

async function login(
  page: Parameters<typeof test>[0]["page"],
  {
    email,
    password = "Demo123!",
  }: {
    email: string;
    password?: string;
  },
) {
  const emailField = page.getByLabel("Email");
  const passwordField = page.getByLabel("Password");

  await emailField.fill("");
  await emailField.fill(email);
  await expect(emailField).toHaveValue(email);

  await passwordField.fill("");
  await passwordField.fill(password);
  await expect(passwordField).toHaveValue(password);

  await page.getByRole("button", { name: "Sign in" }).click();
}

test.beforeEach(async ({ request }) => {
  await resetMockState(request);
});

test("customer can browse from category to checkout confirmation", async ({
  page,
}) => {
  await page.goto("/categories");
  await page.getByRole("link", { name: "Phones" }).first().click();
  await expect(page).toHaveURL(/\/categories\/phones$/);

  await page.getByRole("link", { name: "NordWave Edge S" }).first().click();
  await expect(page).toHaveURL(/\/products\/nordwave-edge-s$/);

  await page.getByRole("button", { name: "Add lead offer to cart" }).click();
  await expect(page).toHaveURL(/\/login\?from=/);

  await login(page, { email: "customer@velora.local" });
  await expect(page).toHaveURL(/\/products\/nordwave-edge-s$/);

  await page.getByRole("button", { name: "Add lead offer to cart" }).click();
  await expect(page).toHaveURL(/\/cart$/);
  await expect(page.getByText("NordWave Edge S")).toBeVisible();

  await page
    .getByRole("button", { name: "Reserve stock for checkout" })
    .click();
  await expect(page).toHaveURL(/\/checkout\?session=/);

  await page.getByRole("button", { name: "Create payment attempt" }).click();
  await expect(
    page.getByText(
      "Payment attempt created. Choose a sandbox outcome to continue.",
    ),
  ).toBeVisible();

  await page.getByRole("button", { name: "Approve payment" }).click();
  await expect(page).toHaveURL(/\/checkout\/confirmation\/VLR-/);
  await expect(page.getByText("Payment settled successfully.")).toBeVisible();
});

test("customer can recover from a failed payment attempt and retry checkout", async ({
  page,
}) => {
  await page.goto("/products/nordwave-edge-s");
  await page.getByRole("button", { name: "Add lead offer to cart" }).click();
  await expect(page).toHaveURL(/\/login\?from=/);

  await login(page, { email: "customer@velora.local" });
  await expect(page).toHaveURL(/\/products\/nordwave-edge-s$/);

  await page.getByRole("button", { name: "Add lead offer to cart" }).click();
  await expect(page).toHaveURL(/\/cart$/);

  await page
    .getByRole("button", { name: "Reserve stock for checkout" })
    .click();
  await expect(page).toHaveURL(/\/checkout\?session=/);

  await page.getByRole("button", { name: "Create payment attempt" }).click();
  await page.getByRole("button", { name: "Simulate decline" }).click();
  await expect(
    page.getByText(
      "Payment failed. The reservation is still active until it expires.",
    ),
  ).toBeVisible();

  await page.getByRole("button", { name: "Approve payment" }).click();
  await expect(page).toHaveURL(/\/checkout\/confirmation\/VLR-/);
});

test("admin inventory updates become visible on the storefront", async ({
  page,
}) => {
  await page.goto(`${adminUrl}/`);
  await page.getByLabel("Admin email").fill("admin@velora.local");
  await page.getByLabel("Password").fill("Demo123!");
  await page.getByRole("button", { name: "Sign in" }).click();

  const inventorySection = page.locator("section#inventory");
  await expect(
    inventorySection.getByRole("heading", { name: "Inventory management" }),
  ).toBeVisible();

  await inventorySection.getByLabel("On-hand stock").fill("9");
  await inventorySection
    .getByLabel("Adjustment note")
    .fill("Cycle count verified");
  await inventorySection
    .getByRole("button", { name: "Update inventory" })
    .click();
  await expect(inventorySection.getByText("Inventory updated.")).toBeVisible();

  const storefrontPage = await page.context().newPage();
  await storefrontPage.goto("/products/nordwave-edge-s");
  await expect(storefrontPage.getByText("9 units ready to ship")).toBeVisible();
});

test("admin can create a coupon promotion and a customer can apply it", async ({
  browser,
}) => {
  const adminContext = await browser.newContext();
  const adminPage = await adminContext.newPage();

  await adminPage.goto(`${adminUrl}/`);
  await adminPage.getByLabel("Admin email").fill("admin@velora.local");
  await adminPage.getByLabel("Password").fill("Demo123!");
  await adminPage.getByRole("button", { name: "Sign in" }).click();

  const promotionSection = adminPage.locator("section#promotions");
  await promotionSection.getByRole("button", { name: "New" }).click();
  await promotionSection.getByLabel("Promotion name").fill("Flash 10");
  await promotionSection
    .getByLabel("Description")
    .fill("Stage 11 browser coverage promotion.");
  await promotionSection
    .getByRole("spinbutton", { name: "Percentage" })
    .fill("10");
  await promotionSection.getByLabel("Coupon code").fill("FLASH10");
  await promotionSection
    .getByRole("button", { name: "Create promotion" })
    .click();
  await expect(
    promotionSection.getByText("Promotion created successfully."),
  ).toBeVisible();

  const customerContext = await browser.newContext();
  const customerPage = await customerContext.newPage();

  await customerPage.goto("/products/nordwave-edge-s");
  await customerPage
    .getByRole("button", { name: "Add lead offer to cart" })
    .click();
  await expect(customerPage).toHaveURL(/\/login\?from=/);
  await login(customerPage, { email: "customer@velora.local" });
  await expect(customerPage).toHaveURL(/\/products\/nordwave-edge-s$/);
  await customerPage
    .getByRole("button", { name: "Add lead offer to cart" })
    .click();
  await expect(customerPage).toHaveURL(/\/cart$/);

  await customerPage.getByLabel("Coupon code").fill("FLASH10");
  await customerPage.getByRole("button", { name: "Apply coupon" }).click();
  await expect(customerPage.getByText("Coupon FLASH10")).toBeVisible();
  await expect(customerPage.getByText("Flash 10")).toBeVisible();

  await customerContext.close();
  await adminContext.close();
});

test("seller inventory updates stay consistent with the public product view", async ({
  page,
}) => {
  await page.goto("/login?from=/seller");
  await login(page, { email: "seller@velora.local" });
  await expect(page).toHaveURL(/\/seller$/);

  await page.getByRole("link", { name: /Listings/ }).click();
  await expect(page).toHaveURL(/\/seller\/listings$/);
  await expect(
    page.getByRole("heading", {
      name: "Manage stock and lead times without leaving the seller workspace.",
    }),
  ).toBeVisible();

  await page.getByLabel("On hand").fill("6");
  await page.getByLabel("Lead time").fill("5");
  await page.getByLabel("Operational note").fill("Inbound delivery received");
  await page.getByRole("button", { name: "Update stock" }).click();
  await expect(
    page.getByText("Inventory synced to the commerce engine."),
  ).toBeVisible();

  await page.goto("/products/nordwave-edge-s");
  await expect(page.getByText("6 units ready to ship")).toBeVisible();
  await expect(page.getByText("Lead time: 5 day(s)")).toBeVisible();
});
