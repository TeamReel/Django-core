// CSS module type declarations
declare module '*.css' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tokens: any;
  export default tokens;
  export { tokens };
}

declare module '*.module.css' {
  const content: Record<string, string>;
  export default content;
}

declare module '*.css.ts' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const content: any;
  export default content;
}
