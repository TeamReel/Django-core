// CSS module type declarations
declare module '*.css' {
  const content: Record<string, string>;
  export default content;
}

declare module '*.module.css' {
  const content: Record<string, string>;
  export default content;
}

declare module '*.css.ts' {
  const content: Record<string, string>;
  export default content;
}
