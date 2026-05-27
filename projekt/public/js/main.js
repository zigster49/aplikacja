let currentUserId = null; // Przechowuje ID aktualnie zalogowanego użytkownika 

// PRZEŁĄCZANIE WIDOKÓW

/**
 * Pokazuje wybrany widok i ukrywa pozostałe.
 * @param {'home'|'login'|'register'|'quizzes'|'account'|'daily_quizz'|'reset_password'} view – nazwa widoku do pokazania
 */
function showView(view, add_to_history = true) {
    // OCHRONA: Jeśli widok wymaga zalogowania, a użytkownik jest niezalogowany -> przekieruj na logowanie
    if ((view === 'account' || view === 'reset_password') && !currentUserId) {
        view = 'login';
    }

    // Wszystkie widoki i odpowiadające im elementy DOM
    const views = {
        home: document.getElementById('homeView'),
        login: document.getElementById('loginView'),
        register: document.getElementById('registerView'),
        quizzes: document.getElementById('quizzesView'),
        account: document.getElementById('accountView'),
        daily_quizz: document.getElementById('daily_quizzView'),
        reset_password: document.getElementById('reset_passwordView')
    };

    // Ukrywamy wszystkie widoki
    Object.values(views).forEach(el => {
        if (el) el.style.display = 'none';
    });

    // Pokazujemy wybrany widok
    if (views[view]) {
        views[view].style.display = 'block';
    }

    // Aktualizuje URL bez przeładowania strony
    const paths = {
        home: '/',
        login: '/login',
        register: '/register',
        quizzes: '/quizzes',
        account: '/account',
        daily_quizz: '/daily_quizz',
        reset_password: '/reset_password'
    };

    if (add_to_history) {
        history.pushState({ view }, '', paths[view]);
    }

    if (view === 'daily_quizz') {
        loadDailyQuiz();
    }
}


// OBSŁUGA PRZYCISKU WSTECZ / NAPRZÓD PRZEGLĄDARKI

window.addEventListener('popstate', (e) => {
    const view = e.state?.view || (
        window.location.pathname === '/register' ? 'register' :
        window.location.pathname === '/login' ? 'login' :
        window.location.pathname === '/quizzes' ? 'quizzes' :
        window.location.pathname === '/account' ? 'account' :
        window.location.pathname === '/daily_quizz' ? 'daily_quizz' :
        window.location.pathname === '/reset_password' ? 'reset_password' :
        'home'
    );

    showView(view, false);
});


// INIT VIEW – uruchamiane przy załadowaniu strony

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Najpierw czekamy na sprawdzenie sesji (aby zaktualizować status i zmienną currentUserId)
    await checkSession();

    // 2. Potem pokaż odpowiedni widok na podstawie URL oraz uprawnień
    const path = window.location.pathname;
    
    if (path === '/register') showView('register', false);
    else if (path === '/login') showView('login', false);
    else if (path === '/quizzes') showView('quizzes', false);
    else if (path === '/account') {
        if (currentUserId) {
            showView('account', false);
        } else {
            // Chroniony ednpoint, jesli uzytnik nie jest zalogowany, przekieruj na logowanie
            history.replaceState({ view: 'login' }, '', '/login');
            showView('login', false);
        }
    }
    else if (path === '/daily_quizz') showView('daily_quizz', false);
    else if (path === '/reset_password') {
        if (currentUserId) {
            showView('reset_password', false);
        } else {
            history.replaceState({ view: 'login' }, '', '/login');
            showView('login', false);
        }
    }
    else showView('home', false);
});


// SPRAWDZANIE SESJI (CZY ZALOGOWANY)

async function checkSession() {
    try {
        const response = await fetch('/api/me', {
            method: 'GET',
            credentials: 'include' // Wysyła ciasteczka sesyjne do serwera
        });

        const data = await response.json();
        const navLinks = document.querySelector('.nav-links');

        if (data.loggedIn) {
            currentUserId = data.userId; // Zapisz ID zalogowanego użytkownika
            
            // Pokaż linki dla zalogowanych TODO dac ifa czy admin 
            if (navLinks) {
                navLinks.innerHTML = `
                    <li><a href="#" class="nav-btn" onclick="showView('quizzes'); return false;">Quizy</a></li>
                    <li><a href="#" class="nav-btn" onclick="showView('account'); return false;">Konto</a></li>
                    <li><a href="/dashboard_admin" class="nav-btn">Panel Admina</a></li> 
                `;
            }

            // Znajdowanie elementów w widoku konta i dynamiczna aktualizacja
            const accountNameH2 = document.querySelector('.account-info h2');
            const accountLoginSpan = document.querySelector('.account-login');
            const accountEmailP = document.querySelector('.account-email');

            if (accountNameH2) accountNameH2.textContent = data.name; // Wstawia Imię
            if (accountLoginSpan) accountLoginSpan.textContent = `@${data.login}`; // Wstawia Login z małpą
            if (accountEmailP) accountEmailP.textContent = data.email; // Wstawia Email

        } else {
            currentUserId = null; // Brak aktywnej sesji
            // Pokaż linki dla niezalogowanych
            if (navLinks) {
                navLinks.innerHTML = `
                    <li><a href="#" class="nav-btn" onclick="showView('login'); return false;">Logowanie</a></li>
                    <li><a href="#" class="nav-btn" onclick="showView('register'); return false;">Zarejestruj się</a></li>
                    <li><a href="#" class="nav-btn" onclick="showView('quizzes'); return false;">Quizy</a></li>
                `;
            }
        }
    } catch (error) {
        console.error('Błąd podczas sprawdzania sesji:', error);
        currentUserId = null;
    }
}


