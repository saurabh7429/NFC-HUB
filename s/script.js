(function() {
  'use strict';

  const loadingEl = document.getElementById('loading');
  const contentEl = document.getElementById('content');
  const errorEl = document.getElementById('error-state');
  const errorMsgEl = document.getElementById('error-message');
  const nameEl = document.getElementById('business-name');
  const taglineEl = document.getElementById('business-tagline');
  const logoContainer = document.getElementById('logo-container');
  const linksContainer = document.getElementById('links-container');
  const directReviewFallback = document.getElementById('direct-review-fallback');
  const directReviewLink = document.getElementById('direct-review-link');

  function showError(msg) {
    if (loadingEl) loadingEl.style.display = 'none';
    if (contentEl) contentEl.style.display = 'none';
    if (errorEl) {
      errorEl.style.display = 'block';
      if (errorMsgEl) errorMsgEl.textContent = msg;
    }
  }

  function applyTheme(branding) {
    if (!branding) return;
    if (branding.theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else if (branding.theme === 'light') {
      document.documentElement.removeAttribute('data-theme');
    } else if (branding.theme === 'auto') {
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.setAttribute('data-theme', 'dark');
      }
    }

    if (branding.accentColor) {
      document.documentElement.style.setProperty('--accent-color', branding.accentColor);
    }
  }

  fetch('b.json?t=' + Date.now())
    .then(function(res) {
      if (!res.ok) {
        throw new Error('Failed to load business profile (HTTP ' + res.status + ')');
      }
      return res.json();
    })
    .then(function(data) {
      if (data.status === 'archived') {
        showError('This business card is currently inactive or archived.');
        return;
      }

      applyTheme(data.branding);

      if (data.page && data.page.title) {
        document.title = data.page.title;
      }

      // Check Direct Review mode
      if (data.page && data.page.mode === 'direct-review') {
        const reviewLink = data.links ? data.links.find(function(l) {
          return l.type === 'google-review' && l.enabled && l.url;
        }) : null;

        if (reviewLink) {
          if (loadingEl) loadingEl.style.display = 'none';
          if (contentEl) contentEl.style.display = 'block';
          if (directReviewFallback) directReviewFallback.style.display = 'block';
          if (directReviewLink) directReviewLink.href = reviewLink.url;
          if (linksContainer) linksContainer.style.display = 'none';
          // Navigate immediately
          window.location.replace(reviewLink.url);
          return;
        }
      }

      // Link Hub mode
      nameEl.textContent = data.name || 'Welcome';
      if (data.tagline) {
        taglineEl.textContent = data.tagline;
      } else {
        taglineEl.style.display = 'none';
      }

      if (data.branding && data.branding.logo) {
        const img = document.createElement('img');
        img.src = data.branding.logo;
        img.alt = data.name + ' Logo';
        img.className = 'business-logo';
        logoContainer.appendChild(img);
      }

      if (data.links && Array.isArray(data.links)) {
        const sortedLinks = data.links
          .filter(function(l) { return l.enabled; })
          .sort(function(a, b) { return (a.order || 0) - (b.order || 0); });

        sortedLinks.forEach(function(link) {
          const a = document.createElement('a');
          a.href = link.url;
          a.textContent = link.label;
          a.className = link.type === 'google-review' ? 'btn btn-primary' : 'btn';
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          linksContainer.appendChild(a);
        });
      }

      if (loadingEl) loadingEl.style.display = 'none';
      if (contentEl) contentEl.style.display = 'block';
    })
    .catch(function(err) {
      showError(err.message || 'Error loading profile');
    });
})();
