

const express = require('express');
const bcrypt = require('bcrypt');
const cors = require('cors');
const path = require('path');
const db = require('./database/db.js');

const dailyQuizzes = [
    {
        title: 'Quiz dnia: Geografia',
        questions: [
            {
                question: 'Który kontynent jest największy pod względem powierzchni?',
                options: ['Europa', 'Afryka', 'Azja', 'Ameryka Południowa'],
                correctIndex: 2
            },
            {
                question: 'Jaka jest stolica Australii?',
                options: ['Sydney', 'Melbourne', 'Canberra', 'Brisbane'],
                correctIndex: 2
            },
            {
                question: 'Który ocean jest największy?',
                options: ['Atlantycki', 'Spokojny', 'Indyjski', 'Arktyczny'],
                correctIndex: 1
            },
            {
                question: 'Jaka jest najwyższa góra świata?',
                options: ['K2', 'Mount Everest', 'Kangchenjunga', 'Lhotse'],
                correctIndex: 1
            },
            {
                question: 'Która rzeka jest najdłuższa na świecie?',
                options: ['Amazonka', 'Nil', 'Jangcy', 'Missisipi'],
                correctIndex: 0
            },
            {
                question: 'Jakie państwo ma największą populację?',
                options: ['Indie', 'Stany Zjednoczone', 'Chiny', 'Indonezja'],
                correctIndex: 2
            },
            {
                question: 'Które państwo jest najmniejsze pod względem powierzchni?',
                options: ['Monako', 'San Marino', 'Watykan', 'Liechtenstein'],
                correctIndex: 2
            }
        ]
    },
    {
        title: 'Quiz dnia: Nauka',
        questions: [
            {
                question: 'Która cząsteczka przenosi informację genetyczną?',
                options: ['RNA', 'Białko', 'Woda', 'DNA'],
                correctIndex: 3
            },
            {
                question: 'Jaka jest jednostka siły w układzie SI?',
                options: ['Newton', 'Dżul', 'Wat', 'Katal'],
                correctIndex: 0
            },
            {
                question: 'Jaki gaz jest najczęściej w atmosferze ziemskiej?',
                options: ['Tlen', 'Azot', 'Dwutlenek węgla', 'Argon'],
                correctIndex: 1
            },
            {
                question: 'Ile planet ma Układ Słoneczny?',
                options: ['7', '8', '9', '10'],
                correctIndex: 1
            },
            {
                question: 'Jaka jest prędkość światła w próżni?',
                options: ['300 000 km/s', '150 000 km/s', '3 000 km/s', '30 000 km/s'],
                correctIndex: 0
            },
            {
                question: 'Który organ odpowiada przede wszystkim za filtrowanie krwi?',
                options: ['Wątroba', 'Nerki', 'Płuca', 'Serce'],
                correctIndex: 1
            },
            {
                question: 'W jakim stanie skupienia znajduje się woda przy 0°C i normalnym ciśnieniu?',
                options: ['Gazowym', 'Ciekłym', 'Stałym', 'Plazmie'],
                correctIndex: 2
            }
        ]
    },
    {
        title: 'Quiz dnia: Historia',
        questions: [
            {
                question: 'W którym roku Polska odzyskała niepodległość po I wojnie światowej?',
                options: ['1914', '1918', '1920', '1939'],
                correctIndex: 1
            },
            {
                question: 'Które miasto było stolicą Cesarstwa Rzymskiego?',
                options: ['Ateny', 'Rzym', 'Kartaż', 'Jerozolima'],
                correctIndex: 1
            },
            {
                question: 'W którym roku rozpoczęła się II wojna światowa?',
                options: ['1937', '1938', '1939', '1940'],
                correctIndex: 2
            },
            {
                question: 'Kiedy miała miejsce bitwa pod Grunwaldem?',
                options: ['1410', '1510', '1610', '1310'],
                correctIndex: 0
            },
            {
                question: 'Kto podpisał Deklarację Niepodległości Stanów Zjednoczonych?',
                options: ['George Washington', 'Thomas Jefferson', 'Abraham Lincoln', 'Benjamin Franklin'],
                correctIndex: 1
            },
            {
                question: 'W którym roku powstała Unia Europejska w obecnej formie?',
                options: ['1951', '1992', '2004', '2010'],
                correctIndex: 1
            },
            {
                question: 'Jak nazywała się starożytna droga handlowa łącząca Europę z Azją?',
                options: ['Jedwabny Szlak', 'Trakt Solny', 'Droga Morska', 'Szlak Wodny'],
                correctIndex: 0
            }
        ]
    }
];



const app = express();


app.use(express.json());


app.use(cors());


app.use(express.static(path.join(__dirname, '..', 'public')));



// ROUTER – grupowanie tras API pod prefiksem /api

const apiRouter = express.Router();


// POST /api/login 
// Sprawdza dane logowania użytkownika.

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

//Pobranie i wyswietlenie quizow z bazy danych TODO
apiRouter.get('/quizzes', async(req, res) => { 
});

// Pobranie quizow po jego id TODO
apiRouter.get('/quizzes/:id', async(req, res) => {
});

//Utworzenie quizu, dashboard dla admina TODO
apiRouter.post('/quizzes', async(req, res) => {
});

//Aktualizacja quizu, dashboard dla admina TODO
apiRouter.patch('/quizzes/:id', async(req, res) => {
});

//Usunięcie quizu, dashboard dla admina TODO
apiRouter.delete('/quizzes/:id', async(req, res) => {
});

//Pobranie informacji o użytkowniku TODO
apiRouter.get('/users/:id', async(req, res) => {
});

//Aktualizacja informacji o użytkowniku, dashboard dla admina TODO
apiRouter.patch('/users/:id', async(req, res) => {
});

//Usunięcie użytkownika, dashboard dla admina TODO
apiRouter.delete('/users/:id', async(req, res) => {
});

//Resetowanie hasła TODO
apiRouter.post('/users/:id/reset-password', async(req, res) => {
});







// Montujemy router API pod ścieżką /api
app.use('/api', apiRouter);







// TRASY STRON (HTML)


// JavaScript (main.js) przełącza widoki na podstawie URL.
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});


// ── Uruchomienie serwera 
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Serwer działa na porcie ${PORT}`);
    console.log(`http://localhost:${PORT}`);
});