// WYŚWIETLANIE / CZYSZCZENIE BŁĘDÓW

function showError(el, msg) {
    if (el) el.textContent = msg;
}

function clearError(el) {
    if (el) el.textContent = '';
}

function clearLoginErrors() {
    clearError(document.getElementById('loginError'));
    clearError(document.getElementById('passwordError'));
}

function clearRegisterErrors() {
    clearError(document.getElementById('emailError'));
    clearError(document.getElementById('nameError'));
    clearError(document.getElementById('loginErrorRegister'));
    clearError(document.getElementById('passwordErrorRegister'));
    clearError(document.getElementById('repeatPasswordError'));
}


// FORMULARZ LOGOWANIA

document.getElementById('loginForm')?.addEventListener('submit', async function (e) {
    e.preventDefault();

    clearLoginErrors();

    const loginError = document.getElementById('loginError');
    const passwordError = document.getElementById('passwordError');

    const login = this.login.value.trim();
    const password = this.password.value;

    let valid = true;

    if (!login) {
        showError(loginError, 'Podaj login');
        valid = false;
    }

    if (!password) {
        showError(passwordError, 'Podaj hasło');
        valid = false;
    }

    if (!valid) return;

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ login, password }),
            credentials: 'include' // Krytyczne dla ustanowienia sesji
        });

        const data = await response.json();

        if (!response.ok) {
            showError(passwordError, data.message || 'Niepoprawne dane logowania');
            return;
        }

        // Sukces logowania
        this.reset();
        await checkSession(); // Odśwież nawigację i dane użytkownika
        showView('home');

    } catch (err) {
        console.error('Błąd sieci:', err);
        showError(passwordError, 'Nie można połączyć się z serwerem');
    }
});


// FORMULARZ REJESTRACJI

document.getElementById('registerForm')?.addEventListener('submit', async function (e) {
    e.preventDefault();

    clearRegisterErrors();

    const emailError = document.getElementById('emailError');
    const nameError = document.getElementById('nameError');
    const loginError = document.getElementById('loginErrorRegister');
    const passwordError = document.getElementById('passwordErrorRegister');
    const repeatPasswordError = document.getElementById('repeatPasswordError');

    const email = this.email.value.trim();
    const name = this.name.value.trim();
    const login = this.login.value.trim();
    const password = this.password.value;
    const repeatPassword = this.repeatPassword.value;

    let valid = true;

    if (!email) {
        showError(emailError, 'Podaj email');
        valid = false;
    }

    if (!name) {
        showError(nameError, 'Podaj imię');
        valid = false;
    }

    if (!login) {
        showError(loginError, 'Podaj login');
        valid = false;
    }

    if (!password) {
        showError(passwordError, 'Podaj hasło');
        valid = false;
    } else if (password.length < 6) {
        showError(passwordError, 'Hasło musi mieć minimum 6 znaków');
        valid = false;
    }

    if (!repeatPassword) {
        showError(repeatPasswordError, 'Powtórz hasło');
        valid = false;
    } else if (password && password !== repeatPassword) {
        showError(repeatPasswordError, 'Hasła nie są takie same');
        valid = false;
    }

    if (!valid) return;

    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, name, login, password })
        });

        const data = await response.json();

        if (!response.ok) {
            showError(loginError, data.message || 'Błąd rejestracji');
            return;
        }

        // Sukces rejestracji
        this.reset();
        showView('login');

    } catch (err) {
        console.error('Błąd sieci:', err);
        showError(loginError, 'Nie można połączyć się z serwerem');
    }
});


// FORMULARZ ZMIANY HASŁA

