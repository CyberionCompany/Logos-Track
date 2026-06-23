import { State } from './state.js';
import { Theme, Sidebar } from './ui.js';
import { Auth } from './auth.js';
import { BemModal } from './modals.js';
import { PublicView, CSV } from './utils.js';
import { Bens } from './bens.js';
import { Dashboard } from './dashboard.js';

const App = {
  init() {
    Theme.init();

    const params = new URLSearchParams(location.search);
    if (params.get('view') === 'public' && params.get('userId') && params.get('bemId')) {
      PublicView.handle(params.get('userId'), params.get('bemId'));
      return;
    }

    document.getElementById('public-view-page').classList.add('hidden');
    document.getElementById('app-root').classList.remove('hidden');

    Sidebar.init();
    Auth.init();
    BemModal.init();

    document.getElementById('theme-toggle').addEventListener('click', () => {
      Theme.toggle(() => Dashboard.update(State.currentBens));
    });

    document.getElementById('search-input')?.addEventListener('input', () => { State.currentPage = 1; Bens.applyFilters(); });
    document.getElementById('setor-filter')?.addEventListener('change', () => { State.currentPage = 1; Bens.applyFilters(); });
    
    document.getElementById('prev-page')?.addEventListener('click', () => { 
      if (State.currentPage > 1) { State.currentPage--; Bens.renderTable(); } 
    });
    
    document.getElementById('next-page')?.addEventListener('click', () => {
      const total = Math.ceil(State.filteredBens.length / 10);
      if (State.currentPage < total) { State.currentPage++; Bens.renderTable(); }
    });

    document.getElementById('export-csv-button')?.addEventListener('click', () => {
      if(State.currentUser) CSV.export(State.currentUser.uid);
    });
  }
};

window.addEventListener('DOMContentLoaded', () => App.init());