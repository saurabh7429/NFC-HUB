let currentBusiness = null;
let currentConfig = null;

// Initial bootstrap
document.addEventListener('DOMContentLoaded', () => {
  loadCatalogue();
  loadGlobalConfig();
});

function showAlert(message, type = 'success') {
  const banner = document.getElementById('alert-banner');
  banner.textContent = message;
  banner.className = `alert-banner alert-${type}`;
  banner.style.display = 'block';
  setTimeout(() => {
    banner.style.display = 'none';
  }, 4000);
}

function switchView(viewName) {
  const catalogueContainer = document.getElementById('view-catalogue-container');
  const editorContainer = document.getElementById('view-editor-container');
  const studioContainer = document.getElementById('view-studio-container');
  const settingsContainer = document.getElementById('view-settings-container');

  const navCatalogue = document.getElementById('nav-catalogue');
  const navStudio = document.getElementById('nav-studio');
  const navSettings = document.getElementById('nav-settings');
  const viewTitle = document.getElementById('view-title');
  const viewSubtitle = document.getElementById('view-subtitle');

  catalogueContainer.style.display = 'none';
  editorContainer.style.display = 'none';
  if (studioContainer) studioContainer.style.display = 'none';
  settingsContainer.style.display = 'none';

  navCatalogue.classList.remove('active');
  if (navStudio) navStudio.classList.remove('active');
  navSettings.classList.remove('active');

  if (viewName === 'catalogue') {
    catalogueContainer.style.display = 'block';
    navCatalogue.classList.add('active');
    viewTitle.textContent = 'Business Catalogue';
    viewSubtitle.textContent = 'Manage micro-sites, routing modes, and physical cards';
    loadCatalogue();
  } else if (viewName === 'editor') {
    editorContainer.style.display = 'block';
    viewTitle.textContent = 'Business Editor';
    viewSubtitle.textContent = `Editing ${currentBusiness?.name || 'Business'}`;
  } else if (viewName === 'studio') {
    if (studioContainer) studioContainer.style.display = 'block';
    if (navStudio) navStudio.classList.add('active');
    viewTitle.textContent = 'Card Print Studio';
    viewSubtitle.textContent = `Card Artwork & QR Placement for ${studioBusiness?.name || 'Business'}`;
  } else if (viewName === 'settings') {
    settingsContainer.style.display = 'block';
    navSettings.classList.add('active');
    viewTitle.textContent = 'Platform Settings';
    viewSubtitle.textContent = 'Configure canonical domain, print defaults, and verification rules';
    loadGlobalConfig();
  }
}

// Catalogue Functions
async function loadCatalogue() {
  try {
    const res = await fetch('/api/businesses');
    const json = await res.json();
    if (!json.success) throw new Error(json.error);

    renderCatalogue(json.data);
  } catch (err) {
    showAlert(`Failed to load businesses: ${err.message}`, 'error');
  }
}

function renderCatalogue(businesses) {
  const grid = document.getElementById('business-grid');
  grid.innerHTML = '';

  let publishedCount = 0;
  let draftCount = 0;
  let archivedCount = 0;

  businesses.forEach(b => {
    if (b.status === 'published') publishedCount++;
    else if (b.status === 'archived') archivedCount++;
    else draftCount++;

    const card = document.createElement('div');
    card.className = 'business-card';
    card.innerHTML = `
      <div>
        <div class="business-card-header">
          <div class="business-title-group">
            <h3>${escapeHtml(b.name)}</h3>
            <span class="business-id-tag">/b/${escapeHtml(b.id)}/</span>
          </div>
          <span class="badge badge-${b.status}">${b.status}</span>
        </div>
        <div class="business-card-body">
          <div class="business-card-meta">
            <span><strong>Mode:</strong> ${b.mode === 'direct-review' ? 'Direct Forwarding' : 'Link Hub'}</span>
            <span><strong>Active Links:</strong> ${b.enabledLinksCount || 0} / ${b.linksCount || 0}</span>
            <span><strong>URL:</strong> <code>${escapeHtml(b.canonicalPath || '')}</code></span>
          </div>
        </div>
      </div>
      <div class="business-card-actions">
        <button class="btn btn-sm btn-primary" onclick="openEditor('${b.id}')">Edit Profile</button>
        <button class="btn btn-sm btn-secondary" onclick="duplicateBusinessAction('${b.id}')">Duplicate</button>
        ${b.status === 'archived'
          ? `<button class="btn btn-sm btn-secondary" onclick="restoreBusinessAction('${b.id}')">Restore</button>`
          : `<button class="btn btn-sm btn-danger" onclick="archiveBusinessAction('${b.id}')">Archive</button>`
        }
      </div>
    `;
    grid.appendChild(card);
  });

  document.getElementById('stat-total').textContent = businesses.length;
  document.getElementById('stat-published').textContent = publishedCount;
  document.getElementById('stat-drafts').textContent = draftCount;
  document.getElementById('stat-archived').textContent = archivedCount;
}