document.getElementById('resetPasswordForm')?.addEventListener('submit', async function (e) {
    e.preventDefault();

    const oldPasswordError = document.getElementById('oldPasswordError');
    const newPasswordError = document.getElementById('newPasswordError');
    const repeatNewPasswordError = document.getElementById('repeatNewPasswordError');

    clearError(oldPasswordError);
    clearError(newPasswordError);
    clearError(repeatNewPasswordError);

    const oldPassword = this.oldPassword.value;
    const newPassword = this.newPassword.value;
    const repeatNewPassword = this.repeatNewPassword.value;

    let valid = true;

    if (!oldPassword) {
        showError(oldPasswordError, 'Podaj stare hasło');
        valid = false;
    }

    if (!newPassword) {
        showError(newPasswordError, 'Podaj nowe hasło');
        valid = false;
    } else if (newPassword.length < 6) {
        showError(newPasswordError, 'Hasło musi mieć minimum 6 znaków');
        valid = false;
    }

    if (!repeatNewPassword) {
        showError(repeatNewPasswordError, 'Powtórz nowe hasło');
        valid = false;
    } else if (newPassword && newPassword !== repeatNewPassword) {
        showError(repeatNewPasswordError, 'Hasła nie są takie same');
        valid = false;
    }

    if (!valid) return;

    // Zabezpieczenie przed próbą zmiany hasła bez aktywnej sesji
    if (!currentUserId) {
        showError(repeatNewPasswordError, 'Błąd autoryzacji. Zaloguj się ponownie.');
        return;
    }

    try {
        const response = await fetch(`/api/users/${currentUserId}/reset-password`, { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ oldPassword, newPassword }) // Wysyłamy stare i nowe hasło
        });

        const data = await response.json();

        if (!response.ok) {
            showError(repeatNewPasswordError, data.message || 'Nie udało się zmienić hasła.');
            return;
        }

        // Sukces zmiany hasła
        this.reset();
        showView('account');
        alert('Hasło zostało zmienione pomyślnie!');

    } catch (err) {
        console.error('Błąd komunikacji z serwerem:', err);
        showError(repeatNewPasswordError, 'Nie można połączyć się z serwerem.');
    }
});


// WYLOGOWANIE

async function handleLogout() {
    try {
        const response = await fetch('/api/logout', {
            method: 'POST',
            credentials: 'include' // Krytyczne dla usunięcia sesji
        });

        if (response.ok) {
            await checkSession(); // Zaktualizuj UI (wyczyści dane sesji i podmieni menu)
            showView('home');
        }
    } catch (error) {
        console.error('Błąd podczas wylogowywania:', error);
    }
}


// DAILY QUIZ

let dailyQuizData = null;
let dailyQuizTimerInterval = null;
let currentDailyQuestionIndex = 0;
let dailyQuizCorrectCount = 0;

async function loadDailyQuiz() {
    const container = document.getElementById('dailyQuizContainer');
    if (!container) return;

    container.innerHTML = '<p>Ładuję quiz dnia...</p>';

    const today = new Date().toISOString().slice(0, 10);
    const cached = localStorage.getItem('dailyQuiz');

    if (cached) {
        try {
            const { date, quiz } = JSON.parse(cached);
            if (date === today) {
                dailyQuizData = quiz;
                renderDailyQuiz(quiz);
                return;
            }
        } catch {
            localStorage.removeItem('dailyQuiz');
        }
    }

    try {
        const response = await fetch('https://opentdb.com/api.php?amount=10&type=multiple');

        if (!response.ok) {
            container.innerHTML = '<p>Nie udało się pobrać quizu.</p>';
            return;
        }

        const data = await response.json();

        if (data.response_code !== 0 || !data.results?.length) {
            container.innerHTML = '<p>Nie udało się pobrać quizu. Spróbuj ponownie.</p>';
            return;
        }

        const questions = data.results.map(q => {
            const options = [...q.incorrect_answers, q.correct_answer]
                .sort(() => Math.random() - 0.5)
                .map(opt => decodeHTMLEntities(opt));

            const correctIndex = options.indexOf(decodeHTMLEntities(q.correct_answer));

            return {
                question: decodeHTMLEntities(q.question),
                options,
                correctIndex
            };
        });

        const quiz = {
            title: 'Quiz Dnia',
            questions,
            nextQuizAt: getNextMidnight()
        };

        localStorage.setItem('dailyQuiz', JSON.stringify({ date: today, quiz }));

        dailyQuizData = quiz;
        renderDailyQuiz(quiz);

    } catch (err) {
        console.error('Błąd pobierania quizu:', err);
        container.innerHTML = '<p>Nie można pobrać quizu. Spróbuj ponownie.</p>';
    }
}

