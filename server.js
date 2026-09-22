require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const apiRoutes = require('./server/routes/api');
const seed = require('./server/seed');
const db = require('./server/config/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Security & Headers
app.use(helmet({
  contentSecurityPolicy: false, // Allow fonts, CDN scripts, images
  crossOriginEmbedderPolicy: false
}));

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Requested-With']
}));

// Body Parsing
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Static Assets
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Mount API
app.use('/api/v1', apiRoutes);

// Health check endpoints
app.get(['/health', '/api/health'], (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Certificate Generation and Verification System',
    version: '2.0.0'
  });
});

// Verification redirect / direct view route: /verify/:identifier
app.get('/verify/:identifier', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// Embed view route: /embed/verify
app.get('/embed/verify', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// Catch-all SPA fallback
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// Auto-seed if empty
try {
  const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  if (userCount === 0) {
    seed();
  }
} catch (e) {
  console.warn('Initial seed check error:', e.message);
}

// Start Server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`Certificate Generation & Verification System running!`);
    console.log(`URL: http://localhost:${PORT}`);
    console.log(`Public Verification: http://localhost:${PORT}/verify/CLUB-2024-LEAD-00001`);
    console.log(`Official Club URL: ${process.env.OFFICIAL_CLUB_WEBSITE_URL || 'https://rcpimrd.ac.in'}`);
    console.log(`=======================================================`);
  });
}

module.exports = app;
