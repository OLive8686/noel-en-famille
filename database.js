const Database = require('better-sqlite3');
const db = new Database('./noel.db');

// Créer les tables
db.exec(`
  CREATE TABLE IF NOT EXISTS cadeaux (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    destinataire TEXT NOT NULL,
    description TEXT NOT NULL,
    url TEXT,
    acheteur TEXT,
    prix REAL,
    magasin TEXT,
    statut TEXT DEFAULT 'a acheter',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS plats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL,
    categorie TEXT NOT NULL,
    apporte_par TEXT,
    commentaires TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS souhaits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user TEXT NOT NULL,
    description TEXT NOT NULL,
    url TEXT,
    prix REAL,
    magasin TEXT,
    reserve_par TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

module.exports = db;
