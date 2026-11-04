# X banner (1500x500) in the brand's pixel-pillar motif, plus a preview with the profile picture where X puts it.
# Left pillars fade out above the avatar; the text block sits right of it. Run from the repo root.
import random
import numpy as np
from PIL import Image, ImageDraw, ImageFont

random.seed(5)
W, H, CX = 1500, 500, 790
OUT = "x-launch"

bg = Image.new("RGB", (W, H), (11, 11, 12)); g = ImageDraw.Draw(bg)
for r in range(600, 0, -6):
    t = r / 600
    g.ellipse((CX - r * 1.1, 250 - r * .5, CX + r * 1.1, 250 + r * .5), fill=(int(11 + 31 * (1 - t)), int(11 + 5 * (1 - t)), int(12 - 7 * (1 - t))))
seat = Image.new("RGB", (W, H)); sd = ImageDraw.Draw(seat)
for r in range(260, 0, -4):
    a = int(95 * (1 - r / 260) ** 1.6); sd.ellipse((215 - r * 1.3, 500 - r, 215 + r * 1.3, 500 + r), fill=(a, int(a * .35), int(a * .12)))
img = Image.fromarray(np.clip(np.asarray(bg, dtype=int) + np.asarray(seat, dtype=int), 0, 255).astype("uint8"))
d = ImageDraw.Draw(img, "RGBA")

COLS = [(255, 90, 31), (255, 138, 76), (255, 214, 170), (228, 66, 14), (255, 241, 230)]
def pillar(cx, w, top, fade=None):
    for x in range(cx - w // 2, cx + w // 2, 8):
        dd = abs(x + 3 - cx) / (w / 2)
        for y in range(top, H, 8):
            if random.random() > 0.92 - 0.5 * dd: continue
            a = (0.45 + 0.55 * random.random()) * (1 - 0.5 * dd) * (1 - (y - top) / (H - top) * .3)
            if fade:
                if y > fade[1]: continue
                if y > fade[0]: a *= 1 - (y - fade[0]) / (fade[1] - fade[0])
            c = COLS[4] if random.random() < .22 else random.choice(COLS[:4])
            d.rectangle((x, y, x + 5, y + 5), fill=c + (int(255 * a),))
    for x in range(cx - w // 2 - 8, cx + w // 2 + 8, 8):
        for y in range(top - 16, top, 8):
            if random.random() < .85: d.rectangle((x, y, x + 5, y + 5), fill=(255, 179, 107, 210))
pillar(70, 64, 60, (220, 330)); pillar(185, 52, 110, (220, 330)); pillar(1315, 52, 110); pillar(1430, 64, 60)
d.rectangle((0, 0, W, 5), fill=(255, 90, 31, 255))

def font(size, bold=False):
    try: return ImageFont.truetype("/System/Library/Fonts/HelveticaNeue.ttc", size, index=1 if bold else 0)
    except OSError: return ImageFont.load_default()
def center(text, y, f, fill, spacing=0):
    widths = [d.textlength(ch, font=f) + spacing for ch in text] if spacing else [d.textlength(text, font=f)]
    x = CX - sum(widths) / 2
    if spacing:
        for ch, wd in zip(text, widths): d.text((x, y), ch, font=f, fill=fill); x += wd
    else: d.text((x, y), text, font=f, fill=fill)
center("The next trader on Solana is your agent.", 158, font(50), (246, 244, 239))
center("Sealed by your rules.", 226, font(50), (255, 122, 61))
center("CLAUDE · CHATGPT · X402 · JUPITER · ON-CHAIN REGISTRY", 316, font(17, True), (217, 207, 196), spacing=5)
img.save(f"{OUT}/banner.png")

p = Image.open(f"{OUT}/pfp.png").convert("RGB").resize((320, 320))
out = Image.new("RGB", (W, 760), "black"); out.paste(img, (0, 0))
ImageDraw.Draw(out).ellipse((47, 332, 383, 668), fill="black")
m = Image.new("L", (320, 320)); ImageDraw.Draw(m).ellipse((0, 0, 319, 319), fill=255)
out.paste(p, (55, 340), m); out.save(f"{OUT}/preview.png")
