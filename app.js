/* ===== 账目记录工作台 - 主逻辑 ===== */
(function() {
  'use strict';

  function $(id) { return document.getElementById(id); }
  function $$(sel) { return document.querySelectorAll(sel); }

  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function fmtDate(d) {
    return d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate());
  }
  function fmtMoney(n) {
    return '¥' + (Math.round(n * 100) / 100).toFixed(2);
  }

  // ===== 数据存储 =====
  var STORAGE_KEY = 'taizhang_records';

  function loadRecords() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch(e) {}
    // 默认示例数据(跟你截图一致)
    return [
      { id: 1, date: '2026-07-28', account: '134', project: '快递', amount: 57.86, note: '' },
      { id: 2, date: '2026-07-28', account: '150', project: '快递', amount: 53.44, note: '' },
      { id: 3, date: '2026-07-28', account: '170', project: '快递', amount: 50.46, note: '' }
    ];
  }

  function saveRecords(records) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  }

  // ===== 总览统计 =====
  function updateOverview() {
    var records = loadRecords();
    var total = records.reduce(function(s, r) { return s + r.amount; }, 0);
    var accounts = {};
    var projects = {};
    records.forEach(function(r) {
      accounts[r.account] = true;
      projects[r.project] = true;
    });

    $('ovTotalAmount').textContent = fmtMoney(total);
    $('ovTotalCount').textContent = records.length;
    $('ovAccountCount').textContent = Object.keys(accounts).length;
    $('ovProjectCount').textContent = Object.keys(projects).length;
  }

  // ===== 标签切换 =====
  function initTabs() {
    var tabs = $$('.tab');
    var panels = $$('.panel');

    tabs.forEach(function(tab) {
      tab.addEventListener('click', function() {
        var target = this.dataset.tab;
        tabs.forEach(function(t) { t.classList.remove('active'); });
        panels.forEach(function(p) { p.classList.remove('active'); });
        this.classList.add('active');
        $('panel-' + target).classList.add('active');
      });
    });
  }

  // ===== 按日期统计 =====
  function renderByDate() {
    var records = loadRecords();
    var grouped = {};
    records.forEach(function(r) {
      if (!grouped[r.date]) grouped[r.date] = { count: 0, amount: 0 };
      grouped[r.date].count++;
      grouped[r.date].amount += r.amount;
    });

    var dates = Object.keys(grouped).sort().reverse();
    var body = $('byDateBody');
    var totalCount = 0, totalAmount = 0;

    if (dates.length === 0) {
      body.innerHTML = '<div class="empty-state">暂无记录</div>';
    } else {
      body.innerHTML = '';
      dates.forEach(function(date) {
        var g = grouped[date];
        totalCount += g.count;
        totalAmount += g.amount;
        var row = document.createElement('div');
        row.className = 'dt-row';
        row.innerHTML =
          '<span>' + date + '</span>' +
          '<span>' + g.count + '</span>' +
          '<span class="amount">' + fmtMoney(g.amount) + '</span>';
        body.appendChild(row);
      });
    }

    $('byDateTotalCount').textContent = totalCount;
    $('byDateTotalAmount').textContent = fmtMoney(totalAmount);
  }

  // ===== 按账号统计 =====
  function renderByAccount() {
    var records = loadRecords();
    var grouped = {};
    records.forEach(function(r) {
      if (!grouped[r.account]) grouped[r.account] = { count: 0, amount: 0 };
      grouped[r.account].count++;
      grouped[r.account].amount += r.amount;
    });

    var accounts = Object.keys(grouped).sort();
    var body = $('byAccountBody');
    var totalCount = 0, totalAmount = 0;

    if (accounts.length === 0) {
      body.innerHTML = '<div class="empty-state">暂无记录</div>';
    } else {
      body.innerHTML = '';
      accounts.forEach(function(acc) {
        var g = grouped[acc];
        totalCount += g.count;
        totalAmount += g.amount;
        var row = document.createElement('div');
        row.className = 'dt-row';
        row.innerHTML =
          '<span>' + acc + '</span>' +
          '<span>' + g.count + '</span>' +
          '<span class="amount">' + fmtMoney(g.amount) + '</span>';
        body.appendChild(row);
      });
    }

    $('byAccountTotalCount').textContent = totalCount;
    $('byAccountTotalAmount').textContent = fmtMoney(totalAmount);
  }

  // ===== 按项目统计 =====
  function renderByProject() {
    var records = loadRecords();
    var grouped = {};
    records.forEach(function(r) {
      if (!grouped[r.project]) grouped[r.project] = { count: 0, amount: 0 };
      grouped[r.project].count++;
      grouped[r.project].amount += r.amount;
    });

    var projects = Object.keys(grouped).sort();
    var body = $('byProjectBody');
    var totalCount = 0, totalAmount = 0;

    if (projects.length === 0) {
      body.innerHTML = '<div class="empty-state">暂无记录</div>';
    } else {
      body.innerHTML = '';
      projects.forEach(function(proj) {
        var g = grouped[proj];
        totalCount += g.count;
        totalAmount += g.amount;
        var row = document.createElement('div');
        row.className = 'dt-row';
        row.innerHTML =
          '<span>' + proj + '</span>' +
          '<span>' + g.count + '</span>' +
          '<span class="amount">' + fmtMoney(g.amount) + '</span>';
        body.appendChild(row);
      });
    }

    $('byProjectTotalCount').textContent = totalCount;
    $('byProjectTotalAmount').textContent = fmtMoney(totalAmount);
  }

  // ===== 记录列表 =====
  function renderRecords() {
    var records = loadRecords();
    var list = $('recordsList');

    if (records.length === 0) {
      list.innerHTML = '<div class="empty-state">暂无记录,点击上方按钮添加</div>';
      return;
    }

    list.innerHTML = '';
    records.slice().reverse().forEach(function(r) {
      var card = document.createElement('div');
      card.className = 'record-card';
      card.innerHTML =
        '<div class="record-info">' +
          '<div class="record-date">' + r.date + '</div>' +
          '<div class="record-detail">' +
            '<span class="tag">' + r.account + '</span>' +
            '<span class="tag">' + r.project + '</span>' +
            (r.note ? '<span>' + r.note + '</span>' : '') +
          '</div>' +
        '</div>' +
        '<div class="record-amount">' + fmtMoney(r.amount) + '</div>' +
        '<span class="record-del" data-id="' + r.id + '">×</span>';
      list.appendChild(card);
    });
  }

  // ===== 新增记录弹窗 =====
  function initModal() {
    var overlay = $('modalOverlay');

    $('btnAddRecord').addEventListener('click', function() {
      $('recDate').value = fmtDate(new Date());
      $('recAccount').value = '';
      $('recProject').value = '';
      $('recAmount').value = '';
      $('recNote').value = '';
      overlay.classList.add('show');
    });

    $('modalClose').addEventListener('click', function() {
      overlay.classList.remove('show');
    });

    $('btnCancel').addEventListener('click', function() {
      overlay.classList.remove('show');
    });

    $('btnSave').addEventListener('click', function() {
      var date = $('recDate').value;
      var account = $('recAccount').value.trim();
      var project = $('recProject').value.trim();
      var amount = parseFloat($('recAmount').value);
      var note = $('recNote').value.trim();

      if (!date || !account || !project || isNaN(amount) || amount <= 0) {
        alert('请填写完整信息');
        return;
      }

      var records = loadRecords();
      records.push({
        id: Date.now(),
        date: date,
        account: account,
        project: project,
        amount: amount,
        note: note
      });
      saveRecords(records);
      overlay.classList.remove('show');
      refreshAll();
    });

    // 点击遮罩关闭
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) overlay.classList.remove('show');
    });
  }

  // ===== 导出数据 =====
  function initExport() {
    $('btnExport').addEventListener('click', function() {
      var records = loadRecords();
      if (records.length === 0) {
        alert('没有数据可导出');
        return;
      }
      var exportData = {
        version: 1,
        exportedAt: new Date().toISOString(),
        records: records
      };
      var blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = '账目记录_' + fmtDate(new Date()) + '.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      alert('已导出 ' + records.length + ' 条记录');
    });
  }

  // ===== 导入数据 =====
  function initImport() {
    $('btnImport').addEventListener('click', function() {
      $('importFileInput').click();
    });

    $('importFileInput').addEventListener('change', function(e) {
      var file = e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function(evt) {
        try {
          var data = JSON.parse(evt.target.result);
          if (!data.records || !Array.isArray(data.records)) {
            throw new Error('格式错误');
          }
          var incoming = data.records;
          var existing = loadRecords();

          // 合并:同名 id 跳过,新 id 追加
          var existingIds = {};
          existing.forEach(function(r) { existingIds[r.id] = true; });
          var added = 0;
          incoming.forEach(function(r) {
            if (!existingIds[r.id]) {
              existing.push(r);
              added++;
            }
          });

          if (added === 0) {
            alert('没有新记录需要导入（全部已存在）');
          } else {
            saveRecords(existing);
            refreshAll();
            alert('成功导入 ' + added + ' 条新记录（共 ' + existing.length + ' 条）');
          }
        } catch(err) {
          alert('文件格式错误，请选择正确的 .json 导出文件');
        }
      };
      reader.readAsText(file);
      // 清除 input 以允许重复选同一文件
      e.target.value = '';
    });
  }

  // 删除记录
  $('recordsList').addEventListener('click', function(e) {
    if (e.target.classList.contains('record-del')) {
      var id = parseInt(e.target.dataset.id);
      if (confirm('确定删除这条记录?')) {
        var records = loadRecords().filter(function(r) { return r.id !== id; });
        saveRecords(records);
        refreshAll();
      }
    }
  });

  // ===== 刷新全部 =====
  function refreshAll() {
    updateOverview();
    renderByDate();
    renderByAccount();
    renderByProject();
    renderRecords();
  }

  // ===== 初始化 =====
  function init() {
    initTabs();
    initModal();
    initExport();
    initImport();
    refreshAll();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
