import { test as base, expect } from '@playwright/test';

const localOrigin = 'http://127.0.0.1:4173';
const previewHome = '/preview/index.html';
const flagshipIds = ['utility-inspection-etl', 'accessibility-analysis', 'interactive-maps-a-custom-js-app'];

// Every test receives a fresh browser context. Block all external requests and
// non-read requests before navigation, including FormSubmit and embedded apps.
const test = base.extend({
  localOnlyNetwork: [async ({ context, page }, use) => {
    const blocked = [];
    const errors = [];
    const missing = [];
    await context.route('**/*', async route => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.origin === localOrigin && ['GET', 'HEAD'].includes(request.method())) return route.continue();
      blocked.push(`${request.method()} ${url.origin}${url.pathname}`);
      await route.abort('blockedbyclient');
    });
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => {
      if (new URL(response.url()).origin === localOrigin && response.status() >= 400) missing.push(`${response.status()} ${response.url()}`);
    });
    await use();
    expect(blocked, 'Smoke tests must never attempt external access or submit a form').toEqual([]);
    expect(errors, 'Pages must not throw browser JavaScript errors').toEqual([]);
    expect(missing, 'Local pages and assets must resolve').toEqual([]);
  }, { auto: true }]
});

async function expectNoOverflow(page) {
  const widths = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth)
  }));
  expect(widths.content, `Content ${widths.content}px must fit viewport ${widths.viewport}px`).toBeLessThanOrEqual(widths.viewport + 1);
}

test('the preview is visibly separate and the original homepage stays available', async ({ page, isMobile }) => {
  await page.goto(previewHome);
  await expect(page.locator('body')).toHaveAttribute('data-preview', 'true');
  await expect(page.getByRole('heading', { level: 1, name: 'Esad Kopru', exact: true })).toBeVisible();
  const cards = page.locator('#selected-work .preview-card');
  await expect(cards).toHaveCount(3);
  const boxes = await cards.evaluateAll(elements => elements.map(element => {
    const { x, y } = element.getBoundingClientRect();
    return { x, y };
  }));
  if (isMobile) {
    expect(boxes[1].y).toBeGreaterThan(boxes[0].y);
    expect(boxes[2].y).toBeGreaterThan(boxes[1].y);
  } else {
    expect(Math.abs(boxes[2].y - boxes[0].y)).toBeLessThanOrEqual(1);
    expect(boxes[2].x).toBeGreaterThan(boxes[1].x);
  }
  await expectNoOverflow(page);
  await page.getByRole('link', { name: 'View current version', exact: true }).click();
  await expect(page).toHaveURL(`${localOrigin}/index.html`);
  await expect(page.getByRole('heading', { level: 1, name: 'Hello!', exact: true })).toBeVisible();
  await expect(page.locator('body')).not.toHaveAttribute('data-preview');
  await expectNoOverflow(page);
});

for (const id of flagshipIds) {
  test(`selected work opens ${id} with visible evidence before media`, async ({ page }) => {
    await page.goto(previewHome);
    await page.locator(`#selected-work h3 a[href="./${id}/index.html"]`).click();
    await expect(page).toHaveURL(`${localOrigin}/preview/${id}/index.html`);
    const summary = page.locator('.preview-case-summary');
    await expect(summary).toBeVisible();
    for (const name of ['Problem', 'My contribution', 'Result']) await expect(summary.getByRole('heading', { name, exact: true })).toBeVisible();
    await expect(summary.locator('.preview-tools')).toBeVisible();
    expect(await summary.locator('.chips li').count()).toBeGreaterThan(0);
    const order = await summary.evaluate(element => [...document.querySelectorAll('.preview-diagram, .project-gallery, .embedded-app')]
      .every(media => Boolean(element.compareDocumentPosition(media) & Node.DOCUMENT_POSITION_FOLLOWING)));
    expect(order).toBe(true);
    await expectNoOverflow(page);
  });
}

test('all four themes work without filtering screenshots and persist after reload', async ({ page }) => {
  await page.goto('/preview/spatial-analysis/index.html');
  const select = page.getByLabel('Theme', { exact: true });
  for (const theme of ['classic', 'midnight', 'evergreen', 'sandstone']) {
    await select.selectOption(theme);
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    await expect(select).toHaveValue(theme);
    await expect(page.locator('.project-gallery img').first()).toHaveCSS('filter', 'none');
    const filters = await page.locator('.project-gallery img').first().evaluate(element => {
      const values = [];
      for (let current = element; current; current = current.parentElement) values.push(getComputedStyle(current).filter);
      return values;
    });
    expect(filters.every(value => value === 'none'), 'No ancestor may recolor the project images').toBe(true);
    if (theme === 'midnight') await expect(page.locator('.brand img')).not.toHaveCSS('filter', 'none');
    else await expect(page.locator('.brand img')).toHaveCSS('filter', 'none');
    await expectNoOverflow(page);
  }
  await page.reload();
  await expect(select).toHaveValue('sandstone');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'sandstone');
});

