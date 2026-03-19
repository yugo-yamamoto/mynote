from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os

BASE = os.path.dirname(os.path.abspath(__file__))
DOCS = os.path.join(BASE, '..', 'docs')

before = Image.open(os.path.join(DOCS, 'demo_before.png'))
after  = Image.open(os.path.join(DOCS, 'demo_after.png'))

W, H = before.size  # 800x400
PAD     = 40
SHADOW  = 12          # 影の大きさ
ARROW_W = 120
LABEL_H = 48
TOTAL_W = (W + SHADOW) * 2 + ARROW_W + PAD * 4
TOTAL_H = H + SHADOW + LABEL_H + PAD * 2

BG     = (249, 247, 244)
PURPLE = (139, 127, 192)
GRAY   = (136, 136, 136)
WHITE  = (255, 255, 255)
SHADOW_COLOR = (180, 175, 170)

canvas = Image.new('RGB', (TOTAL_W, TOTAL_H), BG)
draw = ImageDraw.Draw(canvas)

def get_font(size, bold=True):
    candidates = [
        '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
        '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf',
        '/usr/share/fonts/truetype/freefont/FreeSansBold.ttf',
    ]
    for path in candidates:
        if os.path.exists(path):
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()

def label(text, cx, y, color=GRAY, size=18):
    font = get_font(size)
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    draw.text((cx - tw // 2, y), text, fill=color, font=font)

def paste_with_shadow(img, x, y):
    """影 → 白枠 → 画像の順に貼り付け"""
    # 影（右下にオフセット）
    shadow_layer = Image.new('RGB', canvas.size, BG)
    shadow_draw = ImageDraw.Draw(shadow_layer)
    shadow_draw.rectangle(
        [x + SHADOW, y + SHADOW, x + W + SHADOW, y + H + SHADOW],
        fill=SHADOW_COLOR
    )
    # ガウスぼかしで柔らかい影に
    shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(radius=6))
    canvas.paste(shadow_layer.crop((x, y, x + W + SHADOW * 2, y + H + SHADOW * 2)), (x, y))

    # 白背景（枠の内側）
    canvas.paste(Image.new('RGB', (W, H), WHITE), (x, y))
    # 画像本体
    canvas.paste(img, (x, y))
    # 枠線
    draw2 = ImageDraw.Draw(canvas)
    draw2.rectangle([x - 1, y - 1, x + W, y + H], outline=(210, 205, 200), width=2)

y_img = PAD + LABEL_H

# --- Before ---
x_before = PAD
paste_with_shadow(before, x_before, y_img)
label('Before', x_before + W // 2, PAD, color=GRAY, size=22)

# --- 矢印 ---
ax1 = x_before + W + PAD
ax2 = ax1 + ARROW_W
arrow_cy = y_img + H // 2

draw.line([(ax1, arrow_cy), (ax2 - 20, arrow_cy)], fill=PURPLE, width=5)
aw, ah = 20, 14
draw.polygon([
    (ax2, arrow_cy),
    (ax2 - aw, arrow_cy - ah),
    (ax2 - aw, arrow_cy + ah),
], fill=PURPLE)

# キー表示 (4倍: 14 → 56)
label('Alt + ↓', ax1 + ARROW_W // 2, arrow_cy - 50, color=PURPLE, size=56)

# --- After ---
x_after = ax2 + PAD
paste_with_shadow(after, x_after, y_img)
label('After', x_after + W // 2, PAD, color=GRAY, size=22)

# ハイライト枠（移動した段落）
row_top    = y_img + 102
row_bottom = y_img + 192
draw.rectangle(
    [x_after + 20, row_top, x_after + W - 20, row_bottom],
    outline=PURPLE, width=4
)

out_path = os.path.join(DOCS, 'demo_reorder.png')
canvas.save(out_path)
print(f'saved: {out_path}  size={canvas.size}')
