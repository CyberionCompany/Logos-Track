import { CFG, db, analytics } from './config.js';
import { collection, addDoc, doc, deleteDoc, onSnapshot, Timestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { logEvent } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-analytics.js";
import { State } from './state.js';
import { UI } from './ui.js';
import { Dashboard } from './dashboard.js';
import { PDF } from './pdf.js';
import { BemModal } from './modals.js';

export const Bens = {
  _collRef() {
    if (!State.currentUser) return null;
    return collection(db, `artifacts/${CFG.appId}/users/${State.currentUser.uid}/patrimonios`);
  },

  load() {
    const ref = Bens._collRef();
    if (!ref) return;
    if (State.bensUnsub) State.bensUnsub();
    State.bensUnsub = onSnapshot(ref, snap => {
      State.currentBens = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      Bens.applyFilters();
      Dashboard.update(State.currentBens);
    });
  },

  async add(data) {
    const ref = Bens._collRef();
    if (!ref) throw new Error('Não autenticado.');
    await addDoc(ref, { ...data, criadoPor: State.currentUser.uid, criadoEm: Timestamp.fromDate(new Date()) });
    logEvent(analytics, 'add_bem', { setor: data.setor, valor: data.valor });
  },

  async remove(id) {
    await deleteDoc(doc(db, `artifacts/${CFG.appId}/users/${State.currentUser.uid}/patrimonios`, id));
  },

  applyFilters() {
    const term   = (document.getElementById('search-input')?.value || '').toLowerCase();
    const setor  = document.getElementById('setor-filter')?.value || '';

    State.filteredBens = State.currentBens.filter(b => {
      const matchSearch = b.codigoBem.toLowerCase().includes(term) || b.descricao.toLowerCase().includes(term);
      const matchSetor  = setor ? b.setor === setor : true;
      return matchSearch && matchSetor;
    });

    Bens._populateSetorFilter();
    Bens.renderTable();
  },

  _populateSetorFilter() {
    const sel = document.getElementById('setor-filter');
    if (!sel) return;
    const current = sel.value;
    const setores = [...new Set(State.currentBens.map(b => b.setor))];
    sel.innerHTML = '<option value="">Todos os setores</option>';
    setores.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s; opt.textContent = s;
      if (s === current) opt.selected = true;
      sel.appendChild(opt);
    });
  },

  renderTable() {
    const tbody = document.getElementById('bens-table-body');
    if (!tbody) return;

    const total      = State.filteredBens.length;
    const totalPages = Math.max(1, Math.ceil(total / CFG.itemsPerPage));
    if (State.currentPage > totalPages) State.currentPage = 1;

    const start   = (State.currentPage - 1) * CFG.itemsPerPage;
    const slice   = State.filteredBens.slice(start, start + CFG.itemsPerPage);

    const info = document.getElementById('page-info');
    if (info) info.textContent = `Página ${State.currentPage} de ${totalPages}`;

    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    if (prevBtn) prevBtn.disabled = State.currentPage === 1;
    if (nextBtn) nextBtn.disabled = State.currentPage >= totalPages;

    if (slice.length === 0) {
      tbody.innerHTML = `
        <tr><td colspan="7">
          <div class="empty-state">
            <div class="empty-state__icon"><i class="fas fa-inbox"></i></div>
            <p class="empty-state__title">Nenhum bem encontrado</p>
            <p class="empty-state__desc">Ajuste os filtros ou adicione um novo bem.</p>
          </div>
        </td></tr>`;
      return;
    }

    tbody.innerHTML = slice.map(bem => `
      <tr>
        <td><span class="td-mono">${bem.codigoBem}</span></td>
        <td class="td-main">${bem.descricao}</td>
        <td>${bem.setor}</td>
        <td>${bem.orgao}</td>
        <td>
          <div style="display:flex;align-items:center;gap:8px;">
            <div style="flex:1;height:5px;background:var(--c-border);border-radius:99px;min-width:60px;">
              <div style="height:100%;width:${bem.estadoConservacao * 10}%;background:var(--c-accent);border-radius:99px;"></div>
            </div>
            <span style="font-size:12px;font-weight:600;color:var(--c-text-2)">${bem.estadoConservacao}/10</span>
          </div>
        </td>
        <td>
          <span class="badge ${bem.ocioso ? 'badge--idle' : 'badge--active'}">
            ${bem.ocioso ? 'Ocioso' : 'Em uso'}
          </span>
        </td>
        <td>
          <div class="row-actions">
            <button class="action-btn action-btn--view" data-id="${bem.id}" title="Visualizar ficha"><i class="fas fa-eye"></i></button>
            <button class="action-btn action-btn--pdf"  data-id="${bem.id}" title="Gerar PDF"><i class="fas fa-file-pdf"></i></button>
            <button class="action-btn action-btn--delete" data-id="${bem.id}" title="Excluir"><i class="fas fa-trash"></i></button>
          </div>
        </td>
      </tr>`).join('');

    tbody.querySelectorAll('.action-btn--view').forEach(btn =>
      btn.addEventListener('click', e => BemModal.view(e.currentTarget.dataset.id)));
    tbody.querySelectorAll('.action-btn--pdf').forEach(btn =>
      btn.addEventListener('click', e => PDF.generate(e.currentTarget.dataset.id)));
    tbody.querySelectorAll('.action-btn--delete').forEach(btn =>
      btn.addEventListener('click', e => Bens.confirmDelete(e.currentTarget.dataset.id)));
  },

  async confirmDelete(id) {
    const ok = await UI.confirm('Excluir bem', 'Esta ação é irreversível. Deseja continuar?');
    if (!ok) return;
    UI.loading(true);
    try {
      await Bens.remove(id);
      UI.toast('Bem excluído com sucesso.', 'success');
    } catch {
      UI.toast('Não foi possível excluir o bem.');
    } finally { UI.loading(false); }
  }
};