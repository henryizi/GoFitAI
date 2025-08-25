# GoFitAI Setup Guide

This guide will help you set up Supabase and configure the app for photo upload functionality.

## 🔧 Prerequisites

1. **Supabase Account**: Sign up at [supabase.com](https://supabase.com)
2. **DeepSeek API Key**: Get your API key from [platform.deepseek.com](https://platform.deepseek.com)
3. **Node.js**: Version 18 or higher

## 📋 Step-by-Step Setup

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the project to be created (this may take a few minutes)
3. Note down your project URL and anon key

### 2. Set Up Database Tables

1. In your Supabase dashboard, go to **SQL Editor**
2. Copy and paste the contents of `scripts/setup-supabase.sql`
3. Click **Run** to execute the script
4. Verify that the tables were created by checking the **Table Editor**

### 3. Create Storage Bucket

1. In your Supabase dashboard, go to **Storage**
2. Click **Create a new bucket**
3. Name it `body-photos`
4. Set it to **Public** (for easier testing) or **Private** (for production)
5. Click **Create bucket**

### 4. Configure Environment Variables

1. Create a `.env` file in your project root
2. Add the following variables:

```env
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# DeepSeek AI Configuration
EXPO_PUBLIC_DEEPSEEK_API_URL=https://api.deepseek.com/v1
EXPO_PUBLIC_DEEPSEEK_API_KEY=your_deepseek_api_key

# App Configuration
EXPO_PUBLIC_APP_NAME=GoFitAI
EXPO_PUBLIC_APP_VERSION=1.0.0
```

### 5. Configure Storage Policies

If you set your bucket to **Private**, you'll need to add storage policies:

1. Go to **Storage** > **Policies**
2. Click **New Policy** for the `body-photos` bucket
3. Add the following policies:

**For SELECT (download):**
```sql
(auth.uid()::text = (storage.foldername(name))[1])
```

**For INSERT (upload):**
```sql
(auth.uid()::text = (storage.foldername(name))[1])
```

**For UPDATE:**
```sql
(auth.uid()::text = (storage.foldername(name))[1])
```

**For DELETE:**
```sql
(auth.uid()::text = (storage.foldername(name))[1])
```

### 6. Test the Setup

1. Start your development server:
   ```bash
   npm start
   ```

2. Open the app and try to:
   - Sign up with a new account
   - Upload a photo
   - Check the console for any error messages

## 🔍 Troubleshooting

### Photo Upload Not Working

If photos aren't uploading, check the following:

1. **Console Logs**: Open your browser's developer tools and check the console for error messages
2. **Environment Variables**: Make sure your `.env` file is in the project root and contains the correct values
3. **Supabase Configuration**: Verify your Supabase URL and anon key are correct
4. **Storage Bucket**: Ensure the `body-photos` bucket exists in your Supabase project
5. **Database Tables**: Verify all tables were created successfully

### Common Error Messages

**"Supabase storage is not configured"**
- Check your environment variables
- Restart your development server after updating `.env`

**"Storage bucket 'body-photos' does not exist"**
- Create the storage bucket in your Supabase dashboard
- Make sure the bucket name is exactly `body-photos`

**"Database table 'body_photos' does not exist"**
- Run the SQL setup script in your Supabase SQL Editor
- Check that all tables were created successfully

**"Upload failed: [error message]"**
- Check your Supabase storage policies
- Verify your anon key has the correct permissions

### Debug Mode

The app now includes detailed logging. When you upload a photo, check the console for messages like:
- 🚀 Starting photo upload
- 📝 Generated filename
- 🔄 Converting image to blob
- 📤 Uploading to Supabase storage
- ✅ Upload successful

If you see any ❌ error messages, they will help identify the specific issue.

## 📱 Testing on Mobile

If you're testing on a mobile device:

1. Make sure your device is on the same network as your development machine
2. Use the Expo Go app to scan the QR code
3. Grant camera and photo library permissions when prompted
4. Test photo upload with both camera and photo library options

## 🔒 Security Notes

- Never commit your `.env` file to version control
- Use environment variables for all sensitive configuration
- Consider using private storage buckets for production
- Regularly rotate your API keys

## 📞 Getting Help

If you're still having issues:

1. Check the console logs for specific error messages
2. Verify all setup steps were completed correctly
3. Test with a simple photo first
4. Check the Supabase dashboard for any error logs

The app includes comprehensive error handling and logging to help identify and resolve issues quickly. 