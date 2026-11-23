/* Roshan install and offline controls: no audio is requested without consent. */
(() => {
  'use strict';
  const cfg = window.RoshanPwa;
  if (!cfg || !window.isSecureContext || !/^https?:$/.test(location.protocol)) return;
  const root = new URL('../', document.currentScript.src);
  const {shellPrefix, shellCache, audioCache} = cfg.names(root);
  const capable = Boolean(navigator.serviceWorker && window.caches && window.crypto?.subtle);
  const absolute = (path) => new URL(path, root).href;
  const wholeMB = (bytes) => Math.ceil(bytes / 1e6) + ' MB';
  const isStandalone = () => matchMedia('(display-mode: standalone)').matches
    || navigator.standalone === true;

  let promptEvent = null;
  let registration = null;
  let shellReady = false;
  let shellError = false;
  let controls = null;
  let running = null;
  let cachedCount = 0;
  let indexPromise = null;
  let status = '';
  let lastProgress = 0;

  // Loaded synchronously in <head>, before the browser can signal install eligibility.
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    promptEvent = event;
    draw();
  });
  window.addEventListener('appinstalled', () => {
    promptEvent = null;
    if (controls) controls.installNote.textContent = 'Roshan was installed.';
    draw();
  });

  function installInstructions() {
    const appleMobile = /iPhone|iPad|iPod/.test(navigator.userAgent)
      || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    return appleMobile
      ? 'In Safari, tap Share, then Add to Home Screen.'
      : 'Use your browser menu to install Roshan or add it to your home screen. If there is no install option, you can keep using this site.';
  }

  async function install() {
    controls.installNote.hidden = false;
    if (!promptEvent) {
      controls.installNote.textContent = installInstructions();
      return;
    }
    const event = promptEvent;
    promptEvent = null;
    try {
      await event.prompt();
      const choice = await event.userChoice;
      controls.installNote.textContent = choice.outcome === 'accepted'
        ? 'Roshan installation accepted.' : installInstructions();
    } catch {
      controls.installNote.textContent = installInstructions();
    }
    draw();
  }

  function draw() {
    if (!controls) return;
    controls.install.hidden = isStandalone();
    controls.install.textContent = promptEvent ? 'Install Roshan' : 'How to install';
    controls.shell.textContent = !capable ? 'This browser does not support offline storage for Roshan.'
      : shellReady ? 'App ready offline on this device.'
      : shellError ? 'Could not prepare the offline app. Check storage and retry while online.'
      : 'Preparing the app for offline use. This does not download recordings.';
    controls.retryShell.hidden = !capable || !shellError || shellReady;
    controls.audio.disabled = !shellReady || Boolean(running) || cachedCount === cfg.audioCount;
    controls.audio.textContent = cachedCount === cfg.audioCount ? 'Audio ready offline'
      : cachedCount ? 'Resume audio download' : 'Download all audio (' + wholeMB(cfg.audioBytes) + ')';
    controls.pause.hidden = !running;
    controls.remove.hidden = !cachedCount;
    controls.remove.disabled = Boolean(running);
    controls.progress.max = cfg.audioCount;
    controls.progress.value = cachedCount;
    controls.number.textContent = cachedCount.toLocaleString() + ' of '
      + cfg.audioCount.toLocaleString() + ' recordings saved';
    controls.status.textContent = status;
  }

  function countPaths(keys) {
    return new Set(keys.map((key) => cfg.relative(root, key.url)).filter((name) => name && cfg.audioPath.test(name)));
  }

  async function refreshAudioCount() {
    if (!capable || running) return;
    try {
      cachedCount = await caches.has(audioCache)
        ? countPaths(await (await caches.open(audioCache)).keys()).size : 0;
    } catch {
      cachedCount = 0;
    }
    draw();
  }

  function workerStatus(worker) {
    return new Promise((resolve) => {
      const {port1, port2} = new MessageChannel();
      const finish = (data) => {
        clearTimeout(timeout);
        port1.close();
        resolve(data);
      };
      const timeout = setTimeout(() => finish(null), 900);
      port1.onmessage = (event) => finish(event.data);
      try {
        worker.postMessage('roshan-offline-status-v1', [port2]);
      } catch {
        finish(null);
      }
    });
  }

  async function completeShellCache(name) {
    const marker = await caches.match(absolute(cfg.shellMarker), {cacheName: name});
    return Boolean(marker && await marker.text() === cfg.packVersion
      && await caches.match(absolute('Roshan.html'), {cacheName: name}));
  }

  async function checkShell() {
    try {
      const worker = navigator.serviceWorker.controller;
      const current = worker ? await workerStatus(worker) : null;
      shellReady = Boolean(worker && current?.ready && current.pack === cfg.packVersion);
      if (worker && !shellReady) {
        for (const cacheName of (await caches.keys()).filter((name) => name.startsWith(shellPrefix))) {
          if (await completeShellCache(cacheName)) { shellReady = true; break; }
        }
      }
      if (shellReady) shellError = false;
    } catch {
      shellReady = false;
      shellError = true;
    }
    draw();
  }

  async function register() {
    shellError = false;
    draw();
    try {
      registration = await navigator.serviceWorker.register(absolute('sw.js'), {scope: root.pathname, updateViaCache: 'none'});
      const watch = () => {
        const worker = registration.installing || registration.waiting;
        if (!worker) return;
        worker.addEventListener('statechange', () => {
          if (worker.state === 'redundant' && !registration.active) {
            shellError = true;
            draw();
          }
          if (worker.state === 'activated') checkShell();
        });
      };
      registration.addEventListener('updatefound', watch);
      watch();
      await checkShell();
      if (registration.active && !shellReady && !(await completeShellCache(shellCache))) {
        // The browser may have evicted the shell but retained its worker registration.
        shellError = true;
        draw();
      }
    } catch {
      shellError = true;
      draw();
    }
  }

  async function retryShell() {
    if (registration?.active && !(await completeShellCache(shellCache))) {
      // This registration is only for the Roshan directory; retain app state and audio.
      await registration.unregister();
    }
    await register();
  }

  async function audioIndex(signal) {
    if (!indexPromise) {
      indexPromise = (async () => {
        const response = await fetch(absolute('pwa-media-index.json'), {
          cache: 'no-cache', redirect: 'error', signal,
        });
        if (response.status !== 200) throw new Error('The recording list could not be downloaded.');
        const list = await response.json();
        if (list.pack !== cfg.packVersion || list.bytes !== cfg.audioBytes
            || !Array.isArray(list.files) || list.files.length !== cfg.audioCount) {
          throw new Error('The recording list does not match this version of Roshan.');
        }
        const paths = new Set();
        let bytes = 0;
        for (const entry of list.files) {
          if (!Array.isArray(entry) || entry.length !== 3) throw new Error('Invalid recording list.');
          const [path, size, sha] = entry;
          if (typeof path !== 'string' || !cfg.audioPath.test(path) || paths.has(path)
              || !Number.isSafeInteger(size) || size < 1 || size > 3 * 1024 * 1024
              || typeof sha !== 'string' || !/^[a-f0-9]{64}$/.test(sha)) {
            throw new Error('Invalid recording list.');
          }
          paths.add(path);
          bytes += size;
        }
        if (bytes !== cfg.audioBytes) throw new Error('Invalid recording list size.');
        return list.files;
      })().catch((error) => {
        indexPromise = null;
        throw error;
      });
    }
    return indexPromise;
  }

  async function saveRecording(cache, [path, size, sha], signal) {
    const url = absolute(path);
    const response = await fetch(url, {cache: 'no-store', redirect: 'error', signal});
    if (response.status !== 200 || response.type === 'opaque') {
      throw new Error('A recording could not be downloaded. Resume when the connection is stable.');
    }
    const data = await response.arrayBuffer();
    if (data.byteLength !== size) throw new Error('A recording was incomplete. Resume to try it again.');
    const digest = await crypto.subtle.digest('SHA-256', data);
    const actual = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
    if (actual !== sha) throw new Error('A recording did not pass verification. Resume to try it again.');
    if (signal.aborted) throw new DOMException('Download paused', 'AbortError');
    await cache.put(url, new Response(data, {headers: {
      'Content-Type': cfg.mime[path.split('.').pop()],
      'Content-Length': String(size),
      'Accept-Ranges': 'bytes',
      'ETag': '"' + sha + '"',
    }}));
  }

  async function locked(action) {
    if (!navigator.locks) return action();
    return navigator.locks.request(audioCache, {ifAvailable: true}, async (lock) => {
      if (!lock) throw new Error('Audio is being prepared in another Roshan tab.');
      return action();
    });
  }

  async function download() {
    if (running || !shellReady) return;
    const controller = new AbortController();
    running = controller;
    status = 'Checking available storage and saved recordings…';
    draw();
    try {
      await locked(async () => {
        const entries = await audioIndex(controller.signal);
        const cache = await caches.open(audioCache);
        const saved = countPaths(await cache.keys());
        const missing = entries.filter(([path]) => !saved.has(path));
        cachedCount = entries.length - missing.length;
        const bytes = missing.reduce((sum, [, size]) => sum + size, 0);
        if (!missing.length) {
          status = 'All audio is available offline.';
          return;
        }
        const estimate = navigator.storage?.estimate ? await navigator.storage.estimate().catch(() => null) : null;
        if (estimate?.quota > 0 && Number.isFinite(estimate.usage)
            && bytes > estimate.quota - estimate.usage) {
          throw new Error('This browser has insufficient space for the remaining ' + wholeMB(bytes)
            + '. Free some space and resume.');
        }
        // Best effort only; lack of persistent storage is not a download failure.
        navigator.storage?.persist?.().catch(() => {});
        status = 'Downloading audio. Keep this tab open or pause and resume later.';
        draw();
        let next = 0;
        let failure = null;
        const worker = async () => {
          while (!controller.signal.aborted && next < missing.length) {
            const i = next++;
            try {
              await saveRecording(cache, missing[i], controller.signal);
              cachedCount++;
              const now = performance.now();
              if (now - lastProgress > 250) {
                lastProgress = now;
                draw();
              }
            } catch (error) {
              if (!controller.signal.aborted) {
                failure = error;
                controller.abort();
              }
            }
          }
        };
        await Promise.all(Array.from({length: Math.min(missing.length, 4)}, worker));
        if (failure) throw failure;
        status = controller.signal.aborted
          ? 'Paused. Saved recordings will be kept.' : 'All audio is available offline.';
      });
    } catch (error) {
      status = error.name === 'QuotaExceededError' ? 'Browser storage is full. Saved recordings are kept; free space and resume.'
        : controller.signal.aborted && error.name === 'AbortError' ? 'Paused. Saved recordings will be kept.'
        : error instanceof TypeError || error instanceof SyntaxError ? 'Audio preparation stopped. Check your connection and resume.'
        : error.message || 'Audio preparation stopped. Resume to try again.';
    } finally {
      running = null;
      await refreshAudioCount();
    }
  }

  async function removeAudio() {
    if (running || !confirm('Remove the downloaded Roshan audio from this device? Your study progress will stay.')) return;
    try {
      await locked(() => caches.delete(audioCache));
      status = 'Downloaded audio removed. Study progress was not changed.';
    } catch (error) {
      status = error.message || 'Audio could not be removed.';
    }
    await refreshAudioCount();
  }

  function element(tag, text, id) {
    const node = document.createElement(tag);
    if (text) node.textContent = text;
    if (id) node.id = id;
    return node;
  }

  function mount() {
    const tools = document.querySelector('.top .tools');
    if (!tools) return;
    const details = element('details', null, 'roshan-offline');
    const summary = element('summary', 'Offline');
    const panel = element('div');
    panel.className = 'roshan-offline-panel';
    const installButton = element('button', 'How to install', 'roshan-install');
    const installNote = element('p');
    installNote.hidden = true;
    const shell = element('p', null, 'roshan-offline-shell');
    const retryShellButton = element('button', 'Retry offline setup', 'roshan-retry-shell');
    const progress = element('progress', null, 'roshan-offline-progress');
    progress.setAttribute('aria-label', 'Offline recording download progress');
    const number = element('p', null, 'roshan-offline-count');
    const statusLine = element('p', null, 'roshan-offline-status');
    statusLine.setAttribute('role', 'status');
    const audio = element('button', 'Download all audio', 'roshan-audio-download');
    const pause = element('button', 'Pause download', 'roshan-audio-pause');
    const remove = element('button', 'Remove downloaded audio', 'roshan-audio-remove');
    for (const button of [installButton, retryShellButton, audio, pause, remove]) button.type = 'button';
    installButton.addEventListener('click', install);
    retryShellButton.addEventListener('click', () => retryShell().catch(() => {shellError = true; draw();}));
    audio.addEventListener('click', download);
    pause.addEventListener('click', () => running?.abort());
    remove.addEventListener('click', removeAudio);
    const note = element('p', 'Reading and the app work offline after setup. Download the recordings separately for offline listening.');
    panel.append(installButton, installNote, shell, retryShellButton, note, audio, pause, progress, number, statusLine, remove);
    details.append(summary, panel);
    tools.append(details);
    details.addEventListener('toggle', () => {
      if (details.open) {if (capable) checkShell(); refreshAudioCount();}
    });
    details.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && details.open) {
        event.stopPropagation();
        details.open = false;
        summary.focus();
      }
    });
    controls = {install: installButton, installNote, shell, retryShell: retryShellButton,
      progress, number, status: statusLine, audio, pause, remove};
    draw();
    refreshAudioCount();
  }

  if (capable) {
    navigator.serviceWorker.addEventListener('controllerchange', checkShell);
    checkShell();
    register();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, {once: true});
  else mount();
})();
