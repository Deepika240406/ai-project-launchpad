"""Regenerate the social card + icon set for the indigo-led palette.

Colours mirror tailwind.config.js so the shared asset and the product cannot
drift apart. The headline uses the same lime highlighter as the hero: ink on
lime (16.4:1) is the strongest pair in the system, and it is what makes the
"AI Project" promise land instead of fading into an olive-green.

Run: python3 scripts/make-assets.py
"""

from PIL import Image, ImageDraw, ImageFont, ImageFilter

# --- tokens (keep in sync with tailwind.config.js) --------------------------
INK = (11, 15, 25)
INK_MUTED = (75, 84, 104)
INK_FAINT = (104, 112, 126)
LINE = (231, 233, 242)
LINE_STRONG = (126, 135, 152)
SURFACE_2 = (248, 249, 252)
SURFACE_4 = (231, 235, 243)
BRAND = (79, 70, 229)        # indigo
BRAND_DEEP = (55, 48, 163)
BRAND_TINT = (238, 240, 255)
LIME = (204, 255, 77)
WHITE = (255, 255, 255)

BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
REG = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
MONO = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"
MONO_B = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf"

f = lambda p, s: ImageFont.truetype(p, s)


def zigzag(draw, x, y, size, colour, width):
    """The N mark: down, diagonal up, down — drawn as three strokes."""
    w = size
    h = size
    draw.line([(x, y + h), (x, y)], fill=colour, width=width, joint="curve")
    draw.line([(x, y), (x + w, y + h)], fill=colour, width=width, joint="curve")
    draw.line([(x + w, y + h), (x + w, y)], fill=colour, width=width, joint="curve")


def soft_wash(img, cx, cy, rx, ry, colour, alpha):
    """One radial tint, composited — three of these is what made the old card
    look muddy, so the palette below uses exactly two, both indigo-family."""
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=colour + (alpha,))
    layer = layer.filter(ImageFilter.GaussianBlur(120))
    img.alpha_composite(layer)


# =========================================================== social card
W, H = 1200, 630
card = Image.new("RGBA", (W, H), WHITE + (255,))
soft_wash(card, 120, 40, 620, 400, BRAND, 26)
soft_wash(card, 900, 720, 520, 300, LIME, 30)

# faint engineering grid
grid = Image.new("RGBA", (W, H), (0, 0, 0, 0))
gd = ImageDraw.Draw(grid)
for x in range(0, W, 56):
    gd.line([(x, 0), (x, H)], fill=INK + (12,), width=1)
for y in range(0, H, 56):
    gd.line([(0, y), (W, y)], fill=INK + (12,), width=1)
card.alpha_composite(grid)

d = ImageDraw.Draw(card)

# logo lockup
d.rounded_rectangle([68, 56, 112, 100], radius=13, fill=BRAND)
zigzag(d, 82, 70, 16, WHITE, 2)
d.text((126, 58), "AI PROJECT LAUNCHPAD", font=f(BOLD, 21), fill=INK)
d.text((126, 84), "BY NXTWAVE   ·   FREE 60-MIN WORKSHOP", font=f(MONO, 12), fill=INK_FAINT)

# headline — line 2 sits on the lime highlighter
d.text((68, 196), "Build Your First", font=f(BOLD, 62), fill=INK)
acc_font = f(BOLD, 62)
acc = "AI Project"
tw = d.textlength(acc, font=acc_font)
d.rounded_rectangle([62, 274, 62 + tw + 34, 356], radius=22, fill=LIME)
d.text((79, 288), acc, font=acc_font, fill=INK)
d.text((68, 384), "in 60 Minutes.", font=f(BOLD, 62), fill=INK)

d.text((68, 480), "Stop watching AI tutorials. Pick an idea, follow the", font=f(REG, 22), fill=INK_MUTED)
d.text((68, 512), "workflow, and ship a working AI prototype — free.", font=f(REG, 22), fill=INK_MUTED)

# trust chips
x = 68
for label in ["FREE", "60 MINUTES", "BEGINNER FRIENDLY", "500 SEATS"]:
    w = d.textlength(label, font=f(MONO_B, 13)) + 28
    d.rounded_rectangle([x, 560, x + w, 594], radius=17, fill=SURFACE_2, outline=LINE, width=1)
    d.text((x + 14, 572), label, font=f(MONO_B, 13), fill=INK_MUTED)
    x += w + 10

# project list — the selected one uses indigo, not lime
px, py, pw = 812, 214, 320
projects = [("AI Resume Analyzer", "Beginner", True), ("AI Interview Coach", "Beginner", False), ("Campus Assistant", "Beginner+", False)]
for name, level, active in projects:
    if active:
        d.rounded_rectangle([px, py, px + pw, py + 74], radius=16, fill=BRAND_TINT, outline=BRAND, width=2)
        d.ellipse([px + 20, py + 30, px + 32, py + 42], fill=BRAND)
    else:
        d.rounded_rectangle([px, py, px + pw, py + 74], radius=16, fill=WHITE, outline=LINE, width=1)
        d.ellipse([px + 20, py + 30, px + 32, py + 42], fill=SURFACE_4)
    d.text((px + 46, py + 20), name, font=f(BOLD, 19), fill=INK)
    d.text((px + 46, py + 44), level, font=f(REG, 15), fill=INK_MUTED)
    py += 88

d.text((812, 186), "WHAT COULD YOU BUILD?", font=f(MONO, 12), fill=INK_FAINT)

card.convert("RGB").save("public/og.png", optimize=True)
print("public/og.png  1200x630")


# =========================================================== icons
def app_icon(size, radius_ratio=0.225, inset_ratio=0.30, bg=BRAND):
    """Indigo tile, white mark. The mark is the same N as the navbar logo."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    dr = ImageDraw.Draw(img)
    r = int(size * radius_ratio)
    dr.rounded_rectangle([0, 0, size - 1, size - 1], radius=r, fill=bg)
    pad = int(size * inset_ratio)
    w = size - pad * 2
    zigzag(dr, pad, pad + int(w * 0.16), w, WHITE, max(2, int(size * 0.075)))
    return img


for size in (96, 192, 512, 180):
    name = {96: "icon-96", 192: "icon-192", 512: "icon-512", 180: "apple-touch-icon"}[size]
    app_icon(size).save(f"public/icons/{name}.png", optimize=True)
    print(f"public/icons/{name}.png  {size}x{size}")

# maskable: keep the mark inside the 80% safe circle
m = Image.new("RGBA", (512, 512), BRAND + (255,))
inner = app_icon(512, radius_ratio=0, inset_ratio=0.36)
m.alpha_composite(inner)
m.convert("RGB").save("public/icons/icon-maskable-512.png", optimize=True)
print("public/icons/icon-maskable-512.png  512x512")

for size in (16, 32):
    app_icon(size, radius_ratio=0.18, inset_ratio=0.26).save(f"public/favicon-{size}.png", optimize=True)
print("public/favicon-16.png, public/favicon-32.png")
