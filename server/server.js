const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const Message = require('./models/Message');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// ========== USER DATA ==========
// Predefined users and their connections (friends list)
const users = {
  satya: { password: '1234', connections: ['ramu', 'raju', 'karan'] },
  ramu: { password: '1234', connections: ['satya', 'karan'] },
  raju: { password: '1234', connections: ['satya', 'karan'] },
  karan: { password: '1234', connections: ['satya', 'ramu', 'raju'] }
};

// Store online users: { username: socketId }
const onlineUsers = {};

// Get all users list
app.get('/api/users', (req, res) => {
  res.json(Object.keys(users));
});

// Login - verify user exists
app.post('/api/login', (req, res) => {
  const { username } = req.body;
  const lowerUsername = username.toLowerCase();
  
  if (users[lowerUsername]) {
    res.json({ 
      success: true, 
      username: lowerUsername,
      connections: users[lowerUsername].connections 
    });
  } else {
    res.status(401).json({ success: false, error: 'User not found' });
  }
});

// Get user's connections
app.get('/api/connections/:username', (req, res) => {
  const { username } = req.params;
  const lowerUsername = username.toLowerCase();
  
  if (users[lowerUsername]) {
    res.json(users[lowerUsername].connections);
  } else {
    res.status(404).json({ error: 'User not found' });
  }
});

// Get conversation between two users
app.get('/api/messages/:user1/:user2', async (req, res) => {
  try {
    const { user1, user2 } = req.params;
    const messages = await Message.find({
      $or: [
        { sender: user1, receiver: user2 },
        { sender: user2, receiver: user1 }
      ]
    }).sort({ timestamp: 1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Get list of users who have chatted with this user
app.get('/api/contacts/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const sent = await Message.distinct('receiver', { sender: username });
    const received = await Message.distinct('sender', { receiver: username });
    const contacts = [...new Set([...sent, ...received])];
    res.json(contacts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // User joins with username
  socket.on('join', (username) => {
    socket.username = username;
    onlineUsers[username] = socket.id;
    io.emit('onlineUsers', Object.keys(onlineUsers));
    console.log('Online users:', Object.keys(onlineUsers));
  });

  // Send private message
  socket.on('privateMessage', async (data) => {
    try {
      const { sender, receiver, text } = data;
      
      const message = new Message({ sender, receiver, text });
      await message.save();
      
      const msgData = {
        _id: message._id,
        sender: message.sender,
        receiver: message.receiver,
        text: message.text,
        timestamp: message.timestamp
      };
      
      // Send to receiver if online
      if (onlineUsers[receiver]) {
        io.to(onlineUsers[receiver]).emit('newMessage', msgData);
      }
      // Send back to sender
      socket.emit('newMessage', msgData);
      
    } catch (error) {
      console.error('Error saving message:', error);
    }
  });

  socket.on('disconnect', () => {
    if (socket.username) {
      delete onlineUsers[socket.username];
      io.emit('onlineUsers', Object.keys(onlineUsers));
    }
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
