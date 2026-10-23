const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = '0.0.0.0';
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'dimensions.json');
const PUBLIC_DIR = path.join(__dirname, 'public');

const PRESET_IDS = new Set([
  'dim-isolation',
  'dim-skygrid',
  'dim-library',
  'dim-slime',
  'dim-diamond-abyss'
]);

// Connected SSE clients for real-time updates across all visitors
const sseClients = new Set();

function broadcastUpdate(dimensions) {
  const payload = `data: ${JSON.stringify({ type: 'dimensions', dimensions })}\n\n`;
  for (const res of sseClients) {
    try {
      res.write(payload);
    } catch (_) {
      sseClients.delete(res);
    }
  }
}

function compute20w14InfiniteHash(bookText) {
  const normalized = String(bookText || '');
  const salted = `${normalized}:why_so_salty#LazyCrypto`;
  const digest = crypto.createHash('sha256').update(salted, 'utf8').digest();
  const rawInt = digest.readInt32LE(0);
  const dimensionId = rawInt & 0x7fffffff;
  const r = Math.max(60, digest[4]);
  const g = Math.max(60, digest[5]);
  const b = Math.max(60, digest[6]);
  const derivedColor =
    '#' +
    [r, g, b]
      .map((v) => v.toString(16).padStart(2, '0'))
      .join('');
  return { dimensionId, derivedColor };
}

function normalizeRecord(item) {
  const bookText = String(item.bookText || '').trim();
  const name = String(item.name || item.title || bookText || 'Untitled Dimension').trim();
  const nickname = String(item.nickname || item.username || 'Anonymous').trim() || 'Anonymous';
  const { dimensionId, derivedColor } = compute20w14InfiniteHash(bookText);
  return {
    ...item,
    name,
    title: name,
    bookText,
    nickname,
    username: nickname,
    dimensionId: item.dimensionId || dimensionId,
    derivedColor: item.derivedColor || derivedColor
  };
}

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, '[]', 'utf8');
  }
}

function readDimensions() {
  ensureDataFile();
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && !PRESET_IDS.has(item.id))
      .map(normalizeRecord);
  } catch (err) {
    console.error('Error reading dimensions.json:', err);
    return [];
  }
}

