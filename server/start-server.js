/**
 * Robust server starter script
 * This script starts the server and automatically restarts it if it crashes
 */

const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const net = require('net');

// Configuration
const MAX_RESTARTS = 10;
const RESTART_DELAY_MS = 2000;
const LOG_FILE = path.join(__dirname, 'server.log');
const PORT = 4000;

// Initialize counters
let restartCount = 0;
let lastRestartTime = 0;

// Create log file stream
const logStream = fs.createWriteStream(LOG_FILE, { flags: 'a' });

function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  console.log(logMessage);
  logStream.write(logMessage + '\n');
}

function checkPortInUse(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(true); // Port is in use
      } else {
        resolve(false); // Other error, assume port is free
      }
    });
    
    server.once('listening', () => {
      server.close();
      resolve(false); // Port is free
    });
    
    server.listen(port);
  });
}

function killProcessOnPort(port) {
  return new Promise((resolve) => {
    // Use lsof to find processes on the port
    exec(`lsof -ti :${port}`, (error, stdout, stderr) => {
      if (error) {
        log(`No processes found on port ${port}`);
        resolve();
        return;
      }
      
      const pids = stdout.trim().split('\n').filter(pid => pid);
      if (pids.length === 0) {
        log(`No processes found on port ${port}`);
        resolve();
        return;
      }
      
      log(`Found ${pids.length} process(es) on port ${port}: ${pids.join(', ')}`);
      
      // Try SIGTERM first, then SIGKILL
      let killed = 0;
      pids.forEach(pid => {
        // First try graceful shutdown
        exec(`kill -TERM ${pid}`, (termError) => {
          // Wait a moment, then force kill if needed
          setTimeout(() => {
            exec(`kill -9 ${pid}`, (killError) => {
              killed++;
              if (killError) {
                log(`Process ${pid} may already be dead: ${killError.message}`);
              } else {
                log(`Force-killed process ${pid}`);
              }
              
              if (killed === pids.length) {
                // Wait longer for processes to clean up completely
                setTimeout(resolve, 2000);
              }
            });
          }, 500);
        });
      });
    });
  });
}

async function ensurePortIsFree(port, maxRetries = 3) {
  log(`Checking if port ${port} is free...`);
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const isInUse = await checkPortInUse(port);
    if (!isInUse) {
      log(`Port ${port} is free`);
      return;
    }
    
    log(`Port ${port} is in use (attempt ${attempt}/${maxRetries}), attempting to free it...`);
    await killProcessOnPort(port);
    
    // Wait a bit more before checking again
    if (attempt < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  // Final check
  const stillInUse = await checkPortInUse(port);
  if (stillInUse) {
    log(`Error: Port ${port} is still in use after ${maxRetries} cleanup attempts`);
    throw new Error(`Unable to free port ${port}`);
  } else {
    log(`Port ${port} is now free after cleanup`);
  }
}

async function startServer() {
  // Check if we're restarting too frequently
  const now = Date.now();
  if (now - lastRestartTime < RESTART_DELAY_MS && restartCount > 0) {
    log(`Waiting ${RESTART_DELAY_MS}ms before restarting server...`);
    setTimeout(startServer, RESTART_DELAY_MS);
    return;
  }
  
  // Check if we've restarted too many times
  if (restartCount >= MAX_RESTARTS) {
    log(`Server has restarted ${restartCount} times. Giving up.`);
    process.exit(1);
  }
  
  // Ensure port is free before starting
  await ensurePortIsFree(PORT);
  
  // Update restart counter and time
  restartCount++;
  lastRestartTime = now;
  
  // Log startup
  log(`Starting server (attempt ${restartCount}/${MAX_RESTARTS})...`);
  
  // Start the server process
  const serverProcess = spawn('node', [path.join(__dirname, 'index.js')], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env
  });
  
  // Track the current process for cleanup
  currentServerProcess = serverProcess;
  
  // Handle server output
  serverProcess.stdout.on('data', (data) => {
    process.stdout.write(data);
    logStream.write(data);
  });
  
  serverProcess.stderr.on('data', (data) => {
    process.stderr.write(data);
    logStream.write(data);
  });
  
  // Handle server exit
  serverProcess.on('exit', (code, signal) => {
    log(`Server exited with code ${code} and signal ${signal}`);
    startServer(); // Restart the server
  });
  
  // Handle server errors
  serverProcess.on('error', (err) => {
    log(`Server error: ${err.message}`);
    startServer(); // Restart the server
  });
}

// Track the current server process
let currentServerProcess = null;

// Enhanced signal handling with cleanup
async function gracefulShutdown(signal) {
  log(`Received ${signal}. Shutting down gracefully...`);
  
  if (currentServerProcess) {
    log('Terminating server process...');
    currentServerProcess.kill('SIGTERM');
    
    // Give server time to shut down gracefully
    setTimeout(() => {
      if (currentServerProcess && !currentServerProcess.killed) {
        log('Force killing server process...');
        currentServerProcess.kill('SIGKILL');
      }
    }, 5000);
  }
  
  // Clean up port
  await killProcessOnPort(PORT);
  
  log('Cleanup complete. Exiting.');
  logStream.end();
  process.exit(0);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Start the server
startServer(); 