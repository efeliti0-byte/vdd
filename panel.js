/**
 * BDVenlínea Empresas - Lógica del Panel
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Fecha y Saludo Dinámico
  const now = new Date();
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const dateStr = now.toLocaleDateString('es-VE', options);
  const dateEl = document.getElementById('currentDateStr');
  if (dateEl) {
    dateEl.textContent = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
  }

  const hour = now.getHours();
  let greeting = 'Buenos días';
  if (hour >= 12 && hour < 18) greeting = 'Buenas tardes';
  else if (hour >= 18 || hour < 5) greeting = 'Buenas noches';

  const greetingEl = document.getElementById('greetingMessage');
  if (greetingEl) {
    greetingEl.textContent = `${greeting}, bienvenido a su portal empresarial`;
  }

  // 2. Control de Ocultar/Mostrar Saldos
  const toggleBalancesBtn = document.getElementById('toggleBalancesBtn');
  let balancesHidden = false;

  toggleBalancesBtn?.addEventListener('click', () => {
    balancesHidden = !balancesHidden;
    document.body.classList.toggle('hide-balances', balancesHidden);
    const eyeIcon = document.getElementById('eyeIcon');
    if (eyeIcon) {
      if (balancesHidden) {
        eyeIcon.innerHTML = `
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
          <line x1="1" y1="1" x2="23" y2="23"></line>
        `;
      } else {
        eyeIcon.innerHTML = `
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
          <circle cx="12" cy="12" r="3"></circle>
        `;
      }
    }
    showToast(balancesHidden ? 'Saldos ocultos' : 'Saldos visibles');
  });

  // 3. Menú Móvil Sidebar
  const toggleSidebarBtn = document.getElementById('toggleSidebar');
  const appSidebar = document.getElementById('appSidebar');
  const sidebarBackdrop = document.getElementById('sidebarBackdrop');

  function toggleSidebar() {
    appSidebar?.classList.toggle('open');
    sidebarBackdrop?.classList.toggle('open');
  }

  toggleSidebarBtn?.addEventListener('click', toggleSidebar);
  sidebarBackdrop?.addEventListener('click', toggleSidebar);

  // 4. Datos de Movimientos (Mock inicial)
  let currentBalanceBs = 1482950.45;
  const movements = [
    {
      date: '13/11/2026',
      ref: '009823141',
      desc: 'TRANSF. RECIBIDA - DISTRIBUIDORA ANDINA C.A.',
      channel: 'BDV enlínea',
      type: 'credit',
      amount: 450000.00,
      balance: 1482950.45
    },
    {
      date: '12/11/2026',
      ref: '008712398',
      desc: 'PAGO NÓMINA QUINCENAL PERSONAL OPERATIVO',
      channel: 'Nómina Masiva',
      type: 'debit',
      amount: -285400.00,
      balance: 1032950.45
    },
    {
      date: '12/11/2026',
      ref: '007623190',
      desc: 'PAGOMÓVILBDV - COBRO A CLIENTE #1048',
      channel: 'PagoMóvil',
      type: 'credit',
      amount: 18450.00,
      balance: 1318350.45
    },
    {
      date: '11/11/2026',
      ref: '006129841',
      desc: 'DECLARACIÓN SENIAT - RETENCIÓN IVA OCTUBRE',
      channel: 'SENIAT Web',
      type: 'debit',
      amount: -92300.00,
      balance: 1299900.45
    },
    {
      date: '10/11/2026',
      ref: '005432198',
      desc: 'VENTA DE DIVISAS INTERVENCION CAMBIARIA BCV',
      channel: 'Mesa de Cambio',
      type: 'credit',
      amount: 850000.00,
      balance: 1392200.45
    },
    {
      date: '09/11/2026',
      ref: '004928172',
      desc: 'TRANSFERENCIA A TERCEROS OTROS BANCOS - BANESCO',
      channel: 'Interbancario',
      type: 'debit',
      amount: -125000.00,
      balance: 542200.45
    }
  ];

  const movesTableBody = document.getElementById('movesTableBody');
  const movesSearch = document.getElementById('movesSearch');
  const filterBtns = document.querySelectorAll('.filter-btn');

  let activeFilter = 'all';

  function formatMoney(num) {
    return num.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function renderMovements() {
    if (!movesTableBody) return;
    const query = movesSearch?.value.toLowerCase().trim() || '';

    const filtered = movements.filter(m => {
      const matchFilter = activeFilter === 'all' || m.type === activeFilter;
      const matchSearch = m.desc.toLowerCase().includes(query) || m.ref.includes(query);
      return matchFilter && matchSearch;
    });

    if (filtered.length === 0) {
      movesTableBody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 30px; color: #94a3b8;">
            No se encontraron movimientos con los criterios seleccionados.
          </td>
        </tr>
      `;
      return;
    }

    movesTableBody.innerHTML = filtered.map(m => {
      const isCredit = m.type === 'credit';
      const amountClass = isCredit ? 'amount-positive' : 'amount-negative';
      const sign = isCredit ? '+' : '';
      return `
        <tr>
          <td><span style="font-weight: 600;">${m.date}</span></td>
          <td><code style="color: #64748b;">${m.ref}</code></td>
          <td><strong>${m.desc}</strong></td>
          <td><span class="badge-tag">${m.channel}</span></td>
          <td class="text-right ${amountClass} sensitive-data">${sign}Bs. ${formatMoney(Math.abs(m.amount))}</td>
          <td class="text-right sensitive-data" style="font-weight: 600; color: #334155;">Bs. ${formatMoney(m.balance)}</td>
        </tr>
      `;
    }).join('');
  }

  movesSearch?.addEventListener('input', renderMovements);

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.dataset.filter || 'all';
      renderMovements();
    });
  });

  renderMovements();

  // 5. Botones de Copiar Cuenta
  document.querySelectorAll('.btn-copy').forEach(btn => {
    btn.addEventListener('click', () => {
      const copyVal = btn.getAttribute('data-copy');
      if (copyVal) {
        navigator.clipboard.writeText(copyVal).then(() => {
          showToast(`Cuenta copiada: ${copyVal}`);
        }).catch(() => {
          showToast(`Cuenta: ${copyVal}`);
        });
      }
    });
  });

  // 6. Modal de Transferencias
  const transferModal = document.getElementById('transferModal');
  const openTransferModalBtn = document.getElementById('openTransferModalBtn');
  const closeTransferModal = document.getElementById('closeTransferModal');
  const cancelTransferBtn = document.getElementById('cancelTransferBtn');
  const transferForm = document.getElementById('transferForm');

  function openModal() {
    transferModal?.classList.add('is-active');
  }

  function closeModal() {
    transferModal?.classList.remove('is-active');
    transferForm?.reset();
  }

  openTransferModalBtn?.addEventListener('click', openModal);
  closeTransferModal?.addEventListener('click', closeModal);
  cancelTransferBtn?.addEventListener('click', closeModal);

  // Botones "Transferir" en tarjetas de cuentas
  document.querySelectorAll('.btn-do-transfer, #tileTransfer, #tilePagoMovil').forEach(btn => {
    btn.addEventListener('click', openModal);
  });

  // Otros tiles con mensaje ilustrativo
  document.getElementById('tileNomina')?.addEventListener('click', () => {
    showToast('Módulo de Nómina Masiva: Archivo TXT cargado exitosamente.');
  });
  document.getElementById('tileSeniat')?.addEventListener('click', () => {
    showToast('Conectando con plataforma SENIAT Tributos...');
  });
  document.getElementById('tileExtracto')?.addEventListener('click', () => {
    showToast('Generando estado de cuenta en formato PDF...');
  });

  // Botón Actualizar Cuentas
  document.getElementById('btnRefreshAccounts')?.addEventListener('click', () => {
    showToast('Saldos y cuentas actualizados correctamente.');
  });

  // Manejo de envío de transferencia simulada
  transferForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const amountVal = parseFloat(document.getElementById('transferAmount').value);
    const concept = document.getElementById('transferConcept').value.trim();
    const destAcc = document.getElementById('destAccount').value.trim();

    if (isNaN(amountVal) || amountVal <= 0) {
      showToast('Por favor ingrese un monto válido.');
      return;
    }

    if (amountVal > currentBalanceBs) {
      showToast('Fondos insuficientes en la cuenta origen.');
      return;
    }

    // Actualizar saldo
    currentBalanceBs -= amountVal;
    const totalBsEl = document.getElementById('totalBs');
    if (totalBsEl) {
      totalBsEl.textContent = formatMoney(currentBalanceBs);
    }
    const accHighlight = document.querySelector('.bal-val-highlight');
    if (accHighlight) {
      accHighlight.textContent = `Bs. ${formatMoney(currentBalanceBs)}`;
    }

    // Agregar nuevo movimiento al inicio
    const refNum = '00' + Math.floor(1000000 + Math.random() * 9000000);
    movements.unshift({
      date: `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth()+1).toString().padStart(2, '0')}/${now.getFullYear()}`,
      ref: refNum,
      desc: `TRANSF. ENVIADA - ${concept.toUpperCase()}`,
      channel: 'BDV enlínea',
      type: 'debit',
      amount: -amountVal,
      balance: currentBalanceBs
    });

    renderMovements();
    closeModal();
    showToast(`Transferencia exitosa por Bs. ${formatMoney(amountVal)} (Ref: ${refNum})`);
  });

  // 7. Sistema de Toast
  const toast = document.getElementById('appToast');
  const toastMsg = document.getElementById('toastMessage');
  let toastTimer = null;

  function showToast(message) {
    if (!toast || !toastMsg) return;
    toastMsg.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, 3200);
  }
});
