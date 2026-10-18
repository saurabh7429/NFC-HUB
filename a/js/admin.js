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
  const settingsContainer = document.getElementById('view-settings-container');

  const navCatalogue = document.getElementById('nav-catalogue');
  const navSettings = document.getElementById('nav-settings');
  const viewTitle = document.getElementById('view-title');
  const viewSubtitle = document.getElementById('view-subtitle');

  catalogueContainer.style.display = 'none';
  editorContainer.style.display = 'none';
  settingsContainer.style.display = 'none';

  navCatalogue.classList.remove('active');
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

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