// Editor Functions
async function openEditor(businessId) {
  try {
    const res = await fetch(`/api/businesses/${businessId}`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error);

    currentBusiness = json.data;
    populateEditor(currentBusiness, json.meta?.canonicalUrl);
    switchView('editor');
  } catch (err) {
    showAlert(`Failed to load business: ${err.message}`, 'error');
  }
}

function closeEditor() {
  currentBusiness = null;
  switchView('catalogue');
}

function populateEditor(b, canonicalUrl) {
  document.getElementById('edit-id').value = b.id;
  document.getElementById('edit-status').value = b.status;
  document.getElementById('edit-name').value = b.name;
  document.getElementById('edit-tagline').value = b.tagline || '';
  document.getElementById('edit-theme').value = b.branding.theme || 'light';
  document.getElementById('edit-accent').value = b.branding.accentColor || '#1d4ed8';
  document.getElementById('edit-accent-picker').value = b.branding.accentColor || '#1d4ed8';

  // Logo preview
  const logoBox = document.getElementById('logo-preview-box');
  const logoImg = document.getElementById('logo-img-preview');
  const logoPlaceholder = document.getElementById('logo-placeholder');
  if (b.branding.logo) {
    logoImg.src = `/b/${b.id}/${b.branding.logo}?t=${Date.now()}`;
    logoImg.style.display = 'block';
    logoPlaceholder.style.display = 'none';
  } else {
    logoImg.style.display = 'none';
    logoPlaceholder.style.display = 'block';
  }

  // Page Mode
  if (b.page.mode === 'direct-review') {
    document.getElementById('mode-direct-review').checked = true;
  } else {
    document.getElementById('mode-link-hub').checked = true;
  }

  // Links
  renderLinksEditor(b.links || []);

  // Preview Iframe
  const previewIframe = document.getElementById('preview-iframe');
  previewIframe.src = `/b/${b.id}/?preview=1&t=${Date.now()}`;
  document.getElementById('btn-open-preview').href = `/b/${b.id}/`;
  document.getElementById('preview-canonical-url').textContent = canonicalUrl || `/b/${b.id}/`;
}

function renderLinksEditor(links) {
  const container = document.getElementById('links-editor-list');
  container.innerHTML = '';

  links.forEach((link, idx) => {
    const row = document.createElement('div');
    row.className = 'link-row';
    row.innerHTML = `
      <select onchange="updateLinkItem(${idx}, 'type', this.value)">
        <option value="google-review" ${link.type === 'google-review' ? 'selected' : ''}>Google Review</option>
        <option value="instagram" ${link.type === 'instagram' ? 'selected' : ''}>Instagram</option>
        <option value="whatsapp" ${link.type === 'whatsapp' ? 'selected' : ''}>WhatsApp</option>
        <option value="website" ${link.type === 'website' ? 'selected' : ''}>Website</option>
        <option value="phone" ${link.type === 'phone' ? 'selected' : ''}>Phone</option>
        <option value="custom" ${link.type === 'custom' ? 'selected' : ''}>Custom</option>
      </select>
      <input type="text" value="${escapeHtml(link.label)}" placeholder="Label" onchange="updateLinkItem(${idx}, 'label', this.value)">
      <input type="url" value="${escapeHtml(link.url)}" placeholder="https://..." onchange="updateLinkItem(${idx}, 'url', this.value)">
      <label style="display:flex; align-items:center; gap:4px; font-size:0.8rem;">
        <input type="checkbox" ${link.enabled ? 'checked' : ''} onchange="updateLinkItem(${idx}, 'enabled', this.checked)"> Active
      </label>
      <button type="button" class="btn btn-sm btn-danger" onclick="removeLinkItem(${idx})">✕</button>
    `;
    container.appendChild(row);
  });
}

