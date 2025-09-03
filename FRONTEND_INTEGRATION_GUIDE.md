# Frontend Integration Guide

## Overview
This guide explains how to integrate the GoFitAI frontend with the live Railway backend server.

## 🚀 Quick Start

### 1. Environment Configuration
The environment is already configured in `src/config/environment.ts` to use the Railway server:
```typescript
const railwayUrl = 'https://gofitai-production.up.railway.app';
```

### 2. Using the API Service
Import and use the centralized API service:

```typescript
import { apiService } from '../services/api';

// Food analysis
const result = await apiService.analyzeFood({
  foodImage: imageFile,
  foodDescription: 'Apple'
});

// Workout plan generation
const workoutPlan = await apiService.generateWorkoutPlan({
  userId: 'user123',
  preferences: {
    fitnessLevel: 'beginner',
    goals: ['weight_loss'],
    availableTime: 30,
    equipment: ['none']
  }
});

// AI chat
const chatResponse = await apiService.sendChatMessage({
  planId: 'plan123',
  message: 'Make this workout harder',
  currentPlan: { id: 'plan123' }
});
```

### 3. Using React Hooks
For React components, use the provided hooks:

```typescript
import { useFoodAnalysis, useWorkoutPlanGeneration, useAIChat } from '../hooks/useApi';

function MyComponent() {
  const { analyzeFood, loading, error } = useFoodAnalysis();
  const { generateWorkoutPlan } = useWorkoutPlanGeneration();
  const { sendMessage } = useAIChat();

  const handleFoodAnalysis = async (image: File) => {
    const result = await analyzeFood(image);
    if (result) {
      console.log('Food analyzed:', result);
    }
  };

  return (
    <div>
      {loading && <Text>Processing...</Text>}
      {error && <Text>Error: {error}</Text>}
      {/* Your UI components */}
    </div>
  );
}
```

## 📋 API Endpoints

### Food Analysis
- **Endpoint**: `POST /api/analyze-food`
- **Purpose**: Analyze food images and descriptions
- **Input**: FormData with foodImage (File/Blob) and optional foodDescription
- **Output**: Nutrition data (calories, protein, carbs, fat)

### Workout Plan Generation
- **Endpoint**: `POST /api/generate-workout-plan`
- **Purpose**: Generate personalized workout plans
- **Input**: User preferences (fitness level, goals, time, equipment)
- **Output**: Weekly workout schedule with exercises

### AI Chat
- **Endpoint**: `POST /api/ai-chat`
- **Purpose**: Chat with AI to modify workout plans
- **Input**: Plan ID, message, current plan data
- **Output**: AI response and modified plan

### Health Check
- **Endpoint**: `GET /api/health`
- **Purpose**: Check server status
- **Output**: Server health information

## 🔧 Integration Steps

### Step 1: Update Existing Services
The existing services in `src/services/nutrition/` and `src/services/workout/` already have API integration. They should automatically use the Railway server.

### Step 2: Test API Connection
Use the health check to verify connectivity:

```typescript
import { apiService } from '../services/api';

const isConnected = await apiService.testConnection();
console.log('Server connected:', isConnected);
```

### Step 3: Handle Errors Gracefully
The API service includes comprehensive error handling:

```typescript
const result = await apiService.analyzeFood(request);
if (!result.success) {
  // Handle error
  console.error('API Error:', result.error);
  // Show user-friendly message
  Alert.alert('Error', result.error);
} else {
  // Handle success
  console.log('Success:', result.data);
}
```

## 🎯 Best Practices

### 1. Loading States
Always show loading indicators during API calls:
```typescript
const { loading, error } = useFoodAnalysis();
if (loading) return <LoadingSpinner />;
if (error) return <ErrorMessage error={error} />;
```

### 2. Error Handling
Provide user-friendly error messages:
```typescript
const getErrorMessage = (error: string) => {
  if (error.includes('Network')) return 'Check your internet connection';
  if (error.includes('timeout')) return 'Request timed out, please try again';
  return 'Something went wrong, please try again';
};
```

### 3. Retry Logic
Implement retry logic for failed requests:
```typescript
const retryRequest = async (fn: () => Promise<any>, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
};
```

### 4. Offline Support
Consider implementing offline support with local storage:
```typescript
// Store results locally for offline access
await AsyncStorage.setItem('lastFoodAnalysis', JSON.stringify(result));
```

## 🧪 Testing

### Test API Connection
```bash
curl -X GET https://gofitai-production.up.railway.app/api/health
```

### Test Food Analysis
```bash
curl -X POST -F "foodImage=@apple.jpg" \
  https://gofitai-production.up.railway.app/api/analyze-food
```

### Test Workout Generation
```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{"userId":"test","preferences":{"fitnessLevel":"beginner","goals":["weight_loss"],"availableTime":30,"equipment":["none"]}}' \
  https://gofitai-production.up.railway.app/api/generate-workout-plan
```

## 📱 Mobile App Integration

### React Native Specific Considerations

1. **Image Handling**: Use `react-native-image-picker` for camera/gallery access
2. **File Upload**: Convert images to Blob/File objects for API calls
3. **Network Security**: Ensure HTTPS is used for all API calls
4. **Background Processing**: Consider background tasks for long-running operations

### Example Image Upload
```typescript
import { launchImageLibrary } from 'react-native-image-picker';

const pickImage = async () => {
  const result = await launchImageLibrary({
    mediaType: 'photo',
    quality: 0.8,
  });

  if (result.assets?.[0]) {
    const imageFile = result.assets[0];
    const analysis = await analyzeFood(imageFile);
    // Handle result
  }
};
```

## 🔍 Debugging

### Enable Verbose Logging
Set the environment variable for detailed logging:
```typescript
// In app.config.ts
extra: {
  EXPO_PUBLIC_AI_VERBOSE: '1'
}
```

### Check Network Requests
Use React Native Debugger or Flipper to monitor network requests.

### Server Logs
Check Railway dashboard for server-side logs and errors.

## 🚨 Troubleshooting

### Common Issues

1. **Network Timeout**: Increase timeout values for slow connections
2. **CORS Issues**: Ensure proper headers are set
3. **Image Upload Failures**: Check file size and format
4. **Authentication Errors**: Verify API keys are properly configured

### Error Codes
- `400`: Bad Request - Check input data
- `401`: Unauthorized - Check API keys
- `429`: Too Many Requests - Implement rate limiting
- `500`: Server Error - Check server logs
- `503`: Service Unavailable - Server maintenance

## 📞 Support

For issues with the API integration:
1. Check the server health endpoint
2. Review server logs in Railway dashboard
3. Test with curl commands
4. Check network connectivity
5. Verify environment configuration

