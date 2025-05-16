const express = require('express');
const { WebSocketServer } = require('ws');
const cors = require('cors');

const app = express();
app.use(cors());

const PORT = 5000;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// WebSocket setup
const wss = new WebSocketServer({ server });

// Mock data storage
const agents = {
  ProfessorAgent: 'idle',
  RegistrarAgent: 'idle', 
  CounselorAgent: 'idle'
};

wss.on('connection', (ws) => {
  console.log('New client connected');
  
  // Send initial agent status
  ws.send(JSON.stringify({
    type: 'agent-status',
    data: agents
  }));

  // Handle messages
  ws.on('message', (message) => {
    console.log('Received:', message.toString());
  });
});

// Sample API endpoint
app.get('/api/agent-status', (req, res) => {
  res.json(agents);
});
