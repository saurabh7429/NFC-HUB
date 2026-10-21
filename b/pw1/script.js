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

  // Real, official vector SVG icons with matching aesthetic tiles
  const BRAND_ICONS = {
    'google-review': `
      <svg viewBox="0 0 44 44" width="44" height="44">
        <rect width="44" height="44" rx="12" class="google-tile-bg"/>
        <g transform="translate(10, 10)">
          <path fill="#4285F4" d="M23.5 12.28c0-.85-.08-1.68-.22-2.48H12v4.69h6.45c-.28 1.48-1.12 2.74-2.38 3.58v2.98h3.86c2.26-2.08 3.57-5.15 3.57-8.77z"/>
          <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.86-2.98c-1.08.72-2.45 1.16-4.09 1.16-3.14 0-5.81-2.12-6.76-4.98H1.26v3.08C3.26 21.31 7.34 24 12 24z"/>
          <path fill="#FBBC05" d="M5.24 14.29c-.24-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.63H1.26C.46 8.23 0 10.06 0 12s.46 3.77 1.26 5.37l3.98-3.08z"/>
          <path fill="#EA4335" d="M12 4.75c1.76 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.23 0 12 0 7.34 0 3.26 2.69 1.26 6.63l3.98 3.08c.95-2.86 3.62-4.98 6.76-4.98z"/>
        </g>
      </svg>
    `,
    'instagram': `
      <svg viewBox="0 0 44 44" width="44" height="44">
        <defs>
          <radialGradient id="ig-rg" cx="15%" cy="100%" r="115%">
            <stop offset="0%" stop-color="#ffd521"/>
            <stop offset="10%" stop-color="#ffbe00"/>
            <stop offset="50%" stop-color="#d62976"/>
            <stop offset="100%" stop-color="#4f5bd5"/>
          </radialGradient>
        </defs>
        <rect width="44" height="44" rx="12" fill="url(#ig-rg)"/>
        <rect x="10" y="10" width="24" height="24" rx="7" fill="none" stroke="#ffffff" stroke-width="2.4"/>
        <circle cx="22" cy="22" r="5.6" fill="none" stroke="#ffffff" stroke-width="2.4"/>
        <circle cx="28.8" cy="15.2" r="1.5" fill="#ffffff"/>
      </svg>
    `,
    'whatsapp': `
      <svg viewBox="0 0 44 44" width="44" height="44">
        <rect width="44" height="44" rx="12" fill="#25D366"/>
        <path fill="#ffffff" d="M22.07 9C14.85 9 9 14.85 9 22.07c0 2.55.73 4.93 2 6.95L9.5 35l6.19-1.54c1.93 1.11 4.16 1.74 6.38 1.74 7.22 0 13.07-5.85 13.07-13.07S29.29 9 22.07 9zm6.41 18.15c-.27.75-1.54 1.44-2.15 1.52-.57.09-1.3.12-2.11-.14-.52-.16-1.19-.38-2.06-.76-3.66-1.59-6.03-5.32-6.21-5.56-.18-.24-1.49-1.99-1.49-3.78 0-1.79.94-2.68 1.27-3.04.34-.36.74-.46.98-.46.24 0 .49 0 .7.02.23.01.54-.09.84.64.31.75 1.07 2.6 1.16 2.79.09.19.16.42.03.66-.12.24-.18.4-.36.62-.18.22-.38.48-.55.64-.18.18-.37.38-.16.75.22.36.95 1.56 2.03 2.53 1.4 1.25 2.58 1.64 2.94 1.82.36.18.58.16.8-.1.22-.25.92-1.07 1.16-1.43.24-.36.49-.3.82-.18.34.12 2.14 1.01 2.51 1.19.36.18.61.28.7.42.09.16.09.89-.18 1.65z"/>
      </svg>
    `,
    'default': `
      <svg viewBox="0 0 44 44" width="44" height="44">
        <rect width="44" height="44" rx="12" fill="#3b82f6"/>
        <path fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" d="M18 26l8-8m-3-5l3-3a5.66 5.66 0 018 8l-3 3m-8 2l-3 3a5.66 5.66 0 01-8-8l3-3"/>
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
            iconWrap.className = 'brand-app-icon icon-' + link.type;
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
