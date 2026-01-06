# Simple Body Fat Images Guide

This is a simple guide for adding body fat comparison images to your app.

## What You Need

You need **14 images total** (7 for male, 7 for female) that show different body fat percentages. The key is they should all have:
- ✅ **Same style** (same art style, lighting, background)
- ✅ **Same figure** (same person/model, just different body fat levels)
- ✅ **Front view** (standing, facing camera)
- ✅ **Consistent pose** (same position for all images)

## Where to Find Images

### Option 1: Free Stock Images
- Search for "body fat percentage comparison" on:
  - Unsplash
  - Pexels
  - Pixabay
- Look for images that show multiple body fat percentages in one image, then crop them

### Option 2: Body Fat Chart Images
- Many fitness websites have body fat comparison charts
- These are usually consistent in style
- You can extract individual figures from these charts

### Option 3: Create Simple Illustrations
- Use Canva or similar tools
- Create simple silhouette-style figures
- Adjust the "thickness" to represent different body fat levels

### Option 4: Use AI Image Generation
- Use Midjourney, DALL-E, or Stable Diffusion
- Use this prompt template:
  ```
  Professional body fat comparison image, front view, standing pose, [MALE/FEMALE] figure, body fat percentage [X]%, white background, consistent style, medical illustration style
  ```
- Generate all 7 variations with the same style seed

## File Naming

Save your images with these exact names:

**Male images:**
- `male-8.png` (5-8% body fat)
- `male-12.png` (10-12% body fat)
- `male-15.png` (15% body fat)
- `male-20.png` (20% body fat)
- `male-25.png` (25% body fat)
- `male-30.png` (30% body fat)
- `male-35.png` (35%+ body fat)

**Female images:**
- `female-12.png` (10-12% body fat)
- `female-17.png` (15-17% body fat)
- `female-22.png` (20-22% body fat)
- `female-25.png` (25% body fat)
- `female-30.png` (30% body fat)
- `female-35.png` (35% body fat)
- `female-40.png` (40%+ body fat)

## Where to Put Images

1. Create these folders (if they don't exist):
   ```
   assets/images/bodyfat/male/
   assets/images/bodyfat/female/
   ```

2. Copy your images into the appropriate folders

3. Make sure file names match exactly (case-sensitive!)

## Update the Code

Once you have your images:

1. Open `/app/(onboarding)/body-fat.tsx`
2. Find the `LOCAL_IMAGES` section (around line 22)
3. Uncomment the lines for the images you've added:

```typescript
const LOCAL_IMAGES: Record<string, any> = {
  // Male images - uncomment when you add the images
  'male-8': require('../../../assets/images/bodyfat/male/male-8.png'),
  'male-12': require('../../../assets/images/bodyfat/male/male-12.png'),
  'male-15': require('../../../assets/images/bodyfat/male/male-15.png'),
  'male-20': require('../../../assets/images/bodyfat/male/male-20.png'),
  'male-25': require('../../../assets/images/bodyfat/male/male-25.png'),
  'male-30': require('../../../assets/images/bodyfat/male/male-30.png'),
  'male-35': require('../../../assets/images/bodyfat/male/male-35.png'),
  
  // Female images - uncomment when you add the images
  'female-12': require('../../../assets/images/bodyfat/female/female-12.png'),
  'female-17': require('../../../assets/images/bodyfat/female/female-17.png'),
  'female-22': require('../../../assets/images/bodyfat/female/female-22.png'),
  'female-25': require('../../../assets/images/bodyfat/female/female-25.png'),
  'female-30': require('../../../assets/images/bodyfat/female/female-30.png'),
  'female-35': require('../../../assets/images/bodyfat/female/female-35.png'),
  'female-40': require('../../../assets/images/bodyfat/female/female-40.png'),
};
```

4. Save and reload your app!

## Image Requirements

- **Format:** PNG (with transparency if possible)
- **Size:** 1000x1500px recommended (or similar aspect ratio)
- **Background:** White or transparent works best
- **File size:** Try to keep under 500KB per image (optimize with TinyPNG if needed)

## Quick Start

**Don't have images yet?** That's fine! The app will automatically use placeholder images from Unsplash until you add your own.

**Want to test it?** Just add one image (like `male-15.png`) and uncomment that line to see it work!





