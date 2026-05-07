export const BUILT_IN_ICON_MAP = { School: 'book', Work: 'briefcase', Personal: 'person', Errands: 'bag', Health: 'heart' }

export const ICON_PATHS = {
  book:       [[<path key="a" d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/>, <path key="b" d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/>]],
  briefcase:  [[<rect key="a" x="2" y="7" width="20" height="14" rx="2"/>, <path key="b" d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/>]],
  person:     [[<circle key="a" cx="12" cy="8" r="4"/>, <path key="b" d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>]],
  bag:        [[<path key="a" d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>, <line key="b" x1="3" y1="6" x2="21" y2="6"/>, <path key="c" d="M16 10a4 4 0 01-8 0"/>]],
  heart:      [[<path key="a" d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>]],
  star:       [[<polygon key="a" points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>]],
  home:       [[<path key="a" d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>, <polyline key="b" points="9 22 9 12 15 12 15 22"/>]],
  plane:      [[<path key="a" d="M22 2L11 13"/>, <path key="b" d="M22 2L15 22 11 13 2 9l20-7z"/>]],
  leaf:       [[<path key="a" d="M2 22c0 0 5-3 10-8s8-12 8-12-7 3-12 8-6 12-6 12z"/>, <path key="b" d="M2 22l7-7"/>]],
  music:      [[<path key="a" d="M9 18V5l12-2v13"/>, <circle key="b" cx="6" cy="18" r="3"/>, <circle key="c" cx="18" cy="16" r="3"/>]],
  target:     [[<circle key="a" cx="12" cy="12" r="10"/>, <circle key="b" cx="12" cy="12" r="6"/>, <circle key="c" cx="12" cy="12" r="2"/>]],
  pencil:     [[<path key="a" d="M12 20h9"/>, <path key="b" d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4Z"/>]],
  rocket:     [[<path key="a" d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 00-2.91-.09z"/>, <path key="b" d="M12 15l-3-3a22 22 0 012-3.95A12.88 12.88 0 0122 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 01-4 2z"/>]],
  tag:        [[<path key="a" d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/>, <line key="b" x1="7" y1="7" x2="7.01" y2="7"/>]],
  clock:      [[<circle key="a" cx="12" cy="12" r="10"/>, <polyline key="b" points="12 6 12 12 16 14"/>]],
  dumbbell:   [[<path key="a" d="M6.5 6.5h-3v11h3"/>, <path key="b" d="M17.5 6.5h3v11h-3"/>, <line key="c" x1="6.5" y1="12" x2="17.5" y2="12"/>, <path key="d" d="M6.5 9v6"/>, <path key="e" d="M17.5 9v6"/>]],
  coffee:     [[<path key="a" d="M17 8h1a4 4 0 010 8h-1"/>, <path key="b" d="M3 8h14v9a4 4 0 01-4 4H7a4 4 0 01-4-4z"/>, <line key="c" x1="6" y1="2" x2="6" y2="4"/>, <line key="d" x1="10" y1="2" x2="10" y2="4"/>, <line key="e" x1="14" y1="2" x2="14" y2="4"/>]],
  camera:     [[<path key="a" d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>, <circle key="b" cx="12" cy="13" r="4"/>]],
  flag:       [[<path key="a" d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>, <line key="b" x1="4" y1="22" x2="4" y2="15"/>]],
  map:        [[<polygon key="a" points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>, <line key="b" x1="8" y1="2" x2="8" y2="18"/>, <line key="c" x1="16" y1="6" x2="16" y2="22"/>]],
  sun:        [[<circle key="a" cx="12" cy="12" r="4"/>, <path key="b" d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>]],
  moon:       [[<path key="a" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>]],
  zap:        [[<polygon key="a" points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>]],
  globe:      [[<circle key="a" cx="12" cy="12" r="10"/>, <line key="b" x1="2" y1="12" x2="22" y2="12"/>, <path key="c" d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>]],
  phone:      [[<path key="a" d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2"/>]],
  mail:       [[<path key="a" d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>, <polyline key="b" points="22,6 12,13 2,6"/>]],
  calendar:   [[<rect key="a" x="3" y="4" width="18" height="18" rx="2"/>, <line key="b" x1="16" y1="2" x2="16" y2="6"/>, <line key="c" x1="8" y1="2" x2="8" y2="6"/>, <line key="d" x1="3" y1="10" x2="21" y2="10"/>]],
  lock:       [[<rect key="a" x="3" y="11" width="18" height="11" rx="2"/>, <path key="b" d="M7 11V7a5 5 0 0110 0v4"/>]],
  key:        [[<circle key="a" cx="8" cy="15" r="4"/>, <path key="b" d="M12 11l8-8"/>, <path key="c" d="M20 8l-2 2"/>, <path key="d" d="M17 5l2 2"/>]],
  graduation: [[<path key="a" d="M22 10v6M2 10l10-5 10 5-10 5z"/>, <path key="b" d="M6 12v5c3 3 9 3 12 0v-5"/>]],
  fire:       [[<path key="a" d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z"/>]],
  trophy:     [[<path key="a" d="M6 9H4a1 1 0 01-1-1V5a1 1 0 011-1h16a1 1 0 011 1v3a1 1 0 01-1 1h-2"/>, <path key="b" d="M12 17a7 7 0 007-7H5a7 7 0 007 7z"/>, <path key="c" d="M12 17v4"/>, <path key="d" d="M8 21h8"/>]],
  code:       [[<polyline key="a" points="16 18 22 12 16 6"/>, <polyline key="b" points="8 6 2 12 8 18"/>]],
  chart:      [[<line key="a" x1="18" y1="20" x2="18" y2="10"/>, <line key="b" x1="12" y1="20" x2="12" y2="4"/>, <line key="c" x1="6" y1="20" x2="6" y2="14"/>]],
  dollar:     [[<line key="a" x1="12" y1="1" x2="12" y2="23"/>, <path key="b" d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>]],
  headphones: [[<path key="a" d="M3 18v-6a9 9 0 0118 0v6"/>, <path key="b" d="M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3z"/>, <path key="c" d="M3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3z"/>]],
  gift:       [[<polyline key="a" points="20 12 20 22 4 22 4 12"/>, <rect key="b" x="2" y="7" width="20" height="5"/>, <line key="c" x1="12" y1="22" x2="12" y2="7"/>, <path key="d" d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z"/>, <path key="e" d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/>]],
  compass:    [[<circle key="a" cx="12" cy="12" r="10"/>, <polygon key="b" points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>]],
  flask:      [[<path key="a" d="M10 2v7.31L5.5 19A2 2 0 007.31 22h9.38a2 2 0 001.81-2.69L14 9.31V2"/>, <line key="b" x1="8.5" y1="2" x2="15.5" y2="2"/>]],
  cloud:      [[<path key="a" d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z"/>]],
}

export const ICON_LIST = Object.keys(ICON_PATHS)

export function CategoryIcon({ name, iconId, size = 18, color = 'white' }) {
  const id = (iconId && ICON_PATHS[iconId]) ? iconId : (BUILT_IN_ICON_MAP[name] || 'tag')
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      {ICON_PATHS[id]}
    </svg>
  )
}
