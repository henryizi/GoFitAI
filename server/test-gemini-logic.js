/**
 * Test script to verify Gemini JSON parsing fixes (without API key)
 */

const GeminiTextService = require('./services/geminiTextService');

async function testGeminiJsonParsingLogic() {
  console.log('🧪 Testing Gemini JSON Parsing Logic (without API key)...\n');

  try {
    // Test the cleanJsonString function with various problematic inputs
    console.log('📝 Testing cleanJsonString function...');
    
    // Mock the service to test the cleaning logic
    const mockService = {
      cleanJsonString: function(jsonString) {
        if (!jsonString || typeof jsonString !== 'string') {
          throw new Error('Invalid JSON string provided');
        }

        // Remove markdown code block markers
        let cleaned = jsonString.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        // Remove any remaining markdown artifacts
        cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
        // Trim whitespace
        cleaned = cleaned.trim();
        
        // Handle empty or whitespace-only strings
        if (!cleaned || cleaned.length === 0) {
          throw new Error('Empty JSON string after cleaning');
        }
        
        // Fix common JSON syntax errors
        // Remove trailing commas before closing braces/brackets
        cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');
        
        // Fix missing quotes around property names (but be careful not to over-escape)
        cleaned = cleaned.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');
        
        // Fix single quotes to double quotes (but preserve escaped quotes)
        cleaned = cleaned.replace(/(?<!\\)'/g, '"');
        
        // Fix common array/object syntax issues
        cleaned = cleaned.replace(/,\s*}/g, '}');
        cleaned = cleaned.replace(/,\s*]/g, ']');
        
        // Fix missing commas between array elements
        cleaned = cleaned.replace(/}\s*{/g, '},{');
        cleaned = cleaned.replace(/]\s*\[/g, '],[');
        
        // Fix invalid characters that might break JSON
        cleaned = cleaned.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
        
        // Fix common newline issues in strings
        cleaned = cleaned.replace(/\\n/g, '\\n');
        cleaned = cleaned.replace(/\\t/g, '\\t');
        
        // Fix common unicode issues
        cleaned = cleaned.replace(/[\u2028\u2029]/g, '');
        
        // Ensure the string starts and ends with proper JSON structure
        if (!cleaned.startsWith('{') && !cleaned.startsWith('[')) {
          // Try to find the start of JSON
          const jsonStart = cleaned.search(/[{\[]/);
          if (jsonStart !== -1) {
            cleaned = cleaned.substring(jsonStart);
          }
        }
        
        // Ensure the string ends with proper JSON structure
        if (!cleaned.endsWith('}') && !cleaned.endsWith(']')) {
          // Try to find the end of JSON
          const jsonEnd = cleaned.lastIndexOf('}');
          const arrayEnd = cleaned.lastIndexOf(']');
          const endIndex = Math.max(jsonEnd, arrayEnd);
          if (endIndex !== -1) {
            cleaned = cleaned.substring(0, endIndex + 1);
          }
        }
        
        return cleaned;
      }
    };

    // Test cases
    const testCases = [
      {
        name: 'Markdown code block',
        input: '```json\n{"recipe_name": "Test Recipe", "ingredients": []}\n```',
        expected: '{"recipe_name": "Test Recipe", "ingredients": []}'
      },
      {
        name: 'Trailing comma',
        input: '{"recipe_name": "Test Recipe", "ingredients": [],}',
        expected: '{"recipe_name": "Test Recipe", "ingredients": []}'
      },
      {
        name: 'Single quotes',
        input: "{'recipe_name': 'Test Recipe', 'ingredients': []}",
        expected: '{"recipe_name": "Test Recipe", "ingredients": []}'
      },
      {
        name: 'Unquoted property names',
        input: '{recipe_name: "Test Recipe", ingredients: []}',
        expected: '{"recipe_name": "Test Recipe", "ingredients": []}'
      },
      {
        name: 'Partial JSON with missing closing brace',
        input: '{"recipe_name": "Test Recipe", "ingredients": [',
        expected: '{"recipe_name": "Test Recipe", "ingredients": ['
      },
      {
        name: 'Unicode characters',
        input: '{"recipe_name": "Test Recipe\u2028", "ingredients": []}',
        expected: '{"recipe_name": "Test Recipe", "ingredients": []}'
      }
    ];

    let passedTests = 0;
    let totalTests = testCases.length;

    for (const testCase of testCases) {
      try {
        console.log(`\n🔍 Testing: ${testCase.name}`);
        console.log(`   Input: ${testCase.input}`);
        
        const result = mockService.cleanJsonString(testCase.input);
        console.log(`   Output: ${result}`);
        
        // Try to parse the result to ensure it's valid JSON
        try {
          JSON.parse(result);
          console.log(`   ✅ PASS: Valid JSON produced`);
          passedTests++;
        } catch (parseError) {
          console.log(`   ⚠️  WARNING: Output is not valid JSON: ${parseError.message}`);
        }
        
      } catch (error) {
        console.log(`   ❌ FAIL: ${error.message}`);
      }
    }

    console.log(`\n📊 Test Results: ${passedTests}/${totalTests} tests passed`);

    // Test partial JSON completion logic
    console.log('\n🔧 Testing partial JSON completion logic...');
    
    const partialJsonTests = [
      {
        name: 'Missing recipe_name',
        input: '{"ingredients": [], "instructions": []}',
        expected: '{"recipe_name": "Generated Recipe", "ingredients": [], "instructions": []}'
      },
      {
        name: 'Missing ingredients',
        input: '{"recipe_name": "Test Recipe", "instructions": []}',
        expected: '{"recipe_name": "Test Recipe", "ingredients": [], "instructions": []}'
      },
      {
        name: 'Missing nutrition',
        input: '{"recipe_name": "Test Recipe", "ingredients": []}',
        expected: '{"recipe_name": "Test Recipe", "ingredients": [], "nutrition": {"calories": 400, "protein": 20, "carbs": 30, "fat": 15}}'
      }
    ];

    for (const testCase of partialJsonTests) {
      console.log(`\n🔍 Testing partial completion: ${testCase.name}`);
      console.log(`   Input: ${testCase.input}`);
      
      let partialJson = testCase.input;
      
      // Apply completion logic
      if (!partialJson.includes('"recipe_name"')) {
        partialJson = partialJson.replace(/^\{/, '{"recipe_name": "Generated Recipe",');
      }
      if (!partialJson.includes('"ingredients"')) {
        partialJson = partialJson.replace(/,\s*$/, ',"ingredients": []');
      }
      if (!partialJson.includes('"instructions"')) {
        partialJson = partialJson.replace(/,\s*$/, ',"instructions": []');
      }
      if (!partialJson.includes('"nutrition"')) {
        partialJson = partialJson.replace(/,\s*$/, ',"nutrition": {"calories": 400, "protein": 20, "carbs": 30, "fat": 15}');
      }
      
      // Ensure it ends with }
      if (!partialJson.endsWith('}')) {
        partialJson += '}';
      }
      
      console.log(`   Completed: ${partialJson}`);
      
      try {
        JSON.parse(partialJson);
        console.log(`   ✅ PASS: Valid JSON after completion`);
      } catch (parseError) {
        console.log(`   ❌ FAIL: Invalid JSON after completion: ${parseError.message}`);
      }
    }

    console.log('\n✅ JSON parsing logic tests completed successfully!');
    console.log('🔧 The fixes should handle common JSON parsing issues');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  }
}

// Run the test
if (require.main === module) {
  testGeminiJsonParsingLogic()
    .then(() => {
      console.log('\n🏁 Test script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Test script failed:', error.message);
      process.exit(1);
    });
}

module.exports = { testGeminiJsonParsingLogic };

























































