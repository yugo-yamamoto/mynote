# mynote

シンプルなシングルページのメモアプリです。段落単位で編集・並び替えができます。

## 機能

### 基本操作

| 操作 | 動作 |
|------|------|
| クリック / Tab | 段落にフォーカス（閲覧モード） |
| Enter / ダブルクリック | 編集モードに入る |
| Escape | 編集モードを終了して閲覧モードに戻る |

### 閲覧モードのキー操作

| キー | 動作 |
|------|------|
| `j` / `↓` | 次の段落に移動 |
| `k` / `↑` | 前の段落に移動 |
| `Delete` | フォーカス中の段落を削除 |
| `Alt+↓` | 段落を下に移動 |
| `Alt+↑` | 段落を上に移動 |
| `Shift+Alt+↓` | 段落を下に複製 |
| `Shift+Alt+↑` | 段落を上に複製 |

### 編集モードのキー操作

| キー | 動作 |
|------|------|
| `Enter` | 編集を終了して次の段落に移動（最終段落では新しい段落を追加） |
| `Backspace` | テキストが空の場合、段落を削除 |
| `Escape` | 編集を終了して閲覧モードに戻る |

### その他

- 段落左端のハンドル（⠿）をドラッグして並び替え可能
- 内容は `localStorage` に自動保存（リロードしても保持）

## 使い方

依存関係なし。`index.html` をブラウザで直接開くだけで動作します。

```sh
open index.html
```

## テスト

[Playwright](https://playwright.dev/) を使った自動テストです。

### セットアップ

```sh
npm install
npx playwright install chromium
```

### 実行

**シンプルテスト**（結果のみ表示）

```sh
node tests/test.cjs
```

**スクリーンショット付きテスト**（レポート生成用）

```sh
node tests/test_screenshot.cjs
```

実行後、`tests/screenshots/` にスクリーンショット、`tests/test_results.json` に結果が保存されます。

### テスト項目

| カテゴリ | テスト数 |
|----------|---------|
| 閲覧モード移動（j / k / ↑↓） | 4 |
| 編集モード移行（Enter / Escape / ダブルクリック） | 3 |
| 編集モード中のキー（Enter / Backspace） | 3 |
| 段落削除（Delete） | 1 |
| 段落の移動・複製（Alt+↑↓ / Shift+Alt+↑↓） | 4 |
| **合計** | **15** |

## テストレポートの作成

スクリーンショット付きテストを実行した後、PowerPoint と PDF のレポートを生成できます。

### セットアップ

```sh
pip install python-pptx
```

### 実行

```sh
# 1. スクリーンショット付きテストを実行
node tests/test_screenshot.cjs

# 2. レポートを生成
python3 tests/make_pptx.py
```

`reports/mynote_test_report.pptx` と `reports/mynote_test_report.pdf` が出力されます。

PDFへの変換は LibreOffice を使用します。

```sh
libreoffice --headless --convert-to pdf reports/mynote_test_report.pptx --outdir reports/
```

## ファイル構成

```
mynote/
├── index.html              # アプリ本体
├── package.json
├── tests/
│   ├── test.cjs            # シンプルテスト
│   ├── test_screenshot.cjs # スクリーンショット付きテスト
│   └── make_pptx.py        # PowerPoint レポート生成
└── reports/
    ├── mynote_test_report.pptx
    └── mynote_test_report.pdf
```
