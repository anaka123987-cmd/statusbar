
/* ===== 队友状态栏 · 解析 / 分组 / 持久化（挂靠聊天） ===== */
(function() {
    if (window.__mxTeammatesInit) return;
    window.__mxTeammatesInit = true;

    var POLL_MS = 1000;
    var LS_PREFIX = 'mx_teammates_v1::';
    var lastRawText = null;
    var selectedName = null;
    var renamingGid = null;        /* 正在重命名的分组 id */
    var confirmingGid = null;      /* 正在确认删除的分组 id */
    var confirmingMember = false;  /* 角色删除二次确认 */
    var pendingRender = false;
    var chatKeyCache = null;
    var lastSyncInfo = null;
    var armedTimers = {};
    var backdropEl = null;

    /* ---------- 工具 ---------- */
    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"]/g, function(c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
        });
    }
    function hashStr(s) {
        var h = 5381;
        s = String(s);
        for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
        return h.toString(36);
    }
    function fmtTime(ts) {
        try { return new Date(ts).toLocaleString('zh-CN', { hour12: false }); } catch (e) { return '-'; }
    }
    function curFloor() {
        try {
            if (typeof getCurrentMessageId === 'function') {
                var n = Number(getCurrentMessageId());
                if (!isNaN(n)) return n;
            }
        } catch (e) {}
        return null;
    }

    /* ---------- 聊天标识（数据挂靠当前聊天） ---------- */
    function getChatKey() {
        if (chatKeyCache) return chatKeyCache;
        var key = null;
        try {
            if (typeof SillyTavern !== 'undefined' && SillyTavern.getCurrentChatId) {
                key = SillyTavern.getCurrentChatId();
            }
        } catch (e) {}
        if (!key) {
            try {
                if (typeof getChatMessages === 'function') {
                    var m = getChatMessages(0);
                    var seed = (m && m[0]) ? String(m[0].message_id) + '|' + String(m[0].message || '') : '';
                    if (seed) key = 'seed_' + hashStr(seed);
                }
            } catch (e2) {}
        }
        chatKeyCache = key || '__default__';
        return chatKeyCache;
    }

    /* ---------- 本地存储 ---------- */
    function blankDB() { return { v: 1, groups: {}, members: {}, removed: {}, ui: { collapsed: {} } }; }
    function loadDB() {
        try {
            var raw = localStorage.getItem(LS_PREFIX + getChatKey());
            if (raw) {
                var d = JSON.parse(raw);
                if (d && typeof d === 'object') {
                    return {
                        v: 1,
                        groups: (d.groups && typeof d.groups === 'object') ? d.groups : {},
                        members: (d.members && typeof d.members === 'object') ? d.members : {},
                        removed: (d.removed && typeof d.removed === 'object') ? d.removed : {},
                        ui: (d.ui && typeof d.ui === 'object' && d.ui.collapsed && typeof d.ui.collapsed === 'object') ? d.ui : { collapsed: {} }
                    };
                }
            }
        } catch (e) {}
        return blankDB();
    }
    function saveDB(db) {
        try { localStorage.setItem(LS_PREFIX + getChatKey(), JSON.stringify(db)); } catch (e) {}
    }

    /* ---------- 解析 <stu> 与 [名字|性别|阶位|阵营|强化等级|主神好感度区间|位置|状态] ---------- */
    function extractStu(rawText) {
        var m = String(rawText || '').match(/<stu>([\s\S]*?)<\/stu>/g);
        return m ? m[m.length - 1].replace(/<\/?stu>/g, '') : null;   /* 只取最后一组 */
    }
    function parseMembers(text) {
        var out = [];
        if (!text) return out;
        var re = /[\[［]([^\[\]［］]*?)[\]］]/g;   /* 兼容中英文括号 */
        var hit;
        while ((hit = re.exec(String(text))) !== null) {
            var parts = hit[1].split(/[|｜]/);       /* 兼容中英文竖线 */
            if (parts.length !== 8) continue;        /* 必须恰好 7 个分隔符 */
            var vals = parts.map(function(s) { return s.trim(); });
            if (!vals[0]) continue;
            out.push({
                name: vals[0], gender: vals[1], rank: vals[2], faction: vals[3],
                enhance: vals[4], favor: vals[5], location: vals[6], status: vals[7]
            });
        }
        return out;
    }

    /* ---------- MVU 世界信息 ---------- */
    function readWorld() {
        var empty = { inst: null, wname: null };
        var sd = null;
        try {
            if (typeof Mvu !== 'undefined' && typeof Mvu.getMvuData === 'function') {
                var mid = (typeof getCurrentMessageId === 'function') ? getCurrentMessageId() : 'latest';
                var d = Mvu.getMvuData({ type: 'message', message_id: mid });
                sd = (typeof _ !== 'undefined' && typeof _.get === 'function') ? _.get(d, 'stat_data') : (d && d.stat_data);
            }
        } catch (e) { sd = null; }
        /* 当前层没有 stat_data（用户楼/伪楼层/MVU 未初始化楼层）时，
           从最新楼层倒序找最后一条带 stat_data 的消息，与战斗引擎 fetchStatData 同策略 */
        if (!sd) {
            try {
                if (typeof getChatMessages === 'function') {
                    var lid = (typeof getLastMessageId === 'function') ? Number(getLastMessageId()) : NaN;
                    if (isNaN(lid) || lid < 0) {
                        try { var cid = (typeof getCurrentMessageId === 'function') ? Number(getCurrentMessageId()) : NaN; if (!isNaN(cid)) lid = cid; } catch (eC) {}
                    }
                    var msgs = (!isNaN(lid) && lid >= 0) ? getChatMessages('0-' + lid) : null;
                    if (msgs && msgs.length) {
                        for (var i = msgs.length - 1; i >= 0; i--) {
                            var m = msgs[i];
                            var cand = (m && m.data && m.data.stat_data) || (m && m.stat_data);
                            if (cand) { sd = cand; break; }
                        }
                    }
                }
            } catch (e2) { sd = sd || null; }
        }
        if (!sd || typeof _.get !== 'function') return empty;
        try {
            var inst = _.get(sd, '任务与日志.任务世界.副本实例id');
            var wname = _.get(sd, '任务与日志.任务世界.世界名称');
            return {
                inst: (inst === undefined || inst === null || String(inst).trim() === '') ? null : String(inst).trim(),
                wname: (wname === undefined || wname === null || String(wname).trim() === '') ? null : String(wname).trim()
            };
        } catch (e3) { return empty; }
    }

    /* ---------- 分组归类 ---------- */
    function effectiveGroup(db, m) {
        if (m.manualGroup === 'ungrouped') return 'ungrouped';
        if (m.manualGroup && db.groups[m.manualGroup]) return m.manualGroup;
        if (m.instanceId && db.groups[m.instanceId]) return m.instanceId;
        return 'ungrouped';
    }
    function groupName(db, gid) {
        if (gid === 'ungrouped') return '无分组';
        var g = db.groups[gid];
        return g ? g.name : '未知分组';
    }

    /* ---------- 同步：楼层正文 -> 名册 ---------- */
    function syncFromMessage(floorId, rawText, scanMode, worldOverride) {
        var db = loadDB();
        var world = worldOverride || readWorld();
        var block = extractStu(rawText);
        var list = parseMembers(block !== null ? block : rawText);
        var changed = false;

        /* 新副本实例 -> 新分组（组名取当时的世界名称，此后不自动变更） */
        if (world.inst && !db.groups[world.inst]) {
            db.groups[world.inst] = { id: world.inst, name: world.wname || ('副本 ' + world.inst), createdAt: Date.now() };
            changed = true;
        }
        list.forEach(function(c) {
            var rm = db.removed[c.name];
            if (rm !== undefined && floorId <= rm) return;      /* 已删除，且未在更新的楼层重新出现 */
            if (rm !== undefined) { delete db.removed[c.name]; changed = true; }
            var old = db.members[c.name];
            if (!old) {
                db.members[c.name] = {
                    name: c.name, gender: c.gender, rank: c.rank, faction: c.faction,
                    enhance: c.enhance, favor: c.favor, location: c.location, status: c.status,
                    instanceId: world.inst, manualGroup: null,
                    firstFloor: floorId, firstTime: Date.now(),
                    lastFloor: floorId, lastTime: Date.now()
                };
                changed = true;
            } else {
                if (!scanMode || floorId >= (old.lastFloor || 0)) {
                    ['gender', 'rank', 'faction', 'enhance', 'favor', 'location', 'status'].forEach(function(k) { old[k] = c[k]; });
                    if (old.lastFloor !== floorId) { old.lastFloor = floorId; old.lastTime = Date.now(); }
                }
                if (!scanMode && world.inst && old.instanceId !== world.inst) old.instanceId = world.inst;
                changed = true;
            }
        });
        if (changed) saveDB(db);
        lastSyncInfo = { floor: floorId, detected: list.length, world: world, viaStu: block !== null };
        return changed;
    }

    /* ---------- 展示辅助 ---------- */
    function statusLed(status) {
        var s = String(status || '');
        if (/健康|正常|良好|满状态|无伤|巅峰/.test(s)) return 'led-green';
        if (/伤|毒|昏迷|濒死|异常|虚弱|疲惫|失血|诅咒|重创|死亡|阵亡/.test(s)) return 'led-red';
        return 'led-yellow';
    }
    function genderIcon(g) {
        var s = String(g || '');
        if (/^男/.test(s)) return 'fa-person';
        if (/^女/.test(s)) return 'fa-person-dress';
        return 'fa-user';
    }
    function kv(k, v) {
        var val = (v === undefined || v === null || String(v).trim() === '') ? '-' : v;
        return '<div class="tm-kv"><span class="k">' + esc(k) + '</span><span class="v">' + esc(val) + '</span></div>';
    }

    /* ---------- 渲染 ---------- */
    function renderStats(db) {
        var el = document.getElementById('tm-stats');
        if (!el) return;
        var total = Object.keys(db.members).length;
        var gcount = Object.keys(db.groups).length;
        el.innerHTML =
            '<span class="tm-stat-pill"><i class="fa-solid fa-user-group"></i>' + total + ' 名队友</span>' +
            '<span class="tm-stat-pill"><i class="fa-solid fa-dungeon"></i>' + gcount + ' 个副本分组</span>';
    }
    function renderSync(db) {
        var el = document.getElementById('tm-sync');
        if (!el) return;
        if (!lastSyncInfo) {
            el.innerHTML = '<span class="neb-led led-yellow tm-led"></span><span>正在监听楼层中的队友信息...</span>';
            return;
        }
        var w = lastSyncInfo.world;
        var wtxt = w.inst
            ? '当前副本：<b>' + esc(groupName(db, w.inst)) + '</b>（实例 ' + esc(w.inst) + '）'
            : '未检测到副本实例，新队友将进入无分组';
        el.innerHTML =
            '<span class="neb-led led-green tm-led"></span>' +
            '<span>楼层 #' + esc(lastSyncInfo.floor) + ' · 识别到 ' + esc(lastSyncInfo.detected) + ' 名队友' +
            (lastSyncInfo.viaStu ? '（&lt;stu&gt; 标签）' : '（正文 [ ] 格式）') + '</span>' +
            '<span class="tm-gid">' + wtxt + '</span>';
    }
    function memberCard(db, m, active) {
        return '<div class="tm-member' + (active ? ' active' : '') + '" data-name="' + esc(m.name) + '">' +
            '<div class="tm-mavatar"><i class="fa-solid ' + genderIcon(m.gender) + '"></i></div>' +
            '<div class="tm-mmain">' +
            '<div class="tm-mname"><span class="tm-nm">' + esc(m.name) + '</span>' +
            (m.rank ? '<span class="tm-mrank">' + esc(m.rank) + '</span>' : '') + '</div>' +
            '<div class="tm-mmeta">' +
            (m.location ? '<span><i class="fa-solid fa-location-dot"></i>' + esc(m.location) + '</span>' : '') +
            (m.faction ? '<span><i class="fa-solid fa-flag"></i>' + esc(m.faction) + '</span>' : '') +
            (m.enhance ? '<span><i class="fa-solid fa-arrow-up-right-dots"></i>' + esc(m.enhance) + '</span>' : '') +
            '</div>' +
            '<div class="tm-mstatus"><span class="neb-led ' + statusLed(m.status) + '"></span>' + esc(m.status || '状态未知') + '</div>' +
            '</div>' +
            '<i class="fa-solid fa-chevron-right tm-mgo"></i>' +
            '</div>';
    }
    function groupCard(db, gid) {
        var members = Object.keys(db.members).filter(function(n) { return effectiveGroup(db, db.members[n]) === gid; });
        var isUngrouped = gid === 'ungrouped';
        var collapsed = !!(db.ui && db.ui.collapsed && db.ui.collapsed[gid]);
        var open = !collapsed;
        var head;
        if (renamingGid === gid && !isUngrouped) {
            head = '<div class="tm-group-head">' +
                '<i class="fa-solid fa-chevron-right tm-arrow"></i>' +
                '<div class="tm-gicon"><i class="fa-solid fa-dungeon"></i></div>' +
                '<input class="tm-rename-input" id="tm-rename-input" value="' + esc(groupName(db, gid)) + '">' +
                '<span class="tm-gcount">' + members.length + ' 人</span>' +
                '<span class="tm-gact">' +
                '<button class="tm-mini-btn" data-act="rename-ok" title="确认改名"><i class="fa-solid fa-check"></i></button>' +
                '<button class="tm-mini-btn tm-danger" data-act="rename-cancel" title="取消"><i class="fa-solid fa-xmark"></i></button>' +
                '</span></div>';
        } else {
            head = '<div class="tm-group-head" data-act="toggle">' +
                '<i class="fa-solid fa-chevron-right tm-arrow"></i>' +
                '<div class="tm-gicon"><i class="fa-solid ' + (isUngrouped ? 'fa-inbox' : 'fa-dungeon') + '"></i></div>' +
                '<span class="tm-gname">' + esc(groupName(db, gid)) + '</span>' +
                (isUngrouped ? '' : '<span class="tm-gid">' + esc(gid) + '</span>') +
                '<span class="tm-gcount">' + members.length + ' 人</span>' +
                (isUngrouped ? '' :
                    '<span class="tm-gact">' +
                    '<button class="tm-mini-btn" data-act="rename" title="重命名分组"><i class="fa-solid fa-pen"></i></button>' +
                    '<button class="tm-mini-btn tm-danger" data-act="delgroup" title="删除分组（成员进入无分组）"><i class="fa-solid fa-trash-can"></i></button>' +
                    '</span>') +
                '</div>';
        }
        var confirmBar = (confirmingGid === gid) ?
            '<div class="tm-confirm-bar"><i class="fa-solid fa-triangle-exclamation"></i>' +
            '<span>确认删除分组「' + esc(groupName(db, gid)) + '」？组内 ' + members.length + ' 名队友将进入无分组。</span>' +
            '<button class="tm-cbtn" data-act="delgroup-yes">删除</button>' +
            '<button class="tm-cbtn tm-cancel" data-act="delgroup-no">取消</button></div>' : '';
        var inner = members.length
            ? '<div class="tm-members">' + members.map(function(n) { return memberCard(db, db.members[n], n === selectedName); }).join('') + '</div>'
            : '<div class="tm-empty-inline">暂无队友</div>';
        return '<div class="tm-group' + (open ? ' open' : '') + '" data-gid="' + esc(gid) + '">' + head + confirmBar +
            '<div class="tm-group-body">' + inner + '</div></div>';
    }
    function renderBody(db) {
        var body = document.getElementById('tm-body');
        if (!body) return;
        if (!Object.keys(db.members).length) {
            body.innerHTML =
                '<div class="tm-empty-hero"><i class="fa-solid fa-user-group"></i>' +
                '<div>暂未登记任何队友</div>' +
                '<div class="tm-empty-sub">当楼层出现 &lt;stu&gt;…&lt;/stu&gt; 标签，或正文中的 [名字|性别|阶位|阵营|强化等级|主神好感度区间|位置|状态] 格式时，队友会被自动登记并按副本实例分组</div>' +
                '</div>';
            return;
        }
        var html = '';
        Object.keys(db.groups).forEach(function(gid) { html += groupCard(db, gid); });
        html += groupCard(db, 'ungrouped');
        body.innerHTML = html;
    }
    function renderDetail(db) {
        var el = document.getElementById('tm-detail');
        if (!el) return;
        var m = selectedName ? db.members[selectedName] : null;
        if (!m) {
            el.classList.remove('show');
            el.innerHTML = '';
            hideBackdrop();
            return;
        }
        var eg = effectiveGroup(db, m);
        var moveOptions = '<option value="ungrouped"' + (eg === 'ungrouped' ? ' selected' : '') + '>无分组</option>';
        Object.keys(db.groups).forEach(function(gid) {
            moveOptions += '<option value="' + esc(gid) + '"' + (eg === gid ? ' selected' : '') + '>' + esc(groupName(db, gid)) + '</option>';
        });
        var autoBtn = (m.manualGroup !== null)
            ? '<button class="tm-btn" data-act="member-auto"><i class="fa-solid fa-rotate-left"></i>恢复自动归类</button>'
            : '';
        var delBtn = confirmingMember
            ? '<button class="tm-btn tm-btn-danger" data-act="member-del-yes"><i class="fa-solid fa-check"></i>确认删除</button>' +
              '<button class="tm-btn" data-act="member-del-no"><i class="fa-solid fa-xmark"></i>取消</button>'
            : '<button class="tm-btn tm-btn-danger" data-act="member-del"><i class="fa-solid fa-user-slash"></i>删除角色</button>';
        el.innerHTML =
            '<button class="neb-detail-close" data-act="detail-close" title="关闭"><i class="fa-solid fa-xmark"></i></button>' +
            '<div class="neb-card-title">队友详情</div>' +
            '<div class="tm-d-head">' +
            '<div class="tm-d-avatar"><i class="fa-solid ' + genderIcon(m.gender) + '"></i></div>' +
            '<div style="min-width:0">' +
            '<div class="tm-d-name"><span class="tm-nm">' + esc(m.name) + '</span>' +
            (m.rank ? '<span class="tm-mrank">' + esc(m.rank) + '</span>' : '') +
            (m.status ? '<span class="tm-mstatus"><span class="neb-led ' + statusLed(m.status) + '"></span>' + esc(m.status) + '</span>' : '') +
            '</div>' +
            '<div class="tm-mmeta">' +
            (m.faction ? '<span><i class="fa-solid fa-flag"></i>' + esc(m.faction) + '</span>' : '') +
            (m.enhance ? '<span><i class="fa-solid fa-arrow-up-right-dots"></i>强化 ' + esc(m.enhance) + '</span>' : '') +
            (m.favor ? '<span><i class="fa-solid fa-heart"></i>' + esc(m.favor) + '</span>' : '') +
            '</div></div></div>' +
            '<div class="tm-d-kvs">' +
            kv('性别', m.gender) + kv('阶位', m.rank) + kv('阵营', m.faction) +
            kv('强化等级', m.enhance) + kv('主神好感度区间', m.favor) + kv('位置', m.location) +
            kv('当前状态', m.status) +
            kv('副本实例 ID', m.instanceId || '无') +
            kv('所属分组', groupName(db, eg)) +
            kv('首次记录', '楼层 #' + m.firstFloor + ' · ' + fmtTime(m.firstTime)) +
            kv('最近更新', '楼层 #' + m.lastFloor + ' · ' + fmtTime(m.lastTime)) +
            '</div>' +
            renderCombatBlock(db, m) +
            '<div class="tm-actions">' +
            '<select class="tm-select" id="tm-move-select">' + moveOptions + '</select>' +
            '<button class="tm-btn" data-act="member-move"><i class="fa-solid fa-right-left"></i>移动到该分组</button>' +
            autoBtn + delBtn +
            '</div>';
        el.classList.add('show');
        showBackdrop();
    }
    function render() {
        var db = loadDB();
        renderStats(db);
        renderSync(db);
        renderBody(db);
        renderDetail(db);
    }

    /* ---------- 移动端遮罩 ---------- */
    function ensureBackdrop() {
        if (backdropEl && backdropEl.isConnected) return backdropEl;
        backdropEl = document.getElementById('tm-backdrop');
        if (!backdropEl) {
            backdropEl = document.createElement('div');
            backdropEl.id = 'tm-backdrop';
            document.body.appendChild(backdropEl);
        }
        return backdropEl;
    }
    function showBackdrop() {
        var root = document.getElementById('mx-console');
        var isMobile = !!(root && root.classList && root.classList.contains && root.classList.contains('mx-mobile'));
        ensureBackdrop().classList.toggle('show', isMobile);
    }
    function hideBackdrop() {
        if (backdropEl && backdropEl.classList) backdropEl.classList.remove('show');
    }

    /* ---------- 操作 ---------- */
    function focusRename() {
        setTimeout(function() {
            var input = document.getElementById('tm-rename-input');
            if (input) { input.focus(); input.select(); }
        }, 0);
    }
    function doRename(elOrInput) {
        var input = (elOrInput && elOrInput.id === 'tm-rename-input') ? elOrInput : document.getElementById('tm-rename-input');
        var gid = renamingGid;
        renamingGid = null;
        if (input && gid !== null) {
            var db = loadDB();
            var nv = String(input.value || '').trim();
            if (db.groups[gid] && nv) { db.groups[gid].name = nv; saveDB(db); }
        }
        render();
    }
    function doDeleteGroup() {
        var gid = confirmingGid;
        confirmingGid = null;
        if (gid === null) { render(); return; }
        var db = loadDB();
        if (db.groups[gid]) {
            var moving = Object.keys(db.members).filter(function(n) { return effectiveGroup(db, db.members[n]) === gid; });
            delete db.groups[gid];
            moving.forEach(function(n) { db.members[n].manualGroup = 'ungrouped'; });   /* 组内角色进无分组 */
            if (db.ui && db.ui.collapsed) delete db.ui.collapsed[gid];
            saveDB(db);
        }
        render();
    }
    function doDeleteMember() {
        if (!selectedName) return;
        var db = loadDB();
        var m = db.members[selectedName];
        if (m) {
            var floor = Math.max(Number(curFloor()) || 0, Number(m.lastFloor) || 0);
            db.removed[selectedName] = floor;   /* 记录删除楼层：旧楼层不再复活，新楼层重新出现则恢复 */
            delete db.members[selectedName];
            saveDB(db);
        }
        selectedName = null;
        confirmingMember = false;
        render();
    }
    function armConfirmReset(kind) {
        if (armedTimers[kind]) clearTimeout(armedTimers[kind]);
        armedTimers[kind] = setTimeout(function() {
            if (kind === 'member' && confirmingMember) { confirmingMember = false; render(); }
            if (kind === 'group' && confirmingGid !== null) { confirmingGid = null; render(); }
        }, 6000);
    }

    /* ---------- 事件绑定 ---------- */
    function bindStatic() {
        var body = document.getElementById('tm-body');
        var detail = document.getElementById('tm-detail');

        body.addEventListener('click', function(e) {
            var actEl = e.target.closest('[data-act]');
            if (actEl) {
                var act = actEl.getAttribute('data-act');
                var grp = actEl.closest('.tm-group');
                if (act === 'toggle' && grp) {
                    var gid = grp.getAttribute('data-gid');
                    var db = loadDB();
                    db.ui = db.ui || { collapsed: {} };
                    db.ui.collapsed = db.ui.collapsed || {};
                    db.ui.collapsed[gid] = grp.classList.contains('open');
                    saveDB(db);
                    grp.classList.toggle('open');   /* 不整页重渲染，动画更顺滑 */
                    return;
                }
                if (act === 'rename' && grp) { renamingGid = grp.getAttribute('data-gid'); confirmingGid = null; render(); focusRename(); return; }
                if (act === 'rename-ok') { doRename(null); return; }
                if (act === 'rename-cancel') { renamingGid = null; render(); return; }
                if (act === 'delgroup' && grp) { confirmingGid = grp.getAttribute('data-gid'); render(); armConfirmReset('group'); return; }
                if (act === 'delgroup-yes') { doDeleteGroup(); return; }
                if (act === 'delgroup-no') { confirmingGid = null; render(); return; }
            }
            var memberEl = e.target.closest('.tm-member');
            if (memberEl) {
                var name = memberEl.getAttribute('data-name');
                selectedName = (selectedName === name) ? null : name;   /* 再次点击收起 */
                confirmingMember = false;
                /* 只更新卡片选中态与详情面板，不整页重渲染：分组开合状态与动画不受打扰 */
                document.querySelectorAll('#tm-body .tm-member').forEach(function (cardEl) {
                    cardEl.classList.toggle('active', cardEl.getAttribute('data-name') === selectedName);
                });
                renderDetail(loadDB());
                var det = document.getElementById('tm-detail');
                if (det && selectedName && det.scrollIntoView) {
                    try { det.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch (err) {}
                }
            }
        });

        body.addEventListener('keydown', function(e) {
            if (e.target && e.target.id === 'tm-rename-input') {
                if (e.key === 'Enter') { e.preventDefault(); doRename(e.target); }
                else if (e.key === 'Escape') { renamingGid = null; render(); }
            }
        });
        body.addEventListener('focusout', function(e) {
            if (e.target && e.target.id === 'tm-rename-input' && renamingGid !== null) {
                setTimeout(function() {
                    var active = document.activeElement;
                    if (active && active.closest && active.closest('[data-act="rename-ok"],[data-act="rename-cancel"]')) return;
                    if (renamingGid !== null && document.getElementById('tm-rename-input')) doRename(null);
                }, 120);
            }
        });

        detail.addEventListener('click', function(e) {
            var actEl = e.target.closest('[data-act]');
            if (!actEl) return;
            var act = actEl.getAttribute('data-act');
            if (act === 'detail-close') { selectedName = null; confirmingMember = false; render(); }
            else if (act === 'member-move') {
                var sel = document.getElementById('tm-move-select');
                if (!sel || !selectedName) return;
                var db = loadDB();
                var m = db.members[selectedName];
                if (!m) return;
                var auto = (m.instanceId && db.groups[m.instanceId]) ? m.instanceId : 'ungrouped';
                m.manualGroup = (sel.value === auto) ? null : sel.value;
                saveDB(db);
                render();
            }
            else if (act === 'member-auto') {
                var db2 = loadDB();
                if (db2.members[selectedName]) { db2.members[selectedName].manualGroup = null; saveDB(db2); render(); }
            }
            else if (act === 'member-del') { confirmingMember = true; render(); armConfirmReset('member'); }
            else if (act === 'member-del-no') { confirmingMember = false; render(); }
            else if (act === 'member-del-yes') { doDeleteMember(); }
        });

        ensureBackdrop().addEventListener('click', function() {
            selectedName = null;
            confirmingMember = false;
            render();
        });
    }

    /* ---------- 全量回扫：自愈登记（页面加载/切换聊天时从所有楼层重建名册） ---------- */
    function scanAllFloors() {
        try {
            var scanHost = (function() { try { return window.top || window.parent || window; } catch (e0) { return window; } })();
            var myKey = getChatKey();
            if (scanHost.__mxTeammatesScanMark === myKey) return;   /* 同一页面加载周期内每个聊天只全量扫一次 */
            scanHost.__mxTeammatesScanMark = myKey;
            if (typeof getChatMessages !== 'function') return;
            var lid = null;
            try { if (typeof getLastMessageId === 'function') lid = Number(getLastMessageId()); } catch (e1) {}
            if (lid === null || isNaN(lid) || lid < 0) return;
            var msgs = getChatMessages('0-' + lid);
            if (!msgs || !msgs.length) return;
            var world = readWorld();
            var changed = false;
            for (var i = 0; i < msgs.length; i++) {
                var m = msgs[i];
                var mid = (m && m.message_id != null) ? m.message_id : i;
                var text = (m && (m.message || m.mes)) || '';
                if (!text) continue;
                try { if (syncFromMessage(mid, text, true, world)) changed = true; } catch (e2) {}
            }
            if (changed) render();
        } catch (e) {}
    }
    /* ---------- 换聊天 ---------- */
    function bindChatChange() {
        try {
            if (typeof eventOn === 'function' && typeof tavern_events !== 'undefined' && tavern_events.CHAT_CHANGED) {
                eventOn(tavern_events.CHAT_CHANGED, function() {
                    chatKeyCache = null;
                    lastRawText = null;
                    selectedName = null;
                    renamingGid = null;
                    confirmingGid = null;
                    confirmingMember = false;
                    lastSyncInfo = null;
                    scanAllFloors();
                    render();
                });
            }
        } catch (e) {}
    }

    /* ---------- 主轮询 ---------- */
    function tick() {
        try {
            if (renamingGid !== null) { pendingRender = true; try { tmSyncCombat(); } catch (e2) {} return; }   /* 重命名中不打扰（快照照常） */
            var floor = curFloor();
            if (floor === null) return;
            var rawText = '';
            if (typeof getChatMessages === 'function') {
                var msgs = getChatMessages(floor);
                rawText = (msgs && msgs[0] && (msgs[0].message || msgs[0].mes)) || '';
            }
            var combatChanged = false;                                  /* 战斗状态独立于楼层文本，每轮都同步 */
            try { combatChanged = tmSyncCombat(); } catch (e3) {}
            if (rawText === lastRawText) {
                if (combatChanged && selectedName) refreshDetailIfIdle();
                return;
            }
            lastRawText = rawText;
            var changed = syncFromMessage(floor, rawText);
            if (changed || pendingRender) { pendingRender = false; render(); }
            else { renderSync(loadDB()); }
        } catch (e) { /* 静默，避免轮询中断 */ }
    }

    /* ---------- 战斗引擎详情（实时 + 最近快照） ---------- */
    var TM_HOST = (function() { try { return window.top || window.parent || window; } catch (e) { return window; } })();
    var TM_ATTRS = ['力量', '敏捷', '体质', '智力', '精神', '魅力'];
    var lastCombatSig = {};

    function tmNum(v, d) { var n = parseFloat(v); return isNaN(n) ? (d || 0) : n; }
    function tmResolve(name) {
        try { if (typeof window[name] === 'function') return window[name]; } catch (e) {}
        try { if (TM_HOST && typeof TM_HOST[name] === 'function') return TM_HOST[name]; } catch (e) {}
        try { if (window.parent && window.parent !== window && typeof window.parent[name] === 'function') return window.parent[name]; } catch (e) {}
        return null;
    }
    function tmCombatState() {
        var fn = tmResolve('getCombatState');
        if (!fn) return null;
        try { var st = fn(); return (st && typeof st === 'object') ? st : null; } catch (e) { return null; }
    }

    /* 名字匹配：isAlly 精确 -> isPlayer 精确 -> 前缀互含（兜底 AI 前后缀差异） */
    function tmMatchUnit(state, name) {
        if (!state || !state.units || !name) return null;
        var n = String(name).trim();
        if (!n) return null;
        var units = state.units, i, u;
        for (i = 0; i < units.length; i++) { u = units[i]; if (u && u.isAlly && !u.isPlayer && String(u.name || '').trim() === n) return u; }
        for (i = 0; i < units.length; i++) { u = units[i]; if (u && u.isPlayer && String(u.name || '').trim() === n) return u; }
        for (i = 0; i < units.length; i++) {
            u = units[i];
            if (!u || (!u.isAlly && !u.isPlayer)) continue;
            var un = String(u.name || '').trim();
            if (un && (un.indexOf(n) === 0 || n.indexOf(un) === 0)) return u;
        }
        return null;
    }

    /* 快照净化：仅保留展示所需字段，控制 localStorage 体积 */
    function tmSnapshotUnit(u) {
        var d = u.derived || {};
        var attrs = {}, eff = {};
        TM_ATTRS.forEach(function(a) {
            if (u.attrs && u.attrs[a] != null) attrs[a] = tmNum(u.attrs[a]);
            if (u.eff && u.eff[a] != null) eff[a] = tmNum(u.eff[a]);
        });
        var buffs = [];
        (u.buffs || []).forEach(function(b) {
            if (!b) return;
            buffs.push({
                name: String(b.name || '未知'),
                turns: (b.turns === undefined || b.turns === null) ? null : b.turns,
                target: String(b.target || ''),
                effect: String(b.effect || '')
            });
        });
        var cds = {};
        var cd = u.cooldowns || {};
        Object.keys(cd).forEach(function(k) { cds[k] = cd[k]; });
        var slots = {};
        var eq = u.equippedSlots || {};
        ['武器', '副手', '防具', '饰品'].forEach(function(sl) { if (eq[sl]) slots[sl] = String(eq[sl]); });
        return {
            name: String(u.name || ''),
            hp: tmNum(u.hp, 0), hpMax: tmNum(d.hpMax, 0),
            energy: tmNum(u.energy, 0), energyMax: tmNum(d.energyMax, 0), energyType: String(u.energyType || ''),
            ap: tmNum(u.ap, 0), apMax: tmNum(d.apMax, 4),
            attrs: attrs, eff: eff,
            derived: { physDef: tmNum(d.physDef, 0), mystDef: tmNum(d.mystDef, 0), critRate: tmNum(d.critRate, 0), moveSpeed: tmNum(d.moveSpeed, 0) },
            buffs: buffs, cooldowns: cds, equippedSlots: slots,
            x: tmNum(u.x, 0), y: tmNum(u.y, 0),
            isPlayer: !!u.isPlayer, isAlly: !!u.isAlly
        };
    }

    /* 每轮快照同步：签名变化才写盘（读-改-写，防多 iframe 竞争） */
    function tmSyncCombat() {
        var state = tmCombatState();
        if (!state || !state.units) { lastCombatSig = {}; return false; }
        var db = loadDB();
        var names = Object.keys(db.members);
        if (!names.length) return false;
        var changed = false;
        names.forEach(function(n) {
            var u = tmMatchUnit(state, n);
            if (!u) return;
            var snap = tmSnapshotUnit(u);
            var sig;
            try { sig = JSON.stringify(snap); } catch (e) { sig = 'sig_' + Date.now(); }
            if (lastCombatSig[n] === sig) return;
            lastCombatSig[n] = sig;
            db.members[n].combat = { capturedAt: Date.now(), capturedFloor: curFloor(), unit: snap };
            changed = true;
        });
        if (changed) saveDB(db);
        return changed;
    }

    /* 用户正在操作详情内控件时暂不重渲染 */
    function refreshDetailIfIdle() {
        if (renamingGid !== null) { pendingRender = true; return; }
        var det = document.getElementById('tm-detail');
        if (!det || !selectedName) return;
        var ae = document.activeElement;
        if (ae && det.contains && det.contains(ae)) return;
        renderDetail(loadDB());
    }

    /* ---- 战斗区块渲染 ---- */
    function tmBarHtml(cur, max, cls) {
        var pct = max > 0 ? Math.max(0, Math.min(100, (cur / max) * 100)) : 0;
        return '<span class="tm-cb-track"><i class="tm-cb-fill' + (cls ? ' ' + cls : '') + '" style="width:' + pct + '%"></i></span>';
    }
    function tmApDots(cur, max) {
        var s = '', i;
        max = Math.max(0, Math.round(tmNum(max, 4)));
        cur = Math.max(0, Math.round(tmNum(cur, 0)));
        for (i = 0; i < max; i++) s += '<i class="tm-cb-dot' + (i < cur ? ' on' : '') + '"></i>';
        return s;
    }
    function tmAttrsHtml(u) {
        var s = '';
        TM_ATTRS.forEach(function(a) {
            var base = (u.attrs && u.attrs[a] != null) ? u.attrs[a] : null;
            var eff = (u.eff && u.eff[a] != null) ? u.eff[a] : base;
            var cls = '';
            if (base !== null && eff !== null && tmNum(eff) > tmNum(base)) cls = ' up';
            else if (base !== null && eff !== null && tmNum(eff) < tmNum(base)) cls = ' down';
            s += '<div class="tm-cb-attr' + cls + '"><span class="n">' + a + '</span><span class="v">' + (eff === null ? '-' : eff) + '</span></div>';
        });
        return s;
    }
    function tmBuffsHtml(u) {
        var s = '';
        (u.buffs || []).forEach(function(b) {
            var nm = String(b.name || '未知');
            var isDeb = nm.indexOf('灼烧') >= 0 || b.target === 'enemy' || b.effect === 'debuff_apply';
            var cls = (b.turns === -1) ? 'perm' : (isDeb ? 'debuff' : 'buff');
            var dur = (b.turns === -1) ? '∞' : ((b.turns === null || b.turns === undefined) ? '?' : b.turns);
            s += '<span class="tm-cb-chip ' + cls + '" title="' + esc(nm) + '">' + esc(nm) + '<i>' + esc(dur) + '</i></span>';
        });
        var cd = u.cooldowns || {};
        Object.keys(cd).forEach(function(k) {
            s += '<span class="tm-cb-chip cd" title="' + esc(k) + ' 冷却">' + esc(k) + '<i>' + esc(cd[k]) + '</i></span>';
        });
        return s;
    }
    function renderCombatBlock(db, m) {
        var live = null;
        try {
            var st = tmCombatState();
            if (st) { var lu = tmMatchUnit(st, m.name); if (lu) live = tmSnapshotUnit(lu); }
        } catch (e) {}
        var snapInfo = (m.combat && m.combat.unit) ? m.combat : null;
        var u = live || (snapInfo && snapInfo.unit) || null;
        var srcHtml;
        if (live) {
            srcHtml = '<span class="tm-cb-src"><span class="neb-led led-green"></span>战斗中 · 实时</span>';
        } else if (u) {
            srcHtml = '<span class="tm-cb-src"><span class="neb-led led-yellow"></span>上次快照 · 楼层 #' + esc(snapInfo.capturedFloor) + ' · ' + esc(fmtTime(snapInfo.capturedAt)) + '</span>';
        } else {
            return '<div class="tm-combat"><div class="neb-card-title">战斗属性</div>' +
                '<div class="tm-empty-inline">暂无战斗数据（队友进入战斗后自动记录）</div></div>';
        }
        var dead = u.hp <= 0;
        var hpMax = u.hpMax || 1;
        var hpPct = (u.hp / hpMax) * 100;
        var html = '<div class="tm-combat' + (dead ? ' dead' : '') + '">' +
            '<div class="neb-card-title">战斗属性' +
            (dead ? '<span class="tm-cb-dead"><i class="fa-solid fa-skull"></i>已阵亡</span>' : '') + srcHtml + '</div>';
        html += '<div class="tm-cb-line"><span class="tm-cb-lbl">HP</span>' + tmBarHtml(u.hp, hpMax, hpPct < 30 ? 'low' : '') +
            '<span class="tm-cb-val">' + Math.max(0, Math.round(u.hp)) + '/' + Math.round(hpMax) + '</span></div>';
        if (u.energyMax > 0) {
            html += '<div class="tm-cb-line"><span class="tm-cb-lbl">' + esc(u.energyType || '能量') + '</span>' + tmBarHtml(u.energy, u.energyMax, 'energy') +
                '<span class="tm-cb-val">' + Math.round(u.energy) + '/' + Math.round(u.energyMax) + '</span></div>';
        }
        html += '<div class="tm-cb-ap"><span class="tm-cb-lbl">AP</span><span class="tm-cb-dots">' + tmApDots(u.ap, u.apMax) + '</span>' +
            '<span class="tm-cb-val">' + Math.round(u.ap) + '/' + Math.round(u.apMax || 4) + '</span></div>';
        html += '<div class="tm-cb-attrs">' + tmAttrsHtml(u) + '</div>';
        var d = u.derived || {};
        html += '<div class="tm-cb-derived"><span>物防 <b>' + tmNum(d.physDef, 0) + '</b></span><span>神防 <b>' + tmNum(d.mystDef, 0) + '</b></span>' +
            '<span>暴击 <b>' + tmNum(d.critRate, 0) + '%</b></span><span>移速 <b>' + tmNum(d.moveSpeed, 0) + 'm</b></span></div>';
        var chips = tmBuffsHtml(u);
        if (chips) html += '<div class="tm-cb-chips">' + chips + '</div>';
        html += '<div class="tm-cb-slots">' + ['武器', '副手', '防具', '饰品'].map(function(sl) {
            var v = u.equippedSlots ? u.equippedSlots[sl] : '';
            return '<span class="tm-cb-slot' + (v ? '' : ' empty') + '"><b>' + sl + '</b>' + (v ? esc(v) : '-') + '</span>';
        }).join('') + '</div>';
        html += '<div class="tm-cb-pos"><i class="fa-solid fa-location-crosshairs"></i>战场坐标 (' + tmNum(u.x, 0) + ', ' + tmNum(u.y, 0) + ')' +
            (u.isPlayer ? ' · 玩家单位' : '') + '</div>';
        return html + '</div>';
    }

    /* ---------- 对外接口（调试/联动） ---------- */
    window.__tmInternals = { extractStu: extractStu, parseMembers: parseMembers, loadDB: loadDB, saveDB: saveDB, syncFromMessage: syncFromMessage, tmMatchUnit: tmMatchUnit, tmSnapshotUnit: tmSnapshotUnit, tmSyncCombat: tmSyncCombat, renderCombatBlock: renderCombatBlock };
    window.__mxTeammatesRefresh = function() { lastRawText = null; tick(); };

    /* ---------- 旧版开合存储反转修复：一次性翻转历史值（带版本标记，仅翻转被旧代码写过的键） ---------- */
    function migrateToggleFix() {
        try {
            var db = loadDB();
            var coll = db.ui && db.ui.collapsed;
            if (!coll || db.ui.toggleFixV2) return;
            Object.keys(coll).forEach(function (k) { coll[k] = !coll[k]; });
            db.ui.toggleFixV2 = true;
            saveDB(db);
        } catch (e) {}
    }

    /* ---------- 启动 ---------- */
    function boot() {
        migrateToggleFix();
        bindStatic();
        bindChatChange();
        scanAllFloors();
        render();
        tick();
        setInterval(tick, POLL_MS);
    }
    if (typeof waitGlobalInitialized === 'function') {
        waitGlobalInitialized('Mvu').then(boot).catch(function() { boot(); });
    } else {
        setTimeout(boot, 300);
    }
})();