function addNewLinkRow() {
  if (!currentBusiness.links) currentBusiness.links = [];
  currentBusiness.links.push({
    id: `link_${Date.now()}`,
    type: 'custom',
    label: 'New Link',
    url: 'https://',
    enabled: true,
    order: currentBusiness.links.length + 1
  });
  renderLinksEditor(currentBusiness.links);
}

function updateLinkItem(index, key, value) {
  if (currentBusiness.links && currentBusiness.links[index]) {
    currentBusiness.links[index][key] = value;
  }
}

function removeLinkItem(index) {
  if (currentBusiness.links) {
    currentBusiness.links.splice(index, 1);
    renderLinksEditor(currentBusiness.links);
  }
}

function syncColorInput(val) {
  document.getElementById('edit-accent').value = val;
}

async function handleLogoUpload(input) {
  if (!input.files || !input.files[0] || !currentBusiness) return;
  const file = input.files[0];
  const formData = new FormData();
  formData.append('asset', file);

  try {
    const res = await fetch(`/api/businesses/${currentBusiness.id}/upload`, {
      method: 'POST',
      body: formData
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);

    currentBusiness.branding.logo = json.path;
    const logoImg = document.getElementById('logo-img-preview');
    logoImg.src = `/b/${currentBusiness.id}/${json.path}?t=${Date.now()}`;
    logoImg.style.display = 'block';
    document.getElementById('logo-placeholder').style.display = 'none';

    // Refresh iframe
    document.getElementById('preview-iframe').src = `/b/${currentBusiness.id}/?t=${Date.now()}`;
    showAlert('Logo uploaded and applied');
  } catch (err) {
    showAlert(`Upload failed: ${err.message}`, 'error');
  }
}

async function saveCurrentBusiness() {
  if (!currentBusiness) return;

  currentBusiness.status = document.getElementById('edit-status').value;
  currentBusiness.name = document.getElementById('edit-name').value.trim();
  currentBusiness.tagline = document.getElementById('edit-tagline').value.trim();
  currentBusiness.branding.theme = document.getElementById('edit-theme').value;
  currentBusiness.branding.accentColor = document.getElementById('edit-accent').value.trim() || '#1d4ed8';

  const mode = document.getElementById('mode-direct-review').checked ? 'direct-review' : 'link-hub';
  currentBusiness.page.mode = mode;
  currentBusiness.page.title = currentBusiness.name;

  try {
    const res = await fetch(`/api/businesses/${currentBusiness.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(currentBusiness)
    });
    const json = await res.json();
    if (!json.success) {
      if (json.details) {
        throw new Error(json.details.map(d => `${d.instancePath || 'root'} ${d.message}`).join(', '));
      }
      throw new Error(json.error);
    }

    currentBusiness = json.data;
    showAlert(`Business "${currentBusiness.name}" saved atomically`);
    // Reload preview
    document.getElementById('preview-iframe').src = `/b/${currentBusiness.id}/?t=${Date.now()}`;
  } catch (err) {
    showAlert(`Save failed: ${err.message}`, 'error');
  }
}

// Duplication, Archive & Restore Actions
async function duplicateBusinessAction(id) {
  try {
    const res = await fetch(`/api/businesses/${id}/duplicate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);

    showAlert(`Duplicated business as ${json.data.id}`);
    loadCatalogue();
  } catch (err) {
    showAlert(`Duplicate failed: ${err.message}`, 'error');
  }
}

async function archiveBusinessAction(id) {
  if (!confirm(`Are you sure you want to archive business "${id}"?`)) return;
  try {
    const res = await fetch(`/api/businesses/${id}/archive`, { method: 'POST' });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);

    showAlert(`Business ${id} archived`);
    loadCatalogue();
  } catch (err) {
    showAlert(`Archive failed: ${err.message}`, 'error');
  }
}

async function restoreBusinessAction(id) {
  try {
    const res = await fetch(`/api/businesses/${id}/restore`, { method: 'POST' });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);

    showAlert(`Business ${id} restored`);
    loadCatalogue();
  } catch (err) {
    showAlert(`Restore failed: ${err.message}`, 'error');
  }
}

