const express = require('express');
const app = express();
const port = process.env.PORT || 4000;

app.get('/', (req, res) => {
  res.json({ message: 'Hello from Railway!', timestamp: new Date().toISOString() });
});

app.get('/ping', (req, res) => {
  res.json({ status: 'ok', message: 'pong' });
});

app.get('/api/test', (req, res) => {
  res.json({ 
    status: 'success', 
    message: 'Test endpoint working',
    environment: process.env.NODE_ENV || 'development',
    port: port
  });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Test server running on port ${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Available endpoints:`);
  console.log(`- GET /`);
  console.log(`- GET /ping`);
  console.log(`- GET /api/test`);
});


