import { CFG, db, analytics } from './config.js';
import { getDoc, doc, getDocs, collection } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { logEvent } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-analytics.js";
import { UI } from './ui.js';

export async function uploadImage(file) {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('upload_preset', CFG.cloudinaryPreset);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CFG.cloudinaryCloud}/image/upload`, { method: 'POST', body: fd });
  if (!res.ok) throw new Error('Falha no upload da imagem.');
  return (await res.json()).secure_url;
}

export const Depreciation = {
  calculate(bem) {
    const vAqui    = bem.valor || 0;
    const vResid   = bem.valorResidual || 0;
    const vidaUtil = bem.vidaUtil || 0;
    const vDeprec  = vAqui - vResid;

    if (vidaUtil <= 0 || vDeprec < 0) {
      const rows = Array.from({ length: vidaUtil + 1 }, (_, i) => ({ ano: i, depreciacaoAno: 0, valorContabil: vAqui }));
      return { rows, depreciacaoAnoCorrente: 0, valorContabilAtual: vAqui };
    }

    let rows = [];
    switch (bem.metodoDepreciacao) {
      case 'soma_digitos': {
        const soma = (vidaUtil * (vidaUtil + 1)) / 2;
        let acum = 0;
        for (let i = 1; i <= vidaUtil; i++) {
          const dep = ((vidaUtil - i + 1) / soma) * vDeprec;
          acum += dep;
          rows.push({ ano: i, depreciacaoAno: dep, valorContabil: vAqui - acum });
        }
        break;
      }
      case 'acelerada': {
        const fator = bem.fatorAceleracao || 1;
        const taxa  = (1 / vidaUtil) * fator;
        let acum = 0;
        for (let i = 1; i <= vidaUtil; i++) {
          let dep = taxa * vDeprec;
          if (acum + dep > vDeprec) dep = vDeprec - acum;
          acum += dep;
          rows.push({ ano: i, depreciacaoAno: dep, valorContabil: vAqui - acum });
          if (acum >= vDeprec) break;
        }
        break;
      }
      default: {
        const depAnual = vDeprec / vidaUtil;
        let acum = 0;
        for (let i = 1; i <= vidaUtil; i++) {
          acum += depAnual;
          rows.push({ ano: i, depreciacaoAno: depAnual, valorContabil: vAqui - acum });
        }
      }
    }

    while (rows.length < vidaUtil) {
      rows.push({ ano: rows.length + 1, depreciacaoAno: 0, valorContabil: vResid });
    }
    rows.unshift({ ano: 0, depreciacaoAno: 0, valorContabil: vAqui });

    const dtAqui = bem.criadoEm?.toDate ? bem.criadoEm.toDate() : new Date();
    const anosPassados = new Date().getFullYear() - dtAqui.getFullYear();
    let valorContabilAtual = vAqui;
    let depreciacaoAnoCorrente = 0;

    if (anosPassados > 0 && anosPassados <= vidaUtil) {
      valorContabilAtual      = rows[anosPassados].valorContabil;
      depreciacaoAnoCorrente  = rows[anosPassados].depreciacaoAno;
    } else if (anosPassados > vidaUtil) {
      valorContabilAtual = vResid;
    }

    return { rows, depreciacaoAnoCorrente, valorContabilAtual };
  }
};

export const Detail = {
  buildHTML(bem, historico = [], isPdf = false, isPublic = false, bemId = '') {
    const fmt  = v => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const dtAqui = bem.criadoEm?.toDate ? bem.criadoEm.toDate() : new Date();
    const { rows, depreciacaoAnoCorrente, valorContabilAtual } = Depreciation.calculate(bem);
    const anoAtual = new Date().getFullYear();

    const metodoLabel = { linear: 'Linear', soma_digitos: 'Soma dos Dígitos', acelerada: `Acelerada (${bem.fatorAceleracao}x)` };
    const nomeMetodo  = metodoLabel[bem.metodoDepreciacao] || 'Linear';
    const fotoSrc = bem.fotoUrl || 'https://placehold.co/400x240/f0f2f7/9ba5b8?text=Sem+foto';

    const tabelaRows = rows.map(r => `
      <tr>
        <td>${r.ano === 0 ? `Aquisição (${dtAqui.getFullYear()})` : `Ano ${r.ano}`}</td>
        <td style="text-align:right">${fmt(r.depreciacaoAno)}</td>
        <td style="text-align:right;font-weight:600">${fmt(r.valorContabil)}</td>
      </tr>`).join('');

    const closeBtn = (!isPdf && !isPublic)
      ? `<button id="close-view-modal" class="btn btn-ghost btn-icon" style="font-size:20px;">&times;</button>` : '';
      
    const printBtn = (!isPdf && !isPublic)
      ? `<button id="print-label-btn" class="btn btn-secondary btn-sm"><i class="fas fa-print"></i> Etiqueta</button>` : '';

    // HTML do Histórico
    const histHtml = historico.map(h => {
      const date = h.data?.toDate ? h.data.toDate().toLocaleString('pt-BR') : 'Data desconhecida';
      const diffs = (h.alteracoes || []).map(d => `
        <div class="timeline-diff">
          <span class="diff-field">${d.campo}:</span>
          <span class="diff-old">${d.de || 'Vazio'}</span> <i class="fas fa-arrow-right" style="font-size:10px;color:var(--c-text-3)"></i> <span class="diff-new">${d.para || 'Vazio'}</span>
        </div>
      `).join('');
      
      return `
        <div class="timeline-item">
          <p class="timeline-date">${date}</p>
          <p class="timeline-user"><i class="fas fa-user-edit" style="margin-right:4px;"></i> ${h.usuarioNome}</p>
          <p class="timeline-reason">Motivo: ${h.motivo}</p>
          ${diffs ? `<div class="timeline-diffs">${diffs}</div>` : ''}
        </div>
      `;
    }).join('');

    return `
      <div class="detail-card fade-in" id="pdf-content">
        <div class="detail-header">
          <div class="detail-header__brand">
            <div class="detail-header__brand-icon"><i class="fas fa-barcode"></i></div>
            <span class="detail-header__brand-name">LogosTrack</span>
          </div>
          <div style="display:flex;align-items:center;gap:12px;">
            ${printBtn}
            <span class="badge ${bem.ocioso ? 'badge--idle' : 'badge--active'}" style="font-size:13px;">
              ${bem.ocioso ? 'Ocioso' : 'Em uso'}
            </span>
            ${closeBtn}
          </div>
        </div>
        <div class="detail-body">
          <div class="detail-section">
            <p class="detail-section__title">Identificação</p>
            <div class="detail-fields">
              <div><p class="detail-field__label">Código (Plaqueta)</p><p class="detail-field__value"><span class="td-mono">${bem.codigoBem}</span></p></div>
              ${bem.codigoAnterior ? `<div><p class="detail-field__label">Código Anterior</p><p class="detail-field__value">${bem.codigoAnterior}</p></div>` : ''}
              <div style="grid-column:1/-1"><p class="detail-field__label">Descrição</p><p class="detail-field__value" style="font-size:17px;">${bem.descricao}</p></div>
              <div><p class="detail-field__label">Órgão</p><p class="detail-field__value">${bem.orgao}</p></div>
              <div><p class="detail-field__label">Setor</p><p class="detail-field__value">${bem.setor}</p></div>
              <div><p class="detail-field__label">Estado de Conservação</p><p class="detail-field__value">${bem.estadoConservacao}/10</p></div>
              <div><p class="detail-field__label">Cadastrado em</p><p class="detail-field__value">${dtAqui.toLocaleDateString('pt-BR')}</p></div>
            </div>
            ${bem.observacoes ? `<div style="margin-top:16px;"><p class="detail-field__label">Observações</p><p style="font-size:14px;color:var(--c-text-2);margin-top:4px;">${bem.observacoes}</p></div>` : ''}
          </div>

          <div class="detail-section">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid var(--c-border)">
              <p class="detail-section__title" style="margin:0;border:none;padding:0">Análise de Depreciação</p>
              <span class="method-tag">${nomeMetodo}</span>
            </div>
            <div class="depr-summary">
              <div class="depr-box"><p class="depr-box__label">Valor de Aquisição</p><p class="depr-box__value">${fmt(bem.valor)}</p></div>
              <div class="depr-box"><p class="depr-box__label">Valor Residual</p><p class="depr-box__value">${fmt(bem.valorResidual)}</p></div>
              <div class="depr-box"><p class="depr-box__label">Vida Útil</p><p class="depr-box__value">${bem.vidaUtil} anos</p></div>
              <div class="depr-box depr-box--highlight"><p class="depr-box__label">Depreciação ${anoAtual}</p><p class="depr-box__value">${fmt(depreciacaoAnoCorrente)}</p></div>
              <div class="depr-box depr-box--success"><p class="depr-box__label">Valor Contábil Atual</p><p class="depr-box__value">${fmt(valorContabilAtual)}</p></div>
            </div>
          </div>

          <div class="detail-section">
            <p class="detail-section__title">Foto & QR Code</p>
            <div class="detail-media">
              <div class="detail-photo"><img src="${fotoSrc}" alt="Foto do bem" crossorigin="anonymous"></div>
              <div class="detail-qr">
                <div class="detail-qr__box" id="qrcode-view"></div>
                <p class="detail-qr__label">Escaneie para ver<br>esta ficha online</p>
              </div>
            </div>
          </div>

          <!-- NOVA SEÇÃO DE HISTÓRICO -->
          <div class="detail-section" style="margin-top: 32px;">
            <p class="detail-section__title">Histórico de Alterações</p>
            ${historico.length > 0 ? `<div class="timeline">${histHtml}</div>` : `<p style="font-size:13px; color:var(--c-text-3)">Nenhuma alteração registrada.</p>`}
          </div>

        </div>
        <div style="padding:16px 32px;border-top:1px solid var(--c-border);">
          <p style="font-size:12px;color:var(--c-text-3);">Ficha gerada em ${new Date().toLocaleString('pt-BR')} · LogosTrack</p>
        </div>
      </div>`;
  }
};

export const CSV = {
  async export(userUid) {
    UI.loading(true);
    try {
      const snap = await getDocs(collection(db, `artifacts/${CFG.appId}/users/${userUid}/patrimonios`));
      const bens = snap.docs.map(d => d.data());
      if (!bens.length) { UI.toast('Nenhum bem para exportar.'); return; }

      const headers = ['codigoBem','descricao','orgao','setor','valor','valorResidual',
                       'vidaUtil','periodoUtilizacao','metodoDepreciacao','estadoConservacao','ocioso','observacoes'];
      const rows = bens.map(b => headers.map(h => `"${String(b[h] ?? '')}"`).join(','));
      const csv  = [headers.join(','), ...rows].join('\n');

      const a  = document.createElement('a');
      a.href   = 'data:text/csv;charset=utf-8,' + encodeURI(csv);
      a.download = `logostrack_${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      logEvent(analytics, 'export_csv');
    } finally { UI.loading(false); }
  }
};

