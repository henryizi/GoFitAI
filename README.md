# GoFitAI

A mobile fitness application built with React Native and Expo that uses AI to create personalized workout plans.

## Features

- AI-powered workout plan generation
- Workout tracking and history
- Nutrition planning
- Progress tracking

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)

### Installation

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```

### Running the App

For the best experience with AI features, use the dev script which starts both the server and the app:

```
npm run dev
```

This will:
1. Kill any existing server processes on port 4000
2. Start the local AI server
3. Start the Expo development server
4. Allow you to run the app on a simulator or physical device

For specific platforms:

```
npm run dev-ios     # For iOS
npm run dev-android # For Android
```

### Troubleshooting AI Server Connection

If you encounter issues with the AI features:

1. Make sure the server is running:
   ```
   npm run kill-server       # Kill any existing server processes
   npm run start-server-safe # Start a fresh server instance
   ```

2. Check that your device can connect to your development machine:
   - For physical devices, make sure they're on the same network
   - You may need to update the server URL in the app settings

3. If you see "Network request failed" errors:
   - The app will automatically try multiple server URLs
   - You can manually start the server using the command above

## Development

### Project Structure

- `app/` - Expo Router app files
- `src/` - Source code
  - `components/` - Reusable React components
  - `services/` - API and data services
  - `hooks/` - Custom React hooks
  - `mock-data/` - Mock data for development
- `server/` - Local AI server implementation

### Running the Server Separately

If you need to run the server separately:

```
npm run start-server-safe
```

This will kill any existing server processes and start a new server with automatic restart on crashes.

### Recent Fixes

1. **Fixed Plan Application Issue**: 
   - When applying a new plan from the preview screen, it now correctly sets the plan as active
   - Deactivates any existing active plans to ensure only one plan is active at a time
   - Works with both database and local storage

2. **Improved Server Connection Reliability**:
   - Added automatic server discovery that tries multiple URLs
   - Added kill-server script to prevent port conflicts
   - Added better error handling and user feedback

3. **Enhanced AI Chat Experience**:
   - Chat history is now properly cleared when applying a new plan
   - Fixed JSON parsing issues with AI responses
   - Added robust fallback mechanisms

## License

This project is proprietary software.
# Redeploy trigger Fri Aug 22 14:53:19 HKT 2025
