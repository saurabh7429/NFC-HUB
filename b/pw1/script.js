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

  // Real, official vector SVG icons for Google (4-color G logo), Instagram (official gradient background with camera glyph), and WhatsApp (official green badge with phone glyph)
  const BRAND_ICONS = {
    'google-review': `
      <svg viewBox="0 0 48 48" width="100%" height="100%">
        <rect width="48" height="48" rx="12" fill="#ffffff"/>
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
      </svg>
    `,
    'instagram': `
      <svg viewBox="0 0 48 48" width="100%" height="100%">
        <defs>
          <radialGradient id="ig-rg" cx="15%" cy="100%" r="115%">
            <stop offset="0%" stop-color="#ffd521"/>
            <stop offset="10%" stop-color="#ffbe00"/>
            <stop offset="50%" stop-color="#d62976"/>
            <stop offset="100%" stop-color="#4f5bd5"/>
          </radialGradient>
        </defs>
        <rect width="48" height="48" rx="12" fill="url(#ig-rg)"/>
        <rect x="11" y="11" width="26" height="26" rx="7.5" fill="none" stroke="#ffffff" stroke-width="2.6"/>
        <circle cx="24" cy="24" r="6.2" fill="none" stroke="#ffffff" stroke-width="2.6"/>
        <circle cx="31.2" cy="16.8" r="1.6" fill="#ffffff"/>
      </svg>
    `,
    'whatsapp': `
      <svg viewBox="0 0 48 48" width="100%" height="100%">
        <rect width="48" height="48" rx="12" fill="#25D366"/>
        <path fill="#ffffff" d="M24.08 9C15.75 9 9 15.75 9 24.08c0 2.94.84 5.68 2.3 8.01L9.5 39l7.15-1.78c2.22 1.28 4.8 2.01 7.43 2.01 8.33 0 15.08-6.75 15.08-15.08S32.41 9 24.08 9zm7.39 20.93c-.31.87-1.78 1.66-2.48 1.76-.66.1-1.5.14-2.43-.16-.6-.19-1.37-.44-2.38-.88-4.22-1.83-6.95-6.13-7.16-6.41-.21-.28-1.72-2.29-1.72-4.36 0-2.07 1.08-3.09 1.47-3.51.39-.42.85-.53 1.13-.53.28 0 .56 0 .81.02.26.01.62-.1.97.74.36.87 1.23 3 1.34 3.22.11.22.18.48.04.76-.14.28-.21.46-.42.71-.21.25-.44.55-.63.74-.21.21-.43.44-.19.86.25.42 1.09 1.8 2.34 2.92 1.61 1.44 2.97 1.89 3.39 2.1.42.21.67.18.92-.11.25-.29 1.06-1.23 1.34-1.65.28-.42.56-.35.95-.21.39.14 2.47 1.16 2.89 1.37.42.21.7.32.81.49.1.18.1 1.03-.21 1.9z"/>
      </svg>
    `,
    'default': `
      <svg viewBox="0 0 48 48" width="100%" height="100%">
        <rect width="48" height="48" rx="12" fill="#3b82f6"/>
        <path fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" d="M20 28l8-8m-3-5l3-3a5.66 5.66 0 018 8l-3 3m-8 2l-3 3a5.66 5.66 0 01-8-8l3-3"/>
      </svg>
    `
  };

  const SUBTEXT_MAP = {
    'google-review': 'Leave a review & rating on Google',
    'instagram': '@prime.watch.surat',
    'whatsapp': '+91 93271 55055'
  };

  function showError(msg) {
    if (loadingEl) loadingEl.style.display = 'none';
    if (contentEl) contentEl.style.display = 'none';
    if (errorEl) {
      errorEl.style.display = 'block';
      if (errorMsgEl) errorMsgEl.textContent = msg;
    }
  }

  function applyTheme(branding) {
    if (!branding || !branding.theme) return;
    if (branding.theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else if (branding.theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      // 'auto' or system default: respect OS preference, remove forced attribute
      document.documentElement.removeAttribute('data-theme');
    }
  }

  function sanitizeUrl(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string') return null;
    const trimmed = rawUrl.trim();
    if (/^(https?:\/\/|tel:|mailto:)/i.test(trimmed)) {
      return trimmed;
    }
    return null;
  }

  fetch('b.json?t=' + Date.now())
    .then(function(res) {
      if (!res.ok) {
        throw new Error('Business configuration not found (HTTP ' + res.status + ')');
      }
      return res.json();
    })
    .then(function(data) {
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid business configuration format');
      }

      if (data.status === 'archived') {
        showError('This business profile is currently archived or inactive.');
        return;
      }

      applyTheme(data.branding);

      if (data.page && data.page.title) {
        document.title = data.page.title;
      } else if (data.name) {
        document.title = data.name + ' — ' + (data.tagline || 'Profile');
      }

      // Direct Review Mode
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

          try {
            window.location.replace(safeRedirectUrl);
          } catch (e) {
            console.warn('Auto-redirect failed:', e);
          }
          return;
        } else {
          showError('Google Review destination URL is not configured.');
          return;
        }
      }

      // Link Hub Mode
      if (nameEl) nameEl.textContent = data.name || 'Prime Watch';

      if (taglineEl) {
        if (data.tagline && data.tagline.trim()) {
          taglineEl.textContent = data.tagline.trim();
          taglineEl.style.display = 'block';
        } else {
          taglineEl.style.display = 'none';
        }
      }

      // Logo handling
      if (logoContainer && data.branding && data.branding.logo && typeof data.branding.logo === 'string') {
        const img = document.createElement('img');
        img.src = data.branding.logo;
        img.alt = (data.name || 'Prime Watch') + ' Logo';
        img.className = 'business-logo';
        img.onerror = function() {
          if (img.parentNode) img.parentNode.removeChild(img);
        };
        logoContainer.innerHTML = '';
        logoContainer.appendChild(img);
      }

      // Render links
      if (linksContainer && data.links && Array.isArray(data.links)) {
        linksContainer.innerHTML = '';
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
          emptyMsg.style.color = 'var(--text-muted)';
          emptyMsg.style.textAlign = 'center';
          emptyMsg.style.padding = '12px';
          linksContainer.appendChild(emptyMsg);
        } else {
          validLinks.forEach(function(link) {
            const a = document.createElement('a');
            a.href = sanitizeUrl(link.url);
            a.className = 'action-card';
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            a.setAttribute('aria-label', link.label);

            // Real Brand Icon
            const iconWrap = document.createElement('div');
            iconWrap.className = 'brand-app-icon';
            iconWrap.setAttribute('aria-hidden', 'true');
            iconWrap.innerHTML = BRAND_ICONS[link.type] || BRAND_ICONS['default'];

            // Info Stack
            const info = document.createElement('div');
            info.className = 'action-info';

            const label = document.createElement('div');
            label.className = 'action-label';
            label.textContent = link.label || 'Open Link';
            info.appendChild(label);

            const sub = document.createElement('div');
            sub.className = 'action-sub';
            sub.textContent = SUBTEXT_MAP[link.type] || (new URL(link.url, window.location.href)).hostname;
            info.appendChild(sub);

            // Trailing Chevron Arrow
            const arrow = document.createElement('div');
            arrow.className = 'action-arrow';
            arrow.setAttribute('aria-hidden', 'true');
            arrow.innerHTML = `
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            `;

            a.appendChild(iconWrap);
            a.appendChild(info);
            a.appendChild(arrow);

            linksContainer.appendChild(a);
          });
        }
      }

      if (loadingEl) loadingEl.style.display = 'none';
      if (contentEl) contentEl.style.display = 'block';
    })
    .catch(function(err) {
      showError(err.message || 'An error occurred while loading this page.');
    });
})();
