# MERN Stack Chat App

A real-time chat application built with MongoDB, Express, React, Node.js, and Socket.io.

## Features

- Real-time messaging with Socket.io
- Messages saved to MongoDB
- User join/leave notifications
- Clean, modern UI

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or Atlas)

## Project Structure

```
chart app/
├── server/          # Backend
│   ├── models/
│   │   └── Message.js
│   ├── server.js
│   ├── package.json
│   └── .env
└── client/          # Frontend
    ├── public/
    │   └── index.html
    ├── src/
    │   ├── App.js
    │   ├── index.js
    │   └── index.css
    └── package.json
```

## Setup & Run

### 1. Start MongoDB
Make sure MongoDB is running locally on port 27017, or update the `.env` file with your MongoDB connection string.

### 2. Start the Backend
```bash
cd server
npm install
npm run dev
```

### 3. Start the Frontend
```bash
cd client
npm install
npm start
```

### 4. Open the App
Navigate to `http://localhost:3000` in your browser.

## Environment Variables

Edit `server/.env`:
- `PORT` - Server port (default: 5000)
- `MONGODB_URI` - MongoDB connection string

## Technologies Used

- **Frontend**: React, Socket.io-client
- **Backend**: Node.js, Express, Socket.io
- **Database**: MongoDB with Mongoose
