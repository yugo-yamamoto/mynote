const { chromium } = require('playwright');
const path = require('path');

const url = 'file://' + path.resolve(__dirname, 'index.html');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(url);
  await page.waitForSelector('.para');

  let passed = 0;
  let failed = 0;

  async function getParaCount() {
    return page.$$eval('.para', els => els.length);
  }

  async function focusNth(n) {
    await page.evaluate((n) => document.querySelectorAll('.para')[n].focus(), n);
  }

  async function focusedIndex() {
    return page.evaluate(() => [...document.querySelectorAll('.para')].indexOf(document.activeElement));
  }

  async function isEditable(n) {
    return page.evaluate((n) => document.querySelectorAll('.para')[n].getAttribute('contenteditable') === 'true', n);
  }

  function assert(cond, msg) {
    if (!cond) throw new Error(msg);
  }

  async function test(name, fn) {
    try {
      await fn();
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (e) {
      console.log(`  ✗ ${name}: ${e.message}`);
      failed++;
    }
  }

  console.log('\n=== mynote キー操作テスト ===\n');
  const initialCount = await getParaCount();
  console.log(`初期段落数: ${initialCount}`);

  // --- 閲覧モード移動 ---
  console.log('\n[閲覧モード 移動]');

  await test('j キーで次の段落に移動', async () => {
    await focusNth(0);
    await page.keyboard.press('j');
    const idx = await focusedIndex();
    assert(idx === 1, `index=${idx}, expected 1`);
  });

  await test('k キーで前の段落に戻る', async () => {
    await page.keyboard.press('k');
    const idx = await focusedIndex();
    assert(idx === 0, `index=${idx}, expected 0`);
  });

  await test('ArrowDown で次の段落に移動', async () => {
    await focusNth(0);
    await page.keyboard.press('ArrowDown');
    const idx = await focusedIndex();
    assert(idx === 1, `index=${idx}, expected 1`);
  });

  await test('ArrowUp で前の段落に戻る', async () => {
    await page.keyboard.press('ArrowUp');
    const idx = await focusedIndex();
    assert(idx === 0, `index=${idx}, expected 0`);
  });

  // --- 編集モード ---
  console.log('\n[編集モード 移行]');

  await test('Enter で編集モードに入る', async () => {
    await focusNth(0);
    await page.keyboard.press('Enter');
    const editable = await isEditable(0);
    assert(editable, 'contenteditable が true でない');
  });

  await test('Escape で閲覧モードに戻る', async () => {
    await page.keyboard.press('Escape');
    const editable = await isEditable(0);
    assert(!editable, 'contenteditable が false でない');
  });

  await test('ダブルクリックで編集モードに入る', async () => {
    await page.locator('.para').first().dblclick();
    const editable = await isEditable(0);
    assert(editable, 'contenteditable が true でない');
    await page.keyboard.press('Escape');
  });

  // --- 編集中キー ---
  console.log('\n[編集モード中のキー]');

  await test('編集中 Enter で次の段落に移動', async () => {
    await focusNth(0);
    await page.keyboard.press('Enter'); // 編集開始
    await page.keyboard.press('Enter'); // 次へ
    const idx = await focusedIndex();
    assert(idx === 1, `index=${idx}, expected 1`);
  });

  await test('最終段落で Enter すると新段落が追加される', async () => {
    const count = await getParaCount();
    await focusNth(count - 1);
    await page.keyboard.press('Enter'); // 編集開始
    await page.keyboard.press('Enter'); // 追加
    const newCount = await getParaCount();
    assert(newCount === count + 1, `${count} → ${newCount}`);
    await page.keyboard.press('Escape');
  });

  await test('空段落で Backspace すると段落が削除される', async () => {
    // 直前で追加した空段落 (最後) を使う
    const count = await getParaCount();
    await focusNth(count - 1);
    await page.keyboard.press('Enter'); // 編集開始 (空なのでそのまま Backspace)
    await page.keyboard.press('Backspace');
    const newCount = await getParaCount();
    assert(newCount === count - 1, `${count} → ${newCount}`);
  });

  // --- Delete ---
  console.log('\n[段落の削除]');

  await test('閲覧モードで Delete すると段落が削除される', async () => {
    const count = await getParaCount();
    await focusNth(0);
    await page.keyboard.press('Delete');
    const newCount = await getParaCount();
    assert(newCount === count - 1, `${count} → ${newCount}`);
  });

  // --- Alt+Arrow 移動 ---
  console.log('\n[段落の移動・複製]');

  await test('Alt+ArrowDown で段落を下に移動', async () => {
    await focusNth(0);
    const texts = await page.$$eval('.para', els => els.map(e => e.textContent));
    await page.keyboard.press('Alt+ArrowDown');
    const after = await page.$$eval('.para', els => els.map(e => e.textContent));
    assert(after[0] === texts[1] && after[1] === texts[0], `移動失敗: [${after[0].slice(0,20)}]`);
  });

  await test('Alt+ArrowUp で段落を上に移動', async () => {
    // 前のテストで index=1 に移動した
    await focusNth(1);
    const texts = await page.$$eval('.para', els => els.map(e => e.textContent));
    await page.keyboard.press('Alt+ArrowUp');
    const after = await page.$$eval('.para', els => els.map(e => e.textContent));
    assert(after[0] === texts[1] && after[1] === texts[0], `移動失敗`);
  });

  await test('Shift+Alt+ArrowDown で下に複製', async () => {
    await focusNth(0);
    const count = await getParaCount();
    const text = await page.$$eval('.para', els => els[0].textContent);
    await page.keyboard.press('Shift+Alt+ArrowDown');
    const newCount = await getParaCount();
    const second = await page.$$eval('.para', els => els[1].textContent);
    assert(newCount === count + 1, `段落数 ${count} → ${newCount}`);
    assert(second === text, `複製テキスト不一致: "${second}" !== "${text}"`);
  });

  await test('Shift+Alt+ArrowUp で上に複製', async () => {
    await focusNth(0);
    const count = await getParaCount();
    const text = await page.$$eval('.para', els => els[0].textContent);
    await page.keyboard.press('Shift+Alt+ArrowUp');
    const newCount = await getParaCount();
    const first = await page.$$eval('.para', els => els[0].textContent);
    assert(newCount === count + 1, `段落数 ${count} → ${newCount}`);
    assert(first === text, `複製テキスト不一致`);
  });

  // --- 結果 ---
  console.log(`\n${'─'.repeat(34)}`);
  console.log(`結果: ${passed} passed, ${failed} failed`);
  console.log(`${'─'.repeat(34)}\n`);

  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
})();