test('mobile menu and category disclosure support keyboard close and local navigation', async ({ page, isMobile }) => {
  await page.goto(previewHome);
  const menu = page.locator('.menu-toggle');
  const nav = page.getByRole('navigation', { name: 'Main navigation', exact: true });
  if (!isMobile) {
    await expect(menu).toBeHidden();
    await expect(nav).toBeVisible();
    return;
  }
  await expect(nav).toBeHidden();
  await menu.click();
  await expect(menu).toHaveAttribute('aria-expanded', 'true');
  const disclosure = nav.getByRole('button', { name: 'Toggle Spatial & Data Analysis project menu', exact: true });
  await disclosure.click();
  await expect(disclosure).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#nav-spatial-and-data-analysis')).toBeVisible();
  await expectNoOverflow(page);
  await page.keyboard.press('Escape');
  await expect(disclosure).toHaveAttribute('aria-expanded', 'false');
  await expect(disclosure).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(nav).toBeHidden();
  await expect(menu).toBeFocused();
  await menu.click();
  await nav.getByRole('link', { name: 'Contact', exact: true }).click();
  await expect(page).toHaveURL(`${localOrigin}/preview/contact/index.html`);
  await expect(page.getByRole('heading', { name: 'Contact me', exact: true })).toBeVisible();
  await expect(page.locator('#site-nav')).toBeHidden();
});

test('gallery opens, fills the viewer, zooms, fits, closes and restores focus', async ({ page }) => {
  await page.goto('/preview/spatial-analysis/index.html');
  const trigger = page.locator('.project-gallery a[data-image-viewer]').first();
  await trigger.click();
  const viewer = page.getByRole('dialog', { name: 'Image viewer', exact: true });
  await expect(viewer).toBeVisible();
  const image = viewer.locator('.viewer-image');
  await expect(image).toBeVisible();
  await expect(viewer.getByRole('button', { name: 'Fit to screen', exact: true })).toBeEnabled();
  await expect(viewer.locator('.zoom-level')).toHaveText('100%');
  const fill = await image.evaluate(element => {
    const imageBounds = element.getBoundingClientRect();
    const viewport = element.closest('.viewer-viewport').getBoundingClientRect();
    return Math.max(imageBounds.width / viewport.width, imageBounds.height / viewport.height);
  });
  expect(fill).toBeGreaterThanOrEqual(0.94);
  expect(fill).toBeLessThanOrEqual(0.96);
  await viewer.getByRole('button', { name: 'Zoom in', exact: true }).click();
  await expect(viewer.locator('.zoom-level')).toHaveText('125%');
  await viewer.getByRole('button', { name: 'Zoom out', exact: true }).click();
  await expect(viewer.locator('.zoom-level')).toHaveText('100%');
  await viewer.getByRole('button', { name: 'Zoom in', exact: true }).click();
  await viewer.getByRole('button', { name: 'Fit to screen', exact: true }).click();
  await expect(viewer.locator('.zoom-level')).toHaveText('100%');
  await viewer.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(viewer).toBeHidden();
  await expect(trigger).toBeFocused();
  await trigger.press('Enter');
  await expect(viewer).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(viewer).toBeHidden();
  await expect(trigger).toBeFocused();
  await expectNoOverflow(page);
});

test('remaining historical images are available through an accessible disclosure', async ({ page }) => {
  await page.goto('/preview/spatial-analysis/index.html');
  const archive = page.locator('details.preview-gallery-more');
  await expect(archive).not.toHaveAttribute('open');
  const imageLink = archive.locator('a[data-image-viewer]').first();
  await expect(imageLink).toBeHidden();
  const disclosure = archive.locator('summary');
  await disclosure.focus();
  await disclosure.press('Enter');
  await expect(archive).toHaveAttribute('open', '');
  await expect(imageLink).toBeVisible();
  await imageLink.click();
  const viewer = page.getByRole('dialog', { name: 'Image viewer', exact: true });
  await expect(viewer.locator('.viewer-image')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(viewer).toBeHidden();
  await expect(imageLink).toBeFocused();
  await expectNoOverflow(page);
});

test('keyboard skip link reaches the main content and contact stays form-only without sending', async ({ page }) => {
  await page.goto('/preview/contact/index.html');
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Skip to content', exact: true });
  await expect(skip).toBeFocused();
  await skip.press('Enter');
  await expect(page.locator('#main')).toBeFocused();
  await expect(page.getByLabel('Your email', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Subject', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Message', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Send message', exact: true })).toBeEnabled();
  await expect(page.locator('[data-contact-success]')).toBeHidden();
  await expect(page.locator('main')).not.toContainText('You can also email');
  await expect(page.locator('main')).not.toContainText('Public work');
  await expectNoOverflow(page);
  // Deliberately do not fill or submit the form, even with network interception.
});
