let currentUserId = null; // Przechowuje ID aktualnie zalogowanego użytkownika 


// PRZEŁĄCZANIE WIDOKÓW

/**
 * Pokazuje wybrany widok i ukrywa pozostałe.
 * @param {'home'|'login'|'register'|'quizzes'|'account'|'daily_quizz'|'reset_password'|'playQuiz'} view – nazwa widoku do pokazania
 * @param {boolean} add_to_history 
 * @param {number|string|null} quizId 
 */
function showView(view, add_to_history = true, quizId = null) {
    // [POPRAWKA] Czyszczenie intervalu odliczania przy zmianie jakiegokolwiek widoku
    if (dailyQuizTimerInterval) {
        clearInterval(dailyQuizTimerInterval);
        dailyQuizTimerInterval = null;
    }

    // Jesli uzytykownik jest niezalogowany przekieruj na logowanie, gdy próbuje wejść na chronione widoki
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
        reset_password: document.getElementById('reset_passwordView'),
        playQuiz: document.getElementById('playQuizView')
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
        reset_password: '/reset_password',
        playQuiz: quizId ? `/quizzes/${quizId}` : '/quizzes'
    };

    if (add_to_history) {
        history.pushState({ view, quizId }, '', paths[view]);
    }

    // Uruchamianie odpowiednich funkcji ładujących dane po przełączeniu widoku
    if (view === 'quizzes') {
        loadQuizzes();
    }

    if (view === 'daily_quizz') {
        loadDailyQuiz();
    }
}


// OBSŁUGA PRZYCISKU WSTECZ / NAPRZÓD PRZEGLĄDARKI

window.addEventListener('popstate', (e) => {
    let view = e.state?.view;
    let quizId = e.state?.quizId || null;

    if (!view) {
        const path = window.location.pathname;
        const quizMatch = path.match(/^\/quizzes\/(\d+)/);

        if (quizMatch) {
            view = 'playQuiz';
            quizId = quizMatch[1];
        } else {
            view = path === '/register' ? 'register' :
                   path === '/login' ? 'login' :
                   path === '/quizzes' ? 'quizzes' :
                   path === '/account' ? 'account' :
                   path === '/daily_quizz' ? 'daily_quizz' :
                   path === '/reset_password' ? 'reset_password' :
                   'home';
        }
    }

    if (view === 'playQuiz' && quizId) {
        // [POPRAWKA] Najpierw fetch, potem przełączenie widoku (uniknięcie pustego ekranu) + catch error
        fetch(`/api/quizzes/${quizId}`)
            .then(res => {
                if (!res.ok) throw new Error('Nie znaleziono quizu');
                return res.json();
            })
            .then(quiz => {
                currentQuizData = quiz;
                currentQuestionIndex = 0;
                quizCorrectCount = 0;
                
                const gameContainer = document.getElementById('playQuizContainer');
                if (gameContainer) {
                    gameContainer.innerHTML = `
                        <div class="daily-quiz-card">
                            <div id="playQuizQuestionContainer"></div>
                            <p id="playQuizFeedback" class="quiz-feedback"></p>
                        </div>
                    `;
                }
                document.getElementById('playQuizTitle').textContent = quiz.title;
                
                showView(view, false, quizId); // Pokazujemy widok dopiero gdy dane są gotowe
                showPlayQuestion();
            })
            .catch(err => {
                console.error(err);
                showView('quizzes', false);
            });
    } else {
        showView(view, false);
    }
});


// INIT VIEW – uruchamiane przy załadowaniu strony

