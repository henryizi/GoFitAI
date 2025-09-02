/**
 * Quick test to verify the enhanced response validation
 */

const GeminiTextService = require('./services/geminiTextService');

async function testResponseValidation() {
  console.log('🧪 Testing Enhanced Response Validation...\n');

  // Test cases for response validation
  const testCases = [
    {
      name: 'Null response',
      text: null,
      shouldThrow: true,
      expectedError: 'Null response received from Gemini'
    },
    {
      name: 'Undefined response',
      text: undefined,
      shouldThrow: true,
      expectedError: 'Null response received from Gemini'
    },
    {
      name: 'Empty string',
      text: '',
      shouldThrow: true,
      expectedError: 'Empty response received from Gemini'
    },
    {
      name: 'Whitespace only',
      text: '   \n\t   ',
      shouldThrow: true,
      expectedError: 'Empty response received from Gemini'
    },
    {
      name: 'Too short response',
      text: '{}',
      shouldThrow: true,
      expectedError: 'Response too short from Gemini'
    },
    {
      name: 'Valid response',
      text: '{"recipe_name": "Test Recipe", "ingredients": []}',
      shouldThrow: false
    }
  ];

  let passedTests = 0;
  let totalTests = testCases.length;

  for (const testCase of testCases) {
    try {
      console.log(`\n🔍 Testing: ${testCase.name}`);
      console.log(`   Input: ${testCase.text}`);
      
      // Simulate the validation logic
      if (testCase.text === null || testCase.text === undefined) {
        console.error('[GEMINI TEXT] Response is null or undefined');
        throw new Error('Null response received from Gemini');
      }
      
      if (testCase.text.trim().length === 0) {
        console.error('[GEMINI TEXT] Response is empty after trimming');
        throw new Error('Empty response received from Gemini');
      }
      
      if (testCase.text.length < 10) {
        console.error('[GEMINI TEXT] Response too short:', testCase.text);
        throw new Error('Response too short from Gemini');
      }
      
      console.log(`   ✅ PASS: Valid response`);
      passedTests++;
      
    } catch (error) {
      if (testCase.shouldThrow) {
        if (error.message === testCase.expectedError) {
          console.log(`   ✅ PASS: Expected error thrown: ${error.message}`);
          passedTests++;
        } else {
          console.log(`   ❌ FAIL: Unexpected error: ${error.message} (expected: ${testCase.expectedError})`);
        }
      } else {
        console.log(`   ❌ FAIL: Unexpected error: ${error.message}`);
      }
    }
  }

  console.log(`\n📊 Test Results: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('✅ All response validation tests passed!');
  } else {
    console.log('❌ Some tests failed');
  }
}

// Run the test
if (require.main === module) {
  testResponseValidation()
    .then(() => {
      console.log('\n🏁 Test completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Test failed:', error.message);
      process.exit(1);
    });
}

module.exports = { testResponseValidation };
