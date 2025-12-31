const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const analytics = (() => {
  const STORAGE_KEY = 'portfolio_utm';

  const getInstance = () => {
    if (window.amplitude && typeof window.amplitude.getInstance === 'function') {
      return window.amplitude.getInstance();
    }
    return null;
  };

  const withPageContext = props =>
    Object.assign(
      {
        page_path: window.location.pathname,
        page_title: document.title
      },
      props || {}
    );

  const track = (eventName, props) => {
    const instance = getInstance();
    if (!instance || typeof instance.logEvent !== 'function') {
      return;
    }
    instance.logEvent(eventName, withPageContext(props));
  };

  const setUserProperties = props => {
    const instance = getInstance();
    if (!instance || typeof instance.setUserProperties !== 'function') {
      return;
    }
    instance.setUserProperties(props);
  };

  const safeStorage = {
    get(key) {
      try {
        return window.localStorage.getItem(key);
      } catch (err) {
        return null;
      }
    },
    set(key, value) {
      try {
        window.localStorage.setItem(key, value);
      } catch (err) {
        // Ignore storage errors (private mode, blocked, etc.)
      }
    }
  };

  const getUtmParams = () => {
    const params = new URLSearchParams(window.location.search);
    const utm = {};
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach(key => {
      const value = params.get(key);
      if (value) {
        utm[key] = value;
      }
    });
    return utm;
  };

  const persistAttribution = () => {
    const utm = getUtmParams();
    if (Object.keys(utm).length) {
      const payload = Object.assign({}, utm, {
        landing_page: window.location.pathname,
        landing_url: window.location.href
      });
      safeStorage.set(STORAGE_KEY, JSON.stringify(payload));
      setUserProperties(payload);
      track('utm_capture', payload);
      return payload;
    }

    const stored = safeStorage.get(STORAGE_KEY);
    if (stored) {
      try {
        const data = JSON.parse(stored);
        setUserProperties(data);
        return data;
      } catch (err) {
        return null;
      }
    }

    return null;
  };

  return {
    track,
    persistAttribution
  };
})();

analytics.persistAttribution();

const isCaseStudyPage = window.location.pathname.includes('solitaire-candy-world');

if (!isCaseStudyPage) {
  analytics.track('landing_view');
}

const getSectionLabel = section => {
  if (!section) {
    return null;
  }
  if (section.dataset.sectionLabel) {
    return section.dataset.sectionLabel;
  }
  if (section.id) {
    return section.id;
  }
  const heading = section.querySelector('h1, h2, h3');
  if (heading) {
    return heading.textContent.trim();
  }
  return section.className || 'section';
};

const getSectionLabelFromElement = element => {
  const section = element ? element.closest('section') : null;
  return section ? getSectionLabel(section) : null;
};

const getProjectName = element => {
  const card = element ? element.closest('.project, .featured, .case-hero') : null;
  if (!card) {
    return null;
  }
  const heading = card.querySelector('h1, h2, h3');
  return heading ? heading.textContent.trim() : null;
};

const getLinkLabel = link => {
  if (!link) {
    return '';
  }
  return (
    link.textContent.trim() ||
    link.getAttribute('aria-label') ||
    link.getAttribute('title') ||
    'link'
  );
};

const getLinkInfo = (link, href) => {
  if (!href) {
    return { type: 'unknown' };
  }
  const lowerHref = href.toLowerCase();
  if (link.hasAttribute('download') || lowerHref.endsWith('.pdf')) {
    return { type: 'download' };
  }
  if (lowerHref.startsWith('mailto:')) {
    return { type: 'email' };
  }
  if (lowerHref.startsWith('tel:')) {
    return { type: 'phone' };
  }
  if (lowerHref.startsWith('#')) {
    return { type: 'anchor' };
  }
  try {
    const url = new URL(href, window.location.href);
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      if (url.origin !== window.location.origin) {
        return { type: 'external', url };
      }
      return { type: 'internal', url };
    }
  } catch (err) {
    return { type: 'other' };
  }
  return { type: 'other' };
};

const trackVideoEvent = (video, eventName, extra = {}) => {
  if (!video) {
    analytics.track(eventName, extra);
    return;
  }
  const project = getProjectName(video);
  const src = video.currentSrc || video.getAttribute('src') || '';
  analytics.track(eventName, Object.assign({ project, video_src: src }, extra));
};

const pageStartTime = performance.now();
let timeOnPageLogged = false;

const logTimeOnPage = () => {
  if (timeOnPageLogged) {
    return;
  }
  timeOnPageLogged = true;
  const seconds = Math.round((performance.now() - pageStartTime) / 1000);
  analytics.track('time_on_page', { seconds });
};

window.addEventListener('pagehide', logTimeOnPage);
window.addEventListener('beforeunload', logTimeOnPage);

window.addEventListener('load', () => {
  const navigationEntries = performance.getEntriesByType('navigation');
  const navEntry = navigationEntries && navigationEntries.length ? navigationEntries[0] : null;
  const loadTime = navEntry && navEntry.loadEventEnd ? navEntry.loadEventEnd : performance.now();
  analytics.track('page_load_time', { milliseconds: Math.round(loadTime) });
});

const firstInteractionEvents = ['pointerdown', 'keydown', 'scroll', 'touchstart'];
const firstInteractionOptions = { passive: true };
let firstInteractionLogged = false;

