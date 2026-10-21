import { MsiEngine, TAGS, PROCESSORS } from './msi_engine.js';
import { FsmDiagram } from './fsm_diagram.js';

document.addEventListener('DOMContentLoaded', () => {
  const engine = new MsiEngine('DIRECTORY');
  const fsm = new FsmDiagram('fsm-container', 'DIRECTORY');

  // Elements UI
  const selectProtocol = document.getElementById('select-protocol');
  const protocolBadge = document.getElementById('protocol-badge');
  const fsmCardTitle = document.getElementById('fsm-card-title');
  const directoryCardSection = document.getElementById('directory-card-section');

  const selectCpu = document.getElementById('select-cpu');
  const selectTag = document.getElementById('select-tag');
  const inputValue = document.getElementById('input-value');
  const btnRead = document.getElementById('btn-read');
  const btnWrite = document.getElementById('btn-write');
  const btnReset = document.getElementById('btn-reset');

  const busIndicator = document.getElementById('bus-indicator');
  const busMsg = document.getElementById('bus-msg');
  const lastTransitionBadge = document.getElementById('last-transition-badge');
  const historyTableBody = document.getElementById('history-table-body');

  // Presets
  const preset1 = document.getElementById('preset-1');
  const preset2 = document.getElementById('preset-2');
  const preset3 = document.getElementById('preset-3');
  const preset4 = document.getElementById('preset-4');

  function updateProtocolUI() {
    const proto = selectProtocol.value;
    engine.setProtocol(proto);
    fsm.setProtocol(proto);

    if (proto === 'DIRECTORY') {
      protocolBadge.textContent = 'Mode Répertoire (Unicast) Actif';
      protocolBadge.style.borderColor = '#ec4899';
      protocolBadge.style.color = '#f472b6';
      fsmCardTitle.textContent = 'Machine à États du Répertoire (Directory Controller)';
      directoryCardSection.style.display = 'block';

      preset1.textContent = '1. Demande de Lecture (Uncached -> Shared)';
      preset2.textContent = '2. Partage de Lecture (Vecteur de Présence [P1, P2])';
      preset3.textContent = '3. Invalidation Ciblée (Unicast sans Broadcast !)';
      preset4.textContent = '4. Fetch-Forward & Write-Back via Répertoire';
    } else if (proto === 'MESI') {
      protocolBadge.textContent = 'Protocole MESI (4 États) Actif';
      protocolBadge.style.borderColor = '#10b981';
      protocolBadge.style.color = '#34d399';
      fsmCardTitle.textContent = 'Graphe MEF (Protocole MESI Snoopy)';
      directoryCardSection.style.display = 'none';

      preset1.textContent = '1. Lecture Unique (P1 Read -> EXCLUSIF)';
      preset2.textContent = '2. Écriture Exclusive (P1 Write -> MODIFIÉ Sans Bus !)';
      preset3.textContent = '3. Lecture Partagée (P2 Read -> P1 & P2 PARTAGÉ)';
      preset4.textContent = '4. Invalidation & Write-Back (P3 Read sur P1 Modifié)';
    } else {
      protocolBadge.textContent = 'Protocole MSI (3 États) Actif';
      protocolBadge.style.borderColor = '#38bdf8';
      protocolBadge.style.color = '#38bdf8';
      fsmCardTitle.textContent = 'Graphe MEF (Protocole MSI Snoopy)';
      directoryCardSection.style.display = 'none';

      preset1.textContent = '1. Lecture Initiale (P1 Read Miss -> PARTAGÉ)';
      preset2.textContent = '2. Partage de Lecture (P2 Read Miss -> PARTAGÉ)';
      preset3.textContent = '3. Invalidation par Écriture (P1 Write Hit sur Shared)';
      preset4.textContent = '4. Write-Back (P3 Read Miss sur P1 Modifié)';
    }

    busMsg.textContent = `Système réinitialisé sous le protocole ${proto}.`;
    lastTransitionBadge.textContent = 'Système initialisé';
    renderSystemState();
  }

  selectProtocol.onchange = () => updateProtocolUI();

  function renderSystemState() {
    // 1. Render Directory Table
    const dirBody = document.getElementById('directory-table-body');
    dirBody.innerHTML = '';
    TAGS.forEach(tag => {
      const dirEntry = engine.directory[tag];
      const tr = document.createElement('tr');

      let presenceBitsHtml = '';
      PROCESSORS.forEach(p => {
        const isActive = dirEntry.presence[p];
        presenceBitsHtml += `<span class="presence-bit ${isActive ? 'active' : ''}">${p}</span>`;
      });

      const stateCleanName = dirEntry.state.split(' ')[0];

      tr.innerHTML = `
        <td><strong>Tag ${tag}</strong></td>
        <td><span class="badge badge-${stateCleanName}">${dirEntry.state}</span></td>
        <td>${presenceBitsHtml}</td>
        <td>${dirEntry.owner ? `<strong style="color: #f59e0b">${dirEntry.owner}</strong>` : '<span style="color: var(--text-muted)">Aucun</span>'}</td>
      `;
      dirBody.appendChild(tr);
    });

    // 2. Render Caches P1, P2, P3
    PROCESSORS.forEach(cpu => {
      const tbody = document.getElementById(`cache-${cpu.toLowerCase()}-body`);
      tbody.innerHTML = '';

      TAGS.forEach(tag => {
        const cacheEntry = engine.caches[cpu][tag];
        const tr = document.createElement('tr');

        tr.innerHTML = `
          <td><strong>${tag}</strong></td>
          <td><span class="badge badge-${cacheEntry.state}">${cacheEntry.state}</span></td>
          <td>${cacheEntry.value !== null ? cacheEntry.value : '<span style="color: var(--text-muted)">-</span>'}</td>
          <td>
            <button class="quick-action-btn btn-quick-read" data-cpu="${cpu}" data-tag="${tag}">R</button>
            <button class="quick-action-btn btn-quick-write" data-cpu="${cpu}" data-tag="${tag}">W</button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    });

    // Quick action listeners
    document.querySelectorAll('.btn-quick-read').forEach(btn => {
      btn.onclick = () => handleRead(btn.dataset.cpu, btn.dataset.tag);
    });
    document.querySelectorAll('.btn-quick-write').forEach(btn => {
      btn.onclick = () => {
        selectCpu.value = btn.dataset.cpu;
        selectTag.value = btn.dataset.tag;
        handleWrite(btn.dataset.cpu, btn.dataset.tag);
      };
    });

    // 3. Render Main Memory
    const memBody = document.getElementById('main-memory-body');
    memBody.innerHTML = '';
    TAGS.forEach(tag => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>Tag ${tag}</strong></td>
        <td><code>0x${tag}</code></td>
        <td style="color: var(--primary); font-weight: 600;">${engine.mainMemory[tag]}</td>
      `;
      memBody.appendChild(tr);
    });

    // 4. Render History Table
    renderHistory();
  }

  function handleRead(cpu, tag) {
    const event = engine.read(cpu, tag);
    updateUIForEvent(event);
  }

  function handleWrite(cpu, tag) {
    const val = inputValue.value || '99';
    const event = engine.write(cpu, tag, val);
    updateUIForEvent(event);
  }

  function updateUIForEvent(event) {
    // Highlight FSM Diagram
    fsm.highlightTransition(event);

    // Update Bus Monitor
    busIndicator.classList.add('active');
    busMsg.textContent = event.busMessage;
    lastTransitionBadge.textContent = `${event.cpu} [Tag ${event.tag}] : ${event.prevState} ➔ ${event.newState}`;

    setTimeout(() => {
      busIndicator.classList.remove('active');
    }, 1500);

    renderSystemState();
  }

  function renderHistory() {
    if (engine.history.length === 0) {
      historyTableBody.innerHTML = `
        <tr>
          <td colspan="9" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">
            Aucune transaction effectuée. Utilisez le panneau de commande pour lancer des requêtes.
          </td>
        </tr>
      `;
      return;
    }

    historyTableBody.innerHTML = '';
    engine.history.forEach(ev => {
      const tr = document.createElement('tr');

      let snoopingText = '-';
      if (ev.snoopingEvents.length > 0) {
        snoopingText = ev.snoopingEvents.map(s => `<b>${s.cpu}</b>: ${s.action}`).join('<br>');
      }
      if (ev.writeBack !== null) {
        snoopingText += `<br><span style="color: var(--state-modified)">[Write-Back RAM = ${ev.writeBack}]</span>`;
      }

      tr.innerHTML = `
        <td>#${ev.step}</td>
        <td><span class="badge-course" style="font-size:0.7rem;">${ev.protocol}</span></td>
        <td><strong>${ev.cpu}</strong></td>
        <td><code>${ev.tag}</code></td>
        <td class="${ev.operation === 'LIRE' ? 'op-read' : 'op-write'}">${ev.operation}</td>
        <td>${ev.eventType}</td>
        <td>
          <span class="badge badge-${ev.prevState}">${ev.prevState}</span>
          ➔
          <span class="badge badge-${ev.newState}">${ev.newState}</span>
        </td>
        <td style="font-family: monospace; font-size: 0.78rem; max-width: 320px; word-wrap: break-word;">${ev.busMessage}</td>
        <td style="font-size: 0.82rem;">${snoopingText}</td>
      `;
      historyTableBody.appendChild(tr);
    });
  }

  // Bind Control Form
  btnRead.onclick = () => handleRead(selectCpu.value, selectTag.value);
  btnWrite.onclick = () => handleWrite(selectCpu.value, selectTag.value);

  btnReset.onclick = () => {
    engine.reset();
    fsm.highlightTransition(null);
    busMsg.textContent = `Système réinitialisé sous le protocole ${engine.protocol}.`;
    lastTransitionBadge.textContent = 'Système initialisé';
    renderSystemState();
  };

  // Preset Scenarios
  preset1.onclick = () => {
    engine.reset();
    handleRead('P1', '00');
  };

  preset2.onclick = () => {
    if (engine.protocol === 'DIRECTORY') {
      engine.reset();
      handleRead('P1', '00'); // P1 -> Shared, Presence [P1]
      handleRead('P2', '00'); // P2 -> Shared, Presence [P1, P2]
    } else if (engine.protocol === 'MESI') {
      engine.reset();
      handleRead('P1', '00'); // P1 -> EXCLUSIF
      handleWrite('P1', '00', '555'); // P1 -> MODIFIÉ (SANS BUS !)
    } else {
      engine.reset();
      handleRead('P1', '00');
      handleRead('P2', '00');
    }
  };

  preset3.onclick = () => {
    if (engine.protocol === 'DIRECTORY') {
      engine.reset();
      handleRead('P1', '00');
      handleRead('P2', '00'); // Presence [P1, P2]
      handleWrite('P1', '00', '777'); // P1 Write -> Targeted Invalidation on P2 ONLY!
    } else if (engine.protocol === 'MESI') {
      engine.reset();
      handleRead('P1', '00'); // P1 -> EXCLUSIF
      handleRead('P2', '00'); // P2 Read -> P1 & P2 PARTAGÉ
    } else {
      engine.reset();
      handleRead('P1', '00');
      handleRead('P2', '00');
      handleWrite('P1', '00', '777');
    }
  };

  preset4.onclick = () => {
    engine.reset();
    handleRead('P1', '00');
    handleWrite('P1', '00', '888'); // P1 Modifié / Owner P1
    handleRead('P3', '00');          // P3 Read Miss -> Fetch Forward to P1 -> Write Back
  };

  // Initial Render
  updateProtocolUI();
});
