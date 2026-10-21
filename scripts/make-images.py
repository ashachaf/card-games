import os
from PIL import Image, ImageDraw, ImageFont

OUT = os.path.expanduser("~/card-games/site")
BLUE, BLUE2, FACE, INK, RED, PAPER = (35, 64, 143), (58, 88, 176), (255, 254, 250), (26, 26, 31), (194, 29, 56), (242, 243, 247)
SUP = "/System/Library/Fonts/Supplemental/"
uni = lambda n: ImageFont.truetype(SUP + "Arial Unicode.ttf", n)
bold = lambda n: ImageFont.truetype(SUP + "Arial Bold.ttf", n)
heb = lambda n: ImageFont.truetype(SUP + "Arial Bold.ttf", n)

def card(img, x, y, w, rank, suit, angle):
    h = int(w * 1.4)
    c = Image.new("RGBA", (w + 20, h + 20), (0, 0, 0, 0))
    d = ImageDraw.Draw(c)
    d.rounded_rectangle((12, 14, w + 12, h + 14), radius=w // 10, fill=(0, 0, 0, 70))
    d.rounded_rectangle((6, 6, w + 6, h + 6), radius=w // 10, fill=FACE, outline=(201, 204, 214), width=2)
    col = RED if suit in "♥♦" else INK
    d.text((6 + w * 0.1, 6 + w * 0.06), rank, font=bold(int(w * 0.24)), fill=col)
    d.text((6 + w * 0.1, 6 + w * 0.32), suit, font=uni(int(w * 0.2)), fill=col)
    d.text((6 + w / 2, 6 + h * 0.58), suit, font=uni(int(w * 0.55)), fill=col, anchor="mm")
    c = c.rotate(angle, resample=Image.BICUBIC, expand=True)
    img.alpha_composite(c, (x - c.width // 2, y - c.height // 2))

def backdrop(size):
    img = Image.new("RGBA", size, BLUE)
    d = ImageDraw.Draw(img)
    for i in range(-size[1], size[0], 28):
        d.line((i, 0, i + size[1], size[1]), fill=BLUE2, width=10)
    return img

# Share image, 1200x630: a fan of three cards, the Hebrew name and the address.
img = backdrop((1200, 630))
d = ImageDraw.Draw(img)
d.rounded_rectangle((40, 40, 1160, 590), radius=36, fill=PAPER)
card(img, 230, 330, 180, "A", "♠", 14)
card(img, 325, 300, 180, "K", "♥", 0)
card(img, 420, 330, 180, "Q", "♦", -14)
# Pillow without a shaping engine lays text left to right; Hebrew letters don't join,
# so reversing the string draws it correctly.
d.text((1110, 230), "משחקי קלפים"[::-1], font=heb(92), fill=INK, anchor="rm")
d.text((1110, 335), "איך משחקים, צעד אחר צעד"[::-1], font=heb(44), fill=(89, 96, 121), anchor="rm")
d.text((1110, 470), "card-games.win", font=bold(48), fill=BLUE, anchor="rm")
img.convert("RGB").save(f"{OUT}/og.png", optimize=True)

# Ace of spades: the app icon (512), the iPhone home-screen icon (180) and the browser-tab
# fallback (32). The tab icon itself is site/favicon.svg, the same card drawn as a vector.
def ace(size):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    s = size / 64
    d.rounded_rectangle((9 * s, 2 * s, 55 * s, 62 * s), radius=7 * s, fill=FACE, outline=BLUE, width=max(1, round(3 * s)))
    d.text((14.5 * s, 7 * s), "A", font=bold(round(15 * s)), fill=INK)
    d.text((32 * s, 37 * s), "\u2660", font=uni(round(34 * s)), fill=INK, anchor="mm")
    return img

ace(512).save(f"{OUT}/icon.png", optimize=True)
touch = Image.new("RGBA", (180, 180), BLUE)  # iOS fills transparency with black, so give it a ground
touch.alpha_composite(ace(150), (15, 15))
touch.convert("RGB").save(f"{OUT}/apple-touch-icon.png", optimize=True)
ace(32).save(f"{OUT}/favicon-32.png", optimize=True)
print("ok")
