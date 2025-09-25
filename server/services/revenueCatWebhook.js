/**
 * RevenueCat Webhook Handler
 * 
 * This service handles webhook events from RevenueCat to keep user subscription
 * status synchronized on the server side.
 */

const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with fallback for missing credentials
const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://dummy.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'dummy-key';

console.log('🔍 Server Supabase Configuration:');
console.log('- URL:', supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'MISSING');
console.log('- Key:', supabaseKey ? `${supabaseKey.substring(0, 20)}...` : 'MISSING');

let supabase = null;
try {
  supabase = createClient(supabaseUrl, supabaseKey);
  if (supabaseUrl === 'https://dummy.supabase.co' || supabaseKey === 'dummy-key') {
    console.warn('⚠️  Using dummy Supabase credentials - RevenueCat webhooks will be logged but not processed');
  }
} catch (error) {
  console.error('❌ Failed to initialize Supabase client:', error.message);
  console.warn('⚠️  RevenueCat webhooks will be received but not processed');
}

const REVENUECAT_WEBHOOK_SECRET = process.env.REVENUECAT_WEBHOOK_SECRET;

/**
 * Verify webhook signature from RevenueCat
 */
function verifyWebhookSignature(body, signature) {
  if (!REVENUECAT_WEBHOOK_SECRET) {
    console.warn('[RevenueCat Webhook] No webhook secret configured');
    return false;
  }

  const expectedSignature = crypto
    .createHmac('sha256', REVENUECAT_WEBHOOK_SECRET)
    .update(body, 'utf8')
    .digest('hex');

  return signature === expectedSignature;
}

/**
 * Update user subscription status in Supabase
 */
async function updateUserSubscription(userId, subscriptionData) {
  // Skip database update if Supabase is not available
  if (!supabase || supabaseUrl === 'https://dummy.supabase.co') {
    console.log('[RevenueCat Webhook] ⚠️  Supabase not available - subscription update skipped');
    console.log('[RevenueCat Webhook] 📝 Would update user:', userId, {
      isActive: subscriptionData.isActive,
      productId: subscriptionData.productId,
      expiresAt: subscriptionData.expiresAt,
    });
    return;
  }

  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        is_premium: subscriptionData.isActive,
        subscription_product_id: subscriptionData.productId,
        subscription_expires_at: subscriptionData.expiresAt,
        subscription_will_renew: subscriptionData.willRenew,
        subscription_updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      console.error('[RevenueCat Webhook] Failed to update user subscription:', error);
      throw error;
    }

    console.log('[RevenueCat Webhook] Updated subscription for user:', userId, {
      isActive: subscriptionData.isActive,
      productId: subscriptionData.productId,
      expiresAt: subscriptionData.expiresAt,
    });

  } catch (error) {
    console.error('[RevenueCat Webhook] Error updating user subscription:', error);
    throw error;
  }
}

/**
 * Log subscription event for analytics and audit
 */
async function logSubscriptionEvent(userId, eventType, eventData) {
  // Skip logging if Supabase is not available
  if (!supabase || supabaseUrl === 'https://dummy.supabase.co') {
    console.log('[RevenueCat Webhook] ⚠️  Supabase not available - event logging skipped');
    console.log('[RevenueCat Webhook] 📝 Would log event:', eventType, 'for user:', userId);
    return;
  }

  try {
    const { error } = await supabase
      .from('subscription_events')
      .insert({
        user_id: userId,
        event_type: eventType,
        event_data: eventData,
        created_at: new Date().toISOString(),
      });

    if (error) {
      console.error('[RevenueCat Webhook] Failed to log subscription event:', error);
    }

  } catch (error) {
    console.error('[RevenueCat Webhook] Error logging subscription event:', error);
  }
}

/**
 * Process RevenueCat webhook event
 */
async function processWebhookEvent(event) {
  const { type, event: eventData } = event;
  
  console.log('[RevenueCat Webhook] Processing event:', type);

  // Extract user ID and subscription info from the event
  const userId = eventData.app_user_id;
  const subscriberAttributes = eventData.subscriber_attributes || {};
  const entitlements = eventData.entitlements || {};
  
  if (!userId) {
    console.warn('[RevenueCat Webhook] No user ID found in event');
    return;
  }

  // Determine subscription status based on entitlements
  const premiumEntitlement = entitlements.premium || entitlements.pro;
  const subscriptionData = {
    isActive: !!premiumEntitlement,
    productId: premiumEntitlement?.product_identifier || null,
    expiresAt: premiumEntitlement?.expires_date || null,
    willRenew: premiumEntitlement?.will_renew || false,
  };

  try {
    switch (type) {
      case 'INITIAL_PURCHASE':
        console.log('[RevenueCat Webhook] Initial purchase for user:', userId);
        await updateUserSubscription(userId, { ...subscriptionData, isActive: true });
        await logSubscriptionEvent(userId, 'INITIAL_PURCHASE', eventData);
        break;

      case 'RENEWAL':
        console.log('[RevenueCat Webhook] Subscription renewal for user:', userId);
        await updateUserSubscription(userId, { ...subscriptionData, isActive: true });
        await logSubscriptionEvent(userId, 'RENEWAL', eventData);
        break;

      case 'CANCELLATION':
        console.log('[RevenueCat Webhook] Subscription cancellation for user:', userId);
        // Note: Cancellation doesn't immediately revoke access, just sets will_renew to false
        await updateUserSubscription(userId, { ...subscriptionData, willRenew: false });
        await logSubscriptionEvent(userId, 'CANCELLATION', eventData);
        break;

      case 'EXPIRATION':
        console.log('[RevenueCat Webhook] Subscription expiration for user:', userId);
        await updateUserSubscription(userId, { ...subscriptionData, isActive: false });
        await logSubscriptionEvent(userId, 'EXPIRATION', eventData);
        break;

      case 'BILLING_ISSUE':
        console.log('[RevenueCat Webhook] Billing issue for user:', userId);
        // Keep subscription active during grace period, but log the issue
        await logSubscriptionEvent(userId, 'BILLING_ISSUE', eventData);
        break;

      case 'PRODUCT_CHANGE':
        console.log('[RevenueCat Webhook] Product change for user:', userId);
        await updateUserSubscription(userId, subscriptionData);
        await logSubscriptionEvent(userId, 'PRODUCT_CHANGE', eventData);
        break;

      case 'TRANSFER':
        console.log('[RevenueCat Webhook] Subscription transfer for user:', userId);
        await updateUserSubscription(userId, subscriptionData);
        await logSubscriptionEvent(userId, 'TRANSFER', eventData);
        break;

      case 'NON_RENEWING_PURCHASE':
        console.log('[RevenueCat Webhook] Non-renewing purchase for user:', userId);
        await updateUserSubscription(userId, { ...subscriptionData, willRenew: false });
        await logSubscriptionEvent(userId, 'NON_RENEWING_PURCHASE', eventData);
        break;

      case 'SUBSCRIPTION_PAUSED':
        console.log('[RevenueCat Webhook] Subscription paused for user:', userId);
        await logSubscriptionEvent(userId, 'SUBSCRIPTION_PAUSED', eventData);
        break;

      case 'UNCANCELLATION':
        console.log('[RevenueCat Webhook] Subscription reactivated for user:', userId);
        await updateUserSubscription(userId, { ...subscriptionData, willRenew: true });
        await logSubscriptionEvent(userId, 'UNCANCELLATION', eventData);
        break;

      default:
        console.log('[RevenueCat Webhook] Unknown event type:', type);
        await logSubscriptionEvent(userId, type, eventData);
        break;
    }

  } catch (error) {
    console.error('[RevenueCat Webhook] Error processing event:', error);
    throw error;
  }
}

/**
 * Handle RevenueCat webhook request
 */
