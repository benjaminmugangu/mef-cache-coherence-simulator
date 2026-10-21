/**
 * Moteur de Cohérence de Cache (Protocole Snoopy MSI, Snoopy MESI, et Protocole basé sur Répertoire)
 * Systèmes à Multiprocesseurs et Machines Parallèles
 */

export const STATES = {
  INVALID: 'Invalide',
  SHARED: 'Partagé',
  EXCLUSIVE: 'Exclusif',
  MODIFIED: 'Modifié'
};

export const DIR_STATES = {
  UNCACHED: 'Uncached (Non-caché)',
  SHARED: 'Shared (Partagé)',
  MODIFIED: 'Modified (Modifié)'
};

export const TAGS = ['00', '02', '04', '08'];
export const PROCESSORS = ['P1', 'P2', 'P3'];

export class MsiEngine {
  constructor(protocol = 'DIRECTORY') {
    this.protocol = protocol; // 'MSI', 'MESI', ou 'DIRECTORY'
    this.reset();
  }

  setProtocol(protocol) {
    this.protocol = protocol;
    this.reset();
  }

  reset() {
    this.mainMemory = {
      '00': 100,
      '02': 200,
      '04': 300,
      '08': 400
    };

    this.caches = {};
    PROCESSORS.forEach(cpu => {
      this.caches[cpu] = {};
      TAGS.forEach(tag => {
        this.caches[cpu][tag] = {
          state: STATES.INVALID,
          value: null
        };
      });
    });

    // Structure du Répertoire (Directory Table) pour chaque bloc
    this.directory = {};
    TAGS.forEach(tag => {
      this.directory[tag] = {
        state: DIR_STATES.UNCACHED,
        presence: { P1: false, P2: false, P3: false },
        owner: null
      };
    });

    this.stepCount = 0;
    this.history = [];
    this.lastEvent = null;
  }

  getSnapshot() {
    return JSON.parse(JSON.stringify({
      mainMemory: this.mainMemory,
      caches: this.caches,
      directory: this.directory
    }));
  }

