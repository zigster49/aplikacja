const express = require('express');
const bcrypt = require('bcrypt');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const db = require('./database/db.js');



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
apiRouter.get('/quizzes', async (req, res) => {
   db.all('SELECT id, title, data FROM quizzes', [], (err, rows) => {
        if (err) {
            console.error('Błąd pobierania quizów:', err);
            return res.status(500).json({ message: 'Błąd pobierania quizów' });
        }

        const quizzes = rows.map(row => ({
            id: row.id,
            title: row.title,
            questions: JSON.parse(row.data) 
        }));

        return res.json(quizzes);
    });

});

// Pobranie quizu po jego id TODO
apiRouter.get('/quizzes/:id', async (req, res) => {
     db.get('SELECT id, title, data FROM quizzes WHERE id = ?', [req.params.id], (err, row) => {
        if (err) {
            console.error('Błąd pobierania quizu:', err);
            return res.status(500).json({ message: 'Błąd pobierania quizu' });
        }
        if (!row) {
            return res.status(404).json({ message: 'Quiz nie został znaleziony' });
        }

        return res.json({
            id: row.id,
            title: row.title,
            questions: JSON.parse(row.data)
        });
    });
});

// Utworzenie quizu, dashboard dla admina TODO
apiRouter.post('/quizzes', async (req, res) => {});

// Aktualizacja quizu, dashboard dla admina TODO
apiRouter.patch('/quizzes/:id', async (req, res) => {});

// Usunięcie quizu, dashboard dla admina TODO
apiRouter.delete('/quizzes/:id', async (req, res) => {});


// Aktualizacja informacji o użytkowniku 
apiRouter.patch('/users/:id', async (req, res) => {
    const userId = req.params.id;
    const { email, name, login, password, role_id } = req.body;

    // 1. Dynamicznie budujemy zapytanie SQL na podstawie tego, co przyszło w req.body
    const fieldsToUpdate = [];
    const values = [];

    if (email) {
        fieldsToUpdate.push('email = ?');
        values.push(email.trim());
    }
    if (name) {
        fieldsToUpdate.push('name = ?');
        values.push(name.trim());
    }
    if (login) {
        fieldsToUpdate.push('login = ?');
        values.push(login.trim());
    }
    if (role_id) {
        fieldsToUpdate.push('role_id = ?');
        values.push(Number(role_id));
    }
    
   
    if (password) {
        try {
            
            const hashedPassword = await bcrypt.hash(password, 10);
            fieldsToUpdate.push('password = ?');
            values.push(hashedPassword);
        } catch (hashErr) {
            console.error('Błąd podczas haszowania hasła:', hashErr);
            return res.status(500).json({ message: 'Błąd przetwarzania hasła.' });
        }
    }

   
    if (fieldsToUpdate.length === 0) {
        return res.status(400).json({ message: 'Brak danych do aktualizacji.' });
    }

    
    values.push(userId);

    // Składamy zapytanie SQL, np: UPDATE users SET name = ?, email = ? WHERE id = ?
    const query = `UPDATE users SET ${fieldsToUpdate.join(', ')} WHERE id = ?`;

  
    
    db.run(query, values, function (err) {
        if (err) {
            console.error('Błąd podczas aktualizacji użytkownika:', err);

            // Obsługa błędu unikalności (jeśli ktoś próbuje zmienić email/login na taki, który już istnieje)
            if (err.message.includes('UNIQUE constraint failed')) {
                return res.status(400).json({ message: 'Podany login lub adres e-mail jest już zajęty.' });
            }

            return res.status(500).json({ message: 'Błąd serwera podczas aktualizacji danych.' });
        }

        // "this.changes" mówi nam, ile wierszy zostało zmodyfikowanych.
        // Jeśli wynosi 0, oznacza to, że użytkownik o takim ID nie istnieje w bazie.
        if (this.changes === 0) {
            return res.status(404).json({ message: 'Użytkownik nie został znaleziony.' });
        }

        //
        return res.json({ message: 'Dane użytkownika zostały pomyślnie zaktualizowane.' });
    });
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

// Pobieranie listy wszystkich użytkowników 
apiRouter.get('/users', (req, res) => {
    const query = `
        SELECT users.id, users.email, users.name, users.login, users.role_id, roles.name AS role
        FROM users
        LEFT JOIN roles ON users.role_id = roles.id
    `;

    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Błąd pobierania wszystkich użytkowników:', err);
            return res.status(500).json({ message: 'Błąd pobierania listy użytkowników' });
        }
        return res.json(rows);
    });
});
//Dodawanie uzytkownikow przez admina 
apiRouter.post('/users', async (req, res) => {
    const { email, name, login, password, role_id } = req.body;

    if (!email || !name || !login || !password || !role_id) {
        return res.status(400).json({ message: 'Wszystkie pola muszą zostać wypełnione!' });
    }

    db.get('SELECT * FROM users WHERE email = ? OR login = ?', [email, login], async (err, row) => {
        if (err) {
            console.error('Błąd bazy danych:', err);
            return res.status(500).json({ message: 'Błąd bazy danych.' });
        }
        if (row) {
            return res.status(409).json({ message: 'Użytkownik o podanym loginie lub e-mailu już istnieje.' });
        }

        try {
            const hashed_password = await bcrypt.hash(password, 10);

            db.run(
                'INSERT INTO users (email, name, login, password, role_id) VALUES (?, ?, ?, ?, ?)',
                [email, name, login, hashed_password, Number(role_id)],
                function (err) {
                    if (err) {
                        console.error('Błąd zapisu:', err);
                        return res.status(500).json({ message: 'Błąd zapisu do bazy danych.' });
                    }
                    return res.status(201).json({ message: 'Użytkownik został pomyślnie utworzony.' });
                }
            );
        } catch (error) {
            console.error('Błąd serwera:', error);
            return res.status(500).json({ message: 'Błąd wewnętrzny serwera.' });
        }
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
//Middleware do sprawdzania, czy użytkownik jest zalogowany
function Auth(req, res, next) {
    
    if (req.session && req.session.userId) {
        next(); 
    } else {
        
        
        res.status(403).send('Musisz się zalogować, aby zobaczyć tę stronę.');
        
    }
}

//Chroniony endpoint dla admina, dashboard dla admina 
app.get('/dashboard_admin', (req, res) => {
    res.sendFile(
        path.join(__dirname, '../../views/admin_dashboard.html')
    );
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