// Modal Add Business
function openNewBusinessModal() {
  document.getElementById('modal-add-business').style.display = 'flex';
}

function closeNewBusinessModal() {
  document.getElementById('modal-add-business').style.display = 'none';
  document.getElementById('form-add-business').reset();
}

async function handleCreateBusiness(event) {
  event.preventDefault();
  const name = document.getElementById('new-name').value.trim();
  const id = document.getElementById('new-id').value.trim();
  const mode = document.getElementById('new-mode').value;
  const googleReviewUrl = document.getElementById('new-google-url').value.trim();

  try {
    const res = await fetch('/api/businesses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, id, mode, googleReviewUrl })
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);

    closeNewBusinessModal();
    showAlert(`Business "${json.data.name}" created at /b/${json.data.id}/`);
    loadCatalogue();
    openEditor(json.data.id);
  } catch (err) {
    showAlert(`Creation failed: ${err.message}`, 'error');
  }
}

// Global Settings Functions
async function loadGlobalConfig() {
  try {
    const res = await fetch('/api/config');
    const json = await res.json();
    if (!json.success) throw new Error(json.error);

    currentConfig = json.data;
    document.getElementById('cfg-public-url').value = currentConfig.publicBaseUrl;
    document.getElementById('cfg-route-prefix').value = currentConfig.businessRoutePrefix;
    document.getElementById('cfg-trim-w').value = currentConfig.defaultCardTrimMm.width;
    document.getElementById('cfg-trim-h').value = currentConfig.defaultCardTrimMm.height;
    document.getElementById('cfg-raster-dpi').value = currentConfig.rasterDpi;
    document.getElementById('cfg-allow-unverified-export').checked = !!currentConfig.allowFinalExportBeforePublish;
  } catch (err) {
    showAlert(`Failed to load config: ${err.message}`, 'error');
  }
}

async function saveSettings() {
  if (!currentConfig) return;

  const updatedConfig = {
    ...currentConfig,
    publicBaseUrl: document.getElementById('cfg-public-url').value.trim(),
    businessRoutePrefix: document.getElementById('cfg-route-prefix').value.trim(),
    defaultCardTrimMm: {
      width: parseFloat(document.getElementById('cfg-trim-w').value),
      height: parseFloat(document.getElementById('cfg-trim-h').value)
    },
    rasterDpi: parseInt(document.getElementById('cfg-raster-dpi').value, 10),
    allowFinalExportBeforePublish: document.getElementById('cfg-allow-unverified-export').checked
  };

  try {
    const res = await fetch('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedConfig)
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);

    currentConfig = json.data;
    showAlert('Global settings updated successfully');
  } catch (err) {
    showAlert(`Save settings failed: ${err.message}`, 'error');
  }
}

// ==========================================================================
// Card Print Studio Functions
// ==========================================================================
let studioBusiness = null;
let studioThemes = [];
let allBusinessesCache = [];

async function openStudioForCurrent() {
  if (currentBusiness) {
    await openStudio(currentBusiness.id);
  } else {
    openStudioForCurrentOrFirst();
  }
}

async function openStudioForCurrentOrFirst() {
  if (currentBusiness) {
    await openStudio(currentBusiness.id);
  } else {
    try {
      const res = await fetch('/api/businesses');
      const json = await res.json();
      if (json.success && json.data.length > 0) {
        await openStudio(json.data[0].id);
      } else {
        showAlert('Please create at least one business before opening Card Studio', 'error');
        switchView('catalogue');
      }
    } catch (e) {
      showAlert('Failed to load businesses for Studio', 'error');
    }
  }
}

async function openStudio(businessId) {
  try {
    const [bizRes, themesRes] = await Promise.all([
      fetch(`/api/businesses/${businessId}`),
      fetch('/api/themes')
    ]);

    const bizJson = await bizRes.json();
    const themesJson = await themesRes.json();

    if (!bizJson.success) throw new Error(bizJson.error);
    studioBusiness = bizJson.data;
    studioThemes = themesJson.data || [];

    // Populate business select dropdown
    const resAll = await fetch('/api/businesses');
    const allJson = await resAll.json();
    allBusinessesCache = allJson.data || [];

    const selectEl = document.getElementById('studio-business-select');
    selectEl.innerHTML = '';
    allBusinessesCache.forEach(b => {
      const opt = document.createElement('option');
      opt.value = b.id;
      opt.textContent = `${b.name} (/b/${b.id}/)`;
      if (b.id === studioBusiness.id) opt.selected = true;
      selectEl.appendChild(opt);
    });

    renderThemesInStudio();
    populateStudioControls();
    switchView('studio');
    refreshStudioPreview();
  } catch (err) {
    showAlert(`Failed to open studio: ${err.message}`, 'error');
  }
}