function decodeHTMLEntities(text) {
    const el = document.createElement('textarea');
    el.innerHTML = text;
    return el.value;
}

// Zwraca datę następnej północy (reset quizu o 00:00)
function getNextMidnight() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow.toISOString();
}

function renderDailyQuiz(quiz) {
    const container = document.getElementById('dailyQuizContainer');
    if (!container) return;

    currentDailyQuestionIndex = 0;
    dailyQuizCorrectCount = 0;

    container.innerHTML = `
        <div class="daily-quiz-card">
            <h3>${quiz.title}</h3>
            <div id="dailyQuizQuestionContainer"></div>
            <p id="dailyQuizFeedback" class="quiz-feedback"></p>
        </div>
    `;

    showDailyQuizQuestion();
}

function showDailyQuizQuestion() {
    const container = document.getElementById('dailyQuizQuestionContainer');
    if (!container || !dailyQuizData) return;

    const questionData = dailyQuizData.questions[currentDailyQuestionIndex];
    if (!questionData) {
        finishDailyQuiz();
        return;
    }

    const optionsHtml = questionData.options.map((option, index) => `
        <label class="quiz-option">
            <input type="radio" name="dailyQuizAnswer" value="${index}">
            ${option}
        </label>
    `).join('');

    container.innerHTML = `
        <p>Pytanie ${currentDailyQuestionIndex + 1} / ${dailyQuizData.questions.length}</p>
        <p>${questionData.question}</p>
        <form id="dailyQuizForm">
            ${optionsHtml}
            <button type="submit">Zatwierdź odpowiedź</button>
        </form>
    `;

    document.getElementById('dailyQuizForm')?.addEventListener('submit', handleDailyQuizSubmit);
}

function handleDailyQuizSubmit(event) {
    event.preventDefault();
    const feedback = document.getElementById('dailyQuizFeedback');
    const selected = document.querySelector('input[name="dailyQuizAnswer"]:checked');

    if (!selected) {
        if (feedback) {
            feedback.textContent = 'Wybierz odpowiedź, zanim przejdziesz dalej.';
            feedback.style.color = 'red';
        }
        return;
    }

    const selectedIndex = Number(selected.value);
    const questionData = dailyQuizData.questions[currentDailyQuestionIndex];

    if (selectedIndex === questionData.correctIndex) {
        dailyQuizCorrectCount += 1;
        if (feedback) {
            feedback.textContent = '✔️ Poprawna odpowiedź.';
            feedback.style.color = 'green';
        }
    } else {
        if (feedback) {
            feedback.textContent = '❌ Niepoprawna odpowiedź.';
            feedback.style.color = 'red';
        }
    }

    currentDailyQuestionIndex += 1;

    if (currentDailyQuestionIndex >= dailyQuizData.questions.length) {
        finishDailyQuiz();
    } else {
        setTimeout(() => {
            if (feedback) feedback.textContent = '';
            showDailyQuizQuestion();
        }, 700);
    }
}

function finishDailyQuiz() {
    const container = document.getElementById('dailyQuizContainer');
    if (!container || !dailyQuizData) return;

    container.innerHTML = `
        <div class="daily-quiz-card finished-quiz">
            <h3>${dailyQuizData.title}</h3>
            <p>Ukończyłeś quiz! Poprawnych odpowiedzi: ${dailyQuizCorrectCount} / ${dailyQuizData.questions.length}</p>
            <div class="quiz-result">
                <p>Następny quiz dnia za</p>
                <p id="dailyQuizTimer" class="quiz-timer"></p>
            </div>
        </div>
    `;

    const timerEl = document.getElementById('dailyQuizTimer');
    startDailyQuizCountdown(dailyQuizData.nextQuizAt, timerEl);
}

function startDailyQuizCountdown(nextQuizAt, element) {
    if (!element) return;
    if (dailyQuizTimerInterval) {
        clearInterval(dailyQuizTimerInterval);
    }

    function updateTimer() {
        const target = new Date(nextQuizAt).getTime();
        const now = Date.now();
        const diff = target - now;

        if (diff <= 0) {
            element.textContent = 'Quiz dnia jest już dostępny. Odśwież stronę.';
            clearInterval(dailyQuizTimerInterval);
            return;
        }

        const hours = String(Math.floor(diff / (1000 * 60 * 60))).padStart(2, '0');
        const minutes = String(Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))).padStart(2, '0');
        const seconds = String(Math.floor((diff % (1000 * 60)) / 1000)).padStart(2, '0');

        element.textContent = `${hours}:${minutes}:${seconds}`;
    }

    updateTimer();
    dailyQuizTimerInterval = setInterval(updateTimer, 1000);
}