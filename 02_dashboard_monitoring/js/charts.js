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
  }
};
