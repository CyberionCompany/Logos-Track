import { auth, googleProvider, githubProvider, microsoftProvider, analytics } from './config.js';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { logEvent } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-analytics.js";
import { State } from './state.js';
import { UI } from './ui.js';
import { Bens } from './bens.js';
import { Dashboard } from './dashboard.js';

export const Auth = {
  init() {
    const loginForm    = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const toggleLink   = document.getElementById('toggle-auth-mode');
    
    // Botões sociais
    const googleBtn    = document.getElementById('google-signin-button');
    const githubBtn    = document.getElementById('github-signin-button');
    const msBtn        = document.getElementById('ms-signin-button');
    const logoutBtn    = document.getElementById('logout-button');

    loginForm.addEventListener('submit',    e => Auth.login(e));
    registerForm.addEventListener('submit', e => Auth.register(e));
    
    // Listeners sociais
    googleBtn?.addEventListener('click', () => Auth.socialSignIn(googleProvider, 'Google'));
    githubBtn?.addEventListener('click', () => Auth.socialSignIn(githubProvider, 'GitHub'));
    msBtn?.addEventListener('click',     () => Auth.socialSignIn(microsoftProvider, 'Microsoft'));
    
    logoutBtn.addEventListener('click',     () => Auth.logout());

    toggleLink.addEventListener('click', e => {
      e.preventDefault();
      const isLogin = !loginForm.classList.contains('hidden');
      loginForm.classList.toggle('hidden', isLogin);
      registerForm.classList.toggle('hidden', !isLogin);
      document.getElementById('auth-title').textContent = isLogin ? 'Crie a sua conta' : 'Acesse sua conta';
      document.getElementById('auth-subtitle').textContent = isLogin
        ? 'Gerencie seu patrimônio com eficiência.'
        : 'Bem-vindo de volta!';
      toggleLink.textContent = isLogin ? 'Já tem conta? Entrar' : 'Não tem conta? Cadastre-se';
      Auth._clearError();
    });

    onAuthStateChanged(auth, user => {
      if (user) {
        State.currentUser = user;
        Auth._showApp(user);
        Bens.load();
      } else {
        State.currentUser = null;
        if (State.bensUnsub) State.bensUnsub();
        Auth._showAuth();
        Auth._resetUI();
      }
    });
  },

  async socialSignIn(provider, providerName) {
    UI.loading(true);
    try {
      await signInWithPopup(auth, provider);
      Auth._clearError();
      logEvent(analytics, 'login', { method: providerName });
    } catch (error) {
      Auth._setError(`Falha ao autenticar com ${providerName}.`);
    } finally { 
      UI.loading(false); 
    }
  },

  async login(e) {
    e.preventDefault();
    UI.loading(true);
    try {
      await signInWithEmailAndPassword(auth,
        document.getElementById('login-email').value,
        document.getElementById('login-password').value
      );
      Auth._clearError();
      logEvent(analytics, 'login', { method: 'Email' });
    } catch {
      Auth._setError('Email ou senha inválidos.');
    } finally { UI.loading(false); }
  },

  async register(e) {
    e.preventDefault();
    UI.loading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth,
        document.getElementById('register-email').value,
        document.getElementById('register-password').value
      );
      await updateProfile(cred.user, { displayName: document.getElementById('register-name').value });
      Auth._clearError();
      logEvent(analytics, 'sign_up', { method: 'Email' });
    } catch (err) {
      Auth._setError(err.code === 'auth/email-already-in-use' ? 'Este email já está em uso.' : 'Erro ao criar conta. Tente novamente.');
    } finally { UI.loading(false); }
  },

  async logout() {
    await signOut(auth);
  },

  _showApp(user) {
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('main-content').classList.remove('hidden');
    UI.setUser(user);
    UI.setActiveNav('dashboard');
    UI.showSection('dashboard-section');
    UI.setPageTitle('Dashboard');
  },

  _showAuth() {
    document.getElementById('auth-screen').classList.remove('hidden');
    document.getElementById('main-content').classList.add('hidden');
  },

  _resetUI() {
    State.currentBens  = [];
    State.filteredBens = [];
    State.currentPage  = 1;
    Bens.renderTable();
    Dashboard.update([]);
    if (State.charts.setor)       State.charts.setor.destroy();
    if (State.charts.conservacao) State.charts.conservacao.destroy();
  },

  _setError(msg) { document.getElementById('auth-error').textContent = msg; },
  _clearError()  { document.getElementById('auth-error').textContent = ''; }
};