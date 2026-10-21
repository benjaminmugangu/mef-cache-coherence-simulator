/**
 * Rendu SVG et Animation des Schémas MEF (MSI, MESI et Répertoire/Directory)
 */

export class FsmDiagram {
  constructor(containerId, protocol = 'DIRECTORY') {
    this.container = document.getElementById(containerId);
    this.protocol = protocol;
    this.render();
  }

  setProtocol(protocol) {
    this.protocol = protocol;
    this.render();
  }

  render() {
    if (this.protocol === 'MSI') {
      this.renderMsi();
    } else if (this.protocol === 'MESI') {
      this.renderMesi();
    } else {
      this.renderDirectory();
    }
  }

  renderMsi() {
    this.container.innerHTML = `
      <svg viewBox="0 0 850 520" class="fsm-svg">
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b" />
          </marker>
          <marker id="arrow-active" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#38bdf8" />
          </marker>
        </defs>

        <g id="t_invalid_to_shared" class="transition-group">
          <path d="M 310 120 L 510 120" marker-end="url(#arrow)" class="edge-path" />
          <text x="410" y="98" class="edge-label label-red" text-anchor="middle">CPU Read Miss</text>
          <text x="410" y="142" class="edge-sublabel" text-anchor="middle">Placer Read Miss sur le Bus</text>
        </g>

        <g id="t_invalid_to_modified" class="transition-group">
          <path d="M 230 190 L 330 330" marker-end="url(#arrow)" class="edge-path" />
          <text x="230" y="270" class="edge-label label-red" text-anchor="end">CPU Write Miss</text>
          <text x="230" y="288" class="edge-sublabel" text-anchor="end">Placer write Miss sur le Bus</text>
        </g>

        <g id="t_shared_to_modified_write" class="transition-group">
          <path d="M 545 190 L 440 330" marker-end="url(#arrow)" class="edge-path" />
          <text x="520" y="250" class="edge-label label-red">CPU Write Hit</text>
          <text x="520" y="268" class="edge-sublabel">Placer write Invalidate sur le Bus</text>
        </g>

        <g id="t_modified_to_shared_read" class="transition-group">
          <path d="M 405 320 L 525 170" marker-end="url(#arrow)" class="edge-path" />
          <text x="400" y="195" class="edge-label label-red" text-anchor="end">Snoop Read Miss</text>
          <text x="400" y="213" class="edge-sublabel" text-anchor="end">Write Back le bloc</text>
        </g>

        <g id="t_shared_read_hit" class="transition-group">
          <path d="M 625 100 A 35 35 0 1 1 645 155" marker-end="url(#arrow)" class="edge-path loop-path" fill="none" />
          <text x="660" y="60" class="edge-label label-red">CPU Read Hit</text>
        </g>

        <g id="t_modified_read_hit" class="transition-group">
          <path d="M 330 420 A 40 40 0 1 1 290 380" marker-end="url(#arrow)" class="edge-path loop-path" fill="none" />
          <text x="180" y="375" class="edge-label label-red" text-anchor="end">CPU Read/Write Hit</text>
        </g>

        <g id="node_Invalide" class="state-node">
          <circle cx="230" cy="120" r="65" class="node-circle node-invalid" />
          <text x="230" y="125" class="node-title" text-anchor="middle">Invalide (I)</text>
        </g>

        <g id="node_Partagé" class="state-node">
          <circle cx="600" cy="120" r="65" class="node-circle node-shared" />
          <text x="600" y="125" class="node-title" text-anchor="middle">Partagé (S)</text>
        </g>

        <g id="node_Modifié" class="state-node">
          <circle cx="380" cy="380" r="70" class="node-circle node-modified" />
          <text x="380" y="385" class="node-title" text-anchor="middle">Modifié (M)</text>
        </g>
      </svg>
    `;
  }

