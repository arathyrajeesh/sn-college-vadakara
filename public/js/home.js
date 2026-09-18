/**
 * വിരൽപ്പാട് — HOME PAGE CONTROLLER
 * Dynamically fetches tracks from Database (Supabase / REST API)
 * Clicking any track card navigates to /player with the track ID.
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
  let tracks = [];

  // Restore previously active card
  let activeId = null;
  try {
    const saved = JSON.parse(sessionStorage.getItem('vp_track') || 'null');
    if (saved && saved.id) activeId = parseInt(saved.id, 10);
  } catch (_) {}

  async function fetchAndRenderTracks() {
    try {
      const res = await fetch('/api/tracks');
      if (res.ok) {
        const json = await res.json();
        if (json.data && json.data.length > 0) {
          tracks = json.data;
          renderTrackCards(tracks);
          return;
        }
      }
    } catch (err) {
      console.warn('API fetch fallback:', err);
    }

    // Default static fallback if API fails
    attachCardListeners();
  }

  function renderTrackCards(trackList) {
    if (!tracksContainer) return;
    tracksContainer.innerHTML = '';

    trackList.forEach((track, idx) => {
      const card = document.createElement('article');
      card.className = 'track-card';
      card.dataset.trackId = track.id;
      if (activeId === track.id) card.classList.add('paused');

      const isPlaying = activeId === track.id;

      card.innerHTML = `
        <div class="track-info">
          <h2 class="track-title">${escapeHtml(track.title)}</h2>
          <span class="track-duration">${escapeHtml(track.duration || '30 min')}</span>
        </div>
        <div class="track-card-right">
          <div class="playing-indicator" aria-hidden="true"><span></span><span></span><span></span></div>
          <button type="button" class="track-play-btn" aria-label="Play Track ${track.id}">
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

        sessionStorage.setItem('vp_track', JSON.stringify({ id: track.id, title: track.title, author: track.author }));
        fetch(`/api/tracks/${track.id}/play`, { method: 'POST' }).catch(() => {});

        setTimeout(() => {
          window.location.href = `/player?id=${track.id}`;
        }, 140);
      }

      card.addEventListener('click', goToPlayer);
      const playBtn = card.querySelector('.track-play-btn');
      if (playBtn) playBtn.addEventListener('click', goToPlayer);

      tracksContainer.appendChild(card);
    });
  }

  function attachCardListeners() {
    const cards = document.querySelectorAll('.track-card');
    cards.forEach((card, idx) => {
      const trackId = parseInt(card.dataset.trackId || (idx + 1), 10);
      function goToPlayer(e) {
        e.stopPropagation();
        cards.forEach(c => c.classList.remove('playing', 'paused'));
        card.classList.add('playing');
        sessionStorage.setItem('vp_track', JSON.stringify({ id: trackId }));
        fetch(`/api/tracks/${trackId}/play`, { method: 'POST' }).catch(() => {});
        setTimeout(() => {
          window.location.href = `/player?id=${trackId}`;
        }, 140);
      }
      card.addEventListener('click', goToPlayer);
      const playBtn = card.querySelector('.track-play-btn');
      if (playBtn) playBtn.addEventListener('click', goToPlayer);
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[m]);
  }

  fetchAndRenderTracks();

});
