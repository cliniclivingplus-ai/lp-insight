// Presentation-only helpers: simpler wording and one-click example questions. No answer logic lives here.
(() => {
  const $ = id => document.getElementById(id);

  // The older script writes a long footer; keep one short, plain line instead.
  const fine = document.querySelector('.fine');
  if (fine) fine.textContent = 'Answers use retrieved library and available scientific evidence. Check citations before acting.';

  // Example questions send immediately once the box is ready.
  document.querySelectorAll('[data-q]').forEach(button => {
    button.addEventListener('click', () => {
      const box = $('question');
      if (!box || box.disabled) return;
      box.value = button.dataset.q;
      $('askForm').requestSubmit();
    });
  });

  // Phone drawer: background stays out of keyboard focus while the menu is open.
  const phone = window.matchMedia('(max-width:820px)');
  const sidebar = $('sidebar'), backdrop = $('sidebarBackdrop'), main = document.querySelector('main');
  const menu = (open, restoreFocus = true) => {
    open = open && phone.matches;
    document.body.classList.toggle('show-chat-sidebar', open);
    $('toggleChats').setAttribute('aria-expanded', String(open));
    backdrop.hidden = !open;
    main.inert = open;
    sidebar.inert = phone.matches && !open;
    if (open) $('closeChatSidebar').focus();
    else if (restoreFocus && phone.matches) $('toggleChats').focus();
  };
  $('toggleChats').onclick = () => menu(!document.body.classList.contains('show-chat-sidebar'));
  $('closeChatSidebar').onclick = () => menu(false);
  backdrop.onclick = () => menu(false);
  phone.addEventListener('change', () => menu(false, false));
  menu(false, false);
  document.addEventListener('click', event => {
    if (!document.body.classList.contains('show-chat-sidebar')) return;
    const target = event.target;
    if (target.closest('#toggleChats')) return;
    if (!target.closest('aside') || target.closest('.saved-chat') || target.closest('#newChat')) menu(false, false);
  });
  document.addEventListener('keydown', event => {
    if (!document.body.classList.contains('show-chat-sidebar')) return;
    if (event.key === 'Escape') { event.preventDefault(); menu(false); }
    if (event.key !== 'Tab') return;
    const items = [...sidebar.querySelectorAll('button,a[href],input,summary')].filter(el => !el.disabled && el.getClientRects().length);
    const first = items[0], last = items.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  });

  // Touch keyboards use Enter for a new line; the visible send button submits.
  const box = $('question'), desktopKeydown = box.onkeydown;
  box.onkeydown = event => {
    if (event.isComposing || window.matchMedia('(pointer:coarse)').matches) return;
    desktopKeydown?.call(box, event);
  };
  const viewport = window.visualViewport;
  const fitViewport = () => {
    // Preserve pinch-to-zoom rather than shrinking the layout during zoom.
    if (viewport && viewport.scale !== 1) return;
    document.documentElement.style.setProperty('--app-height', `${Math.round(viewport?.height || window.innerHeight)}px`);
  };
  viewport?.addEventListener('resize', fitViewport);
  window.addEventListener('resize', fitViewport);
  fitViewport();

  // Shared library: importing happens elsewhere, so hide the leftover upload area.
  const drop = $('drop');
  if (drop) drop.hidden = true;
})();
