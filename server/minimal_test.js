const test = () => {
app.post('/api/generate-workout-plan', async (req, res) => {
  try {
    // Extract userId from request body (optional for testing)
    const { userId } = req.body;
    // Generate a UUID-like string for testing if no userId provided
    const defaultUserId = userId || crypto.randomUUID();

    // Accept both 'profile' and 'userProfile' for backward compatibility
    const { profile, userProfile } = req.body;
    const profileData = profile || userProfile;
}
