

const sqlite3 = require('sqlite3').verbose(); // .verbose() włącza szczegółowe logi błędów
const path    = require('path');

// Tworzymy połączenie z bazą danych SQLite.
// path.join(__dirname, 'users.db') buduje ścieżkę względną,
// dzięki czemu plik users.db zawsze powstaje obok db.js –
// bez względu na to, z jakiego katalogu uruchomiono serwer.
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

// Tworzymy tabelę users, jeśli jeszcze nie istnieje.
// CREATE TABLE IF NOT EXISTS zapobiega błędowi przy ponownym uruchomieniu serwera.
// Kolumny:
//   id       – klucz główny, autoinkrementowany
//   email    – adres e-mail, musi być unikalny
//   name     – wyświetlana nazwa użytkownika
//   login    – login, musi być unikalny
//   password – zahashowane hasło (bcrypt)
db.run(`
    CREATE TABLE IF NOT EXISTS users (
        id       INTEGER PRIMARY KEY AUTOINCREMENT,
        email    TEXT UNIQUE NOT NULL,
        name     TEXT        NOT NULL,
        login    TEXT UNIQUE NOT NULL,
        password TEXT        NOT NULL
    )
`);

// Eksportujemy instancję bazy, aby inne moduły mogły
// wykonywać zapytania (db.get, db.run, db.all itp.)
module.exports = db;
