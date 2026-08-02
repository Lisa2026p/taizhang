/* ===== 工作台 - 双用户双App ===== */
(function() {
  'use strict';

  function $(id) { return document.getElementById(id); }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function fmtDate(d) { return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
  function fmtMoney(n) { return '¥'+(Math.round(n*100)/100).toFixed(2); }
  function fmtWeight(n) { return (Math.round(n*1000)/1000).toFixed(3)+'g'; }
  function fmtPercent(n) { var s=n>=0?'+':''; return s+(Math.round(n*100)/100).toFixed(2)+'%'; }

  // ===== 用户切换 =====
  var currentUser = 'zhuzhu';

  function switchUser(user) {
    if (currentUser === user) return;
    currentUser = user;
    $('btnUserZhuzhu').classList.toggle('active', user==='zhuzhu');
    $('btnUserCainiao').classList.toggle('active', user==='cainiao');
    $('logoSub').textContent = user==='zhuzhu' ? '珠珠 · 黄金交易' : '菜鸟 · 账目记录';
    $('viewZhuzhu').classList.toggle('active', user==='zhuzhu');
    $('viewCainiao').classList.toggle('active', user==='cainiao');
    if (user==='zhuzhu') refreshGold();
    else refreshCainiao();
  }

  $('btnUserZhuzhu').addEventListener('click', function(){switchUser('zhuzhu')});
  $('btnUserCainiao').addEventListener('click', function(){switchUser('cainiao')});

  // ===== 本地存储辅助 =====
  function lsGet(key, def) {
    try { var r=localStorage.getItem(key); return r ? JSON.parse(r) : def; } catch(e) { return def; }
  }
  function lsSet(key, v) { localStorage.setItem(key, JSON.stringify(v)); }

  // ==================== 珠珠：黄金交易 ====================
  var GOLD_TRADES_KEY = 'taizhang_zhuzhu_trades';
  var GOLD_PRICE_KEY = 'taizhang_zhuzhu_goldPrice';

  function loadGoldTrades() { return lsGet(GOLD_TRADES_KEY, []); }
  function saveGoldTrades(t) { lsSet(GOLD_TRADES_KEY, t); }
  function loadGoldPrice() { return lsGet(GOLD_PRICE_KEY, {price:0,time:''}); }
  function saveGoldPrice(p, t) { lsSet(GOLD_PRICE_KEY, {price:p, time:t}); }

  function fetchGoldPrice() {
    $('goldPrice').textContent = '加载中...';
    fetch('https://api.it120.cc/free/open/gold/price', {method:'GET',mode:'cors'})
      .then(function(r){return r.json()})
      .then(function(d){
        var p = (d&&d.data&&d.data.price) ? parseFloat(d.data.price) : 0;
        if (p<=0) p = 891.86;
        var now = new Date();
        var ts = now.getFullYear()+'/'+pad(now.getMonth()+1)+'/'+pad(now.getDate())+' '+pad(now.getHours())+':'+pad(now.getMinutes())+':'+pad(now.getSeconds());
        saveGoldPrice(p, ts);
        $('goldPrice').textContent = p.toFixed(2);
        $('goldTime').textContent = ts;
        refreshGold();
      })
      .catch(function(){
        var p = 891.86;
        var now = new Date();
        var ts = now.getFullYear()+'/'+pad(now.getMonth()+1)+'/'+pad(now.getDate())+' '+pad(now.getHours())+':'+pad(now.getMinutes())+':'+pad(now.getSeconds());
        saveGoldPrice(p, ts);
        $('goldPrice').textContent = p.toFixed(2);
        $('goldTime').textContent = ts;
        refreshGold();
      });
  }

  function refreshGold() {
    var trades = loadGoldTrades();
    var gp = loadGoldPrice();
    var cp = gp.price || 0;

    if (cp > 0) {
      $('goldPrice').textContent = cp.toFixed(2);
      $('goldTime').textContent = gp.time;
    }

    var tw=0, tc=0;
    trades.forEach(function(t){ tw+=t.weight; tc+=t.weight*t.costPrice; });
    var tv = tw*cp;
    var profit = tv-tc;
    var rate = tc>0 ? (profit/tc)*100 : 0;

    $('ovTotalWeight').textContent = fmtWeight(tw);
    $('ovTotalCost').textContent = fmtMoney(tc);
    var pe = $('ovTotalProfit'); pe.textContent = (profit>=0?'+':'')+fmtMoney(profit); pe.className = 'ov-value '+(profit>=0?'green':'red');
    var re = $('ovProfitRate'); re.textContent = fmtPercent(rate); re.className = 'ov-value '+(rate>=0?'green':'red');

    // 交易列表 - 按日期汇总
    var list = $('tradeList');
    if (trades.length===0) {
      list.innerHTML = '<div class="empty-state">暂无交易记录,点击右下角 + 添加</div>';
    } else {
      // 按日期分组汇总
      var byDate = {};
      trades.forEach(function(t){
        if (!byDate[t.date]) byDate[t.date] = { date: t.date, weight: 0, cost: 0, ids: [] };
        byDate[t.date].weight += t.weight;
        byDate[t.date].cost += t.weight * t.costPrice;
        byDate[t.date].ids.push(t.id);
      });
      var dates = Object.keys(byDate).sort().reverse();
      list.innerHTML = '';
      dates.forEach(function(d){
        var g = byDate[d];
        var avgPrice = g.weight > 0 ? g.cost / g.weight : 0;
        var profit = cp > 0 ? (cp - avgPrice) * g.weight : 0;
        var c = document.createElement('div'); c.className='trade-card';
        c.innerHTML = '<div class="trade-date">'+g.date+'</div>'+
          '<div class="trade-weight">'+fmtWeight(g.weight)+'</div>'+
          '<div class="trade-cost">'+fmtMoney(g.cost)+'</div>'+
          '<div class="trade-profit" style="color:'+(profit>=0?'var(--green)':'var(--red)')+'">'+(profit>=0?'+':'')+fmtMoney(profit)+'</div>'+
          '<span class="trade-edit" data-date="'+g.date+'">✏️</span>'+
          '<span class="trade-del" data-date="'+g.date+'">×</span>';
        list.appendChild(c);
      });
    }
  }

  // 黄金：弹窗(新增/编辑)
  var goldEditingDate = null;
  (function(){
    var overlay = $('goldModal');
    $('btnAddGold').addEventListener('click', function(){
      goldEditingDate = null;
      $('goldModal').querySelector('h3').textContent = '新增交易';
      $('goldDate').value = fmtDate(new Date()); $('goldWeight').value=''; $('goldCostPrice').value=''; $('goldNote').value='';
      overlay.classList.add('show');
    });
    $('goldModalClose').addEventListener('click', function(){ overlay.classList.remove('show'); });
    $('goldBtnCancel').addEventListener('click', function(){ overlay.classList.remove('show'); });
    $('goldBtnSave').addEventListener('click', function(){
      var d=$('goldDate').value, w=parseFloat($('goldWeight').value), p=parseFloat($('goldCostPrice').value), n=$('goldNote').value.trim();
      if (!d||isNaN(w)||w<=0||isNaN(p)||p<=0) { alert('请填写完整信息'); return; }
      var trades = loadGoldTrades();
      if (goldEditingDate !== null) {
        // 编辑：删除当天所有，替换为一条新的
        trades = trades.filter(function(t){ return t.date !== goldEditingDate; });
        trades.push({id:Date.now(),date:d,weight:w,costPrice:p,note:n});
      } else {
        trades.push({id:Date.now(),date:d,weight:w,costPrice:p,note:n});
      }
      saveGoldTrades(trades);
      overlay.classList.remove('show');
      refreshGold();
    });
    overlay.addEventListener('click', function(e){ if(e.target===overlay) overlay.classList.remove('show'); });
  })();

  // 黄金：编辑/删除(按日期)
  $('tradeList').addEventListener('click', function(e){
    var date = e.target.dataset.date;
    if (!date) return;
    if (e.target.classList.contains('trade-edit')) {
      // 编辑：取出当天数据填入弹窗
      var dayTrades = loadGoldTrades().filter(function(t){return t.date===date});
      if (dayTrades.length===0) return;
      var tw=0, tc=0;
      dayTrades.forEach(function(t){tw+=t.weight; tc+=t.weight*t.costPrice;});
      var avgPrice = tw>0 ? tc/tw : 0;
      goldEditingDate = date;
      $('goldModal').querySelector('h3').textContent = '编辑 '+date;
      $('goldDate').value = date;
      $('goldWeight').value = tw.toFixed(3);
      $('goldCostPrice').value = avgPrice.toFixed(2);
      $('goldNote').value = dayTrades[0].note||'';
      $('goldModal').classList.add('show');
    } else if (e.target.classList.contains('trade-del')) {
      if (confirm('确定删除 '+date+' 的所有记录?')) {
        var t = loadGoldTrades().filter(function(x){return x.date !== date});
        saveGoldTrades(t); refreshGold();
      }
    }
  });

  // 黄金：导出导入
  $('btnGoldExport').addEventListener('click', function(){
    var t=loadGoldTrades(), gp=loadGoldPrice();
    if (t.length===0){alert('无数据');return;}
    var blob = new Blob([JSON.stringify({v:1,user:'zhuzhu',exportedAt:new Date().toISOString(),goldPrice:gp,trades:t},null,2)],{type:'application/json'});
    var a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='黄金交易_珠珠_'+fmtDate(new Date())+'.json';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    alert('已导出 '+t.length+' 条');
  });
  $('btnGoldImport').addEventListener('click', function(){ $('goldImportFile').click(); });
  $('goldImportFile').addEventListener('change', function(e){
    var f=e.target.files[0]; if(!f) return;
    var r=new FileReader();
    r.onload=function(ev){
      try {
        var d=JSON.parse(ev.target.result);
        if(!d.trades||!Array.isArray(d.trades)) throw new Error();
        var exist=loadGoldTrades(), ids={}, added=0;
        exist.forEach(function(x){ids[x.id]=true});
        d.trades.forEach(function(x){if(!ids[x.id]){exist.push(x);added++}});
        if(added===0){alert('无新记录');}else{saveGoldTrades(exist);refreshGold();alert('已导入 '+added+' 条');}
        if(d.goldPrice&&d.goldPrice.price>0) saveGoldPrice(d.goldPrice.price,d.goldPrice.time);
      }catch(ex){alert('格式错误');}
    };
    r.readAsText(f); e.target.value='';
  });

  // 黄金：刷新金价
  $('btnRefreshPrice').addEventListener('click', fetchGoldPrice);

  // ==================== 菜鸟：账目记录 ====================
  var C_KEY = 'taizhang_cainiao_records';

  function loadCRecords() { return lsGet(C_KEY, []); }
  function saveCRecords(r) { lsSet(C_KEY, r); }

  function refreshCainiao() {
    var records = loadCRecords();
    var total=0, accts={}, projs={};
    records.forEach(function(r){ total+=r.amount; accts[r.account]=true; projs[r.project]=true; });

    $('cTotalAmount').textContent = fmtMoney(total);
    $('cTotalCount').textContent = records.length;
    $('cAccountCount').textContent = Object.keys(accts).length;
    $('cProjectCount').textContent = Object.keys(projs).length;

    renderCByDate(records);
    renderCByAccount(records);
    renderCByProject(records);
    renderCRecords(records);
  }

  function renderCByDate(records) {
    var g={}, body=$('cByDateBody'), tc=0, ta=0;
    records.forEach(function(r){ if(!g[r.date]) g[r.date]={c:0,a:0}; g[r.date].c++; g[r.date].a+=r.amount; });
    var dates=Object.keys(g).sort().reverse();
    body.innerHTML = dates.length===0 ? '<div class="empty-state">暂无记录</div>' : '';
    dates.forEach(function(d){ var v=g[d]; tc+=v.c; ta+=v.a;
      var row=document.createElement('div'); row.className='dt-row';
      row.innerHTML='<span>'+d+'</span><span>'+v.c+'</span><span class="amount">'+fmtMoney(v.a)+'</span>';
      body.appendChild(row);
    });
    $('cByDateCount').textContent=tc; $('cByDateAmount').textContent=fmtMoney(ta);
  }

  function renderCByAccount(records) {
    var g={}, body=$('cByAccountBody'), tc=0, ta=0;
    records.forEach(function(r){ if(!g[r.account]) g[r.account]={c:0,a:0}; g[r.account].c++; g[r.account].a+=r.amount; });
    var accts=Object.keys(g).sort();
    body.innerHTML = accts.length===0 ? '<div class="empty-state">暂无记录</div>' : '';
    accts.forEach(function(a){ var v=g[a]; tc+=v.c; ta+=v.a;
      var row=document.createElement('div'); row.className='dt-row';
      row.innerHTML='<span>'+a+'</span><span>'+v.c+'</span><span class="amount">'+fmtMoney(v.a)+'</span>';
      body.appendChild(row);
    });
    $('cByAccountCount').textContent=tc; $('cByAccountAmount').textContent=fmtMoney(ta);
  }

  function renderCByProject(records) {
    var g={}, body=$('cByProjectBody'), tc=0, ta=0;
    records.forEach(function(r){ if(!g[r.project]) g[r.project]={c:0,a:0}; g[r.project].c++; g[r.project].a+=r.amount; });
    var projs=Object.keys(g).sort();
    body.innerHTML = projs.length===0 ? '<div class="empty-state">暂无记录</div>' : '';
    projs.forEach(function(p){ var v=g[p]; tc+=v.c; ta+=v.a;
      var row=document.createElement('div'); row.className='dt-row';
      row.innerHTML='<span>'+p+'</span><span>'+v.c+'</span><span class="amount">'+fmtMoney(v.a)+'</span>';
      body.appendChild(row);
    });
    $('cByProjectCount').textContent=tc; $('cByProjectAmount').textContent=fmtMoney(ta);
  }

  function renderCRecords(records) {
    var list=$('cRecordsList');
    if (records.length===0) { list.innerHTML='<div class="empty-state">暂无记录</div>'; return; }
    list.innerHTML='';
    records.slice().reverse().forEach(function(r){
      var card=document.createElement('div'); card.className='record-card';
      card.innerHTML='<div class="record-info"><div class="record-date">'+r.date+'</div><div class="record-detail"><span class="tag">'+r.account+'</span><span class="tag">'+r.project+'</span>'+(r.note?'<span>'+r.note+'</span>':'')+'</div></div><div class="record-amount">'+fmtMoney(r.amount)+'</div><span class="record-edit" data-id="'+r.id+'">✏️</span><span class="record-del" data-id="'+r.id+'">×</span>';
      list.appendChild(card);
    });
  }

  // 菜鸟：标签切换
  (function(){
    var tabs=document.querySelectorAll('#viewCainiao .tab');
    var panels=document.querySelectorAll('#viewCainiao .c-panel');
    tabs.forEach(function(tab){
      tab.addEventListener('click', function(){
        tabs.forEach(function(t){t.classList.remove('active')});
        panels.forEach(function(p){p.classList.remove('active')});
        this.classList.add('active');
        document.getElementById(this.dataset.tab).classList.add('active');
      });
    });
  })();

  // 菜鸟：新增/编辑弹窗
  var cEditingId = null;
  (function(){
    var overlay=$('cModal');
    $('btnAddRecord').addEventListener('click', function(){
      cEditingId = null;
      $('cModal').querySelector('h3').textContent = '新增记录';
      $('cDate').value=fmtDate(new Date()); $('cAccount').value=''; $('cProject').value=''; $('cAmount').value=''; $('cNote').value='';
      overlay.classList.add('show');
    });
    $('cModalClose').addEventListener('click', function(){overlay.classList.remove('show')});
    $('cBtnCancel').addEventListener('click', function(){overlay.classList.remove('show')});
    $('cBtnSave').addEventListener('click', function(){
      var d=$('cDate').value, a=$('cAccount').value.trim(), p=$('cProject').value.trim(), m=parseFloat($('cAmount').value), n=$('cNote').value.trim();
      if(!d||!a||!p||isNaN(m)||m<=0){alert('请填写完整信息');return;}
      var records=loadCRecords();
      if (cEditingId !== null) {
        // 编辑模式
        records = records.map(function(r){ return r.id===cEditingId ? {id:r.id,date:d,account:a,project:p,amount:m,note:n} : r; });
      } else {
        // 新增
        records.push({id:Date.now(),date:d,account:a,project:p,amount:m,note:n});
      }
      saveCRecords(records); overlay.classList.remove('show'); refreshCainiao();
    });
    overlay.addEventListener('click', function(e){if(e.target===overlay)overlay.classList.remove('show')});
  })();

  // 菜鸟：编辑/删除
  $('cRecordsList').addEventListener('click', function(e){
    var id=parseInt(e.target.dataset.id);
    if(e.target.classList.contains('record-edit')){
      var r = loadCRecords().find(function(x){return x.id===id});
      if (!r) return;
      cEditingId = id;
      $('cModal').querySelector('h3').textContent = '编辑记录';
      $('cDate').value=r.date; $('cAccount').value=r.account; $('cProject').value=r.project; $('cAmount').value=r.amount; $('cNote').value=r.note||'';
      $('cModal').classList.add('show');
    } else if(e.target.classList.contains('record-del')){
      if(confirm('确定删除?')){
        var records=loadCRecords().filter(function(r){return r.id!==id});
        saveCRecords(records); refreshCainiao();
      }
    }
  });

  // 菜鸟：导出导入
  $('btnCExport').addEventListener('click', function(){
    var r=loadCRecords(); if(r.length===0){alert('无数据');return;}
    var blob=new Blob([JSON.stringify({v:1,user:'cainiao',exportedAt:new Date().toISOString(),records:r},null,2)],{type:'application/json'});
    var a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='账目记录_菜鸟_'+fmtDate(new Date())+'.json';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    alert('已导出 '+r.length+' 条');
  });
  $('btnCImport').addEventListener('click', function(){ $('cImportFile').click(); });
  $('cImportFile').addEventListener('change', function(e){
    var f=e.target.files[0]; if(!f) return;
    var r=new FileReader();
    r.onload=function(ev){
      try{
        var d=JSON.parse(ev.target.result);
        if(!d.records||!Array.isArray(d.records)) throw new Error();
        var exist=loadCRecords(), ids={}, added=0;
        exist.forEach(function(x){ids[x.id]=true});
        d.records.forEach(function(x){if(!ids[x.id]){exist.push(x);added++}});
        if(added===0){alert('无新记录');}else{saveCRecords(exist);refreshCainiao();alert('已导入 '+added+' 条');}
      }catch(ex){alert('格式错误');}
    };
    r.readAsText(f); e.target.value='';
  });

  // ===== 初始化 =====
  function init() {
    // 恢复上次金价显示
    var gp = loadGoldPrice();
    if (gp.price > 0) { $('goldPrice').textContent = gp.price.toFixed(2); $('goldTime').textContent = gp.time; }
    refreshGold();
    refreshCainiao();
  }

  if (document.readyState==='loading') { document.addEventListener('DOMContentLoaded', init); }
  else { init(); }
})();
