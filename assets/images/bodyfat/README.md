# Body Fat Estimation Images

This folder contains body fat comparison images for the estimation feature.

📖 **Simple Guide:** See `/docs/SIMPLE_BODY_FAT_IMAGES_GUIDE.md` for easy instructions on finding and adding images.

## Folder Structure

```
bodyfat/
├── male/
│   ├── male-8.png    (5-8% body fat)
│   ├── male-12.png   (10-12% body fat)
│   ├── male-15.png   (15% body fat)
│   ├── male-20.png   (20% body fat)
│   ├── male-25.png   (25% body fat)
│   ├── male-30.png   (30% body fat)
│   └── male-35.png   (35%+ body fat)
└── female/
    ├── female-12.png (10-12% body fat)
    ├── female-17.png (15-17% body fat)
    ├── female-22.png (20-22% body fat)
    ├── female-25.png (25% body fat)
    ├── female-30.png (30% body fat)
    ├── female-35.png (35% body fat)
    └── female-40.png (40%+ body fat)
```

## How to Add Your Images

1. **Find or create images:**
   - Use the simple guide in `/docs/SIMPLE_BODY_FAT_IMAGES_GUIDE.md`
   - Find consistent body fat comparison images online
   - Or create simple illustrations
   - Make sure all images have the same style and figure

2. **Name Your Files:**
   - Use the exact naming convention shown above
   - Example: `male-8.png`, `female-12.png`, etc.

3. **Place Files:**
   - Put male images in `male/` folder
   - Put female images in `female/` folder

4. **Update Code:**
   - Open `/app/(onboarding)/body-fat.tsx`
   - Find the `LOCAL_IMAGES` object (around line 20)
   - Uncomment and update the require statements for your images
   - Example:
     ```typescript
     'male-8': require('../../../assets/images/bodyfat/male/male-8.png'),
     ```

5. **Test:**
   - Reload your app
   - Navigate to the body fat estimation screen
   - Your local images should now be used instead of remote URLs

## Image Specifications

- **Format:** PNG
- **Resolution:** 1000x1500px minimum (for retina displays)
- **Background:** Transparent or white
- **Orientation:** Front view, centered figure
- **File Size:** Optimize to keep under 500KB per image if possible

## Troubleshooting

- **Images not showing?** Check that file names match exactly (case-sensitive)
- **App crashes?** Make sure all require() paths are correct and images exist
- **Images look pixelated?** Export at higher resolution (1500px+ width)
- **Still seeing placeholder images?** Make sure you uncommented the require() statements in the code





