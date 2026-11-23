/* Shared, scoped constants for the published Roshan browser edition. */
(() => {
  'use strict';
  const shellVersion = 'november-2026-pwa-1';
  // An app-only deploy bumps shellVersion, not packVersion.
  const packVersion = 'november-2026-original-recordings-1';
  const audioCount = 14371;
  const audioBytes = 848840582;
  const audioPath = /^media\/(?:(?:approved|approved-native|chimishe|derived)\/)?[a-f0-9-]{20,}\.(?:m4a|mp3|wav|webm)$/;
  const mime = Object.freeze({m4a: 'audio/mp4', mp3: 'audio/mpeg', wav: 'audio/wav', webm: 'audio/webm'});
  const shellMarker = '.roshan-offline-shell-ready';
  const shell = Object.freeze([
    'index.html', 'Roshan.html', 'manifest.webmanifest',
    'assets/pwa-shared.js', 'assets/pwa.js', 'assets/pwa.css',
    'assets/roshan.css', 'assets/custom-theme.css', 'assets/roshan.ico', 'assets/roshan-180.png',
    'assets/roshan-192.png', 'assets/roshan-512.png', 'assets/roshan.js',
    'assets/custom-palette.js', 'assets/custom-theme.js', 'fonts/Vazirmatn.woff2',
  ]);
  const names = (root) => {
    const prefix = 'roshan-pwa:' + encodeURIComponent(root.pathname) + ':';
    return {
      shellPrefix: prefix + 'shell:',
      shellCache: prefix + 'shell:' + shellVersion,
      audioCache: prefix + 'audio:' + packVersion,
    };
  };
  function relative(root, input) {
    const url = new URL(input);
    if (url.origin !== root.origin || url.search || url.hash
        || !url.pathname.startsWith(root.pathname)) return null;
    return url.pathname.slice(root.pathname.length);
  }
  globalThis.RoshanPwa = Object.freeze({
    shellVersion, packVersion, audioCount, audioBytes, audioPath, mime, shell, shellMarker, names, relative,
  });
})();
