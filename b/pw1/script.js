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

  const SUBTEXT_MAP = {
    'google-review': 'Rate our boutique & experience',
    'instagram': '@prime.watch.surat on Instagram',
    'whatsapp': 'Instant message & inquiries'
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
      document.documentElement.style.setProperty('--gold', branding.accentColor);
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

  // Fetch b.json
  fetch('b.json?t=' + Date.now())
    .then(function(res) {
      if (!res.ok) {
        throw new Error('Business profile not found (HTTP ' + res.status + ')');
      }
      return res.json();
    })
    .then(function(data) {
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid business configuration');
      }

      if (data.status === 'archived') {
        showError('Card Inactive', 'This business profile is currently archived or inactive.');
        return;
      }

      applyTheme(data.branding);

      if (data.page && data.page.title) {
        document.title = data.page.title;
      } else if (data.name) {
        document.title = data.name + ' — ' + (data.tagline || 'Official Profile');
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
            console.warn('Auto-redirect prevented:', e);
          }
          return;
        } else {
          showError('Configuration Notice', 'Google Review destination is not configured.');
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
          emptyMsg.className = 'text-muted';
          linksContainer.appendChild(emptyMsg);
        } else {
          validLinks.forEach(function(link) {
            const a = document.createElement('a');
            a.href = sanitizeUrl(link.url);
            
            let btnClass = 'btn';
            if (link.type === 'google-review') btnClass += ' btn-primary';
            else if (link.type === 'instagram') btnClass += ' btn-instagram';
            else if (link.type === 'whatsapp') btnClass += ' btn-whatsapp';
            a.className = btnClass;

            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            a.setAttribute('aria-label', link.label);

            // Icon wrapper
            const iconWrapper = document.createElement('span');
            iconWrapper.className = 'btn-icon-wrapper';
            iconWrapper.setAttribute('aria-hidden', 'true');
            const iconSpan = document.createElement('span');
            iconSpan.className = 'btn-icon';
            iconSpan.textContent = ICON_MAP[link.type] || '🔗';
            iconWrapper.appendChild(iconSpan);

            // Text group
            const textGroup = document.createElement('span');
            textGroup.className = 'btn-text-group';

            const titleSpan = document.createElement('span');
            titleSpan.className = 'btn-text';
            titleSpan.textContent = link.label || 'Visit Link';
            textGroup.appendChild(titleSpan);

            const subtext = SUBTEXT_MAP[link.type];
            if (subtext) {
              const subSpan = document.createElement('span');
              subSpan.className = 'btn-text-sub';
              subSpan.textContent = subtext;
              textGroup.appendChild(subSpan);
            }

            // Arrow
            const arrowSpan = document.createElement('span');
            arrowSpan.className = 'btn-arrow';
            arrowSpan.setAttribute('aria-hidden', 'true');
            arrowSpan.innerHTML = '&#8594;';

            a.appendChild(iconWrapper);
            a.appendChild(textGroup);
            a.appendChild(arrowSpan);

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
