// Mostrar / ocultar clave
const pass = document.getElementById('pass');
const togglePass = document.querySelector('.toggle-pass');

togglePass.addEventListener('click', () => {
  const show = pass.type === 'password';
  pass.type = show ? 'text' : 'password';
  togglePass.setAttribute('aria-label', show ? 'Ocultar clave' : 'Mostrar clave');
});

// Permitir solo números en el RIF
const rif = document.getElementById('rif');
rif.addEventListener('input', () => {
  rif.value = rif.value.replace(/\D/g, '').slice(0, 9);
});

// Validación del formulario
const form = document.getElementById('loginForm');

function setError(id, message) {
  const field = document.getElementById(id).closest('.field');
  const error = field.querySelector('.field__error');
  field.classList.toggle('has-error', Boolean(message));
  error.textContent = message || '';
  return !message;
}

form.addEventListener('submit', (e) => {
  e.preventDefault();

  let ok = true;
  ok = setError('rif', rif.value.length >= 8 ? '' : 'Ingresa un RIF válido.') && ok;
  const user = document.getElementById('user');
  ok = setError('user', user.value.trim() ? '' : 'Ingresa tu usuario.') && ok;
  ok = setError('pass', pass.value ? '' : 'Ingresa tu clave de acceso.') && ok;

  if (!ok) return;

  const submit = form.querySelector('.login__submit');
  submit.disabled = true;
  submit.textContent = 'Verificando...';

  setTimeout(() => {
    submit.textContent = 'Ingresar';
    submit.disabled = false;
    alert('Esta es una demostración visual. La conexión con la banca aún no está implementada.');
  }, 1200);
});
