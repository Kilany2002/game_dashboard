App.auth.redirectIfAuthed('index.html');

const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const loginErrorText = document.getElementById('login-error-text');
const loginButton = document.getElementById('login-button');

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.hidden = true;
  loginButton.disabled = true;
  loginButton.textContent = 'جارٍ تسجيل الدخول…';

  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  const { error } = await App.api.signIn(email, password);

  loginButton.disabled = false;
  loginButton.textContent = 'تسجيل الدخول';

  if (error) {
    loginErrorText.textContent = error.message;
    loginError.hidden = false;
    return;
  }

  location.replace('index.html');
});
