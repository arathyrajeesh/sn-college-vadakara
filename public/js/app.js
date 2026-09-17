/**
 * വിരൽപ്പാട് (VIRAL PAADU) — WEB APPLICATION LOGIC
 * Mobile-First Editorial Splash Screen & Interactive Home Page
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
  const trackCards = document.querySelectorAll('.track-card');

  let isTransitioned = false;
  let isFrameModeActive = true;
  let currentPlayingTrack = null;
  let audioContext = null;
  let activeOscillator = null;

  // Initialize desktop frame mode default for wide screens
  if (window.innerWidth >= 641) {
    appShell.classList.add('desktop-frame-active');
  }

  // --------------------------------------------------------------------------
  // 1. Video Autoplay & Automatic Transition to Home Page
  // --------------------------------------------------------------------------
  if (splashVideo) {
    splashVideo.muted = true;
    splashVideo.playsInline = true;

    // Start playback immediately
    const playPromise = splashVideo.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Fallback: start on first touch/click
        const startOnInteraction = () => {
          splashVideo.play();
          document.removeEventListener('touchstart', startOnInteraction);
          document.removeEventListener('click', startOnInteraction);
        };
        document.addEventListener('touchstart', startOnInteraction, { once: true });
        document.addEventListener('click', startOnInteraction, { once: true });
      });
    }

    // AUTOMATIC TRANSITION: Track exact video duration and transition on completion
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

    // Fallback based on video metadata duration
    splashVideo.addEventListener('loadedmetadata', () => {
      const fullDurationMs = (splashVideo.duration || 4.42) * 1000;
      setTimeout(() => {
        if (!isTransitioned) {
          transitionToHomePage();
        }
      }, fullDurationMs + 300);
    });
  }

  // Safety fallback if video metadata fails to load
  setTimeout(() => {
    if (!isTransitioned) {
      transitionToHomePage();
    }
  }, 5000);

  // --------------------------------------------------------------------------
  // 2. Smooth Cinematic Transition to Home Page
  // --------------------------------------------------------------------------
  function transitionToHomePage() {
    if (isTransitioned) return;
    isTransitioned = true;

    playSubtleTapSound();

    // Add fade-out transition class to splash screen
    splashScreen.classList.add('fade-out');
    
    // Activate Home Page
    setTimeout(() => {
      mainApp.classList.add('active');
      mainApp.setAttribute('aria-hidden', 'false');
      splashScreen.setAttribute('aria-hidden', 'true');
    }, 120);

    // After animation finishes, ensure splash is unclickable
    setTimeout(() => {
      splashScreen.style.display = 'none';
    }, 1150);
  }

  // Replay Splash Screen Handler
  function replaySplashScreen() {
    isTransitioned = false;
    
    // Stop any playing audio
    stopAudio();
    trackCards.forEach(c => c.classList.remove('playing'));

    splashScreen.style.display = 'flex';
    splashScreen.setAttribute('aria-hidden', 'false');
    mainApp.setAttribute('aria-hidden', 'true');
    mainApp.classList.remove('active');

    // Reset video
    if (splashVideo) {
      splashVideo.currentTime = 0;
      splashVideo.play().catch(() => {});
    }

    // Force reflow and remove fade-out
    void splashScreen.offsetWidth;
    splashScreen.classList.remove('fade-out');

    playSubtleTapSound();
  }

  // Instant Tap to Skip Splash & Enter Home Page
  if (splashTapTrigger) {
    splashTapTrigger.addEventListener('click', transitionToHomePage);
    splashTapTrigger.addEventListener('touchend', (e) => {
      e.preventDefault();
      transitionToHomePage();
    });
  }

  if (replaySplashBtn) {
    replaySplashBtn.addEventListener('click', replaySplashScreen);
  }

  // --------------------------------------------------------------------------
  // 3. Track Cards Audio Playback Interaction
  // --------------------------------------------------------------------------
  trackCards.forEach((card, index) => {
    const playBtn = card.querySelector('.track-play-btn');
    const trackId = card.dataset.trackId || (index + 1);

    const togglePlay = (e) => {
      e.stopPropagation();
      
      if (card.classList.contains('playing')) {
        // Stop current track
        card.classList.remove('playing');
        stopAudio();
        currentPlayingTrack = null;
      } else {
        // Stop other playing cards
        trackCards.forEach(c => c.classList.remove('playing'));
        card.classList.add('playing');
        currentPlayingTrack = trackId;
        startMelodicAudio(index);
      }
    };

    card.addEventListener('click', togglePlay);
    if (playBtn) {
      playBtn.addEventListener('click', togglePlay);
    }
  });

  // --------------------------------------------------------------------------
  // 4. Desktop iPhone 17 Frame Mockup Toggle
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
  // 5. Web Audio Synthesis (Pleasant Ambient & Interaction Sound)
  // --------------------------------------------------------------------------
  function getAudioContext() {
    if (!audioContext) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        audioContext = new AudioCtx();
      }
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

  function startMelodicAudio(trackIndex) {
    try {
      stopAudio();
      const ctx = getAudioContext();
      if (!ctx) return;

      const baseFreqs = [220, 246.94, 261.63, 293.66, 329.63, 349.23];
      const freq = baseFreqs[trackIndex % baseFreqs.length];

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gain.gain.setValueAtTime(0.08, ctx.currentTime);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      activeOscillator = { osc, gain };
    } catch (_) {}
  }

  function stopAudio() {
    if (activeOscillator) {
      try {
        const ctx = getAudioContext();
        if (ctx) {
          activeOscillator.gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.1);
          setTimeout(() => {
            activeOscillator.osc.stop();
            activeOscillator = null;
          }, 120);
        }
      } catch (_) {
        activeOscillator = null;
      }
    }
  }
});
