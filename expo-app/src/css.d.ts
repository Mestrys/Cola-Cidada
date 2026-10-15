// Imports de CSS (global.css e *.module.css, usados na web). Os tipos do Expo para isso vêm de expo-env.d.ts, que é
// gerado por `expo start` e fica fora do git: esta declaração faz o `tsc` funcionar também num checkout limpo (CI).
declare module '*.css';
declare module '*.module.css' {
  const classes: Record<string, string>;
  export default classes;
}
