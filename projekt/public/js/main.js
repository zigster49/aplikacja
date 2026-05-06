
// PRZEŁĄCZANIE WIDOKÓW

/**
 * Pokazuje wybrany widok i ukrywa pozostałe.
 * @param {'home'|'login'|'register'|'quizzes'|'account'|'daily_quizz'} view – nazwa widoku do pokazania
 */
function showView(view) {
    // Wszystkie widoki i odpowiadające im elementy DOM
    const views = {
        home: document.getElementById('homeView'),
        login: document.getElementById('loginView'),
        register: document.getElementById('registerView'),
        quizzes: document.getElementById('quizzesView'),
        account: document.getElementById('accountView'),
        daily_quizz: document.getElementById('daily_quizzView')
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
        daily_quizz: '/daily_quizz'
    };

    history.pushState({ view }, '', paths[view]);
}


// OBSŁUGA PRZYCISKU WSTECZ / NAPRZÓD PRZEGLĄDARKI

window.addEventListener('popstate', (e) => {
    const view = e.state?.view || (
        window.location.pathname === '/register' ? 'register' :
        window.location.pathname === '/login' ? 'login' :
        window.location.pathname === '/quizzes' ? 'quizzes' :
        window.location.pathname === '/account' ? 'account' :
        window.location.pathname === '/daily_quizz' ? 'daily_quizz' :
        'home'
    );

    showView(view);
});


// INIT VIEW

(function initView() {
    const path = window.location.pathname;

    if (path === '/register') showView('register');
    else if (path === '/login') showView('login');
    else if (path === '/quizzes') showView('quizzes');
    else if (path === '/account') showView('account');
    else if (path === '/daily_quizz') showView('daily_quizz');
    else showView('home');
})();




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