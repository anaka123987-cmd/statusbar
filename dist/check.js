/* ===== 多维矩阵 · 跑团判定（非战斗 d100 对抗，前端算机制 / AI 管叙事） ===== */
(function () {
    if (window.__mxCheckInit) return;
    window.__mxCheckInit = true;

    /* ---------- 配置 ---------- */
    var TIER_VAL = { E: 1, D: 2, C: 4, B: 6, A: 8, S: 10 };
    var TIER_MUL = { E: 1, D: 1, C: 1, B: 1.25, A: 1.25, S: 1.5 };
    var DIFFS = [
        { id: 'easy', label: '轻松', mod: -25 },
        { id: 'normal', label: '常规', mod: 0 },
        { id: 'hard', label: '艰难', mod: 20 },
        { id: 'desp', label: '孤注一掷', mod: 40 }
    ];
    var SKILLS = {
        '侦察':   { attr: '智力', icon: 'fa-magnifying-glass', desc: '搜索环境细节与隐藏物' },
        '聆听':   { attr: '精神', icon: 'fa-headphones',       desc: '捕捉细微声响与偷听' },
        '图书馆': { attr: '智力', icon: 'fa-book-open',        desc: '查阅资料与研究线索' },
        '话术':   { attr: '魅力', icon: 'fa-comments',         desc: '快速说服、欺骗与套话' },
        '说服':   { attr: '魅力', icon: 'fa-handshake',        desc: '取得长期信任与认同' },
        '恐吓':   { attr: '力量', icon: 'fa-fire',             desc: '以威压迫使对方让步' },
        '心理学': { attr: '精神', icon: 'fa-brain',            desc: '洞察情绪、谎言与动机' },
        '追踪':   { attr: '敏捷', icon: 'fa-shoe-prints',      desc: '循痕迹追索目标' },
        '潜行':   { attr: '敏捷', icon: 'fa-user-ninja',       desc: '隐匿行踪、避开耳目' },
        '攀爬':   { attr: '力量', icon: 'fa-mountain-sun',     desc: '翻越障碍与险地' },
        '妙手':   { attr: '敏捷', icon: 'fa-hand-sparkles',    desc: '开锁、扒窃与手技' },
        '急救':   { attr: '智力', icon: 'fa-kit-medical',      desc: '稳定伤势、应急处理' },
        '意志':   { attr: '精神', icon: 'fa-shield-heart',     desc: '对抗恐惧与精神侵蚀' }
    };
    var ATTRS = ['力量', '敏捷', '体质', '智力', '精神', '魅力'];
    var GRADES = ['大失败', '失败', '常规成功', '困难成功', '极难成功', '大成功'];
    var FATE_MAX = 3;
    var LS_KEY = 'mx_checks_v1::';

    /* ---------- 工具 ---------- */
    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
    function num(v, d) { var n = parseFloat(v); return isNaN(n) ? (d || 0) : n; }
    function getPath(o, p) { try { var a = p.split('.'), x = o; for (var i = 0; i < a.length; i++) { if (x == null) return undefined; x = x[a[i]]; } return x; } catch (e) { return undefined; } }
    function setPath(o, p, v) { var a = p.split('.'), x = o; for (var i = 0; i < a.length - 1; i++) { if (x[a[i]] == null || typeof x[a[i]] !== 'object') x[a[i]] = {}; x = x[a[i]]; } x[a[a.length - 1]] = v; }
    function safeId() {
        if (typeof getCurrentMessageId === 'function') { try { var i = Number(getCurrentMessageId()); if (!isNaN(i) && i >= 0) return i; } catch (e) {} }
        if (typeof getLastMessageId === 'function') { try { return getLastMessageId(); } catch (e2) {} }
        return null;
    }
    function readStatData() {
        try {
            var id = safeId();
            if (typeof getVariables === 'function' && id !== null) {
                var v = getVariables({ type: 'message', message_id: id });
                if (v && v.stat_data) return v.stat_data;
            }
        } catch (e) {}
        try {
            if (typeof Mvu !== 'undefined' && Mvu.getMvuData) {
                var d = Mvu.getMvuData({ type: 'message', message_id: 'latest' });
                if (d && d.stat_data) return d.stat_data;
            }
        } catch (e2) {}
        return null;
    }
    function chatKey() {
        try {
            if (typeof SillyTavern !== 'undefined' && SillyTavern.getCurrentChatId) return String(SillyTavern.getCurrentChatId());
        } catch (e) {}
        try {
            if (typeof getChatMessages === 'function') {
                var m = getChatMessages(0);
                var seed = (m && m[0]) ? String(m[0].message_id) + '|' + String(m[0].message || '') : '';
                if (seed) { var h = 5381; for (var i = 0; i < seed.length; i++) h = ((h << 5) + h + seed.charCodeAt(i)) >>> 0; return 'seed' + h.toString(36); }
            }
        } catch (e2) {}
        return '__default__';
    }
    function lsGet() { try { return JSON.parse(localStorage.getItem(LS_KEY + chatKey())) || {}; } catch (e) { return {}; } }
    function lsSet(o) { try { localStorage.setItem(LS_KEY + chatKey(), JSON.stringify(o)); } catch (e) {} }
    function fmtHM(ts) { try { var d = new Date(ts); return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); } catch (e) { return ''; } }

    /* ---------- 数值核心 ---------- */
    function attrOf(sd, name) { return Math.round(num(getPath(sd, '个人档案.战斗属性.' + name), 10)); }
    function arrOf(x) { if (Array.isArray(x)) return x; if (x && typeof x === 'object') return Object.keys(x).map(function (k) { return x[k]; }); return []; }
    function activeQuestOf(sd) {
        var tl = getPath(sd, '任务与日志.任务列表');
        if (!tl) return null;
        var groups = arrOf(tl.分组);
        if (!groups.length) return null;
        var i, j, g, items, it;
        for (i = 0; i < groups.length; i++) {
            g = groups[i]; if (!g) continue;
            items = arrOf(g.条目);
            for (j = 0; j < items.length; j++) {
                var x = items[j]; if (!x) continue;
                var st = String(x.状态 || x.status || '');
                if (/进行中|当前|活跃|ongoing|active|current/i.test(st)) return x;
            }
        }
        for (i = 0; i < groups.length; i++) {
            g = groups[i]; if (!g) continue;
            if (String(g.组名 || '').indexOf('主线') >= 0) {
                it = arrOf(g.条目);
                if (it.length) return it[0];
            }
        }
        it = arrOf(groups[0] && groups[0].条目);
        if (it.length) return it[0];
        return null;
    }
    function questDiffMap(letter) {
        var t = { E: 'easy', D: 'easy', C: 'normal', B: 'hard', A: 'desp', S: 'desp' };
        return t[letter] || null;
    }
    function tierOf(sd) {
        var ov = lsGet().tier;
        if (ov && TIER_VAL[ov]) return ov;
        var t = String(getPath(sd, '任务与日志.任务世界.当前难度等级') || '').trim().toUpperCase();
        var m = t.match(/^([EDCBAS])/) || t.match(/([EDCBAS])\s*(?:级|档)/);
        if (m && TIER_VAL[m[1]]) return m[1];
        var q = activeQuestOf(sd);
        if (q) {
            var qd = String(q.难度 || '').trim().toUpperCase();
            var qm = qd.match(/^([EDCBAS])/) || qd.match(/([EDCBAS])/);
            if (qm && TIER_VAL[qm[1]]) return qm[1];
        }
        return 'C';
    }
    function tierIsOverride() { var ov = lsGet().tier; return !!(ov && TIER_VAL[ov]); }
    function lineOf(tier) { return Math.round((60 + (TIER_VAL[tier] - 1) * 10) * TIER_MUL[tier]); }
    function powerOf(sd, skill) { var s = SKILLS[skill]; return attrOf(sd, s ? s.attr : '智力'); }
    function gradeOf(roll, margin) {
        if (roll <= 5) return 5;
        if (roll >= 96) return 0;
        if (margin >= 40) return 5;
        if (margin >= 15) return 4;
        if (margin >= 5) return 3;
        if (margin >= 0) return 2;
        if (margin >= -40) return 1;
        return 0;
    }
    function successRate(power, line) {
        var n = 0;
        for (var r = 1; r <= 100; r++) {
            if (r <= 5) { n++; continue; }
            if (r >= 96) continue;
            if (r + power >= line) n++;
        }
        return n;
    }
    function resolveSkill(raw) {
        var n = String(raw || '').trim();
        if (SKILLS[n]) return n;
        var keys = Object.keys(SKILLS);
        for (var i = 0; i < keys.length; i++) { if (keys[i].indexOf(n) >= 0 || n.indexOf(keys[i]) >= 0) return keys[i]; }
        return n;
    }
    function diffOf(id) { for (var i = 0; i < DIFFS.length; i++) { if (DIFFS[i].id === id) return DIFFS[i]; } return DIFFS[1]; }
    function autoDiffOf(sd) {
        var q = activeQuestOf(sd);
        if (q) {
            var d = String(q.难度 || '').trim().toUpperCase();
            var m = d.match(/^([EDCBAS])/) || d.match(/([EDCBAS])/);
            if (m) { var mid = questDiffMap(m[1]); if (mid) return mid; }
        }
        return 'normal';
    }
    function activeQuestName(sd) { var q = activeQuestOf(sd); return q ? (q.任务名称 || q.name || '') : ''; }
    function resolveDiff(sd, given) {
        if (given && given !== 'auto') { for (var i = 0; i < DIFFS.length; i++) { if (DIFFS[i].id === given) return given; } }
        return autoDiffOf(sd);
    }
    function doRoll(skill, diffId) {
        var sd = readStatData() || {};
        var diff = diffOf(resolveDiff(sd, diffId));
        var tier = tierOf(sd);
        var line = lineOf(tier) + diff.mod;
        var power = powerOf(sd, skill);
        var roll = 1 + Math.floor(Math.random() * 100);
        var margin = roll + power - line;
        return { skill: skill, attr: SKILLS[skill] ? SKILLS[skill].attr : '智力', power: power, roll: roll, tier: tier, diff: diff.label, line: line, margin: margin, grade: gradeOf(roll, margin), fateUp: 0 };
    }

    /* ---------- 命运点 ---------- */
    function getFate(sd) { return Math.max(0, Math.min(FATE_MAX, Math.round(num(getPath(sd, '个人档案.跑团判定.命运点'), 0)))); }
    function addFate(delta) {
        var id = safeId(); if (id === null) return;
        try {
            if (typeof updateVariablesWith === 'function') {
                updateVariablesWith(function (vv) {
                    if (!vv) return vv;
                    var sd = vv.stat_data = vv.stat_data || {};
                    var cur = Math.round(num(getPath(sd, '个人档案.跑团判定.命运点'), 0));
                    var nv = Math.max(0, Math.min(FATE_MAX, cur + delta));
                    setPath(sd, '个人档案.跑团判定.命运点', nv);
                    return vv;
                }, { type: 'message', message_id: id });
                return;
            }
            if (typeof insertOrAssignVariables === 'function') {
                var sd2 = readStatData() || {};
                var cur2 = Math.round(num(getPath(sd2, '个人档案.跑团判定.命运点'), 0));
                setPath(sd2, '个人档案.跑团判定.命运点', Math.max(0, Math.min(FATE_MAX, cur2 + delta)));
                insertOrAssignVariables({ stat_data: sd2 }, { type: 'message', message_id: id });
            }
        } catch (e) {}
    }

    /* ---------- 历史与注入 ---------- */
    function logCheck(rec, intent) {
        var o = lsGet(); o.log = o.log || [];
        o.log.unshift({ s: rec.skill, r: rec.roll, p: rec.power, l: rec.line, g: rec.grade, t: rec.tier, d: rec.diff, i: String(intent || '').slice(0, 40), ts: Date.now(), f: rec.fateUp || 0 });
        if (o.log.length > 20) o.log.length = 20;
        lsSet(o);
    }
    function gainFateOnAccept(rec) { if (rec.grade === 0 && !rec.fateUp) addFate(1); }
    function buildCheckLine(rec, intent) {
        return '<check skill="' + esc(rec.skill) + '" grade="' + GRADES[rec.grade] + '" roll="' + rec.roll + '" power="' + rec.power + '" line="' + rec.line + '">' + String(intent || '').replace(/\s+/g, ' ').trim() + '</check>';
    }
    function transformTags(text) {
        var t = String(text);
        var re = /\[判定[:：]\s*([^\]|]+?)\s*(?:[|｜]\s*([^\]]+?))?\s*\]/g;
        if (!re.test(t)) return t;
        var intent = t.replace(/\[判定[:：][^\]]*\]/g, '').replace(/［判定[:：][^］]*］/g, '').trim();
        var parts = [];
        t.replace(re, function (all, skill, dl) {
            var dl2 = String(dl || '').trim();
            var diffId = 'auto';
            for (var i = 0; i < DIFFS.length; i++) { if (DIFFS[i].label === dl2) diffId = DIFFS[i].id; }
            var rec = doRoll(resolveSkill(skill), diffId);
            gainFateOnAccept(rec);
            logCheck(rec, intent);
            parts.push(buildCheckLine(rec, intent));
            return '';
        });
        return (intent ? intent + '\n' : '') + parts.join('\n');
    }

    /* ---------- 输入区 UI ---------- */
    function ensureInputUi() {
        var inputBox = document.getElementById('mx-pseudo-input');
        var row = document.querySelector('#mx-console .mx-pseudo-row');
        if (!inputBox || !row) return;
        if (!document.getElementById('mx-pseudo-dice')) {
            var dice = document.createElement('button');
            dice.className = 'mx-pseudo-dice';
            dice.id = 'mx-pseudo-dice';
            dice.type = 'button';
            dice.title = '跑团判定';
            dice.innerHTML = '<i class="fa-solid fa-dice-d20"></i>';
            dice.addEventListener('click', function () {
                var bar = document.getElementById('mx-check-bar');
                if (bar) bar.classList.toggle('collapsed');
                dice.classList.toggle('active');
            });
            var send = document.getElementById('mx-pseudo-send');
            if (send) row.insertBefore(dice, send); else row.appendChild(dice);
        }
        if (!document.getElementById('mx-check-bar')) {
            var bar = document.createElement('div');
            bar.className = 'mx-check-bar';
            bar.id = 'mx-check-bar';
            var html = '';
            Object.keys(SKILLS).forEach(function (name) {
                html += '<button type="button" class="mx-chk-chip" data-skill="' + esc(name) + '" title="' + esc(SKILLS[name].desc) + '"><i class="fa-solid ' + SKILLS[name].icon + '"></i>' + esc(name) + '</button>';
            });
            bar.innerHTML = html;
            var state = document.getElementById('mx-pseudo-state');
            if (state) inputBox.insertBefore(bar, state); else inputBox.appendChild(bar);
            bar.addEventListener('click', function (e) {
                var chip = e.target.closest('.mx-chk-chip');
                if (!chip) return;
                openRollModal(chip.getAttribute('data-skill'), '', 'auto');
            });
        }
    }

    /* ---------- 掷骰弹窗 ---------- */
    var chkState = null;
    function closeModal() {
        var m = document.getElementById('mx-chk-modal');
        if (m) m.remove();
        chkState = null;
    }
    function openRollModal(skill, intent, diffId) {
        closeModal();
        var sd = readStatData() || {};
        chkState = { skill: skill, diffId: resolveDiff(sd, diffId), intent: intent || '', rec: null, fate: getFate(sd), rolling: false };
        var modal = document.createElement('div');
        modal.className = 'mx-chk-modal';
        modal.id = 'mx-chk-modal';
        modal.innerHTML =
            '<div class="mx-chk-mask"></div>' +
            '<div class="mx-chk-card">' +
            '<div class="mx-chk-head"><span class="mx-chk-title"><span class="dot"></span>跑团判定 · ' + esc(skill) + '</span>' +
            '<button class="mx-chk-close" type="button"><i class="fa-solid fa-xmark"></i></button></div>' +
            '<div class="mx-chk-body">' +
            '<div class="mx-chk-skillrow"><span class="mx-chk-skillmeta">判定力 <b id="mx-chk-power">-</b><span id="mx-chk-attr"></span></span></div>' +
            '<div class="mx-chk-context" id="mx-chk-context"></div>' +
            '<textarea class="mx-chk-intent" id="mx-chk-intent" rows="2" placeholder="判定意图：想达成什么？（将随结果一起交给 AI 演绎）"></textarea>' +
            '<div class="mx-chk-rate" id="mx-chk-rate"></div>' +
            '<button class="mx-chk-rollbtn" id="mx-chk-rollbtn" type="button"><i class="fa-solid fa-dice"></i> 掷骰</button>' +
            '<div class="mx-chk-result" id="mx-chk-result" style="display:none">' +
            '<div class="mx-chk-num" id="mx-chk-num">0</div>' +
            '<div class="mx-chk-grade" id="mx-chk-grade"></div>' +
            '<div class="mx-chk-detail" id="mx-chk-detail"></div>' +
            '<div class="mx-chk-fatenote" id="mx-chk-fatenote"></div>' +
            '<div class="mx-chk-btnrow">' +
            '<button class="mx-chk-mini" id="mx-chk-reroll" type="button"><i class="fa-solid fa-rotate-right"></i> 命运点重骰</button>' +
            '<button class="mx-chk-mini" id="mx-chk-up" type="button"><i class="fa-solid fa-arrow-up"></i> 命运点提档</button>' +
            '</div><div class="mx-chk-btnrow">' +
            '<button class="mx-chk-fill" id="mx-chk-fill" type="button"><i class="fa-solid fa-pen-to-square"></i> 填入输入框</button>' +
            '<button class="mx-chk-mini" id="mx-chk-again" type="button"><i class="fa-solid fa-dice"></i> 重新判定</button>' +
            '</div></div>' +
            '</div></div>';
        document.body.appendChild(modal);

        modal.querySelector('#mx-chk-intent').value = chkState.intent;
        modal.querySelector('#mx-chk-intent').addEventListener('input', function () { chkState.intent = this.value; });
        modal.querySelector('.mx-chk-close').addEventListener('click', closeModal);
        modal.querySelector('.mx-chk-mask').addEventListener('click', closeModal);
        modal.querySelector('#mx-chk-rollbtn').addEventListener('click', startRoll);
        modal.querySelector('#mx-chk-reroll').addEventListener('click', function () {
            if (!chkState || !chkState.rec || chkState.rolling) return;
            if (chkState.fate < 1) return;
            chkState.fate -= 1; addFate(-1);
            startRoll();
        });
        modal.querySelector('#mx-chk-up').addEventListener('click', function () {
            if (!chkState || !chkState.rec || chkState.rolling) return;
            if (chkState.fate < 1 || chkState.rec.grade >= 4) return;
            chkState.fate -= 1; addFate(-1);
            chkState.rec.grade += 1;
            chkState.rec.fateUp = 1;
            showResult();
        });
        modal.querySelector('#mx-chk-again').addEventListener('click', function () { hideResult(); updateRate(); });
        modal.querySelector('#mx-chk-fill').addEventListener('click', function () {
            if (!chkState || !chkState.rec) return;
            var rec = chkState.rec;
            gainFateOnAccept(rec);
            logCheck(rec, chkState.intent);
            var line = buildCheckLine(rec, chkState.intent);
            var input = document.getElementById('mx-pseudo-text');
            if (input) {
                input.value = line;
                input.focus();
                try { input.setSelectionRange(input.value.length, input.value.length); } catch (e) {}
            }
            var st = document.getElementById('mx-pseudo-state');
            if (st) st.textContent = '已填入判定结果，可修改后发送';
            closeModal();
            renderCheckPage();
        });
        updateRate();
    }
    function hideResult() {
        var box = document.getElementById('mx-chk-result');
        if (box) box.style.display = 'none';
        if (chkState) chkState.rec = null;
    }
    function updateRate() {
        if (!chkState) return;
        var sd = readStatData() || {};
        var tier = tierOf(sd);
        var curDiff = diffOf(chkState.diffId);
        var autoId = autoDiffOf(sd);
        var isAuto = (chkState.diffId === autoId);
        var line = lineOf(tier) + curDiff.mod;
        var power = powerOf(sd, chkState.skill);
        var rate = successRate(power, line);
        var pEl = document.getElementById('mx-chk-power');
        var aEl = document.getElementById('mx-chk-attr');
        if (pEl) pEl.textContent = power;
        if (aEl) aEl.textContent = '（' + (SKILLS[chkState.skill] ? SKILLS[chkState.skill].attr : '智力') + '）';
        var ctxEl = document.getElementById('mx-chk-context');
        if (ctxEl) {
            var qName = activeQuestName(sd);
            var src = isAuto ? (qName ? '当前任务：' + esc(qName) : '当前任务派生') : 'AI 选项标签指定';
            ctxEl.innerHTML = '副本档位 <b class="mx-chk-tierbadge tb-' + tier + '">' + tier + '</b> 场景难度 <b>' + curDiff.label + '</b>（' + (curDiff.mod > 0 ? '+' : '') + curDiff.mod + '）<span class="mx-chk-ov">（' + src + '）</span>';
        }
        var rEl = document.getElementById('mx-chk-rate');
        if (rEl) rEl.innerHTML = '难度线 <b>' + line + '</b> ｜ 成功率 <b>' + rate + '%</b> ｜ 命运点 <b>' + chkState.fate + '</b>/' + FATE_MAX;
    }
    function startRoll() {
        if (!chkState || chkState.rolling) return;
        chkState.rolling = true;
        var btn = document.getElementById('mx-chk-rollbtn');
        if (btn) btn.disabled = true;
        var box = document.getElementById('mx-chk-result');
        var numEl = document.getElementById('mx-chk-num');
        var gradeEl = document.getElementById('mx-chk-grade');
        if (box) { box.style.display = ''; }
        if (gradeEl) { gradeEl.textContent = ''; gradeEl.className = 'mx-chk-grade'; }
        if (numEl) { numEl.className = 'mx-chk-num rolling'; }
        var times = 0;
        var iv = setInterval(function () {
            if (numEl) numEl.textContent = String(1 + Math.floor(Math.random() * 100));
            times++;
            if (times >= 8) {
                clearInterval(iv);
                chkState.rec = doRoll(chkState.skill, chkState.diffId);
                chkState.rolling = false;
                if (btn) btn.disabled = false;
                showResult();
            }
        }, 80);
    }
    function showResult() {
        if (!chkState || !chkState.rec) return;
        var rec = chkState.rec;
        var numEl = document.getElementById('mx-chk-num');
        var gradeEl = document.getElementById('mx-chk-grade');
        var detEl = document.getElementById('mx-chk-detail');
        var noteEl = document.getElementById('mx-chk-fatenote');
        if (numEl) { numEl.textContent = String(rec.roll); numEl.className = 'mx-chk-num settle'; }
        if (gradeEl) { gradeEl.textContent = GRADES[rec.grade] + (rec.fateUp ? '（命运提档）' : ''); gradeEl.className = 'mx-chk-grade g' + rec.grade + ' pop'; }
        if (detEl) detEl.textContent = 'd100=' + rec.roll + ' + ' + rec.attr + rec.power + ' = ' + (rec.roll + rec.power) + ' ｜ 难度线 ' + rec.line + '（' + rec.tier + '·' + rec.diff + '）｜ 裕度 ' + (rec.margin >= 0 ? '+' : '') + rec.margin;
        if (noteEl) noteEl.textContent = (rec.grade === 0) ? '大失败：发送后将获得 1 命运点（上限 ' + FATE_MAX + '）' : '';
        var upBtn = document.getElementById('mx-chk-up');
        var rrBtn = document.getElementById('mx-chk-reroll');
        if (upBtn) upBtn.disabled = (chkState.fate < 1 || rec.grade >= 4);
        if (rrBtn) rrBtn.disabled = (chkState.fate < 1);
        updateRate();
    }

    /* ---------- 判定子页面 ---------- */
    function ensurePage() {
        var tabs = document.getElementById('neb-tabs');
        if (!tabs) return;
        if (!document.getElementById('page-check')) {
            var tab = document.createElement('div');
            tab.className = 'neb-tab';
            tab.dataset.page = 'check';
            tab.textContent = '判定';
            tabs.appendChild(tab);
            tab.addEventListener('click', function () { setTimeout(renderCheckPage, 0); });
            var body = tabs.parentElement && tabs.parentElement.querySelector('.neb-body');
            if (body) {
                var pg = document.createElement('div');
                pg.className = 'neb-page';
                pg.id = 'page-check';
                body.appendChild(pg);
            }
        }
    }
    function luckText(avg) {
        if (avg >= 15) return '手气爆棚';
        if (avg >= 0) return '手气尚可';
        if (avg >= -15) return '手气平平';
        return '水逆当头';
    }
    function renderCheckPage() {
        var el = document.getElementById('page-check');
        if (!el) return;
        var sd = readStatData() || {};
        var tier = tierOf(sd);
        var tierLine = lineOf(tier);
        var autoDiffId = autoDiffOf(sd);
        var autoDiff = diffOf(autoDiffId);
        var qName = activeQuestName(sd);
        var fate = getFate(sd);
        var fateDots = '';
        for (var i = 0; i < FATE_MAX; i++) fateDots += (i < fate ? '●' : '○');
        var attrHtml = ATTRS.map(function (a) { return '<div class="neb-attr"><div class="an">' + a + '</div><div class="av">' + attrOf(sd, a) + '</div></div>'; }).join('');
        var rows = Object.keys(SKILLS).map(function (name) {
            var s = SKILLS[name];
            var power = attrOf(sd, s.attr);
            var rate = successRate(power, tierLine);
            return '<div class="mx-chk-srow" data-skill="' + esc(name) + '" title="' + esc(s.desc) + '">' +
                '<span class="si"><i class="fa-solid ' + s.icon + '"></i></span>' +
                '<span class="sn">' + esc(name) + '<em>' + s.attr + '</em></span>' +
                '<span class="sv">' + power + '</span>' +
                '<span class="sb"><i style="width:' + Math.min(100, rate) + '%"></i></span>' +
                '<span class="sp">' + rate + '%</span>' +
                '</div>';
        }).join('');
        var log = (lsGet().log || []);
        var logHtml = log.length ? log.map(function (x) {
            return '<div class="mx-chk-logrow"><span class="mx-chk-grade g' + x.g + ' sm">' + GRADES[x.g] + (x.f ? '↑' : '') + '</span>' +
                '<span class="lc">' + esc(x.s) + ' d100=' + x.r + '+' + x.p + '＝' + (x.r + x.p) + '/' + x.l + '</span>' +
                (x.i ? '<span class="li">' + esc(x.i) + '</span>' : '') +
                '<span class="lt">' + fmtHM(x.ts) + '</span></div>';
        }).join('') : '<div class="neb-empty">暂无判定记录</div>';
        var luck = '—';
        if (log.length) {
            var sum = 0;
            log.forEach(function (x) { sum += (x.r + x.p) - x.l; });
            luck = (sum >= 0 ? '+' : '') + Math.round(sum / log.length) + '（' + luckText(sum / log.length) + '）';
        }
        el.innerHTML =
            '<div class="neb-card"><div class="neb-card-title">副本难度</div>' +
            '<div class="mx-chk-tierline">副本档位 <b class="mx-chk-tierbadge tb-' + tier + '">' + tier + '</b> 基础难度线 <b>' + tierLine + '</b>' +
            (tierIsOverride() ? '<span class="mx-chk-ov">（手动覆盖）</span>' : '<span class="mx-chk-ov">（来自 任务世界.当前难度等级）</span>') + '</div>' +
            '<div class="mx-chk-tierline">当前任务 <b>' + esc(qName || '未检测到') + '</b>' + (qName ? ' → 派生场景难度 <b>' + autoDiff.label + '</b>（行动修正 ' + (autoDiff.mod > 0 ? '+' : '') + autoDiff.mod + '）' : '') + '</div>' +
            '<div class="mx-chk-hint">副本档位由 AI 维护于 任务与日志.任务世界.当前难度等级（E/D/C/B/A/S，B/A 档难度线 ×1.25、S 档 ×1.5）；场景难度由前端识别 任务列表 中<b>状态为"进行中"</b>的任务、按其 难度 映射（E/D→轻松、C→常规、B→艰难、A/S→孤注一掷）。选项标签 [判定:技能\|难度] 可临时覆盖。</div></div>' +
            '<div class="neb-card"><div class="neb-card-title">六维判定力</div><div class="neb-attr-grid">' + attrHtml + '</div></div>' +
            '<div class="neb-card"><div class="neb-card-title">技能总览 <span class="mx-chk-sub">常规难度 · 对当前副本线</span></div>' +
            '<div class="mx-chk-srows">' + rows + '</div></div>' +
            '<div class="neb-card"><div class="neb-card-title">命运点 <span class="mx-chk-fatedots">' + fateDots + '</span></div>' +
            '<div class="mx-chk-hint">大失败时 +1（上限 ' + FATE_MAX + '）；掷骰后可花 1 点<b>重骰</b>或<b>提档</b>（最高提至极难成功）。</div></div>' +
            '<div class="neb-card"><div class="neb-card-title">判定日志 <span class="mx-chk-sub">手气 ' + luck + '</span></div>' + logHtml + '</div>';
    }

    /* ---------- 选项联动 ---------- */
    function bindOptionIntercept() {
        document.body.addEventListener('click', function (e) {
            var btn = e.target.closest('#mx-options-body [data-opt]');
            if (!btn) return;
            var opt = btn.getAttribute('data-opt') || '';
            var m = opt.match(/\[判定[:：]\s*([^\]|]+?)\s*(?:[|｜]\s*([^\]]+?))?\s*\]/);
            if (!m) return;
            e.stopPropagation();
            e.preventDefault();
            var diffLabel = String(m[2] || '').trim();
            var diffId = '';
            if (diffLabel) { for (var i = 0; i < DIFFS.length; i++) { if (DIFFS[i].label === diffLabel) diffId = DIFFS[i].id; } }
            var intent = opt.replace(/\s*[［[]判定[:：][^\]］]*[\]］]\s*/g, '').trim();
            openRollModal(resolveSkill(m[1].trim()), intent, diffId);
        }, true);
    }
    function stripOptionTags() {
        var btns = document.querySelectorAll('#mx-options-body [data-opt]');
        btns.forEach(function (b) {
            if (b.getAttribute('data-chk') === '1') return;
            var txt = b.querySelector('.opt-txt');
            if (!txt) { b.setAttribute('data-chk', '1'); return; }
            var raw = txt.textContent || '';
            if (raw.indexOf('［判定') >= 0 || raw.indexOf('[判定') >= 0) {
                txt.textContent = raw.replace(/\s*[［[]判定[:：][^\]］]*[\]］]\s*/g, '').trim();
                var ic = document.createElement('i');
                ic.className = 'fa-solid fa-dice opt-dice-ico';
                txt.appendChild(ic);
            }
            b.setAttribute('data-chk', '1');
        });
    }

    /* ---------- submit 包装 ---------- */
    function wrapSubmit() {
        if (typeof window.submitMxAction !== 'function') return;
        var orig = window.submitMxAction;
        window.submitMxAction = function (text, source) {
            var t = String(text || '');
            if (t.indexOf('[判定') >= 0 || t.indexOf('［判定') >= 0) t = transformTags(t);
            return orig.call(window, t, source);
        };
    }

    /* ---------- 启动 ---------- */
    function boot() {
        ensureInputUi();
        ensurePage();
        bindOptionIntercept();
        stripOptionTags();
        wrapSubmit();
        renderCheckPage();
        document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });
        if (typeof eventOn === 'function') {
            eventOn('mx:pseudo-layer-updated', function () { renderCheckPage(); });
        }
        if (window.MutationObserver) {
            var ob = document.getElementById('mx-options-body');
            if (ob) new MutationObserver(function () { stripOptionTags(); }).observe(ob, { childList: true });
        }
        setInterval(stripOptionTags, 3000);
    }
    if (typeof waitGlobalInitialized === 'function') {
        waitGlobalInitialized('Mvu').then(boot).catch(function () { boot(); });
    } else {
        setTimeout(boot, 300);
    }

    window.__mxCheck = { roll: doRoll, skills: SKILLS, open: openRollModal, refresh: renderCheckPage };
})();
