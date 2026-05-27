const express = require('express');
const bcrypt = require('bcrypt');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const db = require('./database/db.js');

const dailyQuizzes = [
    {
        title: 'Quiz dnia: Geografia',
        questions: [
            { question: 'Który kontynent jest największy pod względem powierzchni?', options: ['Europa', 'Afryka', 'Azja', 'Ameryka Południowa'], correctIndex: 2 },
            { question: 'Jaka jest stolica Australii?', options: ['Sydney', 'Melbourne', 'Canberra', 'Brisbane'], correctIndex: 2 },
            { question: 'Który ocean jest największy?', options: ['Atlantycki', 'Spokojny', 'Indyjski', 'Arktyczny'], correctIndex: 1 },
            { question: 'Jaka jest najwyższa góra świata?', options: ['K2', 'Mount Everest', 'Kangchenjunga', 'Lhotse'], correctIndex: 1 },
            { question: 'Która rzeka jest najdłuższa na świecie?', options: ['Amazonka', 'Nil', 'Jangcy', 'Missisipi'], correctIndex: 0 },
            { question: 'Jakie państwo ma największą populację?', options: ['Indie', 'Stany Zjednoczone', 'Chiny', 'Indonezja'], correctIndex: 2 },
            { question: 'Które państwo jest najmniejsze pod względem powierzchni?', options: ['Monako', 'San Marino', 'Watykan', 'Liechtenstein'], correctIndex: 2 }
        ]
    },
    {
        title: 'Quiz dnia: Nauka',
        questions: [
            { question: 'Która cząsteczka przenosi informację genetyczną?', options: ['RNA', 'Białko', 'Woda', 'DNA'], correctIndex: 3 },
            { question: 'Jaka jest jednostka siły w układzie SI?', options: ['Newton', 'Dżul', 'Wat', 'Katal'], correctIndex: 0 },
            { question: 'Jaki gaz jest najczęściej w atmosferze ziemskiej?', options: ['Tlen', 'Azot', 'Dwutlenek węgla', 'Argon'], correctIndex: 1 },
            { question: 'Ile planet ma Układ Słoneczny?', options: ['7', '8', '9', '10'], correctIndex: 1 },
            { question: 'Jaka jest prędkość światła w próżni?', options: ['300 000 km/s', '150 000 km/s', '3 000 km/s', '30 000 km/s'], correctIndex: 0 },
            { question: 'Który organ odpowiada przede wszystkim za filtrowanie krwi?', options: ['Wątroba', 'Nerki', 'Płuca', 'Serce'], correctIndex: 1 },
            { question: 'W jakim stanie skupienia znajduje się woda przy 0°C i normalnym ciśnieniu?', options: ['Gazowym', 'Ciekłym', 'Stałym', 'Plazmie'], correctIndex: 2 }
        ]
    },
    {
        title: 'Quiz dnia: Historia',
        questions: [
            { question: 'W którym roku Polska odzyskała niepodległość po I wojnie światowej?', options: ['1914', '1918', '1920', '1939'], correctIndex: 1 },
            { question: 'Które miasto było stolicą Cesarstwa Rzymskiego?', options: ['Ateny', 'Rzym', 'Kartaż', 'Jerozolima'], correctIndex: 1 },
            { question: 'W którym roku rozpoczęła się II wojna światowa?', options: ['1937', '1938', '1939', '1940'], correctIndex: 2 },
            { question: 'Kiedy miała miejsce bitwa pod Grunwaldem?', options: ['1410', '1510', '1610', '1310'], correctIndex: 0 },
            { question: 'Kto podpisał Deklarację Niepodległości Stanów Zjednoczonych?', options: ['George Washington', 'Thomas Jefferson', 'Abraham Lincoln', 'Benjamin Franklin'], correctIndex: 1 },
            { question: 'W którym roku powstała Unia Europejska w obecnej formie?', options: ['1951', '1992', '2004', '2010'], correctIndex: 1 },
            { question: 'Jak nazywała się starożytna droga handlowa łącząca Europę z Azją?', options: ['Jedwabny Szlak', 'Trakt Solny', 'Droga Morska', 'Szlak Wodny'], correctIndex: 0 }
        ]
    }
];

const app = express();

app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, '..', 'public')));

// Konfiguracja sesji
app.use(session({
    secret: 'twoj_bardzo_tajny_klucz_quizzes', // W produkcji trzymaj w zmiennej środowiskowej (.env)
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Ustaw na true przy HTTPS
        maxAge: 1000 * 60 * 60 * 24 // Sesja wygasa po 24 godzinach
    }
}));

// ROUTER – grupowanie tras API pod prefiksem /api
const apiRouter = express.Router();


// POST /api/login
// Sprawdza dane logowania i zapisuje sesję.
apiRouter.post('/login', async (req, res) => {
    const { login, password } = req.body;

    if (!login || !password) {
        return res.status(400).json({ message: 'Wszystkie pola powinny zostać uzupełnione!' });
    }

    db.get('SELECT * FROM users WHERE login = ?', [login], async (err, user) => {
        if (err) {
            console.error('Błąd bazy danych:', err);
            return res.status(500).json({ message: 'Błąd serwera' });
        }

        if (!user) {
            return res.status(400).json({ message: 'Nie znaleziono użytkownika' });
        }

        const match = await bcrypt.compare(password, user.password);

        if (!match) {
            return res.status(400).json({ message: 'Niepoprawne hasło' });
        }

        // Zapisanie danych do sesji
        req.session.userId = user.id;
        req.session.login = user.login;
        req.session.name = user.name;
        req.session.email = user.email;

        return res.json({ message: 'Zalogowano pomyślnie' });
    });
});


