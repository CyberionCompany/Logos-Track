import { State } from './state.js';

export const UI = {
  _toastTimer: null,

  toast(msg, type = 'error') {
    const el  = document.getElementById('toast-notification');
    const txt = document.getElementById('toast-message');
    txt.textContent = msg;
    el.className = '';
    el.classList.add(type === 'success' ? 'toast--success' : 'toast--error');
    el.classList.remove('hidden', 'opacity-0');
    clearTimeout(UI._toastTimer);
    UI._toastTimer = setTimeout(() => {
      el.classList.add('opacity-0');
      setTimeout(() => el.classList.add('hidden'), 400);
    }, 3200);
  },

  loading(on) {
    document.getElementById('loading-spinner').classList.toggle('hidden', !on);
  },

  confirm(title, body) {
    return new Promise(resolve => {
      document.getElementById('confirm-modal-title').textContent = title;
      document.getElementById('confirm-modal-body').textContent  = body;
      const modal = document.getElementById('confirm-modal');
      modal.classList.remove('hidden');
      document.getElementById('confirm-modal-cancel').onclick = () => { modal.classList.add('hidden'); resolve(false); };
      document.getElementById('confirm-modal-ok').onclick    = () => { modal.classList.add('hidden'); resolve(true); };
    });
  },

  setActiveNav(id) {
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    const el = document.querySelector(`.nav-item[data-nav="${id}"]`);
    if (el) el.classList.add('active');
  },

  setPageTitle(title) {
    const el = document.getElementById('topbar-title');
    if (el) el.textContent = title;
  },

  showSection(id) {
    ['dashboard-section', 'bens-section'].forEach(s => {
      document.getElementById(s).classList.add('hidden');
    });
    document.getElementById(id).classList.remove('hidden');
  },

  setUser(user) {
    const email = user.displayName || user.email || '';
    const initials = email.slice(0, 2).toUpperCase();
    const avatarEl = document.getElementById('sidebar-avatar');
    const nameEl   = document.getElementById('sidebar-username');
    const emailEl  = document.getElementById('sidebar-email');
    if (avatarEl) avatarEl.textContent = initials;
    if (nameEl)   nameEl.textContent   = user.displayName || 'Usuário';
    if (emailEl)  emailEl.textContent  = user.email || '';
  }
};

export const Theme = {
  init() {
    const stored = localStorage.getItem('color-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const useDark = stored === 'dark' || (!stored && prefersDark);
    document.documentElement.classList.toggle('dark', useDark);
    Theme._updateIcon(useDark);
  },

  toggle(updateChartCallback) {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('color-theme', isDark ? 'dark' : 'light');
    Theme._updateIcon(isDark);
    if(updateChartCallback) updateChartCallback();
  },

  _updateIcon(isDark) {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;
    btn.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    btn.title = isDark ? 'Modo claro' : 'Modo escuro';
  }
};

export const Sidebar = {
  init() {
    const sidebar   = document.getElementById('sidebar');
    const collapseBtn = document.getElementById('sidebar-collapse');
    const mobileBtn   = document.getElementById('mobile-menu-btn');
    const overlay     = document.getElementById('mobile-overlay');

    collapseBtn?.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
      localStorage.setItem('sidebar-collapsed', sidebar.classList.contains('collapsed'));
    });

    if (localStorage.getItem('sidebar-collapsed') === 'true') {
      sidebar.classList.add('collapsed');
    }

    mobileBtn?.addEventListener('click', () => {
      sidebar.classList.add('mobile-open');
      overlay.classList.add('active');
    });

    overlay?.addEventListener('click', () => {
      sidebar.classList.remove('mobile-open');
      overlay.classList.remove('active');
    });

    document.querySelectorAll('.nav-item[data-nav]').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.nav;
        Sidebar._navigate(target);
        sidebar.classList.remove('mobile-open');
        overlay.classList.remove('active');
      });
    });
  },

  _navigate(target) {
    UI.setActiveNav(target);
    if (target === 'dashboard') {
      UI.showSection('dashboard-section');
      UI.setPageTitle('Dashboard');
    } else if (target === 'bens') {
      UI.showSection('bens-section');
      UI.setPageTitle('Gerenciamento de Patrimônio');
    }
  }
};