  renderMesi() {
    this.container.innerHTML = `
      <svg viewBox="0 0 900 540" class="fsm-svg">
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b" />
          </marker>
          <marker id="arrow-active" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#38bdf8" />
          </marker>
        </defs>

        <g id="t_invalid_to_exclusive" class="transition-group">
          <path d="M 225 110 L 375 110" marker-end="url(#arrow)" class="edge-path" />
          <text x="300" y="88" class="edge-label label-red" text-anchor="middle">CPU Read Miss</text>
          <text x="300" y="103" class="edge-sublabel" text-anchor="middle">(Aucun autre cache)</text>
        </g>

        <g id="t_invalid_to_shared" class="transition-group">
          <path d="M 215 80 Q 450 15 685 80" marker-end="url(#arrow)" class="edge-path" fill="none" />
          <text x="450" y="38" class="edge-label label-red" text-anchor="middle">CPU Read Miss</text>
          <text x="450" y="53" class="edge-sublabel" text-anchor="middle">(Présent dans autre cache)</text>
        </g>

        <g id="t_invalid_to_modified" class="transition-group">
          <path d="M 180 170 L 390 355" marker-end="url(#arrow)" class="edge-path" />
          <text x="250" y="270" class="edge-label label-red" text-anchor="end">CPU Write Miss</text>
          <text x="250" y="288" class="edge-sublabel" text-anchor="end">Placer write Miss (BusRdX)</text>
        </g>

        <g id="t_exclusive_to_modified" class="transition-group">
          <path d="M 450 175 L 450 330" marker-end="url(#arrow)" class="edge-path" />
          <text x="460" y="235" class="edge-label label-red">CPU Write Hit</text>
          <text x="460" y="255" class="edge-sublabel" style="fill: #10b981; font-weight: bold;">PAS DE BUS ! (Gain MESI)</text>
        </g>

        <g id="t_exclusive_to_shared" class="transition-group">
          <path d="M 505 110 L 635 110" marker-end="url(#arrow)" class="edge-path" />
          <text x="570" y="90" class="edge-label label-red" text-anchor="middle">Snoop BusRd</text>
        </g>

        <g id="t_shared_to_modified_write" class="transition-group">
          <path d="M 685 170 L 510 355" marker-end="url(#arrow)" class="edge-path" />
          <text x="630" y="270" class="edge-label label-red">CPU Write Hit</text>
          <text x="630" y="288" class="edge-sublabel">Placer BusUpgr</text>
        </g>

        <g id="t_modified_to_shared_read" class="transition-group">
          <path d="M 480 340 L 660 170" marker-end="url(#arrow)" class="edge-path" />
          <text x="520" y="195" class="edge-label label-red" text-anchor="end">Snoop BusRd</text>
          <text x="520" y="213" class="edge-sublabel" text-anchor="end">Write Back le bloc</text>
        </g>

        <g id="t_exclusive_read_hit" class="transition-group">
          <path d="M 425 40 A 30 30 0 1 1 475 40" marker-end="url(#arrow)" class="edge-path loop-path" fill="none" />
          <text x="450" y="15" class="edge-label label-red" text-anchor="middle">CPU Read Hit</text>
        </g>

        <g id="t_shared_read_hit" class="transition-group">
          <path d="M 740 90 A 30 30 0 1 1 740 145" marker-end="url(#arrow)" class="edge-path loop-path" fill="none" />
          <text x="780" y="60" class="edge-label label-red">CPU Read Hit</text>
        </g>

        <g id="t_modified_read_hit" class="transition-group">
          <path d="M 390 440 A 35 35 0 1 1 350 400" marker-end="url(#arrow)" class="edge-path loop-path" fill="none" />
          <text x="240" y="420" class="edge-label label-red" text-anchor="end">CPU Read/Write Hit</text>
        </g>

        <g id="node_Invalide" class="state-node">
          <circle cx="160" cy="110" r="60" class="node-circle node-invalid" />
          <text x="160" y="115" class="node-title" text-anchor="middle">Invalide (I)</text>
        </g>

        <g id="node_Exclusif" class="state-node">
          <circle cx="450" cy="110" r="60" class="node-circle node-exclusive" />
          <text x="450" y="115" class="node-title" text-anchor="middle">Exclusif (E)</text>
        </g>

        <g id="node_Partagé" class="state-node">
          <circle cx="710" cy="110" r="60" class="node-circle node-shared" />
          <text x="710" y="115" class="node-title" text-anchor="middle">Partagé (S)</text>
        </g>

        <g id="node_Modifié" class="state-node">
          <circle cx="450" cy="400" r="65" class="node-circle node-modified" />
          <text x="450" y="405" class="node-title" text-anchor="middle">Modifié (M)</text>
        </g>
      </svg>
    `;
  }

