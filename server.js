require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const morgan = require('morgan');
const multer = require('multer');
const { supabase, isConfigured, uploadToStorage, deleteFromStorage } = require('./supabase');

const app = express();
const PORT = process.env.PORT || 3000;

// Setup Memory Storage for Multer file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB max file size for audio/images
  }
});

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static assets from public/ directory
app.use(express.static(path.join(__dirname, 'public')));

// In-Memory Database Fallback (Empty by default - Only real data from Supabase/Admin)
let songsFallback = [];
let articlesFallback = [];

// ==========================================
// 1. AUTHENTICATION API (Supabase Auth)
// ==========================================

app.post('/api/admin/login', async (req, res) => {
  const { email, passkey, password } = req.body;
  const userPassword = password || passkey;

  if (!email || !userPassword) {
    return res.status(400).json({ success: false, message: 'Email and passkey are required' });
  }

  // 1. Try Supabase Auth first if configured
  if (isConfigured()) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: userPassword
      });

      if (!error && data && data.user) {
        return res.json({
          success: true,
          message: 'Authenticated with Supabase Auth successfully',
          session: data.session,
          user: data.user
        });
      }
    } catch (err) {
      console.warn('Supabase auth attempt note:', err.message);
    }
  }

  // 2. Admin standard credentials check
  if (email.trim().toLowerCase() === 'sncollege@gmail.com' && (userPassword === 'sn_college2026' || userPassword === 'admin123')) {
    return res.json({
      success: true,
      message: 'Authenticated successfully',
      token: 'admin-auth-session-valid'
    });
  }

  return res.status(401).json({ success: false, message: 'Invalid email or passkey' });
});

// ==========================================
// 2. SONGS / MUSIC API
// ==========================================

// Get All Published Songs (Ordered by display_order)
app.get(['/api/songs', '/api/tracks'], async (req, res) => {
  const isAdmin = req.query.admin === 'true';

  if (isConfigured()) {
    try {
      let query = supabase
        .from('songs')
        .select('*')
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: true });

      if (!isAdmin) {
        query = query.eq('published', true);
      }

      const { data, error } = await query;

      if (!error && data) {
        // Map song properties for universal compatibility
        const formatted = data.map(s => ({
          ...s,
          author: s.artist,
          cover_url: s.cover_image,
          audio_url: s.audio_file
        }));

        return res.json({
          success: true,
          count: formatted.length,
          data: formatted,
          source: 'supabase'
        });
      } else if (error) {
        console.warn('Songs table fetch note:', error.message);
      }
    } catch (err) {
      console.error('Error fetching songs from Supabase:', err.message);
    }
  }

  // Fallback
  const list = isAdmin ? songsFallback : songsFallback.filter(s => s.published);
  const formatted = list.map(s => ({
    ...s,
    author: s.artist,
    cover_url: s.cover_image,
    audio_url: s.audio_file
  }));

  res.json({
    success: true,
    count: formatted.length,
    data: formatted,
    source: 'in-memory'
  });
});

// Get Single Song / Track
app.get(['/api/songs/:id', '/api/tracks/:id'], async (req, res) => {
  const songId = parseInt(req.params.id, 10);

  if (isConfigured()) {
    try {
      const { data, error } = await supabase
        .from('songs')
        .select('*')
        .eq('id', songId)
        .single();

      if (!error && data) {
        return res.json({
          success: true,
          data: {
            ...data,
            author: data.artist,
            cover_url: data.cover_image,
            audio_url: data.audio_file
          },
          source: 'supabase'
        });
      }
    } catch (err) {
      console.error('Error fetching single song from Supabase:', err.message);
    }
  }

  // Fallback
  const song = songsFallback.find(s => s.id === songId);
  if (!song) return res.status(404).json({ success: false, error: 'Song not found' });

  return res.json({
    success: true,
    data: {
      ...song,
      author: song.artist,
      cover_url: song.cover_image,
      audio_url: song.audio_file
    },
    source: 'in-memory'
  });
});

