// ===================
// FOOD ANALYSIS ENDPOINT - HUGGING FACE ONLY
// ===================

app.post('/api/analyze-food', upload.single('foodImage'), async (req, res) => {
  console.log('[FOOD ANALYZE] Received food analysis request');
  
  try {
    // Check if we have a file upload, base64 image, or text description
    if (!req.file && !req.body.image && !req.body.imageDescription) {
      return res.status(400).json({ 
        success: false, 
        error: 'No food image or description provided' 
      });
    }

    console.log('[FOOD ANALYZE] Request details:', {
      hasFile: !!req.file,
      hasDescription: !!req.body.imageDescription,
      fileInfo: req.file ? {
        originalname: req.file.originalname,
        filename: req.file.filename,
        mimetype: req.file.mimetype,
        size: req.file.size
      } : null
    });

    const prompt = `You are an expert nutritionist and culinary AI specialist. Analyze this food and provide detailed nutritional information.

CRITICAL INSTRUCTIONS:
1. FIRST identify the SPECIFIC DISH NAME (e.g., "French Toast", "Pad Thai", "Sushi Roll")
2. Identify the CUISINE TYPE (e.g., "American Breakfast", "Thai", "Japanese")
3. Recognize COOKING METHODS (e.g., "grilled", "fried", "baked")
4. Identify ALL visible food items and ingredients
5. Estimate portion sizes accurately
6. Provide detailed nutritional breakdown

Return ONLY a valid JSON object with this structure:
{
  "dishName": "Specific dish name",
  "cuisineType": "Cuisine category",
  "cookingMethod": "How it was prepared",
  "foodItems": [
    {
      "name": "ingredient name",
      "quantity": "estimated amount",
      "calories": 0,
      "protein": 0,
      "carbs": 0,
      "fat": 0,
      "fiber": 0
    }
  ],
  "totalNutrition": {
    "calories": 0,
    "protein": 0,
    "carbs": 0,
    "fat": 0,
    "fiber": 0,
    "sugar": 0,
    "sodium": 0
  },
  "portionSize": "description",
  "confidence": 0.85
}`;

    let aiResponse = null;

    // If we have a text description only, use AI text analysis
    if (req.body.imageDescription && !req.file) {
      console.log('[FOOD ANALYZE] Text-only analysis path');
      const description = String(req.body.imageDescription).slice(0, 2000);
      console.log('[FOOD ANALYZE] Analyzing text description:', description);
      
      try {
        aiResponse = await callAI([
          { role: 'user', content: `${prompt}\n\nFood description: ${description}` }
        ]);
        
        if (aiResponse && !aiResponse.error) {
          console.log('[FOOD ANALYZE] AI text analysis succeeded');
        } else {
          throw new Error('AI text analysis failed');
        }
      } catch (aiError) {
        console.warn('[FOOD ANALYZE] AI text analysis failed, using fallback:', aiError.message);
        const fallbackResult = analyzeFoodWithFallback(description);
        return res.json({
          success: true,
          data: {
            success: true,
            nutrition: fallbackResult,
            message: 'AI analysis temporarily unavailable. Used rule-based estimation.'
          }
        });
      }
    } else {
      // Image analysis path - Use Hugging Face Vision API
      console.log('[FOOD ANALYZE] Image analysis path');
      
      let imageBuffer;
      let base64Image;

      // Handle different image input types
      if (req.file) {
        console.log('[FOOD ANALYZE] Processing uploaded file');
        imageBuffer = fs.readFileSync(req.file.path);
        base64Image = imageBuffer.toString('base64');
      } else if (req.body.image) {
        console.log('[FOOD ANALYZE] Processing base64 image');
        if (req.body.image.startsWith('data:')) {
          // Extract base64 from data URL
          base64Image = req.body.image.split(',')[1];
        } else {
          base64Image = req.body.image;
        }
        imageBuffer = Buffer.from(base64Image, 'base64');
      }

      console.log('[FOOD ANALYZE] Image size:', imageBuffer.length, 'bytes');

      // Check Hugging Face configuration
      if (!HF_API_TOKEN) {
        console.log('[FOOD ANALYZE] Hugging Face API token not configured, using fallback');
        const fallbackResult = analyzeFoodWithFallback('food items from image');
        return res.json({
          success: true,
          data: {
            success: true,
            nutrition: fallbackResult,
            message: 'Vision analysis not available. Used rule-based estimation.'
          }
        });
      }

      try {
        console.log('[FOOD ANALYZE] Calling Hugging Face Vision API');
        
        // Use Hugging Face BLIP model for image captioning
        const visionResponse = await axios.post(
          'https://api-inference.huggingface.co/models/Salesforce/blip-image-captioning-large',
          imageBuffer,
          {
            headers: {
              'Authorization': `Bearer ${HF_API_TOKEN}`,
              'Content-Type': 'application/octet-stream'
            },
            timeout: 30000
          }
        );

        console.log('[FOOD ANALYZE] Hugging Face API response:', visionResponse.status);
        
        // Extract caption from response
        const captionResult = visionResponse.data;
        let caption = '';
        
        if (Array.isArray(captionResult) && captionResult.length > 0) {
          caption = captionResult[0].generated_text || '';
        } else if (captionResult.generated_text) {
          caption = captionResult.generated_text;
        }

        console.log('[FOOD ANALYZE] Generated caption:', caption);

        if (caption) {
          // Use the caption to analyze nutrition with AI
          console.log('[FOOD ANALYZE] Analyzing caption with AI');
          try {
            aiResponse = await callAI([
              { role: 'user', content: `${prompt}\n\nFood in image: ${caption}` }
            ]);
            
            if (aiResponse && !aiResponse.error) {
              console.log('[FOOD ANALYZE] Successfully analyzed with Hugging Face + AI');
            } else {
              throw new Error('AI nutrition analysis failed');
            }
          } catch (aiError) {
            console.warn('[FOOD ANALYZE] AI nutrition analysis failed:', aiError.message);
            throw new Error('Failed to analyze nutrition from caption');
          }
        } else {
          throw new Error('No caption generated from image');
        }

      } catch (hfError) {
        console.warn('[FOOD ANALYZE] Hugging Face Vision API failed:', hfError.message);
        console.log('[FOOD ANALYZE] Using rule-based fallback');
        
        const fallbackResult = analyzeFoodWithFallback('food items from image');
        return res.json({
          success: true,
          data: {
            success: true,
            nutrition: fallbackResult,
            message: 'Vision analysis failed. Used rule-based estimation.'
          }
        });
      }
    }

    // Process AI response
    if (aiResponse && !aiResponse.error) {
      console.log('[FOOD ANALYZE] Processing AI response');
      
      try {
        const content = aiResponse.data?.choices?.[0]?.message?.content || 
                       aiResponse.choices?.[0]?.message?.content ||
                       aiResponse.content ||
                       JSON.stringify(aiResponse);

        console.log('[FOOD ANALYZE] AI Content preview:', String(content).slice(0, 200));

        // Parse JSON from AI response
        const analysisResult = findAndParseJson(content);
        
        if (!analysisResult || !analysisResult.totalNutrition) {
          throw new Error('Invalid AI response format');
        }

        console.log('[FOOD ANALYZE] Analysis completed successfully');
        
        // Clean up uploaded file
        try {
          if (req.file && req.file.path) {
            fs.unlinkSync(req.file.path);
            console.log('[FOOD ANALYZE] Cleaned up uploaded file:', req.file.filename);
          }
        } catch (cleanupError) {
          console.warn('[FOOD ANALYZE] Failed to cleanup uploaded file:', cleanupError.message);
        }
        
        return res.json({
          success: true,
          data: analysisResult
        });

      } catch (parseError) {
        console.error('[FOOD ANALYZE] Failed to parse AI response:', parseError.message);
        throw new Error('Failed to parse nutrition analysis');
      }
    } else {
      throw new Error('No valid AI response received');
    }

  } catch (error) {
    console.error('[FOOD ANALYZE] Error:', error.message);

    // Always provide fallback analysis instead of error response
    console.log('[FOOD ANALYZE] Using emergency fallback due to error');
    const fallbackResult = analyzeFoodWithFallback('food items from image');
    
    // Clean up uploaded file on error
    try {
      if (req.file && req.file.path) {
        fs.unlinkSync(req.file.path);
        console.log('[FOOD ANALYZE] Cleaned up uploaded file after error:', req.file.filename);
      }
    } catch (cleanupError) {
      console.warn('[FOOD ANALYZE] Failed to cleanup uploaded file after error:', cleanupError.message);
    }
    
    return res.json({
      success: true,
      data: {
        success: true,
        nutrition: fallbackResult,
        message: 'Analysis service temporarily unavailable. Using fallback estimation.'
      }
    });
  }
});

