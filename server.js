require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const morgan = require('morgan');
const { supabase, isConfigured } = require('./supabase');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static assets from public/ directory
app.use(express.static(path.join(__dirname, 'public')));

// Magazine In-Memory Database / Metadata
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
    number: 'I',
    title: 'I. The Substance of the Shadow',
    duration: '35 min',
    category: 'Chapter',
    author: 'Editorial',
    plays: 142
  },
  {
    id: 2,
    number: 'II',
    title: 'II. Ink on Borrowed Time',
    duration: '28 min',
    category: 'Poetry',
    author: 'Poetry',
    plays: 98
  },
  {
    id: 3,
    number: 'III',
    title: 'III. Roots & Reverie',
    duration: '42 min',
    category: 'Fiction',
    author: 'Fiction',
    plays: 74
  },
  {
    id: 4,
    number: 'IV',
    title: 'IV. Letters Never Sent',
    duration: '19 min',
    category: 'Essay',
    author: 'Essay',
    plays: 63
  },
  {
    id: 5,
    number: 'V',
    title: 'V. The Weight of Wings',
    duration: '31 min',
    category: 'Short Story',
    author: 'Short Story',
    plays: 51
  },
  {
    id: 6,
    number: 'VI',
    title: 'VI. Monsoon Cartography',
    duration: '24 min',
    category: 'Verse',
    author: 'Verse',
    plays: 39
  }
];

// ==========================================
// REST API ROUTES
// ==========================================

// Supabase Connection Status
app.get('/api/db-status', async (req, res) => {
  if (!isConfigured()) {
    return res.json({
      connected: false,
      mode: 'in-memory-fallback',
      message: 'Supabase credentials not configured in .env. Using in-memory fallback.'
    });
  }

  try {
    const { data, error } = await supabase.from('tracks').select('count', { count: 'exact', head: true });
    if (error) {
      return res.json({
        connected: false,
        mode: 'supabase-error',
        error: error.message
      });
    }
    return res.json({
      connected: true,
      mode: 'supabase-connected',
      message: 'Supabase database connected successfully!'
    });
  } catch (err) {
    return res.status(500).json({
      connected: false,
      mode: 'supabase-error',
      error: err.message
    });
  }
});

// Get Magazine Information
app.get('/api/magazine', (req, res) => {
  res.json({
    success: true,
    data: magazineData
  });
});

// Get Tracks List (Supabase or In-Memory)
app.get('/api/tracks', async (req, res) => {
  if (isConfigured()) {
    try {
      const { data, error } = await supabase
        .from('tracks')
        .select('*')
        .order('id', { ascending: true });

      if (error) {
        console.error('Supabase query error:', error.message);
        return res.json({
          success: true,
          count: tracksData.length,
          data: tracksData,
          source: 'in-memory-fallback'
        });
      }

      return res.json({
        success: true,
        count: data ? data.length : 0,
        data: data || [],
        source: 'supabase'
      });
    } catch (err) {
      console.error('Error fetching from Supabase:', err.message);
    }
  }

  // Fallback
  res.json({
    success: true,
    count: tracksData.length,
    data: tracksData,
    source: 'in-memory'
  });
});

// Get Single Track
app.get('/api/tracks/:id', async (req, res) => {
  const trackId = parseInt(req.params.id, 10);

  if (isConfigured()) {
    try {
      const { data, error } = await supabase
        .from('tracks')
        .select('*')
        .eq('id', trackId)
        .single();

      if (!error && data) {
        return res.json({
          success: true,
          data: {
            ...data,
            cover_url: data.cover_url || null
          },
          source: 'supabase'
        });
      }
    } catch (err) {
      console.error('Error fetching track from Supabase:', err.message);
    }
  }

  // Fallback
  const track = tracksData.find(t => t.id === trackId);
  if (!track) return res.status(404).json({ success: false, error: 'Track not found' });

  return res.json({
    success: true,
    data: {
      ...track,
      cover_url: null
    },
    source: 'in-memory'
  });
});

// Create New Track / Article (Supabase or In-Memory)
app.post('/api/tracks', async (req, res) => {
  const { title, author, duration, category, cover_url, audio_url, content } = req.body;

  if (!title) {
    return res.status(400).json({ success: false, error: 'Title is required' });
  }

  const trackPayload = {
    number: 'X',
    title: title.trim(),
    duration: duration || '30 min',
    category: category || 'Chapter',
    author: author ? author.trim() : 'Editorial',
    plays: 0,
    cover_url: cover_url || null,
    audio_url: audio_url || null,
    content: content || null
  };

  if (isConfigured()) {
    try {
      const { data, error } = await supabase
        .from('tracks')
        .insert([trackPayload])
        .select()
        .single();

      if (error) {
        console.error('Supabase insert error:', error.message);
      } else if (data) {
        return res.json({
          success: true,
          track: data,
          source: 'supabase'
        });
      }
    } catch (err) {
      console.error('Error inserting into Supabase:', err.message);
    }
  }

  // Fallback
  const newTrack = {
    id: tracksData.length + 1,
    ...trackPayload
  };
  tracksData.push(newTrack);
  res.json({ success: true, track: newTrack, source: 'in-memory' });
});

// Log Track Play
app.post('/api/tracks/:id/play', async (req, res) => {
  const trackId = parseInt(req.params.id, 10);

  if (isConfigured()) {
    try {
      // Fetch current plays and increment
      const { data: current } = await supabase
        .from('tracks')
        .select('plays')
        .eq('id', trackId)
        .single();

      const newPlays = ((current && current.plays) || 0) + 1;

      const { data, error } = await supabase
        .from('tracks')
        .update({ plays: newPlays })
        .eq('id', trackId)
        .select()
        .single();

      if (!error && data) {
        return res.json({
          success: true,
          message: `Track ${trackId} play logged in Supabase`,
          plays: data.plays,
          source: 'supabase'
        });
      }
    } catch (err) {
      console.error('Error updating plays in Supabase:', err.message);
    }
  }

  // Fallback
  const track = tracksData.find(t => t.id === trackId);
  if (track) {
    track.plays = (track.plays || 0) + 1;
    return res.json({
      success: true,
      message: `Track ${trackId} play logged locally`,
      plays: track.plays,
      source: 'in-memory'
    });
  }
  res.status(404).json({ success: false, error: 'Track not found' });
});

// Delete Track / Article (Supabase or In-Memory)
app.delete('/api/tracks/:id', async (req, res) => {
  const trackId = parseInt(req.params.id, 10);

  if (isConfigured()) {
    try {
      const { error } = await supabase
        .from('tracks')
        .delete()
        .eq('id', trackId);

      if (!error) {
        return res.json({ success: true, message: `Track ${trackId} deleted from Supabase` });
      }
    } catch (err) {
      console.error('Error deleting track from Supabase:', err.message);
    }
  }

  // Fallback
  const idx = tracksData.findIndex(t => t.id === trackId);
  if (idx !== -1) {
    tracksData.splice(idx, 1);
    return res.json({ success: true, message: `Track ${trackId} deleted successfully` });
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
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    database: isConfigured() ? 'Supabase Configured' : 'In-Memory Fallback'
  });
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

// New Article / Story Page
app.get('/new-article', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'new-article.html'));
});

app.get('/add-article', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'new-article.html'));
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
  console.log(`🗄️ Database:      ${isConfigured() ? 'Supabase Connected 🟢' : 'In-Memory Fallback 🟡 (Add .env to connect Supabase)'}`);
  console.log(`=================================================`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`⚠️ Port ${PORT} is already in use by another process.`);
  } else {
    console.error('Server error:', err);
  }
});