document.addEventListener('DOMContentLoaded', async () => {
    // Czekamy na zakończenie sprawdzania sesji, aby sprawdzanie `currentUserId` poniżej miało sens
    await checkSession();
  
    const path = window.location.pathname;
    const quizMatch = path.match(/^\/quizzes\/(\d+)/);
    
    if (path === '/register') showView('register', false);
    else if (path === '/login') showView('login', false);
    else if (path === '/quizzes') showView('quizzes', false);
    else if (quizMatch) {
        startQuiz(quizMatch[1]);
    }
    else if (path === '/account') {
        if (currentUserId) {
            showView('account', false);
        } else {
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


// ==========================================
// SPRAWDZANIE SESJI (CZY ZALOGOWANY)
// ==========================================

async function checkSession() {
    try {
        const response = await fetch('/api/me', {
            method: 'GET',
            credentials: 'include' 
        });

        const data = await response.json();
        const navLinks = document.querySelector('.nav-links');

        if (data.loggedIn) {
            currentUserId = data.userId; 
            const isAdmin = data.role === 'admin'; 

            if (navLinks) {
                const adminLink = isAdmin ? `<li><a href="/dashboard_admin" class="nav-btn">Panel Admina</a></li>` : '';
                
                navLinks.innerHTML = `
                    <li><a href="#" class="nav-btn" onclick="showView('quizzes'); return false;">Quizy</a></li>
                    <li><a href="#" class="nav-btn" onclick="showView('account'); return false;">Konto</a></li>
                    ${adminLink}
                `;
            }

            const accountNameH2 = document.querySelector('.account-info h2');
            const accountLoginSpan = document.querySelector('.account-login');
            const accountEmailP = document.querySelector('.account-email');

            if (accountNameH2) accountNameH2.textContent = data.name; 
            if (accountLoginSpan) accountLoginSpan.textContent = `@${data.login}`; 
            if (accountEmailP) accountEmailP.textContent = data.email; 

        } else {
            currentUserId = null; 
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


// ==========================================
// WYŚWIETLANIE / CZYSZCZENIE BŁĘDÓW
// ==========================================

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


// ==========================================
// FORMULARZE (LOGOWANIE, REJESTRACJA, ZMIANA HASŁA)
// ==========================================

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
            credentials: 'include' 
        });

        const data = await response.json();

        if (!response.ok) {
            showError(passwordError, data.message || 'Niepoprawne dane logowania');
            return;
        }

        this.reset();
        await checkSession(); 
        showView('home');

    } catch (err) {
        console.error('Błąd sieci:', err);
        showError(passwordError, 'Nie można połączyć się z serwerem');
    }
});

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

        this.reset();
        showView('login');

    } catch (err) {
        console.error('Błąd sieci:', err);
        showError(loginError, 'Nie można połączyć się z serwerem');
    }
});

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

    if (!currentUserId) {
        showError(repeatNewPasswordError, 'Błąd autoryzacji. Zaloguj się ponownie.');
        return;
    }

    try {
        const response = await fetch(`/api/users/${currentUserId}/reset-password`, { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ oldPassword, newPassword })
        });

        const data = await response.json();

        if (!response.ok) {
            showError(repeatNewPasswordError, data.message || 'Nie udało się zmienić hasła.');
            return;
        }

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
            credentials: 'include'
        });

        if (response.ok) {
            await checkSession(); 
            showView('home');
        }
    } catch (error) {
        console.error('Błąd podczas wylogowywania:', error);
    }
}


// ==========================================
// LOGIKA: DAILY QUIZ
// ==========================================

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
    if (dailyQuizData.nextQuizAt) {
        startDailyQuizCountdown(dailyQuizData.nextQuizAt, timerEl);
    } else {
        if (timerEl) timerEl.parentElement.style.display = 'none'; 
    }
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
            dailyQuizTimerInterval = null; // [POPRAWKA] Reset zmiennej referencyjnej
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


// ==========================================
// LOGIKA: POBIERANIE I ROZPOCZYNANIE BAZOWYCH QUIZÓW
// ==========================================

let currentQuizData = null;
let currentQuestionIndex = 0;
let quizCorrectCount = 0;

async function loadQuizzes() {
    const container = document.getElementById('quizzesContainer');
    if (!container) return;
 
    container.innerHTML = '<div class="quiz-status-msg">Ładowanie dostępnych quizów...</div>';
 
    try {
        const response = await fetch('/api/quizzes');
 
        if (!response.ok) {
            container.innerHTML = '<div class="quiz-status-msg error">Nie udało się pobrać quizów.</div>';
            return;
        }
 
        const quizzes = await response.json();
 
        if (!quizzes || !quizzes.length) {
            container.innerHTML = '<div class="quiz-status-msg info">Brak dostępnych quizów w bazie danych.</div>';
            return;
        }
 
        container.innerHTML = quizzes.map(quiz => {
            const questionCount = quiz.questions ? quiz.questions.length : 0;
            
            return `
                <div class="quiz-card" data-id="${quiz.id}">
                    <div class="quiz-card-content">
                        <h3 onclick="startQuiz(${quiz.id})" style="cursor: pointer; display: inline-block;">
                            ${quiz.title}
                        </h3>
                        <p>${questionCount} pytań w tym zestawie</p>
                    </div>
                </div>
            `;
        }).join('');
 
    } catch (err) {
        console.error('Błąd pobierania quizów:', err);
        container.innerHTML = '<div class="quiz-status-msg error">Nie można połączyć się z serwerem.</div>';
    }
}
 
