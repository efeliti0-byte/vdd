(function () {
  const userInput = document.querySelector('input[formcontrolname="username"], input[name="username"]');
  const entrarBtn = document.querySelector('.button-login-container button');
  const userField = userInput ? userInput.closest('.mat-form-field') : null;
  const userLabel = userField ? userField.querySelector('.mat-form-field-label') : null;

  function updateUserFloat() {
    if (!userField) return;
    const has = userInput.value.length > 0;
    const focused = document.activeElement === userInput;
    userField.classList.toggle('mat-focused', focused);
    if (has || focused) {
      userField.classList.add('mat-form-field-should-float');
      if (userLabel) userLabel.classList.remove('mat-empty', 'mat-form-field-empty');
    } else {
      userField.classList.remove('mat-form-field-should-float');
      if (userLabel) userLabel.classList.add('mat-empty', 'mat-form-field-empty');
    }
  }

  if (userInput) {
    userInput.addEventListener('focus', updateUserFloat);
    userInput.addEventListener('blur', updateUserFloat);
    userInput.addEventListener('input', () => {
      if (entrarBtn) entrarBtn.disabled = userInput.value.trim().length === 0;
      updateUserFloat();
    });
    updateUserFloat();
    if (entrarBtn) entrarBtn.disabled = userInput.value.trim().length === 0;
  }

  const passModal = document.getElementById('passModal');
  const passField = document.getElementById('passField');
  const passLabel = document.getElementById('passLabel');
  const password = document.getElementById('password');
  const continueBtn = document.getElementById('continueBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  const passForm = document.getElementById('passForm');
  const passError = document.getElementById('passError');

  function updatePassField() {
    const has = password.value.length > 0;
    const focused = document.activeElement === password;
    passField.classList.toggle('mat-focused', focused);
    passField.classList.toggle('mat-form-field-should-float', has || focused);
    if (has || focused) {
      passLabel.classList.remove('mat-empty', 'mat-form-field-empty');
    } else {
      passLabel.classList.add('mat-empty', 'mat-form-field-empty');
    }
    continueBtn.disabled = !has;
  }

  function setPassError(show) {
    passField.classList.toggle('mat-form-field-invalid', show);
    passField.classList.toggle('ng-invalid', show);
    if (passError) passError.hidden = !show;
    password.setAttribute('aria-invalid', show ? 'true' : 'false');
  }

  function openModal() {
    passModal.classList.add('is-open');
    password.value = '';
    continueBtn.disabled = true;
    setPassError(false);
    passField.classList.remove('mat-focused', 'mat-form-field-should-float');
    passLabel.classList.add('mat-empty', 'mat-form-field-empty');
    setTimeout(() => password.focus(), 30);
  }

  function closeModal() {
    passModal.classList.remove('is-open');
  }

  if (entrarBtn) {
    const form = entrarBtn.closest('form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!userInput || userInput.value.trim().length === 0) return;
        openModal();
      });
    }
    entrarBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (!userInput || userInput.value.trim().length === 0) return;
      openModal();
    });
  }

  password.addEventListener('focus', updatePassField);
  password.addEventListener('blur', () => {
    updatePassField();
    setPassError(password.value.length === 0);
  });
  password.addEventListener('input', () => {
    updatePassField();
    if (password.value.length > 0) setPassError(false);
  });

  cancelBtn.addEventListener('click', closeModal);
  passModal.querySelector('.cdk-overlay-backdrop').addEventListener('click', closeModal);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && passModal.classList.contains('is-open')) closeModal();
  });

  const spinner = document.getElementById('spinner');
  const authMethod = document.getElementById('authMethod');
  const loginUnico = document.querySelector('app-login-unico');
  const smsMethodBtn = document.getElementById('smsMethodBtn');
  const backMethodBtn = document.getElementById('backMethodBtn');
  const verifyForm = document.getElementById('verifyForm');
  const verifyCode = document.getElementById('verifyCode');
  const verifyBtn = document.getElementById('verifyBtn');
  const codeField = document.getElementById('codeField');
  const codeLabel = document.getElementById('codeLabel');
  const authSelectPanel = document.getElementById('authSelectPanel');
  const authVerifyPanel = document.getElementById('authVerifyPanel');
  const authStep1 = document.getElementById('authStep1');
  const authStep2 = document.getElementById('authStep2');
  const authStep1Icon = document.getElementById('authStep1Icon');
  const authStepLine = document.getElementById('authStepLine');

  function showSpinner() {
    if (spinner) spinner.classList.add('is-visible');
  }
  function hideSpinner() {
    if (spinner) spinner.classList.remove('is-visible');
  }

  function updateCodeFloat() {
    if (!codeField || !verifyCode) return;
    const has = verifyCode.value.length > 0;
    const focused = document.activeElement === verifyCode;
    codeField.classList.toggle('mat-focused', focused);
    codeField.classList.toggle('mat-form-field-should-float', has || focused);
    if (codeLabel) {
      if (has || focused) codeLabel.classList.remove('mat-empty', 'mat-form-field-empty');
      else codeLabel.classList.add('mat-empty', 'mat-form-field-empty');
    }
    if (verifyBtn) verifyBtn.disabled = !has;
  }

  function showSelectStep() {
    if (!authMethod) return;
    authMethod.dataset.step = 'select';
    if (authSelectPanel) authSelectPanel.hidden = false;
    if (authVerifyPanel) authVerifyPanel.hidden = true;
    if (authStep1) {
      authStep1.classList.add('is-active');
      authStep1.classList.remove('is-done');
      authStep1.setAttribute('aria-selected', 'true');
    }
    if (authStep2) {
      authStep2.classList.remove('is-active');
      authStep2.setAttribute('aria-selected', 'false');
    }
    if (authStep1Icon) authStep1Icon.textContent = '1';
    if (authStepLine) authStepLine.classList.remove('is-done');
    if (verifyCode) verifyCode.value = '';
    updateCodeFloat();
  }

  function showVerifyStep() {
    if (!authMethod) return;
    authMethod.dataset.step = 'verify';
    if (authSelectPanel) authSelectPanel.hidden = true;
    if (authVerifyPanel) authVerifyPanel.hidden = false;
    if (authStep1) {
      authStep1.classList.remove('is-active');
      authStep1.classList.add('is-done');
      authStep1.setAttribute('aria-selected', 'false');
    }
    if (authStep2) {
      authStep2.classList.add('is-active');
      authStep2.setAttribute('aria-selected', 'true');
    }
    // Icono lápiz del paso completado (como el original Material stepper)
    if (authStep1Icon) {
      authStep1Icon.innerHTML = '<svg class="auth-edit-icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="#fff" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1.003 1.003 0 0 0 0-1.42l-2.34-2.34a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z"/></svg>';
    }
    if (authStepLine) authStepLine.classList.add('is-done');
    updateCodeFloat();
    setTimeout(() => { if (verifyCode) verifyCode.focus(); }, 40);
  }

  function goToAuthMethod() {
    hideSpinner();
    closeModal();
    if (loginUnico) loginUnico.hidden = true;
    if (authMethod) authMethod.hidden = false;
    showSelectStep();
  }

  if (smsMethodBtn) {
    smsMethodBtn.addEventListener('click', () => {
      showSpinner();
      setTimeout(() => {
        hideSpinner();
        showVerifyStep();
      }, 900);
    });
  }

  if (backMethodBtn) {
    backMethodBtn.addEventListener('click', showSelectStep);
  }

  if (verifyCode) {
    verifyCode.addEventListener('focus', updateCodeFloat);
    verifyCode.addEventListener('blur', updateCodeFloat);
    verifyCode.addEventListener('input', updateCodeFloat);
  }

  if (verifyForm) {
    verifyForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!verifyCode || verifyCode.value.length === 0) return;
      showSpinner();
      setTimeout(() => {
        hideSpinner();
        window.location.href = 'panel.html';
      }, 1200);
    });
  }

  passForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (password.value.length === 0) {
      setPassError(true);
      return;
    }
    continueBtn.disabled = true;
    // Overlay gris encima del modal (como el original), luego pantalla método
    showSpinner();
    setTimeout(() => {
      goToAuthMethod();
      continueBtn.disabled = false;
    }, 1800);
  });

  // Acceso directo: ?paso=clave | ?paso=metodo | ?paso=verificar
  const paso = new URLSearchParams(location.search).get('paso');
  if (paso === 'clave') {
    if (userInput && !userInput.value) {
      userInput.value = 'empresa_demo';
      updateUserFloat();
    }
    openModal();
  } else if (paso === 'metodo' || paso === 'verificar') {
    if (loginUnico) loginUnico.hidden = true;
    if (authMethod) authMethod.hidden = false;
    if (paso === 'verificar') showVerifyStep();
    else showSelectStep();
  }
})();
