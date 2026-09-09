/**
 * ==============================================================================
 * CIMORY MDS DASHBOARD - CHARTS SERVICE (CHART.JS RENDERER)
 * ==============================================================================
 */

const ChartService = {
  trendChartInstance: null,
  modulChartInstance: null,
  accountChartInstance: null,

  /**
   * 1. Render Daily Visit Trend (Line Chart with Area Fill)
   */
  renderTrendChart(canvasEl, visits, isDark = false) {
    if (!canvasEl) return;
    if (this.trendChartInstance) {
      this.trendChartInstance.destroy();
    }

    // Group visits by date (YYYY-MM-DD or date string)
    const dateCounts = {};
    visits.forEach(v => {
      const d = v.dateIso || v.date || 'Unknown';
      dateCounts[d] = (dateCounts[d] || 0) + 1;
    });

    const sortedDates = Object.keys(dateCounts).sort().slice(-14); // Last 14 days
    const counts = sortedDates.map(d => dateCounts[d]);

    const ctx = canvasEl.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, isDark ? 'rgba(99, 102, 241, 0.4)' : 'rgba(99, 102, 241, 0.3)');
    gradient.addColorStop(1, 'rgba(99, 102, 241, 0.0)');

    this.trendChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: sortedDates.map(d => {
          const parts = d.split('-');
          return parts.length === 3 ? `${parts[2]}/${parts[1]}` : d;
        }),
        datasets: [{
          label: 'Total Kunjungan Harian',
          data: counts,
          borderColor: '#6366f1',
          backgroundColor: gradient,
          borderWidth: 2.5,
          fill: true,
          tension: 0.35,
          pointBackgroundColor: '#4f46e5',
          pointRadius: 4,
          pointHoverRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: isDark ? '#1e293b' : '#ffffff',
            titleColor: isDark ? '#f1f5f9' : '#0f172a',
            bodyColor: isDark ? '#cbd5e1' : '#334155',
            borderColor: isDark ? '#334155' : '#e2e8f0',
            borderWidth: 1,
            padding: 10,
            boxPadding: 4,
            cornerRadius: 8
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: isDark ? '#94a3b8' : '#64748b', font: { size: 11 } }
          },
          y: {
            beginAtZero: true,
            grid: { color: isDark ? 'rgba(51, 65, 85, 0.5)' : 'rgba(226, 232, 240, 0.8)' },
            ticks: { color: isDark ? '#94a3b8' : '#64748b', precision: 0, font: { size: 11 } }
          }
        }
      }
    });
  },

  /**
   * 2. Render Module Distribution Bar Chart (DK vs LK vs LP)
   */
  renderModulComparisonChart(canvasEl, visits, isDark = false) {
    if (!canvasEl) return;
    if (this.modulChartInstance) {
      this.modulChartInstance.destroy();
    }

    const modulCounts = { DK: 0, LK: 0, LP: 0 };
    visits.forEach(v => {
      const p = v.prefix || (v.modul ? v.modul.substring(0, 2) : 'DK');
      if (modulCounts[p] !== undefined) {
        modulCounts[p]++;
      }
    });

    const ctx = canvasEl.getContext('2d');
    this.modulChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Modul DK (DK 1-6)', 'Modul LK (LK 1-5)', 'Modul LP (LP 1-4)'],
        datasets: [{
          label: 'Kunjungan Selesai',
          data: [modulCounts.DK, modulCounts.LK, modulCounts.LP],
          backgroundColor: ['#6366f1', '#0ea5e9', '#10b981'],
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: isDark ? '#94a3b8' : '#64748b', font: { size: 11 } }
          },
          y: {
            beginAtZero: true,
            grid: { color: isDark ? 'rgba(51, 65, 85, 0.5)' : 'rgba(226, 232, 240, 0.8)' },
            ticks: { color: isDark ? '#94a3b8' : '#64748b', precision: 0, font: { size: 11 } }
          }
        }
      }
    });
  },

  /**
   * 3. Render Store Account Distribution (Doughnut Chart)
   */
  renderAccountShareChart(canvasEl, visits, isDark = false) {
    if (!canvasEl) return;
    if (this.accountChartInstance) {
      this.accountChartInstance.destroy();
    }

    const accCounts = {};
    visits.forEach(v => {
      const a = (v.account || 'LAINNYA').toUpperCase().trim();
      accCounts[a] = (accCounts[a] || 0) + 1;
    });

    const sortedAccs = Object.entries(accCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const labels = sortedAccs.map(x => x[0]);
    const data = sortedAccs.map(x => x[1]);

    const colors = ['#6366f1', '#38bdf8', '#10b981', '#f59e0b', '#ec4899'];

    const ctx = canvasEl.getContext('2d');
    this.accountChartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: colors.slice(0, labels.length),
          borderWidth: isDark ? 2 : 1,
          borderColor: isDark ? '#1e293b' : '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: isDark ? '#cbd5e1' : '#475569', font: { size: 11 }, padding: 12 }
          }
        }
      }
    });
  },

  spvMtdChartInstance: null,

  /**
   * 4. Render SPV MTD Evaluation Performance Chart (Grouped Bar: Target RPS vs #KUNJUNGAN)
   */
  renderSpvMtdChart(canvasEl, chartData, isDark = false) {
    if (!canvasEl || typeof Chart === 'undefined') return;
    try {
      if (this.spvMtdChartInstance) {
        this.spvMtdChartInstance.destroy();
        this.spvMtdChartInstance = null;
      }

      const labels = (chartData && chartData.labels) || ['AGUSTUS', 'SEPTEMBER (MTD)'];
      const rpsData = (chartData && chartData.rps) || [2000, 2000];
      const visitData = (chartData && chartData.visits) || [2000, 1000];

      const ctx = canvasEl.getContext('2d');
      if (!ctx) return;

      // Custom inline plugin to display numbers directly on top of each bar (matching Excel)
      const spvBarLabels = {
        id: 'spvBarLabels',
        afterDatasetsDraw(chart) {
          const { ctx } = chart;
          chart.data.datasets.forEach((dataset, datasetIndex) => {
            const meta = chart.getDatasetMeta(datasetIndex);
            if (!meta.hidden) {
              meta.data.forEach((bar, index) => {
                const val = dataset.data[index];
                if (val !== null && val !== undefined) {
                  const formatted = Number(val).toLocaleString('id-ID');
                  ctx.save();
                  ctx.fillStyle = isDark ? '#f1f5f9' : '#1e293b';
                  ctx.font = 'bold 12px Inter, system-ui, sans-serif';
                  ctx.textAlign = 'center';
                  ctx.textBaseline = 'bottom';
                  ctx.fillText(formatted, bar.x, bar.y - 6);
                  ctx.restore();
                }
              });
            }
          });
        }
      };

      this.spvMtdChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [
            {
              label: 'RPS (Target)',
              data: rpsData,
              backgroundColor: '#0284c7', // Sky blue / Navy
              borderRadius: 6,
              maxBarThickness: 55
            },
            {
              label: '#KUNJUNGAN (Realisasi)',
              data: visitData,
              backgroundColor: '#f97316', // Orange
              borderRadius: 6,
              maxBarThickness: 55
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                color: isDark ? '#cbd5e1' : '#334155',
                font: { size: 12, weight: 'bold' },
                padding: 16,
                usePointStyle: true,
                pointStyle: 'rectRounded'
              }
            },
            tooltip: {
              backgroundColor: isDark ? '#1e293b' : '#ffffff',
              titleColor: isDark ? '#f1f5f9' : '#0f172a',
              bodyColor: isDark ? '#cbd5e1' : '#334155',
              borderColor: isDark ? '#334155' : '#e2e8f0',
              borderWidth: 1,
              padding: 10,
              cornerRadius: 8,
              callbacks: {
                label: function(context) {
                  return ' ' + context.dataset.label + ': ' + Number(context.raw || 0).toLocaleString('id-ID') + ' Toko';
                }
              }
            }
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: {
                color: isDark ? '#94a3b8' : '#475569',
                font: { size: 12, weight: 'bold' }
              }
            },
            y: {
              beginAtZero: true,
              grace: '15%',
              grid: {
                color: isDark ? 'rgba(51, 65, 85, 0.5)' : 'rgba(226, 232, 240, 0.8)'
              },
              ticks: {
                color: isDark ? '#94a3b8' : '#64748b',
                font: { size: 11 }
              }
            }
          }
        },
        plugins: [spvBarLabels]
      });
    } catch (err) {
      console.warn('SPV Chart Render Warning:', err);
    }
  }
};

// Explicitly bind ChartService to window global scope
window.ChartService = ChartService;

