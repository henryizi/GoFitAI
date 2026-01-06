# Spline AI Body Fat Model Creation Guide

This guide will help you create 3D body fat estimation models using Spline AI and integrate them into your GoFitAI app.

## Step 1: Create Your Spline AI Account

1. Go to [https://spline.design/ai](https://spline.design/ai)
2. Sign up for a free account (or use existing account)
3. Navigate to the AI generation tool

## Step 2: Generate Base Models

### For Male Models:
You'll need to create 7 different body fat percentages. Use these prompts:

1. **5-8% Body Fat (Very Lean):**
   ```
   A 3D male human figure, front view, standing upright, very lean physique with visible abs and muscle definition, athletic build, body fat percentage around 5-8%, neutral expression, white background, professional 3D render
   ```

2. **10-12% Body Fat (Lean):**
   ```
   A 3D male human figure, front view, standing upright, lean physique with good muscle definition, athletic build, body fat percentage around 10-12%, neutral expression, white background, professional 3D render
   ```

3. **15% Body Fat (Moderately Lean):**
   ```
   A 3D male human figure, front view, standing upright, moderately lean physique with some muscle definition, body fat percentage around 15%, neutral expression, white background, professional 3D render
   ```

4. **20% Body Fat (Average):**
   ```
   A 3D male human figure, front view, standing upright, average physique with minimal muscle definition, body fat percentage around 20%, neutral expression, white background, professional 3D render
   ```

5. **25% Body Fat (Above Average):**
   ```
   A 3D male human figure, front view, standing upright, slightly above average body fat, body fat percentage around 25%, neutral expression, white background, professional 3D render
   ```

6. **30% Body Fat (Higher):**
   ```
   A 3D male human figure, front view, standing upright, higher body fat percentage around 30%, neutral expression, white background, professional 3D render
   ```

7. **35%+ Body Fat (Highest):**
   ```
   A 3D male human figure, front view, standing upright, highest body fat percentage around 35%, neutral expression, white background, professional 3D render
   ```

### For Female Models:
Use similar prompts but adjust for female physique:

1. **10-12% Body Fat:**
   ```
   A 3D female human figure, front view, standing upright, very lean athletic physique with visible muscle definition, body fat percentage around 10-12%, neutral expression, white background, professional 3D render
   ```

2. **15-17% Body Fat:**
   ```
   A 3D female human figure, front view, standing upright, lean athletic physique, body fat percentage around 15-17%, neutral expression, white background, professional 3D render
   ```

3. **20-22% Body Fat:**
   ```
   A 3D female human figure, front view, standing upright, moderately lean physique, body fat percentage around 20-22%, neutral expression, white background, professional 3D render
   ```

4. **25% Body Fat:**
   ```
   A 3D female human figure, front view, standing upright, average physique, body fat percentage around 25%, neutral expression, white background, professional 3D render
   ```

5. **30% Body Fat:**
   ```
   A 3D female human figure, front view, standing upright, above average body fat, body fat percentage around 30%, neutral expression, white background, professional 3D render
   ```

6. **35% Body Fat:**
   ```
   A 3D female human figure, front view, standing upright, higher body fat percentage around 35%, neutral expression, white background, professional 3D render
   ```

7. **40%+ Body Fat:**
   ```
   A 3D female human figure, front view, standing upright, highest body fat percentage around 40%, neutral expression, white background, professional 3D render
   ```

## Step 3: Export Images from Spline

For each generated model:

1. **Position the Camera:**
   - Set camera to front view
   - Ensure the figure is centered
   - Use a white or transparent background

2. **Export Settings:**
   - Format: PNG (with transparency if possible)
   - Resolution: 1000x1500px (or higher for retina displays)
   - Background: Transparent or white
   - Click "Export" → "Image" → "PNG"

3. **Save Files:**
   - Save male images as: `male-8.png`, `male-12.png`, `male-15.png`, `male-20.png`, `male-25.png`, `male-30.png`, `male-35.png`
   - Save female images as: `female-12.png`, `female-17.png`, `female-22.png`, `female-25.png`, `female-30.png`, `female-35.png`, `female-40.png`

## Step 4: Add Images to Your Project

1. Create the folder structure:
   ```
   assets/images/bodyfat/
   ├── male/
   │   ├── male-8.png
   │   ├── male-12.png
   │   ├── male-15.png
   │   ├── male-20.png
   │   ├── male-25.png
   │   ├── male-30.png
   │   └── male-35.png
   └── female/
       ├── female-12.png
       ├── female-17.png
       ├── female-22.png
       ├── female-25.png
       ├── female-30.png
       ├── female-35.png
       └── female-40.png
   ```

2. Copy your exported PNG files into the appropriate folders

## Step 5: Alternative - Using Spline's Web Export

If you want to use Spline's interactive 3D viewer (more advanced):

1. Export as "Spline Scene" (JSON format)
2. Use `@splinetool/react-spline` package
3. This requires more setup but provides interactive 3D models

**Note:** For the body fat estimation feature, static images are recommended for better performance and smoother transitions.

## Tips for Best Results:

1. **Consistency:** Keep the same camera angle, lighting, and pose for all body fat percentages
2. **Progression:** Make sure the body fat progression is visually clear and gradual
3. **Quality:** Export at high resolution (1000px+ width) for retina displays
4. **Background:** Use transparent or white background for easy integration
5. **Testing:** Test the images in the app to ensure they look good on both light and dark backgrounds

## Troubleshooting:

- **Images look pixelated?** Export at higher resolution (1500px+)
- **Background doesn't match?** Use transparent PNGs or adjust in Spline before export
- **Models look inconsistent?** Use the same base model and adjust body fat parameters if Spline supports it
- **File size too large?** Optimize PNGs using tools like TinyPNG before adding to the project