function writeDimensions(dimensions) {
  ensureDataFile();
  const normalized = dimensions
    .filter((item) => item && !PRESET_IDS.has(item.id))
    .map(normalizeRecord);
  const tmpFile = `${DATA_FILE}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(normalized, null, 2), 'utf8');
  fs.renameSync(tmpFile, DATA_FILE);
  broadcastUpdate(normalized);
  return normalized;
}

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'no-store'
  });
  res.end(body);
}

function parseJsonBody(req, maxBytes = 50 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let totalBytes = 0;

    req.on('data', (chunk) => {
      totalBytes += chunk.length;
      if (totalBytes > maxBytes) {
        reject(new Error('Payload too large (max 50MB)'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        if (!raw.trim()) {
          resolve({});
          return;
        }
        resolve(JSON.parse(raw));
      } catch (e) {
        reject(new Error('Invalid JSON payload'));
      }
    });

    req.on('error', reject);
  });
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp'
};

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      });
      res.end();
      return;
    }

    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = parsedUrl.pathname;

    // Real-time Server-Sent Events stream for all connected browsers
    if (pathname === '/api/stream' && req.method === 'GET') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': '*'
      });
      res.write(`data: ${JSON.stringify({ type: 'dimensions', dimensions: readDimensions() })}\n\n`);
      sseClients.add(res);
      req.on('close', () => {
        sseClients.delete(res);
      });
      return;
    }

    if (pathname === '/api/hash' && req.method === 'GET') {
      const text = parsedUrl.searchParams.get('text') || '';
      const result = compute20w14InfiniteHash(text);
      sendJson(res, 200, { bookText: text, ...result });
      return;
    }

    if (pathname === '/api/dimensions' && req.method === 'GET') {
      const dimensions = readDimensions();
      sendJson(res, 200, { dimensions });
      return;
    }

    if (pathname === '/api/dimensions' && req.method === 'POST') {
      const body = await parseJsonBody(req);

      const name = typeof (body.name ?? body.title) === 'string' ? (body.name ?? body.title).trim() : '';
      const bookText = typeof body.bookText === 'string' ? body.bookText.trim() : '';
      const description = typeof body.description === 'string' ? body.description.trim() : '';
      const images = Array.isArray(body.images)
        ? body.images.filter((img) => typeof img === 'string' && img.trim().length > 0)
        : [];

      const errors = [];
      if (!name) errors.push('Dimension Name is required.');
      if (!bookText) errors.push('Book & Quill text is required.');
      if (!description) errors.push('Description is required.');
      if (images.length < 1) errors.push('At least 1 screenshot is required.');

      if (errors.length > 0) {
        sendJson(res, 400, { error: errors.join(' '), errors });
        return;
      }

      const { dimensionId, derivedColor } = compute20w14InfiniteHash(bookText);

      const rawPortalColor =
        typeof body.portalColor === 'string' && body.portalColor.trim()
          ? body.portalColor.trim()
          : '';

      const entities = Array.isArray(body.entities)
        ? body.entities.map((e) => String(e).trim()).filter(Boolean)
        : typeof body.entities === 'string' && body.entities.trim()
        ? body.entities.split(',').map((e) => e.trim()).filter(Boolean)
        : [];

      const rawNickname = body.nickname ?? body.username;
      const nickname =
        typeof rawNickname === 'string' && rawNickname.trim().length > 0
          ? rawNickname.trim()
          : 'Anonymous';

      const newDimension = normalizeRecord({
        id: body.id || `dim-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
        name,
        bookText,
        description,
        images,
        portalColor: rawPortalColor || null,
        derivedColor,
        dimensionId,
        entities,
        nickname,
        likes: 0,
        createdAt: body.createdAt || new Date().toISOString()
      });

      const dimensions = readDimensions();
      const existingIdx = dimensions.findIndex((d) => d.id === newDimension.id);
      if (existingIdx !== -1) {
        dimensions[existingIdx] = newDimension;
      } else {
        dimensions.unshift(newDimension);
      }
      writeDimensions(dimensions);

      sendJson(res, 201, { dimension: newDimension, dimensions });
      return;
    }

    if (pathname === '/api/dimensions/sync' && req.method === 'POST') {
      const body = await parseJsonBody(req);
      const clientDimensions = Array.isArray(body.dimensions) ? body.dimensions : [];
      const current = readDimensions();
      const existingIds = new Set(current.map((d) => d.id));
      let addedCount = 0;

      for (const item of clientDimensions) {
        if (!item || !item.id || PRESET_IDS.has(item.id)) continue;
        const itemName = String(item.name || item.title || '').trim();
        const itemBook = String(item.bookText || '').trim();
        const itemDesc = String(item.description || '').trim();
        if (
          !existingIds.has(item.id) &&
          itemName &&
          itemBook &&
          itemDesc &&
          Array.isArray(item.images) &&
          item.images.length >= 1
        ) {
          current.unshift(
            normalizeRecord({
              id: String(item.id),
              name: itemName,
              bookText: itemBook,
              description: itemDesc,
              images: item.images,
              portalColor: item.portalColor || null,
              entities: Array.isArray(item.entities) ? item.entities : [],
              nickname: item.nickname || item.username || 'Anonymous',
              likes: typeof item.likes === 'number' ? item.likes : 0,
              createdAt: item.createdAt || new Date().toISOString()
            })
          );
          existingIds.add(item.id);
          addedCount++;
        }
      }

      if (addedCount > 0) {
        writeDimensions(current);
      }
      sendJson(res, 200, { dimensions: current, addedCount });
      return;
    }

    if (pathname.startsWith('/api/dimensions/')) {
      const id = decodeURIComponent(pathname.replace('/api/dimensions/', ''));
      const dimensions = readDimensions();
      const idx = dimensions.findIndex((d) => d.id === id);

      if (idx === -1) {
        sendJson(res, 404, { error: 'Dimension not found.' });
        return;
      }

      if (req.method === 'DELETE') {
        const removed = dimensions.splice(idx, 1)[0];
        writeDimensions(dimensions);
        sendJson(res, 200, { deleted: removed.id, dimensions });
        return;
      }

      if (req.method === 'PUT') {
        const body = await parseJsonBody(req);
        const existing = dimensions[idx];

        if (body.action === 'like') {
          existing.likes = Math.max(0, (existing.likes || 0) + (body.delta === -1 ? -1 : 1));
          writeDimensions(dimensions);
          sendJson(res, 200, { dimension: existing, dimensions });
          return;
        }

        const rawName = body.name ?? body.title;
        const name = typeof rawName === 'string' ? rawName.trim() : existing.name;
        const bookText =
          typeof body.bookText === 'string' ? body.bookText.trim() : existing.bookText;
        const description =
          typeof body.description === 'string' ? body.description.trim() : existing.description;
        const images = Array.isArray(body.images)
          ? body.images.filter((img) => typeof img === 'string' && img.trim().length > 0)
          : existing.images;

        if (!name || !bookText || !description || images.length < 1) {
          sendJson(res, 400, {
            error: 'Dimension Name, Book & Quill text, Description, and at least 1 screenshot are required.'
          });
          return;
        }

        const { dimensionId, derivedColor } = compute20w14InfiniteHash(bookText);
        const rawNickname = body.nickname ?? body.username;

        const updated = normalizeRecord({
          ...existing,
          name,
          bookText,
          description,
          images,
          portalColor:
            body.portalColor !== undefined
              ? body.portalColor
                ? String(body.portalColor).trim()
                : null
              : existing.portalColor,
          derivedColor,
          dimensionId,
          entities: Array.isArray(body.entities)
            ? body.entities.map((e) => String(e).trim()).filter(Boolean)
            : existing.entities,
          nickname:
            typeof rawNickname === 'string'
              ? rawNickname.trim() || 'Anonymous'
              : existing.nickname,
          updatedAt: new Date().toISOString()
        });

        dimensions[idx] = updated;
        writeDimensions(dimensions);
        sendJson(res, 200, { dimension: updated, dimensions });
        return;
      }
    }

    let safePath = path.normalize(pathname).replace(/^(\.\.[/\\])+/, '');
    if (safePath === '/' || safePath === '\\') {
      safePath = '/index.html';
    }
    const filePath = path.join(PUBLIC_DIR, safePath);

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      const content = fs.readFileSync(filePath);
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache'
      });
      res.end(content);
      return;
    }

    const indexHtml = path.join(PUBLIC_DIR, 'index.html');
    if (fs.existsSync(indexHtml)) {
      const content = fs.readFileSync(indexHtml);
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache'
      });
      res.end(content);
      return;
    }

    sendJson(res, 404, { error: 'Not found' });
  } catch (err) {
    console.error('Server error:', err);
    sendJson(res, 500, { error: err.message || 'Internal Server Error' });
  }
});

ensureDataFile();
writeDimensions(readDimensions());

server.listen(PORT, HOST, () => {
  console.log(`20w14infinite-Hub server listening on http://${HOST}:${PORT}`);
});
