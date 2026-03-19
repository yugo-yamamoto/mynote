const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const url = 'file://' + path.resolve(__dirname, 'index.html');
const SHOT_DIR = path.resolve(__dirname, 'screenshots');
if (!fs.existsSync(SHOT_DIR)) fs.mkdirSync(SHOT_DIR);

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 900, height: 600 });
  await page.goto(url);
  await page.waitForSelector('.para');

  const results = [];

  async function focusNth(n) {
    await page.evaluate(n => document.querySelectorAll('.para')[n].focus(), n);
  }

  async function focusedIndex() {
    return page.evaluate(() => [...document.querySelectorAll('.para')].indexOf(document.activeElement));
  }

  async function isEditable(n) {
    return page.evaluate(n => document.querySelectorAll('.para')[n].getAttribute('contenteditable') === 'true', n);
  }

  async function getParaCount() {
    return page.$$eval('.para', els => els.length);
  }

  function assert(cond, msg) {
    if (!cond) throw new Error(msg);
  }

  let shotIndex = 0;
  async function shot(label) {
    const file = path.join(SHOT_DIR, `${String(shotIndex).padStart(2,'0')}_${label}.png`);
    await page.screenshot({ path: file, fullPage: false });
    shotIndex++;
    return file;
  }

  async function test(id, name, description, fn) {
    let screenshotPath = null;
    let pass = false;
    let error = '';
    try {
      await fn();
      screenshotPath = await shot(id);
      pass = true;
      console.log(`  ✓ ${name}`);
    } catch (e) {
      screenshotPath = await shot(id + '_fail');
      error = e.message;
      console.log(`  ✗ ${name}: ${error}`);
    }
    results.push({ id, name, description, pass, error, screenshotPath });
  }

  // === 初期状態 ===
  console.log('\n=== mynote キー操作テスト ===\n');
  await shot('00_initial');

  // --- 閲覧モード移動 ---
  console.log('[閲覧モード 移動]');

  await test('01', 'j キーで次の段落に移動',
    '閲覧モードで j を押すと、フォーカスが次の段落へ移動します。',
    async () => {
      await focusNth(0);
      await page.keyboard.press('j');
      const idx = await focusedIndex();
      assert(idx === 1, `index=${idx}`);
    });

  await test('02', 'k キーで前の段落に戻る',
    '閲覧モードで k を押すと、フォーカスが前の段落へ移動します。',
    async () => {
      await page.keyboard.press('k');
      const idx = await focusedIndex();
      assert(idx === 0, `index=${idx}`);
    });

  await test('03', 'ArrowDown で次の段落に移動',
    '↓ キーで次の段落にフォーカスが移動します。',
    async () => {
      await focusNth(0);
      await page.keyboard.press('ArrowDown');
      const idx = await focusedIndex();
      assert(idx === 1, `index=${idx}`);
    });

  await test('04', 'ArrowUp で前の段落に戻る',
    '↑ キーで前の段落にフォーカスが移動します。',
    async () => {
      await page.keyboard.press('ArrowUp');
      const idx = await focusedIndex();
      assert(idx === 0, `index=${idx}`);
    });

  // --- 編集モード ---
  console.log('\n[編集モード 移行]');

  await test('05', 'Enter で編集モードに入る',
    'フォーカスした段落で Enter を押すと編集モードになります。テキストが入力可能になり、段落の枠が紫色に変わります。',
    async () => {
      await focusNth(0);
      await page.keyboard.press('Enter');
      assert(await isEditable(0), 'not editable');
    });

  await test('06', 'Escape で閲覧モードに戻る',
    '編集中に Escape を押すと閲覧モードに戻ります。フォーカスはその段落に留まります。',
    async () => {
      await page.keyboard.press('Escape');
      assert(!(await isEditable(0)), 'still editable');
    });

  await test('07', 'ダブルクリックで編集モードに入る',
    '段落をダブルクリックしても編集モードに入れます。',
    async () => {
      await page.locator('.para').first().dblclick();
      assert(await isEditable(0), 'not editable');
      await page.keyboard.press('Escape');
    });

  // --- 編集中キー ---
  console.log('\n[編集モード中のキー]');

  await test('08', '編集中 Enter で次の段落に移動',
    '編集モード中に Enter を押すと編集を終了し、次の段落にフォーカスが移動します。',
    async () => {
      await focusNth(0);
      await page.keyboard.press('Enter');
      await page.keyboard.press('Enter');
      const idx = await focusedIndex();
      assert(idx === 1, `index=${idx}`);
    });

  await test('09', '最終段落で Enter すると新段落を追加',
    '最終段落で編集中に Enter を押すと、新しい空の段落が末尾に追加され、そこに編集フォーカスが移ります。',
    async () => {
      const count = await getParaCount();
      await focusNth(count - 1);
      await page.keyboard.press('Enter');
      await page.keyboard.press('Enter');
      const newCount = await getParaCount();
      assert(newCount === count + 1, `${count} → ${newCount}`);
      await page.keyboard.press('Escape');
    });

  await test('10', '空段落で Backspace すると段落を削除',
    '編集モードでテキストが空の状態で Backspace を押すと、段落が削除されます。',
    async () => {
      const count = await getParaCount();
      await focusNth(count - 1);
      await page.keyboard.press('Enter');
      await page.keyboard.press('Backspace');
      const newCount = await getParaCount();
      assert(newCount === count - 1, `${count} → ${newCount}`);
    });

  // --- Delete ---
  console.log('\n[段落の削除]');

  await test('11', '閲覧モードで Delete キーで段落を削除',
    '閲覧モードでフォーカスした段落に Delete を押すと段落が削除されます。',
    async () => {
      const count = await getParaCount();
      await focusNth(0);
      await page.keyboard.press('Delete');
      const newCount = await getParaCount();
      assert(newCount === count - 1, `${count} → ${newCount}`);
    });

  // --- 移動・複製 ---
  console.log('\n[段落の移動・複製]');

  await test('12', 'Alt+↓ で段落を下に移動',
    'Alt+↓ を押すと、フォーカス中の段落が一つ下に移動します（VSCode 互換）。',
    async () => {
      await focusNth(0);
      const texts = await page.$$eval('.para', els => els.map(e => e.textContent));
      await page.keyboard.press('Alt+ArrowDown');
      const after = await page.$$eval('.para', els => els.map(e => e.textContent));
      assert(after[0] === texts[1] && after[1] === texts[0], '移動失敗');
    });

  await test('13', 'Alt+↑ で段落を上に移動',
    'Alt+↑ を押すと、フォーカス中の段落が一つ上に移動します（VSCode 互換）。',
    async () => {
      await focusNth(1);
      const texts = await page.$$eval('.para', els => els.map(e => e.textContent));
      await page.keyboard.press('Alt+ArrowUp');
      const after = await page.$$eval('.para', els => els.map(e => e.textContent));
      assert(after[0] === texts[1] && after[1] === texts[0], '移動失敗');
    });

  await test('14', 'Shift+Alt+↓ で段落を下に複製',
    'Shift+Alt+↓ を押すと、フォーカス中の段落を複製して直下に挿入します（VSCode 互換）。',
    async () => {
      await focusNth(0);
      const count = await getParaCount();
      const text = await page.$$eval('.para', els => els[0].textContent);
      await page.keyboard.press('Shift+Alt+ArrowDown');
      const newCount = await getParaCount();
      const second = await page.$$eval('.para', els => els[1].textContent);
      assert(newCount === count + 1, `段落数 ${count} → ${newCount}`);
      assert(second === text, 'テキスト不一致');
    });

  await test('15', 'Shift+Alt+↑ で段落を上に複製',
    'Shift+Alt+↑ を押すと、フォーカス中の段落を複製して直上に挿入します（VSCode 互換）。',
    async () => {
      await focusNth(0);
      const count = await getParaCount();
      const text = await page.$$eval('.para', els => els[0].textContent);
      await page.keyboard.press('Shift+Alt+ArrowUp');
      const newCount = await getParaCount();
      const first = await page.$$eval('.para', els => els[0].textContent);
      assert(newCount === count + 1, `段落数 ${count} → ${newCount}`);
      assert(first === text, 'テキスト不一致');
    });

  // 結果サマリ
  const passed = results.filter(r => r.pass).length;
  const failed = results.filter(r => !r.pass).length;
  console.log(`\n結果: ${passed} passed, ${failed} failed\n`);

  // JSON に保存して Python に渡す
  fs.writeFileSync(path.join(__dirname, 'test_results.json'), JSON.stringify(results, null, 2));
  console.log('スクリーンショット & 結果を保存しました。');

  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
})();
