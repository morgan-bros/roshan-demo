/* Pure color derivation for the isolated preview. No DOM or storage access. */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.RoshanCustomPalette = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const DEFAULT_COLOR = '#3978c6';
  const DEFAULTS = Object.freeze({
    light: Object.freeze({ main: '#f4f3ee', accent: '#1f6b4e' }),
    dark: Object.freeze({ main: '#121715', accent: '#4fb787' }),
    roshan: Object.freeze({ main: '#061636', accent: '#ffd153' })
  });
  const BASE_SURFACES = {
    light: ['#f4f3ee', '#ffffff', '#f7f7f2'],
    dark: ['#121715', '#1b2320', '#222c28'],
    roshan: ['#061636', '#0f2440', '#142e4c']
  };

  function parseColor(value) {
    if (typeof value !== 'string') return null;
    const color = value.trim().toLowerCase();
    if (/^#[0-9a-f]{6}$/.test(color)) return color;
    if (/^#[0-9a-f]{3}$/.test(color)) return '#' + [...color.slice(1)].map(c => c + c).join('');
    return null;
  }
  function normalizeColor(value, fallback) {
    return parseColor(value) || parseColor(fallback) || DEFAULT_COLOR;
  }
  const rgb = color => [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16));
  const hex = channels => '#' + channels.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  function mix(a, b, amount) {
    const x = rgb(normalizeColor(a)), y = rgb(normalizeColor(b));
    const t = Number.isFinite(amount) ? Math.max(0, Math.min(1, amount)) : 0;
    return hex(x.map((v, i) => v * (1 - t) + y[i] * t));
  }
  function luminance(color) {
    const [r, g, b] = rgb(normalizeColor(color)).map(v => {
      const n = v / 255;
      return n <= 0.04045 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
  function contrast(a, b) {
    const x = luminance(a), y = luminance(b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  }
  // Keep each preset's light/dark character; repair rendered foregrounds
  // without changing the user's separately retained Main and Accent picks.
  function readable(candidate, backgrounds, minimum, lightStyle) {
    const endpoint = lightStyle ? '#000000' : '#ffffff';
    for (let step = 0; step <= 100; step++) {
      const color = mix(candidate, endpoint, step / 100);
      if (backgrounds.every(bg => contrast(color, bg) >= minimum)) return color;
    }
    return endpoint;
  }
  function onColor(background) {
    return contrast('#000000', background) >= contrast('#ffffff', background) ? '#000000' : '#ffffff';
  }
  function derive(theme, mainValue, accentValue) {
    const style = Object.prototype.hasOwnProperty.call(DEFAULTS, theme) ? theme : 'roshan';
    const defaults = DEFAULTS[style], lightStyle = style === 'light';
    const main = normalizeColor(mainValue, defaults.main);
    const accent = normalizeColor(accentValue, defaults.accent);
    let surfaces;
    if (main === defaults.main) surfaces = BASE_SURFACES[style].slice();
    else if (lightStyle) surfaces = [mix('#ffffff', main, 0.12), mix('#ffffff', main, 0.04), mix('#ffffff', main, 0.18)];
    else {
      const bases = style === 'dark' ? ['#0c1210', '#17201c', '#1e2a24'] : ['#06122d', '#0c2040', '#142e4c'];
      surfaces = [mix(bases[0], main, 0.14), mix(bases[1], main, 0.18), mix(bases[2], main, 0.18)];
    }
    const [bg, surface, surface2] = surfaces;
    const accentSoft = mix(bg, accent, lightStyle ? 0.1 : 0.23);
    const warnSoft = mix(bg, '#ffc34a', lightStyle ? 0.1 : 0.15);
    const goodSoft = mix(bg, '#48b982', lightStyle ? 0.1 : 0.15);
    const badSoft = mix(bg, '#e66868', lightStyle ? 0.1 : 0.15);
    const backgrounds = [bg, surface, surface2, accentSoft, warnSoft, goodSoft, badSoft];
    const text = (candidate, minimum = 4.5, against = backgrounds) => readable(candidate, against, minimum, lightStyle);
    const safeAccent = text(accent);
    const warn = text(lightStyle ? '#986014' : '#ffd16a');
    const good = text(lightStyle ? '#207447' : '#83d7ac');
    const bad = text(lightStyle ? '#a83d32' : '#ffad9c');
    return {
      main, accent,
      variables: {
        '--bg': bg, '--surface': surface, '--surface-2': surface2,
        '--line': mix(surface2, lightStyle ? '#000000' : '#ffffff', 0.12),
        '--line-strong': text(lightStyle ? '#697b73' : '#778ba2', 3.2),
        '--ink': text(lightStyle ? '#1d2a25' : '#f4f7fb'),
        '--ink-2': text(lightStyle ? '#4b5a53' : '#d4deeb'),
        '--muted': text(lightStyle ? '#69786f' : '#b9c8da'),
        '--accent': safeAccent, '--accent-ink': onColor(safeAccent),
        '--accent-soft': accentSoft,
        '--accent-soft-ink': text(safeAccent, 4.5, [accentSoft]),
        '--warn': warn, '--warn-soft': warnSoft,
        '--warn-ink': text(warn, 4.5, [warnSoft]),
        '--good': good, '--good-soft': goodSoft,
        '--bad': bad, '--bad-soft': badSoft
      }
    };
  }
  return Object.freeze({ DEFAULT_COLOR, DEFAULTS, normalizeColor, derive, contrast, mix });
});
