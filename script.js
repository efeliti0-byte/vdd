// Menús desplegables
const dropdowns = document.querySelectorAll('.has-dropdown');

dropdowns.forEach((item) => {
  const trigger = item.querySelector(':scope > button');
  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    const wasOpen = item.classList.contains('is-open');
    dropdowns.forEach((d) => d.classList.remove('is-open'));
    if (!wasOpen) item.classList.add('is-open');
  });
});

document.addEventListener('click', () => {
  dropdowns.forEach((d) => d.classList.remove('is-open'));
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') dropdowns.forEach((d) => d.classList.remove('is-open'));
});

// Menú móvil
const header = document.querySelector('.site-header');
const navToggle = document.querySelector('.nav-toggle');

navToggle.addEventListener('click', () => {
  const open = header.classList.toggle('nav-open');
  navToggle.setAttribute('aria-expanded', open);
});

// Acordeón
document.querySelectorAll('.accordion__item').forEach((item) => {
  const header = item.querySelector('.accordion__header');
  const panel = item.querySelector('.accordion__panel');

  header.addEventListener('click', () => {
    const open = item.classList.toggle('is-open');
    header.setAttribute('aria-expanded', open);
    panel.style.maxHeight = open ? `${panel.scrollHeight}px` : '0';
  });
});
