const fs = require('fs');
const { execSync } = require('child_process');

console.log('🎄 Installation de Noël en Famille...\n');

// Créer le dossier public
if (!fs.existsSync('public')) {
  fs.mkdirSync('public');
  console.log('✅ Dossier public créé');
}

console.log('📦 Installation des dépendances...');
execSync('npm install', { stdio: 'inherit' });

console.log('\n✅ Installation terminée !');
console.log('\n🚀 Pour lancer l\'application, tapez : npm start');
console.log('📱 Puis ouvrez votre navigateur sur : http://localhost:3000\n');