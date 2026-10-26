# Draws the QR codes in qr/: the plain code (site.png, site.svg for print) and a card that
# explains it (card.png): name, what the site does, the code, and the address.
# Needs: pip3 install "qrcode[pil]". Run: python3 scripts/make-qr.py
import json, os
import qrcode
from qrcode.image.svg import SvgPathImage
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "qr")
URL = json.load(open(os.path.join(ROOT, "site.config.json")))["site"] + "/"
HOST = URL.split("//")[1].rstrip("/")

BLUE, INK, MUTED, PAPER, LINE = (35, 64, 143), (23, 27, 44), (89, 96, 121), (255, 255, 255), (216, 219, 230)
SUP = "/System/Library/Fonts/Supplemental/"
bold = lambda n: ImageFont.truetype(SUP + "Arial Bold.ttf", n)
regular = lambda n: ImageFont.truetype(SUP + "Arial.ttf", n)
heb = lambda s: s[::-1]  # Pillow lays text left to right; Hebrew letters don't join, so reversing draws it right

def code(box):
    q = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=box, border=2)
    q.add_data(URL)
    q.make(fit=True)
    return q

os.makedirs(OUT, exist_ok=True)
code(20).make_image(fill_color=BLUE, back_color="white").save(os.path.join(OUT, "site.png"))
qrcode.make(URL, image_factory=SvgPathImage).save(os.path.join(OUT, "site.svg"))

# The card, 900 x 1200: readable on GitHub at about 300 px wide.
W, H = 900, 1200
card = Image.new("RGB", (W, H), PAPER)
d = ImageDraw.Draw(card)
d.rounded_rectangle((8, 8, W - 8, H - 8), radius=48, outline=LINE, width=4)
d.rounded_rectangle((8, 8, W - 8, 150), radius=48, fill=BLUE)
d.rectangle((8, 110, W - 8, 150), fill=BLUE)
d.text((W / 2, 80), heb("משחקי קלפים"), font=bold(76), fill=PAPER, anchor="mm")
d.text((W / 2, 215), heb("חוקים והסבר צעד אחר צעד"), font=bold(44), fill=INK, anchor="mm")
d.text((W / 2, 272), heb("למשחקים עם חפיסת קלפים רגילה"), font=regular(38), fill=MUTED, anchor="mm")
# Whole pixels per module, so every square stays sharp and the code scans reliably.
q = code(1)
box = 620 // (q.modules_count + 4)
qr = code(box).make_image(fill_color=BLUE, back_color="white").convert("RGB")
card.paste(qr, ((W - qr.width) // 2, 330 + (620 - qr.height) // 2))
d.text((W / 2, 1000), heb("סרקו כדי לפתוח"), font=bold(42), fill=INK, anchor="mm")
d.text((W / 2, 1075), HOST, font=bold(56), fill=BLUE, anchor="mm")
d.text((W / 2, 1140), heb("חינם, בלי הרשמה ובלי פרסומות"), font=regular(30), fill=MUTED, anchor="mm")
card.save(os.path.join(OUT, "card.png"), optimize=True)
print("ok:", os.listdir(OUT))
