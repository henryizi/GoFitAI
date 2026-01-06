import os
from PIL import Image, ImageDraw, ImageFont

# Image specifications
WIDTH, HEIGHT = 1024, 1024
FILENAME = "assets/iap-lifetime-1024.png"

# Colors
ORANGE = (255, 107, 53)  # #FF6B35
DARK_BG = (5, 5, 7)      # Even darker background
GRAY_TEXT = (200, 200, 200)
WHITE = (255, 255, 255)

def generate_image():
    # Create background
    image = Image.new("RGB", (WIDTH, HEIGHT), DARK_BG)
    draw = ImageDraw.Draw(image)

    # Draw a prominent orange glow in the center
    for r in range(600, 0, -10):
        alpha = int(60 * (1 - r/600))
        blend_factor = alpha / 255
        current_color = (
            int(DARK_BG[0] * (1 - blend_factor) + ORANGE[0] * blend_factor),
            int(DARK_BG[1] * (1 - blend_factor) + ORANGE[1] * blend_factor),
            int(DARK_BG[2] * (1 - blend_factor) + ORANGE[2] * blend_factor)
        )
        draw.ellipse([WIDTH//2 - r, HEIGHT//2 - r, WIDTH//2 + r, HEIGHT//2 + r], fill=current_color)

    # Load fonts with MUCH larger sizes
    font_paths = [
        "/System/Library/Fonts/Helvetica.ttc",
        "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "arial.ttf"
    ]
    
    font_brand = None
    font_main = None
    font_price = None
    font_foot = None
    
    for path in font_paths:
        try:
            font_brand = ImageFont.truetype(path, 80)   # Was 60
            font_main = ImageFont.truetype(path, 180)   # Was 120
            font_premium = ImageFont.truetype(path, 160) # Was 120
            font_price = ImageFont.truetype(path, 110)  # Was 60
            font_foot = ImageFont.truetype(path, 55)    # Was 40
            break
        except:
            continue

    # Draw Text
    # GoFitAI
    text_brand = "GoFitAI"
    if font_brand:
        w = draw.textlength(text_brand, font=font_brand)
        draw.text(((WIDTH - w) // 2, 100), text_brand, fill=ORANGE, font=font_brand)

    # LIFETIME (Main)
    text_main = "LIFETIME"
    if font_main:
        w = draw.textlength(text_main, font=font_main)
        draw.text(((WIDTH - w) // 2, 280), text_main, fill=WHITE, font=font_main)

    # PREMIUM (Sub)
    text_sub = "PREMIUM"
    if font_premium:
        w = draw.textlength(text_sub, font=font_premium)
        draw.text(((WIDTH - w) // 2, 460), text_sub, fill=ORANGE, font=font_premium)

    # Price
    text_price = "$149.99"
    if font_price:
        w = draw.textlength(text_price, font=font_price)
        draw.text(((WIDTH - w) // 2, 700), text_price, fill=WHITE, font=font_price)

    # Footnote
    text_foot = "ONE-TIME • OWN FOREVER"
    if font_foot:
        w = draw.textlength(text_foot, font=font_foot)
        draw.text(((WIDTH - w) // 2, 840), text_foot, fill=GRAY_TEXT, font=font_foot)

    # Decorative frame - thicker
    draw.rectangle([30, 30, WIDTH-30, HEIGHT-30], outline=ORANGE, width=15)
    draw.rectangle([60, 60, WIDTH-60, HEIGHT-60], outline=(60, 60, 60), width=3)

    # Save
    os.makedirs(os.path.dirname(FILENAME), exist_ok=True)
    image.save(FILENAME)
    print(f"✅ Image regenerated with larger text: {FILENAME}")

if __name__ == "__main__":
    generate_image()