async function handleWebhook(req, res) {
  try {
    const signature = req.headers['x-revenuecat-signature'];
    const rawBody = req.body;

    // Verify webhook signature
    if (!verifyWebhookSignature(rawBody, signature)) {
      console.error('[RevenueCat Webhook] Invalid signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Parse webhook event
    const event = JSON.parse(rawBody);
    
    // Process the event
    await processWebhookEvent(event);

    // Respond with success
    res.status(200).json({ received: true });

  } catch (error) {
    console.error('[RevenueCat Webhook] Error handling webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Express middleware for handling RevenueCat webhooks
 */
function revenueCatWebhookMiddleware(req, res, next) {
  // Capture raw body for signature verification
  let rawBody = '';
  req.on('data', chunk => {
    rawBody += chunk.toString();
  });
  req.on('end', () => {
    req.body = rawBody;
    handleWebhook(req, res);
  });
}

module.exports = {
  handleWebhook,
  revenueCatWebhookMiddleware,
  processWebhookEvent,
  verifyWebhookSignature,
};







 * 
 * This service handles webhook events from RevenueCat to keep user subscription
 * status synchronized on the server side.
 */

const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with fallback for missing credentials
const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://dummy.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'dummy-key';

console.log('🔍 Server Supabase Configuration:');
console.log('- URL:', supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'MISSING');
console.log('- Key:', supabaseKey ? `${supabaseKey.substring(0, 20)}...` : 'MISSING');

let supabase = null;
try {
  supabase = createClient(supabaseUrl, supabaseKey);
  if (supabaseUrl === 'https://dummy.supabase.co' || supabaseKey === 'dummy-key') {
    console.warn('⚠️  Using dummy Supabase credentials - RevenueCat webhooks will be logged but not processed');
  }
} catch (error) {
  console.error('❌ Failed to initialize Supabase client:', error.message);
  console.warn('⚠️  RevenueCat webhooks will be received but not processed');
}

const REVENUECAT_WEBHOOK_SECRET = process.env.REVENUECAT_WEBHOOK_SECRET;

/**
 * Verify webhook signature from RevenueCat
 */
function verifyWebhookSignature(body, signature) {
  if (!REVENUECAT_WEBHOOK_SECRET) {
    console.warn('[RevenueCat Webhook] No webhook secret configured');
    return false;
  }

  const expectedSignature = crypto
    .createHmac('sha256', REVENUECAT_WEBHOOK_SECRET)
    .update(body, 'utf8')
    .digest('hex');

  return signature === expectedSignature;
}

/**
 * Update user subscription status in Supabase
 */
async function updateUserSubscription(userId, subscriptionData) {
  // Skip database update if Supabase is not available
  if (!supabase || supabaseUrl === 'https://dummy.supabase.co') {
    console.log('[RevenueCat Webhook] ⚠️  Supabase not available - subscription update skipped');
    console.log('[RevenueCat Webhook] 📝 Would update user:', userId, {
      isActive: subscriptionData.isActive,
      productId: subscriptionData.productId,
      expiresAt: subscriptionData.expiresAt,
    });
    return;
  }

  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        is_premium: subscriptionData.isActive,
        subscription_product_id: subscriptionData.productId,
        subscription_expires_at: subscriptionData.expiresAt,
        subscription_will_renew: subscriptionData.willRenew,
        subscription_updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      console.error('[RevenueCat Webhook] Failed to update user subscription:', error);
      throw error;
    }

    console.log('[RevenueCat Webhook] Updated subscription for user:', userId, {
      isActive: subscriptionData.isActive,
      productId: subscriptionData.productId,
      expiresAt: subscriptionData.expiresAt,
    });

  } catch (error) {
    console.error('[RevenueCat Webhook] Error updating user subscription:', error);
    throw error;
  }
}

/**
 * Log subscription event for analytics and audit
 */
async function logSubscriptionEvent(userId, eventType, eventData) {
  // Skip logging if Supabase is not available
  if (!supabase || supabaseUrl === 'https://dummy.supabase.co') {
    console.log('[RevenueCat Webhook] ⚠️  Supabase not available - event logging skipped');
    console.log('[RevenueCat Webhook] 📝 Would log event:', eventType, 'for user:', userId);
    return;
  }

  try {
    const { error } = await supabase
      .from('subscription_events')
      .insert({
        user_id: userId,
        event_type: eventType,
        event_data: eventData,
        created_at: new Date().toISOString(),
      });

    if (error) {
      console.error('[RevenueCat Webhook] Failed to log subscription event:', error);
    }

  } catch (error) {
    console.error('[RevenueCat Webhook] Error logging subscription event:', error);
  }
}

/**
 * Process RevenueCat webhook event
 */
async function processWebhookEvent(event) {
  const { type, event: eventData } = event;
  
  console.log('[RevenueCat Webhook] Processing event:', type);

  // Extract user ID and subscription info from the event
  const userId = eventData.app_user_id;
  const subscriberAttributes = eventData.subscriber_attributes || {};
  const entitlements = eventData.entitlements || {};
  
  if (!userId) {
    console.warn('[RevenueCat Webhook] No user ID found in event');
    return;
  }

  // Determine subscription status based on entitlements
  const premiumEntitlement = entitlements.premium || entitlements.pro;
  const subscriptionData = {
    isActive: !!premiumEntitlement,
    productId: premiumEntitlement?.product_identifier || null,
    expiresAt: premiumEntitlement?.expires_date || null,
    willRenew: premiumEntitlement?.will_renew || false,
  };

  try {
    switch (type) {
      case 'INITIAL_PURCHASE':
        console.log('[RevenueCat Webhook] Initial purchase for user:', userId);
        await updateUserSubscription(userId, { ...subscriptionData, isActive: true });
        await logSubscriptionEvent(userId, 'INITIAL_PURCHASE', eventData);
        break;

      case 'RENEWAL':
        console.log('[RevenueCat Webhook] Subscription renewal for user:', userId);
        await updateUserSubscription(userId, { ...subscriptionData, isActive: true });
        await logSubscriptionEvent(userId, 'RENEWAL', eventData);
        break;

      case 'CANCELLATION':
        console.log('[RevenueCat Webhook] Subscription cancellation for user:', userId);
        // Note: Cancellation doesn't immediately revoke access, just sets will_renew to false
        await updateUserSubscription(userId, { ...subscriptionData, willRenew: false });
        await logSubscriptionEvent(userId, 'CANCELLATION', eventData);
        break;

      case 'EXPIRATION':
        console.log('[RevenueCat Webhook] Subscription expiration for user:', userId);
        await updateUserSubscription(userId, { ...subscriptionData, isActive: false });
        await logSubscriptionEvent(userId, 'EXPIRATION', eventData);
        break;

      case 'BILLING_ISSUE':
        console.log('[RevenueCat Webhook] Billing issue for user:', userId);
        // Keep subscription active during grace period, but log the issue
        await logSubscriptionEvent(userId, 'BILLING_ISSUE', eventData);
        break;

      case 'PRODUCT_CHANGE':
        console.log('[RevenueCat Webhook] Product change for user:', userId);
        await updateUserSubscription(userId, subscriptionData);
        await logSubscriptionEvent(userId, 'PRODUCT_CHANGE', eventData);
        break;

      case 'TRANSFER':
        console.log('[RevenueCat Webhook] Subscription transfer for user:', userId);
        await updateUserSubscription(userId, subscriptionData);
        await logSubscriptionEvent(userId, 'TRANSFER', eventData);
        break;

      case 'NON_RENEWING_PURCHASE':
        console.log('[RevenueCat Webhook] Non-renewing purchase for user:', userId);
        await updateUserSubscription(userId, { ...subscriptionData, willRenew: false });
        await logSubscriptionEvent(userId, 'NON_RENEWING_PURCHASE', eventData);
        break;

      case 'SUBSCRIPTION_PAUSED':
        console.log('[RevenueCat Webhook] Subscription paused for user:', userId);
        await logSubscriptionEvent(userId, 'SUBSCRIPTION_PAUSED', eventData);
        break;

      case 'UNCANCELLATION':
        console.log('[RevenueCat Webhook] Subscription reactivated for user:', userId);
        await updateUserSubscription(userId, { ...subscriptionData, willRenew: true });
        await logSubscriptionEvent(userId, 'UNCANCELLATION', eventData);
        break;

      default:
        console.log('[RevenueCat Webhook] Unknown event type:', type);
        await logSubscriptionEvent(userId, type, eventData);
        break;
    }

  } catch (error) {
    console.error('[RevenueCat Webhook] Error processing event:', error);
    throw error;
  }
}

/**
 * Handle RevenueCat webhook request
 */
async function handleWebhook(req, res) {
  try {
    const signature = req.headers['x-revenuecat-signature'];
    const rawBody = req.body;

    // Verify webhook signature
    if (!verifyWebhookSignature(rawBody, signature)) {
      console.error('[RevenueCat Webhook] Invalid signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Parse webhook event
    const event = JSON.parse(rawBody);
    
    // Process the event
    await processWebhookEvent(event);

    // Respond with success
    res.status(200).json({ received: true });

  } catch (error) {
    console.error('[RevenueCat Webhook] Error handling webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Express middleware for handling RevenueCat webhooks
 */
function revenueCatWebhookMiddleware(req, res, next) {
  // Capture raw body for signature verification
  let rawBody = '';
  req.on('data', chunk => {
    rawBody += chunk.toString();
  });
  req.on('end', () => {
    req.body = rawBody;
    handleWebhook(req, res);
  });
}

module.exports = {
  handleWebhook,
  revenueCatWebhookMiddleware,
  processWebhookEvent,
  verifyWebhookSignature,
};











 * 
 * This service handles webhook events from RevenueCat to keep user subscription
 * status synchronized on the server side.
 */

const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with fallback for missing credentials
const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://dummy.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'dummy-key';

console.log('🔍 Server Supabase Configuration:');
console.log('- URL:', supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'MISSING');
console.log('- Key:', supabaseKey ? `${supabaseKey.substring(0, 20)}...` : 'MISSING');

let supabase = null;
try {
  supabase = createClient(supabaseUrl, supabaseKey);
  if (supabaseUrl === 'https://dummy.supabase.co' || supabaseKey === 'dummy-key') {
    console.warn('⚠️  Using dummy Supabase credentials - RevenueCat webhooks will be logged but not processed');
  }
} catch (error) {
  console.error('❌ Failed to initialize Supabase client:', error.message);
  console.warn('⚠️  RevenueCat webhooks will be received but not processed');
}

const REVENUECAT_WEBHOOK_SECRET = process.env.REVENUECAT_WEBHOOK_SECRET;

/**
 * Verify webhook signature from RevenueCat
 */
function verifyWebhookSignature(body, signature) {
  if (!REVENUECAT_WEBHOOK_SECRET) {
    console.warn('[RevenueCat Webhook] No webhook secret configured');
    return false;
  }

  const expectedSignature = crypto
    .createHmac('sha256', REVENUECAT_WEBHOOK_SECRET)
    .update(body, 'utf8')
    .digest('hex');

  return signature === expectedSignature;
}

/**
 * Update user subscription status in Supabase
 */
async function updateUserSubscription(userId, subscriptionData) {
  // Skip database update if Supabase is not available
  if (!supabase || supabaseUrl === 'https://dummy.supabase.co') {
    console.log('[RevenueCat Webhook] ⚠️  Supabase not available - subscription update skipped');
    console.log('[RevenueCat Webhook] 📝 Would update user:', userId, {
      isActive: subscriptionData.isActive,
      productId: subscriptionData.productId,
      expiresAt: subscriptionData.expiresAt,
    });
    return;
  }

  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        is_premium: subscriptionData.isActive,
        subscription_product_id: subscriptionData.productId,
        subscription_expires_at: subscriptionData.expiresAt,
        subscription_will_renew: subscriptionData.willRenew,
        subscription_updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      console.error('[RevenueCat Webhook] Failed to update user subscription:', error);
      throw error;
    }

    console.log('[RevenueCat Webhook] Updated subscription for user:', userId, {
      isActive: subscriptionData.isActive,
      productId: subscriptionData.productId,
      expiresAt: subscriptionData.expiresAt,
    });

  } catch (error) {
    console.error('[RevenueCat Webhook] Error updating user subscription:', error);
    throw error;
  }
}

/**
 * Log subscription event for analytics and audit
 */
async function logSubscriptionEvent(userId, eventType, eventData) {
  // Skip logging if Supabase is not available
  if (!supabase || supabaseUrl === 'https://dummy.supabase.co') {
    console.log('[RevenueCat Webhook] ⚠️  Supabase not available - event logging skipped');
    console.log('[RevenueCat Webhook] 📝 Would log event:', eventType, 'for user:', userId);
    return;
  }

  try {
    const { error } = await supabase
      .from('subscription_events')
      .insert({
        user_id: userId,
        event_type: eventType,
        event_data: eventData,
        created_at: new Date().toISOString(),
      });

    if (error) {
      console.error('[RevenueCat Webhook] Failed to log subscription event:', error);
    }

  } catch (error) {
    console.error('[RevenueCat Webhook] Error logging subscription event:', error);
  }
}

/**
 * Process RevenueCat webhook event
 */
async function processWebhookEvent(event) {
  const { type, event: eventData } = event;
  
  console.log('[RevenueCat Webhook] Processing event:', type);

  // Extract user ID and subscription info from the event
  const userId = eventData.app_user_id;
  const subscriberAttributes = eventData.subscriber_attributes || {};
  const entitlements = eventData.entitlements || {};
  
  if (!userId) {
    console.warn('[RevenueCat Webhook] No user ID found in event');
    return;
  }

  // Determine subscription status based on entitlements
  const premiumEntitlement = entitlements.premium || entitlements.pro;
  const subscriptionData = {
    isActive: !!premiumEntitlement,
    productId: premiumEntitlement?.product_identifier || null,
    expiresAt: premiumEntitlement?.expires_date || null,
    willRenew: premiumEntitlement?.will_renew || false,
  };

  try {
    switch (type) {
      case 'INITIAL_PURCHASE':
        console.log('[RevenueCat Webhook] Initial purchase for user:', userId);
        await updateUserSubscription(userId, { ...subscriptionData, isActive: true });
        await logSubscriptionEvent(userId, 'INITIAL_PURCHASE', eventData);
        break;

      case 'RENEWAL':
        console.log('[RevenueCat Webhook] Subscription renewal for user:', userId);
        await updateUserSubscription(userId, { ...subscriptionData, isActive: true });
        await logSubscriptionEvent(userId, 'RENEWAL', eventData);
        break;

      case 'CANCELLATION':
        console.log('[RevenueCat Webhook] Subscription cancellation for user:', userId);
        // Note: Cancellation doesn't immediately revoke access, just sets will_renew to false
        await updateUserSubscription(userId, { ...subscriptionData, willRenew: false });
        await logSubscriptionEvent(userId, 'CANCELLATION', eventData);
        break;

      case 'EXPIRATION':
        console.log('[RevenueCat Webhook] Subscription expiration for user:', userId);
        await updateUserSubscription(userId, { ...subscriptionData, isActive: false });
        await logSubscriptionEvent(userId, 'EXPIRATION', eventData);
        break;

      case 'BILLING_ISSUE':
        console.log('[RevenueCat Webhook] Billing issue for user:', userId);
        // Keep subscription active during grace period, but log the issue
        await logSubscriptionEvent(userId, 'BILLING_ISSUE', eventData);
        break;

      case 'PRODUCT_CHANGE':
        console.log('[RevenueCat Webhook] Product change for user:', userId);
        await updateUserSubscription(userId, subscriptionData);
        await logSubscriptionEvent(userId, 'PRODUCT_CHANGE', eventData);
        break;

      case 'TRANSFER':
        console.log('[RevenueCat Webhook] Subscription transfer for user:', userId);
        await updateUserSubscription(userId, subscriptionData);
        await logSubscriptionEvent(userId, 'TRANSFER', eventData);
        break;

      case 'NON_RENEWING_PURCHASE':
        console.log('[RevenueCat Webhook] Non-renewing purchase for user:', userId);
        await updateUserSubscription(userId, { ...subscriptionData, willRenew: false });
        await logSubscriptionEvent(userId, 'NON_RENEWING_PURCHASE', eventData);
        break;

      case 'SUBSCRIPTION_PAUSED':
        console.log('[RevenueCat Webhook] Subscription paused for user:', userId);
        await logSubscriptionEvent(userId, 'SUBSCRIPTION_PAUSED', eventData);
        break;

      case 'UNCANCELLATION':
        console.log('[RevenueCat Webhook] Subscription reactivated for user:', userId);
        await updateUserSubscription(userId, { ...subscriptionData, willRenew: true });
        await logSubscriptionEvent(userId, 'UNCANCELLATION', eventData);
        break;

      default:
        console.log('[RevenueCat Webhook] Unknown event type:', type);
        await logSubscriptionEvent(userId, type, eventData);
        break;
    }

  } catch (error) {
    console.error('[RevenueCat Webhook] Error processing event:', error);
    throw error;
  }
}

/**
 * Handle RevenueCat webhook request
 */
async function handleWebhook(req, res) {
  try {
    const signature = req.headers['x-revenuecat-signature'];
    const rawBody = req.body;

    // Verify webhook signature
    if (!verifyWebhookSignature(rawBody, signature)) {
      console.error('[RevenueCat Webhook] Invalid signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Parse webhook event
    const event = JSON.parse(rawBody);
    
    // Process the event
    await processWebhookEvent(event);

    // Respond with success
    res.status(200).json({ received: true });

  } catch (error) {
    console.error('[RevenueCat Webhook] Error handling webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Express middleware for handling RevenueCat webhooks
 */
function revenueCatWebhookMiddleware(req, res, next) {
  // Capture raw body for signature verification
  let rawBody = '';
  req.on('data', chunk => {
    rawBody += chunk.toString();
  });
  req.on('end', () => {
    req.body = rawBody;
    handleWebhook(req, res);
  });
}

module.exports = {
  handleWebhook,
  revenueCatWebhookMiddleware,
  processWebhookEvent,
  verifyWebhookSignature,
};







 * 
 * This service handles webhook events from RevenueCat to keep user subscription
 * status synchronized on the server side.
 */

const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with fallback for missing credentials
const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://dummy.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'dummy-key';

console.log('🔍 Server Supabase Configuration:');
console.log('- URL:', supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'MISSING');
console.log('- Key:', supabaseKey ? `${supabaseKey.substring(0, 20)}...` : 'MISSING');

let supabase = null;
try {
  supabase = createClient(supabaseUrl, supabaseKey);
  if (supabaseUrl === 'https://dummy.supabase.co' || supabaseKey === 'dummy-key') {
    console.warn('⚠️  Using dummy Supabase credentials - RevenueCat webhooks will be logged but not processed');
  }
} catch (error) {
  console.error('❌ Failed to initialize Supabase client:', error.message);
  console.warn('⚠️  RevenueCat webhooks will be received but not processed');
}

const REVENUECAT_WEBHOOK_SECRET = process.env.REVENUECAT_WEBHOOK_SECRET;

/**
 * Verify webhook signature from RevenueCat
 */
function verifyWebhookSignature(body, signature) {
  if (!REVENUECAT_WEBHOOK_SECRET) {
    console.warn('[RevenueCat Webhook] No webhook secret configured');
    return false;
  }

  const expectedSignature = crypto
    .createHmac('sha256', REVENUECAT_WEBHOOK_SECRET)
    .update(body, 'utf8')
    .digest('hex');

  return signature === expectedSignature;
}

/**
 * Update user subscription status in Supabase
 */
async function updateUserSubscription(userId, subscriptionData) {
  // Skip database update if Supabase is not available
  if (!supabase || supabaseUrl === 'https://dummy.supabase.co') {
    console.log('[RevenueCat Webhook] ⚠️  Supabase not available - subscription update skipped');
    console.log('[RevenueCat Webhook] 📝 Would update user:', userId, {
      isActive: subscriptionData.isActive,
      productId: subscriptionData.productId,
      expiresAt: subscriptionData.expiresAt,
    });
    return;
  }

  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        is_premium: subscriptionData.isActive,
        subscription_product_id: subscriptionData.productId,
        subscription_expires_at: subscriptionData.expiresAt,
        subscription_will_renew: subscriptionData.willRenew,
        subscription_updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      console.error('[RevenueCat Webhook] Failed to update user subscription:', error);
      throw error;
    }

    console.log('[RevenueCat Webhook] Updated subscription for user:', userId, {
      isActive: subscriptionData.isActive,
      productId: subscriptionData.productId,
      expiresAt: subscriptionData.expiresAt,
    });

  } catch (error) {
    console.error('[RevenueCat Webhook] Error updating user subscription:', error);
    throw error;
  }
}

/**
 * Log subscription event for analytics and audit
 */
async function logSubscriptionEvent(userId, eventType, eventData) {
  // Skip logging if Supabase is not available
  if (!supabase || supabaseUrl === 'https://dummy.supabase.co') {
    console.log('[RevenueCat Webhook] ⚠️  Supabase not available - event logging skipped');
    console.log('[RevenueCat Webhook] 📝 Would log event:', eventType, 'for user:', userId);
    return;
  }

  try {
    const { error } = await supabase
      .from('subscription_events')
      .insert({
        user_id: userId,
        event_type: eventType,
        event_data: eventData,
        created_at: new Date().toISOString(),
      });

    if (error) {
      console.error('[RevenueCat Webhook] Failed to log subscription event:', error);
    }

  } catch (error) {
    console.error('[RevenueCat Webhook] Error logging subscription event:', error);
  }
}

/**
 * Process RevenueCat webhook event
 */
async function processWebhookEvent(event) {
  const { type, event: eventData } = event;
  
  console.log('[RevenueCat Webhook] Processing event:', type);

  // Extract user ID and subscription info from the event
  const userId = eventData.app_user_id;
  const subscriberAttributes = eventData.subscriber_attributes || {};
  const entitlements = eventData.entitlements || {};
  
  if (!userId) {
    console.warn('[RevenueCat Webhook] No user ID found in event');
    return;
  }

  // Determine subscription status based on entitlements
  const premiumEntitlement = entitlements.premium || entitlements.pro;
  const subscriptionData = {
    isActive: !!premiumEntitlement,
    productId: premiumEntitlement?.product_identifier || null,
    expiresAt: premiumEntitlement?.expires_date || null,
    willRenew: premiumEntitlement?.will_renew || false,
  };

  try {
    switch (type) {
      case 'INITIAL_PURCHASE':
        console.log('[RevenueCat Webhook] Initial purchase for user:', userId);
        await updateUserSubscription(userId, { ...subscriptionData, isActive: true });
        await logSubscriptionEvent(userId, 'INITIAL_PURCHASE', eventData);
        break;

      case 'RENEWAL':
        console.log('[RevenueCat Webhook] Subscription renewal for user:', userId);
        await updateUserSubscription(userId, { ...subscriptionData, isActive: true });
        await logSubscriptionEvent(userId, 'RENEWAL', eventData);
        break;

      case 'CANCELLATION':
        console.log('[RevenueCat Webhook] Subscription cancellation for user:', userId);
        // Note: Cancellation doesn't immediately revoke access, just sets will_renew to false
        await updateUserSubscription(userId, { ...subscriptionData, willRenew: false });
        await logSubscriptionEvent(userId, 'CANCELLATION', eventData);
        break;

      case 'EXPIRATION':
        console.log('[RevenueCat Webhook] Subscription expiration for user:', userId);
        await updateUserSubscription(userId, { ...subscriptionData, isActive: false });
        await logSubscriptionEvent(userId, 'EXPIRATION', eventData);
        break;

      case 'BILLING_ISSUE':
        console.log('[RevenueCat Webhook] Billing issue for user:', userId);
        // Keep subscription active during grace period, but log the issue
        await logSubscriptionEvent(userId, 'BILLING_ISSUE', eventData);
        break;

      case 'PRODUCT_CHANGE':
        console.log('[RevenueCat Webhook] Product change for user:', userId);
        await updateUserSubscription(userId, subscriptionData);
        await logSubscriptionEvent(userId, 'PRODUCT_CHANGE', eventData);
        break;

      case 'TRANSFER':
        console.log('[RevenueCat Webhook] Subscription transfer for user:', userId);
        await updateUserSubscription(userId, subscriptionData);
        await logSubscriptionEvent(userId, 'TRANSFER', eventData);
        break;

      case 'NON_RENEWING_PURCHASE':
        console.log('[RevenueCat Webhook] Non-renewing purchase for user:', userId);
        await updateUserSubscription(userId, { ...subscriptionData, willRenew: false });
        await logSubscriptionEvent(userId, 'NON_RENEWING_PURCHASE', eventData);
        break;

      case 'SUBSCRIPTION_PAUSED':
        console.log('[RevenueCat Webhook] Subscription paused for user:', userId);
        await logSubscriptionEvent(userId, 'SUBSCRIPTION_PAUSED', eventData);
        break;

      case 'UNCANCELLATION':
        console.log('[RevenueCat Webhook] Subscription reactivated for user:', userId);
        await updateUserSubscription(userId, { ...subscriptionData, willRenew: true });
        await logSubscriptionEvent(userId, 'UNCANCELLATION', eventData);
        break;

      default:
        console.log('[RevenueCat Webhook] Unknown event type:', type);
        await logSubscriptionEvent(userId, type, eventData);
        break;
    }

  } catch (error) {
    console.error('[RevenueCat Webhook] Error processing event:', error);
    throw error;
  }
}

/**
 * Handle RevenueCat webhook request
 */
async function handleWebhook(req, res) {
  try {
    const signature = req.headers['x-revenuecat-signature'];
    const rawBody = req.body;

    // Verify webhook signature
    if (!verifyWebhookSignature(rawBody, signature)) {
      console.error('[RevenueCat Webhook] Invalid signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Parse webhook event
    const event = JSON.parse(rawBody);
    
    // Process the event
    await processWebhookEvent(event);

    // Respond with success
    res.status(200).json({ received: true });

  } catch (error) {
    console.error('[RevenueCat Webhook] Error handling webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Express middleware for handling RevenueCat webhooks
 */
function revenueCatWebhookMiddleware(req, res, next) {
  // Capture raw body for signature verification
  let rawBody = '';
  req.on('data', chunk => {
    rawBody += chunk.toString();
  });
  req.on('end', () => {
    req.body = rawBody;
    handleWebhook(req, res);
  });
}

module.exports = {
  handleWebhook,
  revenueCatWebhookMiddleware,
  processWebhookEvent,
  verifyWebhookSignature,
};















 * 
 * This service handles webhook events from RevenueCat to keep user subscription
 * status synchronized on the server side.
 */

const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with fallback for missing credentials
const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://dummy.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'dummy-key';

console.log('🔍 Server Supabase Configuration:');
console.log('- URL:', supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'MISSING');
console.log('- Key:', supabaseKey ? `${supabaseKey.substring(0, 20)}...` : 'MISSING');

let supabase = null;
try {
  supabase = createClient(supabaseUrl, supabaseKey);
  if (supabaseUrl === 'https://dummy.supabase.co' || supabaseKey === 'dummy-key') {
    console.warn('⚠️  Using dummy Supabase credentials - RevenueCat webhooks will be logged but not processed');
  }
} catch (error) {
  console.error('❌ Failed to initialize Supabase client:', error.message);
  console.warn('⚠️  RevenueCat webhooks will be received but not processed');
}

const REVENUECAT_WEBHOOK_SECRET = process.env.REVENUECAT_WEBHOOK_SECRET;

/**
 * Verify webhook signature from RevenueCat
 */
function verifyWebhookSignature(body, signature) {
  if (!REVENUECAT_WEBHOOK_SECRET) {
    console.warn('[RevenueCat Webhook] No webhook secret configured');
    return false;
  }

  const expectedSignature = crypto
    .createHmac('sha256', REVENUECAT_WEBHOOK_SECRET)
    .update(body, 'utf8')
    .digest('hex');

  return signature === expectedSignature;
}

/**
 * Update user subscription status in Supabase
 */
async function updateUserSubscription(userId, subscriptionData) {
  // Skip database update if Supabase is not available
  if (!supabase || supabaseUrl === 'https://dummy.supabase.co') {
    console.log('[RevenueCat Webhook] ⚠️  Supabase not available - subscription update skipped');
    console.log('[RevenueCat Webhook] 📝 Would update user:', userId, {
      isActive: subscriptionData.isActive,
      productId: subscriptionData.productId,
      expiresAt: subscriptionData.expiresAt,
    });
    return;
  }

  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        is_premium: subscriptionData.isActive,
        subscription_product_id: subscriptionData.productId,
        subscription_expires_at: subscriptionData.expiresAt,
        subscription_will_renew: subscriptionData.willRenew,
        subscription_updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      console.error('[RevenueCat Webhook] Failed to update user subscription:', error);
      throw error;
    }

    console.log('[RevenueCat Webhook] Updated subscription for user:', userId, {
      isActive: subscriptionData.isActive,
      productId: subscriptionData.productId,
      expiresAt: subscriptionData.expiresAt,
    });

  } catch (error) {
    console.error('[RevenueCat Webhook] Error updating user subscription:', error);
    throw error;
  }
}

/**
 * Log subscription event for analytics and audit
 */
async function logSubscriptionEvent(userId, eventType, eventData) {
  // Skip logging if Supabase is not available
  if (!supabase || supabaseUrl === 'https://dummy.supabase.co') {
    console.log('[RevenueCat Webhook] ⚠️  Supabase not available - event logging skipped');
    console.log('[RevenueCat Webhook] 📝 Would log event:', eventType, 'for user:', userId);
    return;
  }

  try {
    const { error } = await supabase
      .from('subscription_events')
      .insert({
        user_id: userId,
        event_type: eventType,
        event_data: eventData,
        created_at: new Date().toISOString(),
      });

    if (error) {
      console.error('[RevenueCat Webhook] Failed to log subscription event:', error);
    }

  } catch (error) {
    console.error('[RevenueCat Webhook] Error logging subscription event:', error);
  }
}

/**
 * Process RevenueCat webhook event
 */
async function processWebhookEvent(event) {
  const { type, event: eventData } = event;
  
  console.log('[RevenueCat Webhook] Processing event:', type);

  // Extract user ID and subscription info from the event
  const userId = eventData.app_user_id;
  const subscriberAttributes = eventData.subscriber_attributes || {};
  const entitlements = eventData.entitlements || {};
  
  if (!userId) {
    console.warn('[RevenueCat Webhook] No user ID found in event');
    return;
  }

  // Determine subscription status based on entitlements
  const premiumEntitlement = entitlements.premium || entitlements.pro;
  const subscriptionData = {
    isActive: !!premiumEntitlement,
    productId: premiumEntitlement?.product_identifier || null,
    expiresAt: premiumEntitlement?.expires_date || null,
    willRenew: premiumEntitlement?.will_renew || false,
  };

  try {
    switch (type) {
      case 'INITIAL_PURCHASE':
        console.log('[RevenueCat Webhook] Initial purchase for user:', userId);
        await updateUserSubscription(userId, { ...subscriptionData, isActive: true });
        await logSubscriptionEvent(userId, 'INITIAL_PURCHASE', eventData);
        break;

      case 'RENEWAL':
        console.log('[RevenueCat Webhook] Subscription renewal for user:', userId);
        await updateUserSubscription(userId, { ...subscriptionData, isActive: true });
        await logSubscriptionEvent(userId, 'RENEWAL', eventData);
        break;

      case 'CANCELLATION':
        console.log('[RevenueCat Webhook] Subscription cancellation for user:', userId);
        // Note: Cancellation doesn't immediately revoke access, just sets will_renew to false
        await updateUserSubscription(userId, { ...subscriptionData, willRenew: false });
        await logSubscriptionEvent(userId, 'CANCELLATION', eventData);
        break;

      case 'EXPIRATION':
        console.log('[RevenueCat Webhook] Subscription expiration for user:', userId);
        await updateUserSubscription(userId, { ...subscriptionData, isActive: false });
        await logSubscriptionEvent(userId, 'EXPIRATION', eventData);
        break;

      case 'BILLING_ISSUE':
        console.log('[RevenueCat Webhook] Billing issue for user:', userId);
        // Keep subscription active during grace period, but log the issue
        await logSubscriptionEvent(userId, 'BILLING_ISSUE', eventData);
        break;

      case 'PRODUCT_CHANGE':
        console.log('[RevenueCat Webhook] Product change for user:', userId);
        await updateUserSubscription(userId, subscriptionData);
        await logSubscriptionEvent(userId, 'PRODUCT_CHANGE', eventData);
        break;

      case 'TRANSFER':
        console.log('[RevenueCat Webhook] Subscription transfer for user:', userId);
        await updateUserSubscription(userId, subscriptionData);
        await logSubscriptionEvent(userId, 'TRANSFER', eventData);
        break;

      case 'NON_RENEWING_PURCHASE':
        console.log('[RevenueCat Webhook] Non-renewing purchase for user:', userId);
        await updateUserSubscription(userId, { ...subscriptionData, willRenew: false });
        await logSubscriptionEvent(userId, 'NON_RENEWING_PURCHASE', eventData);
        break;

      case 'SUBSCRIPTION_PAUSED':
        console.log('[RevenueCat Webhook] Subscription paused for user:', userId);
        await logSubscriptionEvent(userId, 'SUBSCRIPTION_PAUSED', eventData);
        break;

      case 'UNCANCELLATION':
        console.log('[RevenueCat Webhook] Subscription reactivated for user:', userId);
        await updateUserSubscription(userId, { ...subscriptionData, willRenew: true });
        await logSubscriptionEvent(userId, 'UNCANCELLATION', eventData);
        break;

      default:
        console.log('[RevenueCat Webhook] Unknown event type:', type);
        await logSubscriptionEvent(userId, type, eventData);
        break;
    }

  } catch (error) {
    console.error('[RevenueCat Webhook] Error processing event:', error);
    throw error;
  }
}

/**
 * Handle RevenueCat webhook request
 */
async function handleWebhook(req, res) {
  try {
    const signature = req.headers['x-revenuecat-signature'];
    const rawBody = req.body;

    // Verify webhook signature
    if (!verifyWebhookSignature(rawBody, signature)) {
      console.error('[RevenueCat Webhook] Invalid signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Parse webhook event
    const event = JSON.parse(rawBody);
    
    // Process the event
    await processWebhookEvent(event);

    // Respond with success
    res.status(200).json({ received: true });

  } catch (error) {
    console.error('[RevenueCat Webhook] Error handling webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Express middleware for handling RevenueCat webhooks
 */
function revenueCatWebhookMiddleware(req, res, next) {
  // Capture raw body for signature verification
  let rawBody = '';
  req.on('data', chunk => {
    rawBody += chunk.toString();
  });
  req.on('end', () => {
    req.body = rawBody;
    handleWebhook(req, res);
  });
}

module.exports = {
  handleWebhook,
  revenueCatWebhookMiddleware,
  processWebhookEvent,
  verifyWebhookSignature,
};







 * 
 * This service handles webhook events from RevenueCat to keep user subscription
 * status synchronized on the server side.
 */

const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with fallback for missing credentials
const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://dummy.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'dummy-key';

console.log('🔍 Server Supabase Configuration:');
console.log('- URL:', supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'MISSING');
console.log('- Key:', supabaseKey ? `${supabaseKey.substring(0, 20)}...` : 'MISSING');

let supabase = null;
try {
  supabase = createClient(supabaseUrl, supabaseKey);
  if (supabaseUrl === 'https://dummy.supabase.co' || supabaseKey === 'dummy-key') {
    console.warn('⚠️  Using dummy Supabase credentials - RevenueCat webhooks will be logged but not processed');
  }
} catch (error) {
  console.error('❌ Failed to initialize Supabase client:', error.message);
  console.warn('⚠️  RevenueCat webhooks will be received but not processed');
}

const REVENUECAT_WEBHOOK_SECRET = process.env.REVENUECAT_WEBHOOK_SECRET;

/**
 * Verify webhook signature from RevenueCat
 */
function verifyWebhookSignature(body, signature) {
  if (!REVENUECAT_WEBHOOK_SECRET) {
    console.warn('[RevenueCat Webhook] No webhook secret configured');
    return false;
  }

  const expectedSignature = crypto
    .createHmac('sha256', REVENUECAT_WEBHOOK_SECRET)
    .update(body, 'utf8')
    .digest('hex');

  return signature === expectedSignature;
}

/**
 * Update user subscription status in Supabase
 */
async function updateUserSubscription(userId, subscriptionData) {
  // Skip database update if Supabase is not available
  if (!supabase || supabaseUrl === 'https://dummy.supabase.co') {
    console.log('[RevenueCat Webhook] ⚠️  Supabase not available - subscription update skipped');
    console.log('[RevenueCat Webhook] 📝 Would update user:', userId, {
      isActive: subscriptionData.isActive,
      productId: subscriptionData.productId,
      expiresAt: subscriptionData.expiresAt,
    });
    return;
  }

  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        is_premium: subscriptionData.isActive,
        subscription_product_id: subscriptionData.productId,
        subscription_expires_at: subscriptionData.expiresAt,
        subscription_will_renew: subscriptionData.willRenew,
        subscription_updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      console.error('[RevenueCat Webhook] Failed to update user subscription:', error);
      throw error;
    }

    console.log('[RevenueCat Webhook] Updated subscription for user:', userId, {
      isActive: subscriptionData.isActive,
      productId: subscriptionData.productId,
      expiresAt: subscriptionData.expiresAt,
    });

  } catch (error) {
    console.error('[RevenueCat Webhook] Error updating user subscription:', error);
    throw error;
  }
}

/**
 * Log subscription event for analytics and audit
 */
async function logSubscriptionEvent(userId, eventType, eventData) {
  // Skip logging if Supabase is not available
  if (!supabase || supabaseUrl === 'https://dummy.supabase.co') {
    console.log('[RevenueCat Webhook] ⚠️  Supabase not available - event logging skipped');
    console.log('[RevenueCat Webhook] 📝 Would log event:', eventType, 'for user:', userId);
    return;
  }

  try {
    const { error } = await supabase
      .from('subscription_events')
      .insert({
        user_id: userId,
        event_type: eventType,
        event_data: eventData,
        created_at: new Date().toISOString(),
      });

    if (error) {
      console.error('[RevenueCat Webhook] Failed to log subscription event:', error);
    }

  } catch (error) {
    console.error('[RevenueCat Webhook] Error logging subscription event:', error);
  }
}

/**
 * Process RevenueCat webhook event
 */
async function processWebhookEvent(event) {
  const { type, event: eventData } = event;
  
  console.log('[RevenueCat Webhook] Processing event:', type);

  // Extract user ID and subscription info from the event
  const userId = eventData.app_user_id;
  const subscriberAttributes = eventData.subscriber_attributes || {};
  const entitlements = eventData.entitlements || {};
  
  if (!userId) {
    console.warn('[RevenueCat Webhook] No user ID found in event');
    return;
  }

  // Determine subscription status based on entitlements
  const premiumEntitlement = entitlements.premium || entitlements.pro;
  const subscriptionData = {
    isActive: !!premiumEntitlement,
    productId: premiumEntitlement?.product_identifier || null,
    expiresAt: premiumEntitlement?.expires_date || null,
    willRenew: premiumEntitlement?.will_renew || false,
  };

  try {
    switch (type) {
      case 'INITIAL_PURCHASE':
        console.log('[RevenueCat Webhook] Initial purchase for user:', userId);
        await updateUserSubscription(userId, { ...subscriptionData, isActive: true });
        await logSubscriptionEvent(userId, 'INITIAL_PURCHASE', eventData);
        break;

      case 'RENEWAL':
        console.log('[RevenueCat Webhook] Subscription renewal for user:', userId);
        await updateUserSubscription(userId, { ...subscriptionData, isActive: true });
        await logSubscriptionEvent(userId, 'RENEWAL', eventData);
        break;

      case 'CANCELLATION':
        console.log('[RevenueCat Webhook] Subscription cancellation for user:', userId);
        // Note: Cancellation doesn't immediately revoke access, just sets will_renew to false
        await updateUserSubscription(userId, { ...subscriptionData, willRenew: false });
        await logSubscriptionEvent(userId, 'CANCELLATION', eventData);
        break;

      case 'EXPIRATION':
        console.log('[RevenueCat Webhook] Subscription expiration for user:', userId);
        await updateUserSubscription(userId, { ...subscriptionData, isActive: false });
        await logSubscriptionEvent(userId, 'EXPIRATION', eventData);
        break;

      case 'BILLING_ISSUE':
        console.log('[RevenueCat Webhook] Billing issue for user:', userId);
        // Keep subscription active during grace period, but log the issue
        await logSubscriptionEvent(userId, 'BILLING_ISSUE', eventData);
        break;

      case 'PRODUCT_CHANGE':
        console.log('[RevenueCat Webhook] Product change for user:', userId);
        await updateUserSubscription(userId, subscriptionData);
        await logSubscriptionEvent(userId, 'PRODUCT_CHANGE', eventData);
        break;

      case 'TRANSFER':
        console.log('[RevenueCat Webhook] Subscription transfer for user:', userId);
        await updateUserSubscription(userId, subscriptionData);
        await logSubscriptionEvent(userId, 'TRANSFER', eventData);
        break;

      case 'NON_RENEWING_PURCHASE':
        console.log('[RevenueCat Webhook] Non-renewing purchase for user:', userId);
        await updateUserSubscription(userId, { ...subscriptionData, willRenew: false });
        await logSubscriptionEvent(userId, 'NON_RENEWING_PURCHASE', eventData);
        break;

      case 'SUBSCRIPTION_PAUSED':
        console.log('[RevenueCat Webhook] Subscription paused for user:', userId);
        await logSubscriptionEvent(userId, 'SUBSCRIPTION_PAUSED', eventData);
        break;

      case 'UNCANCELLATION':
        console.log('[RevenueCat Webhook] Subscription reactivated for user:', userId);
        await updateUserSubscription(userId, { ...subscriptionData, willRenew: true });
        await logSubscriptionEvent(userId, 'UNCANCELLATION', eventData);
        break;

      default:
        console.log('[RevenueCat Webhook] Unknown event type:', type);
        await logSubscriptionEvent(userId, type, eventData);
        break;
    }

  } catch (error) {
    console.error('[RevenueCat Webhook] Error processing event:', error);
    throw error;
  }
}

/**
 * Handle RevenueCat webhook request
 */
async function handleWebhook(req, res) {
  try {
    const signature = req.headers['x-revenuecat-signature'];
    const rawBody = req.body;

    // Verify webhook signature
    if (!verifyWebhookSignature(rawBody, signature)) {
      console.error('[RevenueCat Webhook] Invalid signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Parse webhook event
    const event = JSON.parse(rawBody);
    
    // Process the event
    await processWebhookEvent(event);

    // Respond with success
    res.status(200).json({ received: true });

  } catch (error) {
    console.error('[RevenueCat Webhook] Error handling webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Express middleware for handling RevenueCat webhooks
 */
function revenueCatWebhookMiddleware(req, res, next) {
  // Capture raw body for signature verification
  let rawBody = '';
  req.on('data', chunk => {
    rawBody += chunk.toString();
  });
  req.on('end', () => {
    req.body = rawBody;
    handleWebhook(req, res);
  });
}

module.exports = {
  handleWebhook,
  revenueCatWebhookMiddleware,
  processWebhookEvent,
  verifyWebhookSignature,
};











 * 
 * This service handles webhook events from RevenueCat to keep user subscription
 * status synchronized on the server side.
 */

const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with fallback for missing credentials
const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://dummy.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'dummy-key';

console.log('🔍 Server Supabase Configuration:');
console.log('- URL:', supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'MISSING');
console.log('- Key:', supabaseKey ? `${supabaseKey.substring(0, 20)}...` : 'MISSING');

let supabase = null;
try {
  supabase = createClient(supabaseUrl, supabaseKey);
  if (supabaseUrl === 'https://dummy.supabase.co' || supabaseKey === 'dummy-key') {
    console.warn('⚠️  Using dummy Supabase credentials - RevenueCat webhooks will be logged but not processed');
  }
} catch (error) {
  console.error('❌ Failed to initialize Supabase client:', error.message);
  console.warn('⚠️  RevenueCat webhooks will be received but not processed');
}

const REVENUECAT_WEBHOOK_SECRET = process.env.REVENUECAT_WEBHOOK_SECRET;

/**
 * Verify webhook signature from RevenueCat
 */
function verifyWebhookSignature(body, signature) {
  if (!REVENUECAT_WEBHOOK_SECRET) {
    console.warn('[RevenueCat Webhook] No webhook secret configured');
    return false;
  }

  const expectedSignature = crypto
    .createHmac('sha256', REVENUECAT_WEBHOOK_SECRET)
    .update(body, 'utf8')
    .digest('hex');

  return signature === expectedSignature;
}

/**
 * Update user subscription status in Supabase
 */
async function updateUserSubscription(userId, subscriptionData) {
  // Skip database update if Supabase is not available
  if (!supabase || supabaseUrl === 'https://dummy.supabase.co') {
    console.log('[RevenueCat Webhook] ⚠️  Supabase not available - subscription update skipped');
    console.log('[RevenueCat Webhook] 📝 Would update user:', userId, {
      isActive: subscriptionData.isActive,
      productId: subscriptionData.productId,
      expiresAt: subscriptionData.expiresAt,
    });
    return;
  }

  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        is_premium: subscriptionData.isActive,
        subscription_product_id: subscriptionData.productId,
        subscription_expires_at: subscriptionData.expiresAt,
        subscription_will_renew: subscriptionData.willRenew,
        subscription_updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      console.error('[RevenueCat Webhook] Failed to update user subscription:', error);
      throw error;
    }

    console.log('[RevenueCat Webhook] Updated subscription for user:', userId, {
      isActive: subscriptionData.isActive,
      productId: subscriptionData.productId,
      expiresAt: subscriptionData.expiresAt,
    });

  } catch (error) {
    console.error('[RevenueCat Webhook] Error updating user subscription:', error);
    throw error;
  }
}

/**
 * Log subscription event for analytics and audit
 */
async function logSubscriptionEvent(userId, eventType, eventData) {
  // Skip logging if Supabase is not available
  if (!supabase || supabaseUrl === 'https://dummy.supabase.co') {
    console.log('[RevenueCat Webhook] ⚠️  Supabase not available - event logging skipped');
    console.log('[RevenueCat Webhook] 📝 Would log event:', eventType, 'for user:', userId);
    return;
  }

  try {
    const { error } = await supabase
      .from('subscription_events')
      .insert({
        user_id: userId,
        event_type: eventType,
        event_data: eventData,
        created_at: new Date().toISOString(),
      });

    if (error) {
      console.error('[RevenueCat Webhook] Failed to log subscription event:', error);
    }

  } catch (error) {
    console.error('[RevenueCat Webhook] Error logging subscription event:', error);
  }
}

/**
 * Process RevenueCat webhook event
 */
async function processWebhookEvent(event) {
  const { type, event: eventData } = event;
  
  console.log('[RevenueCat Webhook] Processing event:', type);

  // Extract user ID and subscription info from the event
  const userId = eventData.app_user_id;
  const subscriberAttributes = eventData.subscriber_attributes || {};
  const entitlements = eventData.entitlements || {};
  
  if (!userId) {
    console.warn('[RevenueCat Webhook] No user ID found in event');
    return;
  }

  // Determine subscription status based on entitlements
  const premiumEntitlement = entitlements.premium || entitlements.pro;
  const subscriptionData = {
    isActive: !!premiumEntitlement,
    productId: premiumEntitlement?.product_identifier || null,
    expiresAt: premiumEntitlement?.expires_date || null,
    willRenew: premiumEntitlement?.will_renew || false,
  };

  try {
    switch (type) {
      case 'INITIAL_PURCHASE':
        console.log('[RevenueCat Webhook] Initial purchase for user:', userId);
        await updateUserSubscription(userId, { ...subscriptionData, isActive: true });
        await logSubscriptionEvent(userId, 'INITIAL_PURCHASE', eventData);
        break;

      case 'RENEWAL':
        console.log('[RevenueCat Webhook] Subscription renewal for user:', userId);
        await updateUserSubscription(userId, { ...subscriptionData, isActive: true });
        await logSubscriptionEvent(userId, 'RENEWAL', eventData);
        break;

      case 'CANCELLATION':
        console.log('[RevenueCat Webhook] Subscription cancellation for user:', userId);
        // Note: Cancellation doesn't immediately revoke access, just sets will_renew to false
        await updateUserSubscription(userId, { ...subscriptionData, willRenew: false });
        await logSubscriptionEvent(userId, 'CANCELLATION', eventData);
        break;

      case 'EXPIRATION':
        console.log('[RevenueCat Webhook] Subscription expiration for user:', userId);
        await updateUserSubscription(userId, { ...subscriptionData, isActive: false });
        await logSubscriptionEvent(userId, 'EXPIRATION', eventData);
        break;

      case 'BILLING_ISSUE':
        console.log('[RevenueCat Webhook] Billing issue for user:', userId);
        // Keep subscription active during grace period, but log the issue
        await logSubscriptionEvent(userId, 'BILLING_ISSUE', eventData);
        break;

      case 'PRODUCT_CHANGE':
        console.log('[RevenueCat Webhook] Product change for user:', userId);
        await updateUserSubscription(userId, subscriptionData);
        await logSubscriptionEvent(userId, 'PRODUCT_CHANGE', eventData);
        break;

      case 'TRANSFER':
        console.log('[RevenueCat Webhook] Subscription transfer for user:', userId);
        await updateUserSubscription(userId, subscriptionData);
        await logSubscriptionEvent(userId, 'TRANSFER', eventData);
        break;

      case 'NON_RENEWING_PURCHASE':
        console.log('[RevenueCat Webhook] Non-renewing purchase for user:', userId);
        await updateUserSubscription(userId, { ...subscriptionData, willRenew: false });
        await logSubscriptionEvent(userId, 'NON_RENEWING_PURCHASE', eventData);
        break;

      case 'SUBSCRIPTION_PAUSED':
        console.log('[RevenueCat Webhook] Subscription paused for user:', userId);
        await logSubscriptionEvent(userId, 'SUBSCRIPTION_PAUSED', eventData);
        break;

      case 'UNCANCELLATION':
        console.log('[RevenueCat Webhook] Subscription reactivated for user:', userId);
        await updateUserSubscription(userId, { ...subscriptionData, willRenew: true });
        await logSubscriptionEvent(userId, 'UNCANCELLATION', eventData);
        break;

      default:
        console.log('[RevenueCat Webhook] Unknown event type:', type);
        await logSubscriptionEvent(userId, type, eventData);
        break;
    }

  } catch (error) {
    console.error('[RevenueCat Webhook] Error processing event:', error);
    throw error;
  }
}

/**
 * Handle RevenueCat webhook request
 */
async function handleWebhook(req, res) {
  try {
    const signature = req.headers['x-revenuecat-signature'];
    const rawBody = req.body;

    // Verify webhook signature
    if (!verifyWebhookSignature(rawBody, signature)) {
      console.error('[RevenueCat Webhook] Invalid signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Parse webhook event
    const event = JSON.parse(rawBody);
    
    // Process the event
    await processWebhookEvent(event);

    // Respond with success
    res.status(200).json({ received: true });

  } catch (error) {
    console.error('[RevenueCat Webhook] Error handling webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Express middleware for handling RevenueCat webhooks
 */
function revenueCatWebhookMiddleware(req, res, next) {
  // Capture raw body for signature verification
  let rawBody = '';
  req.on('data', chunk => {
    rawBody += chunk.toString();
  });
  req.on('end', () => {
    req.body = rawBody;
    handleWebhook(req, res);
  });
}

module.exports = {
  handleWebhook,
  revenueCatWebhookMiddleware,
  processWebhookEvent,
  verifyWebhookSignature,
};







 * 
 * This service handles webhook events from RevenueCat to keep user subscription
 * status synchronized on the server side.
 */

const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with fallback for missing credentials
const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://dummy.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'dummy-key';

console.log('🔍 Server Supabase Configuration:');
console.log('- URL:', supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'MISSING');
console.log('- Key:', supabaseKey ? `${supabaseKey.substring(0, 20)}...` : 'MISSING');

let supabase = null;
try {
  supabase = createClient(supabaseUrl, supabaseKey);
  if (supabaseUrl === 'https://dummy.supabase.co' || supabaseKey === 'dummy-key') {
    console.warn('⚠️  Using dummy Supabase credentials - RevenueCat webhooks will be logged but not processed');
  }
} catch (error) {
  console.error('❌ Failed to initialize Supabase client:', error.message);
  console.warn('⚠️  RevenueCat webhooks will be received but not processed');
}

const REVENUECAT_WEBHOOK_SECRET = process.env.REVENUECAT_WEBHOOK_SECRET;

/**
 * Verify webhook signature from RevenueCat
 */
function verifyWebhookSignature(body, signature) {
  if (!REVENUECAT_WEBHOOK_SECRET) {
    console.warn('[RevenueCat Webhook] No webhook secret configured');
    return false;
  }

  const expectedSignature = crypto
    .createHmac('sha256', REVENUECAT_WEBHOOK_SECRET)
    .update(body, 'utf8')
    .digest('hex');

  return signature === expectedSignature;
}

/**
 * Update user subscription status in Supabase
 */
async function updateUserSubscription(userId, subscriptionData) {
  // Skip database update if Supabase is not available
  if (!supabase || supabaseUrl === 'https://dummy.supabase.co') {
    console.log('[RevenueCat Webhook] ⚠️  Supabase not available - subscription update skipped');
    console.log('[RevenueCat Webhook] 📝 Would update user:', userId, {
      isActive: subscriptionData.isActive,
      productId: subscriptionData.productId,
      expiresAt: subscriptionData.expiresAt,
    });
    return;
  }

  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        is_premium: subscriptionData.isActive,
        subscription_product_id: subscriptionData.productId,
        subscription_expires_at: subscriptionData.expiresAt,
        subscription_will_renew: subscriptionData.willRenew,
        subscription_updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      console.error('[RevenueCat Webhook] Failed to update user subscription:', error);
      throw error;
    }

    console.log('[RevenueCat Webhook] Updated subscription for user:', userId, {
      isActive: subscriptionData.isActive,
      productId: subscriptionData.productId,
      expiresAt: subscriptionData.expiresAt,
    });

  } catch (error) {
    console.error('[RevenueCat Webhook] Error updating user subscription:', error);
    throw error;
  }
}

/**
 * Log subscription event for analytics and audit
 */
async function logSubscriptionEvent(userId, eventType, eventData) {
  // Skip logging if Supabase is not available
  if (!supabase || supabaseUrl === 'https://dummy.supabase.co') {
    console.log('[RevenueCat Webhook] ⚠️  Supabase not available - event logging skipped');
    console.log('[RevenueCat Webhook] 📝 Would log event:', eventType, 'for user:', userId);
    return;
  }

  try {
    const { error } = await supabase
      .from('subscription_events')
      .insert({
        user_id: userId,
        event_type: eventType,
        event_data: eventData,
        created_at: new Date().toISOString(),
      });

    if (error) {
      console.error('[RevenueCat Webhook] Failed to log subscription event:', error);
    }

  } catch (error) {
    console.error('[RevenueCat Webhook] Error logging subscription event:', error);
  }
}

/**
 * Process RevenueCat webhook event
 */
async function processWebhookEvent(event) {
  const { type, event: eventData } = event;
  
  console.log('[RevenueCat Webhook] Processing event:', type);

  // Extract user ID and subscription info from the event
  const userId = eventData.app_user_id;
  const subscriberAttributes = eventData.subscriber_attributes || {};
  const entitlements = eventData.entitlements || {};
  
  if (!userId) {
    console.warn('[RevenueCat Webhook] No user ID found in event');
    return;
  }

  // Determine subscription status based on entitlements
  const premiumEntitlement = entitlements.premium || entitlements.pro;
  const subscriptionData = {
    isActive: !!premiumEntitlement,
    productId: premiumEntitlement?.product_identifier || null,
    expiresAt: premiumEntitlement?.expires_date || null,
    willRenew: premiumEntitlement?.will_renew || false,
  };

  try {
    switch (type) {
      case 'INITIAL_PURCHASE':
        console.log('[RevenueCat Webhook] Initial purchase for user:', userId);
        await updateUserSubscription(userId, { ...subscriptionData, isActive: true });
        await logSubscriptionEvent(userId, 'INITIAL_PURCHASE', eventData);
        break;

      case 'RENEWAL':
        console.log('[RevenueCat Webhook] Subscription renewal for user:', userId);
        await updateUserSubscription(userId, { ...subscriptionData, isActive: true });
        await logSubscriptionEvent(userId, 'RENEWAL', eventData);
        break;

      case 'CANCELLATION':
        console.log('[RevenueCat Webhook] Subscription cancellation for user:', userId);
        // Note: Cancellation doesn't immediately revoke access, just sets will_renew to false
        await updateUserSubscription(userId, { ...subscriptionData, willRenew: false });
        await logSubscriptionEvent(userId, 'CANCELLATION', eventData);
        break;

      case 'EXPIRATION':
        console.log('[RevenueCat Webhook] Subscription expiration for user:', userId);
        await updateUserSubscription(userId, { ...subscriptionData, isActive: false });
        await logSubscriptionEvent(userId, 'EXPIRATION', eventData);
        break;

      case 'BILLING_ISSUE':
        console.log('[RevenueCat Webhook] Billing issue for user:', userId);
        // Keep subscription active during grace period, but log the issue
        await logSubscriptionEvent(userId, 'BILLING_ISSUE', eventData);
        break;

      case 'PRODUCT_CHANGE':
        console.log('[RevenueCat Webhook] Product change for user:', userId);
        await updateUserSubscription(userId, subscriptionData);
        await logSubscriptionEvent(userId, 'PRODUCT_CHANGE', eventData);
        break;

      case 'TRANSFER':
        console.log('[RevenueCat Webhook] Subscription transfer for user:', userId);
        await updateUserSubscription(userId, subscriptionData);
        await logSubscriptionEvent(userId, 'TRANSFER', eventData);
        break;

      case 'NON_RENEWING_PURCHASE':
        console.log('[RevenueCat Webhook] Non-renewing purchase for user:', userId);
        await updateUserSubscription(userId, { ...subscriptionData, willRenew: false });
        await logSubscriptionEvent(userId, 'NON_RENEWING_PURCHASE', eventData);
        break;

      case 'SUBSCRIPTION_PAUSED':
        console.log('[RevenueCat Webhook] Subscription paused for user:', userId);
        await logSubscriptionEvent(userId, 'SUBSCRIPTION_PAUSED', eventData);
        break;

      case 'UNCANCELLATION':
        console.log('[RevenueCat Webhook] Subscription reactivated for user:', userId);
        await updateUserSubscription(userId, { ...subscriptionData, willRenew: true });
        await logSubscriptionEvent(userId, 'UNCANCELLATION', eventData);
        break;

      default:
        console.log('[RevenueCat Webhook] Unknown event type:', type);
        await logSubscriptionEvent(userId, type, eventData);
        break;
    }

  } catch (error) {
    console.error('[RevenueCat Webhook] Error processing event:', error);
    throw error;
  }
}

/**
 * Handle RevenueCat webhook request
 */
async function handleWebhook(req, res) {
  try {
    const signature = req.headers['x-revenuecat-signature'];
    const rawBody = req.body;

    // Verify webhook signature
    if (!verifyWebhookSignature(rawBody, signature)) {
      console.error('[RevenueCat Webhook] Invalid signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Parse webhook event
    const event = JSON.parse(rawBody);
    
    // Process the event
    await processWebhookEvent(event);

    // Respond with success
    res.status(200).json({ received: true });

  } catch (error) {
    console.error('[RevenueCat Webhook] Error handling webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Express middleware for handling RevenueCat webhooks
 */
function revenueCatWebhookMiddleware(req, res, next) {
  // Capture raw body for signature verification
  let rawBody = '';
  req.on('data', chunk => {
    rawBody += chunk.toString();
  });
  req.on('end', () => {
    req.body = rawBody;
    handleWebhook(req, res);
  });
}

module.exports = {
  handleWebhook,
  revenueCatWebhookMiddleware,
  processWebhookEvent,
  verifyWebhookSignature,
};
