// Add New Song (with optional Cover Image and Audio file upload to Supabase Storage)
app.post(['/api/songs', '/api/tracks'], upload.fields([
  { name: 'cover_image', maxCount: 1 },
  { name: 'cover', maxCount: 1 },
  { name: 'audio_file', maxCount: 1 },
  { name: 'audio', maxCount: 1 }
]), async (req, res) => {
  try {
    const { title, artist, author, duration, published } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, error: 'Song title is required' });
    }

    const songTitle = title.trim();
    const songArtist = (artist || author || 'Editorial').trim();
    const songDuration = duration || '30 min';
    const isPublished = published !== undefined ? (published === 'true' || published === true) : true;

    let coverUrl = null;
    let audioUrl = null;

    // 1. Upload Cover Image to Supabase Storage
    const coverFile = (req.files && (req.files['cover_image'] || req.files['cover']))?.[0];
    if (coverFile) {
      coverUrl = await uploadToStorage('song-covers', coverFile.buffer, coverFile.originalname, coverFile.mimetype);
    }

    // 2. Upload Audio File to Supabase Storage
    const audioFile = (req.files && (req.files['audio_file'] || req.files['audio']))?.[0];
    if (audioFile) {
      audioUrl = await uploadToStorage('song-audio', audioFile.buffer, audioFile.originalname, audioFile.mimetype);
    }

    // Calculate display order
    let nextOrder = 1;
    if (isConfigured()) {
      try {
        const { data: maxOrderData } = await supabase
          .from('songs')
          .select('display_order')
          .order('display_order', { ascending: false })
          .limit(1);

        if (maxOrderData && maxOrderData.length > 0 && maxOrderData[0].display_order) {
          nextOrder = maxOrderData[0].display_order + 1;
        }

        const songPayload = {
          title: songTitle,
          artist: songArtist,
          duration: songDuration,
          cover_image: coverUrl,
          audio_file: audioUrl,
          display_order: nextOrder,
          published: isPublished,
          plays: 0
        };

        const { data, error } = await supabase
          .from('songs')
          .insert([songPayload])
          .select()
          .single();

        if (!error && data) {
          return res.json({
            success: true,
            song: {
              ...data,
              author: data.artist,
              cover_url: data.cover_image,
              audio_url: data.audio_file
            },
            source: 'supabase'
          });
        }
      } catch (err) {
        console.error('Error adding song to Supabase:', err.message);
      }
    }

    // Fallback
    nextOrder = songsFallback.length > 0 ? Math.max(...songsFallback.map(s => s.display_order || 0)) + 1 : 1;
    const newSong = {
      id: songsFallback.length + 1,
      title: songTitle,
      artist: songArtist,
      author: songArtist,
      duration: songDuration,
      cover_image: coverUrl,
      cover_url: coverUrl,
      audio_file: audioUrl,
      audio_url: audioUrl,
      display_order: nextOrder,
      published: isPublished,
      plays: 0
    };
    songsFallback.push(newSong);

    return res.json({
      success: true,
      song: newSong,
      track: newSong,
      source: 'in-memory'
    });
  } catch (err) {
    console.error('Add song error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update Playlist / Display Order in Supabase
app.put(['/api/songs/reorder', '/api/tracks/reorder'], async (req, res) => {
  const { order, items } = req.body;
  const orderList = order || items;

  if (!Array.isArray(orderList)) {
    return res.status(400).json({ success: false, error: 'Order list must be an array of IDs or items' });
  }

  if (isConfigured()) {
    try {
      for (let i = 0; i < orderList.length; i++) {
        const item = orderList[i];
        const id = typeof item === 'object' ? item.id : item;
        const newOrder = typeof item === 'object' && item.display_order ? item.display_order : (i + 1);

        await supabase
          .from('songs')
          .update({ display_order: newOrder, updated_at: new Date() })
          .eq('id', id);
      }

      return res.json({ success: true, message: 'Playlist order updated successfully in Supabase' });
    } catch (err) {
      console.error('Error reordering songs in Supabase:', err.message);
    }
  }

  // Fallback
  orderList.forEach((item, i) => {
    const id = typeof item === 'object' ? item.id : item;
    const found = songsFallback.find(s => s.id === id);
    if (found) found.display_order = i + 1;
  });
  songsFallback.sort((a, b) => a.display_order - b.display_order);

  res.json({ success: true, message: 'Playlist order updated locally' });
});

// Delete Song / Track (and cleans up storage files)
app.delete(['/api/songs/:id', '/api/tracks/:id'], async (req, res) => {
  const songId = parseInt(req.params.id, 10);

  if (isConfigured()) {
    try {
      // 1. Fetch file URLs to remove from storage
      const { data: song } = await supabase
        .from('songs')
        .select('cover_image, audio_file')
        .eq('id', songId)
        .single();

      if (song) {
        if (song.cover_image) await deleteFromStorage('song-covers', song.cover_image);
        if (song.audio_file) await deleteFromStorage('song-audio', song.audio_file);
      }

      // 2. Delete database record
      const { error } = await supabase
        .from('songs')
        .delete()
        .eq('id', songId);

      if (!error) {
        return res.json({ success: true, message: `Song ${songId} deleted successfully` });
      }
    } catch (err) {
      console.error('Error deleting song from Supabase:', err.message);
    }
  }

  // Fallback
  const idx = songsFallback.findIndex(s => s.id === songId);
  if (idx !== -1) {
    songsFallback.splice(idx, 1);
    return res.json({ success: true, message: `Song ${songId} deleted successfully` });
  }

  res.status(404).json({ success: false, error: 'Song not found' });
});

// Update Song (Publish / Edit Metadata)
app.put(['/api/songs/:id', '/api/tracks/:id'], async (req, res) => {
  const songId = parseInt(req.params.id, 10);
  const { title, artist, duration, published } = req.body;

  const updateData = {};
  if (title !== undefined) updateData.title = title.trim();
  if (artist !== undefined) updateData.artist = artist.trim();
  if (duration !== undefined) updateData.duration = duration;
  if (published !== undefined) updateData.published = published;
  updateData.updated_at = new Date();

  if (isConfigured()) {
    try {
      const { data, error } = await supabase
        .from('songs')
        .update(updateData)
        .eq('id', songId)
        .select()
        .single();

      if (!error && data) {
        return res.json({ success: true, song: data });
      }
    } catch (err) {
      console.error('Error updating song in Supabase:', err.message);
    }
  }

  // Fallback
  const song = songsFallback.find(s => s.id === songId);
  if (song) {
    Object.assign(song, updateData);
    return res.json({ success: true, song });
  }

  res.status(404).json({ success: false, error: 'Song not found' });
});

// Log Song Play Count
app.post(['/api/songs/:id/play', '/api/tracks/:id/play'], async (req, res) => {
  const songId = parseInt(req.params.id, 10);

  if (isConfigured()) {
    try {
      const { data: current } = await supabase
        .from('songs')
        .select('plays')
        .eq('id', songId)
        .single();

      const newPlays = ((current && current.plays) || 0) + 1;

      const { data } = await supabase
        .from('songs')
        .update({ plays: newPlays })
        .eq('id', songId)
        .select()
        .single();

      if (data) {
        return res.json({ success: true, plays: data.plays });
      }
    } catch (_) {}
  }

  const song = songsFallback.find(s => s.id === songId);
  if (song) {
    song.plays = (song.plays || 0) + 1;
    return res.json({ success: true, plays: song.plays });
  }

  res.status(404).json({ success: false, error: 'Song not found' });
});

// ==========================================
// 3. ARTICLES / STORIES API
// ==========================================

// Get Published Articles
app.get('/api/articles', async (req, res) => {
  const isAdmin = req.query.admin === 'true';

  if (isConfigured()) {
    try {
      let query = supabase
        .from('articles')
        .select('*')
        .order('created_at', { ascending: false });

      if (!isAdmin) {
        query = query.eq('published', true);
      }

      const { data, error } = await query;
      if (!error && data) {
        return res.json({ success: true, count: data.length, data });
      }
    } catch (err) {
      console.error('Error fetching articles from Supabase:', err.message);
    }
  }

  const list = isAdmin ? articlesFallback : articlesFallback.filter(a => a.published);
  res.json({ success: true, count: list.length, data: list });
});

// Add New Article
app.post('/api/articles', upload.single('cover_image'), async (req, res) => {
  try {
    const { title, author_name, author, content, published } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, error: 'Article title is required' });
    }

    const authorName = (author_name || author || 'Editorial').trim();
    let coverUrl = null;

    if (req.file) {
      coverUrl = await uploadToStorage('article-covers', req.file.buffer, req.file.originalname, req.file.mimetype);
    }

    const articlePayload = {
      title: title.trim(),
      author_name: authorName,
      content: content || null,
      cover_image: coverUrl,
      published: published !== undefined ? (published === 'true' || published === true) : true
    };

    if (isConfigured()) {
      try {
        const { data, error } = await supabase
          .from('articles')
          .insert([articlePayload])
          .select()
          .single();

        if (!error && data) {
          return res.json({ success: true, article: data, source: 'supabase' });
        }
      } catch (err) {
        console.error('Error inserting article into Supabase:', err.message);
      }
    }

    const newArticle = {
      id: articlesFallback.length + 1,
      ...articlePayload,
      created_at: new Date()
    };
    articlesFallback.push(newArticle);

    res.json({ success: true, article: newArticle, source: 'in-memory' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete Article
app.delete('/api/articles/:id', async (req, res) => {
  const articleId = parseInt(req.params.id, 10);

  if (isConfigured()) {
    try {
      const { data: art } = await supabase
        .from('articles')
        .select('cover_image')
        .eq('id', articleId)
        .single();

      if (art && art.cover_image) {
        await deleteFromStorage('article-covers', art.cover_image);
      }

      const { error } = await supabase
        .from('articles')
        .delete()
        .eq('id', articleId);

      if (!error) {
        return res.json({ success: true, message: 'Article deleted successfully' });
      }
    } catch (err) {
      console.error('Error deleting article from Supabase:', err.message);
    }
  }

  const idx = articlesFallback.findIndex(a => a.id === articleId);
  if (idx !== -1) {
    articlesFallback.splice(idx, 1);
    return res.json({ success: true, message: 'Article deleted successfully' });
  }

  res.status(404).json({ success: false, error: 'Article not found' });
});

// ==========================================
// 4. HEALTH & SYSTEM API
// ==========================================

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    database: isConfigured() ? 'Supabase Configured 🟢' : 'In-Memory Fallback 🟡'
  });
});

