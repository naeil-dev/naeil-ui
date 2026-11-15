/** Approved D2/D4 adjustments applied outside immutable historical fixtures. */
export const frameComparisonPolicy = `
@font-face {
  font-family: 'Pretendard Latin';
  font-weight: 100 900;
  src: url('/fonts/PretendardVariable.woff2') format('woff2');
  unicode-range: U+0020-007E, U+00A0-00FF;
}
@layer base {
  body { line-height: 1.5625; }
  :lang(ja) {
    font-family: 'Pretendard Latin', 'Noto Sans JP', 'Pretendard Variable', Pretendard, 'Noto Sans JP', -apple-system, system-ui, sans-serif;
  }
}
html:root [data-naeil-chrome][lang]:lang(ja),
html:root [data-naeil-locale-menu][lang] :lang(ja) {
  --naeil-chrome-font: 'Pretendard Latin', 'Noto Sans JP', 'Pretendard Variable', Pretendard, 'Noto Sans JP', -apple-system, system-ui, sans-serif;
  font-family: var(--naeil-chrome-font);
}
`;
