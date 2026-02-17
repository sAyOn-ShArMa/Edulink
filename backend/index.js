const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
const server = http.createServer(app);

const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

const io = new Server(server, {
  cors: { origin: clientUrl, methods: ['GET', 'POST'] },
});

app.use(cors());
app.use(express.json());

async function start() {
  // Initialize database (async for sql.js)
  const db = require('./config/db');
  await db.init();
  console.log('Database initialized');

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', dbReady: db.ready });
  });

  // REST routes
  app.use('/api/auth', require('./routes/auth.routes'));
  app.use('/api/classes', require('./routes/class.routes'));
  app.use('/api/pdf', require('./routes/pdf.routes'));
  app.use('/api/flashcards', require('./routes/flashcard.routes'));
  app.use('/api/portfolio', require('./routes/portfolio.routes'));
  app.use('/api/gradesheet', require('./routes/gradesheet.routes'));
  app.use('/api/operator', require('./routes/operator.routes'));
  app.use('/api/dm', require('./routes/dm.routes'));
  app.use('/api/gamification', require('./routes/gamification.routes'));
  app.use('/api/quiz', require('./routes/quiz.routes'));

  // Socket.IO handlers
  require('./services/socket.service')(io);

  // Serve frontend in production
  const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
  console.log('Serving frontend from:', frontendDist);
  app.use(express.static(frontendDist));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/socket.io')) {
      res.sendFile(path.join(frontendDist, 'index.html'));
    }
  });

  const PORT = process.env.PORT || 3001;
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Edulink server running on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
