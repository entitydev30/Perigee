import { Html, Head, Main, NextScript } from "next/document";

const themeInitScript = `
(function() {
  try {
    var storedTheme = localStorage.getItem('theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (storedTheme === 'dark' || (!storedTheme && prefersDark)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  } catch (e) {}
})();
`;

export default function Document() {
  return (
    <Html lang="en">
      <Head />
      <body>
        {/* eslint-disable-next-line react/no-danger -- render-blocking theme bootstrap; runs before hydration to avoid a flash of the wrong theme. */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
