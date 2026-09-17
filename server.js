const express = require('express');
const path = require('path');
const cors = require('cors');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static assets from public/ directory
app.use(express.static(path.join(__dirname, 'public')));

// Magazine In-Memory Database
const magazineData = {
  title: 'വിരൽപ്പാട്',
  subtitle: 'കൈയൊപ്പുകളുടെ വിപ്ലവം',
  edition: '2025–26',
  college: 'ശ്രീ നാരായണ ഗുരു കോളേജ്, വടകര (SNG College Vadakara)',
  university: 'University of Calicut',
  description: 'ശ്രീ നാരായണ ഗുരു കോളേജ് വടകര കോളേജ് മാഗസിൻ & സാംസ്കാരിക വെബ് പോർട്ടൽ',
  editorialBoard: {
    chiefEditor: 'ശ്രീ നാരായണ ഗുരു കോളേജ് യൂണിയൻ',
    staffAdvisor: 'ഡോ. വിപിൻ ദാസ്',
    publishedDate: 'സെപ്റ്റംബർ 2026'
  }
};

let tracksData = [
  {
    id: 1,
    number: 'X',
    title: 'X. The Substance of the Shadow',
    duration: '35 min',
    category: 'Chapter',
    author: 'Editorial',
    plays: 142
  },
  {
    id: 2,
    number: 'X',
    title: 'X. The Substance of the Shadow',
    duration: '35 min',
    category: 'Chapter',
    author: 'Editorial',
    plays: 98
  },
  {
    id: 3,
    number: 'X',
    title: 'X. The Substance of the Shadow',
    duration: '35 min',
    category: 'Chapter',
    author: 'Editorial',
    plays: 74
  },
  {
    id: 4,
    number: 'X',
    title: 'X. The Substance of the Shadow',
    duration: '35 min',
    category: 'Chapter',
    author: 'Editorial',
    plays: 63
  },
  {
    id: 5,
    number: 'X',
    title: 'X. The Substance of the Shadow',
    duration: '35 min',
    category: 'Chapter',
    author: 'Editorial',
    plays: 51
  },
  {
    id: 6,
    number: 'X',
    title: 'X. The Substance of the Shadow',
    duration: '35 min',
    category: 'Chapter',
    author: 'Editorial',
    plays: 39
  }
];

// ==========================================
// REST API ROUTES
// ==========================================

// Get Magazine Information
app.get('/api/magazine', (req, res) => {
  res.json({
    success: true,
    data: magazineData
  });
});

// Get Tracks List
app.get('/api/tracks', (req, res) => {
  res.json({
    success: true,
    count: tracksData.length,
    data: tracksData
  });
});

// Get Single Track (with cover_url for player page)
app.get('/api/tracks/:id', (req, res) => {
  const trackId = parseInt(req.params.id, 10);
  const track   = tracksData.find(t => t.id === trackId);
  if (!track) return res.status(404).json({ success: false, error: 'Track not found' });

  // cover_url: swap this for your Supabase Storage public URL when ready
  // e.g. cover_url: `https://<project>.supabase.co/storage/v1/object/public/covers/track_${trackId}.jpg`
  return res.json({
    success: true,
    data: {
      ...track,
      cover_url: null   // null → player falls back to artwork_default.jpg
    }
  });
});

// Log Track Play
app.post('/api/tracks/:id/play', (req, res) => {
  const trackId = parseInt(req.params.id, 10);
  const track = tracksData.find(t => t.id === trackId);
  if (track) {
    track.plays = (track.plays || 0) + 1;
    return res.json({
      success: true,
      message: `Track ${trackId} play logged`,
      plays: track.plays
    });
  }
  res.status(404).json({ success: false, error: 'Track not found' });
});

// Admin Authentication API
app.post('/api/admin/login', (req, res) => {
  const { email, passkey } = req.body;
  if (!email || !passkey) {
    return res.status(400).json({ success: false, message: 'Email and passkey are required' });
  }
  if (email.trim().toLowerCase() === 'sncollege@gmail.com' && passkey === 'sn_college2026') {
    return res.json({ success: true, message: 'Authenticated successfully' });
  }
  return res.status(401).json({ success: false, message: 'Invalid email or passkey' });
});

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// ==========================================
// HTML PAGE ROUTES
// ==========================================

// Root -> Splash Page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'splash.html'));
});

// Splash Route
app.get('/splash', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'splash.html'));
});

// Home Page Route
app.get('/home', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'home.html'));
});

// Player Page Route
app.get('/player', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'player.html'));
});

// Admin Authentication Page
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Admin Dashboard Page
app.get('/admin-dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-dashboard.html'));
});

app.get('/admin/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-dashboard.html'));
});

// Create New Track API
app.post('/api/tracks', (req, res) => {
  const { title, author, duration } = req.body;
  const newTrack = {
    id: tracksData.length + 1,
    number: 'X',
    title: title || 'New Chapter',
    duration: duration || '30 min',
    category: 'Chapter',
    author: author || 'Editorial',
    plays: 0
  };
  tracksData.push(newTrack);
  res.json({ success: true, track: newTrack });
});

// Single Page Application (SPA) Alternate Route
app.get('/spa', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server (Supports both localhost and 127.0.0.1)
const server = app.listen(PORT, () => {
  console.log(`=================================================`);
  console.log(`🚀 Viral Paadu Web App Server is running!`);
  console.log(`🔗 Splash Screen: http://localhost:${PORT}/`);
  console.log(`🔗 Home Page:     http://localhost:${PORT}/home`);
  console.log(`📡 REST API:      http://localhost:${PORT}/api/tracks`);
  console.log(`=================================================`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`⚠️ Port ${PORT} is already in use by another process.`);
  } else {
    console.error('Server error:', err);
  }
});
