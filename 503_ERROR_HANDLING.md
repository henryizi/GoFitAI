# 503 Service Unavailable Error Handling

## Overview

The GoFitAI application has been enhanced with robust retry logic to handle temporary 503 Service Unavailable errors from the Google Gemini API. These errors occur when the API is temporarily overloaded.

## Recent Improvements (October 22, 2025)

### Changes Made

1. **Increased Retry Base Delays for 503 Errors**
   - Base delay: Increased from 10 seconds → **15 seconds**
   - Max delay: Increased from 30 seconds → **45 seconds**
   - This gives the overloaded service more time to recover

2. **Increased Max Retries**
   - Changed from 3 retries → **5 retries**
   - Applied to all `generateContentWithRetry()` calls
   - Provides more attempts before giving up

3. **Smart Backoff Strategy**
   - Exponential backoff with jitter prevents "thundering herd" problem
   - Different delay strategies for different error types:
     - **503 Service Unavailable**: 15s → 30s → 60s (capped at 45s) with jitter
     - **Timeout errors**: 5s → 10s → 20s (capped at 15s) with jitter
     - **Network errors**: 1s → 2s → 4s (capped at 8s) with jitter

## File Changes

- **server/services/geminiTextService.js**
  - Line 811-812: Updated 503 error backoff delays
  - Line 156: Updated generateRecipe retry count to 5
  - Line 617: Updated generateText retry count to 5

## Retry Logic Flow

```
Request attempt 1
  ↓ (if 503) Wait 15s + jitter (up to 2s)
Request attempt 2
  ↓ (if 503) Wait 30s + jitter
Request attempt 3
  ↓ (if 503) Wait 45s + jitter (capped)
Request attempt 4
  ↓ (if 503) Wait 45s + jitter (capped)
Request attempt 5
  ↓ (if 503) FAIL - Return error to client
```

## Expected Behavior

### With Current Improvements

- **Best case**: Request succeeds on first attempt (no wait)
- **Typical case with 503**: Succeeds after 1-2 retries (15-45 seconds)
- **Worst case**: All 5 retries exhausted (90+ seconds total wait time)

### Console Output

When experiencing a 503 error, you'll see logs like:

```
[GEMINI TEXT] ⚠️ Retryable error (attempt 1/5), retrying in 14582ms...
[GEMINI TEXT] Error type: Error
[GEMINI TEXT] Service unavailable (503): true
[GEMINI TEXT] Backoff delay: 14582ms (exponential + jitter)
[GEMINI TEXT] Attempt 2/5
[GEMINI TEXT] ✅ Success on attempt 2
```

## Troubleshooting 503 Errors

### If You Still Get 503 Errors

1. **Check API Status**
   - Visit: https://status.ai.google.dev/
   - Verify Gemini API is operational
   - Check for ongoing incidents or maintenance

2. **Check API Quota**
   - Log in to Google Cloud Console
   - Navigate to Gemini API quotas
   - Verify you haven't exceeded rate limits
   - Check "Quota Exceeded" error details

3. **Check Network Connection**
   - Ensure stable internet connection
   - Try from different network if possible
   - Check firewall rules aren't blocking API calls

4. **Review Recent Changes**
   - Compare prompt sizes to see if requests got larger
   - Check if timeout values are too aggressive
   - Verify API key is still valid

### Implementation Details

The retry logic is located in `server/services/geminiTextService.js`:

**Error Classification** (lines 765-787):
- Identifies 503, timeout, and network errors
- Determines if error is retryable
- Distinguishes between persistent and transient errors

**Backoff Calculation** (lines 810-823):
- Applies exponential backoff: `baseDelay * Math.pow(2, attempt - 1)`
- Adds random jitter to prevent synchronization
- Caps at maximum delay specific to error type

## Performance Impact

- **Success on first try**: No impact (0ms added)
- **With retries**: Adds 15-45 seconds per retry (necessary trade-off)
- **Total request time**: Can reach 3-5 minutes in extreme cases
- **User experience**: Better than immediate failure

## Next Steps

If 503 errors persist after this update:

1. Consider implementing circuit breaker pattern
2. Add request queuing to prevent overwhelming the API
3. Implement adaptive retry rates based on success/failure patterns
4. Monitor Gemini API health metrics
5. Consider caching responses to reduce API calls

## Monitoring

Enable detailed logging by checking server console output:

```
[GEMINI TEXT] Error message: Service Unavailable
[GEMINI TEXT] Service unavailable (503): true
[GEMINI TEXT] Backoff delay: 15000ms (exponential + jitter)
```

Track these metrics to understand:
- How often 503 errors occur
- At what point requests succeed
- Average time to success
- User impact
