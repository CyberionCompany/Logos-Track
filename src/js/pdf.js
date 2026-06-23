import { State } from './state.js';
import { UI } from './ui.js';
import { Detail } from './utils.js';

export const PDF = {
  async generate(id) {
    const bem = State.currentBens.find(b => b.id === id);
    if (!bem) return;

    UI.loading(true);
    try {
      // Pega o histórico diretamente do documento, ignorando bloqueios do DB
      const historico = bem.historico || [];

      // Prepara o tema para garantir fundo branco no PDF
      const wasDark = document.documentElement.classList.contains('dark');
      if (wasDark) document.documentElement.classList.remove('dark');

      // Cria um container otimizado (Fixed ao invés de absolute evita cortes no print)
      const wrap = document.createElement('div');
      wrap.style.cssText = 'position:fixed; top:0; left:0; width:860px; z-index:-9999; opacity:0; pointer-events:none; background:#ffffff; color:#000000; padding:20px;';
      
      // Passamos isPdf = true e isPublic = false
      wrap.innerHTML = Detail.buildHTML(bem, historico, true, false, id);
      document.body.appendChild(wrap);

      // Gera o QR Code na ficha do PDF
      const qrContainer = wrap.querySelector('#qrcode-view');
      if (qrContainer) {
        const publicUrl = `${location.origin}${location.pathname}?view=public&userId=${State.currentUser.uid}&bemId=${id}`;
        new QRCode(qrContainer, { text: publicUrl, width: 120, height: 120 });
      }

      // CRÍTICO: Força o navegador a esperar todas as imagens carregarem antes da captura
      const imgs = Array.from(wrap.querySelectorAll('img'));
      await Promise.all(imgs.map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise(resolve => {
          img.onload = resolve;
          img.onerror = resolve; // Resolve mesmo se falhar para não travar o loop
        });
      }));

      // Tempo de buffer para o QRCode processar
      await new Promise(r => setTimeout(r, 600));

      // Gera o Canvas e o PDF
      const canvas = await html2canvas(wrap, { 
        scale: 2, 
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jspdf.jsPDF({ orientation: 'portrait', unit: 'px', format: [canvas.width, canvas.height] });
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`Ficha_${bem.codigoBem}.pdf`);

      // Limpa o DOM
      document.body.removeChild(wrap);
      if (wasDark) document.documentElement.classList.add('dark');

    } catch (error) {
      console.error("Erro na geração do PDF:", error);
      UI.toast('Erro ao gerar PDF. Tente novamente.');
    } finally {
      UI.loading(false);
    }
  }
};