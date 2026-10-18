(function() {
  'use strict';

  const loadingEl = document.getElementById('loading');
  const contentEl = document.getElementById('content');
  const errorEl = document.getElementById('error-state');
  const errorTitleEl = document.getElementById('error-title');
  const errorMsgEl = document.getElementById('error-message');
  const nameEl = document.getElementById('business-name');
  const taglineEl = document.getElementById('business-tagline');
  const logoContainer = document.getElementById('logo-container');
  const linksContainer = document.getElementById('links-container');
  const directReviewFallback = document.getElementById('direct-review-fallback');
  const directReviewLink = document.getElementById('direct-review-link');

  const ICON_MAP = {
    'google-review': '⭐',
    'instagram': '📷',
    'whatsapp': '💬',
    'facebook': '👍',
    'website': '🌐',
    'phone': '📞',
    'email': '✉️',
    'custom': '🔗'
  };

  function showError(title, msg) {
    if (loadingEl) loadingEl.style.display = 'none';
    if (contentEl) contentEl.style.display = 'none';
    if (errorEl) {
      errorEl.style.display = 'block';
      if (errorTitleEl) errorTitleEl.textContent = title;
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

    if (branding.accentColor && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(branding.accentColor)) {
      document.documentElement.style.setProperty('--accent-color', branding.accentColor);
    }
  }

  function sanitizeUrl(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string') return null;
    const trimmed = rawUrl.trim();
    // Only allow http, https, tel, and mailto protocols
    if (/^(https?:\/\/|tel:|mailto:)/i.test(trimmed)) {
      return trimmed;
    }
    return null;
  }

  // Load b.json from the business's own folder
  fetch('b.json?t=' + Date.now())
    .then(function(res) {
      if (!res.ok) {
        throw new Error('Business configuration not found (HTTP ' + res.status + ')');
      }
      return res.json();
    })
    .then(function(data) {
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid configuration format');
      }

      // Check archived status
      if (data.status === 'archived') {
        showError('Card Inactive', 'This business profile is currently archived or inactive.');
        return;
      }

      applyTheme(data.branding);

      if (data.page && data.page.title) {
        document.title = data.page.title;
      } else if (data.name) {
        document.title = data.name;
      }

      // 1. Direct Review Mode
      if (data.page && data.page.mode === 'direct-review') {
        const reviewLinkItem = Array.isArray(data.links) ? data.links.find(function(l) {
          return l.type === 'google-review' && l.enabled && l.url;
        }) : null;

        const safeRedirectUrl = reviewLinkItem ? sanitizeUrl(reviewLinkItem.url) : null;

        if (safeRedirectUrl) {
          if (loadingEl) loadingEl.style.display = 'none';
          if (contentEl) contentEl.style.display = 'block';
          if (directReviewFallback) directReviewFallback.style.display = 'block';
          if (directReviewLink) directReviewLink.href = safeRedirectUrl;
          if (linksContainer) linksContainer.style.display = 'none';

          // Client-side automatic redirect
          try {
            window.location.replace(safeRedirectUrl);
          } catch (e) {
            // If location.replace throws (e.g. sandbox iframe restrictions), fallback link remains clickable
            console.warn('Auto-redirect blocked or delayed:', e);
          }
          return;
        } else {
          // Direct Review enabled but review URL not configured
          showError('Configuration Notice', 'Google Review destination is not configured for direct review.');
          return;
        }
      }

      // 2. Link Hub Mode
      nameEl.textContent = data.name || 'Welcome';

      if (data.tagline && data.tagline.trim()) {
        taglineEl.textContent = data.tagline.trim();
        taglineEl.style.display = 'block';
      } else {
        taglineEl.style.display = 'none';
      }

      // Logo handling: only display if valid and exists; do NOT render empty or broken image frame
      if (data.branding && data.branding.logo && typeof data.branding.logo === 'string') {
        const img = document.createElement('img');
        img.src = data.branding.logo;
        img.alt = (data.name || 'Business') + ' Logo';
        img.className = 'business-logo';
        img.onerror = function() {
          // If image fails to load, remove it completely rather than showing a broken icon
          if (img.parentNode) img.parentNode.removeChild(img);
        };
        logoContainer.appendChild(img);
      }

      // Render only configured and enabled links
      if (data.links && Array.isArray(data.links)) {
        const validLinks = data.links
          .filter(function(l) {
            return l && l.enabled && l.url && sanitizeUrl(l.url);
          })
          .sort(function(a, b) {
            return (a.order || 0) - (b.order || 0);
          });

        if (validLinks.length === 0) {
          const emptyMsg = document.createElement('p');
          emptyMsg.textContent = 'No active links available at this time.';
          emptyMsg.className = 'text-muted';
          linksContainer.appendChild(emptyMsg);
        } else {
          validLinks.forEach(function(link) {
            const a = document.createElement('a');
            a.href = sanitizeUrl(link.url);
            a.className = link.type === 'google-review' ? 'btn btn-primary' : 'btn';
            a.target = '_blank';
            a.rel = 'noopener noreferrer';

            const iconSpan = document.createElement('span');
            iconSpan.className = 'btn-icon';
            iconSpan.textContent = ICON_MAP[link.type] || '🔗';
            iconSpan.setAttribute('aria-hidden', 'true');

            const textSpan = document.createElement('span');
            textSpan.className = 'btn-text';
            textSpan.textContent = link.label || 'Visit Link';

            a.appendChild(iconSpan);
            a.appendChild(textSpan);
            linksContainer.appendChild(a);
          });
        }
      }

      if (loadingEl) loadingEl.style.display = 'none';
      if (contentEl) contentEl.style.display = 'block';
    })
    .catch(function(err) {
      showError('Unable to Load Profile', err.message || 'An error occurred while loading this page.');
    });
})();
