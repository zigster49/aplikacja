

const express = require('express');
const bcrypt = require('bcrypt');
const cors = require('cors');
const path = require('path');
const db = require('./database/db.js');


const app = express();


// Parsowanie ciała żądania jako JSON 
app.use(express.json());

// Zezwolenie na żądania z innych domen 
app.use(cors());

// Serwowanie plików statycznych z katalogu public/
app.use(express.static(path.join(__dirname, '..', 'public')));



// ROUTER – grupowanie tras API pod prefiksem /api

const apiRouter = express.Router();


// POST /api/login 
// Sprawdza dane logowania użytkownika.
// Oczekuje w ciele żądania: { login, password }
apiRouter.post('/login', async (req, res) => {
    const { login, password } = req.body;

    
    if (!login || !password) {
        return res.status(400).json({ message: 'Wszystkie pola powinny zostać uzupełnione!' });
    }

    // Szukamy użytkownika w bazie po loginie
    db.get(
        'SELECT * FROM users WHERE login = ?',
        [login],
        async (err, user) => {
            // Błąd zapytania do bazy danych
            if (err) {
                console.error('Błąd bazy danych:', err);
                return res.status(500).json({ message: 'Błąd serwera' });
            }

            // Użytkownik o podanym loginie nie istnieje
            if (!user) {
                return res.status(400).json({ message: 'Nie znaleziono użytkownika' });
            }

            // Porównujemy hasło z formularza z hashem przechowywanym w bazie
            const match = await bcrypt.compare(password, user.password);

            if (!match) {
                return res.status(400).json({ message: 'Niepoprawne hasło' });
            }

            // Logowanie zakończone sukcesem
            return res.json({ message: 'Zalogowano' });
        }
    );
});


// POST /api/register 
// Rejestruje nowego użytkownika.
// Oczekuje w ciele żądania: { email, name, login, password }
apiRouter.post('/register', async (req, res) => {
    const { email, name, login, password } = req.body;

    // Walidacja – wszystkie pola muszą być podane
    if (!email || !name || !login || !password) {
        return res.status(400).json({ message: 'Wszystkie pola muszą zostać wypełnione!' });
    }

    // Sprawdzamy, czy email lub login już istnieje w bazie
    db.get(
        'SELECT * FROM users WHERE email = ? OR login = ?',
        [email, login],
        async (err, row) => {
            // Błąd zapytania do bazy danych
            if (err) {
                console.error('Błąd bazy danych:', err);
                return res.status(500).json({ message: 'Błąd bazy danych' });
            }

            // Znaleziono istniejącego użytkownika z takim emailem lub loginem
            if (row) {
                return res.status(409).json({ message: 'Użytkownik o podanej nazwie lub emailu już istnieje' });
            }

            try {
                // Hashujemy hasło przed zapisem do bazy (10 rund solenia)
                const hashed_password = await bcrypt.hash(password, 10);

                // Zapisujemy nowego użytkownika do bazy danych
                db.run(
                    'INSERT INTO users (email, name, login, password) VALUES (?, ?, ?, ?)',
                    [email, name, login, hashed_password],
                    (err) => {
                        if (err) {
                            console.error('Błąd zapisu:', err);
                            return res.status(500).json({ message: 'Błąd zapisu do bazy danych' });
                        }

                        // Rejestracja zakończona sukcesem
                        return res.status(201).json({ message: 'Użytkownik został zarejestrowany' });
                    }
                );
            } catch (error) {
                console.error('Błąd hashowania hasła:', error);
                return res.status(500).json({ message: 'Błąd hashowania hasła' });
            }
        }
    );
});





// Montujemy router API pod ścieżką /api
// Wszystkie trasy zdefiniowane powyżej będą dostępne jako:
//   POST /api/login
//   POST /api/register
app.use('/api', apiRouter);



// TRASY STRON (HTML)

// Wszystkie trasy GET serwują index.html – jeden plik HTML
// zawiera stronę główną, logowanie i rejestrację jako widoki SPA.
// JavaScript (main.js) przełącza widoki na podstawie URL.
app.get('/{*path}', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});


// ── Uruchomienie serwera 
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Serwer działa na porcie ${PORT}`);
    console.log(`http://localhost:${PORT}`);
});
