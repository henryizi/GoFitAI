# Fix Email Going to Spam Guide

The default email service provided by Supabase (`noreply@mail.app.supabase.io`) is a shared service used by thousands of apps. Because of this, email providers (like Gmail, Outlook) often flag it as spam or "Promotions".

To fix this, you need to configure a **Custom SMTP Server**.

## Option 1: The Quickest Fix (Use Your Gmail)
For testing and early development, you can use your own Gmail account as the sender.

### Step 1: Get a Google App Password
1. Go to your [Google Account Security Settings](https://myaccount.google.com/security).
2. Ensure **2-Step Verification** is ON.
3. Search for **"App passwords"** in the search bar at the top (or go to 2-Step Verification > App passwords).
4. Create a new App Password:
   - **App name:** `GoFitAI`
   - Click **Create**.
5. Copy the 16-character password generated (e.g., `abcd efgh ijkl mnop`).

### Step 2: Configure Supabase
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard).
2. Select your project (`GoFitAI`).
3. Navigate to **Project Settings** (gear icon) -> **Auth** -> **SMTP Settings**.
4. Toggle **Enable Custom SMTP** to ON.
5. Fill in the details:
   - **Sender Email:** `your.email@gmail.com` (The one you generated the password for)
   - **Sender Name:** `GoFitAI Support`
   - **Host:** `smtp.gmail.com`
   - **Port:** `465`
   - **Username:** `your.email@gmail.com`
   - **Password:** `paste-your-16-char-app-password-here` (remove spaces)
   - **Encryption:** `SSL` (or `Secure`)
6. Click **Save**.

## Option 2: The Professional Fix (Resend or SendGrid)
For a production app on the App Store, you should use a dedicated email provider like **Resend** (highly recommended for developers) or **SendGrid**.

### Using Resend (Free tier is generous)
1. Sign up at [Resend.com](https://resend.com).
2. Verify your domain (you need a custom domain like `gofitai.com`).
3. Get an API Key.
4. Go to Supabase Dashboard -> Integrations -> Resend (or configure via SMTP manually).

## Step 3: Customize the Email Template
While you are in the Supabase Dashboard, you can also improve the look of the email to make it look less spammy.

1. Go to **Authentication** -> **Email Templates**.
2. Click on **Reset Password**.
3. Change the **Subject** to something specific like: `Reset your GoFitAI password`
4. Update the Body to be simpler. Ensure the link is clickable.
   
   ```html
   <h2>Reset Password</h2>
   <p>Follow this link to reset the password for your GoFitAI account:</p>
   <p><a href="{{ .ConfirmationURL }}">Reset Password</a></p>
   <p>If you didn't ask to reset your password, you can ignore this email.</p>
   ```

## Step 4: Verify the Redirect URL
Ensure your Redirect URL is correctly set in Supabase for the password reset flow.
1. Go to **Authentication** -> **URL Configuration**.
2. Ensure `gofitai://reset-password` (or `gofitai://auth/reset-password` depending on your deep link setup) is in the **Redirect URLs** list.

