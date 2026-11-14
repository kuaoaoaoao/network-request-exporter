// Fill the source link only after the user actually publishes to GitHub Pages.
if (location.hostname.endsWith('.github.io')) {
  const owner=location.hostname.slice(0,-10);
  const segments=location.pathname.split('/').filter(Boolean);
  const repo=segments[0] && segments[0]!=='privacy' ? segments[0] : location.hostname;
  for (const link of document.querySelectorAll('[data-repo]')) {
    link.href=`https://github.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
    link.hidden=false;
  }
}
