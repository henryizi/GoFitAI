const axios = require('axios');

async function testRecipeGeneration() {
    console.log('🍳 Testing Recipe Generation...\n');

    const testCases = [
        {
            name: 'Breakfast Recipe',
            data: {
                mealType: 'breakfast',
                targets: {
                    calories: 400,
                    protein: 20,
                    carbs: 45,
                    fat: 15
                },
                ingredients: ['eggs', 'bread', 'milk'],
                strict: false
            }
        },
        {
            name: 'Lunch Recipe',
            data: {
                mealType: 'lunch',
                targets: {
                    calories: 600,
                    protein: 35,
                    carbs: 60,
                    fat: 20
                },
                ingredients: ['chicken', 'rice', 'vegetables'],
                strict: false
            }
        },
        {
            name: 'Dinner Recipe',
            data: {
                mealType: 'dinner',
                targets: {
                    calories: 500,
                    protein: 30,
                    carbs: 50,
                    fat: 18
                },
                ingredients: ['salmon', 'quinoa', 'broccoli'],
                strict: false
            }
        },
        {
            name: 'Snack Recipe',
            data: {
                mealType: 'snack',
                targets: {
                    calories: 200,
                    protein: 8,
                    carbs: 25,
                    fat: 10
                },
                ingredients: ['banana', 'peanut butter', 'honey'],
                strict: false
            }
        }
    ];

    for (const testCase of testCases) {
        console.log(`\n📋 Testing: ${testCase.name}`);
        console.log(`🍽️ Meal Type: ${testCase.data.mealType}`);
        console.log(`🥘 Ingredients: ${testCase.data.ingredients.join(', ')}`);
        console.log(`🎯 Targets: ${JSON.stringify(testCase.data.targets)}`);
        console.log(`🔒 Strict Mode: ${testCase.data.strict}`);

        try {
            console.log('\n📤 Sending request to: http://localhost:4001/api/generate-recipe');
            const response = await axios.post('http://localhost:4001/api/generate-recipe', testCase.data, {
                headers: { 'Content-Type': 'application/json' },
                timeout: 30000
            });

            if (response.data.success) {
                const recipe = response.data.recipe;
                console.log(`✅ Success! Provider: ${response.data.provider}`);
                console.log(`📝 Recipe Name: ${recipe.name || recipe.title || 'No name provided'}`);
                console.log(`⏱️ Prep Time: ${recipe.prepTime || recipe.prep_time || 'Not specified'}`);
                console.log(`👨‍🍳 Difficulty: ${recipe.difficulty || 'Not specified'}`);
                console.log(`🍽️ Servings: ${recipe.servings || 'Not specified'}`);

                console.log('\n📋 Ingredients:');
                const ingredients = recipe.ingredients || [];
                if (ingredients.length > 0) {
                    ingredients.forEach((ingredient, i) => {
                        if (typeof ingredient === 'string') {
                            console.log(`  ${i + 1}. ${ingredient}`);
                        } else if (ingredient.ingredient) {
                            const amount = ingredient.amount ? ` (${ingredient.amount})` : '';
                            console.log(`  ${i + 1}. ${ingredient.ingredient}${amount}`);
                        }
                    });
                } else {
                    console.log('  No ingredients listed');
                }

                console.log('\n👨‍🍳 Instructions:');
                const instructions = recipe.instructions || recipe.steps || [];
                if (instructions.length > 0) {
                    instructions.forEach((instruction, i) => {
                        if (typeof instruction === 'string') {
                            console.log(`  ${i + 1}. ${instruction}`);
                        } else if (instruction.step) {
                            console.log(`  ${i + 1}. ${instruction.step}`);
                        }
                    });
                } else {
                    console.log('  No instructions provided');
                }

                if (recipe.nutrition) {
                    console.log('\n🍎 Nutrition Info:');
                    const nutrition = recipe.nutrition;
                    if (nutrition.calories) console.log(`  Calories: ${nutrition.calories}`);
                    if (nutrition.protein) console.log(`  Protein: ${nutrition.protein}`);
                    if (nutrition.carbs) console.log(`  Carbs: ${nutrition.carbs}`);
                    if (nutrition.fat) console.log(`  Fat: ${nutrition.fat}`);
                }

                if (recipe.tips) {
                    console.log('\n💡 Tips:');
                    if (Array.isArray(recipe.tips)) {
                        recipe.tips.forEach((tip, i) => {
                            console.log(`  ${i + 1}. ${tip}`);
                        });
                    } else {
                        console.log(`  ${recipe.tips}`);
                    }
                }

                // Analyze recipe quality
                console.log('\n📊 Recipe Quality Analysis:');
                let hasIngredients = ingredients.length > 0;
                let hasInstructions = instructions.length > 0;
                let hasPrepTime = !!recipe.prepTime;
                let hasServings = !!recipe.servings;
                let hasNutrition = !!recipe.nutrition;
                let hasTips = !!recipe.tips;

                console.log(`Has Ingredients: ${hasIngredients ? '✅' : '❌'}`);
                console.log(`Has Instructions: ${hasInstructions ? '✅' : '❌'}`);
                console.log(`Has Prep Time: ${hasPrepTime ? '✅' : '❌'}`);
                console.log(`Has Servings: ${hasServings ? '✅' : '❌'}`);
                console.log(`Has Nutrition: ${hasNutrition ? '✅' : '❌'}`);
                console.log(`Has Tips: ${hasTips ? '✅' : '❌'}`);

                // Quality score
                let score = 0;
                if (hasIngredients) score += 25;
                if (hasInstructions) score += 30;
                if (hasPrepTime) score += 15;
                if (hasServings) score += 10;
                if (hasNutrition) score += 10;
                if (hasTips) score += 10;

                console.log(`\n🎯 Recipe Quality Score: ${score}/100`);
                if (score >= 80) {
                    console.log('🌟 Excellent recipe!');
                } else if (score >= 60) {
                    console.log('👍 Good recipe');
                } else {
                    console.log('⚠️ Needs improvement');
                }

            } else {
                console.log(`❌ Failed: ${response.data.error || 'Unknown error'}`);
            }

        } catch (error) {
            console.log(`❌ Error: ${error.message}`);
            if (error.response) {
                console.log(`Status: ${error.response.status}`);
                console.log(`Error: ${JSON.stringify(error.response.data, null, 2)}`);
            }
        }

        console.log('\n' + '─'.repeat(80));
    }
}

