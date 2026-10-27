'use strict';
// Query routes work on GitHub Pages and survive refreshes without server rewrites.
(() => {
  const pages = ['news', 'standings', 'matches', 'squad', 'transfers', 'videos'];
  const legacy = {stories:'news', matchcentre:'matches', standings:'standings', squad:'squad', transfers:'transfers', videos:'videos'};
  function currentPage() {
    const url = new URL(location.href);
    const page = legacy[url.hash.slice(1)] || url.searchParams.get('page');
    return pages.includes(page) ? page : 'news';
  }
  function renderPage(focus = false) {
    const page = currentPage();
    document.querySelectorAll('[data-page]').forEach(section => { section.hidden = section.dataset.page !== page; });
    document.querySelectorAll('.top-navigation a').forEach(link => {
      const active = new URL(link.href).searchParams.get('page') === page;
      if (active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    document.title = `${page[0].toUpperCase()+page.slice(1)} · Wrexham Reds`;
    if (focus) {
      document.querySelector('#main').focus({preventScroll:true});
      window.scrollTo({top:0, behavior:'instant'});
    }
  }
  window.navigatePage = page => {
    if (!pages.includes(page)) return;
    const url = new URL(location.href);
    url.hash = '';
    url.searchParams.set('page', page);
    if (url.href !== location.href) history.pushState(null, '', url);
    renderPage(true);
  };
  document.querySelectorAll('.top-navigation a').forEach(link => link.addEventListener('click', event => {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    window.navigatePage(new URL(link.href).searchParams.get('page'));
  }));
  window.addEventListener('popstate', () => renderPage(true));
  window.addEventListener('hashchange', () => renderPage(true));
  renderPage();
})();
