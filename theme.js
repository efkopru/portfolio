// Apply a saved, allowlisted theme before the stylesheet paints the page.
(() => {
  'use strict';
  let theme = 'classic';
  try {
    const saved = localStorage.getItem('ekopru-theme');
    if (['classic', 'midnight', 'evergreen'].includes(saved)) theme = saved;
  } catch {
    // Storage may be unavailable in private browsing or when opening local files.
  }
  document.documentElement.dataset.theme = theme;
})();
