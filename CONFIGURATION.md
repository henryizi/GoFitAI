# Configuration Guide

## Environment Variables Setup

To properly configure the GoFitAI app, you need to set up the following environment variables:

### Required Variables

1. **EXPO_PUBLIC_API_URL** - Your API server URL
   - Default: `https://gofitai-production.up.railway.app`
   - This should point to your backend server

2. **GEMINI_API_KEY** - Your Gemini AI API key
   - Get this from Google AI Studio: https://aistudio.google.com/
   - Required for AI-powered features

3. **GEMINI_MODEL** - Gemini model to use
   - Default: `gemini-2.5-flash`
   - Options: `gemini-2.5-flash`, `gemini-2.5-pro`

### Setup Instructions

1. **For Development:**
   ```bash
   # Create a .env file (if not exists)
   touch .env

   # Add your configuration
   echo "EXPO_PUBLIC_API_URL=https://gofitai-production.up.railway.app" >> .env
   echo "GEMINI_API_KEY=your_actual_gemini_key_here" >> .env
   echo "GEMINI_MODEL=gemini-2.5-flash" >> .env
   ```

2. **For Production:**
   - Set these as environment variables in your hosting platform
   - Make sure they're prefixed with `EXPO_PUBLIC_` for Expo to access them

### Testing Your Configuration

Run this command to test your API configuration:
```bash
node -e "
console.log('API URL:', process.env.EXPO_PUBLIC_API_URL || 'Not set');
console.log('Gemini Key:', process.env.GEMINI_API_KEY ? 'Set' : 'Not set');
console.log('Available endpoints:');
const urls = ['https://gofitai-production.up.railway.app', process.env.EXPO_PUBLIC_API_URL].filter(Boolean);
console.log(urls);
"
```

### Troubleshooting

If you see "Invalid URL" errors:

1. Check that `EXPO_PUBLIC_API_URL` is set correctly
2. Ensure the URL doesn't have trailing spaces
3. Verify the server is running and accessible
4. Check console logs for detailed error messages

### API Endpoints

The app uses these endpoints:
- `POST /api/generate-workout-plan` - Generate workout plans
- `POST /api/generate-recipe` - Generate meal recipes
- `POST /api/generate-transformation` - Generate transformation plans

All requests include automatic fallback to the Railway server if the configured URL fails.


