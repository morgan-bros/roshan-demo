/* A scoped app shell and opt-in cache of complete audio files. */
'use strict';

importScripts('assets/pwa-shared.js');
const cfg = self.RoshanPwa;
const root = new URL('./', self.location.href);
const {shellPrefix, shellCache, audioCache} = cfg.names(root);
const shellPaths = new Set(cfg.shell);
const keyFor = (path) => new URL(path, root).href;

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(shellCache);
    try {
      // Do not fetch the audio index or a recording when installing the shell.
      for (const path of cfg.shell) {
        const url = keyFor(path);
        const data = await fetch(url, {cache: 'no-cache', redirect: 'error'});
        if (data.status !== 200 || data.type === 'opaque') {
          throw new Error('Offline shell could not be prepared.');
        }
        await cache.put(url, data);
      }
      await cache.put(keyFor(cfg.shellMarker), new Response(cfg.packVersion));
    } catch (error) {
      await caches.delete(shellCache);
      throw error;
    }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    await self.clients.claim();
    for (const key of await caches.keys()) {
      if (key.startsWith(shellPrefix) && key !== shellCache) await caches.delete(key);
    }
    // No media cache is erased on a UI-only update.
  })());
});

// A tab can still be running the previous UI script after a worker upgrade.
self.addEventListener('message', (event) => {
  const port = event.ports[0];
  if (!port || event.data !== 'roshan-offline-status-v1') return;
  event.waitUntil((async () => {
    port.postMessage({ready: Boolean(await fromCompletedShell('Roshan.html')), pack: cfg.packVersion});
  })().catch(() => port.postMessage({ready: false, pack: cfg.packVersion})));
});

function parseRange(value, length) {
  const match = /^bytes=(\d*)-(\d*)$/i.exec(value);
  if (!match || (!match[1] && !match[2]) || length < 1) return null;
  const first = match[1] ? Number(match[1]) : null;
  const last = match[2] ? Number(match[2]) : null;
  if ((first !== null && !Number.isSafeInteger(first))
      || (last !== null && !Number.isSafeInteger(last))) return null;
  if (first === null) return last > 0 ? [Math.max(0, length - last), length - 1] : null;
  const end = last === null ? length - 1 : Math.min(last, length - 1);
  return first <= end ? [first, end] : null;
}

async function fromAudioCache(request) {
  const cached = await caches.match(request.url, {cacheName: audioCache});
  if (!cached || cached.status !== 200) return fetch(request);
  const header = request.headers.get('range');
  if (!header) return cached;
  const ifRange = request.headers.get('if-range');
  const etag = cached.headers.get('etag');
  if (ifRange && (!etag || etag.startsWith('W/') || ifRange !== etag)
      && ifRange !== cached.headers.get('last-modified')) return cached;

  const full = await cached.arrayBuffer();
  const range = parseRange(header, full.byteLength);
  const headers = new Headers({'Accept-Ranges': 'bytes'});
  if (!range) {
    headers.set('Content-Range', 'bytes */' + full.byteLength);
    return new Response(null, {status: 416, headers});
  }
  const [first, last] = range;
  headers.set('Content-Type', cached.headers.get('content-type') || 'application/octet-stream');
  headers.set('Content-Range', 'bytes ' + first + '-' + last + '/' + full.byteLength);
  headers.set('Content-Length', String(last - first + 1));
  if (etag) headers.set('ETag', etag);
  return new Response(full.slice(first, last + 1), {status: 206, headers});
}

async function fromCompletedShell(path) {
  const candidates = await caches.keys();
  for (const name of [shellCache, ...candidates.filter((key) => key !== shellCache && key.startsWith(shellPrefix))]) {
    const marker = await caches.match(keyFor(cfg.shellMarker), {cacheName: name});
    if (marker && await marker.text() === cfg.packVersion) {
      const file = await caches.match(keyFor(path), {cacheName: name});
      if (file) return file;
    }
  }
  return null;
}

async function fromShell(request, path) {
  return await fromCompletedShell(path) || fetch(request);
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  // Navigation fragments select app views, not different network resources.
  if (request.mode === 'navigate') url.hash = '';
  const relative = cfg.relative(root, url.href);
  if (relative === null) return;
  const shellPath = relative || 'index.html';
  if (shellPaths.has(shellPath)) {
    event.respondWith(fromShell(request, shellPath));
  } else if (cfg.audioPath.test(relative)) {
    event.respondWith(fromAudioCache(request));
  }
});
