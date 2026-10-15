Saved fixture fixes: .storybook/preview.tsx gives Brand/NaeilHeader an interactive ThemeProvider synchronized to global theme; other stories keep forced themes. Header story and clean React example auth buttons now request min-h-11. No generic component behavior changed. Please rebuild/rerun actual Storybook checks.

Second fix saved: HeaderTheme now guards updates with previousGlobal ref. A changing next-themes setter identity cannot reapply the same global theme after a user toggle. Please rebuild/recheck stable state.
