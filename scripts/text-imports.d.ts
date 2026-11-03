// scripts/store-assets.mjs bundles these as plain strings (esbuild text loader).
declare module '*.svg' {
  const text: string;
  export default text;
}
declare module '*.css' {
  const text: string;
  export default text;
}
