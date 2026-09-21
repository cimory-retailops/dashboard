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

    // Group visits by date (YYYY-MM-DD or date string)
    const dateCounts = {};
    (visits || []).forEach(v => {
      const d = v.dateIso || v.date || 'Unknown';
      dateCounts[d] = (dateCounts[d] || 0) + 1;
    });

    const sortedDates = Object.keys(dateCounts).sort().slice(-14); // Last 14 days
    const counts = sortedDates.map(d => dateCounts[d]);
    const labels = sortedDates.map(d => {
      const parts = d.split('-');
      return parts.length === 3 ? `${parts[2]}/${parts[1]}` : d;
    });

    if (this.trendChartInstance) {
      this.trendChartInstance.data.labels = labels;
      this.trendChartInstance.data.datasets[0].data = counts;
      this.trendChartInstance.update('none');
      return;
    }

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
    const modulCounts = { DK: 0, LK: 0, LP: 0 };
    visits.forEach(v => {
      const p = v.prefix || (v.modul ? v.modul.substring(0, 2) : 'DK');
      if (modulCounts[p] !== undefined) {
        modulCounts[p]++;
      }
    });

    if (this.modulChartInstance) {
      this.modulChartInstance.data.datasets[0].data = [modulCounts.DK, modulCounts.LK, modulCounts.LP];
      this.modulChartInstance.update('none');
      return;
    }

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

    const accCounts = {};
    (visits || []).forEach(v => {
      const a = (v.account || 'LAINNYA').toUpperCase().trim();
      accCounts[a] = (accCounts[a] || 0) + 1;
    });

    const sortedAccs = Object.entries(accCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const labels = sortedAccs.map(x => x[0]);
    const data = sortedAccs.map(x => x[1]);
    const colors = ['#6366f1', '#38bdf8', '#10b981', '#f59e0b', '#ec4899'];

    if (this.accountChartInstance) {
      this.accountChartInstance.data.labels = labels;
      this.accountChartInstance.data.datasets[0].data = data;
      this.accountChartInstance.data.datasets[0].backgroundColor = colors.slice(0, labels.length);
      this.accountChartInstance.update('none');
      return;
    }

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
  },

  anomalyTrendChartInstance: null,
  anomalyCategoryChartInstance: null,

  /**
   * 5. Render Anomaly Trend Chart (Line chart with configurable category filter)
   */
  renderAnomalyTrendChart(canvasEl, trendData, selectedCategory = 'ALL', isDark = false) {
    if (!canvasEl || !trendData || !trendData.dates || trendData.dates.length === 0) return;
    if (this.anomalyTrendChartInstance) {
      this.anomalyTrendChartInstance.destroy();
    }

    const ctx = canvasEl.getContext('2d');
    const dates = trendData.dates || [];
    const formattedLabels = dates.map(d => {
      const parts = String(d).split('-');
      return parts.length === 3 ? `${parts[2]}/${parts[1]}` : d;
    });

    const categoryConfig = {
      ALL: { label: 'Total Seluruh Anomali', color: '#f43f5e' },
      terlambat: { label: '⏰ Terlambat (> 08:00)', color: '#6366f1' },
      absenNoVisit: { label: '🔴 Absen tapi 0 Kunjungan', color: '#ef4444' },
      visitNoAbsen: { label: '🟡 Kunjungan Tanpa Absen', color: '#f59e0b' },
      lupaPulang: { label: '🏠 Belum Tap Pulang', color: '#a855f7' },
      gpsIssue: { label: '📍 GPS Issue (0,0)', color: '#06b6d4' },
      alpha: { label: '❓ Alpha (Tanpa Keterangan)', color: '#64748b' }
    };

    let datasets = [];

    if (selectedCategory === 'ALL') {
      const gradient = ctx.createLinearGradient(0, 0, 0, 260);
      gradient.addColorStop(0, isDark ? 'rgba(244, 63, 94, 0.35)' : 'rgba(244, 63, 94, 0.25)');
      gradient.addColorStop(1, 'rgba(244, 63, 94, 0.0)');

      datasets.push({
        label: 'Total Seluruh Anomali',
        data: trendData.categories.total || [],
        borderColor: '#f43f5e',
        backgroundColor: gradient,
        borderWidth: 2.5,
        fill: true,
        tension: 0.3,
        pointBackgroundColor: '#e11d48',
        pointRadius: 3.5,
        pointHoverRadius: 6
      });
    } else {
      const cfg = categoryConfig[selectedCategory] || categoryConfig.ALL;
      const gradient = ctx.createLinearGradient(0, 0, 0, 260);
      gradient.addColorStop(0, isDark ? `${cfg.color}55` : `${cfg.color}35`);
      gradient.addColorStop(1, `${cfg.color}00`);

      datasets.push({
        label: cfg.label,
        data: trendData.categories[selectedCategory] || [],
        borderColor: cfg.color,
        backgroundColor: gradient,
        borderWidth: 2.5,
        fill: true,
        tension: 0.3,
        pointBackgroundColor: cfg.color,
        pointRadius: 3.5,
        pointHoverRadius: 6
      });
    }

    this.anomalyTrendChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: formattedLabels,
        datasets: datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              color: isDark ? '#cbd5e1' : '#334155',
              font: { size: 11, weight: 'bold' },
              boxWidth: 12,
              usePointStyle: true
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
                return ' ' + context.dataset.label + ': ' + context.raw + ' Kasus';
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: isDark ? '#94a3b8' : '#64748b', font: { size: 10 } }
          },
          y: {
            beginAtZero: true,
            grid: { color: isDark ? 'rgba(51, 65, 85, 0.4)' : 'rgba(226, 232, 240, 0.8)' },
            ticks: { color: isDark ? '#94a3b8' : '#64748b', precision: 0, font: { size: 10 } }
          }
        }
      }
    });
  },

  /**
   * 6. Render Anomaly Category Breakdown (Doughnut Chart)
   */
  renderAnomalyCategoryChart(canvasEl, catTotals, isDark = false) {
    if (!canvasEl || !catTotals) return;
    if (this.anomalyCategoryChartInstance) {
      this.anomalyCategoryChartInstance.destroy();
    }

    const labels = [
      '⏰ Terlambat',
      '🔴 Absen 0 Visit',
      '🟡 Visit Belum Absen',
      '🏠 Belum Tap Pulang',
      '📍 GPS Issue',
      '❓ Alpha'
    ];
    const data = [
      catTotals.terlambat || 0,
      catTotals.absenNoVisit || 0,
      catTotals.visitNoAbsen || 0,
      catTotals.lupaPulang || 0,
      catTotals.gpsIssue || 0,
      catTotals.alpha || 0
    ];
    const colors = ['#6366f1', '#ef4444', '#f59e0b', '#a855f7', '#06b6d4', '#64748b'];

    const ctx = canvasEl.getContext('2d');
    this.anomalyCategoryChartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: colors,
          borderWidth: isDark ? 2 : 1,
          borderColor: isDark ? '#0f172a' : '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color: isDark ? '#cbd5e1' : '#334155',
              font: { size: 10.5, weight: 'bold' },
              boxWidth: 10,
              padding: 10
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
                const val = context.raw || 0;
                const total = data.reduce((a, b) => a + b, 0);
                const pct = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
                return ` ${context.label}: ${val} (${pct}%)`;
              }
            }
          }
        }
      }
    });
  }
};

// Explicitly bind ChartService to window global scope
window.ChartService = ChartService;

