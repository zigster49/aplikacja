
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(
    path.join(__dirname, 'users.db'),
    (err) => {
        if (err) {
            console.error('Błąd połączenia z bazą SQLite:', err.message);
        } else {
            console.log('Połączono z bazą SQLite');
        }
    }
);

// Włączenie obsługi FOREIGN KEY w SQLite
db.serialize(() => {

    db.run(`PRAGMA foreign_keys = ON`);

    // =========================
    // TABELA ROLES
    // =========================
    db.run(`
        CREATE TABLE IF NOT EXISTS roles (
            id   INTEGER PRIMARY KEY,
            name TEXT UNIQUE NOT NULL
        )
    `);

    // Dodanie domyślnych ról
    db.run(`
        INSERT OR IGNORE INTO roles (id, name)
        VALUES 
            (1, 'admin'),
            (2, 'user')
    `);

   
    // TABELA USERS
    
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id       INTEGER PRIMARY KEY AUTOINCREMENT,
            email    TEXT UNIQUE NOT NULL,
            name     TEXT        NOT NULL,
            login    TEXT UNIQUE NOT NULL,
            password TEXT        NOT NULL,

            -- relacja do roles
            role_id  INTEGER NOT NULL DEFAULT 2,

            FOREIGN KEY (role_id) REFERENCES roles(id)
        )
    `);
  //Quizy
    db.run(`
        CREATE TABLE IF NOT EXISTS quizzes (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            title      TEXT    NOT NULL,
            data       TEXT    NOT NULL, -- JSON z pytaniami i odpowiedziami
            created_at TEXT    NOT NULL DEFAULT (datetime('now'))
        )
    `);
});

module.exports = db;
