import { MsiEngine, STATES, DIR_STATES } from './src/msi_engine.js';

console.log('=== DÉBUT DES TESTS COMPLETS (DIRECTORY, MESI, MSI) ===\n');

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ÉCHEC : ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ SUCCÈS : ${message}`);
  }
}

// -------------------------------------------------------------
// 1. TEST PROTOCOLE BASÉ SUR LE RÉPERTOIRE (DIRECTORY)
// -------------------------------------------------------------
console.log('--- 1. TEST DU PROTOCOLE BASÉ SUR LE RÉPERTOIRE ---');
const dirEngine = new MsiEngine('DIRECTORY');

// Étape 1 : Lecture P1 sur Tag 00 (Uncached -> Shared)
let ev1 = dirEngine.read('P1', '00');
assert(dirEngine.directory['00'].state === DIR_STATES.SHARED, 'Répertoire Tag 00 passe à Shared');
assert(dirEngine.directory['00'].presence.P1 === true && dirEngine.directory['00'].presence.P2 === false, 'Vecteur présence contient [P1]');
assert(dirEngine.caches.P1['00'].state === STATES.SHARED, 'Cache L1 P1 est à Partagé');
assert(ev1.busMessage.includes('Read-Req') && ev1.busMessage.includes('Envoi du bloc depuis la RAM'), 'Message réseau Unicast correct');

// Étape 2 : Lecture P2 sur Tag 00 (Partage [P1, P2])
let ev2 = dirEngine.read('P2', '00');
assert(dirEngine.directory['00'].presence.P1 === true && dirEngine.directory['00'].presence.P2 === true, 'Vecteur présence contient [P1, P2]');
assert(dirEngine.caches.P2['00'].state === STATES.SHARED, 'Cache L1 P2 est à Partagé');

// Étape 3 : Écriture P1 sur Tag 00 (Invalidation Ciblée de P2 Unicast)
let ev3 = dirEngine.write('P1', '00', 777);
assert(dirEngine.directory['00'].state === DIR_STATES.MODIFIED, 'Répertoire Tag 00 passe à Modified');
assert(dirEngine.directory['00'].owner === 'P1', 'Propriétaire est P1');
assert(dirEngine.caches.P1['00'].state === STATES.MODIFIED && dirEngine.caches.P1['00'].value === 777, 'Cache P1 est Modifié (777)');
assert(dirEngine.caches.P2['00'].state === STATES.INVALID, 'Cache P2 est Invalidé par message ciblé');
assert(ev3.busMessage.includes('Messages d\'invalidation CIBLÉS'), 'Confirmation que l\'invalidation est ciblée sans diffusion générale');

// Étape 4 : Lecture P3 sur Tag 00 (Fetch-Forward et Write-back via Répertoire)
let ev4 = dirEngine.read('P3', '00');
assert(dirEngine.mainMemory['00'] === 777, 'Mémoire RAM mise à jour par Write-back (777)');
assert(dirEngine.caches.P1['00'].state === STATES.SHARED, 'P1 rétrogradé à Partagé');
assert(dirEngine.caches.P3['00'].state === STATES.SHARED && dirEngine.caches.P3['00'].value === 777, 'P3 reçoit la donnée 777 et passe à Partagé');
assert(dirEngine.directory['00'].presence.P1 === true && dirEngine.directory['00'].presence.P3 === true, 'Vecteur présence est [P1, P3]');
console.log('-> Protocole Répertoire validé avec succès !\n');

// -------------------------------------------------------------
// 2. TEST DU PROTOCOLE MESI
// -------------------------------------------------------------
console.log('--- 2. TEST DU PROTOCOLE MESI (4 ÉTATS) ---');
const mesiEngine = new MsiEngine('MESI');

// Étape 1 : Lecture P1 unique -> EXCLUSIF
let m_ev1 = mesiEngine.read('P1', '00');
assert(mesiEngine.caches.P1['00'].state === STATES.EXCLUSIVE, 'P1 passe à EXCLUSIF (E) car aucun autre CPU ne détient la donnée');

// Étape 2 : Écriture P1 sur bloc Exclusif -> MODIFIÉ SANS BUS !
let m_ev2 = mesiEngine.write('P1', '00', 555);
assert(mesiEngine.caches.P1['00'].state === STATES.MODIFIED, 'P1 passe à MODIFIÉ (M)');
assert(m_ev2.busMessage.includes('Aucun message sur le Bus'), 'Gain MESI confirmé : Écriture sur bloc Exclusif sans message bus');

// Étape 3 : Lecture P2 -> Passage à PARTAGÉ
let m_ev3 = mesiEngine.read('P2', '00');
assert(mesiEngine.caches.P1['00'].state === STATES.SHARED, 'P1 passe à PARTAGÉ (S) suite au Snooping');
assert(mesiEngine.caches.P2['00'].state === STATES.SHARED, 'P2 passe à PARTAGÉ (S)');
assert(mesiEngine.mainMemory['00'] === 555, 'Write-back de P1 vers la RAM vérifié');
console.log('-> Protocole MESI validé avec succès !\n');

// -------------------------------------------------------------
// 3. TEST DU PROTOCOLE MSI
// -------------------------------------------------------------
console.log('--- 3. TEST DU PROTOCOLE MSI (3 ÉTATS) ---');
const msiEngine = new MsiEngine('MSI');

// Étape 1 : Lecture P1 -> PARTAGÉ
let s_ev1 = msiEngine.read('P1', '00');
assert(msiEngine.caches.P1['00'].state === STATES.SHARED, 'En MSI, la lecture unique passe directement à PARTAGÉ (S)');

// Étape 2 : Lecture P2 -> PARTAGÉ
let s_ev2 = msiEngine.read('P2', '00');
assert(msiEngine.caches.P2['00'].state === STATES.SHARED, 'P2 passe à PARTAGÉ (S)');

// Étape 3 : Écriture P1 -> BusUpgr Invalidation
let s_ev3 = msiEngine.write('P1', '00', 999);
assert(msiEngine.caches.P1['00'].state === STATES.MODIFIED, 'P1 passe à MODIFIÉ (M)');
assert(msiEngine.caches.P2['00'].state === STATES.INVALID, 'P2 est invalidé par BusUpgr');
assert(s_ev3.busMessage.includes('BusUpgr'), 'Émission obligatoire de BusUpgr vérifiée en MSI');
console.log('-> Protocole MSI validé avec succès !\n');

console.log('🎉 TOUS LES TESTS DES 3 PROTOCOLES ONT RÉUSSI AVEC SUCCÈS !');
