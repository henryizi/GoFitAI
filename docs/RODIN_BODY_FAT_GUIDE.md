# Rodin (Deemos) Body Fat Model Creation Guide

This guide will help you create 3D body fat estimation models using Rodin (Deemos) and integrate them into your GoFitAI app.

## What is Rodin?

Rodin is a high-quality 3D character generation tool by ByteDance that can create 3D models from:
- **Text prompts** (text-to-3D)
- **Reference images** (image-to-3D)
- **API integration** (for programmatic generation)

## Step 1: Access Rodin Deemos

1. Go to [https://hyperhuman.deemos.com/](https://hyperhuman.deemos.com/) or [https://docs.deemos.dev](https://docs.deemos.dev)
2. Sign up for an account (may require API access or waitlist)
3. Navigate to the Rodin Generation interface

## Step 2: Choose Your Generation Method

### Method A: Text-to-3D (Recommended for Body Fat Models)

Rodin can generate 3D models directly from text descriptions. Use these optimized prompts:

#### For Male Models (7 variations):

1. **5-8% Body Fat (Very Lean):**
   ```
   A 3D male human character, front view, standing pose, extremely lean athletic physique with visible six-pack abs, defined chest muscles, visible ribcage, very low body fat around 5-8%, muscular definition, professional 3D character model, neutral expression, white background
   ```

2. **10-12% Body Fat (Lean):**
   ```
   A 3D male human character, front view, standing pose, lean athletic physique with visible abs, well-defined muscles, low body fat around 10-12%, athletic build, professional 3D character model, neutral expression, white background
   ```

3. **15% Body Fat (Moderately Lean):**
   ```
   A 3D male human character, front view, standing pose, moderately lean physique with some muscle definition, body fat around 15%, average athletic build, professional 3D character model, neutral expression, white background
   ```

4. **20% Body Fat (Average):**
   ```
   A 3D male human character, front view, standing pose, average physique with minimal muscle definition, body fat around 20%, normal build, professional 3D character model, neutral expression, white background
   ```

5. **25% Body Fat (Above Average):**
   ```
   A 3D male human character, front view, standing pose, slightly above average body fat around 25%, soft muscle definition, professional 3D character model, neutral expression, white background
   ```

6. **30% Body Fat (Higher):**
   ```
   A 3D male human character, front view, standing pose, higher body fat percentage around 30%, rounded physique, professional 3D character model, neutral expression, white background
   ```

7. **35%+ Body Fat (Highest):**
   ```
   A 3D male human character, front view, standing pose, highest body fat percentage around 35%, fuller physique, professional 3D character model, neutral expression, white background
   ```

#### For Female Models (7 variations):

1. **10-12% Body Fat:**
   ```
   A 3D female human character, front view, standing pose, very lean athletic physique with visible muscle definition, low body fat around 10-12%, athletic build, professional 3D character model, neutral expression, white background
   ```

2. **15-17% Body Fat:**
   ```
   A 3D female human character, front view, standing pose, lean athletic physique, body fat around 15-17%, fit build, professional 3D character model, neutral expression, white background
   ```

3. **20-22% Body Fat:**
   ```
   A 3D female human character, front view, standing pose, moderately lean physique, body fat around 20-22%, average athletic build, professional 3D character model, neutral expression, white background
   ```

4. **25% Body Fat:**
   ```
   A 3D female human character, front view, standing pose, average physique, body fat around 25%, normal build, professional 3D character model, neutral expression, white background
   ```

5. **30% Body Fat:**
   ```
   A 3D female human character, front view, standing pose, above average body fat around 30%, soft curves, professional 3D character model, neutral expression, white background
   ```

6. **35% Body Fat:**
   ```
   A 3D female human character, front view, standing pose, higher body fat percentage around 35%, fuller physique, professional 3D character model, neutral expression, white background
   ```

7. **40%+ Body Fat:**
   ```
   A 3D female human character, front view, standing pose, highest body fat percentage around 40%, full physique, professional 3D character model, neutral expression, white background
   ```

### Method B: Image-to-3D (Alternative)

If you have reference images of different body fat percentages:

1. Upload a reference image showing the desired body fat percentage
2. Use Rodin's image-to-3D feature
3. Adjust parameters if available
4. Generate the 3D model

## Step 3: Generate Models in Rodin

### Using the Web Interface:

1. **Enter your prompt** (from Step 2)
2. **Set generation parameters:**
   - Quality: High (for best results)
   - Material: PBR or Shaded (PBR recommended for better rendering)
   - Output format: GLB (for web/mobile) or OBJ (for static renders)

3. **Generate the model** (this may take a few minutes)

4. **Review and refine:**
   - If the first result isn't perfect, try adjusting the prompt
   - Add more specific details about body fat distribution
   - Regenerate until satisfied

### Using the API (Advanced):

If you have API access, you can programmatically generate all models:

```javascript
// Example API call structure (check Rodin docs for exact endpoint)
const generateModel = async (prompt, bodyFat) => {
  const response = await fetch('https://api.deemos.dev/rodin/generate', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer YOUR_API_KEY',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      prompt: prompt,
      quality: 'high',
      material: 'pbr',
      format: 'glb'
    })
  });
  return response.json();
};
```

## Step 4: Export Images from 3D Models

Since Rodin generates 3D models (GLB/OBJ), you need to render them as 2D images:

### Option A: Use Rodin's Built-in Renderer (if available)

1. Open your generated model in Rodin
2. Position camera to front view
3. Set background to white or transparent
4. Export as PNG image (1000x1500px recommended)

### Option B: Use Blender (Free, Recommended)

1. **Import the model:**
   - Open Blender (free download)
   - File → Import → glTF 2.0 (for GLB) or Wavefront (.obj)
   - Select your Rodin-generated model

2. **Set up the scene:**
   - Delete default cube/lighting
   - Add camera: Add → Camera
   - Position camera in front view (front orthographic)
   - Add lighting: Add → Light → Area Light (position above and in front)

3. **Configure render settings:**
   - Set render engine to "Cycles" or "EEVEE"
   - Set resolution: 1000x1500px (or higher)
   - Set background to white/transparent

4. **Render the image:**
   - Render → Render Image
   - Save as PNG with transparency if needed

5. **Repeat for all body fat percentages**

### Option C: Use Online GLB Viewers

1. Upload GLB to [gltf-viewer.donmccurdy.com](https://gltf-viewer.donmccurdy.com/)
2. Position camera to front view
3. Screenshot or use browser's print feature
4. Crop and save as PNG

## Step 5: Organize and Name Your Files

1. **Create folder structure:**
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

2. **Name files exactly as shown above** (case-sensitive)

## Step 6: Optimize Images

Before adding to your app:

1. **Resize if needed:** 1000-1500px width is ideal
2. **Optimize file size:** Use TinyPNG or similar (keep under 500KB per image)
3. **Ensure consistency:** Same camera angle, lighting, and pose for all images
4. **Test transparency:** If using transparent backgrounds, ensure they work on dark theme

## Step 7: Integrate into App

1. **Copy images** to the appropriate folders in your project
2. **Open** `/app/(onboarding)/body-fat.tsx`
3. **Find** the `LOCAL_IMAGES` object (around line 20-40)
4. **Uncomment and update** the require statements:

```typescript
const LOCAL_IMAGES: Record<string, any> = {
  // Male images
  'male-8': require('../../../assets/images/bodyfat/male/male-8.png'),
  'male-12': require('../../../assets/images/bodyfat/male/male-12.png'),
  'male-15': require('../../../assets/images/bodyfat/male/male-15.png'),
  'male-20': require('../../../assets/images/bodyfat/male/male-20.png'),
  'male-25': require('../../../assets/images/bodyfat/male/male-25.png'),
  'male-30': require('../../../assets/images/bodyfat/male/male-30.png'),
  'male-35': require('../../../assets/images/bodyfat/male/male-35.png'),
  
  // Female images
  'female-12': require('../../../assets/images/bodyfat/female/female-12.png'),
  'female-17': require('../../../assets/images/bodyfat/female/female-17.png'),
  'female-22': require('../../../assets/images/bodyfat/female/female-22.png'),
  'female-25': require('../../../assets/images/bodyfat/female/female-25.png'),
  'female-30': require('../../../assets/images/bodyfat/female/female-30.png'),
  'female-35': require('../../../assets/images/bodyfat/female/female-35.png'),
  'female-40': require('../../../assets/images/bodyfat/female/female-40.png'),
};
```

5. **Reload your app** - local images will now be used!

## Tips for Best Results with Rodin:

1. **Be specific in prompts:** Include "front view", "standing pose", "white background" for consistency
2. **Use consistent terminology:** Stick to the same descriptive words across all prompts
3. **Iterate:** Don't expect perfect results on first try - regenerate and refine
4. **Body fat progression:** Make sure each percentage is visually distinct
5. **Lighting:** Request "even lighting" or "studio lighting" in prompts for consistency
6. **Pose consistency:** Always specify "standing upright, front view" for all models

## Troubleshooting:

- **Models look inconsistent?** Use the same base prompt structure and only change body fat percentage
- **Generation fails?** Try shorter, simpler prompts first
- **API rate limits?** Space out your generation requests
- **3D model won't import?** Ensure you're using the correct format (GLB for web, OBJ for Blender)
- **Rendered images look different?** Check camera angle and lighting in your renderer
- **File size too large?** Optimize PNGs before adding to project

## Alternative: Using Rodin's API for Batch Generation

If you have API access, you can create a script to generate all models at once:

```javascript
const prompts = {
  male: [
    { value: 8, prompt: "A 3D male human character, front view..." },
    { value: 12, prompt: "A 3D male human character, front view..." },
    // ... etc
  ],
  female: [
    { value: 12, prompt: "A 3D female human character, front view..." },
    // ... etc
  ]
};

// Generate all models programmatically
```

Check the [Rodin API documentation](https://docs.deemos.dev/bytedance/api-specification/rodin-generation) for exact implementation details.





