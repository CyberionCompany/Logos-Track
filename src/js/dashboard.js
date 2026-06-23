import { State } from './state.js';

export const Dashboard = {
  update(bens) {
    const fmt = v => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const total      = bens.length;
    const valorTotal = bens.reduce((a, b) => a + (b.valor || 0), 0);
    const ociosos    = bens.filter(b => b.ocioso);
    const valorRisco = ociosos.reduce((a, b) => a + (b.valor || 0), 0);
    const setores    = [...new Set(bens.map(b => b.setor))];
    const conservSum = bens.reduce((a, b) => a + (b.estadoConservacao || 0), 0);
    const conservMedia = total > 0 ? (conservSum / total).toFixed(1) : 0;

    Dashboard._set('valor-total',      fmt(valorTotal));
    Dashboard._set('valor-risco',      fmt(valorRisco));
    Dashboard._set('total-bens',       total);
    Dashboard._set('bens-ociosos',     ociosos.length);
    Dashboard._set('conservacao-media', `${conservMedia}/10`);
    Dashboard._set('total-setores',    setores.length);

    Dashboard._updateCharts(bens, setores);
  },

  _set(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  },

  _updateCharts(bens, setores) {
    const dark      = document.documentElement.classList.contains('dark');
    const textColor = dark ? 'rgba(255,255,255,.8)'  : 'rgba(13,15,20,.7)';
    const gridColor = dark ? 'rgba(255,255,255,.08)' : 'rgba(13,15,20,.06)';
    
    if (typeof Chart !== 'undefined') {
        Chart.defaults.color = textColor;
    }

    const palette = ['#4F46E5','#10B981','#F59E0B','#EC4899','#6366F1','#14B8A6'];

    const setorCtx  = document.getElementById('bensPorSetorChart')?.getContext('2d');
    const setorData = setores.map(s => bens.filter(b => b.setor === s).length);
    if (State.charts.setor) State.charts.setor.destroy();
    if (setorCtx && typeof Chart !== 'undefined') {
      State.charts.setor = new Chart(setorCtx, {
        type: 'doughnut',
        data: {
          labels: setores,
          datasets: [{ data: setorData, backgroundColor: palette, borderColor: dark ? '#161B27' : '#fff', borderWidth: 3, hoverOffset: 6 }]
        },
        options: {
          responsive: true, maintainAspectRatio: false, cutout: '65%',
          plugins: { legend: { position: 'right', labels: { color: textColor, padding: 14, font: { size: 12 } } } }
        }
      });
    }

    const consCtx   = document.getElementById('bensPorConservacaoChart')?.getContext('2d');
    const consLabels = Array.from({ length: 10 }, (_, i) => i + 1);
    const consData   = consLabels.map(n => bens.filter(b => b.estadoConservacao === n).length);
    if (State.charts.conservacao) State.charts.conservacao.destroy();
    if (consCtx && typeof Chart !== 'undefined') {
      State.charts.conservacao = new Chart(consCtx, {
        type: 'bar',
        data: {
          labels: consLabels.map(n => `${n}`),
          datasets: [{
            label: 'Bens',
            data: consData,
            backgroundColor: consLabels.map(n =>
              n <= 3 ? 'rgba(220,38,38,.75)' : n <= 6 ? 'rgba(245,158,11,.75)' : 'rgba(16,185,129,.75)'
            ),
            borderRadius: 5, borderSkipped: false
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, grid: { color: gridColor }, ticks: { color: textColor, stepSize: 1 } },
            x: { grid: { display: false }, ticks: { color: textColor } }
          }
        }
      });
    }
  }
};