async function testRecipeGenerationWithStrictMode() {
    console.log('\n🔒 Testing Recipe Generation with Strict Mode...\n');

    const testData = {
        mealType: 'breakfast',
        targets: {
            calories: 300,
            protein: 15,
            carbs: 30,
            fat: 12
        },
        ingredients: ['eggs', 'bacon'],
        strict: true
    };

    console.log('📋 Testing Strict Mode Recipe');
    console.log(`🍽️ Meal Type: ${testData.mealType}`);
    console.log(`🥘 Ingredients: ${testData.ingredients.join(', ')}`);
    console.log(`🎯 Targets: ${JSON.stringify(testData.targets)}`);
    console.log(`🔒 Strict Mode: ${testData.strict}`);

    try {
        console.log('\n📤 Sending request to: http://localhost:4001/api/generate-recipe');
        const response = await axios.post('http://localhost:4001/api/generate-recipe', testData, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 30000
        });

        if (response.data.success) {
            console.log(`✅ Success! Provider: ${response.data.provider}`);
            console.log(`📝 Recipe Name: ${response.data.recipe.name || response.data.recipe.title || 'No name provided'}`);
            
            // Check if the recipe respects dietary restrictions
            const recipe = response.data.recipe;
            const ingredients = recipe.ingredients || [];
            const hasNonVegetarian = ingredients.some(ingredient => {
                const ingredientStr = typeof ingredient === 'string' ? ingredient.toLowerCase() : 
                                    ingredient.ingredient ? ingredient.ingredient.toLowerCase() : '';
                return ingredientStr.includes('bacon') || ingredientStr.includes('meat') || 
                       ingredientStr.includes('pork') || ingredientStr.includes('beef');
            });

            console.log(`\n🔒 Strict Mode Analysis:`);
            console.log(`Contains Non-Vegetarian Ingredients: ${hasNonVegetarian ? '❌' : '✅'}`);
            
            if (hasNonVegetarian) {
                console.log('⚠️ Recipe does not respect vegetarian restriction in strict mode');
            } else {
                console.log('✅ Recipe respects dietary restrictions');
            }

        } else {
            console.log(`❌ Failed: ${response.data.error || 'Unknown error'}`);
        }

    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
        if (error.response) {
            console.log(`Status: ${error.response.status}`);
            console.log(`Error: ${JSON.stringify(error.response.data, null, 2)}`);
        }
    }
}

// Run all tests
async function runAllTests() {
    await testRecipeGeneration();
    await testRecipeGenerationWithStrictMode();
    console.log('\n🎉 Recipe generation testing completed!');
}

runAllTests().catch(console.error);
