// PRZEŁĄCZANIE WIDOKÓW

/**
 * Pokazuje wybrany widok i ukrywa pozostałe.
 * @param {'home'|'login'|'register'|'quizzes'|'account'|'daily_quizz'|'reset_password'} view – nazwa widoku do pokazania
 */
function showView(view, add_to_history = true) {
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


// INIT VIEW

(function initView() {
    const path = window.location.pathname;

    if (path === '/register') showView('register');
    else if (path === '/login') showView('login');
    else if (path === '/quizzes') showView('quizzes');
    else if (path === '/account') showView('account');
    else if (path === '/daily_quizz') showView('daily_quizz');
    else if (path === '/reset_password') showView('reset_password');
    else showView('home');
})();

let dailyQuizData = null;
let dailyQuizTimerInterval = null;
let currentDailyQuestionIndex = 0;
let dailyQuizCorrectCount = 0;

// Pobiera quiz dnia z Open Trivia DB (z cache w localStorage na cały dzień) i uruchamia jego wyświetlanie.
async function loadDailyQuiz() {
    const container = document.getElementById('dailyQuizContainer');
    if (!container) return;

    container.innerHTML = '<p>Ładuję quiz dnia...</p>';

    // Sprawdź czy mamy już dzisiejszy quiz w localStorage
    const today = new Date().toISOString().slice(0, 10); // "2025-01-23"
    const cached = localStorage.getItem('dailyQuiz');

    if (cached) {
        try {
            const { date, quiz } = JSON.parse(cached);
            if (date === today) {
                // W tym samym dniu — użyj cache
                dailyQuizData = quiz;
                renderDailyQuiz(quiz);
                return;
            }
        } catch {
            localStorage.removeItem('dailyQuiz');
        }
    }

    // Nowy dzień lub brak cache — pobranie 10 losowych poytań z Open Trivia DB
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

        // Mapuje format Open Trivia DB → format aplikacji
        const questions = data.results.map(q => {
            // Mieszamy poprawną odpowiedź z błędnymi
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

        // Zapisz w localStorage z dzisiejszą datą
        localStorage.setItem('dailyQuiz', JSON.stringify({ date: today, quiz }));

        dailyQuizData = quiz;
        renderDailyQuiz(quiz);

    } catch (err) {
        console.error('Błąd pobierania quizu:', err);
        container.innerHTML = '<p>Nie można pobrać quizu. Spróbuj ponownie.</p>';
    }
}

// Odkodowuje HTML entities zwracane przez Open Trivia DB (np. &amp; → &)
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

// Renderuje stronę quizu i przygotowuje pierwszy zestaw pytań.
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

// Pokazuje aktualne pytanie oraz formularz z opcjami.
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

// Obsługuje odpowiedź użytkownika, aktualizuje wynik i przechodzi do kolejnego pytania.
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

// Kończy quiz i pokazuje tylko wynik z timerem do następnego quizu.
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


// Wyświetla komunikat błędu w podanym elemencie.
function showError(el, msg) {
    if (el) el.textContent = msg;
}

// Czyści tekst błędu 
function clearError(el) {
    if (el) el.textContent = '';
}

// Czyści błędy logowania
function clearLoginErrors() {
    clearError(document.getElementById('loginError'));
    clearError(document.getElementById('passwordError'));
}

//Czyści błędy rejestarcji
function clearRegisterErrors() {
    clearError(document.getElementById('emailError'));
    clearError(document.getElementById('nameError'));
    clearError(document.getElementById('loginErrorRegister'));
    clearError(document.getElementById('passwordErrorRegister'));
    clearError(document.getElementById('repeatPasswordError'));
}



// formularz logowanie fetch do API /api/login


document.getElementById('loginForm')?.addEventListener('submit', async function (e) {
    e.preventDefault();

    clearLoginErrors();

    const loginError = document.getElementById('loginError');
    const passwordError = document.getElementById('passwordError');

    const formData = new FormData(this);

    const login = formData.get('login')?.trim();
    const password = formData.get('password');

    let valid = true; //Domyślnie formularz przyjmuje poprawną formę, jeśli zostanie wykryty chodz jeden błąd zmieni wartośc na false i nie przejdzie

  
    if (!login) {
        showError(loginError, 'Podaj login');
        valid = false;
    }

    
    if (!password) {
        showError(passwordError, 'Podaj hasło');
        valid = false;
    }

    if (!valid) //Udany login
    return;
        

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ login, password })
        });

        const data = await response.json();

        // Błąd logowania z backendu
        if (!response.ok) {
            showError(passwordError, data.message || 'Niepoprawne dane logowania');
            return;
        }

        // Sukces logowania
        this.reset();
        showView('home');

    } catch (err) {
        console.error('Błąd sieci:', err);

        showError(passwordError, 'Nie można połączyć się z serwerem');
    }
});




// formularz rejestarcji fetch do API /api/register (POST)

document.getElementById('registerForm')?.addEventListener('submit', async function (e) {
    e.preventDefault();

    clearRegisterErrors();

    // Spany błędów
    const emailError = document.getElementById('emailError');
    const nameError = document.getElementById('nameError');
    const loginError = document.getElementById('loginErrorRegister');
    const passwordError = document.getElementById('passwordErrorRegister');
    const repeatPasswordError = document.getElementById('repeatPasswordError');

    // Dane formularza
    const formData = new FormData(this);

    const email = formData.get('email')?.trim();
    const name = formData.get('name')?.trim();
    const login = formData.get('login')?.trim();
    const password = formData.get('password');
    const repeatPassword = formData.get('repeatPassword');

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
    }

    
    if (password && password.length < 6) {
        showError(passwordError, 'Hasło musi mieć minimum 6 znaków');
        valid = false;
    }

  
    if (!repeatPassword) {
        showError(repeatPasswordError, 'Powtórz hasło');
        valid = false;
    }

    
    if (password && repeatPassword && password !== repeatPassword) {
        showError(repeatPasswordError, 'Hasła nie są takie same');
        valid = false;
    }

    if (!valid) //udana rejestracja
        return;
        


    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email,
                name,
                login,
                password
            })
        });

        const data = await response.json();

        // Błąd z backendu
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


// formularz zmiany hasła (bez fetch — TODO: podpiąć /api/change_password)

document.getElementById('resetPasswordForm')?.addEventListener('submit', async function (e) {
    e.preventDefault();

    // Spany błędów
    const oldPasswordError = document.getElementById('oldPasswordError');
    const newPasswordError = document.getElementById('newPasswordError');
    const repeatNewPasswordError = document.getElementById('repeatNewPasswordError');

    clearError(oldPasswordError);
    clearError(newPasswordError);
    clearError(repeatNewPasswordError);

    // Dane formularza
    const formData = new FormData(this);
    const oldPassword = formData.get('oldPassword');
    const newPassword = formData.get('newPassword');
    const repeatNewPassword = formData.get('repeatNewPassword');

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

    if (!valid) //udana zmiana hasła
        return;

    // TODO
    this.reset();
    showView('account');
});


// Wylogowanie (narazie bez logiki)

function handleLogout() {
    // TODO: logika wylogowania (czyszczenie sesji/tokenu)
    showView('home');
}