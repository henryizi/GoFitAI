const express = require('express');
const cors = require('cors');
const os = require('os');

const app = express();
const port = 5000; // Different port than main server

// Enable CORS for all routes
app.use(cors({
  origin: '*', // Allow all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Simple health check endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Test server is running',
    timestamp: new Date().toISOString()
  });
});

// Start the server
app.listen(port, '0.0.0.0', () => {
  console.log(`Test server running on port ${port}`);
  
  // Print out all IP addresses
  const networkInterfaces = os.networkInterfaces();
  console.log('\nAvailable on:');
  
  Object.keys(networkInterfaces).forEach((ifaceName) => {
    networkInterfaces[ifaceName].forEach((iface) => {
      if (iface.family === 'IPv4') {
        console.log(`- http://${iface.address}:${port} (${ifaceName}${iface.internal ? ' - internal' : ''})`);
      }
    });
  });
}); 