#!/usr/bin/env node

const { exec, spawn } = require('child_process');
const path = require('path');

console.log('Restarting server...');

// First try to kill any existing server process
exec('lsof -i :4000 -t', (error, stdout) => {
  if (stdout) {
    const pid = stdout.trim();
    console.log(`Found server running on PID: ${pid}, killing it...`);
    
    exec(`kill -9 ${pid}`, (killError) => {
      if (killError) {
        console.error('Error killing existing server:', killError);
      } else {
        console.log('Successfully killed existing server process');
      }
      startNewServer();
    });
  } else {
    console.log('No existing server process found');
    startNewServer();
  }
});

function startNewServer() {
  console.log('Starting new server process...');
  
  // Get the path to the server index.js file
  const serverPath = path.join(__dirname, 'index.js');
  
  // Start the server in a detached process
  const server = spawn('node', [serverPath], {
    detached: true,
    stdio: 'inherit'
  });
  
  // Unref the child process so the parent can exit
  server.unref();
  
  console.log(`Server started with PID: ${server.pid}`);
  console.log('Server is now running in the background');
} 