async function loadBusinessIntoStudio(businessId) {
  await openStudio(businessId);
}

function renderThemesInStudio() {
  const grid = document.getElementById('studio-themes-grid');
  grid.innerHTML = '';

  studioThemes.forEach(th => {
    const card = document.createElement('div');
    const isSelected = studioBusiness.card?.themeId === th.id && !studioBusiness.card?.referenceImage;
    card.className = `theme-card-option ${isSelected ? 'active' : ''}`;
    card.id = `theme-opt-${th.id}`;
    card.onclick = () => selectThemeForStudio(th.id);
    card.innerHTML = `
      <img src="${th.thumbUrl}" alt="${th.name}">
      <span class="theme-card-name">${escapeHtml(th.name)}</span>
    `;
    grid.appendChild(card);
  });
}

function selectThemeForStudio(themeId) {
  if (!studioBusiness.card) studioBusiness.card = {};
  studioBusiness.card.themeId = themeId;
  studioBusiness.card.referenceImage = null; // Clear custom art when selecting theme

  const theme = studioThemes.find(t => t.id === themeId);
  if (theme && theme.qrSlotMm) {
    studioBusiness.card.qr = {
      xMm: theme.qrSlotMm.x,
      yMm: theme.qrSlotMm.y,
      sizeMm: theme.qrSlotMm.width
    };
  }

  document.querySelectorAll('.theme-card-option').forEach(el => el.classList.remove('active'));
  const activeEl = document.getElementById(`theme-opt-${themeId}`);
  if (activeEl) activeEl.classList.add('active');

  document.getElementById('studio-custom-art-label').textContent = 'None';
  populateStudioControls();
  refreshStudioPreview();
}

function populateStudioControls() {
  const card = studioBusiness.card || {};
  const qr = card.qr || { xMm: 56, yMm: 14, sizeMm: 24 };

  document.getElementById('studio-qr-x').value = qr.xMm;
  document.getElementById('studio-qr-y').value = qr.yMm;
  document.getElementById('studio-qr-size').value = qr.sizeMm;

  if (card.referenceImage) {
    document.getElementById('studio-custom-art-label').textContent = card.referenceImage;
    document.querySelectorAll('.theme-card-option').forEach(el => el.classList.remove('active'));
  } else {
    document.getElementById('studio-custom-art-label').textContent = 'None';
  }

  // Publication gate check
  const noticeEl = document.getElementById('studio-export-gate-notice');
  const isVerified = studioBusiness.status === 'published' && studioBusiness.publish?.verifiedAt;
  if (!isVerified) {
    noticeEl.style.display = 'block';
    noticeEl.innerHTML = `⚠️ <strong>Unverified URL Notice:</strong> Business status is "${studioBusiness.status}". Exports will have a <em>PREVIEW • NOT FOR PRINT</em> watermark until deployment is verified.`;
  } else {
    noticeEl.style.display = 'none';
  }
}

function updateQrCoordinatesFromInputs() {
  if (!studioBusiness || !studioBusiness.card) return;
  const x = parseFloat(document.getElementById('studio-qr-x').value) || 0;
  const y = parseFloat(document.getElementById('studio-qr-y').value) || 0;
  const size = parseFloat(document.getElementById('studio-qr-size').value) || 20;

  studioBusiness.card.qr = { xMm: x, yMm: y, sizeMm: size };
  renderQrOverlayBox();
}

