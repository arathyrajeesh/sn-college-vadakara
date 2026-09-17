/**
 * വിരൽപ്പാട് — SPLASH SCREEN CONTROLLER
 */

document.addEventListener('DOMContentLoaded', () => {
  const appShell = document.getElementById('appShell');
  const splashScreen = document.getElementById('splashScreen');
  const splashVideo = document.getElementById('splashVideo');
  const splashTapTrigger = document.getElementById('splashTapTrigger');
  const toggleFrameBtn = document.getElementById('toggleFrameBtn');
  const frameToggleText = document.getElementById('frameToggleText');

  let isNavigating = false;
  let isFrameModeActive = true;

  if (window.innerWidth >= 641) {
    appShell.classList.add('desktop-frame-active');
  }

  // 1. Video Autoplay Handling
  if (splashVideo) {
    splashVideo.muted = true;
    splashVideo.playsInline = true;

    const playPromise = splashVideo.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        const startOnTap = () => {
          splashVideo.play();
          document.removeEventListener('touchstart', startOnTap);
          document.removeEventListener('click', startOnTap);
        };
        document.addEventListener('touchstart', startOnTap, { once: true });
        document.addEventListener('click', startOnTap, { once: true });
      });
    }

    // Exact video timing transition
    splashVideo.addEventListener('timeupdate', () => {
      if (!isNavigating && splashVideo.duration && splashVideo.currentTime >= (splashVideo.duration - 0.35)) {
        navigateToHome();
      }
    });

    splashVideo.addEventListener('ended', () => {
      if (!isNavigating) {
        navigateToHome();
      }
    });

    // Fallback based on metadata duration
    splashVideo.addEventListener('loadedmetadata', () => {
      const fullDurationMs = (splashVideo.duration || 4.42) * 1000;
      setTimeout(() => {
        if (!isNavigating) {
          navigateToHome();
        }
      }, fullDurationMs + 300);
    });
  }

  // Safety fallback after 5s
  setTimeout(() => {
    if (!isNavigating) {
      navigateToHome();
    }
  }, 5000);

  // 2. Smooth Navigation to Home Page
  function navigateToHome() {
    if (isNavigating) return;
    isNavigating = true;

    // Apply smooth fade-out blur animation
    splashScreen.classList.add('fade-out');

    // Wait for the fade animation and navigate to Home page
    setTimeout(() => {
      window.location.href = 'home.html';
    }, 750);
  }

  // Tap to skip directly to Home
  if (splashTapTrigger) {
    splashTapTrigger.addEventListener('click', navigateToHome);
    splashTapTrigger.addEventListener('touchend', (e) => {
      e.preventDefault();
      navigateToHome();
    });
  }

  // Desktop Frame Toggle
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
});
