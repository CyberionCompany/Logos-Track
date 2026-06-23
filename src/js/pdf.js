import { State } from './state.js';
import { UI } from './ui.js';
import { Detail } from './utils.js';

export const PDF = {
  async generate(id) {
    const bem = State.currentBens.find(b => b.id === id);
    if (!bem) return;

    UI.loading(true);
    const wasDark = document.documentElement.classList.contains('dark');
    if (wasDark) document.documentElement.classList.remove('dark');

    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:absolute;left:-9999px;width:860px;';
    wrap.innerHTML = Detail.buildHTML(bem, true, false, id);
    document.body.appendChild(wrap);

    const publicUrl = `${location.origin}${location.pathname}?view=public&userId=${State.currentUser.uid}&bemId=${id}`;
    new QRCode(wrap.querySelector('#qrcode-view'), { text: publicUrl, width: 120, height: 120 });

    await new Promise(r => setTimeout(r, 350));

    try {
      const canvas  = await html2canvas(wrap, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf     = new jspdf.jsPDF({ orientation: 'portrait', unit: 'px', format: [canvas.width, canvas.height] });
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`Ficha_${bem.codigoBem}.pdf`);
    } catch {
      UI.toast('Não foi possível gerar o PDF.');
    } finally {
      document.body.removeChild(wrap);
      if (wasDark) document.documentElement.classList.add('dark');
      UI.loading(false);
    }
  }
};