function renderQrOverlayBox() {
  const overlay = document.getElementById('studio-qr-overlay');
  const qr = studioBusiness.card?.qr || { xMm: 56, yMm: 14, sizeMm: 24 };
  const showBleed = document.getElementById('studio-preview-bleed').value === 'true';
  const bleedMm = showBleed ? (studioBusiness.card.bleedMm || 3) : 0;
  const totalWidthMm = (studioBusiness.card.trimMm?.width || 85.6) + (bleedMm * 2);
  const totalHeightMm = (studioBusiness.card.trimMm?.height || 53.98) + (bleedMm * 2);

  const wrapper = document.getElementById('card-canvas-wrapper');
  const wrapperW = wrapper.clientWidth || 500;
  const wrapperH = wrapper.clientHeight || 327;

  const scaleX = wrapperW / totalWidthMm;
  const scaleY = wrapperH / totalHeightMm;

  const leftPx = (qr.xMm + bleedMm) * scaleX;
  const topPx = (qr.yMm + bleedMm) * scaleY;
  const sizePx = qr.sizeMm * scaleX;

  overlay.style.left = `${leftPx}px`;
  overlay.style.top = `${topPx}px`;
  overlay.style.width = `${sizePx}px`;
  overlay.style.height = `${sizePx}px`;
}

function refreshStudioPreview() {
  if (!studioBusiness) return;
  const bleed = document.getElementById('studio-preview-bleed').value;
  const previewImg = document.getElementById('studio-card-preview-img');
  previewImg.src = `/api/businesses/${studioBusiness.id}/card/preview?bleed=${bleed}&t=${Date.now()}`;
  renderQrOverlayBox();
}

async function handleReferenceImageUpload(input) {
  if (!input.files || !input.files[0] || !studioBusiness) return;
  const file = input.files[0];
  const formData = new FormData();
  formData.append('asset', file);

  try {
    const res = await fetch(`/api/businesses/${studioBusiness.id}/upload?type=reference`, {
      method: 'POST',
      body: formData
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);

    studioBusiness.card.referenceImage = json.path;
    studioBusiness.card.themeId = null; // Custom art takes precedence over built-in theme
    document.getElementById('studio-custom-art-label').textContent = json.path;
    document.querySelectorAll('.theme-card-option').forEach(el => el.classList.remove('active'));

    showAlert('Custom reference card artwork uploaded');
    refreshStudioPreview();
  } catch (err) {
    showAlert(`Upload failed: ${err.message}`, 'error');
  }
}

async function saveStudioCardSettings() {
  if (!studioBusiness) return;
  updateQrCoordinatesFromInputs();

  try {
    const res = await fetch(`/api/businesses/${studioBusiness.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(studioBusiness)
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);

    studioBusiness = json.data;
    showAlert('Card layout & QR placement saved');
    refreshStudioPreview();
  } catch (err) {
    showAlert(`Failed to save card settings: ${err.message}`, 'error');
  }
}

async function verifyQrInStudio() {
  if (!studioBusiness) return;
  const statusContent = document.getElementById('preflight-status-content');
  statusContent.innerHTML = '<p class="text-muted">Decoding QR from composed 300 DPI canvas...</p>';

  try {
    const res = await fetch(`/api/businesses/${studioBusiness.id}/card/verify-qr`);
    const json = await res.json();

    if (json.matched) {
      statusContent.innerHTML = `
        <span class="preflight-badge passed">✓ QR Verified & Decodable</span>
        <p><strong>Decoded URL:</strong> <code>${escapeHtml(json.decodedUrl)}</code></p>
        <p><strong>Fidelity:</strong> Exact match with canonical URL at 300 DPI (${json.dimensions.widthPx} × ${json.dimensions.heightPx} px).</p>
      `;
    } else {
      statusContent.innerHTML = `
        <span class="preflight-badge failed">✕ Verification Failed</span>
        <p><strong>Error:</strong> ${escapeHtml(json.error || 'Decoded URL mismatch')}</p>
        <p>Expected: <code>${escapeHtml(json.expectedUrl)}</code></p>
        <p>Decoded: <code>${escapeHtml(json.decodedUrl || 'None')}</code></p>
      `;
    }
  } catch (err) {
    statusContent.innerHTML = `<span class="preflight-badge failed">Preflight Error</span><p>${escapeHtml(err.message)}</p>`;
  }
}

function downloadCardExport(format) {
  if (!studioBusiness) return;
  const url = `/api/businesses/${studioBusiness.id}/card/export/${format}?save=true`;
  window.open(url, '_blank');
}

