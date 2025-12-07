// CSS module type declarations
declare module '*.css' {
  const tokens: any;
  export default tokens;
  export { tokens };
}

declare module '*.module.css' {
  const content: Record<string, string>;
  export default content;
}

declare module '*.css.ts' {
  const content: any;
  export default content;
}
