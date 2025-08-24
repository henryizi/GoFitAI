// Improved function to extract newPlan from AI response
function extractNewPlan(text) {
  try {
    console.log('[EXTRACT PLAN] Processing text:', text.substring(0, 200) + '...');
    
    // The AI is instructed to respond with:
    // 1. A friendly message
    // 2. A JSON object like {"newPlan": {...}}
    
    // Strategy 1: Look for the JSON object at the end of the response
    const jsonAtEndMatch = text.match(/\n\s*(\{[\s\S]*\})\s*$/);
    if (jsonAtEndMatch && jsonAtEndMatch[1]) {
      console.log('[EXTRACT PLAN] Found JSON at end of response');
      try {
        const parsed = JSON.parse(jsonAtEndMatch[1]);
        const plan = parsed.newPlan || parsed;
        if (plan) {
          console.log('[EXTRACT PLAN] Successfully extracted plan from end JSON');
          return plan;
        }
      } catch (e) {
        console.error('[EXTRACT PLAN] Failed to parse JSON at end:', e);
      }
    }

    // Strategy 2: Look for JSON after the message, starting from any line break
    const afterBreakMatch = text.match(/\n+\s*(\{[\s\S]*\})\s*$/);
    if (afterBreakMatch && afterBreakMatch[1]) {
      console.log('[EXTRACT PLAN] Found JSON after line break');
      try {
        const parsed = JSON.parse(afterBreakMatch[1]);
        const plan = parsed.newPlan || parsed;
        if (plan) {
          console.log('[EXTRACT PLAN] Successfully extracted plan after break');
          return plan;
        }
      } catch (e) {
        console.error('[EXTRACT PLAN] Failed to parse JSON after break:', e);
      }
    }

    // Strategy 3: Try to extract JSON from markdown code blocks
    const markdownMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (markdownMatch && markdownMatch[1]) {
      console.log('[EXTRACT PLAN] Found markdown JSON block');
      try {
        const parsed = JSON.parse(markdownMatch[1]);
        const plan = parsed.newPlan || parsed;
        console.log('[EXTRACT PLAN] Extracted plan from markdown:', plan ? 'success' : 'failed');
        return plan;
      } catch (e) {
        console.error('[EXTRACT PLAN] Failed to parse JSON from markdown block:', e);
      }
    }
    
    // Strategy 4: Find the largest JSON object in the text
    const jsonMatches = text.match(/\{[\s\S]*?\}/g);
    if (jsonMatches && jsonMatches.length > 0) {
      console.log('[EXTRACT PLAN] Found', jsonMatches.length, 'JSON objects, trying largest');
      
      // Sort by length to try the largest first
      const sortedMatches = jsonMatches.sort((a, b) => b.length - a.length);
      
      for (const jsonMatch of sortedMatches) {
        try {
          const parsed = JSON.parse(jsonMatch);
          // Check if this looks like a plan object
          if (parsed.newPlan) {
            console.log('[EXTRACT PLAN] Found newPlan in JSON object');
            return parsed.newPlan;
          } else if (parsed.weeklySchedule || parsed.weekly_schedule || parsed.name) {
            console.log('[EXTRACT PLAN] Found plan-like object');
            return parsed;
          }
        } catch (e) {
          // Continue to next match
          continue;
        }
      }
    }
    
    // Strategy 5: Try to find JSON after common message patterns
    const patterns = [
      /(?:I've adjusted|I've modified|Here's your|Your plan)[\s\S]*?(\{[\s\S]*\})/s,
      /(?:modified|updated|changed)[\s\S]*?(\{[\s\S]*\})/si,
      /(?:plan|workout)[\s\S]*?(\{[\s\S]*\})/si
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        console.log('[EXTRACT PLAN] Found JSON with pattern match');
        try {
          const parsed = JSON.parse(match[1]);
          const plan = parsed.newPlan || parsed;
          if (plan && (plan.weeklySchedule || plan.weekly_schedule || plan.name)) {
            console.log('[EXTRACT PLAN] Successfully extracted plan with pattern');
            return plan;
          }
        } catch (e) {
          // Continue to next pattern
          continue;
        }
      }
    }
    
    // If all strategies fail, log the text and return null
    console.error('[EXTRACT PLAN] Could not find valid JSON in text:', text);
    return null;
  } catch (e) {
    console.error('[EXTRACT PLAN] Unexpected error extracting plan:', e);
    return null;
  }
}

module.exports = { extractNewPlan };
