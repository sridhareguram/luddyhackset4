const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Create HTTP server
const PORT = 5000;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Store connected dashboard clients
const dashboardClients = new Set();

wss.on('connection', (ws) => {
  dashboardClients.add(ws);
  console.log('Dashboard client connected');
  
  ws.on('close', () => {
    dashboardClients.delete(ws);
    console.log('Dashboard client disconnected');
  });
});

// Broadcast to all dashboard clients
function broadcastToDashboard(data) {
  const message = JSON.stringify(data);
  dashboardClients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// Initialize agents
const agents = require('./agents');
agents.initialize(broadcastToDashboard);

// API routes
app.post('/api/student-action', (req, res) => {
  const { action, data } = req.body;
  agents.handleStudentAction(action, data);
  res.status(200).json({ status: 'Action received' });
});

app.get('/api/agent-status', (req, res) => {
  res.status(200).json(agents.getAgentStatuses());
});