  /**
   * Exécute une opération de Lecture (Read) par un CPU
   */
  read(cpuId, tag) {
    this.stepCount++;
    const prevSnapshot = this.getSnapshot();
    const entry = this.caches[cpuId][tag];
    const prevState = entry.state;
    const dirEntry = this.directory[tag];

    let eventType = '';
    let busMessage = '';
    let snoopingEvents = [];
    let transitionId = '';
    let writeBackOccurred = false;
    let writeBackValue = null;

    if (prevState === STATES.SHARED || prevState === STATES.EXCLUSIVE || prevState === STATES.MODIFIED) {
      // Local Read Hit
      eventType = 'CPU Read Hit';
      busMessage = `Aucun message réseau (Local Read Hit dans le cache L1 de ${cpuId})`;
      if (prevState === STATES.SHARED) transitionId = 't_shared_read_hit';
      else if (prevState === STATES.EXCLUSIVE) transitionId = 't_exclusive_read_hit';
      else transitionId = 't_modified_read_hit';
    } else {
      // Read Miss
      eventType = 'CPU Read Miss';

      if (this.protocol === 'DIRECTORY') {
        // Logique spécifique au Protocole basé sur Répertoire
        const prevDirState = dirEntry.state;
        let networkSteps = [];

        networkSteps.push(`1. [${cpuId} ➔ Répertoire] Message Unicast : Demande de lecture (Read-Req) pour Tag ${tag}`);

        if (dirEntry.state === DIR_STATES.UNCACHED) {
          // Cas 1 : Bloc Non-caché dans le Répertoire
          entry.value = this.mainMemory[tag];
          entry.state = STATES.SHARED;

          dirEntry.state = DIR_STATES.SHARED;
          dirEntry.presence[cpuId] = true;

          networkSteps.push(`2. [Répertoire ➔ ${cpuId}] Envoi du bloc depuis la RAM. Mise à jour Répertoire : État=Partagé, Présence=[${cpuId}]`);
          transitionId = 't_dir_uncached_to_shared';

        } else if (dirEntry.state === DIR_STATES.SHARED) {
          // Cas 2 : Bloc déjà Partagé par d'autres processeurs
          entry.value = this.mainMemory[tag];
          entry.state = STATES.SHARED;

          dirEntry.presence[cpuId] = true;

          const currentSharers = PROCESSORS.filter(p => dirEntry.presence[p]).join(', ');
          networkSteps.push(`2. [Répertoire ➔ ${cpuId}] Envoi de la donnée RAM. Ajout de ${cpuId} au vecteur de présence [${currentSharers}]`);
          transitionId = 't_dir_shared_to_shared';

        } else if (dirEntry.state === DIR_STATES.MODIFIED) {
          // Cas 3 : Bloc Modifié détenu par un autre processeur (Owner)
          const ownerCpu = dirEntry.owner;
          const ownerEntry = this.caches[ownerCpu][tag];

          writeBackOccurred = true;
          writeBackValue = ownerEntry.value;

          // Write Back du propriétaire vers la RAM via le Répertoire
          this.mainMemory[tag] = writeBackValue;

          // Le propriétaire passe à l'état Partagé
          ownerEntry.state = STATES.SHARED;

          // Le requérant récupère la donnée et passe à Partagé
          entry.value = writeBackValue;
          entry.state = STATES.SHARED;

          // Mise à jour du Répertoire
          dirEntry.state = DIR_STATES.SHARED;
          dirEntry.presence[ownerCpu] = true;
          dirEntry.presence[cpuId] = true;
          dirEntry.owner = null;

          networkSteps.push(`2. [Répertoire ➔ ${ownerCpu}] Message Unicast : Demande de restitution (Fetch-Forward / Write-Back)`);
          networkSteps.push(`3. [${ownerCpu} ➔ Répertoire & RAM] Recopie de la valeur modifiée (${writeBackValue}) & Passage de ${ownerCpu} à Partagé`);
          networkSteps.push(`4. [Répertoire ➔ ${cpuId}] Transfert de la donnée. Répertoire : État=Partagé, Présence=[${ownerCpu}, ${cpuId}]`);

          snoopingEvents.push({
            cpu: ownerCpu,
            prevState: STATES.MODIFIED,
            newState: STATES.SHARED,
            action: `Réponse à la demande ciblée du Répertoire : Write-Back (${writeBackValue}) & Passage à Partagé`
          });

          transitionId = 't_dir_modified_to_shared';
        }

        busMessage = networkSteps.join(' | ');

      } else {
        // Logique Snoopy (MSI / MESI)
        busMessage = `Placer Read Miss (BusRd) sur le Bus pour Tag ${tag}`;

        let foundCopiesInOtherCaches = false;

        PROCESSORS.filter(p => p !== cpuId).forEach(otherCpu => {
          const otherEntry = this.caches[otherCpu][tag];
          const otherPrevState = otherEntry.state;

          if (otherPrevState === STATES.MODIFIED) {
            foundCopiesInOtherCaches = true;
            writeBackOccurred = true;
            writeBackValue = otherEntry.value;

            this.mainMemory[tag] = otherEntry.value;
            otherEntry.state = STATES.SHARED;

            snoopingEvents.push({
              cpu: otherCpu,
              prevState: STATES.MODIFIED,
              newState: STATES.SHARED,
              action: `Write-Back de la valeur (${writeBackValue}) en RAM & passage à Partagé`
            });
          } else if (otherPrevState === STATES.EXCLUSIVE) {
            foundCopiesInOtherCaches = true;
            otherEntry.state = STATES.SHARED;

            snoopingEvents.push({
              cpu: otherCpu,
              prevState: STATES.EXCLUSIVE,
              newState: STATES.SHARED,
              action: 'Passage de Exclusif à Partagé'
            });
          } else if (otherPrevState === STATES.SHARED) {
            foundCopiesInOtherCaches = true;
            snoopingEvents.push({
              cpu: otherCpu,
              prevState: STATES.SHARED,
              newState: STATES.SHARED,
              action: 'Maintien de l\'état Partagé'
            });
          }
        });

        const dataValue = writeBackOccurred ? writeBackValue : this.mainMemory[tag];
        entry.value = dataValue;

        if (this.protocol === 'MESI' && !foundCopiesInOtherCaches) {
          entry.state = STATES.EXCLUSIVE;
          transitionId = 't_invalid_to_exclusive';
          busMessage += ' -> Chargé en mode EXCLUSIF (Aucun autre CPU ne la détient)';
        } else {
          entry.state = STATES.SHARED;
          transitionId = 't_invalid_to_shared';
        }
      }
    }

    const currentSnapshot = this.getSnapshot();

    const eventResult = {
      step: this.stepCount,
      protocol: this.protocol,
      cpu: cpuId,
      tag: tag,
      operation: 'LIRE',
      eventType: eventType,
      prevState: prevState,
      newState: entry.state,
      value: entry.value,
      busMessage: busMessage,
      snoopingEvents: snoopingEvents,
      writeBack: writeBackOccurred ? writeBackValue : null,
      transitionId: transitionId,
      prevSnapshot: prevSnapshot,
      currentSnapshot: currentSnapshot
    };

    this.lastEvent = eventResult;
    this.history.unshift(eventResult);
    return eventResult;
  }

