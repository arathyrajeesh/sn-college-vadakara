/**
 * വിരൽപ്പാട് (VIRAL PAADU) — WEB APPLICATION LOGIC
 * Mobile-First Editorial Splash Screen & Interactive Home Page
 * Dynamically loads and renders chapters / articles from database
 */

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const appShell = document.getElementById('appShell');
  const splashScreen = document.getElementById('splashScreen');
  const splashVideo = document.getElementById('splashVideo');
  const mainApp = document.getElementById('mainApp');
  const splashTapTrigger = document.getElementById('splashTapTrigger');
  const replaySplashBtn = document.getElementById('replaySplashBtn');
  const toggleFrameBtn = document.getElementById('toggleFrameBtn');
  const frameToggleText = document.getElementById('frameToggleText');
  const tracksContainer = document.querySelector('.tracks-list-section');

  let isTransitioned = false;
  let isFrameModeActive = true;
  let audioContext = null;

  // Initialize desktop frame mode default for wide screens
  if (window.innerWidth >= 641 && appShell) {
    appShell.classList.add('desktop-frame-active');
  }

  // --------------------------------------------------------------------------
  // 1. Video Autoplay & Automatic Transition to Home Page
  // --------------------------------------------------------------------------
  if (splashVideo) {
    splashVideo.muted = true;
    splashVideo.playsInline = true;

    const playPromise = splashVideo.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        const startOnInteraction = () => {
          splashVideo.play();
          document.removeEventListener('touchstart', startOnInteraction);
          document.removeEventListener('click', startOnInteraction);
        };
        document.addEventListener('touchstart', startOnInteraction, { once: true });
        document.addEventListener('click', startOnInteraction, { once: true });
      });
    }

    splashVideo.addEventListener('timeupdate', () => {
      if (!isTransitioned && splashVideo.duration && splashVideo.currentTime >= (splashVideo.duration - 0.35)) {
        transitionToHomePage();
      }
    });

    splashVideo.addEventListener('ended', () => {
      if (!isTransitioned) {
        transitionToHomePage();
      }
    });

    splashVideo.addEventListener('loadedmetadata', () => {
      const fullDurationMs = (splashVideo.duration || 4.42) * 1000;
      setTimeout(() => {
        if (!isTransitioned) {
          transitionToHomePage();
        }
      }, fullDurationMs + 300);
    });
  }

  setTimeout(() => {
    if (!isTransitioned) {
      transitionToHomePage(false);
    }
  }, 5000);

  // --------------------------------------------------------------------------
  // 2. Smooth Cinematic Transition to Home Page
  // --------------------------------------------------------------------------
  function transitionToHomePage(isUserGesture = true) {
    if (isTransitioned) return;
    isTransitioned = true;

    if (isUserGesture) {
      playSubtleTapSound();
    }

    if (splashScreen) splashScreen.classList.add('fade-out');
    
    setTimeout(() => {
      if (mainApp) {
        mainApp.classList.add('active');
        mainApp.setAttribute('aria-hidden', 'false');
      }
      if (splashScreen) splashScreen.setAttribute('aria-hidden', 'true');
    }, 120);

    setTimeout(() => {
      if (splashScreen) splashScreen.style.display = 'none';
    }, 1150);
  }

  function replaySplashScreen() {
    isTransitioned = false;
    if (splashScreen) {
      splashScreen.style.display = 'flex';
      splashScreen.setAttribute('aria-hidden', 'false');
    }
    if (mainApp) {
      mainApp.setAttribute('aria-hidden', 'true');
      mainApp.classList.remove('active');
    }

    if (splashVideo) {
      splashVideo.currentTime = 0;
      splashVideo.play().catch(() => {});
    }

    if (splashScreen) {
      void splashScreen.offsetWidth;
      splashScreen.classList.remove('fade-out');
    }

    playSubtleTapSound();
  }

  if (splashTapTrigger) {
    splashTapTrigger.addEventListener('click', () => transitionToHomePage(true));
    splashTapTrigger.addEventListener('touchend', (e) => {
      e.preventDefault();
      transitionToHomePage(true);
    });
  }

  if (replaySplashBtn) {
    replaySplashBtn.addEventListener('click', replaySplashScreen);
  }

  // --------------------------------------------------------------------------
  // 3. Dynamic Track Database Fetch & Navigation to /player
  // --------------------------------------------------------------------------
  async function loadDatabaseTracks() {
    try {
      const res = await fetch('/api/songs');
      if (res.ok) {
        const json = await res.json();
        const songList = json.data || [];
        renderTracks(songList);
        return;
      }
    } catch (e) {
      console.warn('API track load note:', e);
    }
    renderTracks([]);
  }

  function renderTracks(trackList) {
    if (!tracksContainer) return;
    tracksContainer.innerHTML = '';

    // Guarantee deduplication by id and sort by display_order
    const uniqueTracks = Array.from(new Map((trackList || []).map(t => [t.id, t])).values());
    uniqueTracks.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

    if (uniqueTracks.length === 0) {
      tracksContainer.innerHTML = '<div style="text-align:center; padding:36px 12px; color:#6B6053; font-size:0.92rem; font-weight:500;">No published songs in database yet.<br><span style="font-size:0.8rem; opacity:0.8;">Admin can add songs from the Admin Dashboard.</span></div>';
      return;
    }

    uniqueTracks.forEach((track, index) => {
      const card = document.createElement('article');
      card.className = 'track-card';
      card.dataset.trackId = track.id;

      card.innerHTML = `
        <div class="track-info">
          <h2 class="track-title">${escapeHtml(track.title)}</h2>
          <span class="track-duration">${escapeHtml(track.duration || '35 min')}</span>
        </div>
        <button type="button" class="track-play-btn" aria-label="Play Track ${track.id}">
          <svg class="play-icon" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="7 4 19 12 7 20 7 4"></polygon>
          </svg>
          <svg class="pause-icon" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="5" width="3.5" height="14"></rect>
            <rect x="14.5" y="5" width="3.5" height="14"></rect>
          </svg>
        </button>
      `;

      const goToPlayer = (e) => {
        e.stopPropagation();
        document.querySelectorAll('.track-card').forEach(c => c.classList.remove('playing'));
        card.classList.add('playing');

        sessionStorage.setItem('vp_track', JSON.stringify({ id: track.id, title: track.title, author: track.author }));
        fetch(`/api/tracks/${track.id}/play`, { method: 'POST' }).catch(() => {});

        setTimeout(() => {
          window.location.href = `/player?id=${track.id}`;
        }, 120);
      };

      card.addEventListener('click', goToPlayer);
      const playBtn = card.querySelector('.track-play-btn');
      if (playBtn) playBtn.addEventListener('click', goToPlayer);

      tracksContainer.appendChild(card);
    });
  }

  function bindStaticCards() {
    const trackCards = document.querySelectorAll('.track-card');
    trackCards.forEach((card, index) => {
      const playBtn = card.querySelector('.track-play-btn');
      const trackId = parseInt(card.dataset.trackId || (index + 1), 10);

      const goToPlayer = (e) => {
        e.stopPropagation();
        trackCards.forEach(c => c.classList.remove('playing'));
        card.classList.add('playing');
        sessionStorage.setItem('vp_track', JSON.stringify({ id: trackId }));
        fetch(`/api/tracks/${trackId}/play`, { method: 'POST' }).catch(() => {});
        setTimeout(() => {
          window.location.href = `/player?id=${trackId}`;
        }, 120);
      };

      card.addEventListener('click', goToPlayer);
      if (playBtn) playBtn.addEventListener('click', goToPlayer);
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[m]);
  }

  loadDatabaseTracks();

  // --------------------------------------------------------------------------
  // 4. Desktop iPhone 17 Frame Toggle
  // --------------------------------------------------------------------------
  if (toggleFrameBtn) {
    toggleFrameBtn.addEventListener('click', () => {
      isFrameModeActive = !isFrameModeActive;
      if (isFrameModeActive) {
        appShell.classList.add('desktop-frame-active');
        if (frameToggleText) frameToggleText.textContent = 'iPhone 17 Frame';
      } else {
        appShell.classList.remove('desktop-frame-active');
        if (frameToggleText) frameToggleText.textContent = 'Fullscreen View';
      }
    });
  }

  // --------------------------------------------------------------------------
  // 5. Audio Context Helper
  // --------------------------------------------------------------------------
  function getAudioContext() {
    if (!audioContext) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) audioContext = new AudioCtx();
    }
    if (audioContext && audioContext.state === 'suspended') {
      audioContext.resume();
    }
    return audioContext;
  }

  function playSubtleTapSound() {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.06);

      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.06);
    } catch (_) {}
  }
});