  renderDirectory() {
    this.container.innerHTML = `
      <svg viewBox="0 0 850 500" class="fsm-svg">
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b" />
          </marker>
          <marker id="arrow-active" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#ec4899" />
          </marker>
        </defs>

        <!-- Edges / Transitions du Contrôleur de Répertoire -->

        <!-- Uncached -> Shared -->
        <g id="t_dir_uncached_to_shared" class="transition-group">
          <path d="M 480 150 L 630 310" marker-end="url(#arrow)" class="edge-path" />
          <text x="590" y="210" class="edge-label" style="fill: #ec4899;">Demande Read-Miss</text>
          <text x="590" y="228" class="edge-sublabel">Envoi donnée RAM + Ajout au vecteur</text>
        </g>

        <!-- Uncached -> Modified -->
        <g id="t_dir_uncached_to_modified" class="transition-group">
          <path d="M 370 150 L 220 310" marker-end="url(#arrow)" class="edge-path" />
          <text x="250" y="210" class="edge-label" style="fill: #ec4899;" text-anchor="end">Demande Write-Miss</text>
          <text x="250" y="228" class="edge-sublabel" text-anchor="end">Octroi propriété exclusive</text>
        </g>

        <!-- Shared -> Modified -->
        <g id="t_dir_shared_to_modified" class="transition-group">
          <path d="M 600 370 L 270 370" marker-end="url(#arrow)" class="edge-path" />
          <text x="435" y="350" class="edge-label" style="fill: #ec4899;" text-anchor="middle">Demande Écriture / Upgrade</text>
          <text x="435" y="392" class="edge-sublabel" text-anchor="middle">Invalidations CIBLÉES (Unicast) aux membres du vecteur</text>
        </g>

        <!-- Modified -> Shared -->
        <g id="t_dir_modified_to_shared" class="transition-group">
          <path d="M 270 340 L 600 340" marker-end="url(#arrow)" class="edge-path" />
          <text x="435" y="315" class="edge-label" style="fill: #ec4899;" text-anchor="middle">Read-Miss par autre CPU</text>
          <text x="435" y="332" class="edge-sublabel" text-anchor="middle">Fetch-Forward au propriétaire + Write-Back RAM</text>
        </g>

        <!-- Loop Shared -> Shared -->
        <g id="t_dir_shared_to_shared" class="transition-group">
          <path d="M 720 320 A 30 30 0 1 1 720 380" marker-end="url(#arrow)" class="edge-path loop-path" fill="none" />
          <text x="760" y="335" class="edge-label" style="fill: #ec4899;">Read-Miss (Autre CPU)</text>
          <text x="760" y="355" class="edge-sublabel">Ajout au vecteur de présence</text>
        </g>

        <!-- Loop Modified -> Modified -->
        <g id="t_dir_modified_to_modified" class="transition-group">
          <path d="M 140 320 A 30 30 0 1 1 140 380" marker-end="url(#arrow)" class="edge-path loop-path" fill="none" />
          <text x="80" y="335" class="edge-label" style="fill: #ec4899;" text-anchor="end">Write-Miss / Hit</text>
          <text x="80" y="355" class="edge-sublabel" text-anchor="end">Transfert de propriété ciblée</text>
        </g>

        <!-- Nodes Directory -->
        <g id="node_Uncached (Non-caché)" class="state-node">
          <circle cx="435" cy="100" r="65" class="node-circle" style="stroke: #94a3b8; fill: #1e293b;" />
          <text x="435" y="98" class="node-title" text-anchor="middle">Non-caché</text>
          <text x="435" y="118" class="node-subtitle" text-anchor="middle">(Uncached)</text>
        </g>

        <g id="node_Shared (Partagé)" class="state-node">
          <circle cx="660" cy="350" r="65" class="node-circle node-shared" />
          <text x="660" y="348" class="node-title" text-anchor="middle">Partagé</text>
          <text x="660" y="368" class="node-subtitle" text-anchor="middle">(Shared)</text>
        </g>

        <g id="node_Modified (Modifié)" class="state-node">
          <circle cx="200" cy="350" r="65" class="node-circle node-modified" />
          <text x="200" y="348" class="node-title" text-anchor="middle">Modifié</text>
          <text x="200" y="368" class="node-subtitle" text-anchor="middle">(Modified)</text>
        </g>
      </svg>
    `;
  }

  highlightTransition(event) {
    document.querySelectorAll('.state-node').forEach(el => el.classList.remove('active', 'glow'));
    document.querySelectorAll('.transition-group').forEach(el => {
      el.classList.remove('active');
      const path = el.querySelector('.edge-path');
      if (path) path.setAttribute('marker-end', 'url(#arrow)');
    });

    if (!event) return;

    if (this.protocol === 'DIRECTORY' && event.currentSnapshot && event.currentSnapshot.directory) {
      const dirState = event.currentSnapshot.directory[event.tag].state;
      const dirNode = document.getElementById(`node_${dirState}`);
      if (dirNode) dirNode.classList.add('active', 'glow');

      const cacheNode = document.getElementById(`node_${event.newState}`);
      if (cacheNode) cacheNode.classList.add('active');
    } else {
      const prevNode = document.getElementById(`node_${event.prevState}`);
      const currNode = document.getElementById(`node_${event.newState}`);

      if (prevNode) prevNode.classList.add('active');
      if (currNode) currNode.classList.add('active', 'glow');
    }

    let transId = event.transitionId;
    if (transId) {
      const transGroup = document.getElementById(transId);
      if (transGroup) {
        transGroup.classList.add('active');
        const path = transGroup.querySelector('.edge-path');
        if (path) path.setAttribute('marker-end', 'url(#arrow-active)');
      }
    }
  }
}