  /**
   * Exécute une opération d'Écriture (Write) par un CPU
   */
  write(cpuId, tag, newValue) {
    this.stepCount++;
    const prevSnapshot = this.getSnapshot();
    const entry = this.caches[cpuId][tag];
    const prevState = entry.state;
    const dirEntry = this.directory[tag];

    let eventType = '';
    let busMessage = '';
    let snoopingEvents = [];
    let transitionId = '';
    let writeBackOccurred = false;
    let writeBackValue = null;

    const parsedValue = isNaN(Number(newValue)) ? newValue : Number(newValue);

    if (this.protocol === 'DIRECTORY') {
      // Logique Écriture pour le Protocole basé sur Répertoire
      let networkSteps = [];

      if (prevState === STATES.MODIFIED) {
        eventType = 'CPU Write Hit';
        busMessage = `Aucun message réseau (Write Hit local sur bloc Modifié dans le cache de ${cpuId})`;
        entry.value = parsedValue;
        transitionId = 't_dir_modified_to_modified';
      } else if (prevState === STATES.SHARED) {
        eventType = 'CPU Write Hit';
        networkSteps.push(`1. [${cpuId} ➔ Répertoire] Demande d'invalidation (Write-Request / Upgrade)`);

        // Le répertoire consulte le vecteur de présence et envoie des messages d'invalidation CIBLÉS !
        const sharersToInvalidate = PROCESSORS.filter(p => p !== cpuId && dirEntry.presence[p]);

        if (sharersToInvalidate.length > 0) {
          networkSteps.push(`2. [Répertoire ➔ ${sharersToInvalidate.join(', ')}] Messages d'invalidation CIBLÉS (Pas de diffusion générale !)`);
          
          sharersToInvalidate.forEach(otherCpu => {
            const otherEntry = this.caches[otherCpu][tag];
            const otherPrevState = otherEntry.state;

            otherEntry.state = STATES.INVALID;
            otherEntry.value = null;
            dirEntry.presence[otherCpu] = false;

            snoopingEvents.push({
              cpu: otherCpu,
              prevState: otherPrevState,
              newState: STATES.INVALID,
              action: 'Invalidé par message ciblée du Répertoire (Unicast)'
            });
          });
        } else {
          networkSteps.push(`2. Aucun autre sharer actif à invalider.`);
        }

        entry.value = parsedValue;
        entry.state = STATES.MODIFIED;

        dirEntry.state = DIR_STATES.MODIFIED;
        dirEntry.presence = { P1: false, P2: false, P3: false };
        dirEntry.presence[cpuId] = true;
        dirEntry.owner = cpuId;

        networkSteps.push(`3. Répertoire mis à jour : État=Modifié, Propriétaire=${cpuId}`);
        busMessage = networkSteps.join(' | ');
        transitionId = 't_dir_shared_to_modified';

      } else {
        // Write Miss (State === INVALID)
        eventType = 'CPU Write Miss';
        networkSteps.push(`1. [${cpuId} ➔ Répertoire] Demande d'écriture exclusive (Write-Miss Request) pour Tag ${tag}`);

        if (dirEntry.state === DIR_STATES.UNCACHED) {
          entry.value = parsedValue;
          entry.state = STATES.MODIFIED;

          dirEntry.state = DIR_STATES.MODIFIED;
          dirEntry.presence = { P1: false, P2: false, P3: false };
          dirEntry.presence[cpuId] = true;
          dirEntry.owner = cpuId;

          networkSteps.push(`2. [Répertoire ➔ ${cpuId}] Octroi de l'exclusivité. Répertoire : État=Modifié, Propriétaire=${cpuId}`);
          transitionId = 't_dir_uncached_to_modified';

        } else if (dirEntry.state === DIR_STATES.SHARED) {
          const sharersToInvalidate = PROCESSORS.filter(p => dirEntry.presence[p]);

          if (sharersToInvalidate.length > 0) {
            networkSteps.push(`2. [Répertoire ➔ ${sharersToInvalidate.join(', ')}] Invalidation ciblée des caches partageurs`);
            sharersToInvalidate.forEach(otherCpu => {
              const otherEntry = this.caches[otherCpu][tag];
              otherEntry.state = STATES.INVALID;
              otherEntry.value = null;
              dirEntry.presence[otherCpu] = false;

              snoopingEvents.push({
                cpu: otherCpu,
                prevState: STATES.SHARED,
                newState: STATES.INVALID,
                action: 'Invalidé par le Répertoire'
              });
            });
          }

          entry.value = parsedValue;
          entry.state = STATES.MODIFIED;

          dirEntry.state = DIR_STATES.MODIFIED;
          dirEntry.presence = { P1: false, P2: false, P3: false };
          dirEntry.presence[cpuId] = true;
          dirEntry.owner = cpuId;

          networkSteps.push(`3. Transfert donnée à ${cpuId}. Répertoire : État=Modifié, Propriétaire=${cpuId}`);
          transitionId = 't_dir_shared_to_modified';

        } else if (dirEntry.state === DIR_STATES.MODIFIED) {
          const ownerCpu = dirEntry.owner;
          if (ownerCpu && ownerCpu !== cpuId) {
            const ownerEntry = this.caches[ownerCpu][tag];
            writeBackOccurred = true;
            writeBackValue = ownerEntry.value;

            this.mainMemory[tag] = writeBackValue;

            ownerEntry.state = STATES.INVALID;
            ownerEntry.value = null;
            dirEntry.presence[ownerCpu] = false;

            networkSteps.push(`2. [Répertoire ➔ ${ownerCpu}] Restitution \& Invalidation du propriétaire precedent (${ownerCpu})`);
            snoopingEvents.push({
              cpu: ownerCpu,
              prevState: STATES.MODIFIED,
              newState: STATES.INVALID,
              action: `Write-Back (${writeBackValue}) \& Invalidation du propriétaire précédent`
            });
          }

          entry.value = parsedValue;
          entry.state = STATES.MODIFIED;

          dirEntry.state = DIR_STATES.MODIFIED;
          dirEntry.presence = { P1: false, P2: false, P3: false };
          dirEntry.presence[cpuId] = true;
          dirEntry.owner = cpuId;

          networkSteps.push(`3. Nouveau Propriétaire : ${cpuId}. Répertoire : État=Modifié`);
          transitionId = 't_dir_modified_to_modified';
        }

        busMessage = networkSteps.join(' | ');
      }

    } else {
      // Logique Snoopy (MSI / MESI)
      if (prevState === STATES.MODIFIED) {
        eventType = 'CPU Write Hit';
        busMessage = 'Aucun message sur le Bus (Local Write Hit sur bloc Modifié)';
        entry.value = parsedValue;
        transitionId = 't_modified_write_hit';
      } else if (prevState === STATES.EXCLUSIVE && this.protocol === 'MESI') {
        eventType = 'CPU Write Hit';
        busMessage = 'Aucun message sur le Bus (Write Hit sur bloc Exclusif - Gain de bande passante MESI !)';
        entry.value = parsedValue;
        entry.state = STATES.MODIFIED;
        transitionId = 't_exclusive_to_modified';
      } else if (prevState === STATES.SHARED) {
        eventType = 'CPU Write Hit';
        busMessage = `Placer write Invalidate (BusUpgr) sur le Bus pour Tag ${tag}`;
        transitionId = 't_shared_to_modified_write';

        PROCESSORS.filter(p => p !== cpuId).forEach(otherCpu => {
          const otherEntry = this.caches[otherCpu][tag];
          const otherPrevState = otherEntry.state;

          if (otherPrevState === STATES.SHARED || otherPrevState === STATES.EXCLUSIVE) {
            otherEntry.state = STATES.INVALID;
            otherEntry.value = null;
            snoopingEvents.push({
              cpu: otherCpu,
              prevState: otherPrevState,
              newState: STATES.INVALID,
              action: `Invalidé par le Bus (${otherPrevState} -> Invalide)`
            });
          }
        });

        entry.value = parsedValue;
        entry.state = STATES.MODIFIED;
      } else {
        eventType = 'CPU Write Miss';
        busMessage = `Placer write Miss (BusRdX) sur le Bus pour Tag ${tag}`;
        transitionId = 't_invalid_to_modified';

        PROCESSORS.filter(p => p !== cpuId).forEach(otherCpu => {
          const otherEntry = this.caches[otherCpu][tag];
          const otherPrevState = otherEntry.state;

          if (otherPrevState === STATES.MODIFIED) {
            writeBackOccurred = true;
            writeBackValue = otherEntry.value;

            this.mainMemory[tag] = otherEntry.value;
            otherEntry.state = STATES.INVALID;
            otherEntry.value = null;

            snoopingEvents.push({
              cpu: otherCpu,
              prevState: STATES.MODIFIED,
              newState: STATES.INVALID,
              action: `Write-Back ancienne valeur (${writeBackValue}) \& Invalidation`
            });
          } else if (otherPrevState === STATES.SHARED || otherPrevState === STATES.EXCLUSIVE) {
            otherEntry.state = STATES.INVALID;
            otherEntry.value = null;

            snoopingEvents.push({
              cpu: otherCpu,
              prevState: otherPrevState,
              newState: STATES.INVALID,
              action: `Invalidé par le Bus`
            });
          }
        });

        entry.value = parsedValue;
        entry.state = STATES.MODIFIED;
      }
    }

    const currentSnapshot = this.getSnapshot();

    const eventResult = {
      step: this.stepCount,
      protocol: this.protocol,
      cpu: cpuId,
      tag: tag,
      operation: 'ÉCRIRE',
      eventType: eventType,
      prevState: prevState,
      newState: entry.state,
      value: entry.value,
      busMessage: busMessage,
      snoopingEvents: snoopingEvents,
      writeBack: writeBackOccurred ? writeBackValue : null,
      transitionId: transitionId,
      prevSnapshot: prevSnapshot,
      currentSnapshot: currentSnapshot
    };

    this.lastEvent = eventResult;
    this.history.unshift(eventResult);
    return eventResult;
  }
}
