const { test, expect } = require('@playwright/test');

const pages = [
  { name: 'Home', path: '/BaseSite/album/index.html' },
  { name: 'Checkout', path: '/BaseSite/album/checkout.html' },
  { name: 'Food Pickup', path: '/BaseSite/album/food-pickup.html' },
  { name: 'Donation Directory', path: '/BaseSite/album/donation-directory.html' }
];

for (const pageInfo of pages) {
  test(`${pageInfo.name} loads without horizontal overflow`, async ({ page }) => {
    await page.goto(pageInfo.path);

    await expect(page.locator('body')).toBeVisible();

    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });

    expect(hasOverflow).toBe(false);
  });

  test(`${pageInfo.name} renders primary content`, async ({ page }) => {
    await page.goto(pageInfo.path);

    await expect(page.locator('body')).toBeVisible();

    const visibleText = await page.locator('body').innerText();
    expect(visibleText.trim().length).toBeGreaterThan(20);
  });

  test(`${pageInfo.name} captures a responsive screenshot`, async ({ page }) => {
    await page.goto(pageInfo.path);

    await page.screenshot({
      path: `test-results/${pageInfo.name.replace(/\s+/g, '-').toLowerCase()}.png`,
      fullPage: true
    });
  });
}

test('Home page CTA links are visible', async ({ page }) => {
  await page.goto('/BaseSite/album/index.html');

  await expect(page.getByRole('link', { name: /drop off food/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /get food/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /view donation directory/i })).toBeVisible();
});

test('Checkout form fields are visible', async ({ page }) => {
  await page.goto('/BaseSite/album/checkout.html');

  await expect(page.locator('#firstName')).toBeVisible();
  await expect(page.locator('#lastName')).toBeVisible();
  await expect(page.locator('#address')).toBeVisible();
});

test('Food pickup page shows map and listing container', async ({ page }) => {
  await page.goto('/BaseSite/album/food-pickup.html');

  await expect(page.locator('#map')).toBeVisible();
  await expect(page.locator('#listContainer')).toBeVisible();
});

test('Donation directory renders site cards', async ({ page }) => {
  await page.goto('/BaseSite/album/donation-directory.html');

  await expect(page.locator('#directory')).toBeVisible();
  await expect(page.locator('.site').first()).toBeVisible();
});