const handleFirstInteraction = event => {
  if (firstInteractionLogged) {
    return;
  }
  firstInteractionLogged = true;
  analytics.track('first_interaction', { interaction_type: event.type });
  firstInteractionEvents.forEach(name => {
    window.removeEventListener(name, handleFirstInteraction, firstInteractionOptions);
  });
};

firstInteractionEvents.forEach(name => {
  window.addEventListener(name, handleFirstInteraction, firstInteractionOptions);
});

const scrollDepthMarks = [25, 50, 75, 100];
const firedScrollDepths = new Set();
let scrollDepthTicking = false;

const updateScrollDepth = () => {
  const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
  const docHeight = Math.max(
    document.body.scrollHeight,
    document.documentElement.scrollHeight
  );
  const winHeight = window.innerHeight || document.documentElement.clientHeight || 0;
  const scrollable = docHeight - winHeight;
  const percent = scrollable > 0 ? (scrollTop / scrollable) * 100 : 100;

  scrollDepthMarks.forEach(mark => {
    if (percent >= mark && !firedScrollDepths.has(mark)) {
      firedScrollDepths.add(mark);
      analytics.track(`scroll_depth_${mark}`, { percent: Math.round(percent) });
      if (isCaseStudyPage && mark === 50) {
        analytics.track('case_study_scroll_50', { percent: Math.round(percent) });
      }
    }
  });
};

const handleScrollDepth = () => {
  if (scrollDepthTicking) {
    return;
  }
  scrollDepthTicking = true;
  requestAnimationFrame(() => {
    updateScrollDepth();
    scrollDepthTicking = false;
  });
};

window.addEventListener('scroll', handleScrollDepth, { passive: true });
window.addEventListener('load', updateScrollDepth);

document.addEventListener('click', event => {
  const target = event.target instanceof Element ? event.target : event.target.parentElement;
  const link = target ? target.closest('a') : null;
  if (!link) {
    return;
  }

  const href = link.getAttribute('href') || '';
  const label = getLinkLabel(link);
  const info = getLinkInfo(link, href);
  const section = getSectionLabelFromElement(link);
  const project = getProjectName(link);

  if (link.closest('nav')) {
    analytics.track('nav_click', { target: href, link_text: label, section });
  }

  const isCta =
    link.classList.contains('btn') ||
    link.classList.contains('chip') ||
    link.classList.contains('contact-link') ||
    link.closest('.top-actions') ||
    info.type === 'download' ||
    info.type === 'email';

  if (isCta) {
    analytics.track('cta_click', {
      cta_text: label,
      href,
      cta_type: info.type,
      section,
      project
    });
  }

  if (info.type === 'download') {
    analytics.track('download_click', { href, link_text: label, section, project });
  }

  if (info.type === 'email') {
    analytics.track('email_click', {
      email: href.replace(/^mailto:/i, ''),
      link_text: label,
      section
    });
  }

  if (info.type === 'external' && info.url) {
    analytics.track('outbound_click', {
      href,
      host: info.url.host,
      link_text: label,
      section,
      project
    });
  }

  if (project) {
    analytics.track('project_card_click', { project, href, link_text: label, section });
  }

  if (href.includes('solitaire-candy-world.html')) {
    analytics.track('case_study_open', { href, from_page: window.location.pathname });
  }

  const featuredSection = link.closest('#featured');
  if (featuredSection) {
    analytics.track('featured_project_click', { project, href, link_text: label });
  }
});

document.querySelectorAll('video').forEach(video => {
  let userInitiated = false;

  const markUserInitiated = () => {
    userInitiated = true;
    window.setTimeout(() => {
      userInitiated = false;
    }, 2000);
  };

  video.addEventListener('pointerdown', markUserInitiated);
  video.addEventListener('click', markUserInitiated);
  video.addEventListener('play', () => {
    if (!userInitiated) {
      return;
    }
    trackVideoEvent(video, 'project_video_play');
  });
});

if (!prefersReducedMotion) {
  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          if (!entry.target.dataset.analyticsViewed) {
            entry.target.dataset.analyticsViewed = 'true';
            analytics.track('section_view', { section: getSectionLabel(entry.target) });
          }
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  document.querySelectorAll('.reveal').forEach(section => observer.observe(section));
} else {
  document.querySelectorAll('.reveal').forEach(section => {
    if (!section.dataset.analyticsViewed) {
      section.dataset.analyticsViewed = 'true';
      analytics.track('section_view', { section: getSectionLabel(section) });
    }
    section.classList.add('visible');
  });
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
    const nextState = !isOpen;
    setMenuState(nextState);
    analytics.track('menu_toggle', { is_open: nextState });
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

      trackVideoEvent(video, 'project_video_restart');
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
    const video = container ? container.querySelector('video') : null;

    if (!target) {
      return;
    }

    const isFullscreen = Boolean(getFullscreenElement());
    trackVideoEvent(video, 'project_video_fullscreen', {
      action: isFullscreen ? 'exit' : 'enter',
      target_type: targetType
    });

    if (isFullscreen) {
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
        if (expanded) {
          analytics.track('read_more_expand', {
            project: getProjectName(block),
            section: getSectionLabelFromElement(block)
          });
        }
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
