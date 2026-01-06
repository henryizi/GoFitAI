import os
from PIL import Image, ImageDraw, ImageFont

# Image specifications
WIDTH, HEIGHT = 1024, 1024
FILENAME = "assets/iap-lifetime-1024.png"

# Colors
ORANGE = (255, 107, 53)  # #FF6B35
DARK_BG = (5, 5, 7)
GRAY_TEXT = (200, 200, 200)
WHITE = (255, 255, 255)

def generate_image():
    # Create background
    image = Image.new("RGB", (WIDTH, HEIGHT), DARK_BG)
    draw = ImageDraw.Draw(image)

    # Central Glow
    for r in range(650, 0, -10):
        alpha = int(80 * (1 - r/650))
        blend = alpha / 255
        current_color = (
            int(DARK_BG[0] * (1 - blend) + ORANGE[0] * blend),
            int(DARK_BG[1] * (1 - blend) + ORANGE[1] * blend),
            int(DARK_BG[2] * (1 - blend) + ORANGE[2] * blend)
        )
        draw.ellipse([WIDTH//2 - r, HEIGHT//2 - r, WIDTH//2 + r, HEIGHT//2 + r], fill=current_color)

    # Use a bold system font
    font_path = "/System/Library/Fonts/Helvetica.ttc"
    if not os.path.exists(font_path):
        font_path = "/System/Library/Fonts/Supplemental/Arial.ttf"

    # Font Sizes - Large and Bold
    font_brand = ImageFont.truetype(font_path, 100)
    font_main = ImageFont.truetype(font_path, 240)
    font_premium = ImageFont.truetype(font_path, 220)
    font_price = ImageFont.truetype(font_path, 150)
    font_foot = ImageFont.truetype(font_path, 85)

    # Draw Text
    # GoFitAI
    t_brand = "GoFitAI"
    w = draw.textlength(t_brand, font=font_brand)
    draw.text(((WIDTH - w) // 2, 70), t_brand, fill=ORANGE, font=font_brand)

    # LIFETIME
    t_main = "LIFETIME"
    w = draw.textlength(t_main, font=font_main)
    draw.text(((WIDTH - w) // 2, 230), t_main, fill=WHITE, font=font_main)

    # PREMIUM
    t_sub = "PREMIUM"
    w = draw.textlength(t_sub, font=font_premium)
    draw.text(((WIDTH - w) // 2, 440), t_sub, fill=ORANGE, font=font_premium)

    # Price
    t_price = "$149.99"
    w = draw.textlength(t_price, font=font_price)
    draw.text(((WIDTH - w) // 2, 710), t_price, fill=WHITE, font=font_price)

    # Footer: ONE-TIME PAYMENT
    t_foot = "ONE-TIME PAYMENT"
    w = draw.textlength(t_foot, font=font_foot)
    draw.text(((WIDTH - w) // 2, 880), t_foot, fill=GRAY_TEXT, font=font_foot)

    # Save
    image.save(FILENAME)
    print(f"✅ Image generated without frame: {FILENAME}")

if __name__ == "__main__":
    generate_image()




