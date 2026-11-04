// The whole brand in one file. Server, site, CLI and MCP all read from here.
export const BRAND = {
  name: "Allot",
  ticker: "ALLOT",
  domain: "allot.fun",
  x: "allotfun",
  tagline: "Give your agent a wallet.",
  pitch: "Your agent gets a Solana wallet and an allotment. It pays APIs over x402, trades any token through Jupiter, and every action lands in a public registry anchored on Solana. Over budget, it stops. Revoked, it stops.",
  color: "#FF5A1F",
  ink: "#0B0B0C",
  paper: "#F6F4EF",
  // One color, no stroke: a disc with its quarter taken out and set aside. The allotted share.
  logoPath: "M44 8a36 36 0 1 0 36 36H44V8Z M52 0v36h36A36 36 0 0 0 52 0Z",
  viewBox: "0 0 88 88",
};

export const logoSvg = (color = BRAND.color, size = 88) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${BRAND.viewBox}" width="${size}" height="${size}"><path fill="${color}" fill-rule="evenodd" d="${BRAND.logoPath}"/></svg>`;