export const PublicView = {
  async handle(userId, bemId) {
    document.getElementById('app-root').classList.add('hidden');
    const page = document.getElementById('public-view-page');
    const card = document.getElementById('public-bem-card');
    page.classList.remove('hidden');
    card.innerHTML = `<div class="empty-state"><p style="color:var(--c-text)">Carregando ficha do patrimônio...</p></div>`;

    try {
      const docRef = doc(db, `artifacts/${CFG.appId}/users/${userId}/patrimonios`, bemId);
      const snap = await getDoc(docRef);
      
      if (snap.exists()) {
        const bemData = snap.data();
        const historico = bemData.historico || [];
        
        // Renderiza a ficha (Enviando isPdf=false e isPublic=true)
        card.innerHTML = Detail.buildHTML(bemData, historico, false, true, bemId);
        
        // Renderiza o QR Code novamente para a visualização pública
        const qrContainer = document.getElementById('qrcode-view');
        if(qrContainer) {
          qrContainer.innerHTML = '';
          new QRCode(qrContainer, { text: location.href, width: 120, height: 120 });
        }
      } else {
        card.innerHTML = `<div class="empty-state"><div class="empty-state__icon"><i class="fas fa-ban"></i></div><p class="empty-state__title">Ficha não encontrada</p><p class="empty-state__desc">Este bem não existe ou foi excluído.</p></div>`;
      }
    } catch (err) {
      console.error("Erro na página pública:", err);
      // Se der erro de permissão ou qualquer outro, agora vai mostrar na tela com detalhes
      card.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon" style="color: var(--c-danger);"><i class="fas fa-exclamation-triangle"></i></div>
          <p class="empty-state__title">Erro ao carregar dados</p>
          <p class="empty-state__desc">Não foi possível carregar os detalhes deste patrimônio.</p>
          <code style="margin-top:16px; font-size:11px; background:#f0f0f0; padding:8px; border-radius:4px; color:#d93025; word-break: break-all;">${err.message}</code>
        </div>`;
    }
  }
};