app.get('/api/db-status', async (req, res) => {
  if (!isConfigured()) {
    return res.json({
      connected: false,
      mode: 'in-memory-fallback',
      message: 'Supabase credentials not configured in .env. Running locally.'
    });
  }

  try {
    const { data, error } = await supabase.from('songs').select('count', { count: 'exact', head: true });
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
      message: 'Supabase database & storage connected successfully!'
    });
  } catch (err) {
    return res.status(500).json({
      connected: false,
      mode: 'supabase-error',
      error: err.message
    });
  }
});

// ==========================================
// 5. HTML PAGE ROUTING
// ==========================================

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'splash.html')));
app.get('/splash', (req, res) => res.sendFile(path.join(__dirname, 'public', 'splash.html')));
app.get('/home', (req, res) => res.sendFile(path.join(__dirname, 'public', 'home.html')));
app.get('/player', (req, res) => res.sendFile(path.join(__dirname, 'public', 'player.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/admin-dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin-dashboard.html')));
app.get('/admin/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin-dashboard.html')));
app.get('/new-article', (req, res) => res.sendFile(path.join(__dirname, 'public', 'new-article.html')));
app.get('/add-article', (req, res) => res.sendFile(path.join(__dirname, 'public', 'new-article.html')));
app.get('/manage-playlist', (req, res) => res.sendFile(path.join(__dirname, 'public', 'manage-playlist.html')));
app.get('/playlist', (req, res) => res.sendFile(path.join(__dirname, 'public', 'manage-playlist.html')));
app.get('/spa', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// Start Server
const server = app.listen(PORT, () => {
  console.log(`=================================================`);
  console.log(`🚀 Viral Paad Server is active!`);
  console.log(`🔗 Splash Screen:     http://localhost:${PORT}/`);
  console.log(`🔗 Public Dashboard:  http://localhost:${PORT}/home`);
  console.log(`🔗 Admin Login:       http://localhost:${PORT}/admin`);
  console.log(`🔗 Admin Dashboard:   http://localhost:${PORT}/admin-dashboard`);
  console.log(`📡 Songs API:         http://localhost:${PORT}/api/songs`);
  console.log(`🗄️ Database:          ${isConfigured() ? 'Supabase Connected 🟢' : 'In-Memory Fallback 🟡'}`);
  console.log(`=================================================`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`⚠️ Port ${PORT} is in use.`);
  } else {
    console.error('Server error:', err);
  }
});
