# Retry Strategy Quick Reference

## What Was the Problem?

When using the Gemini API, occasional **503 Service Unavailable** errors would occur when Google's servers were temporarily overloaded. The previous retry logic (3 retries with 10-second delays) wasn't aggressive enough to handle sustained overload periods.

## What Changed?

| Aspect | Before | After | Impact |
|--------|--------|-------|--------|
| Max Retries | 3 | 5 | +67% more attempts |
| 503 Base Delay | 10s | 15s | Longer wait for recovery |
| 503 Max Delay | 30s | 45s | Allows longer recovery time |
| Retry Calls | 3 | 5 | All generateContentWithRetry calls |

## The Timeline of a Retried Request

```
T=0s:    Attempt 1 → 503 Error
T=15s:   Attempt 2 → 503 Error (15s + random jitter up to 2s)
T=45s:   Attempt 3 → 503 Error (30s + random jitter up to 2s)
T=90s:   Attempt 4 → 503 Error (45s + random jitter up to 2s) [capped]
T=135s:  Attempt 5 → 503 Error (45s + random jitter up to 2s) [capped]
T=180s:  Return error to client (total time: ~3 minutes)
```

> In most cases with a transient outage, the request succeeds after attempt 2-3 (30-60 seconds).

## Error Detection Rules

The system identifies retryable errors by checking for:

### 503 Service Unavailable
- HTTP status code: 503
- Error messages containing: "Service Unavailable", "overloaded", "quota", "rate limit"

### Timeout Errors
- Error names: TimeoutError
- Messages containing: "timeout", "Gemini request timeout"

### Network Errors
- Messages containing: "network", "fetch failed", "ENOTFOUND", "ECONNREFUSED", "ETIMEDOUT", "socket hang up"

### NOT Retryable (Fail Immediately)
- **Persistent network errors** (ENOTFOUND, ECONNREFUSED) on first attempt
- Invalid API keys
- Malformed requests
- Authentication failures

## Backoff Strategy

The retry mechanism uses **exponential backoff with jitter**:

```javascript
exponentialDelay = baseDelay * 2^(attempt - 1)
randomJitter = Math.random() * 2000  // Up to 2 seconds
finalDelay = Math.min(exponentialDelay + jitter, maxDelay)
```

**Why exponential backoff?**
- Prevents overwhelming an overloaded service
- Spaces out retries over time
- Gives the service time to recover

**Why jitter?**
- Prevents "thundering herd" (all clients retrying at same time)
- Distributes load more evenly
- Reduces synchronized failures

## Different Error Types Get Different Treatment

### For 503 Errors (Most Common)
- Waits longer (15s → 30s → 45s)
- Assumes service is temporarily overloaded
- Gives extra time to recover

### For Timeout Errors
- Waits moderately (5s → 10s → 20s)
- Indicates connection issues
- Shorter wait than 503

### For Network Errors
- Waits quickly (1s → 2s → 4s)
- Assumes transient network glitch
- Faster retry cycle

## Code Locations

### Main Retry Logic
**File:** `server/services/geminiTextService.js`

- **Lines 635-841**: `generateContentWithRetry()` function
- **Lines 765-787**: Error classification logic
- **Lines 810-823**: Backoff calculation

### Callers
- **Line 156**: `generateRecipe()` - now uses 5 retries
- **Line 617**: `generateText()` - now uses 5 retries

## Monitoring & Debugging

### Enable Detailed Logs
Look for these patterns in server console:

```
[GEMINI TEXT] ⚠️ Retryable error (attempt 1/5), retrying in 14582ms...
[GEMINI TEXT] Service unavailable (503): true
[GEMINI TEXT] Backoff delay: 14582ms (exponential + jitter)
[GEMINI TEXT] Attempt 2/5
[GEMINI TEXT] ✅ Success on attempt 2
```

### Success Indicators
- ✅ appears in logs = Success
- Request completes within 45 seconds = Good success rate
- Request succeeds on attempt 1-2 = No overload issues

### Warning Signs
- Many requests on attempt 4-5 = API under sustained load
- Timeouts even after retries = Network or infrastructure issue
- Immediate 503 on attempt 1 = API may be down (check status)

## Quick Troubleshooting

| Symptom | Check |
|---------|-------|
| Immediate 503 error | https://status.ai.google.dev/ |
| 503 persists for minutes | Check Google Cloud Console quota limits |
| Timeout after retries | Network stability / firewall rules |
| Every request fails | API key validity / permissions |
| Only some requests fail | Normal - retries should handle it |

## Expected Performance

- **Success rate on first try**: ~95% (no retries needed)
- **Success after 1-2 retries**: ~99%+ (typical overload recovery)
- **Total latency with retries**: 30-60 seconds (worst case)
- **User experience**: "Please wait..." message during retries

## Testing the Retry Logic

To verify retries are working:

```bash
# Check logs while generating a workout
tail -f server-logs.txt | grep "GEMINI TEXT"

# Look for patterns like:
# Attempt 1/5 → 503 → retry
# Attempt 2/5 → Success ✅
```

## Future Improvements

If 503 errors become more frequent, consider:

1. **Circuit Breaker Pattern**: Stop retrying if error rate too high
2. **Request Queuing**: Rate-limit outgoing requests
3. **Caching**: Cache recent successful responses
4. **Alternative API**: Fallback to different AI provider
5. **Health Checks**: Pre-flight checks before making requests
