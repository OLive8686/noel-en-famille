/**
 * Base de données JSON - Alternative à SQLite
 * Pas besoin de Python ni de compilation native
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'data.json');

// Structure initiale
const defaultData = {
  cadeaux: [],
  plats: [],
  nextCadeauId: 1,
  nextPlatId: 1
};

// Charger les données
const loadData = () => {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Erreur lecture data.json:', err);
  }
  return { ...defaultData };
};

// Sauvegarder les données
const saveData = (data) => {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Erreur écriture data.json:', err);
    throw err;
  }
};

// Initialiser
let data = loadData();

// API compatible avec l'ancien code SQLite
const db = {
  // SELECT multiple rows
  all: (query, params, callback) => {
    try {
      let result = [];

      if (query.includes('FROM cadeaux')) {
        result = [...data.cadeaux];

        // Filtrer par destinataire si nécessaire
        if (query.includes('WHERE destinataire != ?') && params[0]) {
          result = result.filter(c => c.destinataire !== params[0]);
        }

        // Trier par date de création (DESC)
        result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      }
      else if (query.includes('FROM plats')) {
        result = [...data.plats];
        // Trier par catégorie puis nom
        result.sort((a, b) => {
          if (a.categorie !== b.categorie) return a.categorie.localeCompare(b.categorie);
          return a.nom.localeCompare(b.nom);
        });
      }

      callback(null, result);
    } catch (err) {
      callback(err, null);
    }
  },

  // SELECT single row
  get: (query, params, callback) => {
    try {
      if (query.includes('FROM cadeaux')) {
        // Stats query
        let cadeaux = data.cadeaux.filter(c => c.destinataire !== (params[0] || ''));

        const result = {
          total: cadeaux.length,
          achetes: cadeaux.filter(c => c.statut === 'acheté').length,
          a_acheter: cadeaux.filter(c => c.statut === 'à acheter').length,
          total_prix: cadeaux.reduce((sum, c) => sum + (parseFloat(c.prix) || 0), 0)
        };

        callback(null, result);
      } else {
        callback(null, null);
      }
    } catch (err) {
      callback(err, null);
    }
  },

  // INSERT, UPDATE, DELETE
  run: function(query, params, callback) {
    try {
      let lastID = null;

      // INSERT cadeau
      if (query.includes('INSERT INTO cadeaux')) {
        const [destinataire, description, url, acheteur, prix, magasin, statut] = params;
        const newCadeau = {
          id: data.nextCadeauId++,
          destinataire,
          description,
          url,
          acheteur,
          prix,
          magasin,
          statut,
          created_at: new Date().toISOString()
        };
        data.cadeaux.push(newCadeau);
        lastID = newCadeau.id;
      }
      // UPDATE cadeau
      else if (query.includes('UPDATE cadeaux')) {
        const [destinataire, description, url, acheteur, prix, magasin, statut, id] = params;
        const index = data.cadeaux.findIndex(c => c.id === parseInt(id));
        if (index !== -1) {
          data.cadeaux[index] = {
            ...data.cadeaux[index],
            destinataire,
            description,
            url,
            acheteur,
            prix,
            magasin,
            statut
          };
        }
      }
      // DELETE cadeau
      else if (query.includes('DELETE FROM cadeaux')) {
        const id = params[0];
        data.cadeaux = data.cadeaux.filter(c => c.id !== parseInt(id));
      }
      // INSERT plat
      else if (query.includes('INSERT INTO plats')) {
        const [nom, categorie, apporte_par, commentaires] = params;
        const newPlat = {
          id: data.nextPlatId++,
          nom,
          categorie,
          apporte_par,
          commentaires,
          created_at: new Date().toISOString()
        };
        data.plats.push(newPlat);
        lastID = newPlat.id;
      }
      // UPDATE plat
      else if (query.includes('UPDATE plats')) {
        const [nom, categorie, apporte_par, commentaires, id] = params;
        const index = data.plats.findIndex(p => p.id === parseInt(id));
        if (index !== -1) {
          data.plats[index] = {
            ...data.plats[index],
            nom,
            categorie,
            apporte_par,
            commentaires
          };
        }
      }
      // DELETE plat
      else if (query.includes('DELETE FROM plats')) {
        const id = params[0];
        data.plats = data.plats.filter(p => p.id !== parseInt(id));
      }

      saveData(data);

      // Simuler le contexte SQLite avec lastID
      if (callback) {
        callback.call({ lastID }, null);
      }
    } catch (err) {
      if (callback) callback(err);
    }
  }
};

module.exports = db;
