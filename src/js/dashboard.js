import { State } from './state.js';

export const Dashboard = {
  update(bens) {
    const fmt = v => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const total      = bens.length;
    const valorTotal = bens.reduce((a, b) => a + (b.valor || 0), 0);
    const ociosos    = bens.filter(b => b.ocioso);
    const ativos     = total - ociosos.length;
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

    Dashboard._updateCharts(bens, setores, ativos, ociosos.length);
    Dashboard._updateUltimosBens(bens);
  },

  _set(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  },

  _updateCharts(bens, setores, ativos, ociosos) {
    const dark      = document.documentElement.classList.contains('dark');
    const textColor = dark ? 'rgba(255,255,255,.8)'  : 'rgba(13,15,20,.7)';
    const gridColor = dark ? 'rgba(255,255,255,.08)' : 'rgba(13,15,20,.06)';
    
    if (typeof Chart !== 'undefined') {
        Chart.defaults.color = textColor;
    }

    const palette = ['#4F46E5','#10B981','#F59E0B','#EC4899','#6366F1','#14B8A6', '#8B5CF6'];

    // 1. Gráfico de Evolução (Linha)
    const evoCtx = document.getElementById('evolucaoChart')?.getContext('2d');
    if (State.charts.evolucao) State.charts.evolucao.destroy();
    
    // Calcula os bens criados nos últimos meses
    const mesesLabel = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const cadastrosPorMes = new Array(12).fill(0);
    bens.forEach(b => {
      if (b.criadoEm && b.criadoEm.toDate) {
        const mes = b.criadoEm.toDate().getMonth();
        cadastrosPorMes[mes]++;
      }
    });

    if (evoCtx && typeof Chart !== 'undefined') {
      State.charts.evolucao = new Chart(evoCtx, {
        type: 'line',
        data: {
          labels: mesesLabel,
          datasets: [{
            label: 'Novos Cadastros',
            data: cadastrosPorMes,
            borderColor: '#4F46E5',
            backgroundColor: 'rgba(79, 70, 229, 0.1)',
            borderWidth: 3,
            fill: true,
            tension: 0.4
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, grid: { color: gridColor }, ticks: { stepSize: 1 } },
            x: { grid: { display: false } }
          }
        }
      });
    }

    // 2. Gráfico de Status (Doughnut)
    const statusCtx = document.getElementById('statusChart')?.getContext('2d');
    if (State.charts.status) State.charts.status.destroy();
    if (statusCtx && typeof Chart !== 'undefined') {
      State.charts.status = new Chart(statusCtx, {
        type: 'doughnut',
        data: {
          labels: ['Ativos', 'Ociosos / Inativos'],
          datasets: [{
            data: [ativos, ociosos],
            backgroundColor: ['#10B981', '#F59E0B'],
            borderColor: dark ? '#161B27' : '#fff',
            borderWidth: 3,
            hoverOffset: 4
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false, cutout: '70%',
          plugins: { legend: { position: 'bottom', labels: { padding: 10 } } }
        }
      });
    }

    // 3. Gráfico por Setor (Doughnut)
    const setorCtx  = document.getElementById('bensPorSetorChart')?.getContext('2d');
    const setorData = setores.map(s => bens.filter(b => b.setor === s).length);
    if (State.charts.setor) State.charts.setor.destroy();
    if (setorCtx && typeof Chart !== 'undefined') {
      State.charts.setor = new Chart(setorCtx, {
        type: 'doughnut',
        data: {
          labels: setores,
          datasets: [{ data: setorData, backgroundColor: palette, borderColor: dark ? '#161B27' : '#fff', borderWidth: 3 }]
        },
        options: {
          responsive: true, maintainAspectRatio: false, cutout: '65%',
          plugins: { legend: { position: 'right', labels: { font: { size: 11 } } } }
        }
      });
    }

    // 4. Estado de Conservação (Barra)
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
            backgroundColor: consLabels.map(n => n <= 3 ? '#EF4444' : n <= 6 ? '#F59E0B' : '#10B981'),
            borderRadius: 4
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, grid: { color: gridColor }, ticks: { stepSize: 1 } },
            x: { grid: { display: false } }
          }
        }
      });
    }
  },

  _updateUltimosBens(bens) {
    const tbody = document.getElementById('ultimos-bens-body');
    if(!tbody) return;

    // Ordena do mais recente para o mais antigo e pega os 5 primeiros
    const recentes = [...bens].sort((a, b) => {
      const dateA = a.criadoEm?.toDate ? a.criadoEm.toDate() : new Date(0);
      const dateB = b.criadoEm?.toDate ? b.criadoEm.toDate() : new Date(0);
      return dateB - dateA;
    }).slice(0, 5);

    if(recentes.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--c-text-3);padding:20px;">Nenhum registro recente.</td></tr>`;
      return;
    }

    tbody.innerHTML = recentes.map(bem => {
      const dataStr = bem.criadoEm?.toDate ? bem.criadoEm.toDate().toLocaleDateString('pt-BR') : '--';
      return `
        <tr>
          <td><span class="td-mono">${bem.codigoBem}</span></td>
          <td class="td-main">${bem.descricao}</td>
          <td>${bem.setor}</td>
          <td style="text-align:right;">${dataStr}</td>
        </tr>
      `;
    }).join('');
  }
};