function startQuiz(quizId) {
    const gameContainer = document.getElementById('playQuizContainer');
    if (gameContainer) {
        gameContainer.innerHTML = `
            <div class="daily-quiz-card">
                <div id="playQuizQuestionContainer"></div>
                <p id="playQuizFeedback" class="quiz-feedback"></p>
            </div>
        `;
    }

    fetch(`/api/quizzes/${quizId}`)
        .then(res => {
            if (!res.ok) throw new Error('Problem z pobraniem wybranego quizu');
            return res.json();
        })
        .then(quiz => {
            currentQuizData = quiz;
            currentQuestionIndex = 0;
            quizCorrectCount = 0;

            document.getElementById('playQuizTitle').textContent = quiz.title;
            showView('playQuiz', true, quizId);
            showPlayQuestion();
        })
        .catch(err => {
            console.error('Błąd ładowania quizu:', err);
            alert('Nie udało się uruchomić wybranego quizu.');
        });
}

function showPlayQuestion() {
    const container = document.getElementById('playQuizQuestionContainer');
    const feedback = document.getElementById('playQuizFeedback');
    if (!container || !currentQuizData) return;
    if (feedback) feedback.textContent = ''; 

    const questionData = currentQuizData.questions[currentQuestionIndex];
    
    if (!questionData) {
        const gameContainer = document.getElementById('playQuizContainer');
        if (gameContainer) {
            gameContainer.innerHTML = `
                <div class="daily-quiz-card finished-quiz">
                    <h3>${currentQuizData.title}</h3>
                    <p>Ukończyłeś quiz! Poprawnych odpowiedzi: ${quizCorrectCount} / ${currentQuizData.questions.length}</p>
                    <div class="quiz-result">
                        <button onclick="showView('quizzes')" class="submit-btn" style="margin-top:15px; padding: 12px 24px; cursor:pointer; font-weight:500;">
                            Wróć do listy quizów
                        </button>
                    </div>
                </div>
            `;
        }
        return;
    }

    const optionsHtml = questionData.options.map((option, index) => `
        <label class="quiz-option">
            <input type="radio" name="quizAnswer" value="${index}"> ${option}
        </label>
    `).join('');

    container.innerHTML = `
        <p>Pytanie ${currentQuestionIndex + 1} / ${currentQuizData.questions.length}</p>
        <p>${questionData.question}</p>
        <form id="playQuizForm">
            ${optionsHtml}
            <button type="submit">Zatwierdź odpowiedź</button>
        </form>
    `;

    document.getElementById('playQuizForm')?.addEventListener('submit', handlePlaySubmit);
}

function handlePlaySubmit(event) {
    event.preventDefault();
    const feedback = document.getElementById('playQuizFeedback');
    const selected = document.querySelector('input[name="quizAnswer"]:checked');

    if (!selected) {
        if (feedback) { feedback.textContent = 'Wybierz odpowiedź, zanim przejdziesz dalej.'; feedback.style.color = 'red'; }
        return;
    }

    const selectedIndex = Number(selected.value);
    const questionData = currentQuizData.questions[currentQuestionIndex];

    if (selectedIndex === questionData.correctIndex) {
        quizCorrectCount += 1;
        if (feedback) { feedback.textContent = '✔️ Poprawna odpowiedź.'; feedback.style.color = 'green'; }
    } else {
        if (feedback) { feedback.textContent = '❌ Niepoprawna odpowiedź.'; feedback.style.color = 'red'; }
    }

    currentQuestionIndex += 1;
    setTimeout(() => { 
        if (feedback) feedback.textContent = '';
        showPlayQuestion(); 
    }, 700);
}