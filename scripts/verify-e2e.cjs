const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const { mkdir } = require('node:fs/promises');
const { MongoClient } = require('mongodb');
const { chromium } = require('@playwright/test');

// Uses a disposable database. Never reads or writes the personal database.
const databaseName = `monexa_verify_${randomUUID().replaceAll('-', '').slice(0, 16)}`;
const port = process.env.E2E_PORT || '3101';
const origin = `http://localhost:${port}`;
const database = new MongoClient(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 8000,
  connectTimeoutMS: 8000,
});
let server, browser, context;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function api(path, options = {}) {
  return context.request.fetch(origin + path, {
    ...options,
    headers: { Origin: origin, ...options.headers },
  });
}
async function noOverflow(page) {
  try {
    await page.waitForFunction(
      () => document.documentElement.scrollWidth <= window.innerWidth,
      {},
      { timeout: 5000 },
    );
  } catch {
    const details = await page.evaluate(() => ({
      width: innerWidth,
      scroll: document.documentElement.scrollWidth,
      overflow: [...document.querySelectorAll('body *')]
        .filter((el) => el.getBoundingClientRect().right > innerWidth + 1)
        .slice(0, 12)
        .map((el) => ({
          tag: el.tagName,
          class: el.className,
          right: Math.round(el.getBoundingClientRect().right),
        })),
    }));
    await mkdir('artifacts', { recursive: true });
    await page.screenshot({ path: 'artifacts/overflow-debug.png', fullPage: true });
    throw new Error('Horizontal overflow: ' + JSON.stringify(details));
  }
}
async function openNavbar(page) {
  if (!(await page.locator('#main-navigation').isVisible()))
    await page.getByRole('button', { name: 'Mở thanh điều hướng', exact: true }).click();
}
async function navigateTo(page, name) {
  await openNavbar(page);
  await page.locator('#main-navigation').getByRole('button', { name, exact: true }).click();
  if (await page.locator('#main-navigation').isVisible())
    await page.getByRole('button', { name: 'Thu gọn điều hướng', exact: true }).click();
}
async function fitsScreen(page) {
  await noOverflow(page);
  await page.waitForFunction(
    () => document.documentElement.scrollHeight <= innerHeight + 1,
    {},
    { timeout: 5000 },
  );
  for (const selector of [
    '.expense-table-viewport',
    '.debt-table-viewport',
    '.category-table-viewport',
  ]) {
    const area = page.locator(selector);
    if (await area.isVisible())
      assert.equal(
        await area.evaluate(
          (el) => el.scrollHeight <= el.clientHeight + 1 && el.scrollWidth <= el.clientWidth + 1,
        ),
        true,
        `${selector} fits without internal scrolling`,
      );
  }
  const header = await page.locator('.workspace-header').boundingBox(),
    center = await page.locator('.header-center').boundingBox(),
    brand = await page.locator('.workspace-navigation').boundingBox(),
    action = await page.locator('.header-primary-action').boundingBox();
  assert.ok(
    Math.abs(center.x + center.width / 2 - (header.x + header.width / 2)) < 2,
    'Month picker stays centered',
  );
  assert.ok(
    brand.x + brand.width <= center.x + 1 && center.x + center.width <= action.x + 1,
    'Single-row header has no overlapping controls',
  );
}
(async () => {
  assert.ok(
    process.env.MONGODB_URI && process.env.APP_PASSWORD && process.env.SESSION_SECRET,
    'Configure .env.local before E2E',
  );
  await database.connect();
  await database.db(databaseName).command({ ping: 1 });
  // Existing v2 snapshot: prove migration preserves IDs, money, revision and recovery copy.
  const verificationDb = database.db(databaseName);
  const legacyData = {
    schemaVersion: 2,
    budget: 1200000,
    categories: [{ id: 'legacy-food', name: 'Ăn uống', color: '#2563eb', icon: 'utensils' }],
    expenses: [
      {
        id: 'legacy-expense',
        title: 'Chi tiêu cũ',
        categoryId: 'legacy-food',
        amount: 12000,
        note: '',
        occurredAt: new Date().toISOString(),
      },
    ],
    people: [],
    debts: [],
  };
  await verificationDb
    .collection('finance')
    .insertOne({ _id: 'personal', revision: 0, data: legacyData, updatedAt: new Date() });
  server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', port], {
    env: { ...process.env, MONGODB_DB: databaseName, NODE_ENV: 'production' },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  // Keep server output in memory only; never print credentials or request bodies.
  let serverLog = '';
  server.stdout.on('data', (chunk) => {
    serverLog = (serverLog + chunk.toString()).slice(-5000);
  });
  server.stderr.on('data', () => {});
  let up = false;
  for (let i = 0; i < 80; i++) {
    try {
      const r = await fetch(origin + '/login');
      if (r.ok) {
        up = true;
        break;
      }
    } catch {}
    await sleep(250);
  }
  assert.equal(up, true, 'Production server should start');
  browser = await chromium.launch({ channel: process.env.E2E_BROWSER || 'msedge', headless: true });
  context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    timezoneId: 'Asia/Ho_Chi_Minh',
    locale: 'vi-VN',
  });
  assert.equal((await api('/api/finance')).status(), 401, 'Data requires authentication');
  assert.equal(
    (
      await api('/api/auth/login', {
        method: 'POST',
        headers: { Origin: 'https://untrusted.example' },
        data: { password: 'invalid' },
      })
    ).status(),
    403,
    'Cross-origin login rejected',
  );
  assert.equal(
    (await api('/api/auth/login', { method: 'POST', data: { password: 'invalid' } })).status(),
    401,
    'Wrong password rejected',
  );
  assert.equal(
    (
      await api('/api/auth/login', { method: 'POST', data: { password: process.env.APP_PASSWORD } })
    ).status(),
    200,
    'Correct password accepted',
  );
  const session = (await context.cookies()).find((c) => c.name === 'monexa_session');
  assert.ok(
    session?.httpOnly && session.secure && session.sameSite === 'Strict',
    'Secure session cookie',
  );
  const first = await (await api('/api/finance')).json();
  assert.equal(first.revision, 0);
  assert.equal(first.data.budget, legacyData.budget);
  assert.equal(first.data.expenses[0].id, 'legacy-expense');
  assert.equal(first.data.expenses[0].categoryId, 'legacy-food');
  assert.equal(first.data.expenses[0].userId, 'personal');
  assert.equal(await verificationDb.collection('users').countDocuments({ _id: 'personal' }), 1);
  assert.equal(
    await verificationDb.collection('categories').countDocuments({ userId: 'personal' }),
    1,
  );
  assert.equal(
    await verificationDb.collection('expenses').countDocuments({ userId: 'personal' }),
    1,
  );
  assert.deepEqual(
    (await verificationDb.collection('finance').findOne({ _id: 'personal' })).data,
    legacyData,
  );
  assert.equal(
    (await verificationDb.collection('settings').findOne({ _id: 'personal' })).budget,
    1200000,
  );
  console.log(
    'Migration: separate collections, preserved IDs/userId, budget and untouched legacy recovery copy passed.',
  );
  const now = new Date().toISOString();
  const seed = {
    ...first.data,
    budget: 2000000,
    expenses: [
      {
        id: 'e2e-expense',
        title: 'API Lunch',
        categoryId: first.data.categories[0].id,
        amount: 50000,
        note: '',
        occurredAt: now,
      },
    ],
  };
  let response = await api('/api/finance', {
    method: 'PUT',
    data: {
      revision: 0,
      data: { ...seed, expenses: [{ ...seed.expenses[0], categoryId: 'missing' }] },
    },
  });
  assert.equal(response.status(), 400, 'Orphan category rejected by server');
  response = await api('/api/finance', { method: 'PUT', data: { revision: 0, data: seed } });
  assert.equal(response.status(), 200, 'Valid state is persisted');
  assert.equal(
    (await api('/api/finance', { method: 'PUT', data: { revision: 0, data: seed } })).status(),
    409,
    'Stale revision rejected',
  );
  const saved = await (await api('/api/finance')).json();
  assert.equal(
    (await verificationDb.collection('expenses').findOne({ _id: 'e2e-expense' })).categoryId,
    seed.categories[0].id,
  );
  assert.equal(
    (await verificationDb.collection('expenses').findOne({ _id: 'e2e-expense' })).userId,
    'personal',
  );
  assert.equal(
    await verificationDb.collection('expenses').countDocuments({ _id: 'legacy-expense' }),
    0,
  );
  assert.equal(
    (
      await api('/api/finance', {
        method: 'PUT',
        data: {
          revision: saved.revision,
          data: {
            ...saved.data,
            expenses: [{ ...saved.data.expenses[0], userId: 'another-user' }],
          },
        },
      })
    ).status(),
    400,
    'Foreign userId rejected',
  );
  // Force a late write failure after expenses have changed; all changes must roll back.
  await verificationDb
    .collection('people')
    .insertOne({ _id: 'collision-person', userId: 'another-user', name: 'Reserved' });
  const failedData = {
    ...saved.data,
    expenses: [{ ...saved.data.expenses[0], amount: 99999 }],
    people: [{ id: 'collision-person', userId: 'personal', name: 'Person' }],
  };
  assert.equal(
    (
      await api('/api/finance', {
        method: 'PUT',
        data: { revision: saved.revision, data: failedData },
      })
    ).status(),
    503,
    'Mid-transaction failure is reported',
  );
  const afterFailure = await (await api('/api/finance')).json();
  assert.equal(
    afterFailure.revision,
    saved.revision,
    'Failed transaction cannot increment revision',
  );
  assert.equal(
    afterFailure.data.expenses[0].amount,
    50000,
    'Failed transaction cannot partially change money',
  );
  assert.equal(afterFailure.data.people.length, 0, 'Foreign-owned records are not returned');
  await verificationDb
    .collection('people')
    .deleteOne({ _id: 'collision-person', userId: 'another-user' });
  console.log(
    'API: authentication, secure cookie, origin protection, validation and revision conflict passed.',
  );

  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(origin);
  await page.getByRole('button', { name: 'Tạo chi tiêu', exact: true }).waitFor();
  assert.equal(
    await page
      .locator('main .workspace-tabs, main .data-menu, main .sync-status, main .workspace-toolbar')
      .count(),
    0,
  );
  assert.equal(
    await page.getByRole('button', { name: 'Tải dữ liệu mới nhất', exact: true }).count(),
    0,
  );
  await page.getByRole('button', { name: 'Chọn tháng thống kê', exact: true }).click();
  await page.locator('.react-datepicker__month-text').first().waitFor();
  assert.equal(await page.locator('.react-datepicker__month-text').count(), 12);
  assert.match(await page.locator('.react-datepicker__month').innerText(), /tháng/i);
  const originalYear = await page.locator('.month-picker-year strong').innerText();
  await page.getByRole('button', { name: 'Năm trước', exact: true }).click();
  assert.notEqual(await page.locator('.month-picker-year strong').innerText(), originalYear);
  await page.getByRole('button', { name: 'Năm sau', exact: true }).click();
  const vietnamMonth =
    Number(
      new Intl.DateTimeFormat('en', { timeZone: 'Asia/Ho_Chi_Minh', month: 'numeric' }).format(
        new Date(),
      ),
    ) - 1;
  await page.locator('.react-datepicker__month-text').nth(vietnamMonth).click();
  await page.locator('.react-datepicker').waitFor({ state: 'hidden' });
  await openNavbar(page);
  for (const name of ['Xuất dữ liệu', 'Nhập dữ liệu', 'Đăng xuất'])
    assert.equal(
      await page.locator('#main-navigation').getByRole('button', { name, exact: true }).isVisible(),
      true,
    );
  assert.equal(
    await page.locator('main').getByRole('button', { name: 'Danh mục', exact: true }).count(),
    0,
  );
  assert.equal(
    await page
      .locator('#main-navigation')
      .getByRole('button', { name: 'Đóng điều hướng', exact: true })
      .count(),
    0,
    'No redundant close button in navbar',
  );
  await page.getByRole('button', { name: 'Thu gọn điều hướng', exact: true }).click();
  await page.waitForFunction(
    () =>
      getComputedStyle(document.querySelector('.menu-toggle')).backgroundColor ===
      'rgb(29, 78, 216)',
  );
  const toggleStyle = await page.locator('.menu-toggle').evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      background: style.backgroundColor,
      color: style.color,
      shadow: style.boxShadow,
      border: style.borderTopWidth,
    };
  });
  assert.equal(toggleStyle.background, 'rgb(29, 78, 216)');
  assert.equal(toggleStyle.color, 'rgb(255, 255, 255)');
  assert.notEqual(toggleStyle.shadow, 'none');
  assert.equal(toggleStyle.border, '1px');
  console.log(
    'Header: Vietnamese month picker and year navigation passed; data/account actions only in navbar.',
  );
  await page.getByRole('button', { name: 'Tạo chi tiêu', exact: true }).click();
  let dialog = page.getByRole('dialog');
  await dialog.getByLabel('Tên chi tiêu', { exact: true }).fill('Chi tiêu kiểm thử');
  await dialog.getByLabel('Số tiền (VND)', { exact: true }).fill('75000');
  await dialog.getByRole('button', { name: 'Quản lý / thêm danh mục', exact: false }).click();
  await dialog.getByLabel('Tên danh mục', { exact: true }).fill('Danh mục E2E');
  await dialog.getByRole('button', { name: 'Sức khỏe', exact: true }).click();
  await dialog.getByRole('button', { name: 'Thêm danh mục', exact: true }).click();
  await dialog.getByRole('button', { name: 'Danh mục E2E', exact: false }).waitFor();
  await dialog.getByRole('button', { name: 'Tiếp tục ghi chi tiêu', exact: false }).click();
  assert.equal(
    await dialog.getByLabel('Tên chi tiêu', { exact: true }).inputValue(),
    'Chi tiêu kiểm thử',
    'Expense draft survives category management',
  );
  await dialog
    .getByLabel('Danh mục', { exact: true })
    .selectOption({ label: 'Sức khỏe · Danh mục E2E' });
  await dialog.getByRole('button', { name: 'Lưu chi tiêu', exact: true }).click();
  await page.getByRole('dialog').waitFor({ state: 'detached' });
  const afterExpense = await (await api('/api/finance')).json();
  const created = afterExpense.data.expenses.find((e) => e.title === 'Chi tiêu kiểm thử');
  const category = afterExpense.data.categories.find((c) => c.id === created.categoryId);
  assert.equal(created.amount, 75000);
  assert.equal(created.note, '');
  assert.equal(category.icon, 'heart');
  // Rename category through the UI and verify that the expense still references its original ID.
  await navigateTo(page, 'Danh mục');
  await page.getByRole('region', { name: 'Quản lý danh mục', exact: true }).waitFor();
  assert.equal(
    await page.getByRole('dialog').count(),
    0,
    'Category navigation opens a dedicated screen',
  );
  await page.getByRole('button', { name: 'Sửa danh mục Danh mục E2E', exact: true }).click();
  dialog = page.getByRole('dialog');
  await dialog.getByLabel('Tên danh mục', { exact: true }).fill('Danh mục đã sửa');
  await dialog.getByRole('button', { name: 'Lưu danh mục', exact: true }).click();
  await dialog.waitFor({ state: 'detached' });
  await page.getByRole('button', { name: 'Danh mục đã sửa', exact: true }).waitFor();
  assert.equal(
    await page
      .getByRole('button', { name: 'Xóa danh mục Danh mục đã sửa', exact: true })
      .isDisabled(),
    true,
    'Used category cannot be removed',
  );
  await page.getByRole('button', { name: 'Thêm danh mục', exact: true }).click();
  dialog = page.getByRole('dialog');
  await dialog.getByLabel('Tên danh mục', { exact: true }).fill('Danh mục chưa dùng');
  await dialog.getByRole('button', { name: 'Cà phê', exact: true }).click();
  await dialog.getByRole('button', { name: 'Thêm danh mục', exact: true }).click();
  await dialog.waitFor({ state: 'detached' });
  await page.getByRole('button', { name: 'Danh mục chưa dùng', exact: true }).waitFor();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Xóa danh mục Danh mục chưa dùng', exact: true }).click();
  await page
    .getByRole('button', { name: 'Danh mục chưa dùng', exact: true })
    .waitFor({ state: 'detached' });
  const afterRename = await (await api('/api/finance')).json();
  assert.equal(afterRename.data.expenses.find((e) => e.id === created.id).categoryId, category.id);
  assert.equal(
    afterRename.data.categories.find((c) => c.id === category.id).name,
    'Danh mục đã sửa',
  );
  console.log('Categories: dedicated screen, create/edit by ID and guarded deletion passed.');

  await navigateTo(page, 'Công nợ');
  await page.getByRole('button', { name: 'Ghi công nợ', exact: true }).click();
  dialog = page.getByRole('dialog');
  await dialog.getByLabel('Tên khoản công nợ', { exact: true }).fill('Công nợ kiểm thử');
  await dialog.getByLabel('Số tiền (VND)', { exact: true }).fill('300000');
  await dialog.getByLabel('Tên người liên quan', { exact: true }).fill('Người thử nghiệm');
  await dialog.getByRole('button', { name: 'Ghi công nợ', exact: true }).click();
  await page.getByRole('dialog').waitFor({ state: 'detached' });
  await page.getByRole('heading', { name: 'Công nợ kiểm thử', exact: true }).waitFor();
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Đã thanh toán', exact: true }).click();
  await page.getByRole('button', { name: 'Đã hoàn tất', exact: true }).click();
  await page.getByRole('heading', { name: 'Công nợ kiểm thử', exact: true }).waitFor();
  const afterDebt = await (await api('/api/finance')).json();
  assert.ok(afterDebt.data.debts[0].settledAt);
  assert.ok(afterDebt.data.people.some((p) => p.id === afterDebt.data.debts[0].personId));
  assert.equal(afterDebt.data.expenses.length, 2, 'Debt does not double-count as expense');
  console.log(
    'UI: expense, icon category, preserved draft, rename by ID, debt and settlement passed.',
  );

  await mkdir('artifacts', { recursive: true });
  await navigateTo(page, 'Tổng quan');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await fitsScreen(page);
  await page.screenshot({ path: 'artifacts/monexa-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await fitsScreen(page);
  assert.equal(
    await page.getByRole('button', { name: 'Mở thanh điều hướng', exact: true }).isVisible(),
    true,
    'Active mobile navigation remains visible',
  );
  const budgetBox = await page.locator('.right-column > .budget-card').boundingBox();
  assert.ok(budgetBox.width >= 350, 'Mobile budget card fills its column');
  await page.screenshot({ path: 'artifacts/monexa-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Tạo chi tiêu', exact: true }).click();
  dialog = page.getByRole('dialog');
  await dialog.getByLabel('Thời gian chi tiêu', { exact: true }).click();
  await page.locator('.react-datepicker').waitFor();
  await noOverflow(page);
  await page.screenshot({ path: 'artifacts/monexa-datepicker-mobile.png', fullPage: true });
  await page.keyboard.press('Escape');
  if (await page.getByRole('dialog').count())
    await page.getByRole('dialog').getByRole('button', { name: 'Đóng', exact: true }).click();
  await page.setViewportSize({ width: 320, height: 720 });
  await fitsScreen(page);
  // Dense lists must paginate instead of extending the viewport or hiding overflow.
  const base = await (await api('/api/finance')).json();
  const dense = {
    ...base.data,
    categories: [
      ...base.data.categories,
      ...Array.from({ length: 22 }, (_, i) => ({
        id: `dense-category-${i}`,
        name: `Danh mục dài số ${i + 1}`,
        icon: 'wallet',
        color: '#2563eb',
      })),
    ],
    expenses: [
      ...base.data.expenses,
      ...Array.from({ length: 30 }, (_, i) => ({
        id: `dense-expense-${i}`,
        title: `Chi tiêu có tiêu đề dài số ${i + 1}`,
        amount: 10000 + i,
        categoryId: base.data.categories[0].id,
        note: 'Nội dung đầy đủ xem trong chi tiết',
        occurredAt: now,
      })),
    ],
    debts: [
      ...base.data.debts,
      ...Array.from({ length: 30 }, (_, i) => ({
        id: `dense-debt-${i}`,
        title: `Khoản công nợ số ${i + 1}`,
        personId: base.data.people[0].id,
        direction: 'receivable',
        amount: 100000 + i,
        occurredAt: now,
        dueAt: null,
        settledAt: null,
        note: '',
      })),
    ],
  };
  assert.equal(
    (
      await api('/api/finance', { method: 'PUT', data: { data: dense, revision: base.revision } })
    ).status(),
    200,
  );
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.reload();
  await page.locator('.overview-panel').waitFor();
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 1366, height: 768 },
    { width: 1280, height: 720 },
    { width: 1024, height: 600 },
  ]) {
    await page.setViewportSize(viewport);
    await fitsScreen(page);
    for (const chart of await page.locator('.chart canvas').all()) {
      const box = await chart.boundingBox();
      assert.ok(
        box && box.height >= 65 && box.y + box.height <= viewport.height,
        'Entire chart remains visible',
      );
    }
    await page.getByRole('button', { name: 'Mở thanh điều hướng', exact: true }).click();
    await fitsScreen(page);
    await page.getByRole('button', { name: 'Thu gọn điều hướng', exact: true }).click();
    await fitsScreen(page);
    await navigateTo(page, 'Danh mục');
    await fitsScreen(page);
    await navigateTo(page, 'Tổng quan');
    await fitsScreen(page);
  }
  await page.setViewportSize({ width: 1366, height: 768 });
  await fitsScreen(page);
  const firstTitle = await page.locator('.expense-table .expense-name').first().innerText();
  await page.getByRole('button', { name: 'Chi tiêu: trang sau', exact: true }).click();
  assert.notEqual(
    await page.locator('.expense-table .expense-name').first().innerText(),
    firstTitle,
    'Pagination changes visible records',
  );
  await page.getByRole('button', { name: 'Danh mục biểu đồ: trang sau', exact: true }).click();
  await fitsScreen(page);
  await page.screenshot({ path: 'artifacts/monexa-compact-desktop.png', fullPage: true });
  await navigateTo(page, 'Công nợ');
  await fitsScreen(page);
  await page.getByRole('button', { name: 'Công nợ: trang sau', exact: true }).click();
  await fitsScreen(page);
  await page.screenshot({ path: 'artifacts/monexa-compact-debts.png', fullPage: true });
  await navigateTo(page, 'Danh mục');
  await fitsScreen(page);
  await page.getByRole('button', { name: 'Danh mục: trang sau', exact: true }).click();
  await fitsScreen(page);
  await page.screenshot({ path: 'artifacts/monexa-categories-desktop.png', fullPage: true });
  await navigateTo(page, 'Công nợ');
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 320, height: 720 },
  ]) {
    await page.setViewportSize(viewport);
    await fitsScreen(page);
    await navigateTo(page, 'Tổng quan');
    await fitsScreen(page);
    await page.getByRole('button', { name: /^Chi tiêu \(/ }).click();
    await fitsScreen(page);
    await page.getByRole('button', { name: 'Chi tiêu: trang sau', exact: true }).click();
    await fitsScreen(page);
    await page.getByRole('button', { name: 'Chỉ số & biểu đồ', exact: true }).click();
    await fitsScreen(page);
    await page.getByRole('button', { name: 'Mở thanh điều hướng', exact: true }).click();
    await page.getByRole('button', { name: 'Thu gọn điều hướng', exact: true }).click();
    await fitsScreen(page);
    await navigateTo(page, 'Danh mục');
    await fitsScreen(page);
    await page.screenshot({
      path: `artifacts/monexa-categories-mobile-${viewport.width}.png`,
      fullPage: true,
    });
    await navigateTo(page, 'Tổng quan');
    await fitsScreen(page);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await fitsScreen(page);
  await page.screenshot({ path: 'artifacts/monexa-compact-mobile.png', fullPage: true });
  console.log(
    'Viewport layout: dense lists, chart pagination, sidebar toggle, laptop 1024x600–1440x900 and phones 320x720/390x844 fit without page or table scrolling.',
  );
  const beforeBackground = await (await api('/api/finance')).json();
  const changedBudget = beforeBackground.data.budget + 100000;
  assert.equal(
    (
      await api('/api/finance', {
        method: 'PUT',
        data: {
          revision: beforeBackground.revision,
          data: { ...beforeBackground.data, budget: changedBudget },
        },
      })
    ).status(),
    200,
  );
  const backgroundRead = page.waitForResponse(
    (response) => response.url().endsWith('/api/finance') && response.request().method() === 'GET',
  );
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await backgroundRead;
  const formatted = new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(changedBudget);
  await page.waitForFunction(
    (expected) => document.querySelector('.budget-summary strong')?.textContent === expected,
    formatted,
  );
  console.log(
    'Background refresh: another-device change is loaded on window focus without sync controls.',
  );
  assert.deepEqual(errors, [], 'No browser runtime errors');
  console.log(
    'Responsive: 1440px, 390px, 320px and mobile date picker passed; screenshots in artifacts/.',
  );
  await api('/api/auth/logout', { method: 'POST' });
  assert.equal((await api('/api/finance')).status(), 401, 'Logout invalidates access');
  await page.goto(origin + '/login');
  const passwordInput = page.getByLabel('Mật khẩu cá nhân', { exact: true });
  await passwordInput.fill('test-visibility-only');
  assert.equal(await passwordInput.getAttribute('type'), 'password');
  await page.getByRole('button', { name: 'Hiện mật khẩu', exact: true }).click();
  assert.equal(await passwordInput.getAttribute('type'), 'text');
  assert.equal(await passwordInput.inputValue(), 'test-visibility-only');
  await page.getByRole('button', { name: 'Ẩn mật khẩu', exact: true }).click();
  assert.equal(await passwordInput.getAttribute('type'), 'password');
  await passwordInput.clear();
  await page.screenshot({ path: 'artifacts/monexa-login-mobile.png', fullPage: true });
  console.log(
    'Password visibility: eye/eye-slash toggle preserves input and hides password again.',
  );
  console.log('E2E passed.');
})()
  .catch((error) => {
    console.error('E2E failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (context) await context.close();
    if (browser) await browser.close();
    if (server) server.kill();
    if (databaseName.startsWith('monexa_verify_')) {
      try {
        await database.db(databaseName).dropDatabase();
        console.log('Disposable verification database removed.');
      } catch {
        console.log('Could not remove disposable verification database.');
      }
    }
    await database.close();
  });
