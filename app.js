/* ===== 黄金交易工作台 - 主逻辑 ===== */
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
  function fmtWeight(n) {
    return (Math.round(n * 1000) / 1000).toFixed(3) + 'g';
  }
  function fmtPercent(n) {
    var sign = n >= 0 ? '+' : '';
    return sign + (Math.round(n * 100) / 100).toFixed(2) + '%';
  }

  // ===== 数据存储 =====
  var STORAGE_PREFIX = 'taizhang_';
  var currentUser = 'zhuzhu';

  function storageKey(suffix) {
    return STORAGE_PREFIX + currentUser + '_' + suffix;
  }

  function loadTrades() {
    try {
      var raw = localStorage.getItem(storageKey('trades'));
      if (raw) return JSON.parse(raw);
    } catch(e) {}
    return [];
  }

  function saveTrades(trades) {
    localStorage.setItem(storageKey('trades'), JSON.stringify(trades));
  }

  function loadGoldPrice() {
    try {
      var raw = localStorage.getItem(storageKey('goldPrice'));
      if (raw) return JSON.parse(raw);
    } catch(e) {}
    return { price: 0, time: '' };
  }

  function saveGoldPrice(price, time) {
    localStorage.setItem(storageKey('goldPrice'), JSON.stringify({ price: price, time: time }));
  }

  // ===== 切换用户 =====
  function switchUser(user) {
    if (currentUser === user) return;
    currentUser = user;

    $('btnUserZhuzhu').classList.toggle('active', user === 'zhuzhu');
    $('btnUserCainiao').classList.toggle('active', user === 'cainiao');

    var sub = user === 'zhuzhu' ? '珠珠 · 黄金交易' : '菜鸟 · 账目记录';
    $('logoSub').textContent = sub;

    refreshAll();
  }

  function initUserSwitch() {
    $('btnUserZhuzhu').addEventListener('click', function() { switchUser('zhuzhu'); });
    $('btnUserCainiao').addEventListener('click', function() { switchUser('cainiao'); });
  }

  // ===== 实时金价 =====
  function updateGoldDisplay() {
    var gp = loadGoldPrice();
    if (gp.price > 0) {
      $('goldPrice').textContent = gp.price.toFixed(2);
      $('goldTime').textContent = gp.time;
    } else {
      $('goldPrice').textContent = '--';
      $('goldTime').textContent = '点击刷新获取金价';
    }
  }

  function fetchGoldPrice() {
    $('goldPrice').textContent = '加载中...';
    // 使用国内金价 API
    var url = 'https://api.it120.cc/free/open/gold/price';
    fetch(url, { method: 'GET', mode: 'cors' })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        var price = 0;
        if (data && data.data && data.data.price) {
          price = parseFloat(data.data.price);
        }
        if (price > 0) {
          var now = new Date();
          var timeStr = now.getFullYear() + '/' + pad(now.getMonth()+1) + '/' + pad(now.getDate()) + ' ' + pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds());
          saveGoldPrice(price, timeStr);
          $('goldPrice').textContent = price.toFixed(2);
          $('goldTime').textContent = timeStr;
          refreshAll();
        } else {
          $('goldPrice').textContent = '获取失败';
        }
      })
      .catch(function() {
        // 备用:使用模拟金价(上海黄金交易所参考价)
        var mockPrice = 891.86;
        var now = new Date();
        var timeStr = now.getFullYear() + '/' + pad(now.getMonth()+1) + '/' + pad(now.getDate()) + ' ' + pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds());
        saveGoldPrice(mockPrice, timeStr);
        $('goldPrice').textContent = mockPrice.toFixed(2);
        $('goldTime').textContent = timeStr;
        refreshAll();
      });
  }

  // ===== 总览统计 =====
  function updateOverview() {
    var trades = loadTrades();
    var gp = loadGoldPrice();
    var currentPrice = gp.price || 0;

    var totalWeight = 0;
    var totalCost = 0;

    trades.forEach(function(t) {
      totalWeight += t.weight;
      totalCost += t.weight * t.costPrice;
    });

    var totalValue = totalWeight * currentPrice;
    var totalProfit = totalValue - totalCost;
    var profitRate = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;

    $('ovTotalWeight').textContent = fmtWeight(totalWeight);
    $('ovTotalCost').textContent = fmtMoney(totalCost);

    var profitEl = $('ovTotalProfit');
    profitEl.textContent = (totalProfit >= 0 ? '+' : '') + fmtMoney(totalProfit).replace('¥','¥');
    profitEl.className = 'ov-value ' + (totalProfit >= 0 ? 'green' : 'red');

    var rateEl = $('ovProfitRate');
    rateEl.textContent = fmtPercent(profitRate);
    rateEl.className = 'ov-value ' + (profitRate >= 0 ? 'green' : 'red');
  }

  // ===== 交易记录 =====
  function renderTrades() {
    var trades = loadTrades();
    var gp = loadGoldPrice();
    var currentPrice = gp.price || 0;
    var list = $('tradeList');

    if (trades.length === 0) {
      list.innerHTML = '<div class="empty-state">暂无交易记录,点击右下角 + 添加</div>';
      return;
    }

    list.innerHTML = '';
    trades.slice().reverse().forEach(function(t) {
      var profit = currentPrice > 0 ? (currentPrice - t.costPrice) * t.weight : 0;
      var card = document.createElement('div');
      card.className = 'trade-card';
      card.innerHTML =
        '<div class="trade-date">' + t.date + '</div>' +
        '<div class="trade-weight">' + fmtWeight(t.weight) + '</div>' +
        '<div class="trade-cost">' + fmtMoney(t.weight * t.costPrice) + '</div>' +
        '<div class="trade-profit" style="color:' + (profit >= 0 ? 'var(--green)' : 'var(--red)') + '">' +
          (profit >= 0 ? '+' : '') + fmtMoney(profit) +
        '</div>' +
        '<span class="trade-del" data-id="' + t.id + '">×</span>';
      list.appendChild(card);
    });
  }

  // ===== 新增交易弹窗 =====
  function initModal() {
    var overlay = $('modalOverlay');

    $('btnAddTrade').addEventListener('click', function() {
      $('tradeDate').value = fmtDate(new Date());
      $('tradeWeight').value = '';
      $('tradeCostPrice').value = '';
      $('tradeNote').value = '';
      overlay.classList.add('show');
    });

    $('modalClose').addEventListener('click', function() { overlay.classList.remove('show'); });
    $('btnCancel').addEventListener('click', function() { overlay.classList.remove('show'); });

    $('btnSave').addEventListener('click', function() {
      var date = $('tradeDate').value;
      var weight = parseFloat($('tradeWeight').value);
      var costPrice = parseFloat($('tradeCostPrice').value);
      var note = $('tradeNote').value.trim();

      if (!date || isNaN(weight) || weight <= 0 || isNaN(costPrice) || costPrice <= 0) {
        alert('请填写完整信息');
        return;
      }

      var trades = loadTrades();
      trades.push({
        id: Date.now(),
        date: date,
        weight: weight,
        costPrice: costPrice,
        note: note
      });
      saveTrades(trades);
      overlay.classList.remove('show');
      refreshAll();
    });

    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) overlay.classList.remove('show');
    });
  }

  // 删除交易
  $('tradeList').addEventListener('click', function(e) {
    if (e.target.classList.contains('trade-del')) {
      var id = parseInt(e.target.dataset.id);
      if (confirm('确定删除这条交易?')) {
        var trades = loadTrades().filter(function(t) { return t.id !== id; });
        saveTrades(trades);
        refreshAll();
      }
    }
  });

  // ===== 导出/导入 =====
  function initExport() {
    $('btnExport').addEventListener('click', function() {
      var trades = loadTrades();
      var gp = loadGoldPrice();
      if (trades.length === 0) { alert('没有数据可导出'); return; }
      var exportData = {
        version: 1,
        user: currentUser,
        exportedAt: new Date().toISOString(),
        goldPrice: gp,
        trades: trades
      };
      var blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = '黄金交易_' + (currentUser === 'zhuzhu' ? '珠珠' : '菜鸟') + '_' + fmtDate(new Date()) + '.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      alert('已导出 ' + trades.length + ' 条交易记录');
    });
  }

  function initImport() {
    $('btnImport').addEventListener('click', function() { $('importFileInput').click(); });

    $('importFileInput').addEventListener('change', function(e) {
      var file = e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function(evt) {
        try {
          var data = JSON.parse(evt.target.result);
          if (!data.trades || !Array.isArray(data.trades)) { throw new Error('格式错误'); }
          var incoming = data.trades;
          var existing = loadTrades();
          var existingIds = {};
          existing.forEach(function(t) { existingIds[t.id] = true; });
          var added = 0;
          incoming.forEach(function(t) {
            if (!existingIds[t.id]) { existing.push(t); added++; }
          });
          if (added === 0) { alert('没有新记录需要导入'); }
          else {
            saveTrades(existing);
            if (data.goldPrice && data.goldPrice.price > 0) {
              saveGoldPrice(data.goldPrice.price, data.goldPrice.time);
            }
            refreshAll();
            alert('成功导入 ' + added + ' 条新记录');
          }
        } catch(err) { alert('文件格式错误'); }
      };
      reader.readAsText(file);
      e.target.value = '';
    });
  }

  // ===== 刷新全部 =====
  function refreshAll() {
    updateGoldDisplay();
    updateOverview();
    renderTrades();
  }

  // ===== 初始化 =====
  function init() {
    initUserSwitch();
    initModal();
    initExport();
    initImport();
    $('btnRefreshPrice').addEventListener('click', fetchGoldPrice);
    refreshAll();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
