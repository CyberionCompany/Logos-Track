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

  open() {
    document.getElementById('add-bem-form').reset();
    document.getElementById('add-bem-error').textContent = '';
    document.getElementById('photo-preview').classList.add('hidden');
    document.getElementById('conservacao-value').textContent = '5';
    document.getElementById('container-fator-aceleracao').classList.add('hidden');
    document.getElementById('modal-title').textContent = 'Novo Bem';
    document.getElementById('add-bem-modal').classList.remove('hidden');
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
      const fotoFile = document.getElementById('bem-foto').files[0];
      let fotoUrl = '';
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

      await Bens.add(data);
      BemModal.close();
    } catch (err) {
      errEl.textContent = err.message || 'Falha ao salvar o bem.';
    } finally { UI.loading(false); }
  },

  view(id) {
    const bem = State.currentBens.find(b => b.id === id);
    if (!bem) return;
    const container = document.getElementById('view-bem-content');
    container.innerHTML = Detail.buildHTML(bem, false, false, id);
    document.getElementById('view-bem-modal').classList.remove('hidden');

    const publicUrl = `${location.origin}${location.pathname}?view=public&userId=${State.currentUser.uid}&bemId=${id}`;
    new QRCode(document.getElementById('qrcode-view'), { text: publicUrl, width: 120, height: 120 });

    document.getElementById('close-view-modal').addEventListener('click', () =>
      document.getElementById('view-bem-modal').classList.add('hidden'));
  }
};