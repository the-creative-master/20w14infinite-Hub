(() => {
  'use strict';

  const STORAGE_KEY_DIMENSIONS = '20w14infinite_dimensions';
  const LEGACY_KEYS = ['20w14infinite_dimensions_v2', '20w14infinite_dimensions_v1'];
  const STORAGE_KEY_LIKED = '20w14infinite_liked_ids';
  const STORAGE_KEY_DRAFT = '20w14infinite_form_draft';

  const PRESET_IDS = new Set([
    'dim-isolation',
    'dim-skygrid',
    'dim-library',
    'dim-slime',
    'dim-diamond-abyss'
  ]);

  let dimensions = [];
  let likedIds = new Set();
  let activeSort = 'newest';
  let searchQuery = '';

  let formImages = [];
  let selectedEntities = [];
  let activeDetailDimensionId = null;

  // DOM Elements
  const dimensionsGrid = document.getElementById('dimensionsGrid');
  const emptyHubState = document.getElementById('emptyHubState');
  const emptyStateTitle = document.getElementById('emptyStateTitle');
  const emptyStateDesc = document.getElementById('emptyStateDesc');
  const resetFiltersBtn = document.getElementById('resetFiltersBtn');

  const statTotalDimensions = document.getElementById('statTotalDimensions');
  const statTotalImages = document.getElementById('statTotalImages');
  const statUniqueEntities = document.getElementById('statUniqueEntities');
  const searchInput = document.getElementById('searchInput');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  const sortSelect = document.getElementById('sortSelect');

  // Modal Elements
  const addDimensionModal = document.getElementById('addDimensionModal');
  const modalTitle = document.getElementById('modalTitle');
  const dimensionForm = document.getElementById('dimensionForm');
  const editingDimensionIdInput = document.getElementById('editingDimensionId');
  const formErrorBanner = document.getElementById('formErrorBanner');
  const draftStatusPill = document.getElementById('draftStatusPill');

  const dimensionNameInput = document.getElementById('dimensionNameInput');
  const bookTextInput = document.getElementById('bookTextInput');
  const liveWarpCommand = document.getElementById('liveWarpCommand');
  const liveDimensionId = document.getElementById('liveDimensionId');
  const descriptionInput = document.getElementById('descriptionInput');

  const imageDropzone = document.getElementById('imageDropzone');
  const imageFileInput = document.getElementById('imageFileInput');
  const browseImagesBtn = document.getElementById('browseImagesBtn');
  const imageUrlInput = document.getElementById('imageUrlInput');
  const addImageUrlBtn = document.getElementById('addImageUrlBtn');
  const uploadedImagesGrid = document.getElementById('uploadedImagesGrid');
  const imageCountPill = document.getElementById('imageCountPill');

  const portalColorPicker = document.getElementById('portalColorPicker');
  const portalColorHexInput = document.getElementById('portalColorHexInput');
  const clearPortalColorBtn = document.getElementById('clearPortalColorBtn');

  const selectedEntitiesBox = document.getElementById('selectedEntitiesBox');
  const customEntityInput = document.getElementById('customEntityInput');
  const addCustomEntityBtn = document.getElementById('addCustomEntityBtn');
  const clearEntitiesBtn = document.getElementById('clearEntitiesBtn');

  const nicknameInput = document.getElementById('nicknameInput');
  const setAnonymousBtn = document.getElementById('setAnonymousBtn');
  const formAvatarPreview = document.getElementById('formAvatarPreview');

  // Detail Modal Elements
  const detailModal = document.getElementById('detailModal');
  const detailModalTitle = document.getElementById('detailModalTitle');
  const detailModalMeta = document.getElementById('detailModalMeta');
  const detailModalContent = document.getElementById('detailModalContent');
  const detailEditBtn = document.getElementById('detailEditBtn');
  const detailDeleteBtn = document.getElementById('detailDeleteBtn');

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function showToast(message) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.2s ease';
      setTimeout(() => toast.remove(), 220);
    }, 2800);
  }

  function computeClientHash(text) {
    const str = `${text || ''}:why_so_salty#LazyCrypto`;
    let h1 = 0xdeadbeef ^ str.length;
    let h2 = 0x41c6ce57 ^ str.length;
    for (let i = 0; i < str.length; i++) {
      const ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    const dimId = (h1 >>> 0) & 0x7fffffff;
    const r = Math.max(65, (h1 >>> 16) & 0xff);
    const g = Math.max(65, (h2 >>> 8) & 0xff);
    const b = Math.max(65, h2 & 0xff);
    const hex = '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
    return { dimensionId: dimId, derivedColor: hex };
  }

  function isValidHexColor(str) {
    return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(String(str || '').trim());
  }

  function generatePlayerHeadSvg(nickname) {
    const name = (nickname || 'Anonymous').trim();
    const isAnon = name.toLowerCase() === 'anonymous' || !name;
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
    }

    const skinTones = ['#d2996c', '#e0ac69', '#f1c27d', '#c68642', '#8d5524'];
    const hairColors = ['#271811', '#18181b', '#451a03', '#7c2d12', '#4f46e5', '#0f766e'];
    const eyeColors = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899'];

    const skin = isAnon ? '#27272a' : skinTones[hash % skinTones.length];
    const hair = isAnon ? '#18181b' : hairColors[(hash >> 3) % hairColors.length];
    const eyes = isAnon ? '#a78bfa' : eyeColors[(hash >> 6) % eyeColors.length];

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8" shape-rendering="crispEdges">
      <rect width="8" height="8" fill="${skin}"/>
      <rect x="0" y="0" width="8" height="2" fill="${hair}"/>
      <rect x="0" y="2" width="1" height="2" fill="${hair}"/>
      <rect x="7" y="2" width="1" height="2" fill="${hair}"/>
      <rect x="1" y="4" width="1" height="1" fill="#ffffff"/>
      <rect x="2" y="4" width="1" height="1" fill="${eyes}"/>
      <rect x="6" y="4" width="1" height="1" fill="#ffffff"/>
      <rect x="5" y="4" width="1" height="1" fill="${eyes}"/>
      <rect x="2" y="6" width="4" height="1" fill="#18181b" opacity="0.55"/>
    </svg>`;
  }

  function generatePlayerHeadDataUri(nickname) {
    return `data:image/svg+xml;utf8,${encodeURIComponent(generatePlayerHeadSvg(nickname))}`;
  }

  function formatRelativeTime(isoDate) {
    if (!isoDate) return 'Just now';
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return 'Recently';
    const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diffSec < 45) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  // =========================================================================
  // DURABLE STORAGE LAYER — IndexedDB first, then localStorage, then memory.
  //
  // The browser-side copy of the Hub (dimensions cache, likes, form draft)
  // lives in IndexedDB: it survives normal browsing, holds hundreds of MB
  // (screenshots are stored as data URLs, which blow past localStorage's
  // ~5MB quota fast), and is far more robust than cookie-adjacent storage.
  //
  // The PERMANENT home of the Hub is the server's data/dimensions.json file:
  // even if a visitor wipes all browser storage, the full Hub is re-fetched
  // from the server on the next load (see initAndSyncSharedHub).
  // =========================================================================
  const IDB_NAME = '20w14infinite-hub';
  const IDB_VERSION = 1;
  const IDB_STORE = 'kv';
  const IDB_KEY_DIMENSIONS = 'dimensions';
  const IDB_KEY_LIKED = 'likedIds';
  const IDB_KEY_DRAFT = 'formDraft';

  let idbConnection = null;

  function openIdb() {
    if (idbConnection) return idbConnection;
    idbConnection = new Promise((resolve) => {
      let settled = false;
      const fail = () => {
        if (settled) return;
        settled = true;
        resolve(null); // null = IndexedDB unavailable → use fallbacks
      };
      try {
        if (typeof indexedDB === 'undefined' || !indexedDB) return fail();
        const req = indexedDB.open(IDB_NAME, IDB_VERSION);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(IDB_STORE)) {
            db.createObjectStore(IDB_STORE);
          }
        };
        req.onsuccess = () => {
          if (settled) return;
          settled = true;
          const db = req.result;
          db.onversionchange = () => {
            try { db.close(); } catch (_) {}
          };
          resolve(db);
        };
        req.onerror = fail;
        req.onblocked = fail;
      } catch (_) {
        fail();
      }
    });
    return idbConnection;
  }

  function idbRun(mode, operation) {
    return openIdb().then(
      (db) =>
        new Promise((resolve, reject) => {
          if (!db) {
            reject(new Error('IndexedDB unavailable'));
            return;
          }
          let tx;
          try {
            tx = db.transaction(IDB_STORE, mode);
          } catch (e) {
            reject(e);
            return;
          }
          let request;
          try {
            request = operation(tx.objectStore(IDB_STORE));
          } catch (e) {
            reject(e);
            return;
          }
          if (request && request.onerror) {
            request.onerror = () => reject(request.error);
          }
          tx.oncomplete = () => resolve(request ? request.result : undefined);
          tx.onabort = () => reject(tx.error || new Error('IndexedDB transaction aborted'));
          tx.onerror = () => reject(tx.error || new Error('IndexedDB transaction failed'));
        })
    );
  }

  function idbGet(key) {
    return idbRun('readonly', (store) => store.get(key));
  }

  function idbSet(key, value) {
    return idbRun('readwrite', (store) => store.put(value, key));
  }

  function idbDelete(key) {
    return idbRun('readwrite', (store) => store.delete(key));
  }

  // ---- localStorage / memory fallbacks (used only if IndexedDB fails) ----
  function lsGetJson(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? undefined : JSON.parse(raw);
    } catch (_) {
      return undefined;
    }
  }

  function lsSetJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (_) {
      return false;
    }
  }

  function lsRemove(key) {
    try {
      localStorage.removeItem(key);
    } catch (_) {}
  }

  const memoryStore = new Map();
  // All writes are serialized through one promise chain so a slow earlier
  // write can never overwrite the result of a newer one.
  let storageWriteChain = Promise.resolve();
  let warnedStorageFallback = false;

  async function storageGet(key) {
    try {
      const value = await idbGet(key);
      if (value !== undefined) return value;
    } catch (_) {
      // IndexedDB unavailable — fall through to the next tier.
    }
    const lsValue = lsGetJson(key);
    if (lsValue !== undefined) return lsValue;
    return memoryStore.has(key) ? memoryStore.get(key) : undefined;
  }

  function storageSet(key, value) {
    storageWriteChain = storageWriteChain.then(async () => {
      let savedToIdb = false;
      try {
        await idbSet(key, value);
        savedToIdb = true;
      } catch (_) {}
      if (savedToIdb) {
        // The IndexedDB copy is authoritative — drop any stale localStorage
        // copy so old data can never resurrect itself over newer data.
        lsRemove(key);
        return;
      }
      if (lsSetJson(key, value)) {
        if (!warnedStorageFallback) {
          warnedStorageFallback = true;
          console.warn(
            '20w14infinite-Hub: IndexedDB is unavailable — falling back to localStorage.'
          );
        }
        return;
      }
      memoryStore.set(key, value);
    });
    return storageWriteChain;
  }

  function storageDelete(key) {
    storageWriteChain = storageWriteChain.then(async () => {
      try {
        await idbDelete(key);
      } catch (_) {}
      lsRemove(key);
      memoryStore.delete(key);
    });
    return storageWriteChain;
  }

  // =========================================================================
  // SHARED SERVER STORAGE + LOCAL CACHE SYNC
  // =========================================================================
  function normalizeDimensionItem(item) {
    const bookText = String(item.bookText || '').trim();
    const name = String(item.name || item.title || bookText || 'Untitled Dimension').trim();
    const nickname = String(item.nickname || item.username || 'Anonymous').trim() || 'Anonymous';
    const { dimensionId, derivedColor } = computeClientHash(bookText);
    return {
      ...item,
      id: String(item.id || `dim-${Date.now()}`),
      name,
      title: name,
      bookText,
      description: String(item.description || '').trim(),
      images: Array.isArray(item.images) ? item.images : [],
      portalColor: item.portalColor || null,
      entities: Array.isArray(item.entities) ? item.entities : [],
      nickname,
      username: nickname,
      dimensionId: item.dimensionId || dimensionId,
      derivedColor: item.derivedColor || derivedColor,
      likes: typeof item.likes === 'number' ? item.likes : 0,
      createdAt: item.createdAt || new Date().toISOString()
    };
  }

  async function loadCachedDimensions() {
    const seenIds = new Set();
    const merged = [];
    const pushAll = (list) => {
      if (!Array.isArray(list)) return;
      for (const item of list) {
        if (!item || !item.id || PRESET_IDS.has(item.id)) continue;
        if (seenIds.has(item.id)) continue;
        seenIds.add(item.id);
        merged.push(normalizeDimensionItem(item));
      }
    };

    let idbOk = true;
    let idbList;
    try {
      idbList = await idbGet(IDB_KEY_DIMENSIONS);
    } catch (_) {
      idbOk = false;
    }

    let migratedFromLocalStorage = false;

    if (idbOk) {
      pushAll(idbList);
      // One-time rescue: older versions of the Hub kept dimensions in
      // localStorage — import them into IndexedDB, then clear the old keys.
      const legacyLists = [
        lsGetJson(STORAGE_KEY_DIMENSIONS),
        ...LEGACY_KEYS.map((k) => lsGetJson(k))
      ];
      const hadLegacyData = legacyLists.some((l) => Array.isArray(l) && l.length > 0);
      legacyLists.forEach(pushAll);
      if (hadLegacyData) {
        migratedFromLocalStorage = true;
        storageSet(IDB_KEY_DIMENSIONS, merged);
        lsRemove(STORAGE_KEY_DIMENSIONS);
        LEGACY_KEYS.forEach(lsRemove);
      } else if (idbList === undefined) {
        // First ever run with IndexedDB — establish the durable store.
        storageSet(IDB_KEY_DIMENSIONS, merged);
      }
    } else {
      // IndexedDB unavailable: keep the legacy localStorage behaviour.
      pushAll(lsGetJson(STORAGE_KEY_DIMENSIONS));
      LEGACY_KEYS.forEach((k) => pushAll(lsGetJson(k)));
      lsSetJson(STORAGE_KEY_DIMENSIONS, merged);
      LEGACY_KEYS.forEach(lsRemove);
    }

    return { list: merged, migratedFromLocalStorage };
  }

  function saveLocalCache(list) {
    const cleanList = (Array.isArray(list) ? list : [])
      .filter((item) => item && !PRESET_IDS.has(item.id))
      .map(normalizeDimensionItem);
    storageSet(IDB_KEY_DIMENSIONS, cleanList);
  }

  async function loadLikedIds() {
    try {
      let stored = await storageGet(IDB_KEY_LIKED);
      // One-time rescue of likes saved under the old localStorage key.
      const legacyLiked = lsGetJson(STORAGE_KEY_LIKED);
      if (!Array.isArray(stored) && Array.isArray(legacyLiked)) {
        stored = legacyLiked;
      }
      if (legacyLiked !== undefined) lsRemove(STORAGE_KEY_LIKED);
      if (Array.isArray(stored)) {
        likedIds = new Set(stored.map((id) => String(id)));
        // Mirror the value into IndexedDB (also migrates an old copy).
        storageSet(IDB_KEY_LIKED, Array.from(likedIds));
      }
    } catch (_) {
      likedIds = new Set();
    }
  }

  function saveLikedIds() {
    storageSet(IDB_KEY_LIKED, Array.from(likedIds));
  }

  function saveFormDraft() {
    if (editingDimensionIdInput.value) return;
    const draft = {
      name: dimensionNameInput.value,
      bookText: bookTextInput.value,
      description: descriptionInput.value,
      images: formImages,
      portalColor: portalColorHexInput.value,
      entities: selectedEntities,
      pendingEntityText: customEntityInput.value,
      pendingImageUrl: imageUrlInput.value,
      nickname: nicknameInput.value
    };
    // Drafts (including pasted screenshots) persist to IndexedDB, which has
    // plenty of room for them; the storage layer handles any fallback tier.
    storageSet(IDB_KEY_DRAFT, draft);
    if (draftStatusPill) draftStatusPill.textContent = 'Draft saved';
  }

  async function loadFormDraft() {
    try {
      let draft = await storageGet(IDB_KEY_DRAFT);
      if (!draft || typeof draft !== 'object') {
        // One-time rescue of a draft saved under the old localStorage key.
        const legacyDraft = lsGetJson(STORAGE_KEY_DRAFT);
        if (legacyDraft && typeof legacyDraft === 'object') {
          draft = legacyDraft;
          storageSet(IDB_KEY_DRAFT, draft); // keep it durable in IndexedDB
        }
      }
      lsRemove(STORAGE_KEY_DRAFT); // the old key is retired either way
      return draft && typeof draft === 'object' ? draft : null;
    } catch (_) {
      return null;
    }
  }

  function clearFormDraft() {
    storageDelete(IDB_KEY_DRAFT);
  }

  async function initAndSyncSharedHub() {
    const { list: cached, migratedFromLocalStorage } = await loadCachedDimensions();
    dimensions = cached;

    await loadLikedIds();
    renderHub();

    if (migratedFromLocalStorage && cached.length > 0) {
      showToast(`Storage upgraded — secured ${cached.length} dimension(s) in IndexedDB`);
    }

    try {
      // Sync any locally cached dimensions up to the shared server database
      // and receive the full public list of dimensions from everyone
      const res = await fetch('/api/dimensions/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dimensions: cached })
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.dimensions)) {
          dimensions = data.dimensions
            .filter((d) => d && !PRESET_IDS.has(d.id))
            .map(normalizeDimensionItem);
          saveLocalCache(dimensions);
          renderHub();
        }
      }
    } catch (_) {}

    // Subscribe to real-time updates so when anyone creates/updates a dimension,
    // everyone viewing the Hub sees it immediately
    try {
      const evtSource = new EventSource('/api/stream');
      evtSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload && Array.isArray(payload.dimensions)) {
            dimensions = payload.dimensions
              .filter((d) => d && !PRESET_IDS.has(d.id))
              .map(normalizeDimensionItem);
            saveLocalCache(dimensions);
            renderHub();
          }
        } catch (_) {}
      };
    } catch (_) {}
  }

  // =========================================================================
  // HUB RENDERING
  // =========================================================================
  function updateHubStats() {
    statTotalDimensions.textContent = String(dimensions.length);

    const totalImgs = dimensions.reduce(
      (sum, d) => sum + (Array.isArray(d.images) ? d.images.length : 0),
      0
    );
    statTotalImages.textContent = String(totalImgs);

    const entitySet = new Set();
    dimensions.forEach((d) => {
      if (Array.isArray(d.entities)) {
        d.entities.forEach((e) => entitySet.add(String(e).toLowerCase()));
      }
    });
    statUniqueEntities.textContent = String(entitySet.size);
  }

  function getFilteredDimensions() {
    const q = searchQuery.trim().toLowerCase();

    const filtered = dimensions.filter((dim) => {
      if (!q) return true;

      const name = (dim.name || dim.title || '').toLowerCase();
      const book = (dim.bookText || '').toLowerCase();
      const desc = (dim.description || '').toLowerCase();
      const nick = (dim.nickname || dim.username || 'Anonymous').toLowerCase();
      const color = (dim.portalColor || '').toLowerCase();
      const entityMatch =
        Array.isArray(dim.entities) &&
        dim.entities.some((e) => String(e).toLowerCase().includes(q));

      return (
        name.includes(q) ||
        book.includes(q) ||
        desc.includes(q) ||
        nick.includes(q) ||
        color.includes(q) ||
        entityMatch
      );
    });

    filtered.sort((a, b) => {
      if (activeSort === 'oldest') {
        return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
      }
      if (activeSort === 'likes') {
        return (b.likes || 0) - (a.likes || 0);
      }
      if (activeSort === 'book-az') {
        return String(a.name || a.title || a.bookText || '').localeCompare(
          String(b.name || b.title || b.bookText || '')
        );
      }
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });

    return filtered;
  }

  function renderHub() {
    updateHubStats();
    const list = getFilteredDimensions();
    dimensionsGrid.innerHTML = '';

    if (list.length === 0) {
      emptyHubState.hidden = false;
      if (searchQuery.trim()) {
        emptyStateTitle.textContent = 'No matching dimensions';
        emptyStateDesc.textContent = 'No stored dimensions matched your search query.';
        resetFiltersBtn.hidden = false;
      } else {
        emptyStateTitle.textContent = 'No dimensions stored yet';
        emptyStateDesc.textContent =
          'Click below to publish the first 20w14infinite dimension to the Hub.';
        resetFiltersBtn.hidden = true;
      }
      return;
    }

    emptyHubState.hidden = true;

    list.forEach((dim) => {
      const card = document.createElement('article');
      card.className = 'dimension-card';

      const hasCustomColor = dim.portalColor && isValidHexColor(dim.portalColor);
      const displayColor = hasCustomColor ? dim.portalColor : '#8b5cf6';
      card.style.setProperty('--portal-accent', displayColor);

      const dimName = dim.name || dim.title || dim.bookText;
      const nickname = (dim.nickname || dim.username || 'Anonymous').trim() || 'Anonymous';
      const coverImg = Array.isArray(dim.images) && dim.images.length > 0 ? dim.images[0] : '';
      const imgCount = Array.isArray(dim.images) ? dim.images.length : 0;
      const entities = Array.isArray(dim.entities) ? dim.entities : [];
      const isLiked = likedIds.has(dim.id);

      const entitiesHtml =
        entities.length > 0
          ? entities
              .slice(0, 4)
              .map((ent) => `<span class="entity-tag">${escapeHtml(ent)}</span>`)
              .join('') +
            (entities.length > 4
              ? `<span class="entity-tag">+${entities.length - 4}</span>`
              : '')
          : `<span class="entity-tag entity-tag-empty">No entities listed</span>`;

      card.innerHTML = `
        <div class="card-media">
          <img src="${escapeHtml(coverImg)}" alt="${escapeHtml(dimName)}" loading="lazy" />
          <div class="card-badges-top">
            ${
              hasCustomColor
                ? `<span class="portal-pill" title="Portal Color">
                    <span class="portal-dot"></span>
                    <span>${escapeHtml(displayColor.toUpperCase())}</span>
                  </span>`
                : `<span></span>`
            }
            ${
              imgCount > 1
                ? `<span class="photo-count-pill">${imgCount} shots</span>`
                : ''
            }
          </div>
        </div>

        <div class="card-body">
          <div class="card-header-row">
            <h3 class="card-title">${escapeHtml(dimName)}</h3>
          </div>

          <div class="book-phrase-bar" title="Book & Quill Text">
            <div class="book-phrase-left">
              <span class="book-label-tag">Book</span>
              <code class="book-phrase-code">${escapeHtml(dim.bookText)}</code>
            </div>
            <button type="button" class="copy-mini-btn" data-copy-book="${escapeHtml(dim.bookText)}">
              Copy
            </button>
          </div>

          <p class="card-description">${escapeHtml(dim.description)}</p>

          <div class="card-entities">
            ${entitiesHtml}
          </div>
        </div>

        <div class="card-footer">
          <div class="discoverer" title="Discovered by ${escapeHtml(nickname)}">
            <img class="player-avatar" src="${generatePlayerHeadDataUri(nickname)}" alt="" />
            <div class="discoverer-meta">
              <span class="discoverer-name">${escapeHtml(nickname)}</span>
              <span class="discoverer-time">• ${formatRelativeTime(dim.createdAt)}</span>
            </div>
          </div>

          <div class="card-actions">
            <button type="button" class="icon-action-btn ${isLiked ? 'liked' : ''}" data-like-id="${escapeHtml(dim.id)}" title="Like">
              <span>♥</span>
              <span>${dim.likes || 0}</span>
            </button>
            <button type="button" class="icon-action-btn" data-edit-id="${escapeHtml(dim.id)}" title="Edit">
              Edit
            </button>
            <button type="button" class="icon-action-btn delete" data-delete-id="${escapeHtml(dim.id)}" title="Delete">
              ✕
            </button>
          </div>
        </div>
      `;

      card.querySelector('[data-copy-book]')?.addEventListener('click', (e) => {
        e.stopPropagation();
        navigator.clipboard?.writeText(dim.bookText);
        showToast(`Copied "${dim.bookText}"`);
      });

      card.querySelector('[data-like-id]')?.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleLikeDimension(dim.id);
      });

      card.querySelector('[data-edit-id]')?.addEventListener('click', (e) => {
        e.stopPropagation();
        openEditDimensionModal(dim);
      });

      card.querySelector('[data-delete-id]')?.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteDimension(dim.id);
      });

      card.addEventListener('click', () => {
        openDetailModal(dim.id);
      });

      dimensionsGrid.appendChild(card);
    });
  }

  // =========================================================================
  // ACTIONS
  // =========================================================================
  async function toggleLikeDimension(id) {
    const dim = dimensions.find((d) => d.id === id);
    if (!dim) return;

    const alreadyLiked = likedIds.has(id);
    const delta = alreadyLiked ? -1 : 1;

    if (alreadyLiked) likedIds.delete(id);
    else likedIds.add(id);
    saveLikedIds();

    dim.likes = Math.max(0, (dim.likes || 0) + delta);
    saveLocalCache(dimensions);
    renderHub();

    try {
      await fetch(`/api/dimensions/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'like', delta })
      });
    } catch (_) {}
  }

  async function deleteDimension(id) {
    const dim = dimensions.find((d) => d.id === id);
    if (!dim) return;

    dimensions = dimensions.filter((d) => d.id !== id);
    saveLocalCache(dimensions);
    renderHub();

    if (!detailModal.hidden && activeDetailDimensionId === id) {
      closeDetailModal();
    }

    try {
      await fetch(`/api/dimensions/${encodeURIComponent(id)}`, { method: 'DELETE' });
    } catch (_) {}

    showToast(`Deleted "${dim.name || dim.bookText}"`);
  }

  // =========================================================================
  // MODAL & FORM LOGIC
  // =========================================================================
  function renderSelectedEntities() {
    selectedEntitiesBox.innerHTML = '';
    selectedEntities.forEach((entityName, index) => {
      const tag = document.createElement('span');
      tag.className = 'selected-entity-tag';
      tag.innerHTML = `
        <span>${escapeHtml(entityName)}</span>
        <button type="button" aria-label="Remove ${escapeHtml(entityName)}">✕</button>
      `;
      tag.querySelector('button').addEventListener('click', () => {
        selectedEntities.splice(index, 1);
        renderSelectedEntities();
        saveFormDraft();
      });
      selectedEntitiesBox.appendChild(tag);
    });
  }

  function addCustomEntitiesFromInput() {
    const raw = customEntityInput.value.trim();
    if (!raw) return;
    raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((part) => {
        if (!selectedEntities.some((e) => e.toLowerCase() === part.toLowerCase())) {
          selectedEntities.push(part);
        }
      });
    customEntityInput.value = '';
    renderSelectedEntities();
    saveFormDraft();
  }

  function renderUploadedImages() {
    uploadedImagesGrid.innerHTML = '';
    const count = formImages.length;

    if (count > 0) {
      imageCountPill.textContent = `${count} screenshot${count > 1 ? 's' : ''} ready`;
      imageCountPill.classList.add('valid');
    } else {
      imageCountPill.textContent = 'Min. 1 image required';
      imageCountPill.classList.remove('valid');
    }

    formImages.forEach((src, index) => {
      const item = document.createElement('div');
      item.className = 'uploaded-thumb';
      item.innerHTML = `
        <img src="${escapeHtml(src)}" alt="Screenshot ${index + 1}" />
        ${index === 0 ? '<span class="thumb-badge">Cover</span>' : ''}
        <button type="button" class="thumb-remove-btn" title="Remove">✕</button>
      `;
      item.querySelector('.thumb-remove-btn').addEventListener('click', () => {
        formImages.splice(index, 1);
        renderUploadedImages();
        saveFormDraft();
      });
      uploadedImagesGrid.appendChild(item);
    });
  }

  function updateBookLivePreview() {
    const trimmed = bookTextInput.value.trim();
    if (!trimmed) {
      liveWarpCommand.textContent = '/warp ...';
      liveDimensionId.textContent = '—';
      return;
    }
    liveWarpCommand.textContent = `/warp ${trimmed.slice(0, 32)}${trimmed.length > 32 ? '…' : ''}`;
    const { dimensionId } = computeClientHash(trimmed);
    liveDimensionId.textContent = String(dimensionId);
  }

  function updatePortalColorUI(hexOrEmpty) {
    const clean = String(hexOrEmpty || '').trim();
    portalColorHexInput.value = clean;

    if (isValidHexColor(clean)) {
      let normalized = clean;
      if (clean.length === 4) {
        normalized = '#' + clean[1] + clean[1] + clean[2] + clean[2] + clean[3] + clean[3];
      }
      portalColorPicker.value = normalized.toLowerCase();
    } else if (!clean) {
      portalColorPicker.value = '#8b5cf6';
    }
  }

  function updateNicknameAvatarPreview() {
    const val = nicknameInput.value.trim() || 'Anonymous';
    formAvatarPreview.innerHTML = generatePlayerHeadSvg(val);
  }

  function resetPopupFormState() {
    editingDimensionIdInput.value = '';
    dimensionNameInput.value = '';
    bookTextInput.value = '';
    descriptionInput.value = '';
    imageUrlInput.value = '';
    customEntityInput.value = '';
    formImages = [];
    selectedEntities = [];
    nicknameInput.value = 'Anonymous';
    formErrorBanner.hidden = true;
    updatePortalColorUI('');
    updateBookLivePreview();
    renderUploadedImages();
    renderSelectedEntities();
    updateNicknameAvatarPreview();
  }

  async function openAddDimensionModal() {
    modalTitle.textContent = 'New Dimension';
    editingDimensionIdInput.value = '';
    formErrorBanner.hidden = true;

    const draft = await loadFormDraft();
    if (
      draft &&
      (draft.name ||
        draft.bookText ||
        draft.description ||
        draft.pendingEntityText ||
        draft.pendingImageUrl ||
        (Array.isArray(draft.images) && draft.images.length > 0) ||
        (Array.isArray(draft.entities) && draft.entities.length > 0))
    ) {
      dimensionNameInput.value = draft.name || '';
      bookTextInput.value = draft.bookText || '';
      descriptionInput.value = draft.description || '';
      formImages = Array.isArray(draft.images) ? [...draft.images] : [];
      selectedEntities = Array.isArray(draft.entities) ? [...draft.entities] : [];
      customEntityInput.value = draft.pendingEntityText || '';
      imageUrlInput.value = draft.pendingImageUrl || '';
      nicknameInput.value = draft.nickname || 'Anonymous';
      updatePortalColorUI(draft.portalColor || '');
      draftStatusPill.textContent = 'Draft restored';
    } else {
      resetPopupFormState();
      draftStatusPill.textContent = 'Ready';
    }

    updateBookLivePreview();
    renderUploadedImages();
    renderSelectedEntities();
    updateNicknameAvatarPreview();

    addDimensionModal.hidden = false;
    setTimeout(() => dimensionNameInput.focus(), 40);
  }

  function openEditDimensionModal(dim) {
    if (!detailModal.hidden) closeDetailModal();
    modalTitle.textContent = 'Edit Dimension';
    editingDimensionIdInput.value = dim.id;
    formErrorBanner.hidden = true;
    draftStatusPill.textContent = 'Editing';

    dimensionNameInput.value = dim.name || dim.title || '';
    bookTextInput.value = dim.bookText || '';
    descriptionInput.value = dim.description || '';
    formImages = Array.isArray(dim.images) ? [...dim.images] : [];
    selectedEntities = Array.isArray(dim.entities) ? [...dim.entities] : [];
    customEntityInput.value = '';
    imageUrlInput.value = '';
    nicknameInput.value = dim.nickname || dim.username || 'Anonymous';
    updatePortalColorUI(dim.portalColor || '');

    updateBookLivePreview();
    renderUploadedImages();
    renderSelectedEntities();
    updateNicknameAvatarPreview();

    addDimensionModal.hidden = false;
    setTimeout(() => dimensionNameInput.focus(), 40);
  }

  function closeAddDimensionModal() {
    addDimensionModal.hidden = true;
  }

  // =========================================================================
  // IMAGE PROCESSING
  // =========================================================================
  function processImageFile(file) {
    return new Promise((resolve, reject) => {
      if (!file || !file.type.startsWith('image/')) {
        reject(new Error('Please select a valid image file.'));
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const rawDataUrl = e.target.result;
        const img = new Image();
        img.onload = () => {
          const maxW = 1024;
          const maxH = 576;
          let { width, height } = img;
          if (width > maxW || height > maxH) {
            const ratio = Math.min(maxW / width, maxH / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.82));
        };
        img.onerror = () => resolve(rawDataUrl);
        img.src = rawDataUrl;
      };
      reader.onerror = () => reject(new Error('Failed to read file.'));
      reader.readAsDataURL(file);
    });
  }

  async function handleFilesSelected(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    for (const file of files) {
      try {
        const dataUrl = await processImageFile(file);
        formImages.push(dataUrl);
      } catch (err) {
        showToast(err.message);
      }
    }
    renderUploadedImages();
    saveFormDraft();
    formErrorBanner.hidden = true;
  }

  // =========================================================================
  // FORM SUBMIT (PUBLISHES TO SHARED SERVER HUB + LOCAL CACHE)
  // =========================================================================
  async function handleFormSubmit(e) {
    e.preventDefault();

    if (imageUrlInput.value.trim()) {
      formImages.push(imageUrlInput.value.trim());
      imageUrlInput.value = '';
      renderUploadedImages();
    }
    if (customEntityInput.value.trim()) {
      addCustomEntitiesFromInput();
    }

    const name = dimensionNameInput.value.trim();
    const bookText = bookTextInput.value.trim();
    const description = descriptionInput.value.trim();
    const portalColor = portalColorHexInput.value.trim();
    const nickname = nicknameInput.value.trim() || 'Anonymous';
    const editingId = editingDimensionIdInput.value.trim();

    const missing = [];
    if (!name) missing.push('• Dimension Name is mandatory.');
    if (!bookText) missing.push('• Book & Quill Text is mandatory.');
    if (!description) missing.push('• Description is mandatory.');
    if (formImages.length < 1) missing.push('• At least 1 screenshot is mandatory.');

    if (missing.length > 0) {
      formErrorBanner.innerHTML = missing.join('<br/>');
      formErrorBanner.hidden = false;
      formErrorBanner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      return;
    }

    const { dimensionId, derivedColor } = computeClientHash(bookText);

    const payload = {
      name,
      title: name,
      bookText,
      description,
      images: [...formImages],
      portalColor: portalColor || null,
      entities: [...selectedEntities],
      nickname,
      username: nickname,
      dimensionId,
      derivedColor
    };

    const submitBtn = document.getElementById('submitDimensionBtn');
    const prevText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';

    try {
      if (editingId) {
        const idx = dimensions.findIndex((d) => d.id === editingId);
        if (idx !== -1) {
          dimensions[idx] = normalizeDimensionItem({
            ...dimensions[idx],
            ...payload,
            updatedAt: new Date().toISOString()
          });
        }
        saveLocalCache(dimensions);
        renderHub();

        try {
          const res = await fetch(`/api/dimensions/${encodeURIComponent(editingId)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data.dimensions)) {
              dimensions = data.dimensions.map(normalizeDimensionItem);
              saveLocalCache(dimensions);
              renderHub();
            }
          }
        } catch (_) {}

        closeAddDimensionModal();
        showToast(`Updated "${name}"`);
      } else {
        const newDimension = normalizeDimensionItem({
          id: `dim-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          ...payload,
          likes: 0,
          createdAt: new Date().toISOString()
        });

        dimensions.unshift(newDimension);
        saveLocalCache(dimensions);
        renderHub();

        try {
          const res = await fetch('/api/dimensions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newDimension)
          });
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data.dimensions)) {
              dimensions = data.dimensions.map(normalizeDimensionItem);
              saveLocalCache(dimensions);
              renderHub();
            }
          }
        } catch (_) {}

        clearFormDraft();
        resetPopupFormState();
        closeAddDimensionModal();
        showToast(`Published "${name}" to the Hub`);
      }
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = prevText;
    }
  }

  // =========================================================================
  // DETAIL MODAL
  // =========================================================================
  function openDetailModal(id) {
    const dim = dimensions.find((d) => d.id === id);
    if (!dim) return;

    activeDetailDimensionId = dim.id;
    const dimName = dim.name || dim.title || dim.bookText;
    const nickname = (dim.nickname || dim.username || 'Anonymous').trim() || 'Anonymous';
    const hasCustomColor = dim.portalColor && isValidHexColor(dim.portalColor);
    const displayColor = hasCustomColor ? dim.portalColor : '#8b5cf6';

    detailModalTitle.textContent = dimName;
    detailModalMeta.textContent = `Discovered by ${nickname} • ${formatRelativeTime(dim.createdAt)} • Seed #${dim.dimensionId || computeClientHash(dim.bookText).dimensionId}`;

    const images = Array.isArray(dim.images) && dim.images.length > 0 ? dim.images : [''];
    const entities = Array.isArray(dim.entities) ? dim.entities : [];

    const thumbsHtml =
      images.length > 1
        ? `<div class="detail-thumbs">
            ${images
              .map(
                (src, idx) => `
              <button type="button" class="detail-thumb-btn ${idx === 0 ? 'active' : ''}" data-thumb-idx="${idx}">
                <img src="${escapeHtml(src)}" alt="Screenshot ${idx + 1}" />
              </button>
            `
              )
              .join('')}
          </div>`
        : '';

    const entitiesHtml =
      entities.length > 0
        ? entities.map((e) => `<span class="entity-tag">${escapeHtml(e)}</span>`).join('')
        : `<span class="entity-tag entity-tag-empty">None reported</span>`;

    detailModalContent.innerHTML = `
      <div class="detail-layout">
        <div>
          <div class="detail-main-shot">
            <img id="detailMainImg" src="${escapeHtml(images[0])}" alt="${escapeHtml(dimName)}" />
          </div>
          ${thumbsHtml}
        </div>

        <div class="detail-sidebar">
          <div class="detail-card">
            <div class="detail-card-label">
              <span>Book &amp; Quill Text</span>
              <button type="button" class="link-btn" id="detailCopyBookBtn">Copy Text</button>
            </div>
            <div class="detail-book-code">${escapeHtml(dim.bookText)}</div>
            <div class="detail-warp-row">
              <code>/warp ${escapeHtml(dim.bookText)}</code>
              <button type="button" class="link-btn" id="detailCopyWarpBtn">Copy Command</button>
            </div>
          </div>

          <div class="detail-card">
            <div class="detail-card-label"><span>Description</span></div>
            <p class="detail-desc">${escapeHtml(dim.description)}</p>
          </div>

          <div class="detail-card" style="display:flex; align-items:center; justify-content:space-between;">
            <div>
              <div class="detail-card-label" style="margin-bottom:0.2rem;"><span>Portal Color</span></div>
              <div style="font-weight:600; font-size:0.88rem;">${hasCustomColor ? escapeHtml(displayColor.toUpperCase()) : 'Not specified'}</div>
            </div>
            ${
              hasCustomColor
                ? `<span style="width:24px; height:24px; border-radius:50%; background:${escapeHtml(displayColor)}; box-shadow:0 0 12px ${escapeHtml(displayColor)};"></span>`
                : ''
            }
          </div>

          <div class="detail-card">
            <div class="detail-card-label"><span>Spawning Entities</span></div>
            <div class="card-entities" style="margin-top:0.35rem;">${entitiesHtml}</div>
          </div>

          <div class="detail-card" style="display:flex; align-items:center; justify-content:space-between;">
            <div class="discoverer">
              <img class="player-avatar" src="${generatePlayerHeadDataUri(nickname)}" alt="" style="width:28px; height:28px;" />
              <div>
                <div style="font-size:0.84rem; font-weight:600;">${escapeHtml(nickname)}</div>
                <div style="font-size:0.72rem; color:var(--text-muted);">Player Nickname</div>
              </div>
            </div>
            <button type="button" class="btn btn-secondary btn-sm" id="detailLikeBtn">
              ♥ ${dim.likes || 0}
            </button>
          </div>
        </div>
      </div>
    `;

    const mainImg = document.getElementById('detailMainImg');
    detailModalContent.querySelectorAll('[data-thumb-idx]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-thumb-idx'), 10);
        if (images[idx] && mainImg) {
          mainImg.src = images[idx];
          detailModalContent
            .querySelectorAll('[data-thumb-idx]')
            .forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
        }
      });
    });

    document.getElementById('detailCopyBookBtn')?.addEventListener('click', () => {
      navigator.clipboard?.writeText(dim.bookText);
      showToast('Copied Book & Quill text');
    });

    document.getElementById('detailCopyWarpBtn')?.addEventListener('click', () => {
      navigator.clipboard?.writeText(`/warp ${dim.bookText}`);
      showToast('Copied /warp command');
    });

    document.getElementById('detailLikeBtn')?.addEventListener('click', async () => {
      await toggleLikeDimension(dim.id);
      openDetailModal(dim.id);
    });

    detailModal.hidden = false;
  }

  function closeDetailModal() {
    detailModal.hidden = true;
    activeDetailDimensionId = null;
  }

  // =========================================================================
  // EVENT BINDINGS
  // =========================================================================
  function bindEvents() {
    document.getElementById('openAddModalTopBtn')?.addEventListener('click', openAddDimensionModal);
    document.getElementById('openAddModalHeroBtn')?.addEventListener('click', openAddDimensionModal);
    document.getElementById('openAddModalEmptyBtn')?.addEventListener('click', openAddDimensionModal);

    document.getElementById('closeAddModalBtn')?.addEventListener('click', closeAddDimensionModal);
    document.getElementById('cancelAddModalBtn')?.addEventListener('click', closeAddDimensionModal);

    addDimensionModal.addEventListener('click', (e) => {
      if (e.target === addDimensionModal) closeAddDimensionModal();
    });

    document.getElementById('closeDetailModalBtn')?.addEventListener('click', closeDetailModal);
    detailModal.addEventListener('click', (e) => {
      if (e.target === detailModal) closeDetailModal();
    });

    detailEditBtn?.addEventListener('click', () => {
      const dim = dimensions.find((d) => d.id === activeDetailDimensionId);
      if (dim) openEditDimensionModal(dim);
    });

    detailDeleteBtn?.addEventListener('click', () => {
      if (activeDetailDimensionId) deleteDimension(activeDetailDimensionId);
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (!addDimensionModal.hidden) closeAddDimensionModal();
        if (!detailModal.hidden) closeDetailModal();
      }
    });

    searchInput.addEventListener('input', () => {
      searchQuery = searchInput.value;
      clearSearchBtn.hidden = !searchQuery;
      renderHub();
    });

    clearSearchBtn.addEventListener('click', () => {
      searchInput.value = '';
      searchQuery = '';
      clearSearchBtn.hidden = true;
      renderHub();
    });

    sortSelect.addEventListener('change', () => {
      activeSort = sortSelect.value;
      renderHub();
    });

    resetFiltersBtn?.addEventListener('click', () => {
      searchInput.value = '';
      searchQuery = '';
      clearSearchBtn.hidden = true;
      renderHub();
    });

    dimensionNameInput.addEventListener('input', saveFormDraft);
    bookTextInput.addEventListener('input', () => {
      updateBookLivePreview();
      saveFormDraft();
    });
    descriptionInput.addEventListener('input', saveFormDraft);

    browseImagesBtn.addEventListener('click', () => imageFileInput.click());
    imageDropzone.addEventListener('click', (e) => {
      if (
        e.target === imageDropzone ||
        e.target.closest('.dropzone-copy') ||
        e.target.closest('.dropzone-icon-wrap')
      ) {
        imageFileInput.click();
      }
    });

    imageFileInput.addEventListener('change', () => {
      handleFilesSelected(imageFileInput.files);
      imageFileInput.value = '';
    });

    imageDropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      imageDropzone.classList.add('dragover');
    });

    imageDropzone.addEventListener('dragleave', () => {
      imageDropzone.classList.remove('dragover');
    });

    imageDropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      imageDropzone.classList.remove('dragover');
      if (e.dataTransfer?.files?.length) handleFilesSelected(e.dataTransfer.files);
    });

    window.addEventListener('paste', (e) => {
      if (addDimensionModal.hidden) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      const files = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const f = items[i].getAsFile();
          if (f) files.push(f);
        }
      }
      if (files.length > 0) {
        e.preventDefault();
        handleFilesSelected(files);
        showToast('Pasted image from clipboard');
      }
    });

    imageUrlInput.addEventListener('input', saveFormDraft);

    addImageUrlBtn.addEventListener('click', () => {
      const url = imageUrlInput.value.trim();
      if (!url) return;
      formImages.push(url);
      imageUrlInput.value = '';
      renderUploadedImages();
      saveFormDraft();
      formErrorBanner.hidden = true;
    });

    imageUrlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addImageUrlBtn.click();
      }
    });

    portalColorPicker.addEventListener('input', () => {
      updatePortalColorUI(portalColorPicker.value);
      saveFormDraft();
    });

    portalColorHexInput.addEventListener('input', () => {
      updatePortalColorUI(portalColorHexInput.value);
      saveFormDraft();
    });

    clearPortalColorBtn.addEventListener('click', () => {
      updatePortalColorUI('');
      saveFormDraft();
    });

    customEntityInput.addEventListener('input', saveFormDraft);
    addCustomEntityBtn.addEventListener('click', addCustomEntitiesFromInput);
    customEntityInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addCustomEntitiesFromInput();
      }
    });

    clearEntitiesBtn.addEventListener('click', () => {
      selectedEntities = [];
      customEntityInput.value = '';
      renderSelectedEntities();
      saveFormDraft();
    });

    nicknameInput.addEventListener('input', () => {
      updateNicknameAvatarPreview();
      saveFormDraft();
    });

    setAnonymousBtn.addEventListener('click', () => {
      nicknameInput.value = 'Anonymous';
      updateNicknameAvatarPreview();
      saveFormDraft();
    });

    document.getElementById('clearFormDraftBtn')?.addEventListener('click', () => {
      clearFormDraft();
      resetPopupFormState();
      showToast('Form reset');
    });

    dimensionForm.addEventListener('submit', handleFormSubmit);

    document.getElementById('exportJsonBtn')?.addEventListener('click', () => {
      const blob = new Blob([JSON.stringify(dimensions, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = '20w14infinite-dimensions.json';
      a.click();
      URL.revokeObjectURL(url);
      showToast('Exported JSON backup');
    });

    document.getElementById('importJsonInput')?.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        const list = Array.isArray(parsed)
          ? parsed
          : Array.isArray(parsed.dimensions)
          ? parsed.dimensions
          : [];
        if (!list.length) {
          showToast('No dimensions found in file');
          return;
        }
        const res = await fetch('/api/dimensions/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dimensions: list })
        });
        if (res.ok) {
          const data = await res.json();
          dimensions = data.dimensions.map(normalizeDimensionItem);
          saveLocalCache(dimensions);
          renderHub();
          showToast(`Imported ${data.addedCount} dimension(s)`);
        }
      } catch (_) {
        showToast('Invalid JSON file');
      } finally {
        e.target.value = '';
      }
    });
  }

  renderSelectedEntities();
  updateNicknameAvatarPreview();
  bindEvents();
  initAndSyncSharedHub();
})();
