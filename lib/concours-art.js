// Dessins du jeu de Noël (page /concours et images de partage) : manette et maillot génériques, sans logo ni design de marque.
const svg = (s) => `data:image/svg+xml;base64,${Buffer.from(s).toString("base64")}`;

export const GAMEPAD_SVG = svg(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 150"><defs><linearGradient id="b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#c9d1e0"/></linearGradient></defs><path d="M60 18H180C214 18 230 42 236 78L240 104C244 132 222 148 200 138C186 132 178 116 168 108H72C62 116 54 132 40 138C18 148-4 132 0 104L4 78C10 42 26 18 60 18Z" fill="url(#b)"/><path d="M72 108H168" stroke="#aab3c5" stroke-width="2"/><rect x="50" y="56" width="40" height="13" rx="4" fill="#1b2233"/><rect x="63.5" y="42.5" width="13" height="40" rx="4" fill="#1b2233"/><circle cx="178" cy="46" r="8.5" fill="#ff7a1a"/><circle cx="196" cy="63" r="8.5" fill="#ff7a1a"/><circle cx="160" cy="63" r="8.5" fill="#ff7a1a"/><circle cx="178" cy="80" r="8.5" fill="#ff7a1a"/><circle cx="98" cy="98" r="15" fill="#1b2233"/><circle cx="98" cy="98" r="8" fill="#2c3549"/><circle cx="142" cy="98" r="15" fill="#1b2233"/><circle cx="142" cy="98" r="8" fill="#2c3549"/></svg>`
);

export const JERSEY_SVG = svg(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 240"><defs><linearGradient id="j" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2a2f38"/><stop offset="1" stop-color="#0c0e12"/></linearGradient></defs><path d="M58 8H82C86 32 114 32 118 8H142L152 14C148 42 158 62 178 72V232H22V72C42 62 52 42 48 14Z" fill="url(#j)" stroke="#c8d0d8" stroke-width="6" stroke-linejoin="round"/><path d="M84 10C88 36 112 36 116 10" fill="none" stroke="#c8d0d8" stroke-width="5"/><path d="M89 112L113 101H120V188H101V128L92 132Z" fill="#c8d0d8"/></svg>`
);

export const ARROW_SVG = svg(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M4 12h15M13 5l7 7-7 7" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`
);
