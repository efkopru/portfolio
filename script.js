(() => {
  'use strict';
  document.documentElement.classList.add('js');
  const themeColors = { classic: '#e0e9f0', midnight: '#111c2b', evergreen: '#f3f7f2', sandstone: '#f7f2ea' };
  const themeSelect = document.querySelector('[data-theme-select]');
  if (themeSelect) {
    const applyTheme = value => {
      const theme = Object.hasOwn(themeColors, value) ? value : 'classic';
      document.documentElement.dataset.theme = theme;
      themeSelect.value = theme;
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', themeColors[theme]);
      return theme;
    };
    applyTheme(document.documentElement.dataset.theme);
    const themeToolbar = document.querySelector('[data-theme-toolbar]');
    if (themeToolbar) themeToolbar.hidden = false;
    themeSelect.addEventListener('change', () => {
      const theme = applyTheme(themeSelect.value);
      try { localStorage.setItem('ekopru-theme', theme); }
      catch { /* Theme switching still works when storage is blocked. */ }
    });
  }

  // Submit in place; only a positive provider response may clear the message.
  const contactForm = document.querySelector('[data-contact-form]');
  if (contactForm) {
    const status = document.querySelector('[data-contact-status]');
    const submit = contactForm.querySelector('[data-contact-submit]');
    const fields = [...contactForm.querySelectorAll('.form-field input, .form-field textarea')];
    const confirmation = document.querySelector('[data-contact-success]');
    confirmation?.querySelector('[data-contact-success-close]')?.addEventListener('click', () => confirmation.close());
    confirmation?.addEventListener('close', () => status.focus());
    let sending = false;
    let sent = false;
    // A fresh page permits sending again, including browsers that restore disabled buttons.
    submit.disabled = false;
    contactForm.addEventListener('submit', async event => {
      event.preventDefault();
      if (sending || sent || !contactForm.reportValidity()) return;
      sending = true;
      const originalLabel = submit.textContent;
      const readOnly = fields.map(field => field.readOnly);
      let timer;
      submit.disabled = true;
      submit.textContent = 'Sending...';
      contactForm.setAttribute('aria-busy', 'true');
      status.dataset.state = 'pending';
      status.textContent = 'Sending your message...';
      try {
        const body = new FormData(contactForm);
        fields.forEach(field => { field.readOnly = true; });
        const controller = new AbortController();
        timer = setTimeout(() => controller.abort(), 20000);
        const response = await fetch(contactForm.dataset.contactEndpoint, {
          method: 'POST',
          body,
          headers: { Accept: 'application/json' },
          credentials: 'omit',
          signal: controller.signal
        });
        const result = await response.json();
        if (!response.ok || (result?.success !== true && result?.success !== 'true')) {
          throw new Error('Submission was not confirmed.');
        }
        sent = true;
        contactForm.reset();
        status.dataset.state = 'success';
        status.textContent = 'Message sent.';
      } catch {
        // A timeout can happen after acceptance, so never retry automatically.
        status.dataset.state = 'error';
        status.textContent = 'We could not confirm submission. Your message is still here. Please wait before trying again, or use the email link below.';
      } finally {
        clearTimeout(timer);
        fields.forEach((field, index) => { field.readOnly = sent || readOnly[index]; });
        contactForm.removeAttribute('aria-busy');
        submit.disabled = sent;
        submit.textContent = sent ? 'Message sent' : originalLabel;
        sending = false;
      }
      // Popup failures must never turn an accepted submission into a retryable error.
      if (sent && typeof confirmation?.showModal === 'function') {
        try { confirmation.showModal(); }
        catch { status.focus(); }
      } else status.focus();
    });
  }
  const root = document.body.dataset.root || './';
  const nav = document.querySelector('#site-nav');
  const toggle = document.querySelector('.menu-toggle');
  const groups = [...document.querySelectorAll('.nav-group')];
  const desktopNavigation = window.matchMedia('(min-width: 1200px)');
  function closeGroups(except) {
    groups.forEach(group => {
      if (group === except) return;
      group.classList.remove('open');
      group.querySelector('button').setAttribute('aria-expanded', 'false');
    });
  }
  function closeMenu() {
    nav?.classList.remove('open');
    toggle?.setAttribute('aria-expanded', 'false');
    if (toggle) toggle.textContent = 'Menu';
    closeGroups();
  }
  if (toggle && nav) {
    toggle.hidden = false;
    toggle.addEventListener('click', () => {
      const open = !nav.classList.contains('open');
      nav.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.textContent = open ? 'Close menu' : 'Menu';
      if (!open) closeGroups();
    });
    groups.forEach(group => {
      const button = group.querySelector('button');
      let openedByHover = false;
      button.addEventListener('click', () => {
        const open = openedByHover || !group.classList.contains('open');
        openedByHover = false;
        closeGroups(group);
        group.classList.toggle('open', open);
        button.setAttribute('aria-expanded', String(open));
      });
      group.addEventListener('pointerenter', event => {
        if (event.pointerType !== 'mouse' || !desktopNavigation.matches) return;
        openedByHover = !group.classList.contains('open');
        closeGroups(group);
        group.classList.add('open');
        button.setAttribute('aria-expanded', 'true');
      });
      group.addEventListener('pointerleave', () => {
        openedByHover = false;
        if (group.contains(document.activeElement)) return;
        group.classList.remove('open');
        button.setAttribute('aria-expanded', 'false');
      });
      group.addEventListener('focusout', event => {
        if (event.relatedTarget && !group.contains(event.relatedTarget)) {
          group.classList.remove('open');
          button.setAttribute('aria-expanded', 'false');
        }
      });
    });
    document.addEventListener('click', event => {
      if (!event.target.closest('.site-header') || event.target.closest('.site-nav a')) closeMenu();
    });
    document.addEventListener('keydown', event => {
      if (event.key !== 'Escape' || document.querySelector('dialog[open]')) return;
      const expanded = groups.find(g => g.classList.contains('open'));
      if (expanded) { closeGroups(); expanded.querySelector('button').focus(); }
      else if (nav.classList.contains('open')) { closeMenu(); toggle.focus(); }
    });
    desktopNavigation.addEventListener('change', closeMenu);
  }

  // Native dialog supplies modal focus containment and Escape handling.
  // The ordinary image link remains usable when JavaScript is unavailable.
  const viewer = document.querySelector('.image-viewer');
  if (viewer && typeof viewer.showModal === 'function') {
    const image = viewer.querySelector('.viewer-image');
    const viewport = viewer.querySelector('.viewer-viewport');
    const status = viewer.querySelector('.viewer-status');
    const zoomLabel = viewer.querySelector('.zoom-level');
    const zoomIn = viewer.querySelector('[data-zoom-in]');
    const zoomOut = viewer.querySelector('[data-zoom-out]');
    const fitButton = viewer.querySelector('[data-zoom-reset]');
    let zoom = 1;
    let fit = 1;
    let trigger;
    let ready = false;
    function paint(center = true) {
      if (!ready) return;
      const oldWidth = image.width;
      const oldHeight = image.height;
      const x = (viewport.scrollLeft + viewport.clientWidth / 2 - image.offsetLeft) / Math.max(oldWidth, 1);
      const y = (viewport.scrollTop + viewport.clientHeight / 2 - image.offsetTop) / Math.max(oldHeight, 1);
      image.style.width = `${Math.round(image.naturalWidth * fit * zoom)}px`;
      image.style.height = `${Math.round(image.naturalHeight * fit * zoom)}px`;
      zoomLabel.textContent = `${Math.round(zoom * 100)}%`;
      zoomLabel.title = 'Zoom relative to Fit to screen';
      zoomIn.disabled = zoom >= 4;
      zoomOut.disabled = zoom <= 0.5;
      if (center) {
        viewport.scrollLeft = image.offsetLeft + x * image.width - viewport.clientWidth / 2;
        viewport.scrollTop = image.offsetTop + y * image.height - viewport.clientHeight / 2;
      }
    }
    function fitImage() {
      if (!ready) return;
      // Include space occupied by zoom scrollbars so resetting always gives the same fit.
      const bounds = viewport.getBoundingClientRect();
      if (bounds.width <= 0 || bounds.height <= 0) return;
      // Fill 95% of the limiting dimension, including upscaling smaller originals.
      fit = 0.95 * Math.min(bounds.width / image.naturalWidth, bounds.height / image.naturalHeight);
      zoom = 1;
      paint(false);
      viewport.scrollTo(0, 0);
    }
    function setZoom(value) { zoom = Math.max(0.5, Math.min(4, value)); paint(); }
    document.addEventListener('click', event => {
      const link = event.target.closest('a[data-image-viewer]');
      if (!link || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      trigger = link;
      ready = false;
      zoom = 1;
      image.hidden = true;
      image.removeAttribute('style');
      const caption = link.dataset.caption || link.querySelector('img')?.alt || 'Project image';
      image.alt = caption;
      viewer.querySelector('.viewer-caption').textContent = caption;
      status.textContent = 'Loading image…';
      zoomLabel.textContent = '100%';
      zoomIn.disabled = zoomOut.disabled = fitButton.disabled = true;
      viewer.showModal();
      document.body.classList.add('viewer-open');
      image.onload = () => {
        if (!viewer.open) return;
        ready = true;
        image.hidden = false;
        status.textContent = '';
        fitButton.disabled = false;
        fitImage();
      };
      image.onerror = () => { status.textContent = 'This image could not load. Close the viewer and try again.'; };
      image.src = link.href;
    });
    viewer.querySelector('[data-viewer-close]').addEventListener('click', () => viewer.close());
    viewer.addEventListener('click', event => {
      const box = viewer.getBoundingClientRect();
      if (event.target === viewer && (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom)) viewer.close();
    });
    viewer.addEventListener('close', () => {
      ready = false;
      document.body.classList.remove('viewer-open');
      image.onload = image.onerror = null;
      image.removeAttribute('src');
      trigger?.focus({ preventScroll: true });
    });
    zoomIn.addEventListener('click', () => setZoom(zoom + 0.25));
    zoomOut.addEventListener('click', () => setZoom(zoom - 0.25));
    fitButton.addEventListener('click', fitImage);
    viewer.addEventListener('keydown', event => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key === '+' || event.key === '=') { event.preventDefault(); if (ready) setZoom(zoom + 0.25); }
      if (event.key === '-') { event.preventDefault(); if (ready) setZoom(zoom - 0.25); }
      if (event.key === '0') { event.preventDefault(); fitImage(); }
    });
    window.addEventListener('resize', () => { if (viewer.open) fitImage(); });
  }

  const allowedEmbedHosts = new Set(['maps.cityoflewisville.com', 'experience.arcgis.com', 'lewisville.maps.arcgis.com', 'www.arcgis.com']);
  document.querySelectorAll('[data-load-embed]').forEach(button => {
    button.hidden = false;
    button.addEventListener('click', () => {
      const host = button.closest('[data-embed-src]');
      const url = new URL(host.dataset.embedSrc);
      if (url.protocol !== 'https:' || !allowedEmbedHosts.has(url.hostname)) return;
      const frame = document.createElement('iframe');
      frame.src = url.href;
      frame.title = host.dataset.embedTitle;
      frame.referrerPolicy = 'no-referrer';
      frame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups');
      host.replaceChildren(frame);
      host.classList.add('loaded');
    });
  });

  // Retain original hash bookmarks, but route to the original distinct pages.
  const routes = new Set(['about','resume','contact','privacy','additional-projects','utility-inspection-etl','lead-service-line-ocr','accessibility-analysis','spatial-and-data-analysis','spatial-analysis','arcgis-enterprise-and-online','qgis','code-enforcement-violations','crime-analysis','ml-optimization','income-level-prediction-using-r','building-footprint-extraction','traveling-salesman','water-conservation-routes','development-and-etl','python-and-notebooks','sql-and-javascript-and-r','modelbuilder-and-arcmap-tool-in-vbnet','interactive-maps-a-custom-js-app','interactive-maps-experience-builder','doctoral-research','lead-service-review-prototype','workforce-participation','s2s-transformer-bias-correction','dask-ensemble-calibration','vit-heatwave-calibration','transformer-bias-correction','geospatial-processing-tools']);
  function legacyRoute() {
    let slug;
    try { slug = decodeURIComponent(location.hash.replace(/^#\/?/, '')); }
    catch { location.replace(`${root}404.html`); return; }
    if (routes.has(slug)) location.replace(`${root}${slug}/index.html`);
    else if (location.hash.startsWith('#/')) location.replace(`${root}404.html`);
  }
  window.addEventListener('hashchange', legacyRoute);
  legacyRoute();
})();
