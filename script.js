const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (!prefersReducedMotion) {
  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  document.querySelectorAll('.reveal').forEach(section => observer.observe(section));
} else {
  document.querySelectorAll('.reveal').forEach(section => section.classList.add('visible'));
}

const menuToggle = document.querySelector('.menu-toggle');
const topbar = document.querySelector('.topbar');
const topbarMenu = document.querySelector('#topbar-menu');

if (menuToggle && topbar && topbarMenu) {
  const setMenuState = isOpen => {
    topbar.classList.toggle('is-open', isOpen);
    menuToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  };

  menuToggle.addEventListener('click', () => {
    const isOpen = topbar.classList.contains('is-open');
    setMenuState(!isOpen);
  });

  topbarMenu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      if (window.innerWidth <= 820) {
        setMenuState(false);
      }
    });
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 820) {
      setMenuState(false);
    }
  });
}

document.querySelectorAll('[data-restart-target]').forEach(button => {
  button.addEventListener('click', () => {
    const targetType = button.dataset.restartTarget;

    if (targetType === 'video') {
      const container = button.closest('.project-media, .video-embed, .video-frame');
      const video = container ? container.querySelector('video') : null;

      if (!video) {
        return;
      }

      video.currentTime = 0;
      const playPromise = video.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {});
      }
      return;
    }

    if (targetType === 'iframe') {
      const container = button.closest('.video-embed, .video-frame');
      const iframe = container ? container.querySelector('iframe') : null;

      if (!iframe) {
        return;
      }

      const src = iframe.getAttribute('src');
      if (!src) {
        return;
      }

      const url = new URL(src, window.location.href);
      url.searchParams.set('restart', Date.now().toString());
      iframe.setAttribute('src', url.toString());
    }
  });
});

const getFullscreenElement = () =>
  document.fullscreenElement ||
  document.webkitFullscreenElement ||
  document.mozFullScreenElement ||
  document.msFullscreenElement;

const requestFullscreen = element => {
  if (element.requestFullscreen) {
    return element.requestFullscreen();
  }
  if (element.webkitEnterFullscreen) {
    return element.webkitEnterFullscreen();
  }
  if (element.webkitRequestFullscreen) {
    return element.webkitRequestFullscreen();
  }
  if (element.mozRequestFullScreen) {
    return element.mozRequestFullScreen();
  }
  if (element.msRequestFullscreen) {
    return element.msRequestFullscreen();
  }
  return null;
};

const exitFullscreen = () => {
  if (document.exitFullscreen) {
    return document.exitFullscreen();
  }
  if (document.webkitExitFullscreen) {
    return document.webkitExitFullscreen();
  }
  if (document.mozCancelFullScreen) {
    return document.mozCancelFullScreen();
  }
  if (document.msExitFullscreen) {
    return document.msExitFullscreen();
  }
  return null;
};

const updateFullscreenButtons = () => {
  const isFullscreen = Boolean(getFullscreenElement());
  document.querySelectorAll('[data-fullscreen-target]').forEach(button => {
    const label = isFullscreen ? 'Exit full screen' : 'Enter full screen';
    const text = button.querySelector('.video-fullscreen__text');
    button.classList.toggle('is-active', isFullscreen);
    button.setAttribute('aria-label', label);
    button.setAttribute('aria-pressed', isFullscreen ? 'true' : 'false');
    if (text) {
      text.textContent = isFullscreen ? 'Exit' : 'Full';
    }
  });
};

document.querySelectorAll('[data-fullscreen-target]').forEach(button => {
  button.addEventListener('click', () => {
    const targetType = button.dataset.fullscreenTarget;
    const container = button.closest('.video-embed, .project-media, .video-frame');
    const target = targetType === 'video' ? container?.querySelector('video') : container;

    if (!target) {
      return;
    }

    if (getFullscreenElement()) {
      exitFullscreen();
      return;
    }

    requestFullscreen(target);
  });
});

['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'].forEach(eventName => {
  document.addEventListener(eventName, updateFullscreenButtons);
});

updateFullscreenButtons();

const updateReadMoreButtons = () => {
  document.querySelectorAll('.projects-grid .project .muted').forEach(block => {
    const next = block.nextElementSibling;
    const hasButton = next && next.classList.contains('read-more');
    const isExpanded = block.classList.contains('is-expanded');

    if (isExpanded) {
      return;
    }

    const isOverflowing = block.scrollHeight > block.clientHeight + 1;

    if (isOverflowing && !hasButton) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'read-more';
      button.textContent = 'Read more';
      button.setAttribute('aria-expanded', 'false');
      button.addEventListener('click', () => {
        const expanded = block.classList.toggle('is-expanded');
        button.textContent = expanded ? 'Read less' : 'Read more';
        button.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        if (!expanded) {
          updateReadMoreButtons();
        }
      });
      block.after(button);
    }

    if (!isOverflowing && hasButton) {
      next.remove();
    }
  });
};

window.addEventListener('load', updateReadMoreButtons);
window.addEventListener('resize', updateReadMoreButtons);
updateReadMoreButtons();

const INITIAL_PROJECT_SCROLL_PERCENT = 0.3;

const setInitialProjectFocus = () => {
  const grid = document.querySelector('.projects-grid');
  if (!grid || grid.scrollLeft > 2) {
    return;
  }

  const maxScrollLeft = Math.max(0, grid.scrollWidth - grid.clientWidth);
  if (!maxScrollLeft) {
    return;
  }

  grid.scrollTo({ left: maxScrollLeft * INITIAL_PROJECT_SCROLL_PERCENT, behavior: 'auto' });
};

window.addEventListener('load', () => {
  requestAnimationFrame(setInitialProjectFocus);
});

if (!prefersReducedMotion) {
  const projectGrids = document.querySelectorAll('.projects-grid');

  const updateProjectGrid = grid => {
    const cards = grid.querySelectorAll('.project');
    if (!cards.length) {
      return;
    }

    const center = grid.scrollLeft + grid.clientWidth / 2;
    const maxOffset = grid.clientWidth / 2;

    cards.forEach(card => {
      const cardCenter = card.offsetLeft + card.clientWidth / 2;
      const offset = (cardCenter - center) / maxOffset;
      const clamped = Math.max(-1, Math.min(1, offset));
      const distance = Math.abs(clamped);
      const depth = 1 - distance;
      const rotate = clamped * 12;
      const translateY = distance * 12;
      const translateZ = depth * 24;
      const scale = 0.92 + depth * 0.08;
      const opacity = 0.6 + depth * 0.4;

      card.style.setProperty('--card-rotate', `${rotate.toFixed(2)}deg`);
      card.style.setProperty('--card-y', `${translateY.toFixed(2)}px`);
      card.style.setProperty('--card-z', `${translateZ.toFixed(2)}px`);
      card.style.setProperty('--card-scale', scale.toFixed(3));
      card.style.setProperty('--card-opacity', opacity.toFixed(3));
      card.style.zIndex = `${Math.round(depth * 10)}`;
    });
  };

  projectGrids.forEach(grid => {
    let ticking = false;
    const handleScroll = () => {
      if (ticking) {
        return;
      }
      ticking = true;
      requestAnimationFrame(() => {
        updateProjectGrid(grid);
        ticking = false;
      });
    };

    grid.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);
    handleScroll();
  });
}
