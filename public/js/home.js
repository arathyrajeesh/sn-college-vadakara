/**
 * വിരൽപ്പാട് — HOME PAGE CONTROLLER
 * Dynamically fetches published songs from Supabase Database API (Ordered by display_order)
 * Clicking any song navigates to /player with the full song context.
 */

document.addEventListener('DOMContentLoaded', () => {

  // ── Desktop frame ──────────────────────────────────────────────────────────
  const appShell       = document.getElementById('appShell');
  const toggleFrameBtn = document.getElementById('toggleFrameBtn');
  const frameToggleText= document.getElementById('frameToggleText');
  let   isFrameActive  = true;

  if (window.innerWidth >= 641 && appShell) {
    appShell.classList.add('desktop-frame-active');
  }

  if (toggleFrameBtn) {
    toggleFrameBtn.addEventListener('click', () => {
      isFrameActive = !isFrameActive;
      appShell.classList.toggle('desktop-frame-active', isFrameActive);
      if (frameToggleText)
        frameToggleText.textContent = isFrameActive ? 'iPhone 17 Frame' : 'Fullscreen View';
    });
  }

  // ── Dynamic Track Loading from Database API ────────────────────────────────
  const tracksContainer = document.getElementById('tracksContainer') || document.querySelector('.tracks-list-section');
  let songs = [];

  // Restore previously active card
  let activeId = null;
  try {
    const saved = JSON.parse(sessionStorage.getItem('vp_track') || 'null');
    if (saved && saved.id) activeId = parseInt(saved.id, 10);
  } catch (_) {}

  async function fetchAndRenderSongs() {
    try {
      const res = await fetch('/api/songs');
      if (res.ok) {
        const json = await res.json();
        songs = json.data || [];
        sessionStorage.setItem('vp_playlist', JSON.stringify(songs));
        renderSongCards(songs);
        return;
      }
    } catch (err) {
      console.warn('API fetch fallback:', err);
    }
  }

  function renderSongCards(songList) {
    if (!tracksContainer) return;
    tracksContainer.innerHTML = '';

    // Guarantee deduplication by id and order by display_order
    const uniqueSongs = Array.from(new Map((songList || []).map(s => [s.id, s])).values());
    uniqueSongs.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

    if (uniqueSongs.length === 0) {
      tracksContainer.innerHTML = '<div style="text-align:center; padding:36px 12px; color:#6B6053; font-size:0.92rem; font-weight:500;">No published songs in database yet.<br><span style="font-size:0.8rem; opacity:0.8;">Admin can add songs from the Admin Dashboard.</span></div>';
      return;
    }

    uniqueSongs.forEach((song, idx) => {
      const card = document.createElement('article');
      card.className = 'track-card';
      card.dataset.trackId = song.id;
      if (activeId === song.id) card.classList.add('paused');

      card.innerHTML = `
        <div class="track-info">
          <h2 class="track-title">${escapeHtml(song.title)}</h2>
          <span class="track-duration">${escapeHtml(song.duration || '30 min')}</span>
        </div>
        <div class="track-card-right">
          <div class="playing-indicator" aria-hidden="true"><span></span><span></span><span></span></div>
          <button type="button" class="track-play-btn" aria-label="Play ${escapeHtml(song.title)}">
            <svg class="play-icon" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="7 4 19 12 7 20 7 4"></polygon>
            </svg>
            <svg class="pause-icon" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="5" width="3.5" height="14"></rect>
              <rect x="14.5" y="5" width="3.5" height="14"></rect>
            </svg>
          </button>
        </div>
      `;

      // Click handler to open /player
      function goToPlayer(e) {
        e.stopPropagation();
        document.querySelectorAll('.track-card').forEach(c => c.classList.remove('playing', 'paused'));
        card.classList.add('playing');

        sessionStorage.setItem('vp_track', JSON.stringify({
          id: song.id,
          title: song.title,
          artist: song.artist || song.author || 'Editorial',
          author: song.artist || song.author || 'Editorial',
          cover_image: song.cover_image || song.cover_url,
          audio_file: song.audio_file || song.audio_url,
          duration: song.duration
        }));

        fetch(`/api/songs/${song.id}/play`, { method: 'POST' }).catch(() => {});

        setTimeout(() => {
          window.location.href = `/player?id=${song.id}`;
        }, 140);
      }

      card.addEventListener('click', goToPlayer);
      const playBtn = card.querySelector('.track-play-btn');
      if (playBtn) playBtn.addEventListener('click', goToPlayer);

      tracksContainer.appendChild(card);
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[m]);
  }

  fetchAndRenderSongs();

});
