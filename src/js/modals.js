import { UI } from './ui.js';
import { uploadImage, Detail } from './utils.js';
import { Bens } from './bens.js';
import { State } from './state.js';

export const BemModal = {
  init() {
    const form      = document.getElementById('add-bem-form');
    const openBtn   = document.getElementById('show-add-bem-modal');
    const closeBtn  = document.getElementById('close-add-bem-modal');
    const cancelBtn = document.getElementById('cancel-add-bem');
    const slider    = document.getElementById('bem-estado-conservacao');
    const sliderVal = document.getElementById('conservacao-value');
    const metodo    = document.getElementById('bem-metodo-depreciacao');
    const fatorCont = document.getElementById('container-fator-aceleracao');
    const fotoInput = document.getElementById('bem-foto');

    openBtn.addEventListener('click', () => BemModal.open());
    closeBtn.addEventListener('click', () => BemModal.close());
    cancelBtn.addEventListener('click', () => BemModal.close());

    slider.addEventListener('input', e => { sliderVal.textContent = e.target.value; });

    metodo.addEventListener('change', e => {
      fatorCont.classList.toggle('hidden', e.target.value !== 'acelerada');
    });

    fotoInput.addEventListener('change', e => {
      const file = e.target.files[0];
      const prev = document.getElementById('photo-preview');
      if (file) {
        prev.src = URL.createObjectURL(file);
        prev.classList.remove('hidden');
      }
    });

    const fileField = document.getElementById('foto-drop-zone');
    fileField?.addEventListener('click', () => fotoInput.click());
    fileField?.addEventListener('dragover', e => { e.preventDefault(); fileField.style.borderColor = 'var(--c-accent)'; });
    fileField?.addEventListener('dragleave', () => { fileField.style.borderColor = ''; });
    fileField?.addEventListener('drop', e => {
      e.preventDefault();
      fileField.style.borderColor = '';
      const dt = e.dataTransfer;
      if (dt.files[0]) {
        fotoInput.files = dt.files;
        fotoInput.dispatchEvent(new Event('change'));
      }
    });

    form.addEventListener('submit', e => BemModal.submit(e));
  },

  open(bemToEdit = null) {
    const form = document.getElementById('add-bem-form');
    form.reset();
    document.getElementById('add-bem-error').textContent = '';
    document.getElementById('photo-preview').classList.add('hidden');
    document.getElementById('container-fator-aceleracao').classList.add('hidden');
    
    const motivoContainer = document.getElementById('motivo-alteracao-container');
    const motivoInput = document.getElementById('bem-motivo-alteracao');

    if (bemToEdit) {
      document.getElementById('modal-title').textContent = 'Editar Bem';
      document.getElementById('bem-id').value = bemToEdit.id;
      document.getElementById('bem-foto-existente').value = bemToEdit.fotoUrl || '';
      
      document.getElementById('bem-orgao').value = bemToEdit.orgao || '';
      document.getElementById('bem-setor').value = bemToEdit.setor || '';
      document.getElementById('bem-codigo').value = bemToEdit.codigoBem || '';
      document.getElementById('bem-codigo-anterior').value = bemToEdit.codigoAnterior || '';
      document.getElementById('bem-descricao').value = bemToEdit.descricao || '';
      
      document.getElementById('bem-valor').value = bemToEdit.valor || '';
      document.getElementById('bem-valor-residual').value = bemToEdit.valorResidual || '';
      document.getElementById('bem-vida-util').value = bemToEdit.vidaUtil || '';
      document.getElementById('bem-periodo-utilizacao').value = bemToEdit.periodoUtilizacao || '';
      document.getElementById('bem-metodo-depreciacao').value = bemToEdit.metodoDepreciacao || 'linear';
      
      if(bemToEdit.metodoDepreciacao === 'acelerada') {
        document.getElementById('container-fator-aceleracao').classList.remove('hidden');
        document.getElementById('bem-fator-aceleracao').value = bemToEdit.fatorAceleracao || 1.0;
      }

      document.getElementById('bem-estado-conservacao').value = bemToEdit.estadoConservacao || 5;
      document.getElementById('conservacao-value').textContent = bemToEdit.estadoConservacao || 5;
      document.getElementById('bem-ocioso').checked = bemToEdit.ocioso || false;
      document.getElementById('bem-observacoes').value = bemToEdit.observacoes || '';

      if (bemToEdit.fotoUrl) {
        const prev = document.getElementById('photo-preview');
        prev.src = bemToEdit.fotoUrl;
        prev.classList.remove('hidden');
      }

      motivoContainer.classList.remove('hidden');
      motivoInput.required = true;
    } else {
      document.getElementById('modal-title').textContent = 'Novo Bem';
      document.getElementById('bem-id').value = '';
      document.getElementById('bem-foto-existente').value = '';
      document.getElementById('conservacao-value').textContent = '5';
      
      motivoContainer.classList.add('hidden');
      motivoInput.required = false;
      motivoInput.value = '';
    }

    document.getElementById('add-bem-modal').classList.remove('hidden');
  },

  edit(id) {
    const bem = State.currentBens.find(b => b.id === id);
    if (bem) BemModal.open(bem);
  },

  close() {
    document.getElementById('add-bem-modal').classList.add('hidden');
  },

  async submit(e) {
    e.preventDefault();
    UI.loading(true);
    const errEl = document.getElementById('add-bem-error');
    errEl.textContent = '';
    
    try {
      const id = document.getElementById('bem-id').value;
      const fotoFile = document.getElementById('bem-foto').files[0];
      let fotoUrl = document.getElementById('bem-foto-existente').value;
      
      if (fotoFile) fotoUrl = await uploadImage(fotoFile);

      const data = {
        orgao:             document.getElementById('bem-orgao').value.trim(),
        setor:             document.getElementById('bem-setor').value.trim(),
        codigoBem:         document.getElementById('bem-codigo').value.trim(),
        codigoAnterior:    document.getElementById('bem-codigo-anterior').value.trim(),
        valor:             Number(document.getElementById('bem-valor').value) || 0,
        valorResidual:     Number(document.getElementById('bem-valor-residual').value) || 0,
        descricao:         document.getElementById('bem-descricao').value.trim(),
        vidaUtil:          Number(document.getElementById('bem-vida-util').value) || 0,
        periodoUtilizacao: document.getElementById('bem-periodo-utilizacao').value.trim(),
        metodoDepreciacao: document.getElementById('bem-metodo-depreciacao').value,
        fatorAceleracao:   Number(document.getElementById('bem-fator-aceleracao').value) || 1.0,
        estadoConservacao: Number(document.getElementById('bem-estado-conservacao').value) || 5,
        ocioso:            document.getElementById('bem-ocioso').checked,
        observacoes:       document.getElementById('bem-observacoes').value.trim(),
        fotoUrl
      };

      if (id) {
        const motivo = document.getElementById('bem-motivo-alteracao').value.trim();
        await Bens.update(id, data, motivo);
        UI.toast('Bem atualizado com sucesso!', 'success');
      } else {
        await Bens.add(data);
        UI.toast('Bem cadastrado com sucesso!', 'success');
      }
      
      BemModal.close();
    } catch (err) {
      errEl.textContent = err.message || 'Falha ao salvar o bem.';
    } finally { UI.loading(false); }
  },

  view(id) {
    const bem = State.currentBens.find(b => b.id === id);
    if (!bem) return;
    
    UI.loading(true);
    try {
      // Histórico é puxado diretamente do documento (Rápido e não exige nova permissão)
      const historico = bem.historico || [];

      const container = document.getElementById('view-bem-content');
      container.innerHTML = Detail.buildHTML(bem, historico, false, false, id);
      document.getElementById('view-bem-modal').classList.remove('hidden');

      const publicUrl = `${location.origin}${location.pathname}?view=public&userId=${State.currentUser.uid}&bemId=${id}`;
      
      const qrContainer = document.getElementById('qrcode-view');
      if(qrContainer) {
          qrContainer.innerHTML = '';
          new QRCode(qrContainer, { text: publicUrl, width: 120, height: 120 });
      }

      const closeBtn = document.getElementById('close-view-modal');
      if(closeBtn) closeBtn.addEventListener('click', () => document.getElementById('view-bem-modal').classList.add('hidden'));
      
      const printBtn = document.getElementById('print-label-btn');
      if(printBtn) printBtn.addEventListener('click', () => BemModal.printLabel(id, publicUrl));

    } catch(err) {
      console.error(err);
      UI.toast(`Erro interno: ${err.message}`); 
    } finally {
      UI.loading(false);
    }
  },

  printLabel(id, publicUrl) {
    const bem = State.currentBens.find(b => b.id === id);
    if(!bem) return;
    
    const printArea = document.getElementById('print-area');
    printArea.innerHTML = `
      <div class="print-label">
        <div class="print-label-qr" id="print-qr"></div>
        <div class="print-label-info">
          <h2>${bem.codigoBem}</h2>
          <p>${bem.descricao}</p>
          <p>${bem.orgao} / ${bem.setor}</p>
        </div>
      </div>
    `;
    
    new QRCode(document.getElementById('print-qr'), { text: publicUrl, width: 120, height: 120 });
    
    setTimeout(() => {
      window.print();
    }, 400);
  }
};