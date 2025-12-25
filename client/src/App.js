import React, { useState, useEffect, useRef, useCallback } from 'react';
import io from 'socket.io-client';

const SOCKET_SERVER = 'http://localhost:5000';

function App() {
  const [socket, setSocket] = useState(null);
  const [username, setUsername] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [connections, setConnections] = useState([]);
  const [toasts, setToasts] = useState([]);
  const messagesEndRef = useRef(null);

  // Toast notification
  const showToast = useCallback((title, body) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, title, body }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  // Connect socket
  useEffect(() => {
    const newSocket = io(SOCKET_SERVER);
    setSocket(newSocket);
    return () => newSocket.close();
  }, []);

  // Socket listeners
  useEffect(() => {
    if (!socket) return;

    socket.on('onlineUsers', (users) => {
      // Filter to only show connections who are online
      setOnlineUsers(users.filter(u => u !== username && connections.includes(u)));
    });

    socket.on('newMessage', (msg) => {
      // Only add if it's for current conversation
      if (
        (msg.sender === username && msg.receiver === selectedUser) ||
        (msg.sender === selectedUser && msg.receiver === username)
      ) {
        setMessages(prev => {
          // Avoid duplicates
          if (prev.find(m => m._id === msg._id)) return prev;
          return [...prev, msg];
        });
      }
      
      // Show notification if message is from someone else
      if (msg.sender !== username && connections.includes(msg.sender)) {
        showToast(`Message from ${msg.sender}`, msg.text);
      }
    });

    return () => {
      socket.off('onlineUsers');
      socket.off('newMessage');
    };
  }, [socket, username, selectedUser, showToast, connections]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load conversation when selecting a user
  useEffect(() => {
    if (!selectedUser || !username) return;
    
    fetch(`${SOCKET_SERVER}/api/messages/${username}/${selectedUser}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setMessages(data);
        } else {
          setMessages([]);
        }
      })
      .catch(err => {
        console.error('Error:', err);
        setMessages([]);
      });
  }, [selectedUser, username]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username.trim()) return;
    
    try {
      const res = await fetch(`${SOCKET_SERVER}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim() })
      });
      
      const data = await res.json();
      
      if (data.success) {
        setUsername(data.username);
        setConnections(Array.isArray(data.connections) ? data.connections : []);
        socket.emit('join', data.username);
        setIsLoggedIn(true);
        setLoginError('');
      } else {
        setLoginError('User not found! Try: satya, ramu, raju, or karan');
      }
    } catch (err) {
      setLoginError('Connection error. Is the server running?');
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (message.trim() && socket && selectedUser) {
      socket.emit('privateMessage', {
        sender: username,
        receiver: selectedUser,
        text: message
      });
      setMessage('');
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', minute: '2-digit' 
    });
  };

  if (!isLoggedIn) {
    return (
      <div className="app-container">
        <div className="login-container">
          <h1>💬 Private Chat</h1>
          <p className="login-hint">Available users: satya, ramu, raju, karan</p>
          <form onSubmit={handleLogin}>
            <input
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={20}
            />
            <button type="submit">Join</button>
          </form>
          {loginError && <p className="login-error">{loginError}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Toast notifications */}
      <div className="toast-container">
        {toasts.map(toast => (
          <div key={toast.id} className="toast">
            <div className="toast-title">{toast.title}</div>
            <div className="toast-body">{toast.body}</div>
          </div>
        ))}
      </div>

      <div className="chat-layout">
        {/* Sidebar - User List */}
        <div className="sidebar">
          <div className="sidebar-header">
            <h3>👤 {username}</h3>
          </div>
          <div className="user-list">
            <p className="section-label">My Connections</p>
            {connections.length === 0 ? (
              <p className="no-users">No connections</p>
            ) : (
              connections.map(user => (
                <div
                  key={user}
                  className={`user-item ${selectedUser === user ? 'selected' : ''}`}
                  onClick={() => setSelectedUser(user)}
                >
                  <span className={`status-dot ${onlineUsers.includes(user) ? 'online' : 'offline'}`}></span>
                  {user}
                  {onlineUsers.includes(user) && <span className="online-badge">online</span>}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="chat-area">
          {selectedUser ? (
            <>
              <div className="chat-header">
                <h3>💬 Chat with {selectedUser}</h3>
                <span className={onlineUsers.includes(selectedUser) ? 'online-text' : 'offline-text'}>
                  {onlineUsers.includes(selectedUser) ? '● Online' : '○ Offline'}
                </span>
              </div>

              <div className="messages-container">
                {messages.length === 0 ? (
                  <p className="no-messages">No messages yet. Say hi! 👋</p>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg._id}
                      className={`message ${msg.sender === username ? 'own' : 'other'}`}
                    >
                      <div className="message-content">{msg.text}</div>
                      <span className="message-time">{formatTime(msg.timestamp)}</span>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              <form className="message-input-container" onSubmit={handleSendMessage}>
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
                <button type="submit">Send</button>
              </form>
            </>
          ) : (
            <div className="no-chat-selected">
              <h2>👈 Select a user to start chatting</h2>
              <p>Or wait for someone to come online!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
