// Improved function to extract newPlan from AI response
function extractNewPlan(text) {
  try {
    // First try to extract JSON from markdown code blocks
    const markdownMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (markdownMatch && markdownMatch[1]) {
      try {
        const parsed = JSON.parse(markdownMatch[1]);
        return parsed.newPlan || null;
      } catch (e) {
        console.error('[EXTRACT PLAN] Failed to parse JSON from markdown block:', e);
      }
    }
    
    // Then try to find any JSON object in the text
    const jsonMatch = text.match(/\{[\s\S]*?\}/);
    if (jsonMatch && jsonMatch[0]) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed.newPlan || null;
      } catch (e) {
        console.error('[EXTRACT PLAN] Failed to parse JSON from text:', e);
      }
    }
    
    // Log the failure and return null
    console.error('[EXTRACT PLAN] Could not find valid JSON in text:', text.substring(0, 100) + '...');
    return null;
  } catch (e) {
    console.error('[EXTRACT PLAN] Unexpected error extracting plan:', e);
    return null;
  }
}

module.exports = { extractNewPlan };
