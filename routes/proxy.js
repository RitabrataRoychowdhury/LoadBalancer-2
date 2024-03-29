const express = require('express');
const cookieParser = require('cookie-parser');
const proxy = require('http-proxy-middleware');
const axios = require('axios');

const app = express();

// Mount health router
const healthRouter = require('./health.js');
app.use(healthRouter);

// Define router
const router = express.Router();

// Define servers array
const servers = [
  {
    id: 'server1', // Add an ID for each server
    host: 'localhost',
    port: 3000,
    weight: 1,
  },
  // Add more servers here
];

// Define global variables
let selectedServer = servers[0]; // Initial selected server
let drained = []; // Array to store drained servers

// Proxy middleware configuration
const proxyOptions = {
  target: '',
  changeOrigin: true,
  onProxyReq: (proxyReq, req) => {
    // Add custom header to the request
    proxyReq.setHeader('X-Special-Proxy-Header', 'foobar');
  },
  logLevel: 'debug'
};

// Get next server using Round Robin
let currIndex = -1;
function getServer() {
  currIndex = (currIndex + 1) % servers.length;
  return servers[currIndex];
}

// Update list of healthy servers
async function updateHealthyServers() {
  const updatedHealthyServers = [];

  // Loop through servers and check health status for each
  for (const server of servers) {
    const healthCheckUrl = `http://${server.host}:${server.port}/healthcheck`;

    // Send a health check request to the server
    try {
      const response = await axios.get(healthCheckUrl);
      if (response.status === 200) {
        updatedHealthyServers.push(server);
      }
    } catch (error) {
      console.error(`Health check failed for server ${server.host}:${server.port}`);
    }
  }

  // Update the global variable healthyServers with the newly obtained healthy servers
  healthyServers = updatedHealthyServers;
}

// Call initially 
updateHealthyServers();

// Update health periodically
setInterval(updateHealthyServers, 10000);

// Session affinity
const COOKIE_NAME = 'lb-affinity';
app.use(cookieParser());

router.all('*', (req, res, next) => {
  if (!req.cookies[COOKIE_NAME]) {
    // Set cookie 
    res.cookie(COOKIE_NAME, selectedServer.id, {
      httpOnly: true
    });
  } 
  next();
});

router.all('*', (req, res, next) => {
  if (!req.cookies[COOKIE_NAME]) {
    // Select server
    const server = getServer();

    // Check if draining
    if (draining.includes(server.id)) {
      return sendToBackup(req, res); // Bypass if draining
    }

    // Route to selected server
    proxyOptions.target = `http://${server.host}:${server.port}`;
    proxy(proxyOptions)(req, res);
  } else {
    // Route to selected server
    const affinityId = req.cookies[COOKIE_NAME];
    const selectedServer = servers.find((server) => server.id === affinityId);

    // Check if draining
    if (draining.includes(selectedServer.id)) {
      return sendToBackup(req, res); // Bypass if draining
    }

    // Route to selected server
    proxyOptions.target = `http://${selectedServer.host}:${selectedServer.port}`;
    proxy(proxyOptions)(req, res);
  }
});

// Remove server from pool
function removeServer(serverId) {
  const index = servers.findIndex(s => s.id === serverId);
  if (index !== -1) {
    servers.splice(index, 1);
  }
  drained.splice(drained.indexOf(serverId), 1);
}

// Add server back to pool 
function addServer(server) {
  servers.push(server);
}

// Proxy options
const options = {
  onProxyReq: (proxyReq, req) => {
    // Log details like request timestamps, headers etc
    console.log(`Proxying request to ${req.url} at ${new Date()}`);
    console.log('Request Headers:', req.headers);
  },
  onProxyRes: (proxyRes) => {
    // Log response status, time taken, etc.
    console.log(`Received response with status ${proxyRes.statusCode} at ${new Date()}`);
  }
};

function sendToBackup(req, res) {
  // Choose a backup server (you can implement your own logic here)
  const backupServer = servers.find(server => !draining.includes(server.id));
  // If no backup server is available, return an error response
  if (!backupServer) {
    return res.status(500).send('No backup server available');
  }
  // Proxy the request to the backup server
  proxyOptions.target = `http://${backupServer.host}:${backupServer.port}`;
  proxy(proxyOptions)(req, res);
}

module.exports = router;
