const field = document.getElementById('userField');
const username = document.getElementById('username');
const submitBtn = document.getElementById('submitBtn');
const form = document.getElementById('loginForm');

const passModal = document.getElementById('passModal');
const passField = document.getElementById('passField');
const password = document.getElementById('password');
const continueBtn = document.getElementById('continueBtn');
const cancelBtn = document.getElementById('cancelBtn');

// Campo usuario
username.addEventListener('focus', () => field.classList.add('focused'));
username.addEventListener('blur', () => field.classList.remove('focused'));
username.addEventListener('input', () => {
  submitBtn.disabled = username.value.trim().length === 0;
});

// Abrir modal de contraseña
form.addEventListener('submit', (e) => {
  e.preventDefault();
  if (username.value.trim().length === 0) return;
  openModal();
});

function openModal() {
  passModal.hidden = false;
  password.value = '';
  continueBtn.disabled = true;
  passField.classList.remove('error');
  setTimeout(() => password.focus(), 50);
}

function closeModal() {
  passModal.hidden = true;
}

// Campo contraseña
password.addEventListener('focus', () => passField.classList.add('focused'));
password.addEventListener('blur', () => {
  passField.classList.remove('focused');
  passField.classList.toggle('error', password.value.length === 0);
});
password.addEventListener('input', () => {
  const empty = password.value.length === 0;
  continueBtn.disabled = empty;
  passField.classList.toggle('error', empty);
});

cancelBtn.addEventListener('click', closeModal);

passModal.addEventListener('click', (e) => {
  if (e.target === passModal) closeModal();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !passModal.hidden) closeModal();
});

continueBtn.addEventListener('click', () => {
  if (password.value.length === 0) return;
  continueBtn.textContent = 'Verificando...';
  continueBtn.disabled = true;
  setTimeout(() => {
    continueBtn.textContent = 'Continuar';
    continueBtn.disabled = false;
    alert('Demostración visual: la autenticación real no está implementada.');
  }, 1000);
});