// POST /api/register
// Rejestruje nowego użytkownika.
apiRouter.post('/register', async (req, res) => {
    const { email, name, login, password } = req.body;

    if (!email || !name || !login || !password) {
        return res.status(400).json({ message: 'Wszystkie pola muszą zostać wypełnione!' });
    }

    db.get('SELECT * FROM users WHERE email = ? OR login = ?', [email, login], async (err, row) => {
        if (err) {
            console.error('Błąd bazy danych:', err);
            return res.status(500).json({ message: 'Błąd bazy danych' });
        }

        if (row) {
            return res.status(409).json({ message: 'Użytkownik o podanej nazwie lub emailu już istnieje' });
        }

        try {
            const hashed_password = await bcrypt.hash(password, 10);

            db.run(
                'INSERT INTO users (email, name, login, password) VALUES (?, ?, ?, ?)',
                [email, name, login, hashed_password],
                (err) => {
                    if (err) {
                        console.error('Błąd zapisu:', err);
                        return res.status(500).json({ message: 'Błąd zapisu do bazy danych' });
                    }
                    return res.status(201).json({ message: 'Użytkownik został zarejestrowany' });
                }
            );
        } catch (error) {
            console.error('Błąd hashowania hasła:', error);
            return res.status(500).json({ message: 'Błąd hashowania hasła' });
        }
    });
});


// GET /api/me
// Sprawdza czy użytkownik jest zalogowany (na podstawie sesji).
apiRouter.get('/me', (req, res) => {
    if (req.session.userId) {
        return res.json({
            loggedIn: true,
            userId: req.session.userId,
            login: req.session.login,
            name: req.session.name,
            email: req.session.email,
            role: req.session.role
        });
    } else {
        return res.status(401).json({ loggedIn: false });
    }
});


// POST /api/logout
// Niszczy sesję i usuwa ciasteczko.
apiRouter.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ message: 'Błąd podczas wylogowywania' });
        }
        res.clearCookie('connect.sid');
        return res.json({ message: 'Wylogowano' });
    });
});


// Pobranie i wyświetlenie quizów z bazy danych TODO
apiRouter.get('/quizzes', async (req, res) => {});

// Pobranie quizu po jego id TODO
apiRouter.get('/quizzes/:id', async (req, res) => {});

// Utworzenie quizu, dashboard dla admina TODO
apiRouter.post('/quizzes', async (req, res) => {});

// Aktualizacja quizu, dashboard dla admina TODO
apiRouter.patch('/quizzes/:id', async (req, res) => {});

// Usunięcie quizu, dashboard dla admina TODO
apiRouter.delete('/quizzes/:id', async (req, res) => {});


// Aktualizacja informacji o użytkowniku TODO
apiRouter.patch('/users/:id', async (req, res) => {
  
});

// Usunięcie użytkownika TODO
apiRouter.delete('/users/:id', async (req, res) => {
    db.run('DELETE FROM users WHERE id = ?', [req.params.id], function (err) {
        if (err) {
            console.error('Błąd usuwania użytkownika:', err);
            return res.status(500).json({ message: 'Błąd usuwania użytkownika' });
        }
        return res.json({ message: 'Użytkownik został usunięty' });
    });
});
//Pobierz informacje o użytkowniku, dashboard dla admina TODO
apiRouter.get('/users/:id', (req, res) => {
    
    const query = `
        SELECT users.id, users.email, users.name, users.login, roles.name AS role
        FROM users
        JOIN roles ON users.role_id = roles.id
        WHERE users.id = ?
    `;

    db.get(query, [req.params.id], (err, user) => {
        if (err) {
            console.error('Błąd pobierania informacji o użytkowniku:', err);
            return res.status(500).json({ message: 'Błąd pobierania informacji o użytkowniku' });
        }
        if (!user) {
            return res.status(404).json({ message: 'Użytkownik nie został znaleziony' });
        }

        
        return res.json(user);
    });
});
// Resetowanie hasła
apiRouter.post('/users/:id/reset-password', async (req, res) => {
    const { newPassword } = req.body;

    if (!newPassword) {
        return res.status(400).json({ message: 'Nowe hasło musi zostać podane!' });
    }
    try {
        const hashed_password = await bcrypt.hash(newPassword, 10);
        db.run(
            'UPDATE users SET password = ? WHERE id = ?',
            [hashed_password, req.params.id],
            (err) => {
                if (err) {
                    console.error('Błąd aktualizacji hasła:', err);
                    return res.status(500).json({ message: 'Błąd aktualizacji hasła' });
                }
                return res.json({ message: 'Hasło zostało zresetowane' });
            }
        );
    } catch (error) {
        console.error('Błąd hashowania hasła:', error);
        return res.status(500).json({ message: 'Błąd hashowania hasła' });
    }
});


// Montujemy router API pod ścieżką /api
app.use('/api', apiRouter);


// TRASY STRON (HTML)
// JavaScript (main.js) przełącza widoki na podstawie URL.
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});


// Uruchomienie serwera
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Serwer działa na porcie ${PORT}`);
    console.log(`http://localhost:${PORT}`);
});