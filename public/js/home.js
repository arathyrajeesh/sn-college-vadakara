/**
 * വിരൽപ്പാട് — HOME PAGE CONTROLLER
 *
 * Clicking any track card saves the track to sessionStorage
 * and navigates to /player (the dedicated player page).
 */

document.addEventListener('DOMContentLoaded', () => {

  // ── Desktop frame ──────────────────────────────────────────────────────────
  const appShell       = document.getElementById('appShell');
  const toggleFrameBtn = document.getElementById('toggleFrameBtn');
  const frameToggleText= document.getElementById('frameToggleText');
  let   isFrameActive  = true;

  if (window.innerWidth >= 641) appShell.classList.add('desktop-frame-active');

  if (toggleFrameBtn) {
    toggleFrameBtn.addEventListener('click', () => {
      isFrameActive = !isFrameActive;
      appShell.classList.toggle('desktop-frame-active', isFrameActive);
      if (frameToggleText)
        frameToggleText.textContent = isFrameActive ? 'iPhone 17 Frame' : 'Fullscreen View';
    });
  }

  // ── Track list (mirrors ALL_TRACKS in player.html) ─────────────────────────
  const ALL_TRACKS = [
    { id:1, title:'I. The Substance of the Shadow', author:'Editorial',   duration:'35:00', totalSec:2100 },
    { id:2, title:'II. Ink on Borrowed Time',       author:'Poetry',      duration:'28:00', totalSec:1680 },
    { id:3, title:'III. Roots & Reverie',            author:'Fiction',     duration:'42:00', totalSec:2520 },
    { id:4, title:'IV. Letters Never Sent',          author:'Essay',       duration:'19:00', totalSec:1140 },
    { id:5, title:'V. The Weight of Wings',          author:'Short Story', duration:'31:00', totalSec:1860 },
    { id:6, title:'VI. Monsoon Cartography',         author:'Verse',       duration:'24:00', totalSec:1440 },
  ];

  // ── Restore previously active card (if user came back from player) ─────────
  let activeId = null;
  try {
    const saved = JSON.parse(sessionStorage.getItem('vp_track') || 'null');
    if (saved && saved.id) activeId = saved.id;
  } catch (_) {}

  // ── Attach listeners to every track card ──────────────────────────────────
  const cards = document.querySelectorAll('.track-card');

  cards.forEach((card, idx) => {
    const trackId = parseInt(card.dataset.trackId || idx + 1, 10);
    const track   = ALL_TRACKS.find(t => t.id === trackId) || ALL_TRACKS[idx];

    // Restore visual playing state if returning from player page
    if (activeId && trackId === activeId) {
      card.classList.add('paused'); // paused (not actively playing, but last selected)
    }

    // Click on card body OR its play button → go to player
    function goToPlayer(e) {
      e.stopPropagation();

      // Mark all as inactive, then mark this one
      cards.forEach(c => c.classList.remove('playing', 'paused'));
      card.classList.add('playing');

      // Save selected track to sessionStorage
      sessionStorage.setItem('vp_track', JSON.stringify({ id: track.id }));

      // Log play attempt to backend (fire-and-forget)
      fetch(`/api/tracks/${track.id}/play`, { method: 'POST' }).catch(() => {});

      // Navigate to player page (small delay for card animation)
      setTimeout(() => {
        window.location.href = '/player';
      }, 160);
    }

    card.addEventListener('click', goToPlayer);
    const playBtn = card.querySelector('.track-play-btn');
    if (playBtn) playBtn.addEventListener('click', goToPlayer);
  });

});
