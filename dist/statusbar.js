
/* ===== OVERLAY VIEW SWITCHING ===== */
(async function() {
  if (window.__mxOverlayInit) return;
  window.__mxOverlayInit = true;

  function showOverlay(name) {
    document.querySelectorAll('.mx-overlay').forEach(function(el) {
      el.classList.toggle('is-active', el.id === 'mx-' + name + '-overlay');
    });
  }
  function hideAllOverlays() {
    document.querySelectorAll('.mx-overlay').forEach(function(el) { el.classList.remove('is-active'); });
  }
  window.__mxEnterMain = function(rawText, statData) {
    document.body.classList.add('mx-started');
    var consoleEl = document.getElementById('mx-console');
    if (consoleEl) consoleEl.classList.remove('mx-pre-game');
    hideAllOverlays();
    window.__mxPseudoState = window.__mxPseudoState || {};
    if (rawText) window.__mxPseudoState.latestAssistantText = rawText;
    if (statData) window.__mxPseudoState.statData = statData;
    if (typeof window.__mxRefreshPseudo === 'function') window.__mxRefreshPseudo();
  };
  function switchTitleView(name) {
    document.querySelectorAll('[data-o-view]').forEach(function(el) {
      el.classList.toggle('is-active', el.getAttribute('data-o-view') === name);
    });
  }
  function latestFloor() {
    try { if (typeof getLastMessageId === 'function') { var a = Number(getLastMessageId()); if (!isNaN(a)) return a; } } catch(e) {}
    try { if (typeof getCurrentMessageId === 'function') { var b = Number(getCurrentMessageId()); if (!isNaN(b)) return b; } } catch(e2) {}
    return null;
  }

  async function restorePseudoZeroHost() {
    try {
      var current = typeof getCurrentMessageId === 'function' ? Number(getCurrentMessageId()) : 0;
      if (current > 0 && typeof retrieveDisplayedMessage === 'function' && typeof refreshOneMessage === 'function') {
        var target = retrieveDisplayedMessage(current);
        if (target && target.length) await refreshOneMessage(0, target);
      }
    } catch(e) {}
  }

  function hydratePseudoState() {
    try {
      if (typeof getChatMessages !== 'function') return;
      var assistants = getChatMessages('0-' + latestFloor(), {role:'assistant'});
      if (!assistants || !assistants.length) return;
      var latest = assistants[assistants.length - 1];
      if (!latest || Number(latest.message_id) === 0) return;
      window.__mxPseudoState = {
        latestAssistantText: latest.message || '',
        statData: _.cloneDeep(_.get(latest, 'data.stat_data', {})),
        messageId: latest.message_id
      };
    } catch(e) {}
  }

  // FIX 3: Floor detection is the ONLY source of truth - no memory markers
  var floor = latestFloor();
  if (floor === null || floor === 0) {
    // New game - show title, hide main console completely
    showOverlay('title');
    var mc = document.getElementById('mx-console');
    if (mc) mc.classList.add('mx-pre-game');
  } else {
    // Existing progress - straight to main, no overlays
    document.body.classList.add('mx-started');
    hydratePseudoState();
    await restorePseudoZeroHost();
  }

  var startBtn = document.getElementById('startBtn');
  if (startBtn) {
    startBtn.onclick = function() {
      var note = document.getElementById('titleNote');
      if (note) note.textContent = '正在读取酒馆楼层状态...';
      setTimeout(function() {
        var f = latestFloor();
        if (f === 0 || f === null) {
          showOverlay('create');
        } else {
          // Already has progress - go straight to main
          window.__mxEnterMain();
        }
      }, 220);
    };
  }

  var backTitle = document.getElementById('backTitle');
  if (backTitle) backTitle.onclick = function() { switchTitleView('title'); };
  var resumeBack = document.getElementById('resumeBack');
  if (resumeBack) resumeBack.onclick = function() { switchTitleView('title'); };
})();

/* ===== CREATION LOGIC ===== */

(function(){
var steps=['stage','identity','entry','build','dungeon','attrs','confirm'];var attrs=['力量','敏捷','体质','智力','精神','魅力'];var stageData={newbie:{label:'新人接入',rank:'一阶',enh:'F',points:60,min:6,max:22,credits:1000,skills:2,faction:'无阵营',desc:'第一次进入多维矩阵，尚未经历副本。'},rookie:{label:'新手轮回者',rank:'一阶',enh:'F/E',points:96,min:8,max:30,credits:2000,skills:3,faction:'无阵营',desc:'完成过1-2次任务，仍处于新人保护期。'},formal:{label:'正式轮回者',rank:'二阶',enh:'E/D',points:138,min:12,max:42,credits:5000,skills:4,faction:'可选阵营',desc:'已完成前三个任务，强化路线初步成型。'},veteran:{label:'资深轮回者',rank:'三阶',enh:'D/C',points:184,min:16,max:56,credits:10000,skills:5,faction:'通常已有阵营',desc:'经历多个副本，KPI和危险度更高。'},returnee:{label:'高危回归者',rank:'一至三阶',enh:'不稳定',points:120,min:6,max:50,credits:1500,skills:4,faction:'异常状态',desc:'死亡、失忆、叛逃或被回收后的二次接入。'}};
var identities=['普通学生','公司职员','医生/护士','退役军人','警察/安保','黑客/程序员','研究员','运动员','演员/主播','雇佣兵','诈骗犯/情报贩子','黑帮成员','宗教/神秘学爱好者','失业者','富家子弟','流浪者','自定义'];var entryTypes=['死亡召回','异常接触','随机征召','主动交易','实验事故','二次回收'];var enhanceTypes={科技:['外骨骼装甲','枪械火力','无人机/机械仆从','黑客入侵','生物改造','战术医疗','自定义'],神话:['兽化血统','神话生物因子','元素亲和','仪式咒术','诅咒抗性','古代武器适配','自定义'],人形:['念动力','精神干涉','肉体极限','感官强化','概率直觉','人格裂隙/替身型','自定义']};var skills=['急救','闪避本能','机械直觉','危险感知','说服','专注','潜行','驾驶','资料检索','基础格斗','自定义'];var alignments=['守序善良','中立善良','混乱善良','守序中立','绝对中立','混乱中立','守序邪恶','中立邪恶','混乱邪恶'];var dungeons=['完全随机','现代都市异常','废土生存','低魔奇幻','高魔世界','科幻设施','战争前线','校园怪谈','历史异变','未知恐怖','自定义'];var state={step:0,stage:'newbie',entry:'随机征召',enhance:'科技',direction:'外骨骼装甲',attrs:{}};
function el(id){return document.getElementById(id)}function pick(a){return a[Math.floor(Math.random()*a.length)]}function note(t){el('note').textContent=t}function fill(id,a){var s=el(id);if(!s)return;s.innerHTML=a.map(function(x){return '<option>'+x+'</option>'}).join('')}function clone(o){return JSON.parse(JSON.stringify(o||{}))}function getPath(o,p,d){try{return p.split('.').reduce(function(x,k){return x&&x[k]},o)??d}catch(e){return d}}function setPath(o,p,v){if(typeof _!=='undefined'&&_.set){_.set(o,p,v);return}var a=p.split('.'),x=o;for(var i=0;i<a.length-1;i++){if(!x[a[i]])x[a[i]]={};x=x[a[i]]}x[a[a.length-1]]=v}function resetAttrs(){var st=stageData[state.stage],base=Math.floor(st.points/6),rest=st.points-base*6;attrs.forEach(function(a){state.attrs[a]=base});for(var i=0;i<rest;i++)state.attrs[attrs[i]]++}function spent(){return attrs.reduce(function(n,a){return n+state.attrs[a]},0)}function selected(id,customId){var v=el(id).value;return v==='自定义'?(el(customId).value||'自定义'):v}function entryDesc(x){return {死亡召回:'现实死亡后灵魂被矩阵截获。',异常接触:'触碰现实与矩阵的连接点。',随机征召:'无理由、无预兆地被选中。',主动交易:'知晓矩阵存在并主动进入。',实验事故:'现实组织研究矩阵时卷入。',二次回收:'死亡、失忆、叛逃或清洗后的回收。'}[x]||''}function enhanceDesc(x){return {科技:'装备、机械、火力、数据化武装。',神话:'血统、兽化、仪式、超自然权能。',人形:'念力、精神、极限肉体、个体进化。'}[x]||''}
function grid(id,data,active,cb){var box=el(id);if(!box)return;box.innerHTML=data.map(function(it){var k=it.key||it,l=it.label||it,d=it.desc||'';return '<div class="mx-option '+(k===active?'is-active':'')+'" data-key="'+k+'"><strong>'+l+'</strong><span>'+d+'</span></div>'}).join('');box.onclick=function(e){var c=e.target.closest('.mx-option');if(!c)return;cb(c.getAttribute('data-key'));render()}}function renderCards(){grid('stageGrid',Object.keys(stageData).map(function(k){return {key:k,label:stageData[k].label,desc:stageData[k].desc}}),state.stage,function(k){state.stage=k;resetAttrs()});grid('entryGrid',entryTypes.map(function(x){return {key:x,label:x,desc:entryDesc(x)}}),state.entry,function(k){state.entry=k});grid('enhanceGrid',Object.keys(enhanceTypes).map(function(x){return {key:x,label:x,desc:enhanceDesc(x)}}),state.enhance,function(k){state.enhance=k;state.direction=enhanceTypes[k][0];if(k==='科技')el('energySelect').value='科技能量';if(k==='神话')el('energySelect').value='魔力';if(k==='人形')el('energySelect').value='精神力'})}
function syncCustom(){el('identityCustomBox').classList.toggle('is-active',el('identitySelect').value==='自定义');el('eraCustomBox').classList.toggle('is-active',el('eraInput').value==='自定义');el('directionCustomBox').classList.toggle('is-active',el('directionSelect').value==='自定义');el('energyCustomBox').classList.toggle('is-active',el('energySelect').value==='自定义');el('skillCustomBox').classList.toggle('is-active',el('skillSelect').value==='自定义');el('dungeonCustomBox').classList.toggle('is-active',el('dungeonSelect').value==='自定义')}function renderAttrs(){var st=stageData[state.stage],left=st.points-spent();el('pointInfo').textContent='剩余 '+left+' / 总 '+st.points;el('attrList').innerHTML=attrs.map(function(a){var v=state.attrs[a],w=Math.round(v/st.max*100);return '<div class="mx-attr"><div class="mx-attr-name">'+a+'</div><div class="mx-bar"><div class="mx-fill" style="width:'+w+'%"></div></div><div class="mx-attr-ctrl"><button data-attr="'+a+'" data-delta="-1">-</button><span class="mx-attr-val">'+v+'</span><button data-attr="'+a+'" data-delta="1">+</button></div></div>'}).join('')}
function profile(){var st=stageData[state.stage],era=selected('eraInput','customEra'),dir=selected('directionSelect','customDirection'),energy=selected('energySelect','customEnergy'),skill=selected('skillSelect','customSkill'),dungeon=selected('dungeonSelect','customDungeon'),identity=selected('identitySelect','customIdentity');var p={阶段:st.label,阶位:st.rank,强化等级:st.enh.indexOf('/')>0?st.enh.split('/')[0]:st.enh,积分:st.credits,技能数量:st.skills,阵营状态:st.faction,姓名:el('nameInput').value||'<user>',代号:el('codeInput').value||'零号',性别:el('genderInput').value,年龄:Number(el('ageInput').value||24),现实世界所在地:el('locInput').value||'未填写',现实身份:identity,接入方式:state.entry,故事时代:era,故事地区:el('regionInput').value||'未填写',最后记忆:el('lastMemory').value,最大执念:el('obsession').value,致命缺陷:el('flaw').value,主强化类型:state.enhance,强化方向:dir,能量类型:energy,初始技能:['侦察',skill],价值倾向:el('alignmentSelect').value,副本分配:'随机',副本偏好:dungeon,战斗强度:el('combatSelect').value,探索比例:el('exploreSelect').value,社交复杂度:el('socialSelect').value,属性:clone(state.attrs)};p.标签=[p.阶段,p.阶位,p.现实身份,p.接入方式,p.故事时代,p.故事地区,p.主强化类型,p.强化方向,p.能量类型,p.价值倾向,p.副本偏好,p.战斗强度,p.探索比例,p.社交复杂度].filter(Boolean).join('、');return p}
function updatePreview(){syncCustom();var p=profile();el('preview').innerHTML='<span class="mx-pill">'+p.阶段+'</span><span class="mx-pill">'+p.阶位+'</span><span class="mx-pill">'+p.主强化类型+'</span><div class="mx-preview-block"><b>身份</b><p>'+p.姓名+' / '+p.代号+'<br>'+p.现实身份+' · '+p.现实世界所在地+'</p></div><div class="mx-preview-block"><b>接入</b><p>'+p.接入方式+'<br>'+p.故事时代+' · '+p.故事地区+'<br>执念：'+(p.最大执念||'未填写')+'<br>缺陷：'+(p.致命缺陷||'未填写')+'</p></div><div class="mx-preview-block"><b>能力</b><p>'+p.主强化类型+' · '+p.强化方向+'<br>能量：'+p.能量类型+'<br>技能：'+p.初始技能.join('、')+'</p></div><div class="mx-preview-block"><b>属性</b><p>'+attrs.map(function(a){return a+':'+state.attrs[a]}).join(' / ')+'</p></div><div class="mx-preview-block"><b>副本</b><p>随机分配，偏好：'+p.副本偏好+'<br>战斗'+p.战斗强度+' / 探索'+p.探索比例+' / 社交'+p.社交复杂度+'</p></div>'}
function render(){document.querySelectorAll('.mx-step').forEach(function(b,i){b.classList.toggle('is-active',i===state.step)});document.querySelectorAll('.mx-view').forEach(function(v){v.classList.toggle('is-active',v.getAttribute('data-view')===steps[state.step])});fill('directionSelect',enhanceTypes[state.enhance]);el('directionSelect').value=state.direction;renderCards();renderAttrs();updatePreview()}var OPENING_TEMPLATE='<content>\n{{时代}}年的{{地区}}，多维矩阵的低频脉冲第一次在你的意识深处亮起。\n\n系统完成了对{{姓名}}的档案扫描：代号{{代号}}，现实身份为{{现实身份}}，接入方式为{{接入方式}}。你的最后记忆被封存在档案边缘，最大执念是{{最大执念}}，致命缺陷是{{致命缺陷}}。\n\n矩阵没有为你指定职业，只记录标签：{{标签}}。你的当前阶位为{{阶位}}，强化倾向为{{主强化类型}}，适配方向是{{强化方向}}，能量类型暂定为{{能量类型}}。六维属性已完成校准：力量{{力量}}、敏捷{{敏捷}}、体质{{体质}}、智力{{智力}}、精神{{精神}}、魅力{{魅力}}。\n\n副本将由矩阵随机分配，偏好仅作为叙事权重记录：{{副本偏好}}。你还没有遭遇冲突，只有一段尚未展开的故事，正在等待你亲手启动。\n</content>\n<option>\n1.开始我们的故事\n</option>';function tpl(t,p){var data=clone(p);attrs.forEach(function(a){data[a]=p.属性[a]});return t.replace(/{{(.*?)}}/g,function(_,k){return data[k]===undefined||data[k]===null?'':String(data[k])})}
function statFromForm(p){var initialData=Mvu.getMvuData({type:'message',message_id:0});var base=(typeof _!=='undefined'&&_.cloneDeep)?_.cloneDeep(_.get(initialData,'stat_data',{})):clone(getPath(initialData,'stat_data',{}));var sd=base||{};setPath(sd,'世界.时代',p.故事时代);setPath(sd,'世界.地区',p.故事地区);setPath(sd,'世界.副本偏好',p.副本偏好);setPath(sd,'世界.战斗强度',p.战斗强度);setPath(sd,'世界.探索比例',p.探索比例);setPath(sd,'世界.社交复杂度',p.社交复杂度);setPath(sd,'主页.姓名',p.姓名);setPath(sd,'主页.代号',p.代号);setPath(sd,'主页.阶位',p.阶位);setPath(sd,'主页.强化等级',p.强化等级);setPath(sd,'主页.阵营',p.阵营状态==='无阵营'?'无阵营':p.价值倾向);setPath(sd,'主页.积分余额',p.积分);setPath(sd,'主页.当前状态','健康');setPath(sd,'主页.战斗中',false);setPath(sd,'个人档案.基础信息.性别',p.性别);setPath(sd,'个人档案.基础信息.年龄',p.年龄);setPath(sd,'个人档案.基础信息.现实世界所在地',p.现实世界所在地);setPath(sd,'个人档案.基础信息.现实身份',p.现实身份);setPath(sd,'个人档案.基础信息.接入方式',p.接入方式);setPath(sd,'个人档案.基础信息.最大执念',p.最大执念);setPath(sd,'个人档案.基础信息.致命缺陷',p.致命缺陷);attrs.forEach(function(a){setPath(sd,'个人档案.战斗属性.'+a,p.属性[a])});setPath(sd,'个人档案.强化与技能.主强化类型',p.主强化类型);setPath(sd,'个人档案.强化与技能.强化名称',p.阶段==='新人接入'?'未觉醒':p.强化方向);setPath(sd,'个人档案.强化与技能.强化等级',p.强化等级);setPath(sd,'个人档案.强化与技能.技能列表.侦察',{等级:'Lv.1','冷却/消耗':'消耗5点能量',描述:'探查敌方基本属性'});setPath(sd,'个人档案.强化与技能.技能列表.'+p.初始技能[1],{等级:'Lv.1','冷却/消耗':'视场景消耗',描述:'由角色创建选择生成的初始辅助技能'});setPath(sd,'任务与日志.任务世界.世界名称','随机副本待分配');setPath(sd,'任务与日志.任务世界.世界描述',p.故事时代+'，'+p.故事地区+'，副本由矩阵随机分配。');setPath(sd,'创建档案',p);return sd}
function userInfoContent(p){return 'user信息:\n  姓名: '+p.姓名+'\n  代号: '+p.代号+'\n  阶段: '+p.阶段+'\n  阶位: '+p.阶位+'\n  现实身份: '+p.现实身份+'\n  接入方式: '+p.接入方式+'\n  时代: '+p.故事时代+'\n  地区: '+p.故事地区+'\n  标签: '+p.标签+'\n  强化: '+p.主强化类型+' / '+p.强化方向+' / '+p.能量类型+'\n  技能: '+p.初始技能.join('、')+'\n  属性: '+attrs.map(function(a){return a+':'+p.属性[a]}).join(' / ')+'\n  副本偏好: '+p.副本偏好+'\n  强度: 战斗'+p.战斗强度+' / 探索'+p.探索比例+' / 社交'+p.社交复杂度+'\n  执念: '+(p.最大执念||'未填写')+'\n  缺陷: '+(p.致命缺陷||'未填写')}async function syncWorldbook(p){
    var binding=getCharWorldbookNames('current');
    var worldbookName=binding&&binding.primary;
    if(!worldbookName)throw new Error('当前角色卡未绑定主世界书');
    var entries=await getWorldbook(worldbookName);
    var userEntry=entries.find(function(entry){return entry.name==='user信息'});
    if(!userEntry){
      var nextUid=entries.reduce(function(max,entry){return Math.max(max,Number(entry.uid)||0)},0)+1;
      userEntry={uid:nextUid,name:'user信息',enabled:true,strategy:{type:'constant',keys:[],keys_secondary:{logic:'and_any',keys:[]},scan_depth:'same_as_global'},position:{type:'before_character_definition',role:'system',depth:0,order:0},content:'',probability:100,recursion:{prevent_incoming:false,prevent_outgoing:false,delay_until:null},effect:{sticky:null,cooldown:null,delay:null}};
      entries.push(userEntry);
    }
    userEntry.enabled=true;
    userEntry.strategy.type='constant';
    userEntry.position.type='before_character_definition';
    userEntry.content=userInfoContent(p);
    entries.forEach(function(entry){if(/^时代/.test(entry.name)){entry.enabled=entry.name.indexOf(p.故事时代)>=0}});
    await replaceWorldbook(worldbookName,entries,{render:'debounced'});
    return '世界书已同步'
  }async function createOpening(){await waitGlobalInitialized('Mvu');var p=profile(),msg=tpl(OPENING_TEMPLATE,p),sd;el('profileOutput').value='【多维矩阵角色创建档案】\n'+JSON.stringify(p,null,2)+'\n\n【开场白】\n'+msg;try{sd=statFromForm(p)}catch(e){note('读取0层 InitVar 失败：'+(e.message||e));return}try{var wbMsg=await syncWorldbook(p);note(wbMsg+'；正在创建第1层消息...')}catch(wbErr){note('世界书同步失败：'+(wbErr.message||wbErr)+'；继续创建第1层消息。')}try{await createChatMessages([{role:'assistant',message:msg,data:{stat_data:sd}}],{refresh:'none'});note('已创建第1层开场消息。');await eventEmit('mx:pseudo-layer-updated',msg,sd);if(window.__mxEnterMain)window.__mxEnterMain(msg,sd)}catch(e2){note('createChatMessages 调用失败：'+(e2.message||e2))}}
function init(){fill('identitySelect',identities);fill('skillSelect',skills);fill('alignmentSelect',alignments);fill('dungeonSelect',dungeons);resetAttrs();['nameInput','codeInput','genderInput','ageInput','locInput','identitySelect','customIdentity','eraInput','customEra','regionInput','lastMemory','obsession','flaw','directionSelect','customDirection','energySelect','customEnergy','skillSelect','customSkill','alignmentSelect','dungeonSelect','customDungeon','combatSelect','exploreSelect','socialSelect'].forEach(function(id){var n=el(id);if(n)n.oninput=updatePreview});document.querySelectorAll('.mx-step').forEach(function(b,i){b.onclick=function(){state.step=i;render()}});el('prevStep').onclick=function(){state.step=Math.max(0,state.step-1);render()};el('nextStep').onclick=function(){state.step=Math.min(steps.length-1,state.step+1);render()};el('attrList').onclick=function(e){var b=e.target.closest('button');if(!b)return;var a=b.getAttribute('data-attr'),d=Number(b.getAttribute('data-delta')),st=stageData[state.stage];if(d>0&&spent()>=st.points)return;if(d<0&&state.attrs[a]<=st.min)return;if(d>0&&state.attrs[a]>=st.max)return;state.attrs[a]+=d;renderAttrs();updatePreview()};el('randomAll').onclick=function(){state.stage=pick(Object.keys(stageData));resetAttrs();state.entry=pick(entryTypes);state.enhance=pick(Object.keys(enhanceTypes));state.direction=pick(enhanceTypes[state.enhance].filter(function(x){return x!=='自定义'}));el('identitySelect').value=pick(identities.filter(function(x){return x!=='自定义'}));el('genderInput').value=pick(['男','女','非公开']);el('ageInput').value=18+Math.floor(Math.random()*30);el('eraInput').value=pick(['现代都市','近未来','废土时代','低魔中古','高魔纪元','星际时代']);el('skillSelect').value=pick(skills.filter(function(x){return x!=='自定义'}));el('alignmentSelect').value=pick(alignments);el('dungeonSelect').value=pick(dungeons.filter(function(x){return x!=='自定义'}));render()};el('makeProfile').onclick=createOpening;el('sendInput').onclick=function(){var p=profile(),text='【多维矩阵角色创建档案】\n'+JSON.stringify(p,null,2);el('profileOutput').value=text;var fn=null;try{fn=window.triggerSlash||(window.parent&&window.parent.triggerSlash)}catch(e){}if(fn){fn('/setinput '+text);note('已尝试填入酒馆输入框，请检查后发送。')}else note('未检测到 /setinput API，请手动查看档案摘要。')};render()}init();
/* ===== 小屏：实时档案折叠 ===== */
(function(){
  var pv=document.querySelector('#mx-create-overlay .mx-preview'),pt=el('previewToggle');
  if(!pv||!pt)return;
  pt.addEventListener('click',function(){pv.dataset.userToggled='1';var c=pv.classList.toggle('mx-collapsed');pt.setAttribute('aria-expanded',String(!c))});
  if(window.matchMedia){
    var mq=window.matchMedia('(max-width:760px)');
    var sync=function(){if(!pv.dataset.userToggled)pv.classList.toggle('mx-collapsed',mq.matches)};
    try{mq.addEventListener('change',sync)}catch(e){try{mq.addListener(sync)}catch(e2){}}
    sync();
  }
})();
})();

/* ===== MAIN STATUS BAR LOGIC ===== */

        (function() {
            if (window.__mxConsoleInit) return;
            window.__mxConsoleInit = true;

            var HOST = window.top || window.parent || window;
            var POLL_MS = 1000;
            var lastRawText = '';
            var lastStatData = null;
            var combatMounted = false;
            var combatEverMounted = false;
            var activeMxTab = 'narrative';

            /* ===== 长按重roll/编辑状态 ===== */
            window.__mxDebug = true;
            var contextMenuPos = null;
            var contextMenuOpenedAt = 0;
            var editingMessage = null;
            var currentMessageInfo = {};
            var longPressTimer = null;
            var mxIsLoading = false;

            /* ===== 工具函数 ===== */
            function getCurrentMsgObj() {
                try {
                    if (typeof getChatMessages !== 'function') return null;
                    var lastId = typeof getLastMessageId === 'function' ? getLastMessageId() : '{{lastMessageId}}';
                    var msgs = getChatMessages('0-' + lastId, { role: 'assistant' });
                    if (!msgs || !msgs.length) return null;
                    return msgs[msgs.length - 1];
                } catch (e) { return null; }
            }

            function getRawText() {
                var m = getCurrentMsgObj();
                if (m) {
                    var text = m.message || m.mes || '';
                    var messageId = Number(m.message_id);
                    var cachedId = window.__mxPseudoState ? Number(window.__mxPseudoState.messageId) : -1;
                    if (!window.__mxPseudoState || messageId >= cachedId) {
                        window.__mxPseudoState = window.__mxPseudoState || {};
                        window.__mxPseudoState.latestAssistantText = text;
                        window.__mxPseudoState.messageId = m.message_id;
                    }
                    return text;
                }
                return window.__mxPseudoState ? window.__mxPseudoState.latestAssistantText || '' : '';
            }

            function getStatData() {
                var m = getCurrentMsgObj();
                if (m) {
                    var statData = (m.data && m.data.stat_data) || m.stat_data || null;
                    if (statData) {
                        window.__mxPseudoState = window.__mxPseudoState || {};
                        window.__mxPseudoState.statData = statData;
                        window.__mxPseudoState.messageId = m.message_id;
                        return statData;
                    }
                }
                return window.__mxPseudoState ? window.__mxPseudoState.statData || null : null;
            }

            function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function(c) { return { '&': '&amp;',
                        '<': '&lt;', '>': '&gt;', '"': '&quot;' } [c]; }); }

            function num(v, d) { var n = parseFloat(v); return isNaN(n) ? (d || 0) : n; }

            /* ===== 提取最后一个 <content> ===== */
            function extractContent(rawText) {
                if (!rawText) return '';
                rawText = String(rawText).replace(/<think(?:ing)?[^>]*>[\s\S]*?<\/think(?:ing)?>/gi, '').replace(/<think(?:ing)?[^>]*>[\s\S]*$/gi, '');
                var matches = String(rawText).match(/<(?:content|maintext)>([\s\S]*?)<\/(?:content|maintext)>/gi);
                if (!matches || !matches.length) return '';
                return matches[matches.length - 1].replace(/<\/?(?:content|maintext)>/gi, '').replace(/^\s+/, '').trimEnd();
            }
            /* ===== 提取最后一个 <option>，按行拆分 ===== */
            function extractOptions(rawText) {
                if (!rawText) return [];
                var matches = String(rawText).match(/<option>([\s\S]*?)<\/option>/gi);
                if (!matches || !matches.length) return [];
                return matches[matches.length - 1]
                    .replace(/<\/?option>/gi, '')
                    .split('\n')
                    .map(function(s) { return s.trim(); })
                    .filter(function(s) { return s.length > 0; });
            }

            /* ===== 渲染正文 ===== */
            function renderContent(rawText) {
                var box = document.getElementById('mx-content-box');
                if (!box) return;
                var content = extractContent(rawText).replace(/\r\n?/g, '\n').trim();
                var paras = content.split(/\n{2,}/)
                    .map(function(p) { return p.trim(); })
                    .filter(function(p) { return p.length > 0; })
                    .map(function(p) { return '<p>' + esc(p).replace(/\n/g, '<br>') + '</p>'; })
                    .join('');
                box.innerHTML = paras;
            }

            /* ===== 渲染选项 ===== */
            function renderOptions(rawText) {
                var body = document.getElementById('mx-options-body');
                var section = document.getElementById('mx-section-options');
                if (!body || !section) return;
                var options = extractOptions(rawText);
                if (!options.length) {
                    section.style.display = 'none';
                    body.innerHTML = '';
                    return;
                }
                section.style.display = '';
                section.classList.add('collapsed');
                body.classList.add('collapsed');
                var html = options.map(function(opt, i) {
                    return '<button class="mx-option-btn" data-opt="' + esc(opt) + '">' +
                        '<span class="opt-ico">' + (i + 1) + '</span>' +
                        '<span class="opt-txt">' + esc(opt) + '</span>' +
                        '<i class="fa-solid fa-chevron-right opt-arrow"></i>' +
                        '</button>';
                }).join('');
                body.innerHTML = html;
            }

            /* ===== 选项点击 → 填入伪同层输入框 ===== */
            document.getElementById('mx-options-body').addEventListener('click', function(e) {
                var btn = e.target.closest('[data-opt]');
                if (!btn) return;
                var input = document.getElementById('mx-pseudo-text');
                if (!input) return;
                input.value = btn.getAttribute('data-opt') || '';
                input.focus();
                input.setSelectionRange(input.value.length, input.value.length);
                var state = document.getElementById('mx-pseudo-state');
                if (state) state.textContent = '已填入选项，可修改后发送';
            });

            /* ===== 选项板块展开/收起 ===== */
            document.getElementById('mx-options-head').addEventListener('click', function() {
                var section = document.getElementById('mx-section-options');
                var body = document.getElementById('mx-options-body');
                var collapsed = body.classList.toggle('collapsed');
                section.classList.toggle('collapsed', collapsed);
            });

            /* ===== 顶层标签切换 ===== */
            document.getElementById('mx-tabs').addEventListener('click', function(e) {
                var t = e.target.closest('[data-mxtab]');
                if (!t) return;
                activeMxTab = t.dataset.mxtab;
                document.querySelectorAll('.mx-tab').forEach(function(x) { x.classList.remove('active'); });
                document.querySelectorAll('.mx-page').forEach(function(x) { x.classList.remove('active'); });
                t.classList.add('active');
                var page = document.getElementById('mx-page-' + activeMxTab);
                if (page) page.classList.add('active');
                if (activeMxTab === 'combat') { ensureCombatMount(); }
            });

            /* ===== 全屏 ===== */
            (function() {
                var btn = document.getElementById('mx-fullscreen-toggle');
                if (!btn) return;
                var root = btn.closest('#mx-console') || document.getElementById('mx-console');
                if (!root) return;
                var icon = btn.querySelector('i');
                var isFs = false, savedParent = null, savedNext = null;
                function enterFs() {
                    if (isFs) return;
                    savedParent = root.parentNode;
                    savedNext = root.nextSibling;
                    document.body.appendChild(root);
                    root.classList.add('mx-fullscreen');
                    if (icon) { icon.classList.remove('fa-expand'); icon.classList.add('fa-compress'); }
                    isFs = true;
                }
                function exitFs() {
                    if (!isFs) return;
                    root.classList.remove('mx-fullscreen');
                    if (savedParent && savedParent.isConnected) {
                        if (savedNext && savedNext.parentNode === savedParent) savedParent.insertBefore(root, savedNext);
                        else savedParent.appendChild(root);
                    }
                    if (icon) { icon.classList.add('fa-expand'); icon.classList.remove('fa-compress'); }
                    isFs = false;
                }
                btn.addEventListener('click', function() { isFs ? exitFs() : enterFs(); });
            })();

            /* ===== 战斗挂载管理 ===== */
            /* ===== 战斗刚结束判定：最后一条 assistant 消息为战斗结束摘要时，阻止自动重召唤 ===== */
            function mxCombatJustEnded() {
                try {
                    var m = getCurrentMsgObj();
                    var t = m ? String(m.message || m.mes || '') : '';
                    return t.indexOf('<content>战斗结束</content>') >= 0 && t.indexOf('═══ 战斗记录') >= 0;
                } catch (e) { return false; }
            }
            function combatActive() {
                var sd = getStatData();
                var mvuFlag = false;
                try { mvuFlag = !!(sd && sd.主页 && sd.主页.战斗中 === true); } catch (e) {}
                var engineFlag = false;
                try { var st = HOST.getCombatState ? HOST.getCombatState() : null;
                    engineFlag = !!(st && st.active); } catch (e) {}
                var justEnded = false;
                try { if (mvuFlag && !engineFlag) justEnded = mxCombatJustEnded(); } catch (e2) {}
                if (justEnded) return false;
                return mvuFlag || engineFlag;
            }
            var _combatEventsBound = false;

            function bindCombatMountEvents(mount) {
                if (_combatEventsBound) return;
                _combatEventsBound = true;
                mount.addEventListener('click', function(e) {
                    var el;
                    el = e.target.closest('[data-quick]');
                    if (el) { try { HOST.cbHandleQuick(el.getAttribute('data-quick'), mount); } catch (ex) { console
                                .error(ex); } return; }
                    el = e.target.closest('[data-buff]');
                    if (el) { try { HOST.cbHandleBuff(parseInt(el.getAttribute('data-buff'), 10), parseInt(el
                                .getAttribute('data-bi'), 10)); } catch (ex) { console.error(ex); } return; }
                    el = e.target.closest('[data-target]');
                    if (el) { try { HOST.cbHandleTarget(parseInt(el.getAttribute('data-target'), 10)); } catch (
                        ex) { console.error(ex); } return; }
                    el = e.target.closest('[data-hp]');
                    if (el) { try { HOST.cbHandleHp(parseInt(el.getAttribute('data-hp'), 10), parseInt(el
                                .getAttribute('data-d'), 10)); } catch (ex) { console.error(ex); } return; }
                    el = e.target.closest('[data-skill]');
                    if (el && !el.disabled) { try { HOST.cbHandleSkill(el.getAttribute('data-skill')); } catch (
                        ex) { console.error(ex); } return; }
                    el = e.target.closest('[data-use-item]');
                    if (el) { try { HOST.cbHandleClick('useitem', { itemName: el.getAttribute('data-use-item') },
                            mount); } catch (ex) { console.error(ex); } return; }
                    el = e.target.closest('[data-tab]');
                    if (el) { try { HOST.cbHandleClick('tab', { tab: el.getAttribute('data-tab') }, mount); } catch (
                        ex) { console.error(ex); } return; }
                    el = e.target.closest('[data-act]');
                    if (el) {
                        var data = {};
                        if (el.dataset.pt) data.pt = el.dataset.pt;
                        if (el.dataset.mode) data.mode = el.dataset.mode;
                        if (el.dataset.pidx) data.pidx = el.dataset.pidx;
                        if (el.dataset.unitId) data.unitId = el.dataset.unitId;
                        if (el.dataset.name) data.name = el.dataset.name;
                        if (el.dataset.idx) data.idx = el.dataset.idx;
                        if (el.dataset.u) data.u = el.dataset.u;
                        if (el.dataset.target) data.target = el.dataset.target;
                        try { HOST.cbHandleClick(el.getAttribute('data-act'), data, mount); } catch (ex) { console
                                .error(ex); }
                        return;
                    }
                });
                mount.addEventListener('input', function(e) {
                    var rp = e.target.closest('#cb-rp-input');
                    if (rp) {
                        try { var st = HOST.getCombatState ? HOST.getCombatState() : null; if (st) { st
                                    ._narrativeText = rp.value; } } catch (ex) {}
                    }
                });
                console.log('[复合控制台] 战斗挂载点事件代理已绑定');
            }
            var combatMountAttempts = 0;

            function ensureCombatMount() {
                var mount = document.getElementById('mx-combat-mount');
                if (!mount) return;
                if (combatMounted) return;
                if (!HOST.renderCombatPanel) {
                    combatMountAttempts++;
                    if (combatMountAttempts < 30) { setTimeout(ensureCombatMount, 200); return; }
                    mount.innerHTML =
                        '<div class="mx-combat-loading"><i class="fa-solid fa-triangle-exclamation"></i> 战斗引擎未加载，请检查脚本是否启用。</div>';
                    return;
                }
                mount.innerHTML = '';
                try {
                    HOST.renderCombatPanel(mount);
                    combatMounted = true;
                    combatEverMounted = true;
                    bindCombatMountEvents(mount);
                } catch (e) { console.error('[复合控制台] renderCombatPanel 失败', e); }
            }
            var _lastCombatActive = false;

            function refreshCombatVisibility() {
                var active = combatActive();
                ensureCombatMount();
                if (active && !_lastCombatActive) {
                    _mxSummonTried = false;
                    _mxSummonResult = '';
                    mxLoadSpawnCache();
                    var combatTab = document.querySelector('.mx-tab.combat');
                    if (combatTab) { combatTab.classList.add('combat-ready'); }
                }
                if (!active && _lastCombatActive) {
                    _mxSummonTried = false;
                    _mxSummonResult = '';
                    /* 延后清理：避开引擎结束战斗后 ~1.5s 内的聊天变量密集写入，防止整表替换竞态丢数据 */
                    setTimeout(function() { try { if (!combatActive()) mxClearSpawnCache(); } catch (eClr) {} }, 2200);
                }
                _lastCombatActive = active;
                var root = document.getElementById('mx-console');
                var st = HOST.getCombatState ? HOST.getCombatState() : null;
                if (root) root.classList.toggle('in-combat', active);
                renderMxCombat(st, active);
            }

            /* ============================================================
             * 自绘战斗 HUD (mx-cb-stage) · 暗色高对比战斗层
             * 引擎 HUD 隐藏于 #mx-combat-mount，仅借用其 #cb-rp-input
             * ============================================================ */
            var _mxRpDraft = '';
            var _mxExpSkill = null;
            var _mxPanels = { skills: true, equip: false, log: true, terrain: true };
            var _mxMore = false;
            var _mxShowNative = false;
            var _mxSig = '';
            var _mxBound = false;
            var _mxLogScroll = 0;
            var _mxNarrScroll = 0;
            var _mxSummonTried = false;
            var _mxSummonResult = '';
            var _mxSpawnCache = null;
            var ATTRS6 = ['力量', '敏捷', '体质', '智力', '精神', '魅力'];

            function mxStatData() {
                try { var d = getStatData(); if (d) return d; } catch (e) {}
                try { if (HOST.CombatV6 && HOST.CombatV6.fetchStatData) return HOST.CombatV6.fetchStatData(); } catch (e) {}
                return null;
            }
            function mxPhaseInfo(p) {
                var m = { IDLE: ['未开始', '#6b6488'], PLAYER_ACTING: ['等待玩家行动', '#34d399'], AI_GENERATING: ['AI 演绎中…', '#ef4444'], ENEMY_RESOLVING: ['敌方结算中…', '#fbbf24'], COMBAT_END: ['战斗结束', '#a78bfa'] };
                return m[p] || [String(p || '未知'), '#6b6488'];
            }
            function mxControlled(state) {
                if (!state || !state.units) return null;
                if (state.controlledUnitId) {
                    for (var i = 0; i < state.units.length; i++) { var u = state.units[i]; if (u.id === state.controlledUnitId && (u.isPlayer || u.isAlly) && u.hp > 0) return u; }
                }
                for (var j = 0; j < state.units.length; j++) { if (state.units[j].isPlayer) return state.units[j]; }
                return null;
            }
            function mxBar(pct, cls) {
                pct = Math.max(0, Math.min(100, pct || 0));
                return '<span class="mxc-bar-track"><i class="mxc-bar-fill ' + cls + '" style="width:' + pct + '%"></i></span>';
            }
            function mxApDots(cur, max) {
                var s = ''; max = max || 4; cur = cur || 0;
                for (var i = 0; i < max; i++) { s += '<i class="mxc-ap-dot' + (i < cur ? ' on' : '') + '"></i>'; }
                return s;
            }
            function mxAttrHtml(u) {
                var s = '';
                for (var i = 0; i < ATTRS6.length; i++) {
                    var a = ATTRS6[i];
                    var base = num(u.attrs && u.attrs[a], 10);
                    var eff = (u.eff && u.eff[a] != null) ? u.eff[a] : base;
                    var cls = ''; if (eff > base) cls = ' buffed'; else if (eff < base) cls = ' debuffed';
                    s += '<div class="mxc-attr' + cls + '"><span class="n">' + a + '</span><span class="v">' + eff + '</span></div>';
                }
                return s;
            }
            function mxBuffHtml(u, idx) {
                var s = '';
                (u.buffs || []).forEach(function (b, i) {
                    var nm = String(b.name || '');
                    var isDeb = nm.indexOf('灼烧') >= 0 || b.target === 'enemy' || b.effect === 'debuff_apply';
                    var cls = b.turns === -1 ? 'perm' : (isDeb ? 'debuff' : 'buff');
                    var dur = b.turns === -1 ? '∞' : b.turns;
                    var clickable = (cls === 'buff' || cls === 'debuff') ? (' data-buff="' + idx + '" data-bi="' + i + '"') : '';
                    s += '<span class="mxc-chip ' + cls + '"' + clickable + ' title="' + esc(nm) + '">' + esc(nm) + '<i>' + dur + '</i></span>';
                });
                var cd = u.cooldowns || {};
                Object.keys(cd).forEach(function (k) { s += '<span class="mxc-chip cd" title="' + esc(k) + '冷却">' + esc(k) + '<i>' + cd[k] + '</i></span>'; });
                return s;
            }
            function mxUnitCard(u, idx, state) {
                if (!u) return '';
                var role = u.isPlayer ? 'player' : (u.isAlly ? 'ally' : 'enemy');
                var dead = u.hp <= 0;
                var d = u.derived || {};
                var hpMax = d.hpMax || 1;
                var hpPct = (u.hp / hpMax) * 100;
                var isTarget = (state.targetIdx === idx);
                var isCtrl = (state.controlledUnitId === u.id);
                var enMax = d.energyMax || 0;
                var enPct = enMax > 0 ? (u.energy / enMax) * 100 : 0;
                var slotHtml = '';
                if (u.isPlayer || u.isAlly) {
                    var slots = ['武器', '副手', '防具', '饰品'];
                    slotHtml = '<div class="mxc-equip-slots">' + slots.map(function (s) {
                        var v = u.equippedSlots && u.equippedSlots[s];
                        return '<span class="mxc-equip-slot' + (v ? '' : ' empty') + '"><b>' + s + '</b>' + (v ? esc(v) : '—') + '</span>';
                    }).join('') + '</div>';
                }
                var ctrlBtns = '';
                if ((u.isPlayer || u.isAlly) && !dead) {
                    ctrlBtns += '<button class="mxc-mini' + (isCtrl ? ' active' : '') + '" data-act="controlswitch" data-unit-id="' + esc(u.id) + '">' + (isCtrl ? '● 操控中' : '切换操控') + '</button>';
                }
                if (!u.isPlayer) {
                    ctrlBtns += '<button class="mxc-mini' + (isTarget ? ' target' : '') + '" data-target="' + idx + '">' + (isTarget ? '◉ 目标' : '设为目标') + '</button>';
                }
                var hpLow = hpPct < 30;
                var bars = '<div class="mxc-bar-line"><span class="mxc-bar-label">HP</span>' + mxBar(hpPct, hpLow ? 'low' : 'hp') + '<span class="mxc-bar-val">' + Math.max(0, u.hp) + '/' + hpMax + '</span>';
                
                bars += '</div>';
                if (enMax > 0) { bars += '<div class="mxc-bar-line"><span class="mxc-bar-label">' + esc(u.energyType || '能量') + '</span>' + mxBar(enPct, 'energy') + '<span class="mxc-bar-val">' + u.energy + '/' + enMax + '</span></div>'; }
                var ap = '<div class="mxc-ap-row"><span class="mxc-ap-label">AP</span>' + mxApDots(u.ap, d.apMax || 4) + '<span class="mxc-ap-info">' + u.ap + '/' + (d.apMax || 4) + '</span></div>';
                var derived = '<div class="mxc-derived"><span>物防 <b>' + (d.physDef || 0) + '</b></span><span>神防 <b>' + (d.mystDef || 0) + '</b></span><span>暴击 <b>' + (d.critRate || 0) + '%</b></span><span>移速 <b>' + (d.moveSpeed || 0) + 'm</b></span></div>';
                var buffs = mxBuffHtml(u, idx);
                return '<div class="mxc-unit ' + role + (isTarget ? ' target' : '') + (isCtrl ? ' controlled' : '') + (dead ? ' dead' : '') + '" data-u="' + idx + '">' +
                    '<div class="mxc-unit-head"><span class="mxc-unit-name">' + esc(u.name) + '</span><span class="mxc-unit-tag ' + role + '">' + (u.isPlayer ? '玩家' : (u.isAlly ? '队友' : '敌人')) + ' (' + num(u.x, 0) + ',' + num(u.y, 0) + ')</span>' + ctrlBtns + '</div>' +
                    bars + ap + slotHtml + '<div class="mxc-attrs">' + mxAttrHtml(u) + '</div>' + derived + (buffs ? '<div class="mxc-buffs">' + buffs + '</div>' : '') + '</div>';
            }
            function mxSkillCards(state, data) {
                var skills = {};
                try { if (HOST.readSkillCards && data) skills = HOST.readSkillCards(data); } catch (e) {}
                var names = Object.keys(skills);
                if (!names.length) return '<div class="mxc-empty">暂无技能</div>';
                var canAct = state.phase === 'PLAYER_ACTING';
                var s = '<div class="mxc-skill-grid">';
                names.forEach(function (n) {
                    var sk = skills[n]; if (!sk) return;
                    var open = (_mxExpSkill === n) ? ' open' : '';
                    var type = sk.伤害类型 || sk.type || '其他';
                    var badgeCls = (type === '物理') ? '物理' : (type === '魔法' || type === '法术') ? '法术' : (type === '辅助' ? '辅助' : '其他');
                    var meta = [];
                    if (sk.AP消耗 != null) meta.push('AP ' + sk.AP消耗);
                    if (sk.能量消耗) meta.push('能量 ' + sk.能量消耗);
                    if (sk.冷却) meta.push('CD ' + sk.冷却);
                    if (sk.范围) meta.push(esc(sk.范围));
                    var dmg = sk.伤害 ? '<div class="mxc-skill-row"><span>伤害 <b>' + esc(sk.伤害) + '</b></span></div>' : '';
                    var effs = sk._effects || [];
                    var effHtml = effs.length ? '<div class="mxc-skill-effects">' + effs.map(function (e) {
                        return '<span class="mxc-effect-tag">' + esc(e.effect || 'special') + (e.target ? '·' + esc(e.target) : '') + (e.rollTarget ? '·' + esc(e.rollTarget) : '') + '</span>';
                    }).join('') + '</div>' : '';
                    var desc = sk.描述 ? '<div class="mxc-skill-desc">' + esc(sk.描述) + '</div>' : '';
                    s += '<div class="mxc-skill' + open + '" data-mxc-skill="' + esc(n) + '">' +
                        '<div class="mxc-skill-head"><span class="mxc-skill-name">' + esc(n) + '</span><span class="mxc-skill-badge ' + badgeCls + '">' + esc(type) + '</span><i class="fa-solid fa-chevron-down chev"></i></div>' +
                        '<div class="mxc-skill-body"><div class="mxc-skill-row">' + meta.map(function (m) { return '<span>' + m + '</span>'; }).join('') + '</div>' + dmg + effHtml + desc +
                        '<button class="mxc-skill-use" data-skill="' + esc(n) + '"' + (canAct ? '' : ' disabled') + '><i class="fa-solid fa-bolt"></i> 使用</button></div></div>';
                });
                return s + '</div>';
            }
            function mxEquipHtml(state, data) {
                var eqCards = {}, conCards = {}, slots = {};
                try { if (HOST.readEquipmentCards && data) eqCards = HOST.readEquipmentCards(data); } catch (e) {}
                try { if (HOST.readConsumableCards && data) conCards = HOST.readConsumableCards(data); } catch (e) {}
                try { if (HOST.CombatV6 && HOST.CombatV6.getEquippedSlots && data) slots = HOST.CombatV6.getEquippedSlots(data); } catch (e) {}
                var cu = mxControlled(state);
                var slotNames = ['武器', '副手', '防具', '饰品'];
                var h = '<div class="mxc-subhead">已装备</div><div class="mxc-equip-cards">';
                slotNames.forEach(function (sn) {
                    var nm = slots[sn] || (cu && cu.equippedSlots ? cu.equippedSlots[sn] : null);
                    var c = nm ? eqCards[nm] : null;
                    h += '<div class="mxc-equip-card"><div class="ec-name">' + (nm ? esc(nm) : '<span style="color:var(--c-faint)">—</span>') + ' <span class="ec-slot">' + esc(sn) + '</span></div>';
                    if (c) {
                        if (c.伤害) h += '<div class="ec-row">伤害 <b>' + esc(c.伤害) + '</b></div>';
                        if (c.护甲) h += '<div class="ec-row">护甲 <b>' + c.护甲 + '</b></div>';
                        if (c.伤害类型) h += '<div class="ec-row">类型 <b>' + esc(c.伤害类型) + '</b></div>';
                        if (c.范围) h += '<div class="ec-row">范围 <b>' + esc(c.范围) + '</b></div>';
                        var effs = c._effects || [];
                        if (effs.length) h += '<div class="mxc-skill-effects">' + effs.map(function (e) { return '<span class="mxc-effect-tag">' + esc(e.effect || 'special') + '</span>'; }).join('') + '</div>';
                    } else { h += '<div class="mxc-empty" style="padding:8px 0">空槽位</div>'; }
                    h += '</div>';
                });
                h += '</div>';
                var conNames = Object.keys(conCards);
                if (conNames.length) {
                    h += '<div class="mxc-subhead">消耗品</div><div class="mxc-equip-cards">';
                    var canAct = state.phase === 'PLAYER_ACTING';
                    conNames.forEach(function (n) {
                        var it = conCards[n]; if (!it) return;
                        h += '<div class="mxc-item-card"><div class="ic-head"><span class="ic-name">' + esc(n) + '</span><span class="ic-qty">×' + num(it.数量, 1) + '</span></div>';
                        if (it.使用效果) h += '<div class="ic-desc">效果：' + esc(it.使用效果) + '</div>';
                        else if (it.描述) h += '<div class="ic-desc">' + esc(it.描述) + '</div>';
                        h += '<button class="mxc-skill-use" data-use-item="' + esc(n) + '"' + (canAct ? '' : ' disabled') + '><i class="fa-solid fa-flask"></i> 使用</button></div>';
                    });
                    h += '</div>';
                }
                return h;
            }
            function mxLogHtml(state) {
                var log = state.log || [];
                var h = '';
                if (log.length) {
                    h += '<div class="mxc-log-list" id="mx-log-list">';
                    var start = Math.max(0, log.length - 40);
                    for (var i = start; i < log.length; i++) {
                        var e = log[i] || {};
                        var t = String(e.text || '');
                        var isTurn = t.indexOf('-- 回合') >= 0 || t.indexOf('战斗开始') >= 0 || t.indexOf('战斗结束') >= 0;
                        h += '<div class="mxc-log-entry' + (isTurn ? ' turn-line' : '') + '"><span class="lt">T' + (e.turn != null ? e.turn : '') + '</span>' + esc(t) + '</div>';
                    }
                    h += '</div>';
                } else {
                    h += '<div class="mxc-empty">暂无战报记录</div>';
                }
                var dig = state.digests || [];
                if (dig.length) {
                    h += '<div class="mxc-archive"><div class="mxc-archive-title">战报存档</div>';
                    dig.slice(-8).forEach(function (dg) {
                        h += '<div class="mxc-archive-item"><b>回合' + dg.turn + '·' + esc(dg.title || '战报') + '</b><br>' + esc(dg.text) + '</div>';
                    });
                    h += '</div>';
                }
                return h;
            }
            /* 大图浮层 CSS：控制台可能运行在 iframe 中，浮层挂在顶层文档，
               因此需要把样式注入顶层文档（#mx-terrain-overlay 作用域隔离） */
            var _mxTerrainBigCss = [
                '#mx-terrain-overlay{position:fixed;inset:0;background:rgba(42,38,64,0.45);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;}',
                '#mx-terrain-overlay .mxc-terrain-overlay-card{--mx-cell:52px;--mx-axisw:28px;--c-faint:#9A94A8;--c-soft:#6B6578;--c-line:rgba(42,38,64,0.12);background:#FFF9F5;border-radius:18px;padding:20px 24px;max-width:92vw;max-height:88vh;overflow:auto;box-shadow:0 24px 80px rgba(42,38,64,0.35);color:#2A2640;font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;box-sizing:border-box;}',
                '#mx-terrain-overlay .mxc-terrain-overlay-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:6px;position:sticky;top:0;background:#FFF9F5;padding:6px 0;z-index:3;}',
                '#mx-terrain-overlay .mxc-terrain-overlay-head b{font-size:16px;}',
                '#mx-terrain-overlay .mxc-terrain-close{background:rgba(91,154,139,0.12);border:1px solid rgba(91,154,139,0.35);border-radius:9px;padding:6px 14px;font-size:12px;cursor:pointer;color:#47837A;font-weight:700;}',
                '#mx-terrain-overlay .mxc-terrain-close:hover{background:rgba(91,154,139,0.22);}',
                '#mx-terrain-overlay .mxc-terrain-grid-outer{overflow-x:auto;padding-bottom:4px;}',
                '#mx-terrain-overlay .mxc-terrain-grid{display:grid;gap:2px;margin:8px 0 4px;background:rgba(91,154,139,0.10);padding:6px;border-radius:10px;width:max-content;max-width:100%;}',
                '#mx-terrain-overlay .mxc-tcell{width:var(--mx-cell,52px);height:var(--mx-cell,52px);background:#F1EFF6;border-radius:6px;position:relative;display:flex;align-items:center;justify-content:center;font-size:calc(var(--mx-cell,52px)*0.42);font-weight:700;color:#C6C0D2;user-select:none;}',
                '#mx-terrain-overlay .mxc-tcell.highland{background:#FEF3C7;color:#B45309;}',
                '#mx-terrain-overlay .mxc-tcell.wall{background:#4A5568;color:rgba(255,255,255,0.9);}',
                '#mx-terrain-overlay .mxc-tcell.trap{background:#FED7D7;color:#C53030;}',
                '#mx-terrain-overlay .mxc-tcell.cover{background:#C6F6D5;color:#276749;}',
                '#mx-terrain-overlay .mxc-tcell.water{background:#BEE3F8;color:#2A69AC;}',
                '#mx-terrain-overlay .mxc-tcell.narrow{background:#E9D8FD;color:#553C9A;}',
                '#mx-terrain-overlay .mxc-tcell.utoken{color:#FFF;text-shadow:0 1px 2px rgba(0,0,0,0.25);}',
                '#mx-terrain-overlay .mxc-tcell.up-player{background:linear-gradient(135deg,#5B9A8B,#7BC4B0)!important;}',
                '#mx-terrain-overlay .mxc-tcell.up-ally{background:linear-gradient(135deg,#4E9CC7,#7EC8E3)!important;}',
                '#mx-terrain-overlay .mxc-tcell.up-enemy{background:linear-gradient(135deg,#D95F5F,#E87A7A)!important;}',
                '#mx-terrain-overlay .mxc-tcell.ucontrolled{outline:2px solid #E8B86D;outline-offset:1px;animation:mxTerrainPulse 1.6s infinite;}',
                '#mx-terrain-overlay .mxc-tcell.utarget{outline:2px dashed #E87A7A;outline-offset:1px;}',
                '@keyframes mxTerrainPulse{0%,100%{box-shadow:0 0 0 0 rgba(232,184,109,0.55);}50%{box-shadow:0 0 0 5px rgba(232,184,109,0);}}',
                '#mx-terrain-overlay .mxc-tstack{position:absolute;top:-7px;right:-7px;background:#2A2640;color:#fff;font-size:12px;line-height:1;padding:3px 5px;border-radius:9px;font-weight:800;border:1px solid #fff;z-index:2;}',
                '#mx-terrain-overlay .mxc-taxis-x{text-align:center;font-size:max(9px,calc(var(--mx-cell,52px)*0.28));color:#9A94A8;height:16px;align-self:end;line-height:16px;}',
                '#mx-terrain-overlay .mxc-taxis-y{display:flex;align-items:center;justify-content:center;font-size:max(9px,calc(var(--mx-cell,52px)*0.28));color:#9A94A8;width:var(--mx-axisw,28px);}',
                '#mx-terrain-overlay .mxc-terrain-legend{display:flex;flex-wrap:wrap;gap:6px 12px;font-size:11px;color:#9A94A8;margin-top:8px;}',
                '#mx-terrain-overlay .mxc-terrain-legend span{display:inline-flex;align-items:center;gap:4px;}',
                '#mx-terrain-overlay .mxc-terrain-legend i{width:10px;height:10px;border-radius:2px;display:inline-block;}',
                '#mx-terrain-overlay .mxc-terrain-legend i.lg{width:16px;height:16px;border-radius:4px;display:inline-flex;align-items:center;justify-content:center;color:#fff;font-size:9px;font-weight:800;font-style:normal;}',
                '#mx-terrain-overlay .mxc-pos-list{display:flex;flex-wrap:wrap;gap:5px 12px;margin-top:10px;padding-top:10px;border-top:1px dashed rgba(42,38,64,0.12);font-size:13px;color:#6B6578;}',
                '#mx-terrain-overlay .mxc-pos-item{display:inline-flex;align-items:center;gap:5px;}',
                '#mx-terrain-overlay .mxc-pos-item i{width:16px;height:16px;border-radius:5px;display:inline-flex;align-items:center;justify-content:center;color:#fff;font-size:9px;font-weight:800;font-style:normal;}'
            ].join('\n');
            function mxEnsureTerrainCss(doc) {
                try {
                    if (!doc.getElementById('mx-terrain-style')) {
                        var st = doc.createElement('style');
                        st.id = 'mx-terrain-style';
                        st.textContent = _mxTerrainBigCss;
                        (doc.head || doc.documentElement).appendChild(st);
                    }
                } catch (e) { console.error('[mx-combat] terrain css inject', e); }
            }
            function mxTerrainHtml(state) {
                var t = state.terrain;
                if (!t || !t.cells) {
                    return '<div class="mxc-empty">无战场地形数据</div>' +
                        '<div class="mxc-terrain-gen">' +
                        '<div class="mxc-terrain-gen-tip">AI 在战斗楼层输出 <b>&lt;terrain&gt;</b> 标签后，战场地图会自动在此显示。<br>也可以先生成一张默认平地战场，用于查看角色与怪物的站位分布。</div>' +
                        '<button class="mxc-btn" data-act="genterrain"><i class="fa-solid fa-map"></i> 生成默认战场 (12×8 平地)</button>' +
                        '</div>';
                }
                return '<div class="mxc-terrain-tools"><button class="mxc-btn" data-act="terrainbig"><i class="fa-solid fa-expand"></i> 大图查看</button></div>' + mxTerrainMapHtml(state);
            }
            function mxTerrainMapHtml(state) {
                var t = state.terrain;
                if (!t || !t.cells) return '';
                var cuId = state.controlledUnitId;
                var tgt = (state.units && state.targetIdx != null) ? state.units[state.targetIdx] : null;
                /* 存活单位按坐标分组 */
                var occ = {};
                (state.units || []).forEach(function (u) {
                    if (u.hp <= 0 || u.x == null || u.y == null) return;
                    var k = u.x + ',' + u.y;
                    (occ[k] = occ[k] || []).push(u);
                });
                var TMAP = { '高地': 'highland', '墙壁': 'wall', '陷阱': 'trap', '掩体': 'cover', '水域': 'water', '狭窄': 'narrow' };
                var GLYPH = { '高地': '▲', '墙壁': '▓', '陷阱': '×', '掩体': '掩', '水域': '≈', '狭窄': '窄' };
                var grid = '<div class="mxc-terrain-grid-outer"><div class="mxc-terrain-grid" style="grid-template-columns:var(--mx-axisw,16px) repeat(' + t.width + ',var(--mx-cell,24px))">';
                /* 顶部X轴 */
                grid += '<div class="mxc-taxis-y"></div>';
                for (var ax = 0; ax < t.width; ax++) grid += '<div class="mxc-taxis-x">' + (ax % 5 === 0 ? ax : '·') + '</div>';
                for (var y = 0; y < t.height; y++) {
                    grid += '<div class="mxc-taxis-y">' + (y % 2 === 0 ? y : '·') + '</div>';
                    for (var x = 0; x < t.width; x++) {
                        var c = (t.cells[y] && t.cells[y][x]) || {};
                        var cls = 'mxc-tcell';
                        var inner = '·';
                        var title = '(' + x + ',' + y + ') ' + (c.type || '平地');
                        var stack = occ[x + ',' + y];
                        if (stack && stack.length) {
                            var disp = stack[0];
                            stack.forEach(function (s) { if (cuId && s.id === cuId) disp = s; });
                            var role = disp.isPlayer ? 'player' : (disp.isAlly ? 'ally' : 'enemy');
                            cls += ' utoken up-' + role;
                            inner = disp.isPlayer ? 'P' : (disp.isAlly ? 'A' : 'E');
                            if (cuId && disp.id === cuId) cls += ' ucontrolled';
                            if (tgt && disp.id === tgt.id) cls += ' utarget';
                            title += ' | ' + stack.map(function (s) { return s.name + (s.hp != null ? ' HP' + s.hp : ''); }).join(' / ');
                            grid += '<div class="' + cls + '" title="' + esc(title) + '">' + inner + (stack.length > 1 ? '<span class="mxc-tstack">×' + stack.length + '</span>' : '') + '</div>';
                            continue;
                        }
                        if (TMAP[c.type]) { cls += ' ' + TMAP[c.type]; inner = GLYPH[c.type]; }
                        grid += '<div class="' + cls + '" title="' + esc(title) + '">' + inner + '</div>';
                    }
                }
                grid += '</div></div>';
                /* 站位一览 */
                var alive = (state.units || []).filter(function (u) { return u.hp > 0 && u.x != null; });
                if (alive.length) {
                    grid += '<div class="mxc-pos-list">' + alive.map(function (u) {
                        var col = u.isPlayer ? '#5B9A8B' : (u.isAlly ? '#4E9CC7' : '#E87A7A');
                        var tag = u.isPlayer ? 'P' : (u.isAlly ? 'A' : 'E');
                        return '<span class="mxc-pos-item"><i style="background:' + col + '">' + tag + '</i>' + esc(u.name) + ' (' + u.x + ',' + u.y + ')</span>';
                    }).join('') + '</div>';
                }
                return grid + '<div class="mxc-terrain-legend">' +
                    '<span><i class="lg" style="background:#5B9A8B">P</i>我方</span>' +
                    '<span><i class="lg" style="background:#4E9CC7">A</i>队友</span>' +
                    '<span><i class="lg" style="background:#E87A7A">E</i>敌方</span>' +
                    '<span><i style="background:#FEF3C7"></i>高地▲</span>' +
                    '<span><i style="background:#4A5568"></i>墙▓</span>' +
                    '<span><i style="background:#FED7D7"></i>陷阱×</span>' +
                    '<span><i style="background:#C6F6D5"></i>掩体</span>' +
                    '<span><i style="background:#BEE3F8"></i>水域</span>' +
                    '<span><i style="background:#E9D8FD"></i>狭窄</span>' +
                    '<span><i class="lg" style="background:#fff;outline:2px solid #E8B86D;outline-offset:-2px;"></i>操控中</span>' +
                    '<span><i class="lg" style="background:#fff;outline:2px dashed #E87A7A;outline-offset:-2px;"></i>当前目标</span>' +
                    '</div>';
            }
            function mxActionsHtml(state, cu) {
                var ph = state.phase;
                if (ph !== 'PLAYER_ACTING' || !cu || !(cu.isPlayer || cu.isAlly) || cu.hp <= 0) {
                    var pi = mxPhaseInfo(ph);
                    return '<div class="mxc-phase-banner"><i class="fa-solid fa-hourglass-half"></i>' + esc(pi[0]) + '</div>';
                }
                var wt = cu.weaponType || 'onehand';
                var am = null; try { if (HOST.CombatV6 && HOST.CombatV6.getAttackMode) am = HOST.CombatV6.getAttackMode(cu, mxStatData()); } catch (e) {} var atkCost = (am && am.apCost) ? am.apCost : ((wt === 'twohand') ? 3 : 2); var aoeCost = (wt === 'twohand') ? 3 : 2;
                var at = cu.atkType || 'phys';
                var h = '<div class="mxc-actions">';
                h += '<button class="mxc-act" data-act="attack">普通攻击<span class="mxc-ap-cost">' + atkCost + 'AP</span></button>';
                h += '<button class="mxc-act" data-act="aoe">AOE<span class="mxc-ap-cost">' + aoeCost + 'AP</span></button>';
                h += '<span class="mxc-act-sep"></span>';
                h += '<button class="mxc-act" data-act="dodge">闪避<span class="mxc-ap-cost">1AP</span></button>';
                h += '<button class="mxc-act" data-act="parry" data-pt="weapon">格挡·武器<span class="mxc-ap-cost">1AP</span></button>';
                h += '<button class="mxc-act" data-act="parry" data-pt="shield1h">盾(小)<span class="mxc-ap-cost">1AP</span></button>';
                h += '<button class="mxc-act" data-act="parry" data-pt="barehand">徒手<span class="mxc-ap-cost">1AP</span></button>';
                h += '<span class="mxc-act-sep"></span>';
                h += '<button class="mxc-act" data-act="move" data-mode="walk">走<span class="mxc-ap-cost">1AP</span></button>';
                h += '<button class="mxc-act" data-act="move" data-mode="run">跑<span class="mxc-ap-cost">2AP</span></button>';
                h += '<span class="mxc-act-sep"></span>';
                h += '<button class="mxc-act toggle' + (at === 'magic' ? ' on' : '') + '" data-act="atktype">攻击:' + (at === 'magic' ? '法术' : '物理') + '</button>';
                h += '<button class="mxc-act toggle' + (wt === 'twohand' ? ' on' : '') + '" data-act="wtype">武器:' + (wt === 'twohand' ? '双手' : '单手') + '</button>';
                h += '</div>';
                h += '<div class="mxc-rp"><label>RP 描述（附加到战报，可选）</label><textarea class="mxc-rp-input" id="mx-rp-input" placeholder="描述你的行动/台词，或留空纯投骰…">' + esc(_mxRpDraft) + '</textarea>';
                h += '<div class="mxc-rp-actions"><button class="mxc-act" data-act="customaction"><i class="fa-solid fa-pen"></i> 自定义行动</button><button class="mxc-act" data-act="counter">反击<span class="mxc-ap-cost">1AP</span></button><button class="mxc-act" data-act="throw">投掷<span class="mxc-ap-cost">2AP</span></button></div></div>';
                h += '<div class="mxc-dice"><span class="mxc-dice-label">投骰</span><input class="mxc-dice-expr" id="mx-dice-expr" value="d20" /><button class="mxc-act" data-act="freeroll"><i class="fa-solid fa-dice"></i> 投</button><div class="mxc-dice-quick">';
                ['r力量', 'rd敏捷', 'r智力', 'd20', 'd100', '3d6', 'd4+DB'].forEach(function (q) { h += '<button class="mxc-act" data-quick="' + esc(q) + '">' + esc(q) + '</button>'; });
                h += '</div></div>';
                var pa = state.pendingActions || [];
                h += '<div class="mxc-pending"><div class="mxc-pending-head"><i class="fa-solid fa-list-ol"></i> 待执行行动队列 (' + pa.length + ')</div>';
                pa.forEach(function (a, i) {
                    var summ = a.report ? String(a.report).split('\n')[0] : (a.type || '行动');
                    h += '<div class="mxc-pending-item"><span class="pa-idx">' + (i + 1) + '</span><span class="pa-type">' + esc(a.type || '行动') + '</span><span class="pa-sum">' + esc(summ) + '</span><button data-act="removepending" data-pidx="' + i + '" title="移除">×</button></div>';
                });
                h += '<button class="mxc-end-turn" data-act="endturn"><i class="fa-solid fa-paper-plane"></i>结束回合 → 发送给AI</button></div>';
                return h;
            }
            function mxPanel(key, icon, title, count, body) {
                var coll = _mxPanels[key] ? '' : ' collapsed';
                return '<div class="mxc-panel' + coll + '" data-mxc-panel="' + key + '">' +
                    '<div class="mxc-panel-head"><i class="fa-solid ' + icon + ' ico"></i><span class="ct">' + title + '</span>' + (count != null ? '<span class="cnt">' + count + '</span>' : '') + '<i class="fa-solid fa-chevron-down chev"></i></div>' +
                    '<div class="mxc-panel-body">' + body + '</div></div>';
            }
            function mxSignature(state) {
                if (!state) return '';
                try {
                    var u = (state.units || []).map(function (x) { return [x.id, x.hp, x.ap, x.energy, x.x, x.y, (x.buffs || []).length, JSON.stringify(x.cooldowns || {})].join(','); }).join('|');
                    var tsig = state.terrain ? (state.terrain.width + 'x' + state.terrain.height + ':' + (state.terrain.cells ? state.terrain.cells.length : 0)) : 'none';
                    return state.turn + ':' + state.phase + ':' + state.targetIdx + ':' + state.controlledUnitId + ':' + (state.pendingActions || []).length + ':' + u + ':' + tsig + ':' + (state._narrativeText || '').length + ':' + (state.log || []).length + ':' + (state.digests || []).length;
                } catch (e) { return ''; }
            }
            function renderMxCombat(state, inCombat, force) {
                var stage = document.getElementById('mx-cb-stage');
                if (!stage) return;
                if (inCombat === undefined) { inCombat = !!(state && state.active); }
                var hasState = !!(state && state.units && state.units.length);
                if (!hasState || (!inCombat && !(state && state.active))) {
                    if (!force && _mxSig === 'inactive') return;
                    var loading = inCombat && !hasState;
                    var endMsg = (state && state.phase === 'COMBAT_END');
                    if (loading) {
                        if (mxCombatJustEnded()) {
                            if (!force && _mxSig === 'ended') return;
                            stage.innerHTML =
                                '<div class="mxc-phase-banner"><i class="fa-solid fa-flag-checkered"></i> 战斗结束</div>';
                            _mxSig = 'ended';
                            return;
                        }
                        if (_mxSummonTried && _mxSummonResult === 'ok') {
                            _mxSummonTried = false;
                            _mxSummonResult = '';
                        }
                        if (!_mxSummonTried) {
                            _mxSummonResult = mxSummonCombat();
                            if (_mxSummonResult !== 'no_engine') {
                                _mxSummonTried = true;
                            }
                        }
                        var summonIcon = 'fa-solid fa-khanda';
                        var summonTitle = '正在启动战斗引擎…';
                        var summonDesc = '检测到战斗状态，正在自动召唤战斗引擎';
                        if (_mxSummonResult === 'no_engine') {
                            summonIcon = 'fa-solid fa-gear fa-spin';
                            summonTitle = '战斗引擎加载中…';
                            summonDesc = '正在等待战斗引擎 CDN 资源加载完成';
                        } else if (_mxSummonResult === 'no_spawn') {
                            summonIcon = 'fa-solid fa-circle-exclamation';
                            summonTitle = '未检测到敌人生成标签';
                            summonDesc = 'MVU 已标记战斗状态，但最近楼层中未找到 enemy_spawn 或 ally_spawn 标签';
                        } else if (_mxSummonResult === 'no_units') {
                            summonIcon = 'fa-solid fa-circle-exclamation';
                            summonTitle = '未解析到战斗单位';
                            summonDesc = '已找到生成标签，但未能解析出敌人或队友数据';
                        } else if (_mxSummonResult === 'ok') {
                            summonIcon = 'fa-solid fa-gear fa-spin';
                            summonTitle = '战斗引擎已启动…';
                            summonDesc = '正在初始化战斗数据，请稍候';
                        }
                        if (!force && _mxSig === 'summon:' + _mxSummonResult) return;
                        stage.innerHTML =
                            '<div class="mxc-summon-card">' +
                            '<i class="' + summonIcon + '"></i>' +
                            '<div class="mxc-summon-title">' + summonTitle + '</div>' +
                            '<div class="mxc-summon-desc">' + summonDesc + '</div>' +
                            '</div>';
                        _mxSig = 'summon:' + _mxSummonResult;
                    } else {
                        stage.innerHTML = endMsg ?
                            '<div class="mxc-phase-banner"><i class="fa-solid fa-flag-checkered"></i> 战斗结束</div>' :
                            '<div class="mxc-empty">当前未在战斗中</div>';
                        _mxSig = 'inactive';
                    }
                    return;
                }
                var sig = mxSignature(state);
                if (!force && sig === _mxSig) return;
                var logEl = document.getElementById('mx-log-list'); if (logEl) _mxLogScroll = logEl.scrollTop;
                var pi = mxPhaseInfo(state.phase);
                var data = mxStatData();
                var cu = mxControlled(state);
                var units = state.units || [];
                var allies = [], enemies = [];
                units.forEach(function (u, i) { if (u.isPlayer || u.isAlly) allies.push({ u: u, i: i }); else enemies.push({ u: u, i: i }); });
                var h = '';
                h += '<div class="mxc-topbar"><span class="mxc-title">战斗控制台</span>';
                h += '<span class="mxc-badge turn">回合 ' + state.turn + '</span>';
                h += '<span class="mxc-badge phase" style="color:' + pi[1] + ';border-color:' + pi[1] + ';background:rgba(255,255,255,0.05)">' + esc(pi[0]) + '</span>';
                h += '<span class="mxc-topbar-btns"><button class="mxc-btn" data-mxc-panel-toggle="terrain"><i class="fa-solid fa-map"></i> 地形</button><button class="mxc-btn" data-mxc-panel-toggle="log"><i class="fa-solid fa-scroll"></i> 战报</button><button class="mxc-btn" data-act="addbuff"><i class="fa-solid fa-plus"></i> 施加状态</button><button class="mxc-btn danger" data-act="endcombat"><i class="fa-solid fa-flag-checkered"></i> 结束战斗</button>';
                h += '<span class="mxc-more-wrap"><button class="mxc-btn ghost" data-mxc-more><i class="fa-solid fa-ellipsis"></i></button><span class="mxc-more-menu' + (_mxMore ? ' open' : '') + '">';
                h += '<button class="mxc-btn" data-act="skilledit"><i class="fa-solid fa-gear"></i> 技能编辑器</button>';
                h += '<button class="mxc-btn" data-act="addenemy"><i class="fa-solid fa-user-plus"></i> 添加敌人</button>';
                h += '<button class="mxc-btn" data-mxc-native><i class="fa-solid fa-cubes"></i> ' + (_mxShowNative ? '隐藏' : '查看') + '原生面板</button>';
                h += '</span></span></span></div>';
                h += '<div class="mxc-units"><div class="mxc-side ally"><div class="mxc-side-label">我方</div>';
                h += allies.length ? allies.map(function (o) { return mxUnitCard(o.u, o.i, state); }).join('') : '<div class="mxc-empty">无我方单位</div>';
                h += '</div><div class="mxc-side enemy"><div class="mxc-side-label">敌方</div>';
                h += enemies.length ? enemies.map(function (o) { return mxUnitCard(o.u, o.i, state); }).join('') : '<div class="mxc-empty">无敌人</div>';
                h += '</div></div>';
                h += mxActionsHtml(state, cu);
                var skCount = 0; try { if (HOST.readSkillCards && data) skCount = Object.keys(HOST.readSkillCards(data)).length; } catch (e) {}
                h += mxPanel('skills', 'fa-bolt', '技能', skCount, mxSkillCards(state, data));
                h += mxPanel('equip', 'fa-shield-halved', '装备 · 道具', null, mxEquipHtml(state, data));
                var logBody = mxLogHtml(state);
                h += mxPanel('log', 'fa-scroll', '战报', (state.log || []).length, logBody);
                h += mxPanel('terrain', 'fa-map', '战场地形' + (state.terrain ? ' · ' + state.terrain.width + '×' + state.terrain.height : ' · 未生成'), null, mxTerrainHtml(state));
                stage.innerHTML = h;
                var logEl2 = document.getElementById('mx-log-list'); if (logEl2) logEl2.scrollTop = _mxLogScroll;
                // native panel toggle (engine mount as sibling)
                var nm = document.getElementById('mx-combat-mount');
                var page = document.getElementById('mx-page-combat');
                if (nm && page) {
                    if (_mxShowNative) { if (nm.parentNode === page) page.appendChild(nm); nm.style.setProperty('display', 'block', 'important'); }
                    else { nm.style.removeProperty('display'); }
                }
                if (!_mxBound) { bindMxStageEvents(stage); _mxBound = true; }
                _mxSig = sig;
            }
            function mxSyncToEngine() {
                try {
                    var em = document.getElementById('mx-combat-mount');
                    if (!em) return;
                    var erp = em.querySelector('#cb-rp-input'); if (erp) erp.value = _mxRpDraft;
                    var myDice = document.getElementById('mx-dice-expr'); var edice = em.querySelector('#cb-dice-expr');
                    if (myDice && edice) edice.value = myDice.value;
                } catch (e) {}
            }
            function mxLoadSpawnCache() {
                if (_mxSpawnCache) return;
                try {
                    if (typeof getVariables === 'function') {
                        var cv = getVariables({ type: 'chat' });
                        var saved = cv && cv._mxSpawnText;
                        if (saved) { _mxSpawnCache = { text: saved, enemies: null, allies: null }; }
                    }
                } catch (e) {}
            }
            function mxSaveSpawnText(text) {
                try {
                    if (typeof insertOrAssignVariables === 'function') {
                        insertOrAssignVariables({ _mxSpawnText: text }, { type: 'chat' });
                    }
                } catch (e) {}
            }
            function mxClearSpawnCache() {
                _mxSpawnCache = null;
                try {
                    if (typeof getVariables === 'function') {
                        var cv = getVariables({ type: 'chat' });
                        if (cv && cv._mxSpawnText) {
                            delete cv._mxSpawnText;
                            if (typeof replaceVariables === 'function') replaceVariables(cv, { type: 'chat' });
                        }
                    }
                } catch (e) {}
            }
            function mxSummonCombat() {
                if (!HOST.enterCombat) {
                    return 'no_engine';
                }
                var lid = (typeof getLastMessageId === 'function') ? getLastMessageId() : 0;
                var scanRange = Math.max(0, lid - 10);
                var msgs = (typeof getChatMessages === 'function') ? getChatMessages(scanRange + '-' + lid) : [];
                var text = '';
                if (msgs && msgs.length) {
                    for (var i = msgs.length - 1; i >= 0; i--) {
                        var t = msgs[i].message || msgs[i].mes || '';
                        if (t.indexOf('<enemy_spawn>') >= 0 || t.indexOf('<ally_spawn>') >= 0) { text = t; break; }
                    }
                }
                if (!text && _mxSpawnCache && _mxSpawnCache.text) {
                    text = _mxSpawnCache.text;
                }
                if (!text) {
                    return 'no_spawn';
                }
                var enemies = HOST.parseEnemySpawn ? HOST.parseEnemySpawn(text) : [];
                var allies = HOST.parseAllySpawn ? HOST.parseAllySpawn(text) : [];
                if (HOST.CombatV6 && HOST.CombatV6.parseEnemyLogic) {
                    var el = HOST.CombatV6.parseEnemyLogic(text);
                    enemies.forEach(function (e) { if (el) e.logic = el; });
                }
                if (HOST.CombatV6 && HOST.CombatV6.parseAllyLogic) {
                    var al = HOST.CombatV6.parseAllyLogic(text);
                    allies.forEach(function (a) { if (al) a.logic = al; });
                }
                if (HOST.CombatV6 && HOST.CombatV6.parseScriptBlock) {
                    var es = HOST.CombatV6.parseScriptBlock(text, 'enemy_script');
                    var as = HOST.CombatV6.parseScriptBlock(text, 'ally_script');
                    enemies.forEach(function (e) { if (es) e.script = es; });
                    allies.forEach(function (a) { if (as) a.script = as; });
                }
                if (!enemies.length && !allies.length) {
                    return 'no_units';
                }
                _mxSpawnCache = { text: text, enemies: enemies, allies: allies };
                mxSaveSpawnText(text);
                try {
                    var terrain = (HOST.CombatV6 && HOST.CombatV6.parseTerrain) ? HOST.CombatV6.parseTerrain(text) : null; var p = HOST.enterCombat({ enemies: enemies, allies: allies }, { injectCombatHud: true, posText: text, spawnMsgId: lid, terrain: terrain });
                    if (p && typeof p.then === 'function') {
                        p.then(function () { setTimeout(mxRefresh, 100); }).catch(function (e) { console.error('[mxSummonCombat] enterCombat failed', e); });
                    } else {
                        setTimeout(mxRefresh, 200);
                    }
                    if (typeof toastr !== 'undefined') toastr.success('战斗开始！敌方' + enemies.length + ' 队友' + allies.length);
                    return 'ok';
                } catch (e) {
                    console.error('[mxSummonCombat] enterCombat error', e);
                    return 'error';
                }
            }
            function mxRefresh() { try { var st = HOST.getCombatState ? HOST.getCombatState() : null; renderMxCombat(st, true, true); } catch (e) { console.error('[mx-combat] refresh', e); } }
            function bindMxStageEvents(stage) {
                stage.addEventListener('click', function (e) {
                    var el;
                    if ((el = e.target.closest('[data-mxc-more]'))) { _mxMore = !_mxMore; mxRefresh(); return; }
                    if ((el = e.target.closest('[data-mxc-native]'))) { _mxShowNative = !_mxShowNative; _mxMore = false; mxRefresh(); return; }
                    if ((el = e.target.closest('[data-mxc-panel-toggle]'))) { var pk = el.getAttribute('data-mxc-panel-toggle'); _mxPanels[pk] = !_mxPanels[pk]; _mxMore = false; mxRefresh(); setTimeout(function () { var p = stage.querySelector('[data-mxc-panel="' + pk + '"]'); if (p) p.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 60); return; }
                    if ((el = e.target.closest('[data-mxc-panel]'))) { if (e.target.closest('.mxc-panel-head')) { var key = el.getAttribute('data-mxc-panel'); _mxPanels[key] = !_mxPanels[key]; el.classList.toggle('collapsed', !_mxPanels[key]); return; } }
                    if ((el = e.target.closest('[data-mxc-skill]'))) { if (e.target.closest('.mxc-skill-head')) { var nm = el.getAttribute('data-mxc-skill'); _mxExpSkill = (_mxExpSkill === nm) ? null : nm; el.classList.toggle('open'); return; } }
                    if ((el = e.target.closest('[data-quick]'))) { mxSyncToEngine(); try { HOST.cbHandleQuick(el.getAttribute('data-quick'), document.getElementById('mx-combat-mount')); } catch (ex) { console.error(ex); } setTimeout(mxRefresh, 50); return; }
                    if ((el = e.target.closest('[data-skill]'))) { mxSyncToEngine(); try { HOST.cbHandleSkill(el.getAttribute('data-skill')); } catch (ex) { console.error(ex); } setTimeout(mxRefresh, 50); return; }
                    if ((el = e.target.closest('[data-use-item]'))) { mxSyncToEngine(); try { HOST.cbHandleUseItem(el.getAttribute('data-use-item')); } catch (ex) { console.error(ex); } setTimeout(mxRefresh, 50); return; }
                    if ((el = e.target.closest('[data-hp]'))) { try { HOST.cbHandleHp(parseInt(el.getAttribute('data-hp'), 10), parseInt(el.getAttribute('data-d'), 10)); } catch (ex) { console.error(ex); } setTimeout(mxRefresh, 50); return; }
                    if ((el = e.target.closest('[data-target]'))) { try { HOST.cbHandleTarget(parseInt(el.getAttribute('data-target'), 10)); } catch (ex) { console.error(ex); } setTimeout(mxRefresh, 50); return; }
                    if ((el = e.target.closest('[data-buff]'))) { try { HOST.cbHandleBuff(parseInt(el.getAttribute('data-buff'), 10), parseInt(el.getAttribute('data-bi'), 10)); } catch (ex) { console.error(ex); } setTimeout(mxRefresh, 50); return; }
                    if ((el = e.target.closest('[data-act]'))) {
                        var act = el.getAttribute('data-act'); var d = {};
                        if (el.dataset.pt) d.pt = el.dataset.pt;
                        if (el.dataset.mode) d.mode = el.dataset.mode;
                        if (el.dataset.pidx != null) d.pidx = el.dataset.pidx;
                        if (el.dataset.unitId) d.unitId = el.dataset.unitId;
                        if (el.dataset.name) d.name = el.dataset.name;
                        if (el.dataset.idx != null) d.idx = el.dataset.idx;
                        if (act === 'genterrain') {
                            try {
                                var gst = HOST.getCombatState ? HOST.getCombatState() : null;
                                if (gst && HOST.CombatV6 && HOST.CombatV6.parseTerrain) {
                                    gst.terrain = HOST.CombatV6.parseTerrain('<terrain>宽12高8</terrain>');
                                    if (!gst.log) gst.log = [];
                                    gst.log.push({ turn: gst.turn, text: '[地形] 已生成默认战场 ' + gst.terrain.width + '×' + gst.terrain.height + '（平地）', cls: '' });
                                    if (HOST.CombatV6.saveCombatState) HOST.CombatV6.saveCombatState(gst);
                                    if (typeof toastr !== 'undefined') toastr.success('已生成默认战场 12×8');
                                }
                            } catch (ex) { console.error('[mx-combat] genterrain', ex); }
                            mxRefresh();
                            return;
                        }
                        if (act === 'terrainbig') {
                            try {
                                var bst = HOST.getCombatState ? HOST.getCombatState() : null;
                                if (bst && bst.terrain) {
                                    var doc = HOST.document || document;
                                    mxEnsureTerrainCss(doc);
                                    var oldOv = doc.getElementById('mx-terrain-overlay');
                                    if (oldOv) oldOv.remove();
                                    var ov = doc.createElement('div');
                                    ov.id = 'mx-terrain-overlay';
                                    ov.className = 'mxc-terrain-overlay';
                                    var card = doc.createElement('div');
                                    card.className = 'mxc-terrain-overlay-card';
                                    card.innerHTML =
                                        '<div class="mxc-terrain-overlay-head"><b>战场地形 · ' + bst.terrain.width + '×' + bst.terrain.height + ' · 回合 ' + bst.turn + '</b>' +
                                        '<button class="mxc-terrain-close"><i class="fa-solid fa-xmark"></i> 关闭 (Esc)</button></div>' +
                                        mxTerrainMapHtml(bst);
                                    ov.appendChild(card);
                                    ov.addEventListener('click', function (ev) { if (ev.target === ov) ov.remove(); });
                                    var cbtn = card.querySelector('.mxc-terrain-close');
                                    if (cbtn) cbtn.addEventListener('click', function () { ov.remove(); });
                                    var escFn = function (ev2) { if (ev2.key === 'Escape') { ov.remove(); doc.removeEventListener('keydown', escFn); } };
                                    doc.addEventListener('keydown', escFn);
                                    doc.body.appendChild(ov);
                                }
                            } catch (ex) { console.error('[mx-combat] terrainbig', ex); }
                            return;
                        }
                        mxSyncToEngine();
                        try { HOST.cbHandleClick(act, d, document.getElementById('mx-combat-mount')); } catch (ex) { console.error(ex); }
                        if (act === 'endturn') { _mxRpDraft = ''; }
                        setTimeout(mxRefresh, 50);
                        return;
                    }
                });
                stage.addEventListener('input', function (e) { var rp = e.target.closest('#mx-rp-input'); if (rp) _mxRpDraft = rp.value; });
                stage.addEventListener('keydown', function (e) { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { var rp = e.target.closest('#mx-rp-input'); if (rp) { e.preventDefault(); var eb = stage.querySelector('[data-act="endturn"]'); if (eb) eb.click(); } } });
                console.log('[mx-combat] 战斗层事件已绑定');
            }

            /* ============================================================
             * MVU 状态栏（移植自原 nebula-hud，仅数据源改为 getStatData）
             * ============================================================ */
            function getValue(data, path, def) {
                if (def === undefined) def = '-';
                if (!data) return def;
                try {
                    var keys = String(path).split('.'),
                        cur = data;
                    for (var i = 0; i < keys.length; i++) {
                        if (cur === null || typeof cur !== 'object') return def;
                        var idx = parseInt(keys[i], 10);
                        cur = (Array.isArray(cur) && !isNaN(idx)) ? cur[idx] : cur[keys[i]];
                    }
                    if (Array.isArray(cur) && cur.length > 0 &&
                        path.indexOf('列表') === -1 && path.indexOf('目标') === -1 &&
                        path.indexOf('分组') === -1 && path.indexOf('分类') === -1) {
                        return cur[0];
                    }
                    return (cur !== undefined && cur !== null) ? cur : def;
                } catch (e) { return def; }
            }

            function getRaw(data, path, d) {
                if (d === undefined) d = null;
                if (!data) return d;
                try {
                    var keys = String(path).split('.'),
                        cur = data;
                    for (var i = 0; i < keys.length; i++) {
                        if (cur === null || typeof cur !== 'object') return d;
                        var idx = parseInt(keys[i], 10);
                        cur = (Array.isArray(cur) && !isNaN(idx)) ? cur[idx] : cur[keys[i]];
                    }
                    return (cur !== undefined && cur !== null) ? cur : d;
                } catch (e) { return d; }
            }

            function kv(k, v) { return '<div class="neb-kv"><span class="k">' + esc(k) + '</span><span class="v">' + esc(v) +
                    '</span></div>'; }

            function stat(n, l) { return '<div class="neb-stat"><div class="num">' + esc(n) + '</div><div class="label">' +
                    esc(l) + '</div></div>'; }

            function attr(n, v) { return '<div class="neb-attr"><div class="an">' + esc(n) + '</div><div class="av">' + esc(
                    v) + '</div></div>'; }

            function bar(pct, neg) { pct = Math.max(0, Math.min(100, pct)); return '<div class="neb-bar' + (neg ?
                    ' neg' : '') + '"><i style="width:' + pct + '%"></i></div>'; }

            function renderHome(d) {
                var avatar = getValue(d, '主页.头像', '');
                var favNum = getValue(d, '主页.所属主神好感度.数值', 0);
                var favTxt = getValue(d, '主页.所属主神好感度.文本', '');
                var kpi = num(getValue(d, '主页.KPI进度.百分比', 0));
                var kpiTime = getValue(d, '主页.KPI进度.剩余时间描述', '');
                var groups = getRaw(d, '任务与日志.任务列表.分组', []);
                var qc = 0;
                if (Array.isArray(groups)) groups.forEach(function(g) { var it = getRaw(g, '条目', []);
                    if (Array.isArray(it)) qc += it.length; });
                var status = getValue(d, '主页.当前状态', '健康');
                var led = status === '健康' ? 'led-green' : (status === '危险' || status === '重伤' || status === '濒死' ?
                    'led-red' : 'led-yellow');
                var avatarTag = (avatar && avatar !== '-') ? '<img class="neb-avatar-lg" src="' + esc(avatar) +
                    '" alt="">' : '<div class="neb-avatar-lg"></div>';
                var head = '<div class="neb-card"><div class="neb-home-head"><div class="neb-home-info">' +
                    kv('代号', getValue(d, '主页.代号')) +
                    kv('姓名', getValue(d, '主页.姓名')) +
                    kv('阶位', getValue(d, '主页.阶位')) +
                    kv('强化等级', getValue(d, '主页.强化等级')) +
                    kv('阵营', getValue(d, '主页.阵营')) +
                    kv('主神好感', favNum + ' [' + favTxt + ']') +
                    '</div>' + avatarTag + '</div></div>';
                var kpiCard = '<div class="neb-flip neb-stat-flip neb-foldable"><div class="neb-flip-inner">' +
                    '<div class="neb-flip-face neb-flip-front"><div class="num">' + kpi +
                    '%</div><div class="label">KPI进度</div></div>' +
                    '<div class="neb-flip-face neb-flip-back"><div class="num">' + esc(kpiTime || '暂无') +
                    '</div><div class="label">剩余时间</div></div>' +
                    '</div></div>';
                return head +
                    '<div class="neb-grid4">' +
                    stat(getValue(d, '主页.积分余额', 0), '积分余额') +
                    kpiCard +
                    stat(qc, '当前任务') +
                    stat(getValue(d, '个人档案.履历数据.通关副本数', 0), '通关副本') +
                    '</div>' +
                    '<div class="neb-statusbar">' +
                    '<span class="neb-pill"><i class="neb-led ' + led + '"></i>状态: ' + esc(status) + '</span>' +
                    '</div>';
            }

            function renderProfile(d) {
                var infoTable = '<table class="neb-itable"><tr><th>性别</th><th>年龄</th><th>所在地</th></tr>' +
                    '<tr><td>' + esc(getValue(d, '个人档案.基础信息.性别')) + '</td>' +
                    '<td>' + esc(getValue(d, '个人档案.基础信息.年龄')) + '</td>' +
                    '<td>' + esc(getValue(d, '个人档案.基础信息.现实世界所在地')) + '</td></tr></table>' +
                    '<div class="neb-iblock"><div class="ib-label">首次进入矩阵时间</div>' +
                    '<div class="ib-val">' + esc(getValue(d, '个人档案.基础信息.首次进入矩阵时间')) + '</div></div>';
                var attrs = ['力量', '敏捷', '体质', '智力', '精神', '魅力'];
                var attrHtml = attrs.map(function(a) { return attr(a, getValue(d, '个人档案.战斗属性.' + a, 0)); }).join(
                '');
                var hpCur = num(getValue(d, '个人档案.衍生属性.生命值.当前', 0));
                var hpMax = num(getValue(d, '个人档案.衍生属性.生命值.最大', 0), 0);
                var epCur = num(getValue(d, '个人档案.衍生属性.能量值.当前', 0));
                var epMax = num(getValue(d, '个人档案.衍生属性.能量值.最大', 1), 1);
                var epType = getValue(d, '个人档案.衍生属性.能量值.类型', '能量');
                var cCon = num(getValue(d, '个人档案.战斗属性.体质', 10));
                var cSpi = num(getValue(d, '个人档案.战斗属性.精神', 10));
                var cAgi = num(getValue(d, '个人档案.战斗属性.敏捷', 10));
                var ebPhys = num(getValue(d, '个人档案.衍生属性.装备加成.物理防御', 0));
                var ebMyst = num(getValue(d, '个人档案.衍生属性.装备加成.神秘防御', 0));
                var ebCrit = num(getValue(d, '个人档案.衍生属性.装备加成.暴击率', 0));
                var ebMove = num(getValue(d, '个人档案.衍生属性.装备加成.移动速度', 0));
                var calcPhysDef = Math.floor(cCon / 2) + ebPhys,
                    calcMystDef = Math.floor(cSpi / 2) + ebMyst,
                    calcCrit = Math.min(100, 5 + ebCrit),
                    calcMove = Math.floor(cAgi / 5) + ebMove;
                var calcEpMax = epMax;
                if (calcEpMax < 1) calcEpMax = num(cSpi, 1);
                var skills = getRaw(d, '个人档案.强化与技能.技能列表', {});
                var skillHtml = '';
                if (skills && typeof skills === 'object') {
                    Object.keys(skills).forEach(function(name) {
                        var s = skills[name];
                        skillHtml += '<div class="neb-flip neb-skill neb-foldable"><div class="neb-flip-inner">' +
                            '<div class="neb-flip-face neb-flip-front"><div class="sn">' + esc(name) +
                            '</div>' +
                            '<div class="sl">' + esc(getValue(s, '等级', '')) + '</div></div>' +
                            '<div class="neb-flip-face neb-flip-back"><b>' + esc(name) + '</b>' +
                            '<div style="margin-top:4px">' + esc(getValue(s, '描述', '')) + '</div>' +
                            '<div style="margin-top:4px;color:var(--neb-text-soft)">' + esc(getValue(s,
                                '冷却/消耗', '')) + '</div></div>' +
                            '</div></div>';
                    });
                }
                if (!skillHtml) skillHtml = '<div class="neb-empty">暂无技能</div>';
                return '<div class="neb-card"><div class="neb-card-title">基础信息</div>' + infoTable + '</div>' +
                    '<div class="neb-card"><div class="neb-card-title">战斗属性</div><div class="neb-attr-grid">' +
                    attrHtml + '</div></div>' +
                    '<div class="neb-card"><div class="neb-card-title">衍生属性 <span style="font-size:11px;font-weight:400;color:var(--neb-text-soft)">（公式自算）</span></div>' +
                    '<div class="neb-kv"><span class="k">生命值(耐力)</span><span class="v">' + hpCur + '/' + hpMax +
                    '</span>' + bar(hpMax > 0 ? hpCur / hpMax * 100 : 0) + '</div>' +
                    '<div class="neb-kv" style="margin-top:8px"><span class="k">能量(' + esc(epType) +
                    ')</span><span class="v">' + epCur + '/' + calcEpMax + '</span>' + bar(calcEpMax > 0 ? epCur /
                        calcEpMax * 100 : 0) + '</div>' +
                    '<div class="neb-attr-grid" style="margin-top:12px">' +
                    attr('物理防御', calcPhysDef + '') + attr('神秘防御', calcMystDef + '') + attr('暴击率', calcCrit +
                        '%') + attr('移动速度', calcMove + 'm') +
                    '</div></div>' +
                    '<div class="neb-card"><div class="neb-card-title">强化与技能</div>' +
                    kv('主强化类型', getValue(d, '个人档案.强化与技能.主强化类型')) +
                    kv('强化名称', getValue(d, '个人档案.强化与技能.强化名称')) +
                    kv('强化等级', getValue(d, '个人档案.强化与技能.强化等级')) +
                    kv('洗点冷却剩余', getValue(d, '个人档案.强化与技能.洗点冷却剩余')) +
                    '<div class="neb-skill-grid" style="margin-top:10px">' + skillHtml + '</div></div>' +
                    '<div class="neb-card"><div class="neb-card-title">履历数据</div><div class="neb-attr-grid">' +
                    attr('完成任务', getValue(d, '个人档案.履历数据.总完成任务数', 0)) +
                    attr('击杀轮回者', getValue(d, '个人档案.履历数据.总击杀轮回者数', 0)) +
                    attr('累计积分', getValue(d, '个人档案.履历数据.总获得积分', 0)) +
                    attr('死亡次数', getValue(d, '个人档案.履历数据.死亡次数', 0)) +
                    attr('主神保人', getValue(d, '个人档案.履历数据.主神保人次数', 0)) +
                    attr('通关副本', getValue(d, '个人档案.履历数据.通关副本数', 0)) +
                    '</div></div>';
            }
            var questState = { list: [] };

            function renderQuest(d) {
                var groups = getRaw(d, '任务与日志.任务列表.分组', []);
                questState.list = [];
                var groupHtml = '';
                if (Array.isArray(groups)) {
                    groups.forEach(function(g, gi) {
                        var gname = getValue(g, '组名', '任务');
                        var items = getRaw(g, '条目', []);
                        var inner = '';
                        if (Array.isArray(items) && items.length) {
                            items.forEach(function(it) {
                                var idx = questState.list.length;
                                questState.list.push(it);
                                inner += '<div class="neb-list-item neb-quest-item" data-q="' + idx +
                                    '">' +
                                    '<b>' + esc(getValue(it, '任务名称', '未命名')) +
                                    '</b> <span class="neb-badge">' + esc(getValue(it, '难度', '-')) +
                                    '</span>' +
                                    '<div class="neb-empty" style="padding:2px 0">进度 ' + esc(getValue(
                                        it, '进度百分比', '0%')) + '</div></div>';
                            });
                        } else { inner = '<div class="neb-empty">（空）</div>'; }
                        groupHtml += '<div class="neb-group' + (gi === 0 ? ' open' : '') +
                            '"><div class="neb-group-head neb-qgroup">' +
                            '<span class="arrow">▶</span>' + esc(gname) +
                            ' <span style="color:var(--neb-text-soft);font-weight:400">(' + (Array.isArray(
                                items) ? items.length : 0) + ')</span></div>' +
                            '<div class="neb-group-body">' + inner + '</div></div>';
                    });
                }
                if (!groupHtml) groupHtml = '<div class="neb-empty">暂无任务</div>';
                return '<div class="neb-card"><div class="neb-card-title">任务列表</div>' + groupHtml + '</div>' +
                    '<div class="neb-card neb-detail" id="neb-quest-detail"></div>';
            }

            function renderWorld(d) {
                var w = '任务与日志.任务世界.';
                return '<div class="neb-card"><div class="neb-card-title">世界概况</div>' +
                    kv('世界名称', getValue(d, w + '世界名称')) + kv('世界类型', getValue(d, w + '世界类型')) +
                    kv('阵营倾向', getValue(d, w + '阵营倾向')) + kv('当前难度等级', getValue(d, w + '当前难度等级')) +
                    kv('时间流速', getValue(d, w + '时间流速')) + kv('世界意志状态', getValue(d, w + '世界意志状态')) +
                    '</div>' +
                    '<div class="neb-card"><div class="neb-card-title">主线与掌控</div>' +
                    kv('主线任务提示', getValue(d, w + '主线任务提示')) + kv('掌控度描述', getValue(d, w + '掌控度描述')) +
                    '</div>' +
                    '<div class="neb-card"><div class="neb-card-title">世界描述</div>' +
                    '<div style="font-size:13px;line-height:1.8">' + esc(getValue(d, w + '世界描述')) + '</div></div>';
            }

            function renderLog(d) {
                var subs = getRaw(d, '任务与日志.日志情报.子页面', []);
                var html = '';
                if (Array.isArray(subs)) {
                    subs.forEach(function(sp) {
                        var name = getValue(sp, '名称', '记录');
                        var list = getRaw(sp, '内容列表', null);
                        var cats = getRaw(sp, '按世界分类', null);
                        var body = '';
                        if (Array.isArray(list) && list.length) {
                            list.forEach(function(x) { body += '<div class="neb-list-item">' + esc(
                                    typeof x === 'object' ? JSON.stringify(x) : x) + '</div>'; });
                        } else if (Array.isArray(cats) && cats.length) {
                            cats.forEach(function(x) { body += '<div class="neb-list-item">' + esc(
                                    typeof x === 'object' ? JSON.stringify(x) : x) + '</div>'; });
                        } else { body = '<div class="neb-empty">暂无记录</div>'; }
                        html += '<div class="neb-card"><div class="neb-card-title">' + esc(name) +
                            '</div><div class="neb-list">' + body + '</div></div>';
                    });
                }
                if (!html) html = '<div class="neb-card"><div class="neb-empty">暂无日志情报</div></div>';
                return html;
            }

            function renderFaction(d) {
                var favRaw = getRaw(d, '阵营关系.轮回者与其他阵营好感度', {});
                var facHtml = '';
                if (favRaw && typeof favRaw === 'object') {
                    Object.keys(favRaw).forEach(function(name) {
                        var v = favRaw[name],
                            n = num(v, 0);
                        facHtml += '<div class="neb-fac"><div class="fn"><span>' + esc(name) +
                            '</span><span class="v">' + esc(v) + '</span></div>' +
                            bar(Math.min(100, Math.abs(n)), n < 0) + '</div>';
                    });
                }
                if (!facHtml) facHtml = '<div class="neb-empty">暂无数据</div>';
                var rels = getRaw(d, '阵营关系.阵营之间的关系（矩阵公开情报）', []);
                var relHtml = '';
                if (Array.isArray(rels)) rels.forEach(function(r) {
                    relHtml += '<div class="neb-list-item"><b>' + esc(getValue(r, '阵营A')) +
                        '</b> ←' + esc(getValue(r, '关系状态')) + '→ <b>' + esc(getValue(r, '阵营B')) +
                        '</b>' +
                        '<div class="neb-empty" style="padding:2px 0">' + esc(getValue(r, '备注', '')) +
                        '</div></div>';
                });
                if (!relHtml) relHtml = '<div class="neb-empty">暂无公开情报</div>';
                var marks = getRaw(d, '阵营关系.当前主神标记与仇恨.被哪些主神标记', []);
                var markTxt = (Array.isArray(marks) && marks.length) ? marks.join('、') : '无';
                var hunted = getValue(d, '阵营关系.当前主神标记与仇恨.被追杀状态', '否');
                return '<div class="neb-card"><div class="neb-card-title">阵营好感度</div><div class="neb-fac-grid">' +
                    facHtml + '</div></div>' +
                    '<div class="neb-card"><div class="neb-card-title">阵营之间关系</div><div class="neb-list">' +
                    relHtml + '</div></div>' +
                    '<div class="neb-card"><div class="neb-card-title">主神标记与仇恨</div>' +
                    kv('被标记主神', markTxt) + kv('标记效果', getValue(d,
                        '阵营关系.当前主神标记与仇恨.标记效果')) +
                    '<div class="neb-kv"><span class="k">追杀状态</span><span class="v ' + (hunted !== '否' ?
                        'neb-warn' : '') + '">' + esc(hunted) + '</span></div></div>';
            }
            /* ===== 商城拓展：分类 / 搜索 / 排序 / 数量购买 / 撤回 / 容量扩展（MVU 直写 + 输入框双轨） ===== */
            var MX_SHOP_CATS = [
                { id: 'all', label: '全部' },
                { id: 'equip', label: '装备', kw: ['装备', '武器', '防具', '护甲', '饰品', '坐骑'] },
                { id: 'blood', label: '血统', kw: ['血统', '血脉', '基因', '种族'] },
                { id: 'skill', label: '技能', kw: ['技能', '功法', '法术', '武学', '天赋'] },
                { id: 'prop', label: '道具', kw: ['道具', '消耗', '材料', '食物', '药剂', '药品'] },
                { id: 'none', label: '无分类' }
            ];
            /* 背包容量曲线：初始20格，每次+5格，第n次价格 = 250×n×(n+1)，硬上限200格 */
            var MX_CAP_INIT = 20, MX_CAP_STEP = 5, MX_CAP_MAX = 200;
            function mxCapPrice(n) { n = Math.max(1, n); return 250 * n * (n + 1); }
            var bagState = { list: [], search: '', cat: 'all' };
            var shopState = { list: [], search: '', cat: 'all', sort: 'default', sub: 'normal', exSub: 'ex-shop', session: null };

            function shopCatOf(info) {
                var t = '';
                if (info && typeof info === 'object') t = String(getValue(info, '类型', ''));
                else if (info !== null && info !== undefined) t = String(info);
                for (var i = 1; i < MX_SHOP_CATS.length - 1; i++) {
                    var kws = MX_SHOP_CATS[i].kw;
                    for (var j = 0; j < kws.length; j++) { if (t.indexOf(kws[j]) >= 0) return MX_SHOP_CATS[i].id; }
                }
                return 'none';
            }

            function catLabel(id) {
                for (var i = 0; i < MX_SHOP_CATS.length; i++) { if (MX_SHOP_CATS[i].id === id) return MX_SHOP_CATS[i].label; }
                return '无分类';
            }

            function parsePrice(v) {
                if (typeof v === 'number') return isFinite(v) ? v : NaN;
                var m = String(v === null || v === undefined ? '' : v).replace(/[,，\s]/g, '').match(/-?\d+(?:\.\d+)?/);
                return m ? parseFloat(m[0]) : NaN;
            }

            /* 解析容量字段："3 / 20" -> {used:3, cap:20}；纯数字 20 -> {used:NaN, cap:20} */
            function mxParseCap(v) {
                if (typeof v === 'number' && isFinite(v)) return { used: NaN, cap: v };
                var m = String(v === null || v === undefined ? '' : v).replace(/[,，\s]/g, '')
                    .match(/(\d+(?:\.\d+)?)(?:\/(\d+(?:\.\d+)?))?/);
                if (!m) return null;
                return {
                    used: m[2] !== undefined ? parseFloat(m[1]) : NaN,
                    cap: m[2] !== undefined ? parseFloat(m[2]) : parseFloat(m[1])
                };
            }

            /* 积分余额双源：主页.积分余额 为唯一真源，商城.积分余额 兼容读取（过渡期） */
            function mxGetBalance(sd) {
                var home = sd['主页'] || {};
                if (home['积分余额'] !== undefined && home['积分余额'] !== null) return home['积分余额'];
                return (((sd['背包与商城'] || {})['商城']) || {})['积分余额'];
            }

            function mxSetBalance(sd, newVal) {
                var home = sd['主页'] || (sd['主页'] = {});
                home['积分余额'] = newVal;
                var mall = ((sd['背包与商城'] || {})['商城']);
                if (mall && mall['积分余额'] !== undefined) mall['积分余额'] = newVal;
            }

            /* 已用格数：按物品列表实时估算（数量字段或缺省1）；容量字段存在时同步回写，保持 AI 侧一致 */
            function mxEstUsed(bagSec) {
                var items = bagSec['物品列表'];
                if (!items || typeof items !== 'object') return 0;
                var est = 0;
                Object.keys(items).forEach(function(name) {
                    var info = items[name];
                    if (info && typeof info === 'object') {
                        var q = parseInt(info['数量'], 10);
                        est += isNaN(q) ? 1 : q;
                    } else { est += 1; }
                });
                return est;
            }

            function mxSyncCapUsed(bagSec) {
                var pc = mxParseCap(bagSec['容量']);
                if (!pc || !isFinite(pc.cap)) return;
                bagSec['容量'] = mxEstUsed(bagSec) + ' / ' + pc.cap;
            }

            /* 本楼购买会话：首次操作前保存整份快照，支持一键撤回本楼全部前端购买 */
            function mxSessionBegin(sd, msgId) {
                if (!shopState.session || shopState.session.msgId !== msgId) {
                    var snap = null;
                    snap = mxClone(sd, null);
                    var chatSnap = null;
                    try { chatSnap = mxChatSnap(); } catch (eC) { chatSnap = null; }
                    shopState.session = { msgId: msgId, snapshot: snap, chatSnap: chatSnap, items: {}, cost: 0, sellLog: [], patches: [] };
                }
                return shopState.session;
            }
            function mxSessionRecordPatch(sd, path) {
                var ses = shopState.session;
                if (!ses) return;
                ses.patches = ses.patches || [];
                var existing = null;
                for (var i = 0; i < ses.patches.length; i++) { if (ses.patches[i].path === path) { existing = ses.patches[i]; break; } }
                if (existing) return;
                var parts = path.split('.'), cur = sd, ok = true;
                for (var j = 0; j < parts.length; j++) {
                    if (cur && typeof cur === 'object' && parts[j] in cur) { cur = cur[parts[j]]; }
                    else { ok = false; break; }
                }
                var snap = ok ? mxClone(cur, null) : null;
                ses.patches.push({ path: path, val: snap });
            }

            function mxTypeText(it) { return getValue(it.info, '类型', ''); }
            function mxDescText(it) { return getValue(it.info, '描述', ''); }

            function mxFilterItems(arr, state) {
                var kw = String(state.search || '').trim().toLowerCase();
                var counts = {};
                MX_SHOP_CATS.forEach(function(c) { counts[c.id] = 0; });
                var kwHit = arr.filter(function(it) {
                    if (kw) {
                        var hay = (it.name + ' ' + mxTypeText(it) + ' ' + mxDescText(it)).toLowerCase();
                        if (hay.indexOf(kw) < 0) return false;
                    }
                    return true;
                });
                kwHit.forEach(function(it) { counts[it.cat]++; });
                counts.all = kwHit.length;
                var out = kwHit.filter(function(it) { return (state.cat || 'all') === 'all' || it.cat === state.cat; });
                if (state.sort === 'price-asc') {
                    out.sort(function(a, b) { return (isFinite(a.price) ? a.price : Infinity) - (isFinite(b.price) ? b.price : Infinity); });
                } else if (state.sort === 'price-desc') {
                    out.sort(function(a, b) { return (isFinite(b.price) ? b.price : -Infinity) - (isFinite(a.price) ? a.price : -Infinity); });
                }
                return { list: out, counts: counts };
            }

            function mxShopToolbar(state, inputId, counts, total, shown) {
                var cats = MX_SHOP_CATS.map(function(c) {
                    var act = (state.cat || 'all') === c.id ? ' active' : '';
                    return '<div class="mxs-cat' + act + '" data-cat="' + c.id + '" title="按「' + c.label + '」筛选">' +
                        c.label + '<span class="n">' + (counts[c.id] || 0) + '</span></div>';
                }).join('');
                var sorts = '';
                if (state === shopState) {
                    sorts = '<div class="mxs-sorts"><span class="lbl">排序</span>' +
                        '<div class="mxs-sort' + (state.sort === 'default' ? ' active' : '') + '" data-sort="default">默认</div>' +
                        '<div class="mxs-sort' + (state.sort === 'price-asc' ? ' active' : '') + '" data-sort="price-asc">价格 ↑</div>' +
                        '<div class="mxs-sort' + (state.sort === 'price-desc' ? ' active' : '') + '" data-sort="price-desc">价格 ↓</div>' +
                        '<span class="mxs-count">展示 ' + shown + ' / ' + total + ' 件</span></div>';
                } else {
                    sorts = '<div class="mxs-sorts"><span class="mxs-count">展示 ' + shown + ' / ' + total + ' 件</span></div>';
                }
                return '<div class="mxs-toolbar">' +
                    '<input class="mxs-search" id="' + inputId + '" type="text" placeholder="搜索名称 / 类型 / 描述..." value="' + esc(state.search || '') + '" autocomplete="off">' +
                    '<div class="mxs-cats">' + cats + '</div>' + sorts + '</div>';
            }

            function mxSessionSummary() {
                var ses = shopState.session;
                if (!ses || !ses.items || !Object.keys(ses.items).length) return '';
                var det = Object.keys(ses.items).map(function(n) { return esc(n) + '×' + ses.items[n]; }).join('、');
                return '<div class="mxs-session"><i class="fa-solid fa-receipt"></i>本楼已购：' + det +
                    (ses.cost > 0 ? '（积分 -' + ses.cost + '）' : '') + '</div>';
            }

            function mxShopNote(msg, cls) {
                var el = document.getElementById('mxs-note');
                if (el) { el.textContent = msg; el.className = 'mxs-note' + (cls ? ' ' + cls : ''); }
            }
            function mxClone(o, fb) {
                if (o && typeof o === 'object') { try { return JSON.parse(JSON.stringify(o)); } catch (e) {} }
                return (fb !== undefined) ? fb : null;
            }
            function mxViaInput(fillText, note, fallbackNote) {
                if (fillText && typeof nebFill === 'function') { try { nebFill(fillText); } catch (e) {} }
                mxShopNote(note || fallbackNote || '指令已填入输入框，发送后由矩阵处理', '');
            }

            function mxShopRecords() {
                try { return JSON.parse(localStorage.getItem('mxs_shop_records') || '[]') || []; } catch (e) { return []; }
            }

            function mxShopPushRecord(name, price) {
                try {
                    var a = mxShopRecords();
                    a.unshift({ name: String(name), price: isFinite(price) ? price : null, time: Date.now() });
                    localStorage.setItem('mxs_shop_records', JSON.stringify(a.slice(0, 20)));
                } catch (e) {}
            }

            function mxRefreshExchange() {
                var exBody = document.getElementById('mx-ex-body');
                var d = (typeof mxFreshStatData === 'function') ? mxFreshStatData() : null;
                if (!d && typeof getStatData === 'function') d = getStatData();
                if (!exBody || !d) return;
                var active = document.activeElement;
                var aid = active && active.id ? active.id : null;
                var apos = (active && typeof active.selectionStart === 'number') ? active.selectionStart : null;
                exBody.innerHTML = renderExchange(d);
                bindDynamic();
                if (aid) {
                    var el = document.getElementById(aid);
                    if (el) { el.focus(); try { if (apos !== null) el.setSelectionRange(apos, apos); } catch (err) {} }
                }
            }

            var __mxShopDbTimer = null;
            function mxShopRerenderSoon() {
                if (__mxShopDbTimer) clearTimeout(__mxShopDbTimer);
                __mxShopDbTimer = setTimeout(function() { __mxShopDbTimer = null; mxRefreshExchange(); }, 250);
            }

            function mxBuyText(name, qty) { return '购买 ' + name + (qty > 1 ? '×' + qty : ''); }

            async function mxShopBuy(idx, qty) {
                var item = shopState.list[idx];
                if (!item) return;
                qty = Math.max(1, Math.min(99, parseInt(qty, 10) || 1));
                var name = item.name;
                var viaInput = function (note) { mxViaInput(mxBuyText(name, qty), note, '已将「' + mxBuyText(name, qty) + '」填入输入框，发送后由矩阵处理'); };
                try {
                    var msgId = mx2SafeId();
                    if (msgId === null || msgId === undefined) { viaInput('未获取到楼层信息，已填入输入框'); return; }
                    var vars = getVariables({ type: 'message', message_id: msgId });
                    var sd = vars && vars.stat_data;
                    if (!sd || !sd['背包与商城']) { viaInput('未检测到 MVU 数据，已回退为输入框购买'); return; }
                    var sec = sd['背包与商城'];
                    var mall = sec['商城'] || (sec['商城'] = {});
                    var goods = mall['商品列表'];
                    var g = (goods && typeof goods === 'object') ? goods[name] : null;
                    var price = parsePrice(g ? getValue(g, '价格') : NaN);
                    var total = (isFinite(price) && price > 0) ? +(price * qty).toFixed(2) : 0;
                    var gClone = (g && typeof g === 'object') ? mxClone(g, {}) : { '类型': '道具' };
                    await mxDeal({
                        spend: total, vipCut: true, label: '商城·' + name + (qty > 1 ? '×' + qty : ''),
                        fill: mxBuyText(name, qty),
                        apply: function (sd2) { mxBagAddItem(sd2, name, gClone, qty); },
                        noteOk: '已购买「' + name + '」' + (qty > 1 ? '×' + qty : '') + (total > 0 ? '（积分 -' + total + '，已入背包）' : '（已入背包）')
                    });
                } catch (err) {
                    console.error('[mx-shop] 直接购买失败:', err);
                    viaInput('直接购买失败，已回退为输入框购买');
                }
            }

            async function mxBuyCapacity() {
                try {
                    var msgId = (typeof getCurrentMessageIdSafe === 'function') ? getCurrentMessageIdSafe() :
                        ((typeof getCurrentMessageId === 'function') ? getCurrentMessageId() : null);
                    if (msgId === null || msgId === undefined) { mxShopNote('未获取到楼层信息，无法扩展容量', 'warn'); return; }
                    var vars = getVariables({ type: 'message', message_id: msgId });
                    var sd = vars && vars.stat_data;
                    if (!sd || !sd['背包与商城']) { mxShopNote('未检测到 MVU 数据，无法扩展容量', 'warn'); return; }
                    var sec = sd['背包与商城'];
                    var bagSec = sec['背包'] || (sec['背包'] = {});
                    var pc = mxParseCap(bagSec['容量']);
                    var cap = (pc && isFinite(pc.cap)) ? pc.cap : MX_CAP_INIT;
                    if (cap >= MX_CAP_MAX) { mxShopNote('背包容量已达上限 ' + MX_CAP_MAX + ' 格', 'warn'); return; }
                    var n = Math.max(1, Math.floor((cap - MX_CAP_INIT) / MX_CAP_STEP) + 1);
                    var price = mxCapPrice(n);
                    var bal = parsePrice(mxGetBalance(sd));
                    if (isFinite(bal) && bal < price) {
                        mxShopNote('积分余额不足（扩展需 ' + price + '，当前 ' + bal + '）', 'warn');
                        return;
                    }
                    mxSessionBegin(sd, msgId);
                    mxSetBalance(sd, Math.max(0, +(bal - price).toFixed(2)));
                    var newCap = Math.min(MX_CAP_MAX, cap + MX_CAP_STEP);
                    bagSec['容量'] = mxEstUsed(bagSec) + ' / ' + newCap;
                    var ses = shopState.session;
                    if (ses) {
                        var key = '背包扩容 ' + cap + '->' + newCap;
                        ses.items[key] = (ses.items[key] || 0) + 1;
                        ses.cost = +((ses.cost || 0) + price).toFixed(2);
                    }
                    await mxSaveStatData(sd, msgId);
                    mxShopPushRecord('背包扩容->' + newCap + '格', price);
                    mxShopNote('背包容量已扩展至 ' + newCap + ' 格（积分 -' + price + '，第 ' + n + ' 次扩展）', 'ok');
                    if (typeof window.__mxRefreshPseudo === 'function') { try { window.__mxRefreshPseudo(); } catch (e3) {} }
                } catch (err) {
                    console.error('[mx-shop] 容量扩展失败:', err);
                    mxShopNote('容量扩展失败：' + ((err && err.message) || err), 'warn');
                }
            }

            async function mxBuyReality(hours) {
                hours = Math.max(1, Math.min(999, parseInt(hours, 10) || 1));
                var viaInput = function (note) { mxViaInput('兑换现实时间 ' + hours + '小时', note, '已将「兑换现实时间 ' + hours + '小时」填入输入框，由矩阵结算'); };
                try {
                    var msgId = (typeof getCurrentMessageIdSafe === 'function') ? getCurrentMessageIdSafe() :
                        ((typeof getCurrentMessageId === 'function') ? getCurrentMessageId() : null);
                    if (msgId === null || msgId === undefined) { viaInput('未获取到楼层信息，已填入输入框'); return; }
                    var vars = getVariables({ type: 'message', message_id: msgId });
                    var sd = vars && vars.stat_data;
                    if (!sd || !sd['背包与商城']) { viaInput('未检测到 MVU 数据，已回退为输入框兑换'); return; }
                    var mall = sd['背包与商城']['商城'] || (sd['背包与商城']['商城'] = {});
                    var rt = mall['现实通道'];
                    if (!rt || typeof rt !== 'object') { viaInput('未找到现实通道数据，已回退为输入框兑换'); return; }
                    var rate = parsePrice(rt['兑换比例']);
                    if (!isFinite(rate) || rate <= 0) { viaInput('兑换比例无法解析，已回退为输入框兑换'); return; }
                    var limit = parsePrice(rt['当前可兑换上限']);
                    var hasLimit = isFinite(limit);
                    if (hasLimit && hours > limit) {
                        mxShopNote('超过当前可兑换上限（剩余 ' + limit + ' 小时）', 'warn');
                        return;
                    }
                    var cost = +(rate * hours).toFixed(2);
                    var bal = parsePrice(mxGetBalance(sd));
                    if (isFinite(bal) && bal < cost) {
                        mxShopNote('积分余额不足（需 ' + cost + '，当前 ' + bal + '）', 'warn');
                        return;
                    }
                    mxSessionBegin(sd, msgId);
                    mxSetBalance(sd, Math.max(0, +(bal - cost).toFixed(2)));
                    var left = null;
                    if (hasLimit) {
                        left = Math.max(0, +(limit - hours).toFixed(2));
                        rt['当前可兑换上限'] = left;
                    }
                    await mxSaveStatData(sd, msgId);
                    var ses = shopState.session;
                    if (ses) {
                        var key = '现实时间兑换' + hours + '小时';
                        ses.items[key] = (ses.items[key] || 0) + 1;
                        ses.cost = +((ses.cost || 0) + cost).toFixed(2);
                    }
                    mxShopPushRecord('现实时间×' + hours + '小时', cost);
                    mxShopNote('已兑换 ' + hours + ' 小时现实时间（积分 -' + cost +
                        (left !== null ? '，剩余可兑换 ' + left + ' 小时' : '') + '），兑换指令已填入输入框', 'ok');
                    if (typeof window.__mxRefreshPseudo === 'function') { try { window.__mxRefreshPseudo(); } catch (e2) {} }
                    nebFill('兑换现实时间 ' + hours + '小时');
                } catch (err) {
                    console.error('[mx-shop] 现实时间兑换失败:', err);
                    viaInput('兑换失败，已回退为输入框兑换');
                }
            }

            function renderObsession(d) {
                var ob = getRaw(d, '背包与商城.商城.执念交易所', null);
                if (!ob || typeof ob !== 'object') ob = {};
                var cur = getRaw(ob, '当前立项', null);
                if (!cur || typeof cur !== 'object') cur = {};
                var status = String(getValue(cur, '立项状态', '未立项'));
                var obName = getValue(cur, '执念名称', '无');
                var done = getRaw(ob, '已了却执念', {});
                var buffs = getRaw(ob, '永久精神增益', {});
                var html = '<div class="neb-obs-warn"><b>矩阵提示</b>：了却执念的轮回者，死亡率与流失率很高。</div>';
                html += '<div class="neb-card"><div class="neb-card-title">执念立项</div>';
                if (status === '未立项' || !obName || obName === '无') {
                    html += '<div class="neb-empty">尚未向矩阵提交执念立项</div>' +
                        kv('立项方式', '向矩阵提交执念，由矩阵评估并报价（远超常规消费：100,000~1,000,000积分，或积分+特定副本成就的组合）') +
                        kv('分期规则', '大型执念经矩阵裁定可拆分阶段，按阶段逐步兑换') +
                        kv('完成回报', '了却执念后获得永久精神类小增益') +
                        '<div class="neb-actions"><button class="neb-btn" onclick="nebFill(\'【执念立项申请】执念内容：\')">申请执念立项</button></div>';
                } else {
                    html += kv('执念名称', obName) +
                        kv('执念描述', getValue(cur, '执念描述')) +
                        kv('立项状态', status) +
                        kv('总报价', getValue(cur, '总报价')) +
                        kv('报价积分', getValue(cur, '报价积分')) +
                        kv('成就条件', getValue(cur, '成就条件')) +
                        kv('立项时间', getValue(cur, '立项时间'));
                    if (status === '待报价') {
                        html += '<div class="neb-empty">矩阵评估中，等待报价……</div>';
                    }
                    var stages = getRaw(cur, '阶段列表', {});
                    if (stages && typeof stages === 'object' && Object.keys(stages).length) {
                        html += '<div style="margin-top:8px;font-size:12px;font-weight:700;color:var(--neb-text-soft)">阶段兑换</div><div class="neb-list">';
                        Object.keys(stages).forEach(function(stName) {
                            var s = stages[stName];
                            if (!s || typeof s !== 'object') return;
                            var stPaid = String(getValue(s, '状态', '未兑换')) === '已兑换';
                            html += '<div class="neb-list-item"><b>' + esc(stName) + '</b> ' +
                                '<span class="neb-badge">' + esc(getValue(s, '报价积分', 0)) + '积分</span> ' +
                                (stPaid ? '<span class="neb-badge neb-ok">已兑换</span>' :
                                    '<button class="neb-btn neb-mini" onclick="nebFill(\'【执念阶段兑换】' + esc(obName) + ' - ' + esc(stName) + '\')">兑换</button>');
                            var cond = getValue(s, '成就条件', '');
                            if (cond && cond !== '无' && cond !== '-') {
                                html += '<div class="neb-kv"><span class="k">成就条件</span><span class="v">' + esc(cond) + '</span></div>';
                            }
                            html += '</div>';
                        });
                        html += '</div>';
                    }
                    if (status === '进行中') {
                        html += '<div class="neb-actions"><button class="neb-btn" onclick="nebFill(\'【了却执念】' + esc(obName) + '\')">了却执念</button></div>';
                    }
                    if (status === '已完成') {
                        html += '<div class="neb-empty">该执念已了却，增益已录入矩阵档案。</div>';
                    }
                }
                html += '</div>';
                html += '<div class="neb-card"><div class="neb-card-title">已了却执念</div>';
                if (done && typeof done === 'object' && Object.keys(done).length) {
                    html += '<div class="neb-list">';
                    Object.keys(done).forEach(function(name) {
                        var x = done[name] || {};
                        html += '<div class="neb-list-item"><b>' + esc(name) + '</b> ' +
                            '<span class="neb-badge">' + esc(getValue(x, '完成时间', '')) + '</span>' +
                            (getValue(x, '获得增益', '') ? ' <span class="neb-badge neb-ok">' + esc(x['获得增益']) + '</span>' : '') +
                            '</div>';
                    });
                    html += '</div>';
                } else { html += '<div class="neb-empty">无记录</div>'; }
                html += '</div>';
                html += '<div class="neb-card"><div class="neb-card-title">永久精神增益</div>';
                if (buffs && typeof buffs === 'object' && Object.keys(buffs).length) {
                    html += '<div class="neb-list">';
                    Object.keys(buffs).forEach(function(name) {
                        var x = buffs[name] || {};
                        html += '<div class="neb-list-item"><b>' + esc(name) + '</b> ' +
                            '<span class="neb-badge">' + esc(getValue(x, '效果', '')) + '</span></div>';
                    });
                    html += '</div>';
                } else { html += '<div class="neb-empty">暂无永久精神增益</div>'; }
                html += '</div>';
                return html;
            }

            function shopDetailCard(item, idx) {
                var info = item.info || {};
                var priceTxt = getValue(info, '价格');
                var price = parsePrice(priceTxt);
                var bal = parsePrice(mxGetBalance(getStatData() || {}));
                var afford = !isFinite(price) || !(price > 0) || !isFinite(bal) || bal >= price;
                var sumTxt = (isFinite(price) && price > 0) ? '合计 ' + price : '合计 -';
                return '<button class="neb-detail-close" id="neb-shop-close">×</button>' +
                    '<div class="neb-card-title">商品详情</div>' +
                    kv('名称', item.name) + kv('分类', catLabel(item.cat)) + kv('类型', getValue(info, '类型')) +
                    kv('价格', priceTxt) + kv('限制', getValue(info, '限制')) + kv('描述', getValue(info, '描述')) +
                    '<div class="mxs-qty-row"><span class="lbl2">数量</span>' +
                    '<div class="mxs-qty" data-price="' + (isFinite(price) ? price : '') + '">' +
                    '<button class="mxs-qbtn" data-q="-1" type="button">−</button>' +
                    '<span class="mxs-qty-val" id="mxs-qty-val">1</span>' +
                    '<button class="mxs-qbtn" data-q="1" type="button">＋</button></div>' +
                    '<span class="mxs-sum" id="mxs-sum">' + esc(sumTxt) + '</span></div>' +
                    (afford ? '' : '<div class="mxs-warn"><i class="fa-solid fa-circle-exclamation"></i>积分余额不足（当前 ' +
                        esc(isFinite(bal) ? bal : '?') + '），无法直接购买</div>') +
                    '<div class="neb-actions"><button class="neb-btn mxs-buy-lg" data-buy="' + idx + '"' +
                    (afford ? '' : ' disabled') + '>购买</button></div>';
            }

            function bagDetailCard(item) {
                var info = item.info || {};
                var q = parseInt(info['数量'], 10);
                var ses = shopState.session;
                var plus = (ses && ses.items && ses.items[item.name]) ? ses.items[item.name] : 0;
                var equipped = (typeof getStatData === 'function') ? mxIsEquipped(getStatData() || {}, item.name) : false;
                var eqData = (info && typeof info === 'object') ? getValue(info, '装备数据', null) : null;
                return '<button class="neb-detail-close" id="neb-bag-close">×</button>' +
                    '<div class="neb-card-title">物品详情</div>' +
                    kv('名称', item.name) + kv('分类', catLabel(item.cat)) + kv('类型', getValue(info, '类型')) + kv('价格', getValue(info, '价格')) +
                    (!isNaN(q) && q > 1 ? kv('数量', q) : '') +
                    (plus > 0 ? kv('本楼购入', '+' + plus) : '') +
                    (equipped ? kv('装备状态', '已装备') : '') +
                    kv('限制', getValue(info, '限制')) + kv('描述', getValue(info, '描述')) +
                    '<div class="neb-actions">' +
                    '<button class="neb-btn" data-bagact="use" data-name="' + esc(item.name) + '">使用</button>' +
                    (eqData ? (equipped
                        ? '<button class="neb-btn" data-bagact="unequip" data-name="' + esc(item.name) + '">卸下</button>'
                        : '<button class="neb-btn" data-bagact="equip" data-name="' + esc(item.name) + '">装备</button>')
                        : '') +
                    '<button class="neb-btn" data-bagact="discard" data-name="' + esc(item.name) + '">丢弃</button>' +
                    '</div>';
            }

            /* ===== 商城拓展 II · D：页面渲染（敌方科技 / 黑市 / 竞技场） ===== */

            function mx2KindLabel(kind) {
                return kind === 'skill' ? '技能' : kind === 'equip' ? '装备' : kind === 'item' ? '道具' : '敌方情报';
            }
            function mx2KindBadgeCls(kind) {
                return kind === 'skill' ? 'b-skill' : kind === 'equip' ? 'b-equip' : kind === 'item' ? 'b-prop' : 'b-blood';
            }
            function mx2EntryDesc(kind, data) {
                data = data || {};
                if (kind === 'skill') { var a = []; if (data['AP消耗']) a.push('AP ' + data['AP消耗']); if (data['伤害类型']) a.push(data['伤害类型']); if (data['伤害']) a.push('伤害 ' + data['伤害']); if (data['冷却']) a.push('CD ' + data['冷却']); return a.join(' · ') || (data['描述'] || ''); }
                if (kind === 'equip') { var b = []; if (data['槽位']) b.push(data['槽位']); if (data['伤害']) b.push('伤害 ' + data['伤害']); if (data['护甲']) b.push('护甲 ' + data['护甲']); return b.join(' · ') || (data['描述'] || ''); }
                if (kind === 'enemy') { var s = 0, at = data.attrs || {}; ['力量', '敏捷', '体质', '智力', '精神', '魅力'].forEach(function (k) { s += mxNum2(at[k], 10); }); return 'HP ' + mxNum2(data.hp, 30) + ' · 六维合计 ' + s; }
                return data['描述'] || data['使用效果'] || '';
            }

            function renderEnemyTech(d) {
                var codex = mxCodexGet();
                var km = { skill: 'skills', equip: 'equips', item: 'items', enemy: 'enemies' };
                var kindName = { skill: '技能', equip: '装备', item: '道具', enemy: '敌方情报' };
                var all = [];
                Object.keys(km).forEach(function (kind) {
                    var store = codex[km[kind]];
                    Object.keys(store).forEach(function (n) {
                        all.push({ kind: kind, name: n, entry: store[n], price: mxCodexPrice(kind, store[n].data) });
                    });
                });
                var kw = String(mall2State.enemySearch || '').trim().toLowerCase();
                var cur = mall2State.enemyKind || 'all';
                var counts = { all: 0, skill: 0, equip: 0, item: 0, enemy: 0 };
                all.forEach(function (x) { counts[x.kind]++; });
                counts.all = all.length;
                var show = all.filter(function (x) {
                    if (cur !== 'all' && x.kind !== cur) return false;
                    if (kw) { var hay = (x.name + ' ' + mx2EntryDesc(x.kind, x.entry.data)).toLowerCase(); if (hay.indexOf(kw) < 0) return false; }
                    return true;
                });
                show.sort(function (a, b) { return b.entry.last - a.entry.last || (a.name < b.name ? -1 : 1); });
                mall2State.enemyList = show;
                var vip = mxVipInfo();
                var chips = [{ id: 'all', label: '全部' }, { id: 'skill', label: '技能' }, { id: 'equip', label: '装备' }, { id: 'item', label: '道具' }, { id: 'enemy', label: '敌方情报' }]
                    .map(function (c) { return '<div class="mxs-cat' + (cur === c.id ? ' active' : '') + '" data-ekind="' + c.id + '">' + c.label + '<span class="n">' + (counts[c.id] || 0) + '</span></div>'; }).join('');
                var grid = '';
                show.forEach(function (x, i) {
                    var owned = mxCodexOwned(d, x.kind, x.name);
                    var finalP = Math.round(x.price * vip.cut);
                    grid += '<div class="neb-list-item mxs-item mx2-tech-item cat-' + (x.kind === 'skill' ? 'skill' : x.kind === 'equip' ? 'equip' : x.kind === 'item' ? 'prop' : 'blood') + '" data-et="' + i + '">' +
                        '<div class="mxs-item-top"><span class="mxs-item-name">' + esc(x.name) + '</span>' +
                        mxQualityBadge(mxQualityOfCodex(x.entry, x.kind)) +
                        '<span class="mxs-badge ' + mx2KindBadgeCls(x.kind) + '">' + mx2KindLabel(x.kind) + '</span>' +
                        (owned ? '<span class="mxs-badge owned"><i class="fa-solid fa-check"></i> 已持有</span>' : '') +
                        (x.entry.count > 1 ? '<span class="mxs-badge plus">遭遇×' + x.entry.count + '</span>' : '') +
                        '</div>' +
                        '<div class="mxs-desc">' + esc(mx2EntryDesc(x.kind, x.entry.data)) + '</div>' +
                        '<div class="mxs-foot"><span class="mxs-price"><i class="fa-solid fa-microchip"></i>' + finalP +
                        (vip.cut < 1 ? ' <s style="color:#C9C4D4;font-size:11px">' + x.price + '</s>' : '') + '</span>' +
                        '<span class="mx2-src">来源 #' + mxNum2(x.entry.last, 0) + '</span></div></div>';
                });
                if (!show.length) grid = '<div class="mxs-empty">' + (all.length ? '没有匹配的图鉴条目' : '敌方图鉴为空：与敌人战斗、或楼层出现 enemy_spawn / skill_register 标签后自动收录') + '</div>';
                return '<div class="mx2-page-head"><div class="mx2-page-title"><i class="fa-solid fa-microchip"></i>敌方科技 · 逆向工程</div>' +
                    '<div class="mx2-page-sub">收录遭遇的敌方技能 / 装备 / 道具 / 情报，购买后直接写入档案与背包（战斗引擎立即可用）</div></div>' +
                    '<div class="mx2-toolbar"><input class="mxs-search" id="mx2-enemy-search" type="text" placeholder="搜索图鉴..." value="' + esc(mall2State.enemySearch || '') + '" autocomplete="off">' +
                    '<div class="mxs-cats">' + chips + '</div></div>' +
                    '<div class="mxs-records"><span class="mxs-rec-title">图鉴规模</span><span class="mxs-record"><i class="fa-solid fa-dragon"></i>敌方 ' + counts.enemy + '</span><span class="mxs-record"><i class="fa-solid fa-bolt"></i>技能 ' + counts.skill + '</span><span class="mxs-record"><i class="fa-solid fa-shield-halved"></i>装备 ' + counts.equip + '</span><span class="mxs-record"><i class="fa-solid fa-flask"></i>道具 ' + counts.item + '</span></div>' +
                    '<div class="neb-split"><div><div class="mxs-grid" id="mx2-enemy-list">' + grid + '</div></div>' +
                    '<div class="neb-card neb-detail" id="mx2-enemy-detail"></div></div>';
            }
            function enemyTechDetailCard(x, vip) {
                var owned = mxCodexOwned(getStatData() || {}, x.kind, x.name);
                var finalP = Math.round(x.price * vip.cut);
                var h = '<button class="neb-detail-close" id="mx2-enemy-close">×</button><div class="neb-card-title">图鉴条目</div>' +
                    kv('名称', x.name) + kv('类别', mx2KindLabel(x.kind)) + kv('首次收录', '#' + mxNum2(x.entry.first, 0)) + kv('最近出现', '#' + mxNum2(x.entry.last, 0)) + kv('遭遇次数', x.entry.count);
                var data = x.entry.data || {};
                if (x.kind === 'skill') {
                    h += kv('AP消耗', data['AP消耗'] || '-') + kv('伤害类型', data['伤害类型'] || '-') + kv('伤害', data['伤害'] || '-') + kv('范围', data['范围'] || '-') + kv('冷却', data['冷却'] || '-') + (data['描述'] ? kv('描述', data['描述']) : '');
                } else if (x.kind === 'equip') {
                    h += kv('槽位', data['槽位'] || '-') + kv('伤害', data['伤害'] || '-') + kv('护甲', data['护甲'] || '-') + (data['描述'] ? kv('描述', data['描述']) : '');
                } else if (x.kind === 'enemy') {
                    var at = data.attrs || {};
                    h += kv('HP', mxNum2(data.hp, 30)) + kv('力量', at['力量'] || 10) + kv('敏捷', at['敏捷'] || 10) + kv('体质', at['体质'] || 10) + kv('智力', at['智力'] || 10) + kv('精神', at['精神'] || 10) + kv('魅力', at['魅力'] || 10);
                } else {
                    h += (data['描述'] ? kv('描述', data['描述']) : '') + (data['使用效果'] ? kv('使用效果', data['使用效果']) : '');
                }
                h += kv('图鉴定价', x.price + (vip.cut < 1 ? '（VIP ' + Math.round(vip.cut * 100) + '折 → ' + finalP + '）' : '')) +
                    '<div class="neb-actions"><button class="neb-btn mxs-buy-lg" data-ebuy="1" data-kind="' + esc(x.kind) + '" data-name="' + esc(x.name) + '"' + (owned ? ' disabled title="已持有"' : '') + '>' + (owned ? '已持有' : '<i class="fa-solid fa-cart-plus"></i> 购买 · ' + finalP + '积分') + '</button></div>';
                return h;
            }

            function renderBlackMarket(d) {
                var info = mxBlackMarketInfo();
                var hasV = mxBagHasVoucher(d);
                var head = '<div class="mx2-page-head"><div class="mx2-page-title"><i class="fa-solid fa-user-secret"></i>黑市 · 灰色流转</div>' +
                    '<div class="mx2-page-sub">货源按楼层段轮换（每 ' + MX2.bmBucket + ' 楼刷新，当前第 ' + info.bucket + ' 期，下次 #' + info.nextFloor + '）' + (hasV ? ' · <b class="mx2-v">持有黑市折扣券，购买自动额外8折</b>' : '') + '</div></div>';
                if (!info.open) {
                    return head + '<div class="mxs-empty">黑市目前闭市。<br>开启条件：近 ' + MX2.bmBucket + ' 楼内发生过战斗，或敌方图鉴收录 ≥ 5 条（当前 ' + info.total + ' 条）</div>';
                }
                var vip = mxVipInfo();
                var grid = '';
                info.stock.forEach(function (x) {
                    var p = Math.round(x.price * vip.cut);
                    grid += '<div class="neb-list-item mxs-item mx2-bm-item">' +
                        '<div class="mxs-item-top"><span class="mxs-item-name">' + esc(x.name) + '</span>' + mxQualityBadge(x.info) + '<span class="mxs-badge b-prop">矩阵商品</span></div>' +
                        '<div class="mxs-foot"><span class="mxs-price"><i class="fa-solid fa-coins"></i>' + p + '<s style="color:#C9C4D4;font-size:11px">' + x.base + '</s></span>' +
                        '<button class="mxs-buy" data-bbuy="1" data-name="' + esc(x.name) + '">购入</button></div></div>';
                });
                if (!info.stock.length) grid = '<div class="mxs-empty">本期黑市缺货（商品列表无「渠道:黑市」的可定价商品）</div>';
                var items = getRaw(d, '背包与商城.背包.物品列表', {}) || {};
                var fence = '';
                Object.keys(items).forEach(function (n) {
                    if (n === MX2_SHARD) return;
                    var it = items[n]; if (!it || typeof it !== 'object') return;
                    var eq = !!getValue(it, '装备数据', null);
                    var equipped = mxIsEquipped(d, n);
                    var gain = mxSellPrice(eq ? 'equip' : 'item', it);
                    fence += '<div class="neb-list-item mxs-item mx2-fence-item"><div class="mxs-item-top"><span class="mxs-item-name">' + esc(n) + '</span>' +
                        (eq ? '<span class="mxs-badge b-equip">装备</span>' : '<span class="mxs-badge b-prop">道具</span>') +
                        (equipped ? '<span class="mxs-badge plus">装备中·不可卖</span>' : '') + '</div>' +
                        '<div class="mxs-foot"><span class="mxs-price"><i class="fa-solid fa-hand-holding-dollar"></i>+' + gain + '</span>' +
                        '<button class="mx2-btn-sell" data-sell="1" data-name="' + esc(n) + '"' + (equipped ? ' disabled' : '') + '>销赃</button></div></div>';
                });
                if (!fence) fence = '<div class="mxs-empty">背包里没有可销赃的物品</div>';
                var skills = getRaw(d, '个人档案.强化与技能.技能列表', {}) || {};
                var sk = '';
                Object.keys(skills).forEach(function (n) {
                    var gain = mxSellPrice('skill', skills[n]);
                    sk += '<div class="neb-list-item mxs-item mx2-fence-item"><div class="mxs-item-top"><span class="mxs-item-name">' + esc(n) + '</span><span class="mxs-badge b-skill">技能</span></div>' +
                        '<div class="mxs-foot"><span class="mxs-price"><i class="fa-solid fa-hand-holding-dollar"></i>+' + gain + '</span>' +
                        '<button class="mx2-btn-sell warn" data-sellskill="1" data-name="' + esc(n) + '">卖出技能</button></div></div>';
                });
                if (!sk) sk = '<div class="mxs-empty">没有可出售的技能</div>';
                return head +
                    '<div class="mx2-sec-title"><i class="fa-solid fa-box-open"></i>本期货源（' + MX2.bmCut * 10 + ' 折）</div>' +
                    '<div class="mxs-grid">' + grid + '</div>' +
                    '<div class="mx2-sec-title"><i class="fa-solid fa-scale-balanced"></i>销赃台 · 物品 5 折 / 技能 7 折</div>' +
                    '<div class="mx2-two-col"><div><div class="mx2-sec-sub">物品销赃（卖出换积分）</div><div class="mx2-list">' + fence + '</div></div>' +
                    '<div><div class="mx2-sec-sub">技能出售（卖出换积分）</div><div class="mx2-list">' + sk + '</div></div></div>' +
                    (function () {
                        var ses = shopState.session;
                        var log = (ses && ses.sellLog && ses.sellLog.length) ? ses.sellLog : [];
                        if (!log.length) return '<div class="mx2-sec-title"><i class="fa-solid fa-rotate-left"></i>回购台 · 本楼卖出可原价买回</div><div class="mxs-empty">本楼暂无卖出记录，可在此原价回购</div>';
                        var rows = '';
                        log.forEach(function (r, i) {
                            var tag = r.kind === 'skill' ? '技能' : r.kind === 'equip' ? '装备' : '道具';
                            var badge = r.kind === 'skill' ? 'b-skill' : r.kind === 'equip' ? 'b-equip' : 'b-prop';
                            rows += '<div class="neb-list-item mxs-item mx2-fence-item"><div class="mxs-item-top"><span class="mxs-item-name">' + esc(r.name) + '</span>' +
                                '<span class="mxs-badge ' + badge + '">' + tag + '</span></div>' +
                                '<div class="mxs-foot"><span class="mxs-price"><i class="fa-solid fa-coins"></i>-' + r.price + '</span>' +
                                '<button class="mxs-buy" data-buyback="' + i + '">回购</button></div></div>';
                        });
                        return '<div class="mx2-sec-title"><i class="fa-solid fa-rotate-left"></i>回购台 · 本楼卖出可原价买回（撤回本楼操作后清空）</div><div class="mx2-list">' + rows + '</div>';
                    })();
            }

            function renderArena(d) {
                var snap = mxCombatSnapshot();
                var a = mxArenaInfo();
                var bet = (a.bets && a.bets.length) ? a.bets[0] : null;
                var betMap = {}; MX2_BETS.forEach(function (b) { betMap[b.id] = b; });
                var statusHtml;
                if (!snap.present) statusHtml = '<span class="mx2-dot off"></span>无战斗';
                else statusHtml = '<span class="mx2-dot on"></span>战斗进行中 · 回合 ' + snap.turn + (snap.winner ? ' · 已结束' : (snap.active ? '' : ' · 待启动'));
                var h = '<div class="mx2-page-head"><div class="mx2-page-title"><i class="fa-solid fa-khanda"></i>竞技场 · 赌盘与悬赏</div>' +
                    '<div class="mx2-page-sub">' + statusHtml + '</div></div>';
                h += '<div class="neb-card"><div class="neb-card-title">角斗场赌盘</div>';
                if (bet) {
                    var binfo = betMap[bet.type] || { label: bet.type, odds: bet.odds };
                    h += '<div class="mxs-session"><i class="fa-solid fa-ticket"></i>本场已押：' + esc(binfo.label) + ' × ' + bet.amount + ' 积分（赔率 1:' + bet.odds + '），战斗结束后自动结算</div>';
                } else if (!snap.present || !snap.active) {
                    h += '<div class="mxs-empty">战斗开始后才能押注（每场限一注，金额 ' + MX2.betMin + ' ~ ' + MX2.betMax + '）</div>';
                } else {
                    var chips = MX2_BETS.map(function (b) { return '<div class="mxs-cat' + (mall2State.arenaType === b.id ? ' active' : '') + '" data-abtype="' + b.id + '">' + b.label + '<span class="n">1:' + b.odds + '</span></div>'; }).join('');
                    h += '<div class="mx2-toolbar"><div class="mxs-cats">' + chips + '</div>' +
                        '<div class="mxs-qty-row"><span class="lbl2">押注</span>' +
                        '<div class="mxs-qty" id="mx2-arena-qty"><button class="mxs-qbtn" data-aq="-100" type="button">−</button>' +
                        '<span class="mxs-qty-val" id="mx2-arena-amt">' + mall2State.arenaAmt + '</span>' +
                        '<button class="mxs-qbtn" data-aq="100" type="button">＋</button></div>' +
                        '<span class="mxs-sum">积分</span></div>' +
                        '<div class="neb-actions"><button class="neb-btn" data-abet="1"><i class="fa-solid fa-coins"></i>确认押注</button></div></div>';
                }
                if (a.history.length) {
                    h += '<div class="mx2-sec-sub" style="margin-top:10px">结算记录</div><div class="mx2-log">';
                    a.history.slice(0, 6).forEach(function (x) {
                        h += '<div class="mx2-log-row' + (x.gain > 0 ? ' ok' : x.gain < 0 ? ' bad' : '') + '">' + esc(betMap[x.type] ? betMap[x.type].label : x.type) + ' ×' + x.amount + ' — ' + esc(x.res) + (x.gain !== 0 ? '（' + (x.gain > 0 ? '+' : '') + x.gain + '）' : '') + '</div>';
                    });
                    h += '</div>';
                }
                h += '</div>';
                var b = mxBountyInfo();
                h += '<div class="neb-card" style="margin-top:12px"><div class="neb-card-title">矩阵悬赏（击杀自动结算）</div>';
                if (!b.matrix.length) h += '<div class="mxs-empty">暂无悬赏：敌方图鉴收录后自动生成</div>';
                else {
                    b.matrix.forEach(function (t) {
                        h += '<div class="neb-list-item mxs-item"><div class="mxs-item-top"><span class="mxs-item-name"><i class="fa-solid fa-crosshairs"></i> 讨伐 ' + esc(t.target) + '</span>' +
                            (t.claimed ? '<span class="mxs-badge owned">已达成</span>' : '<span class="mxs-badge plus">+' + t.reward + '积分</span>') + '</div></div>';
                    });
                }
                h += '<div class="mx2-sec-sub" style="margin-top:10px">发布悬赏（押金托管 100~5000，由矩阵转交履约者）</div>' +
                    '<div class="mx2-bounty-form">' +
                    '<input class="mxs-search" id="mx2-bounty-text" type="text" placeholder="悬赏内容，如：护送商队通过北境雪原..." autocomplete="off">' +
                    '<div class="mxs-qty-row"><div class="mxs-qty"><button class="mxs-qbtn" data-bq="-100" type="button">−</button>' +
                    '<span class="mxs-qty-val" id="mx2-bounty-amt">500</span>' +
                    '<button class="mxs-qbtn" data-bq="100" type="button">＋</button></div>' +
                    '<span class="mxs-sum">积分押金</span>' +
                    '<button class="neb-btn mx2-post-btn" data-bpost="1"><i class="fa-solid fa-bullhorn"></i>发布悬赏</button></div></div>';
                if (b.player.length) {
                    h += '<div class="mx2-list" style="margin-top:8px">';
                    b.player.slice(0, 6).forEach(function (t) {
                        h += '<div class="neb-list-item mxs-item"><div class="mxs-item-top"><span class="mxs-item-name">' + esc(t.text) + '</span>' +
                            '<span class="mxs-badge ' + (t.status === 'open' ? 'plus' : 'owned') + '">' + (t.status === 'open' ? '进行中 · ' + t.amount : (t.status === 'done' ? '已履行' : '已取消')) + '</span></div>' +
                            (t.status === 'open' ? '<div class="mxs-foot"><button class="mx2-btn-sell" data-bcancel="1" data-id="' + esc(t.id) + '">取消退款</button>' +
                                '<button class="mx2-btn-sell warn" data-bclaim="1" data-id="' + esc(t.id) + '">确认履行</button></div>' : '') + '</div>';
                    });
                    h += '</div>';
                }
                if (b.log.length) {
                    h += '<div class="mx2-sec-sub" style="margin-top:10px">悬赏日志</div><div class="mx2-log">';
                    b.log.slice(0, 6).forEach(function (x) { h += '<div class="mx2-log-row">' + esc(x.txt) + '</div>'; });
                    h += '</div>';
                }
                h += '</div>';
                return h;
            }

/* ===== 商城拓展 II · E：页面渲染（拍卖行 / 轮盘 / 闪购 / 盲盒 / VIP / 回收）+ 顶层页签重组 ===== */

            function renderAuction(d) {
                var s = mxAuctionStock(d);
                var h = '<div class="mx2-page-head"><div class="mx2-page-title"><i class="fa-solid fa-gavel"></i>拍卖行 · 孤品竞价</div>' +
                    '<div class="mx2-page-sub">每 ' + MX2.aucBucket + ' 楼一批孤品（商品列表·拍卖渠道 + 图鉴史诗/传说 + AI 注入），按品质溢价 · 售罄即止 · 下批 #' + s.nextFloor + '</div></div>';
                var grid = '';
                s.stock.forEach(function (x) {
                    var sold = !!s.sold[x.name];
                    grid += '<div class="neb-list-item mxs-item mx2-auc-item' + (sold ? ' sold' : '') + '">' +
                        '<div class="mxs-item-top"><span class="mxs-item-name">' + esc(x.name) + '</span>' +
                        mxQualityBadge(x.lv) +
                        '<span class="mxs-badge b-prop">' + (x.src === 'codex' ? '图鉴孤品' : x.src === 'ai' ? '神秘孤品' : '矩阵拍品') + '</span>' +
                        (sold ? '<span class="mxs-badge owned">已成交</span>' : '') + '</div>' +
                        '<div class="mxs-foot"><span class="mxs-price mx2-auc-price"><i class="fa-solid fa-gavel"></i>' + x.price +
                        '<s style="color:#C9C4D4;font-size:11px">底价 ' + x.base + '</s> ×' + (MX2.qPriceMult[x.lv] || 1) + '</span>' +
                        '<button class="mxs-buy" data-auc="1" data-name="' + esc(x.name) + '"' + (sold ? ' disabled' : '') + '>拍下</button></div></div>';
                });
                if (!s.stock.length) grid = '<div class="mxs-empty">本期无符合条件的孤品（需图鉴收录史诗/传说条目、或商品列表含拍卖渠道、或 AI 注入 _mxAuctionPool），下批 #' + s.nextFloor + '</div>';
                return h + '<div class="mxs-grid">' + grid + '</div>';
            }

            function renderRoulette(d) {
                var info = mxRouletteInfo();
                var maxSpins = mxRouletteMax();
                var used = mxNum2(info.used, 0);
                var sector = Math.floor(360 / MX2_ROU_PRIZES.length);
                var colors = ['#A8E6CF', '#FFD3B6', '#B5EAEA', '#FFE8C2', '#C3E8BD', '#FFC98F', '#9CD5EC', '#F4B9A1', '#F9D6E0'];
                var stops = [];
                for (var i = 0; i < MX2_ROU_PRIZES.length; i++) { stops.push(colors[i % colors.length] + ' ' + (i * sector) + 'deg ' + ((i + 1) * sector) + 'deg'); }
                var nums = '';
                MX2_ROU_PRIZES.forEach(function (p, i) {
                    var ang = (i * sector + sector / 2) * Math.PI / 180;
                    var x = +(44 * Math.sin(ang)).toFixed(2);
                    var y = +(-44 * Math.cos(ang)).toFixed(2);
                    nums += '<b class="mx2-wheel-num" style="left:calc(50% + ' + x + '%);top:calc(50% + ' + y + '%)">' + (i + 1) + '</b>';
                });
                var sum = 0; MX2_ROU_PRIZES.forEach(function (p) { sum += p.w; });
                var table = MX2_ROU_PRIZES.map(function (p, i) {
                    return '<div class="mx2-prize-row"><i style="background:' + colors[i % colors.length] + '"></i><span class="mx2-idx">' + (i + 1) + '</span><span>' + esc(p.label) + '</span><b>' + (Math.round(p.w / sum * 1000) / 10) + '%</b></div>';
                }).join('');
                var hist = (info.history || []).slice(0, 6).map(function (x) { return '<span class="mxs-record"><i class="fa-solid fa-clock-rotate-left"></i>' + esc(x.label) + '</span>'; }).join('');
                var vip = mxVipInfo();
                return '<div class="mx2-page-head"><div class="mx2-page-title"><i class="fa-solid fa-dharmachakra"></i>幸运轮盘</div>' +
                    '<div class="mx2-page-sub">每次 ' + MX2.rouCost + ' 积分 · 本楼 ' + used + ' / ' + maxSpins + ' 次' +
                    (vip.spins ? '（VIP+' + vip.spins + '）' : '') + (mxNum2(info.bonus, 0) > 0 ? '（合成加次 +' + info.bonus + '）' : '') + ' · 次数每楼刷新</div></div>' +
                    '<div class="mx2-rou-wrap">' +
                    '<div class="mx2-wheel-box"><div class="mx2-wheel"><div class="mx2-wheel-disc" id="mx2-wheel-disc" style="transform:rotate(' + mxNum2(mall2State.rouletteRot, 0) + 'deg);background:conic-gradient(' + stops.join(',') + ')">' + nums + '</div>' +
                    '<i class="mx2-wheel-pin"></i></div>' +
                    '<button class="mx2-spin-btn" data-spin="1"' + (used >= maxSpins || mall2State.spinning ? ' disabled' : '') + '><i class="fa-solid fa-dice"></i> ' + (mall2State.spinning ? '转动中...' : '开启 · ' + MX2.rouCost + '积分') + '</button></div>' +
                    '<div class="mx2-prize-table"><div class="mx2-sec-sub">奖池公示（加权概率）</div>' + table + '</div></div>' +
                    (hist ? '<div class="mxs-records" style="margin-top:12px"><span class="mxs-rec-title">最近</span>' + hist + '</div>' : '');
            }

            function renderFlashPage(d) {
                var s = mxFlashStock(d);
                var h = '<div class="mx2-page-head"><div class="mx2-page-title"><i class="fa-solid fa-bolt"></i>限时闪购 · 5折</div>' +
                    '<div class="mx2-page-sub">每 ' + MX2.flashBucket + ' 楼一轮 · 本轮 #' + (s.bucket * MX2.flashBucket) + ' 起，' + (s.nextFloor - s.lid) + ' 楼后结束 · 每件限购 1 次</div></div>';
                var grid = '';
                s.stock.forEach(function (x) {
                    var bought = !!s.bought[x.name];
                    grid += '<div class="neb-list-item mxs-item mx2-flash-item' + (bought ? ' sold' : '') + '">' +
                        '<div class="mxs-item-top"><span class="mxs-item-name">' + esc(x.name) + '</span>' + mxQualityBadge(x.info) +
                        (bought ? '<span class="mxs-badge owned">已抢购</span>' : '<span class="mxs-badge plus">限购1件</span>') + '</div>' +
                        '<div class="mxs-foot"><span class="mxs-price"><i class="fa-solid fa-bolt"></i>' + x.price + '<s style="color:#C9C4D4;font-size:11px">' + x.base + '</s></span>' +
                        '<button class="mxs-buy" data-fbuy="1" data-name="' + esc(x.name) + '"' + (bought ? ' disabled' : '') + '>抢购</button></div></div>';
                });
                if (!s.stock.length) grid = '<div class="mxs-empty">本轮闪购已结束或商品列表无「渠道:闪购」的有效定价商品</div>';
                return h + '<div class="mxs-grid">' + grid + '</div>';
            }

            function renderBlindPage(d) {
                var codexCount = Object.keys(MX_CODEX.skills).length + Object.keys(MX_CODEX.equips).length + Object.keys(MX_CODEX.items).length;
                var h = '<div class="mx2-page-head"><div class="mx2-page-title"><i class="fa-solid fa-box-archive"></i>矩阵盲盒 · 图鉴实物抽奖</div>' +
                    '<div class="mx2-page-sub">从敌方图鉴随机抽取实物（技能/装备/道具，直接写入档案/背包）· 图鉴池为空时折算通货 · 当前图鉴规模 ' + codexCount + ' 条</div></div><div class="mx2-blind-grid">';
                MX2_BLIND.forEach(function (t) {
                    var ql = t.qlv.map(function (lv) { return mxQualityLabel(lv); }).join('/');
                    var fbRows = t.fallback.map(function (r) {
                        var name = r.kind === 'shard' ? '神秘碎片×' + r.n : r.kind === 'points' ? '积分×' + r.n : '折扣券×' + r.n;
                        var sum = 0; t.fallback.forEach(function (x) { sum += x.w; });
                        return '<div class="mx2-prize-row"><span>' + name + '（图鉴空时）</span><b>' + (Math.round(r.w / sum * 1000) / 10) + '%</b></div>';
                    }).join('');
                    h += '<div class="neb-card mx2-blind-card' + (t.id === 'l' ? ' legend' : t.id === 'r' ? ' rare' : '') + '">' +
                        '<div class="mx2-blind-name">' + t.label + '</div><div class="mx2-blind-hint">' + t.hint + '</div>' +
                        '<div class="mx2-blind-table"><div class="mx2-prize-row"><span>品质池：' + ql + '</span><b>图鉴实物</b></div>' + fbRows + '</div>' +
                        '<button class="neb-btn mxs-buy-lg" data-blind="' + t.id + '"><i class="fa-solid fa-box-open"></i> 开启 · ' + t.cost + '积分</button></div>';
                });
                return h + '</div>';
            }

            function renderVipPage(d) {
                var v = mxVipInfo();
                var pct = v.nextAt ? Math.min(100, Math.round(v.spent / v.nextAt * 100)) : 100;
                var h = '<div class="mx2-page-head"><div class="mx2-page-title"><i class="fa-solid fa-crown"></i>矩阵会员 · ' + v.name + '</div>' +
                    '<div class="mx2-page-sub">累计消费自动升级（含各商城/玩法消费，退款不计）· 升级即发礼包</div></div>' +
                    '<div class="neb-card mx2-vip-card"><div class="mx2-vip-big">' + v.name + '</div>' +
                    '<div class="mx2-vip-spent">累计消费 <b>' + v.spent + '</b> 积分' + (v.nextAt ? ' · 距下一级 ' + v.nextAt + '（' + pct + '%）' : ' · 已满级') + '</div>' +
                    '<div class="mx2-vip-bar"><i style="width:' + pct + '%"></i></div></div>' +
                    '<div class="mx2-vip-perks">' +
                    '<div class="mx2-perk"><b>' + Math.round(v.cut * 100) + ' 折</b><span>商店类消费<br>（商城/闪购/敌方科技/黑市）</span></div>' +
                    '<div class="mx2-perk"><b>+' + v.spins + '</b><span>轮盘每楼<br>额外次数</span></div>' +
                    '<div class="mx2-perk"><b>' + v.bmSlots + '</b><span>黑市同时<br>在售货位</span></div>' +
                    '<div class="mx2-perk"><b>礼包</b><span>升级即得 积分×400×级<br>+ 碎片×4×级</span></div></div>' +
                    '<div class="mx2-sec-sub" style="margin-top:12px">等级门槛</div><div class="mx2-vip-table">';
                var names = ['LV0', 'LV1', 'LV2', 'LV3', 'LV4', 'LV5'];
                for (var i = 0; i < names.length; i++) {
                    h += '<div class="mx2-prize-row' + (i === v.level ? ' cur' : '') + '"><span>' + names[i] + '</span><b>' + MX2.vipTh[i] + ' 消费</b></div>';
                }
                return h + '</div>';
            }

            function renderRecyclePage(d) {
                var shards = mxShardCount(d);
                var h = '<div class="mx2-page-head"><div class="mx2-page-title"><i class="fa-solid fa-recycle"></i>回收分解台</div>' +
                    '<div class="mx2-page-sub">分解物品：积分 30% 返还 + 按品质掉落神秘碎片 · 碎片可合成奖励</div></div>' +
                    '<div class="mxs-session"><i class="fa-solid fa-gem"></i>当前神秘碎片：<b>' + shards + '</b> 枚</div>' +
                    '<div class="mx2-sec-title"><i class="fa-solid fa-wand-magic-sparkles"></i>碎片合成</div><div class="mx2-craft-grid">';
                MX2_RECIPES.forEach(function (r) {
                    h += '<div class="neb-card mx2-craft-card' + (shards < r.cost ? ' lack' : '') + '"><div class="mx2-blind-name">' + r.label + '</div>' +
                        '<div class="mx2-blind-hint">' + r.desc + '</div>' +
                        '<button class="neb-btn mxs-buy-lg" data-craft="' + r.id + '"' + (shards < r.cost ? ' disabled' : '') + '><i class="fa-solid fa-gem"></i> ' + r.cost + ' 碎片</button></div>';
                });
                h += '</div><div class="mx2-sec-title"><i class="fa-solid fa-fire"></i>分解背包物品</div><div class="mxs-grid">';
                var items = getRaw(d, '背包与商城.背包.物品列表', {}) || {};
                var any = false;
                Object.keys(items).forEach(function (n) {
                    if (n === MX2_SHARD) return;
                    var it = items[n]; if (!it || typeof it !== 'object') return;
                    var g = mxRecycleGain(it);
                    var equipped = mxIsEquipped(d, n);
                    any = true;
                    h += '<div class="neb-list-item mxs-item"><div class="mxs-item-top"><span class="mxs-item-name">' + esc(n) + '</span>' +
                        (equipped ? '<span class="mxs-badge plus">装备中·先卸下</span>' : '') + '</div>' +
                        '<div class="mxs-foot"><span class="mxs-price"><i class="fa-solid fa-recycle"></i>+' + g.points + ' · <i class="fa-solid fa-gem" style="font-size:10px"></i>×' + g.shards + '</span>' +
                        '<button class="mx2-btn-sell" data-dis="' + esc(n) + '"' + (equipped ? ' disabled' : '') + '>分解</button></div></div>';
                });
                if (!any) h += '<div class="mxs-empty">背包里没有可分解的物品</div>';
                return h + '</div>';
            }

            /* ---------- 复写：商城（新增 闪购 / 盲盒 / VIP 子页） ---------- */
            function renderShop(d) {
                var shop = getRaw(d, '背包与商城.商城.商品列表', {});
                var bal = parsePrice(mxGetBalance(d));
                var bagList = getRaw(d, '背包与商城.背包.物品列表', {});
                var ses = shopState.session;
                var sub = shopState.sub || 'normal';
                var arr = [], f = null, shopList = '', recHtml = '';
                if (sub === 'normal') {
                if (shop && typeof shop === 'object') {
                    Object.keys(shop).forEach(function (name) {
                        var info = shop[name];
                        var ch = mxChannelOf(info);
                        if (ch && ch !== 'shop') return;
                        if (info && typeof info === 'object') {
                            arr.push({ name: name, info: info, cat: shopCatOf(info), price: parsePrice(getValue(info, '价格', NaN)) });
                        } else {
                            arr.push({ name: name, info: { '描述': String(info === null || info === undefined ? '' : info) }, cat: 'none', price: NaN });
                        }
                    });
                }
                f = mxFilterItems(arr, shopState);
                shopState.list = f.list;
                shopList = '';
                f.list.forEach(function (it, idx) {
                    var typeTxt = mxTypeText(it);
                    var desc = mxDescText(it);
                    var owned = bagList && typeof bagList === 'object' && bagList[it.name] !== undefined;
                    var plus = (ses && ses.items && ses.items[it.name]) ? ses.items[it.name] : 0;
                    var afford = !isFinite(it.price) || !(it.price > 0) || !isFinite(bal) || bal >= it.price;
                    shopList += '<div class="neb-list-item neb-shop-item mxs-item cat-' + it.cat + '" data-s="' + idx + '">' +
                        '<div class="mxs-item-top"><span class="mxs-item-name">' + esc(it.name) + '</span>' +
                        mxQualityBadge(it.info) +
                        (typeTxt ? '<span class="mxs-badge b-' + it.cat + '">' + esc(typeTxt) + '</span>' :
                            '<span class="mxs-badge b-none">' + catLabel(it.cat) + '</span>') +
                        (owned ? '<span class="mxs-badge owned"><i class="fa-solid fa-check"></i> 已持有</span>' : '') +
                        (plus > 0 ? '<span class="mxs-badge plus">本楼+' + plus + '</span>' : '') +
                        '</div>' +
                        (desc && desc !== '-' ? '<div class="mxs-desc">' + esc(desc) + '</div>' : '') +
                        '<div class="mxs-foot"><span class="mxs-price"><i class="fa-solid fa-coins"></i>' +
                        esc(getValue(it.info, '价格', '-')) + '</span>' +
                        '<div class="mxs-ops"><div class="mxs-qty" data-price="' + (isFinite(it.price) ? it.price : '') + '">' +
                        '<button class="mxs-qbtn" data-q="-1" type="button">−</button>' +
                        '<span class="mxs-qty-val">1</span>' +
                        '<button class="mxs-qbtn" data-q="1" type="button">＋</button></div>' +
                        '<button class="mxs-buy" data-buy="' + idx + '"' + (afford ? '' : ' disabled title="积分余额不足"') + '>购买</button></div></div>' +
                        '</div>';
                });
                if (!f.list.length) shopList = '<div class="mxs-empty">' + (arr.length ? '没有匹配的商品，试试换个关键词或分类' : '暂无商品') + '</div>';
                var recs = mxShopRecords();
                recHtml = recs.length ? '<div class="mxs-records"><span class="mxs-rec-title">最近购买</span>' +
                    recs.slice(0, 8).map(function (r) {
                        return '<span class="mxs-record"><i class="fa-solid fa-clock-rotate-left"></i>' + esc(r.name) + '</span>';
                    }).join('') + '</div>' : '';
                }
                var facUnlock = getRaw(d, '背包与商城.商城.阵营商店（仅当有阵营时显示）.解锁商品列表', []);
                var facLevel = getValue(d, '主页.所属主神好感度.文本', '-');
                var facShopGoods = getRaw(d, '背包与商城.商城.商品列表', {}) || {};
                var facHtml = '';
                if (sub === 'faction') {
                Object.keys(facShopGoods).forEach(function (n) {
                    if (mxChannelOf(facShopGoods[n]) !== 'faction') return;
                    var g = facShopGoods[n];
                    var p = getValue(g, '价格', '-');
                    var t = getValue(g, '类型', '');
                    var desc = getValue(g, '描述', '');
                    facHtml += '<div class="neb-list-item mxs-item"><div class="mxs-item-top"><span class="mxs-item-name">' + esc(n) + '</span>' +
                        (t ? '<span class="mxs-badge b-prop">' + esc(t) + '</span>' : '') + '</div>' +
                        (desc ? '<div class="mxs-desc">' + esc(desc) + '</div>' : '') +
                        '<div class="mxs-foot"><span class="mxs-price"><i class="fa-solid fa-coins"></i>' + esc(p) + '</span></div></div>';
                });
                if (Array.isArray(facUnlock) && facUnlock.length) {
                    facUnlock.forEach(function (x) { facHtml += '<div class="neb-list-item">' + esc(
                            typeof x === 'object' ? JSON.stringify(x) : x) + '</div>'; });
                }
                if (!facHtml) { facHtml = '<div class="neb-empty">当前好感度未解锁任何商品</div>'; }
                }
                var realHtml = '';
                if (sub === 'real') { realHtml = (function () {
                    var rate = parsePrice(getRaw(d, '背包与商城.商城.现实通道.兑换比例', NaN));
                    var rateOk = isFinite(rate) && rate > 0;
                    var base = kv('兑换比例', getValue(d, '背包与商城.商城.现实通道.兑换比例')) +
                        kv('当前可兑换上限', getValue(d, '背包与商城.商城.现实通道.当前可兑换上限')) +
                        kv('下次强制召回时间', getValue(d, '背包与商城.商城.现实通道.下次强制召回时间'));
                    if (!rateOk) {
                        return base + '<div class="neb-actions"><button class="neb-btn" onclick="nebFill(\'兑换现实时间\')">兑换现实时间</button></div>';
                    }
                    var lim = parsePrice(getRaw(d, '背包与商城.商城.现实通道.当前可兑换上限', NaN));
                    var limOk = isFinite(lim) && lim >= 0;
                    return base +
                        '<div class="mxs-qty-row"><span class="lbl2">时长</span>' +
                        '<div class="mxs-qty" id="mxs-rt-qty" data-price="' + rate + '" data-limit="' + (limOk ? lim : '') + '">' +
                        '<button class="mxs-qbtn" data-q="-1" type="button">−</button>' +
                        '<span class="mxs-qty-val" id="mxs-rt-val">1</span>' +
                        '<button class="mxs-qbtn" data-q="1" type="button">＋</button></div>' +
                        '<span class="mxs-sum" id="mxs-rt-sum">合计 ' + rate + '</span></div>' +
                        '<div class="neb-actions"><button class="neb-btn mxs-rt-buy" id="mxs-rt-buy"' +
                        (limOk && lim < 1 ? ' disabled title="可兑换上限不足"' : '') + '>兑换现实时间</button></div>';
                })();
                }
                var on = function (id) { return sub === id ? ' active' : ''; };
                return '<div class="neb-card mxs-shop-card"><div class="neb-card-title">矩阵商城</div>' +
                    '<div class="neb-subtabs" id="neb-shop-subtabs">' +
                    '<div class="neb-subtab' + on('normal') + '" data-sub="normal">普通商城</div>' +
                    '<div class="neb-subtab' + on('flash') + '" data-sub="flash">⚡闪购</div>' +
                    '<div class="neb-subtab' + on('blind') + '" data-sub="blind">盲盒</div>' +
                    '<div class="neb-subtab' + on('vip') + '" data-sub="vip">VIP</div>' +
                    '<div class="neb-subtab' + on('faction') + '" data-sub="faction">阵营商店</div>' +
                    '<div class="neb-subtab' + on('real') + '" data-sub="real">现实通道</div>' +
                    '<div class="neb-subtab' + on('obsession') + '" data-sub="obsession">执念</div>' +
                    '</div>' +
                    '<div class="neb-subpage' + on('normal') + '" id="sub-normal">' +
                    (sub === 'normal' ?
                        mxShopToolbar(shopState, 'mxs-shop-search', f.counts, arr.length, f.list.length) +
                        mxSessionSummary() +
                        '<div class="neb-split">' +
                        '<div class="mxs-grid" id="neb-shop-list">' + shopList + '</div>' +
                        '<div class="neb-card neb-detail" id="neb-shop-detail"></div></div>' +
                        recHtml
                        : '<div class="mxs-empty">切换页签后载入…</div>') + '</div>' +
                    '<div class="neb-subpage' + on('flash') + '" id="sub-flash">' + (sub === 'flash' ? renderFlashPage(d) : '<div class="mxs-empty">切换页签后载入…</div>') + '</div>' +
                    '<div class="neb-subpage' + on('blind') + '" id="sub-blind">' + (sub === 'blind' ? renderBlindPage(d) : '<div class="mxs-empty">切换页签后载入…</div>') + '</div>' +
                    '<div class="neb-subpage' + on('vip') + '" id="sub-vip">' + (sub === 'vip' ? renderVipPage(d) : '<div class="mxs-empty">切换页签后载入…</div>') + '</div>' +
                    '<div class="neb-subpage' + on('faction') + '" id="sub-faction">' + (sub === 'faction' ? '<div style="margin-bottom:8px">当前好感度等级：<b>' +
                    esc(facLevel) + '</b></div><div class="neb-list">' + facHtml + '</div>' : '<div class="mxs-empty">切换页签后载入…</div>') + '</div>' +
                    '<div class="neb-subpage' + on('real') + '" id="sub-real">' + (sub === 'real' ? realHtml : '<div class="mxs-empty">切换页签后载入…</div>') + '</div>' +
                    '<div class="neb-subpage' + on('obsession') + '" id="sub-obsession">' + (sub === 'obsession' ? renderObsession(d) : '<div class="mxs-empty">切换页签后载入…</div>') + '</div>' +
                    '</div>';
            }

            /* ---------- 复写：背包（新增 回收分解台 子页） ---------- */
            function renderBag(d) {
                var items = getRaw(d, '背包与商城.背包.物品列表', {});
                var bsub0 = mall2State.bagSub || 'items';
                var arr = [], estQty = 0, f = null, listHtml = '', capCard = '', bagBody = '';
                if (bsub0 === 'items') {
                if (items && typeof items === 'object') {
                    Object.keys(items).forEach(function (name) {
                        var info = items[name];
                        if (info && typeof info === 'object') {
                            arr.push({ name: name, info: info, cat: shopCatOf(info), price: parsePrice(getValue(info, '价格', NaN)) });
                            var q = parseInt(info['数量'], 10);
                            estQty += isNaN(q) ? 1 : q;
                        } else {
                            arr.push({ name: name, info: { '描述': String(info === null || info === undefined ? '' : info) }, cat: 'none', price: NaN });
                            estQty += 1;
                        }
                    });
                }
                var ses = shopState.session;
                f = mxFilterItems(arr, bagState);
                bagState.list = f.list;
                listHtml = '';
                f.list.forEach(function (it, idx) {
                    var typeTxt = mxTypeText(it);
                    var desc = mxDescText(it);
                    var q = parseInt((it.info || {})['数量'], 10);
                    var plus = (ses && ses.items && ses.items[it.name]) ? ses.items[it.name] : 0;
                    listHtml += '<div class="neb-list-item neb-bag-item mxs-item cat-' + it.cat + '" data-b="' + idx + '">' +
                        '<div class="mxs-item-top"><span class="mxs-item-name">' + esc(it.name) + '</span>' +
                        mxQualityBadge(it.info) +
                        (typeTxt ? '<span class="mxs-badge b-' + it.cat + '">' + esc(typeTxt) + '</span>' :
                            '<span class="mxs-badge b-none">' + catLabel(it.cat) + '</span>') +
                        (!isNaN(q) && q > 1 ? '<span class="mxs-badge owned">×' + q + '</span>' : '') +
                        (plus > 0 ? '<span class="mxs-badge plus">本楼+' + plus + '</span>' : '') +
                        '</div>' +
                        (desc && desc !== '-' ? '<div class="mxs-desc">' + esc(desc) + '</div>' : '') +
                        '</div>';
                });
                if (!f.list.length) listHtml = '<div class="mxs-empty">' + (arr.length ? '没有匹配的物品，试试换个关键词或分类' : '背包空空如也') + '</div>';
                var capRaw = getValue(d, '背包与商城.背包.容量', '-');
                var pc = mxParseCap(capRaw);
                var cap = (pc && isFinite(pc.cap)) ? pc.cap : MX_CAP_INIT;
                var aiUsed = (pc && isFinite(pc.used)) ? pc.used : null;
                var n = Math.max(1, Math.floor((cap - MX_CAP_INIT) / MX_CAP_STEP) + 1);
                var nextPrice = mxCapPrice(n);
                capCard = '<div class="neb-card mxs-cap-card">' +
                    '<div class="mxs-cap-main"><div class="mxs-cap-title"><i class="fa-solid fa-bag-shopping"></i>背包容量</div>' +
                    '<div class="mxs-cap-val">' + esc(estQty + ' / ' + cap) +
                    '<span class="mxs-cap-sub">（已用按物品列表实时估算' +
                    (aiUsed !== null && aiUsed !== estQty ? '；AI 记录 ' + esc(capRaw) : '') +
                    '）</span></div></div>' +
                    '<div class="mxs-cap-side">' +
                    '<button class="mxs-cap-btn" id="mxs-cap-buy"' + (cap >= MX_CAP_MAX ? ' disabled' : '') + '><i class="fa-solid fa-expand"></i>扩展 +' + MX_CAP_STEP + ' 格 · ' + nextPrice + '积分</button>' +
                    '<div class="mxs-cap-hint">' + (cap >= MX_CAP_MAX ?
                        ('已达上限 ' + MX_CAP_MAX + ' 格') :
                        ('第 ' + n + ' 次扩展：' + cap + ' -> ' + Math.min(MX_CAP_MAX, cap + MX_CAP_STEP) + ' 格，价格随次数递增（250×n×(n+1)）')) + '</div>' +
                    '</div></div>';
                bagBody = capCard +
                    mxShopToolbar(bagState, 'mxs-bag-search', f.counts, arr.length, f.list.length) +
                    mxSessionSummary() +
                    '<div class="neb-split" style="margin-top:12px">' +
                    '<div><div class="mxs-grid" id="neb-bag-list">' + listHtml + '</div></div>' +
                    '<div class="neb-card neb-detail" id="neb-bag-detail"></div>' +
                    '</div>';
                }
                var bsub = mall2State.bagSub || 'items';
                var bon = function (id) { return bsub === id ? ' active' : ''; };
                return '<div class="neb-subtabs mx2-bag-tabs" id="mx2-bag-subtabs">' +
                    '<div class="mx2-subtab' + bon('items') + '" data-bagsub="items">物品</div>' +
                    '<div class="mx2-subtab' + bon('recycle') + '" data-bagsub="recycle"><i class="fa-solid fa-recycle"></i> 回收分解台</div></div>' +
                    '<div class="neb-subpage' + bon('items') + '" id="mx2-bag-items">' + (bagBody || '<div class="mxs-empty">切换页签后载入…</div>') + '</div>' +
                    '<div class="neb-subpage' + bon('recycle') + '" id="mx2-bag-recycle">' + (bsub === 'recycle' ? renderRecyclePage(d) : '<div class="mxs-empty">切换页签后载入…</div>') + '</div>';
            }

            /* ---------- 复写：交易所顶层（7 页签） ---------- */
            function renderExchange(d) {
                try { if (typeof bindMall2 === 'function') setTimeout(bindMall2, 0); } catch (e) {}
                var balance = mxGetBalance(d);
                var bal = parsePrice(balance);
                var shop = getRaw(d, '背包与商城.商城.商品列表', {});
                var bag = getRaw(d, '背包与商城.背包.物品列表', {});
                var shopCnt = shop && typeof shop === 'object' ? Object.keys(shop).length : 0;
                var bagCnt = bag && typeof bag === 'object' ? Object.keys(bag).length : 0;
                var ses = shopState.session;
                var curId = (typeof getCurrentMessageIdSafe === 'function') ? getCurrentMessageIdSafe() : null;
                var canUndo = !!(ses && ses.items && Object.keys(ses.items).length && curId !== null && curId !== undefined && curId === ses.msgId);
                var vip = mxVipInfo();
                var exSub = shopState.exSub || 'ex-shop';
                var on = function (id) { return exSub === id ? ' active' : ''; };
                var tab = function (id, label, icon) { return '<div class="neb-subtab' + on(id) + '" data-sub="' + id + '"><i class="' + icon + '"></i> ' + label + '</div>'; };
                return '<div class="neb-card mxs-ex-card">' +
                    '<div class="mxs-banner">' +
                    '<div><div class="mxs-banner-label">MATRIX EXCHANGE · 交易所</div>' +
                    '<div class="mxs-banner-bal"><i class="fa-solid fa-coins"></i>' +
                    esc(isFinite(bal) ? bal : balance) + '</div>' +
                    '<div class="mxs-banner-unit">积分余额 · 会员 ' + vip.name + (vip.cut < 1 ? '（' + Math.round(vip.cut * 100) + '折）' : '') + '</div></div>' +
                    '<div class="mxs-banner-side">' +
                    (canUndo ? '<button class="mxs-undo" id="mxs-undo-btn" title="回滚本楼全部前端购买/卖出/分解，积分退回"><i class="fa-solid fa-rotate-left"></i>撤回本楼操作</button>' : '') +
                    '<span>商品 ' + shopCnt + ' 件</span><span>背包 ' + bagCnt + ' 件</span></div>' +
                    '</div>' +
                    '<div class="mxs-note" id="mxs-note"></div>' +
                    '<div class="mxs-pad">' +
                    '<div class="neb-ex-wrap">' +
                    '<div class="neb-subtabs mx2-ex-tabs" id="mx-ex-tabs">' +
                    tab('ex-shop', '商城', 'fa-solid fa-store') +
                    tab('ex-bag', '背包', 'fa-solid fa-bag-shopping') +
                    tab('ex-enemy', '敌方科技', 'fa-solid fa-microchip') +
                    tab('ex-black', '黑市', 'fa-solid fa-user-secret') +
                    tab('ex-arena', '竞技场', 'fa-solid fa-khanda') +
                    tab('ex-auction', '拍卖行', 'fa-solid fa-gavel') +
                    tab('ex-roulette', '幸运轮盘', 'fa-solid fa-dharmachakra') +
                    '</div>' +
                    (function () {
                        var subs = { 'ex-shop': renderShop, 'ex-bag': renderBag, 'ex-enemy': renderEnemyTech, 'ex-black': renderBlackMarket, 'ex-arena': renderArena, 'ex-auction': renderAuction, 'ex-roulette': renderRoulette };
                        var out = '';
                        Object.keys(subs).forEach(function (id) {
                            if (id === exSub) {
                                out += '<div class="neb-subpage active" id="sub-' + id + '"><div id="page-' + id.slice(3) + '">' + subs[id](d) + '</div></div>';
                            } else {
                                out += '<div class="neb-subpage" id="sub-' + id + '"><div class="mxs-empty">切换页签后载入…</div></div>';
                            }
                        });
                        return out;
                    })() +
                    '</div></div></div>';
            }

            var __mxNebDirty = {};
            function mxRenderNebPage(page, d) {
                var pages = { home: renderHome, profile: renderProfile, quest: renderQuest,
                    world: renderWorld, log: renderLog, faction: renderFaction };
                var fn = pages[page];
                if (!fn) return;
                var el = document.getElementById('page-' + page);
                if (!el) return;
                if (d === undefined) d = getStatData();
                if (!d) return;
                try { el.innerHTML = fn(d); } catch (e) { console.error(page, e); }
                delete __mxNebDirty[page];
            }
            function renderHud(d) {
                var actTab = document.querySelector('#neb-tabs .neb-tab.active');
                var actPage = actTab ? (actTab.getAttribute('data-page') || 'home') : 'home';
                Object.keys({ home: 1, profile: 1, quest: 1, world: 1, log: 1, faction: 1 }).forEach(function(k) {
                    if (k === actPage) mxRenderNebPage(k, d);
                    else __mxNebDirty[k] = true;
                });
                var exPage = document.getElementById('mx-page-exchange');
                if (exPage && exPage.classList.contains('active')) {
                    try {
                        var exBody = document.getElementById('mx-ex-body');
                        if (exBody) exBody.innerHTML = renderExchange(d);
                    } catch (e) { console.error('exchange', e); }
                } else { __mxNebDirty.__exchange = true; }
                bindDynamic();
            }

            /* ===== 商城拓展 II · A：基础工具 / VIP / 前端定价 / 背包技能读写 / 统一交易核心 =====
   约定：只写既有 MVU 结构（主页.积分余额 / 背包与商城.背包.物品列表 / 个人档案.强化与技能.技能列表），
   模块自身状态一律存聊天变量（_mx 前缀），不向 stat_data 新增区块 */
            var MX2 = {
                vipTh: [0, 1000, 5000, 20000, 100000, 500000],
                vipCut: [1, 0.98, 0.96, 0.94, 0.92, 0.90],
                vipSpins: [0, 0, 1, 1, 2, 3],
                vipBmSlots: [4, 5, 5, 6, 6, 7],
                rouCost: 300, rouPer: 5,
                bmBucket: 10, bmCut: 0.7,
                flashBucket: 5, flashCut: 0.5,
                aucBucket: 10,
                sellEquip: 0.5, sellSkill: 0.7, recycleCut: 0.3,
                shardByQ: [0, 1, 2, 4, 8, 16],
                qPriceMult: [1, 1, 1, 1.5, 2.5, 4],
                channels: { shop: '商城', flash: '闪购', black: '黑市', auction: '拍卖', faction: '阵营商城' },
                betMin: 50, betMax: 2000,
                caps: { enemies: 40, skills: 60, equips: 60, items: 60 }
            };
            var MX2_SHARD = '神秘碎片';
            var MX2_VOUCHER = '黑市折扣券';
            var MX_CODEX = { enemies: {}, skills: {}, equips: {}, items: {}, _bkey: null, _bFloor: -999 };
            var mall2State = { enemyKind: 'all', enemySearch: '', bagSub: 'items', arenaType: 'win', arenaAmt: 100, rouletteRot: 0, spinning: false };

            function mx2SafeId() {
                if (typeof getCurrentMessageIdSafe === 'function') { var i = getCurrentMessageIdSafe(); if (i !== null && i !== undefined) return i; }
                if (typeof getCurrentMessageId === 'function') { try { return getCurrentMessageId(); } catch (e) {} }
                return null;
            }
            function mx2LastFloor() {
                if (typeof getLastMessageId === 'function') { try { return getLastMessageId(); } catch (e) {} }
                var i = mx2SafeId(); return (i === null) ? 0 : i;
            }
            function mxChatGet() { try { return (typeof getVariables === 'function' && getVariables({ type: 'chat' })) || {}; } catch (e) { return {}; } }
            function mxChatSet(obj) {
                try {
                    if (typeof updateVariablesWith === 'function') {
                        updateVariablesWith(function (v) {
                            if (obj && typeof obj === 'object') { Object.keys(obj).forEach(function (k) { v[k] = obj[k]; }); }
                            return v;
                        }, { type: 'chat' });
                    } else if (typeof insertOrAssignVariables === 'function') { insertOrAssignVariables(obj, { type: 'chat' }); }
                } catch (e) { console.error('[mx-mall2] chat var 写入失败', e); }
            }
            function mxChatSnap() {
                try {
                    var full = (typeof getVariables === 'function') ? (getVariables({ type: 'chat' }) || {}) : {};
                    var snap = {}; Object.keys(full).forEach(function (k) { snap[k] = mxClone(full[k], full[k]); });
                    return snap;
                } catch (e) { return {}; }
            }
            function mxChatRestore(snap) {
                try {
                    if (typeof replaceVariables === 'function') { replaceVariables(snap || {}, { type: 'chat' }); return; }
                    if (typeof updateVariablesWith === 'function') {
                        updateVariablesWith(function (v) {
                            var s = snap || {};
                            Object.keys(v).forEach(function (k) { if (!(k in s)) delete v[k]; });
                            Object.keys(s).forEach(function (k) { v[k] = s[k]; });
                            return v;
                        }, { type: 'chat' });
                    }
                }
                catch (e) { console.error('[mx-mall2] chat var 还原失败', e); }
            }
            async function mxSaveStatData(sd, msgId) {
                if (msgId === null || msgId === undefined) return;
                try {
                    if (typeof updateVariablesWith === 'function') {
                        await updateVariablesWith(function (v) {
                            var cur = (v && v.stat_data) || null;
                            if (cur && cur !== sd) {
                                Object.keys(sd).forEach(function (k) { cur[k] = sd[k]; });
                            } else if (v) { v.stat_data = sd; }
                            return v;
                        }, { type: 'message', message_id: msgId });
                    } else if (typeof insertOrAssignVariables === 'function') {
                        await insertOrAssignVariables({ stat_data: sd }, { type: 'message', message_id: msgId });
                    }
                } catch (e) { console.error('[mx-mall2] stat_data 写入失败', e); }
            }
            function mxHash(str) { var h = 5381, i; str = String(str); for (i = 0; i < str.length; i++) { h = ((h << 5) + h + str.charCodeAt(i)) >>> 0; } return h; }
            function mxRng(seed) { var a = (Number(seed) >>> 0) || 1; return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
            function mxNum2(v, d) { var n = typeof v === 'number' ? v : parseFloat(v); return isFinite(n) ? n : d; }
            function mx2Toastr(msg) { try { if (typeof toastr !== 'undefined') toastr.success(msg); } catch (e) {} }

            /* 直接从消息变量读取 stat_data（避免 getStatData 读取缓存的旧楼层导致卖出刷积分） */
            function mxFreshStatData() {
                try {
                    var mid = mx2SafeId();
                    if (mid !== null && typeof getVariables === 'function') {
                        var v = getVariables({ type: 'message', message_id: mid });
                        if (v && v.stat_data) {
                            if (typeof window !== 'undefined') { window.__mxPseudoState = window.__mxPseudoState || {}; window.__mxPseudoState.statData = v.stat_data; window.__mxPseudoState.messageId = mid; }
                            return v.stat_data;
                        }
                    }
                } catch (e) {}
                return (typeof getStatData === 'function') ? getStatData() : null;
            }

            /* ---------- VIP 声望 ---------- */
            function mxVipInfo() {
                var v = mxChatGet()._mxVip;
                var spent = (v && typeof v === 'object') ? mxNum2(v.spent, 0) : 0;
                var lv = 0;
                for (var i = 0; i < MX2.vipTh.length; i++) { if (spent >= MX2.vipTh[i]) lv = i; }
                return {
                    spent: spent, level: lv, name: 'LV' + lv,
                    nextAt: (lv < MX2.vipTh.length - 1) ? MX2.vipTh[lv + 1] : null,
                    cut: MX2.vipCut[lv], spins: MX2.vipSpins[lv], bmSlots: MX2.vipBmSlots[lv]
                };
            }
            function mxVipDiscountMul() { return mxVipInfo().cut; }
            function mxVipAddSpent(n) {
                if (!isFinite(n) || n === 0) return;
                var before = mxVipInfo().level;
                var v = mxChatGet()._mxVip;
                v = (v && typeof v === 'object') ? v : { spent: 0 };
                v.spent = +(mxNum2(v.spent, 0) + n).toFixed(2);
                mxChatSet({ _mxVip: v });
                var after = mxVipInfo().level;
                if (after > before) { mxVipGrantGift(after); }
            }
            async function mxVipGrantGift(newLv) {
                try {
                    var msgId = mx2SafeId(); if (msgId === null) return;
                    var vars = getVariables({ type: 'message', message_id: msgId });
                    var sd = vars && vars.stat_data;
                    if (!sd || !sd['背包与商城']) return;
                    mxSessionBegin(sd, msgId);
                    var bal = parsePrice(mxGetBalance(sd));
                    mxSetBalance(sd, +((isFinite(bal) ? bal : 0) + 400 * newLv).toFixed(2));
                    mxBagAddShards(sd, 4 * newLv);
                    await mxSaveStatData(sd, msgId);
                    mx2Toastr('VIP 升级！LV' + newLv + ' 礼包已发放：积分 +' + (400 * newLv) + '，神秘碎片 +' + (4 * newLv));
                } catch (e) { console.error('[mx-mall2] VIP礼包失败', e); }
            }

            /* ---------- 前端定价 ---------- */
            function mxAvgDamage(v) {
                var s = String(v === null || v === undefined ? '' : v).trim(); if (!s) return 0;
                var total = 0, found = false, m;
                var re = /(\d*)d(\d+)/gi;
                while ((m = re.exec(s)) !== null) { total += (parseInt(m[1], 10) || 1) * ((parseInt(m[2], 10) || 0) + 1) / 2; found = true; }
                var rest = s.replace(re, '').match(/-?\d+(?:\.\d+)?/);
                if (rest) { total += parseFloat(rest[0]); found = true; }
                return found ? Math.round(total) : 0;
            }
            function mxQualityLv(info) {
                var t = String(getValue(info, '品质', '')) + ' ' + String(getValue(info, '类型', ''));
                if (/传说|橙|金/.test(t)) return 5; if (/史诗|紫/.test(t)) return 4; if (/稀有|蓝/.test(t)) return 3; if (/优秀|绿/.test(t)) return 2; return 1;
            }
            function mxCountEffects(o) { return (o && typeof o === 'object') ? Object.keys(o).length : (o ? 1 : 0); }
            function mxQualityLabel(lv) { return ['', '普通', '优秀', '稀有', '史诗', '传说'][lv] || '普通'; }
            function mxQualityColor(lv) { return ['', '#9A94A8', '#5B9A8B', '#3B82F6', '#8B5CF6', '#F59E0B'][lv] || '#9A94A8'; }
            function mxQualityBadge(info) {
                var lv = (typeof info === 'number') ? info : mxQualityLv(info);
                if (lv < 2) return '';
                return '<span class="mxs-badge q-lv' + lv + '">' + mxQualityLabel(lv) + '</span>';
            }
            function mxQualityOfCodex(entry, kind) {
                var data = (entry && entry.data) || entry || {};
                var lv = mxQualityLv(data);
                if (lv > 1) return lv;
                var p = (typeof mxCodexPrice === 'function') ? mxCodexPrice(kind, data, '') : mxCalcPrice(kind, data);
                if (p >= 15000) return 5;
                if (p >= 5000) return 4;
                if (p >= 2000) return 3;
                if (p >= 800) return 2;
                return 1;
            }
            function mxChannelOf(info) {
                if (!info || typeof info !== 'object') return '';
                var ch = String(getValue(info, '渠道', '') || '').trim();
                if (ch && MX2.channels) {
                    var hit = Object.keys(MX2.channels).filter(function (k) { return MX2.channels[k] === ch || k === ch; });
                    if (hit.length) return hit[0];
                }
                return ch ? ch.toLowerCase() : '';
            }
            function mxCalcPrice(kind, info) {
                if (!info) return 100;
                var p = parsePrice(getValue(info, '价格', NaN));
                if (isFinite(p) && p > 0) return Math.round(p);
                if (kind === 'equip') {
                    var eq = getValue(info, '装备数据', null) || info;
                    return Math.round(200 + mxNum2(getRaw(eq, '护甲', 0), 0) * 30 + mxAvgDamage(getRaw(eq, '伤害', '')) * 20 + mxCountEffects(getRaw(eq, '特殊效果', null)) * 150);
                }
                if (kind === 'skill') {
                    return Math.round(150 + mxNum2(getRaw(info, 'AP消耗', getRaw(info, 'apCost', 2)), 2) * 50 + mxNum2(getRaw(info, '冷却', 0), 0) * 30 + mxCountEffects(getRaw(info, '特殊效果', null)) * 120);
                }
                if (kind === 'item') { return Math.round(80 * [0, 1, 1.5, 2.5, 4, 7][mxQualityLv(info)]); }
                return 100;
            }
            /* 敌方科技定价：data 为图鉴条目的 data 字段（enemy: {hp, attrs}；其余为卡面） */
            function mxCodexPrice(kind, data, name) {
                if (kind === 'enemy') {
                    var a = (data && data.attrs) || {}; var sum = 0;
                    ['力量', '敏捷', '体质', '智力', '精神', '魅力'].forEach(function (k) { sum += mxNum2(a[k], 10); });
                    return Math.max(50, Math.round(sum * 3 + mxNum2(data && data.hp, 30)));
                }
                var p = mxCalcPrice(kind, data || {});
                var mult = 2 + (mxHash(String(name || '') + kind) % 9);
                return Math.max(50, Math.round(p * mult));
            }
            function mxCodexEnemyPower(data) {
                var a = (data && data.attrs) || {}; var sum = 0;
                ['力量', '敏捷', '体质', '智力', '精神', '魅力'].forEach(function (k) { sum += mxNum2(a[k], 10); });
                return Math.round(sum + mxNum2(data && data.hp, 30) * 0.5);
            }

            /* ---------- 背包 / 技能 读写（仅既有 MVU 路径） ---------- */
            function mxBagList(sd) {
                var sec = sd['背包与商城']; var b = sec['背包'] || (sec['背包'] = {});
                var l = b['物品列表']; if (!l || typeof l !== 'object') l = b['物品列表'] = {};
                return l;
            }
            function mxBagAddItem(sd, name, info, qty) {
                var l = mxBagList(sd); var prev = l[name];
                if (prev && typeof prev === 'object') { var q = parseInt(prev['数量'], 10); prev['数量'] = (isNaN(q) ? 0 : q) + (qty || 1); }
                else if (prev === undefined) {
                    var c = mxClone(info || {}, {});
                    if (!c['类型']) c['类型'] = '道具';
                    c['数量'] = qty || 1; l[name] = c;
                }
                try { mxSyncCapUsed(sd['背包与商城']['背包']); } catch (e) {}
            }
            function mxBagTakeItem(sd, name, qty) {
                var l = mxBagList(sd); var it = l[name]; if (!it) return 0;
                var take = qty || 1;
                if (it && typeof it === 'object') {
                    var q = parseInt(it['数量'], 10); q = isNaN(q) ? 1 : q;
                    if (q > take) { it['数量'] = q - take; } else { take = q; delete l[name]; }
                } else { take = 1; delete l[name]; }
                try { mxSyncCapUsed(sd['背包与商城']['背包']); } catch (e) {}
                return take;
            }
            function mxBagAddShards(sd, n) { if (!(n > 0)) return; mxBagAddItem(sd, MX2_SHARD, { '类型': '道具·材料', '描述': '矩阵回收凝成的结晶，可在回收分解台合成奖励' }, n); }
            function mxShardCount(d) {
                var it = getRaw(d, '背包与商城.背包.物品列表.' + MX2_SHARD, null);
                if (!it) return 0;
                if (typeof it !== 'object') return 1;
                var q = parseInt(getValue(it, '数量', 0), 10); return isNaN(q) ? 1 : q;
            }
            function mxSkillList(sd) {
                var p = sd['个人档案'] || (sd['个人档案'] = {});
                var s = p['强化与技能'] || (p['强化与技能'] = {});
                var l = s['技能列表']; if (!l || typeof l !== 'object') l = s['技能列表'] = {};
                return l;
            }
            function mxEquipList(sd) {
                var p = sd['个人档案'] || (sd['个人档案'] = {});
                var s = p['强化与技能'] || (p['强化与技能'] = {});
                var l = s['装备列表']; if (!l || typeof l !== 'object') l = s['装备列表'] = {};
                return l;
            }
            function mxEquipBonus(sd) {
                var dp = sd['个人档案'] || (sd['个人档案'] = {});
                var da = dp['衍生属性'] || (dp['衍生属性'] = {});
                var eb = da['装备加成'];
                if (!eb || typeof eb !== 'object') eb = da['装备加成'] = {};
                if (typeof eb['物理防御'] !== 'number') eb['物理防御'] = 0;
                if (typeof eb['神秘防御'] !== 'number') eb['神秘防御'] = 0;
                if (typeof eb['暴击率'] !== 'number') eb['暴击率'] = 0;
                if (typeof eb['移动速度'] !== 'number') eb['移动速度'] = 0;
                return eb;
            }
            function mxRecalcEquipBonus(sd) {
                try {
                    var eb = mxEquipBonus(sd);
                    eb['物理防御'] = 0; eb['神秘防御'] = 0; eb['暴击率'] = 0; eb['移动速度'] = 0;
                    var eqList = mxEquipList(sd);
                    var items = getRaw(sd, '背包与商城.背包.物品列表', {}) || {};
                    Object.keys(eqList).forEach(function (slot) {
                        var nm = eqList[slot]; if (!nm) return;
                        var it = items[nm]; if (!it || typeof it !== 'object') return;
                        var eq = getValue(it, '装备数据', null);
                        if (!eq || typeof eq !== 'object') return;
                        var armor = mxNum2(getValue(eq, '护甲', 0), 0);
                        if (armor > 0) {
                            var dt = String(getValue(eq, '伤害类型', '') || '');
                            if (dt === '魔法' || dt === '真实' || dt === '法术') eb['神秘防御'] += armor;
                            else eb['物理防御'] += armor;
                        }
                        var eff = getValue(eq, '特殊效果', null);
                        var boost = (eff && typeof eff === 'object') ? String(eff['属性提升'] || eff['属性'] || '') : '';
                        if (boost) {
                            var ms = boost.match(/(力量|敏捷|体质|智力|精神|魅力)\s*[+＋]\s*(\d+(?:\.\d+)?)/g) || [];
                            ms.forEach(function (seg) {
                                var mm = seg.match(/(力量|敏捷|体质|智力|精神|魅力)\s*[+＋]\s*(\d+(?:\.\d+)?)/);
                                if (!mm) return;
                                var attr = mm[1], val = parseFloat(mm[2]) || 0;
                                if (attr === '体质') eb['物理防御'] += Math.floor(val / 2);
                                else if (attr === '精神') eb['神秘防御'] += Math.floor(val / 2);
                                else if (attr === '敏捷') { eb['暴击率'] += val; eb['移动速度'] += Math.floor(val / 5); }
                            });
                        }
                    });
                    if (eb['暴击率'] > 100) eb['暴击率'] = 100;
                    if (eb['暴击率'] < 0) eb['暴击率'] = 0;
                } catch (e) { console.error('[mx-equip] 重算装备加成失败', e); }
            }
            function mxIsEquipped(d, name) {
                var el = getRaw(d, '个人档案.强化与技能.装备列表', null);
                if (el && typeof el === 'object') {
                    var hit = false;
                    Object.keys(el).forEach(function (k) { if (String(el[k] || '') === String(name)) hit = true; });
                    if (hit) return true;
                }
                var q = getRaw(d, '背包与商城.背包.快捷栏', null);
                if (q && typeof q === 'object') {
                    var hit2 = false;
                    Object.keys(q).forEach(function (k) { if (String(q[k] || '') === String(name)) hit2 = true; });
                    return hit2;
                }
                return false;
            }
            function mxBagHasVoucher(d) {
                var it = getRaw(d, '背包与商城.背包.物品列表.' + MX2_VOUCHER, null);
                if (!it) return false;
                if (typeof it !== 'object') return true;
                return mxNum2(getValue(it, '数量', 1), 1) > 0;
            }

            /* ---------- 统一交易核心：串行队列 + 余额校验 -> 本楼快照 -> 变更验证 -> MVU 直写 -> 记录/通知 ---------- */
            var __mx2DealQ = Promise.resolve();
            function mxDeal(o) {
                var run = __mx2DealQ.then(function () { return mxDealCore(o); });
                __mx2DealQ = run.then(function () {}, function () {});
                return run;
            }
            async function mxDealCore(o) {
                var viaInput = function (note) { mxViaInput(o.fill, note, o.fallbackNote || '未检测到 MVU 数据，指令已填入输入框'); };
                try {
                    var msgId = mx2SafeId();
                    if (msgId === null) { viaInput(); return false; }
                    var vars = getVariables({ type: 'message', message_id: msgId });
                    var sd = vars && vars.stat_data;
                    if (!sd || !sd['背包与商城']) { viaInput(); return false; }
                    var bal = parsePrice(mxGetBalance(sd));
                    var spend = Math.max(0, +(o.spend || 0).toFixed(2));
                    if (o.vipCut) spend = Math.round(spend * mxVipDiscountMul() * 100) / 100;
                    if (spend > 0 && isFinite(bal) && bal < spend) {
                        mxShopNote('积分余额不足（需 ' + spend + '，当前 ' + (isFinite(bal) ? bal : '?') + '）', 'warn');
                        return false;
                    }
                    mxSessionBegin(sd, msgId);
                    if (spend > 0 && isFinite(bal)) mxSetBalance(sd, Math.max(0, +(bal - spend).toFixed(2)));
                    if (o.apply) { var r = o.apply(sd); if (r && typeof r.then === 'function') { await r; } }
                    if (o.earn > 0) {
                        var b2 = parsePrice(mxGetBalance(sd));
                        mxSetBalance(sd, +((isFinite(b2) ? b2 : 0) + o.earn).toFixed(2));
                    }
                    await mxSaveStatData(sd, msgId);
                    try { if (typeof window !== 'undefined') { window.__mxPseudoState = window.__mxPseudoState || {}; window.__mxPseudoState.statData = sd; window.__mxPseudoState.messageId = msgId; } } catch (e5) {}
                    var ses = shopState.session;
                    if (ses) {
                        if (spend > 0) { ses.items[o.label] = (ses.items[o.label] || 0) + 1; ses.cost = +((ses.cost || 0) + spend).toFixed(2); }
                        else if (o.earn > 0) { var k2 = '[收入]' + o.label; ses.items[k2] = (ses.items[k2] || 0) + 1; }
                    }
                    if (spend > 0) mxVipAddSpent(spend);
                    if (o.record !== false) mxShopPushRecord(o.label, spend > 0 ? spend : (o.earn > 0 ? -o.earn : null));
                    if (o.chat) {
                        var cv = mxChatGet();
                        var obj = cv[o.chat.key];
                        if (!obj || typeof obj !== 'object') { obj = (o.chat.def && mxClone(o.chat.def, null)) || {}; }
                        o.chat.mutate(obj);
                        var w = {}; w[o.chat.key] = obj; mxChatSet(w);
                    }
                    if (o.noteOk) mxShopNote(typeof o.noteOk === 'function' ? o.noteOk() : o.noteOk, 'ok');
                    if (o.fill && typeof nebFill === 'function') {
                        try {
                            var sesF = shopState.session;
                            if (sesF) { sesF.fillLog = sesF.fillLog || []; sesF.fillLog.push(o.fill); }
                            var fLog = (sesF && sesF.fillLog) || [o.fill];
                            nebFill('【矩阵结算】\n' + fLog.join('\n'));
                        } catch (e2) {}
                    }
                    if (typeof window !== 'undefined' && typeof window.__mxRefreshPseudo === 'function') { try { window.__mxRefreshPseudo(); } catch (e3) {} }
                    return true;
                } catch (err) {
                    console.error('[mx-mall2] 交易失败:', err);
                    mxShopNote('操作失败：' + ((err && err.message) || err) + '，可改用输入框指令', 'warn');
                    return false;
                }
            }

/* ===== 商城拓展 II · B：敌方图鉴 / 敌方科技购买 / 销赃卖出 / 黑市 / 幸运轮盘 ===== */

            /* ---------- 敌方图鉴 ---------- */
            function mxCodexGet() { return MX_CODEX; }
            function mxCodexLoad() {
                try {
                    var c = mxChatGet()._mxEnemyCodex;
                    if (c && typeof c === 'object') {
                        ['enemies', 'skills', 'equips', 'items'].forEach(function (k) { if (c[k] && typeof c[k] === 'object') MX_CODEX[k] = c[k]; });
                        MX_CODEX._bkey = c._bkey || null;
                        MX_CODEX._bFloor = mxNum2(c._bFloor, -999);
                    }
                } catch (e) {}
            }
            var __mxCodexDirty = false, __mxCodexTimer = null;
            function mxCodexPersist(force) {
                if (!__mxCodexDirty && !force) return;
                try { mxChatSet({ _mxEnemyCodex: MX_CODEX }); __mxCodexDirty = false; } catch (e) {}
            }
            function mxCodexPersistSoon() {
                __mxCodexDirty = true;
                if (__mxCodexTimer) return;
                __mxCodexTimer = setTimeout(function () { __mxCodexTimer = null; mxCodexPersist(false); }, 8000);
            }
            function mxCodexPrune(kind) {
                var store = MX_CODEX[kind], keys = Object.keys(store);
                if (keys.length <= MX2.caps[kind]) return;
                keys.sort(function (a, b) { return mxNum2(store[a].last, 0) - mxNum2(store[b].last, 0); });
                while (Object.keys(store).length > MX2.caps[kind]) { delete store[keys.shift()]; }
            }
            function mxCodexAdd(kind, name, data, floor) {
                if (!name) return;
                var store = MX_CODEX[kind]; var e = store[name];
                if (!e) { e = store[name] = { data: data, first: floor, last: floor, count: 0 }; mxCodexPrune(kind); }
                e.count++; e.last = Math.max(mxNum2(e.last, 0), floor); e.data = data;
                __mxCodexDirty = true;
            }
            function mxCodexClone(raw) {
                if (!raw || typeof raw !== 'object' || !Object.keys(raw).length) return null;
                return mxClone(raw, null);
            }
            function mxCodexParseText(txt, floor) {
                var m;
                var re6 = /<enemy_spawn>\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^<]*?)\s*<\/enemy_spawn>/gi;
                while ((m = re6.exec(txt)) !== null) {
                    mxCodexAdd('enemies', m[1].trim(), { hp: parseInt(m[2], 10) || 30, attrs: { '力量': +m[3], '敏捷': +m[4], '体质': +m[5], '智力': +m[6], '精神': +m[7], '魅力': +m[8] } }, floor);
                }
                var re4 = /<enemy_spawn>\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|<]*?)\s*<\/enemy_spawn>/gi;
                while ((m = re4.exec(txt)) !== null) {
                    mxCodexAdd('enemies', m[1].trim(), { hp: parseInt(m[2], 10) || 30, attrs: { '力量': +m[3], '敏捷': +m[4], '体质': +m[5], '智力': 8, '精神': 8, '魅力': 8 } }, floor);
                }
                var re2 = /<enemy_spawn>\s*([^|]+?)\s*\|\s*([^|<]+?)\s*<\/enemy_spawn>/gi;
                while ((m = re2.exec(txt)) !== null) {
                    mxCodexAdd('enemies', m[1].trim(), { hp: parseInt(m[2], 10) || 30, attrs: { '力量': 12, '敏捷': 14, '体质': 10, '智力': 8, '精神': 8, '魅力': 8 } }, floor);
                }
                var res = /<skill_register>\s*([\s\S]*?)\s*<\/skill_register>/gi, mm;
                while ((mm = res.exec(txt)) !== null) {
                    var arr = null;
                    try { arr = JSON.parse(mm[1].trim()); } catch (e) { arr = null; }
                    if (arr && typeof arr === 'object') {
                        (Array.isArray(arr) ? arr : [arr]).forEach(function (s) {
                            var c = mxCodexClone(s);
                            if (c && c.name) mxCodexAdd('skills', String(c.name), c, floor);
                        });
                    }
                }
                mxCodexParsePipeTag(txt, 'enemy_skills', floor, 'skills',
                    function (p) { return { name: p[0], 'AP消耗': p[1], '伤害类型': p[2], '伤害': p[3], '范围': p[4], '冷却': p[5], '描述': p.slice(6).join('|') }; });
                mxCodexParsePipeTag(txt, 'enemy_equipment', floor, 'equips',
                    function (p) { return { name: p[0], '槽位': p[1], '伤害': p[2], '护甲': p[3], '伤害类型': p[4], '描述': p.slice(5).join('|') }; });
            }
            function mxCodexParsePipeTag(txt, tag, floor, kind, rowFn) {
                var re = new RegExp('<' + tag + '>\\s*([\\s\\S]*?)\\s*</' + tag + '>', 'gi'), mm;
                while ((mm = re.exec(txt)) !== null) {
                    var body = mm[1].trim(), parsed = false;
                    try {
                        var j = JSON.parse(body);
                        if (j && typeof j === 'object') {
                            (Array.isArray(j) ? j : [j]).forEach(function (s) {
                                var c = mxCodexClone(s);
                                if (c && c.name) { mxCodexAdd(kind, String(c.name), c, floor); parsed = true; }
                            });
                        }
                    } catch (e) {}
                    if (parsed) continue;
                    body.split(/\r?\n/).forEach(function (line) {
                        var p = line.split('|').map(function (x) { return x.trim(); });
                        if (p.length >= 3 && p[0]) {
                            var row = rowFn(p); mxCodexAdd(kind, row.name, row, floor);
                        }
                    });
                }
            }
            function mxCodexMergeCombat(floor) {
                var snap = mxCombatSnapshot();
                if (!snap.present || !snap.enemies || !snap.enemies.length) return;
                var isNew = MX_CODEX._bkey !== snap.key;
                snap.enemies.forEach(function (en) {
                    var store = MX_CODEX.enemies; var e = store[en.name];
                    var data = { hp: en.hp, attrs: en.attrs };
                    if (!e) { store[en.name] = { data: data, first: floor, last: floor, count: 1 }; mxCodexPrune('enemies'); __mxCodexDirty = true; }
                    else { if (isNew) e.count++; e.last = Math.max(mxNum2(e.last, 0), floor); e.data = data; __mxCodexDirty = true; }
                    (en.skills || []).forEach(function (sk) {
                        var c = mxCodexClone(sk);
                        if (c && c.name) mxCodexAdd('skills', String(c.name), c, floor);
                    });
                });
                if (isNew) { MX_CODEX._bkey = snap.key; MX_CODEX._bFloor = floor; __mxCodexDirty = true; }
            }
            function mxCodexScan(lid) {
                try {
                    var from = Math.max(0, lid - 14);
                    var msgs = (typeof getChatMessages === 'function') ? getChatMessages(from + '-' + lid) : [];
                    (msgs || []).forEach(function (msg) {
                        var mid = (msg && msg.message_id != null) ? msg.message_id : from;
                        var txt = String((msg && (msg.message || msg.mes)) || '');
                        if (txt.indexOf('<enemy_spawn') >= 0 || txt.indexOf('<skill_register') >= 0 || txt.indexOf('<enemy_skills') >= 0 || txt.indexOf('<enemy_equipment') >= 0) {
                            mxCodexParseText(txt, mid);
                        }
                    });
                    mxCodexMergeCombat(lid);
                    mxCodexPersistSoon();
                } catch (e) { console.error('[mx-mall2] 图鉴扫描失败', e); }
            }

            /* ---------- MVU 写入模板（敌方科技 -> 既有结构，战斗引擎立即可读） ---------- */
            function mxToMvuSkill(card) {
                var c = { '动作类型': '主动' };
                ['AP消耗', '伤害类型', '伤害', '特殊效果', '范围', '持续时间', '冷却', '能量消耗', '学习难度', '等级', '描述'].forEach(function (k) { if (card && card[k] !== undefined && card[k] !== '') c[k] = card[k]; });
                if (card && card.apCost !== undefined && c['AP消耗'] === undefined) c['AP消耗'] = card.apCost;
                if (card && card.desc !== undefined && !c['描述']) c['描述'] = card.desc;
                if (!c['描述']) c['描述'] = '逆向工程自敌方科技的技能';
                if (!c['等级']) c['等级'] = 'Lv.1';
                return c;
            }
            function mxToMvuEquip(card) {
                card = card || {};
                var eq = {};
                ['槽位', '伤害', '护甲', '伤害类型', '特殊效果', '范围', '冷却', '能量消耗', '装备要求'].forEach(function (k) { if (card[k] !== undefined && card[k] !== '') eq[k] = card[k]; });
                if (!eq['槽位']) eq['槽位'] = '武器';
                return { '类型': '装备·' + String(eq['槽位'] || '武器'), '描述': card['描述'] || '逆向工程自敌方科技的装备', '装备数据': eq };
            }
            function mxCodexOwned(d, kind, name) {
                if (kind === 'skill') { var sl = getRaw(d, '个人档案.强化与技能.技能列表', null); return !!(sl && sl[name]); }
                if (kind === 'enemy') { var bl = getRaw(d, '背包与商城.背包.物品列表', null); return !!(bl && bl[name + '的情报']); }
                var l = getRaw(d, '背包与商城.背包.物品列表', null); return !!(l && l[name]);
            }
            function mxPickCodex(kindKey, rng) {
                var names = Object.keys(MX_CODEX[kindKey] || {});
                if (!names.length) return null;
                names.sort();
                return names[Math.floor((rng ? rng() : Math.random()) * names.length)];
            }

            /* ---------- 敌方科技购买 ---------- */
            async function mxEnemyBuy(kind, name, opt) {
                opt = opt || {};
                var keyMap = { skill: 'skills', equip: 'equips', item: 'items', enemy: 'enemies' };
                var entry = (MX_CODEX[keyMap[kind]] || {})[name];
                if (!entry) { mxShopNote('图鉴中未找到「' + name + '」', 'warn'); return false; }
                var d = mxFreshStatData();
                if (d && mxCodexOwned(d, kind, name)) { mxShopNote('已持有「' + name + '」，无需重复购买', 'warn'); return false; }
                var price = mxCodexPrice(kind, entry.data, name);
                if (opt.discount) price = Math.round(price * opt.discount);
                var useVoucher = !!(opt.voucher && d && mxBagHasVoucher(d));
                if (useVoucher) price = Math.round(price * 0.8);
                var card = entry.data;
                return await mxDeal({
                    spend: price, vipCut: opt.vip !== false, label: (opt.labelPrefix || '敌方科技·') + name,
                    fill: (opt.fillPrefix || '购买敌方科技：') + name,
                    apply: function (sd) {
                        if (useVoucher) mxBagTakeItem(sd, MX2_VOUCHER, 1);
                        if (kind === 'skill') {
                            var sl = mxSkillList(sd);
                            if (sl[name]) throw new Error('已持有该技能');
                            sl[name] = mxToMvuSkill(card);
                        } else if (kind === 'equip') {
                            mxBagAddItem(sd, name, mxToMvuEquip(card), 1);
                        } else if (kind === 'item') {
                            mxBagAddItem(sd, name, { '类型': card['类型'] || '道具', '描述': card['描述'] || card['使用效果'] || '图鉴收录的敌方道具', '使用效果': card['使用效果'] || '' }, 1);
                        } else {
                            var a = card.attrs || {}; var sum = 0;
                            ['力量', '敏捷', '体质', '智力', '精神', '魅力'].forEach(function (k) { sum += mxNum2(a[k], 10); });
                            mxBagAddItem(sd, name + '的情报', { '类型': '道具·情报', '描述': '敌方式档案：HP ' + mxNum2(card.hp, 30) + ' / 六维合计 ' + sum + '。累计遭遇 ' + mxNum2(entry.count, 1) + ' 次' }, 1);
                        }
                    },
                    noteOk: '已购得「' + (kind === 'enemy' ? name + '的情报' : name) + '」' + (price > 0 ? '（积分 -' + price + '）' : '') + (useVoucher ? '（已核销黑市折扣券）' : '')
                });
            }

            /* ---------- 卖出（黑市销赃 / 技能回购） ---------- */
            function mxSellPrice(kind, info) {
                return Math.max(10, Math.round(mxCalcPrice(kind, info) * (kind === 'skill' ? MX2.sellSkill : MX2.sellEquip)));
            }
            async function mxSellItem(name) {
                var d = mxFreshStatData();
                if (!d) { mxShopNote('未检测到 MVU 数据', 'warn'); return false; }
                var it = getRaw(d, '背包与商城.背包.物品列表.' + name, null);
                if (!it) { mxShopNote('背包中没有「' + name + '」', 'warn'); return false; }
                if (name === MX2_SHARD) { mxShopNote('神秘碎片请前往回收分解台合成使用', 'warn'); return false; }
                if (mxIsEquipped(d, name)) { mxShopNote('「' + name + '」正装备，请先卸下', 'warn'); return false; }
                var kind = (it && typeof it === 'object' && getValue(it, '装备数据', null)) ? 'equip' : 'item';
                var gain = mxSellPrice(kind, it);
                var infoClone = (it && typeof it === 'object') ? mxClone(it, { '描述': String(it) }) : { '描述': String(it) };
                return await mxDeal({
                    earn: gain, label: '销赃·' + name, fill: '卖出 ' + name,
                    apply: function (sd) {
                        if (mxBagTakeItem(sd, name, 1) < 1) throw new Error('物品已不在背包');
                        var ses = shopState.session;
                        if (ses) { ses.sellLog = ses.sellLog || []; ses.sellLog.push({ kind: kind, name: name, info: infoClone, price: gain, qty: 1 }); }
                    },
                    noteOk: '已卖出「' + name + '」（积分 +' + gain + '，物品已从背包扣除，可在下方回购）'
                });
            }
            async function mxSellSkill(name) {
                var d = mxFreshStatData();
                if (!d) { mxShopNote('未检测到 MVU 数据', 'warn'); return false; }
                var sk = getRaw(d, '个人档案.强化与技能.技能列表.' + name, null);
                if (!sk) { mxShopNote('你没有技能「' + name + '」', 'warn'); return false; }
                var gain = mxSellPrice('skill', sk);
                var skClone = (sk && typeof sk === 'object') ? mxClone(sk, {}) : {};
                return await mxDeal({
                    earn: gain, label: '技能出售·' + name, fill: '卖出技能 ' + name,
                    apply: function (sd) {
                        var sl = mxSkillList(sd); if (!sl[name]) throw new Error('技能已不存在'); delete sl[name];
                        var ses = shopState.session;
                        if (ses) { ses.sellLog = ses.sellLog || []; ses.sellLog.push({ kind: 'skill', name: name, info: skClone, price: gain, qty: 1 }); }
                    },
                    noteOk: '已卖出技能「' + name + '」（积分 +' + gain + '，技能已从技能列表扣除，可在下方回购）'
                });
            }

            /* ---------- 回购（买回本楼卖出的物品/技能/装备） ---------- */
            async function mxBuyback(idx) {
                var ses = shopState.session;
                if (!ses || !ses.sellLog || !ses.sellLog.length) { mxShopNote('没有可回购的记录', 'warn'); return false; }
                var rec = ses.sellLog[idx];
                if (!rec) { mxShopNote('回购记录不存在', 'warn'); return false; }
                var recName = rec.name, recKind = rec.kind, recPrice = rec.price, recInfo = rec.info, recQty = rec.qty || 1;
                var d = mxFreshStatData();
                if (!d) { mxShopNote('未检测到 MVU 数据', 'warn'); return false; }
                var bal = parsePrice(mxGetBalance(d));
                if (isFinite(bal) && bal < recPrice) { mxShopNote('积分余额不足（需 ' + recPrice + '，当前 ' + bal + '），无法回购', 'warn'); return false; }
                return await mxDeal({
                    spend: recPrice, vipCut: false, label: '回购·' + recName, fill: '回购 ' + recName,
                    apply: function (sd) {
                        if (recKind === 'skill') {
                            var sl = mxSkillList(sd); sl[recName] = (recInfo && typeof recInfo === 'object') ? mxClone(recInfo, {}) : {};
                        } else {
                            var infoClone = (recInfo && typeof recInfo === 'object') ? mxClone(recInfo, { '类型': '道具' }) : { '类型': '道具' };
                            mxBagAddItem(sd, recName, infoClone, recQty);
                        }
                        var s2 = shopState.session;
                        if (s2 && s2.sellLog) { var i2 = s2.sellLog.indexOf(rec); if (i2 >= 0) s2.sellLog.splice(i2, 1); }
                    },
                    noteOk: '已回购「' + recName + '」（积分 -' + recPrice + '，已归还背包/技能列表）'
                });
            }

            /* ---------- 黑市 ---------- */
            function mxBlackMarketInfo() {
                var lid = mx2LastFloor();
                var bucket = Math.floor(lid / MX2.bmBucket);
                var vip = mxVipInfo();
                var d = mxFreshStatData();
                var goods = (d && getRaw(d, '背包与商城.商城.商品列表', {})) || {};
                var total = 0;
                Object.keys(goods).forEach(function (n) { if (mxChannelOf(goods[n]) === 'black') total++; });
                var codexTotal = Object.keys(MX_CODEX.enemies).length + Object.keys(MX_CODEX.skills).length + Object.keys(MX_CODEX.equips).length + Object.keys(MX_CODEX.items).length;
                var recentBattle = (lid - mxNum2(MX_CODEX._bFloor, -999)) <= MX2.bmBucket;
                var open = recentBattle || codexTotal >= 5;
                var pool = [];
                Object.keys(goods).forEach(function (n) {
                    var info = goods[n];
                    var ch = mxChannelOf(info);
                    if (ch !== 'black') return;
                    var p = parsePrice(getValue(info, '价格', NaN));
                    if (isFinite(p) && p > 0) pool.push({ name: n, base: p, info: info });
                });
                var rng = mxRng(mxHash('mx-black-' + bucket));
                for (var i = pool.length - 1; i > 0; i--) { var j = Math.floor(rng() * (i + 1)); var t = pool[i]; pool[i] = pool[j]; pool[j] = t; }
                var stock = pool.slice(0, vip.bmSlots).map(function (x) {
                    return { name: x.name, base: x.base, price: Math.round(x.base * MX2.bmCut) };
                });
                return { open: open, bucket: bucket, nextFloor: (bucket + 1) * MX2.bmBucket, stock: stock, total: total, lid: lid };
            }
            async function mxBuyBlackMarket(name) {
                var d = mxFreshStatData();
                if (!d) { mxShopNote('未检测到 MVU 数据', 'warn'); return false; }
                var info = mxBlackMarketInfo();
                var item = null; info.stock.forEach(function (x) { if (x.name === name) item = x; });
                if (!item) { mxShopNote('黑市商品已轮换或不存在', 'warn'); return false; }
                var goods = getRaw(d, '背包与商城.商城.商品列表.' + name, null);
                return await mxDeal({
                    spend: item.price, vipCut: true, label: '黑市·' + name,
                    fill: '黑市购入 ' + name,
                    apply: function (sd) { mxBagAddItem(sd, name, (goods && typeof goods === 'object') ? goods : { '类型': '道具' }, 1); },
                    noteOk: '黑市购入：「' + name + '」（积分 -' + item.price + '，' + Math.round(MX2.bmCut * 10) + '折）'
                });
            }

            /* ---------- 幸运轮盘 ---------- */
            var MX2_ROU_PRIZES = [
                { id: 'p100', label: '积分 ×100', w: 28 },
                { id: 'none', label: '谢谢惠顾', w: 22 },
                { id: 'shard2', label: '神秘碎片 ×2', w: 16 },
                { id: 'p200', label: '积分 ×200', w: 12 },
                { id: 'shard5', label: '神秘碎片 ×5', w: 10 },
                { id: 'voucher', label: '黑市折扣券', w: 5 },
                { id: 'cap', label: '背包扩容 +3格', w: 4 },
                { id: 'p800', label: '积分 ×800', w: 2 },
                { id: 'jack', label: '头奖 积分×3000', w: 1 }
            ];
            function mxRouletteInfo() {
                var lid = mx2LastFloor();
                var r = mxChatGet()._mxRoulette;
                if (!r || typeof r !== 'object') r = { floorId: lid, used: 0, bonus: 0, history: [] };
                if (mxNum2(r.floorId, -1) !== lid) { r.floorId = lid; r.used = 0; }
                if (!r.history) r.history = [];
                if (!r.bonus) r.bonus = 0;
                return r;
            }
            function mxRouletteMax() {
                return MX2.rouPer + mxVipInfo().spins + mxNum2(mxRouletteInfo().bonus, 0);
            }
            function mxPickWeighted(table, rng) {
                var sum = 0; table.forEach(function (t) { sum += t.w; });
                var x = (rng ? rng() : Math.random()) * sum;
                for (var i = 0; i < table.length; i++) { x -= table[i].w; if (x < 0) return i; }
                return table.length - 1;
            }
            async function mxRouletteSpin() {
                var info = mxRouletteInfo();
                var maxSpins = mxRouletteMax();
                if (mxNum2(info.used, 0) >= maxSpins) { mxShopNote('本楼轮盘次数已用完（' + maxSpins + ' 次），下一楼刷新', 'warn'); return null; }
                var rng = mxRng(((Date.now() & 0xfffff) ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0);
                var idx = mxPickWeighted(MX2_ROU_PRIZES, rng);
                var prize = MX2_ROU_PRIZES[idx];
                var ok = await mxDeal({
                    spend: MX2.rouCost, vipCut: false, label: '幸运轮盘·' + prize.label, record: false,
                    chat: {
                        key: '_mxRoulette', def: { floorId: mx2LastFloor(), used: 0, bonus: 0, history: [] },
                        mutate: function (obj) {
                            obj.used = mxNum2(obj.used, 0) + 1;
                            if (!obj.history) obj.history = [];
                            obj.history.unshift({ label: prize.label, time: Date.now() });
                            obj.history = obj.history.slice(0, 12);
                        }
                    },
                    apply: function (sd) {
                        if (prize.id === 'p100' || prize.id === 'p200' || prize.id === 'p800' || prize.id === 'jack') {
                            var amt = prize.id === 'p100' ? 100 : (prize.id === 'p200' ? 200 : (prize.id === 'p800' ? 800 : 3000));
                            var b = parsePrice(mxGetBalance(sd));
                            mxSetBalance(sd, +((isFinite(b) ? b : 0) + amt).toFixed(2));
                        } else if (prize.id === 'shard2') { mxBagAddShards(sd, 2); }
                        else if (prize.id === 'shard5') { mxBagAddShards(sd, 5); }
                        else if (prize.id === 'cap') {
                            try {
                                var bagSec = sd['背包与商城']['背包']; var pc = mxParseCap(bagSec['容量']); var cap2 = (pc && isFinite(pc.cap)) ? pc.cap : MX_CAP_INIT;
                                if (cap2 < MX_CAP_MAX) { bagSec['容量'] = mxEstUsed(bagSec) + ' / ' + Math.min(MX_CAP_MAX, cap2 + 3); }
                            } catch (eCap) {}
                        } else if (prize.id === 'voucher') { mxBagAddItem(sd, MX2_VOUCHER, { '类型': '道具·券', '使用效果': '在敌方科技/黑市购买时自动核销，额外8折', '描述': '黑市流通的折扣凭证，前端自动核销' }, 1); }
                    },
                    noteOk: '轮盘结果：' + prize.label + '（积分 -' + MX2.rouCost + '）'
                });
                if (ok) { mx2Toastr('轮盘：' + prize.label); }
                return ok ? { prize: prize, idx: idx } : null;
            }

/* ===== 商城拓展 II · C：回收分解 / 角斗场赌盘 / 悬赏榜 / 闪购 / 拍卖行 / 盲盒 / 轮询结算 ===== */

            /* ---------- 回收分解 / 合成 ---------- */
            function mxRecycleGain(info) {
                var kind = (info && typeof info === 'object' && getValue(info, '装备数据', null)) ? 'equip' : 'item';
                var base = mxCalcPrice(kind, info);
                return { points: Math.max(10, Math.round(base * MX2.recycleCut)), shards: MX2.shardByQ[mxQualityLv(info)] };
            }
            async function mxRecycleItem(name) {
                var d = mxFreshStatData();
                if (!d) { mxShopNote('未检测到 MVU 数据', 'warn'); return false; }
                var it = getRaw(d, '背包与商城.背包.物品列表.' + name, null);
                if (!it) { mxShopNote('背包中没有「' + name + '」', 'warn'); return false; }
                if (name === MX2_SHARD) { mxShopNote('神秘碎片不能分解自己', 'warn'); return false; }
                if (mxIsEquipped(d, name)) { mxShopNote('「' + name + '」正装备，请先卸下', 'warn'); return false; }
                var g = mxRecycleGain(it);
                return await mxDeal({
                    earn: g.points, label: '分解·' + name, fill: '分解 ' + name,
                    apply: function (sd) { if (mxBagTakeItem(sd, name, 1) < 1) throw new Error('物品已不在背包'); mxBagAddShards(sd, g.shards); },
                    noteOk: '已分解「' + name + '」（积分 +' + g.points + '，神秘碎片 +' + g.shards + '）'
                });
            }

            /* ---------- 背包实时操作：使用 / 装备 / 丢弃（直接结算 + 填入输入框由 AI 描述效果） ---------- */
            async function mxBagDiscard(name) {
                var msgId = mx2SafeId();
                if (msgId === null) { mxShopNote('未获取到楼层信息，已填入输入框', 'warn'); nebFill('丢弃 ' + name); return false; }
                try {
                    var vars = getVariables({ type: 'message', message_id: msgId });
                    var sd = vars && vars.stat_data;
                    if (!sd || !sd['背包与商城']) { nebFill('丢弃 ' + name); mxShopNote('未检测到 MVU 数据，已填入输入框', ''); return false; }
                    var it = getRaw(sd, '背包与商城.背包.物品列表.' + name, null);
                    if (!it) { mxShopNote('背包中没有「' + name + '」', 'warn'); return false; }
                    if (mxIsEquipped(sd, name)) { mxShopNote('「' + name + '」正装备，请先卸下', 'warn'); return false; }
                    mxSessionBegin(sd, msgId);
                    mxSessionRecordPatch(sd, '背包与商城.背包.物品列表');
                    var took = mxBagTakeItem(sd, name, 1);
                    if (took < 1) { mxShopNote('物品已不在背包', 'warn'); return false; }
                    await mxSaveStatData(sd, msgId);
                    var ses = shopState.session;
                    if (ses) { var k = '丢弃·' + name; ses.items[k] = (ses.items[k] || 0) + 1; }
                    mxShopNote('已丢弃「' + name + '」（已从背包扣除）', 'ok');
                    nebFill('丢弃 ' + name);
                    if (typeof window.__mxRefreshPseudo === 'function') { try { window.__mxRefreshPseudo(); } catch (e3) {} }
                    return true;
                } catch (err) { console.error('[mx-bag] 丢弃失败:', err); mxShopNote('丢弃失败：' + ((err && err.message) || err), 'warn'); nebFill('丢弃 ' + name); return false; }
            }

            function mxParseUseEffect(info) {
                var eff = String((info && typeof info === 'object') ? (info['使用效果'] || info['效果'] || '') : '');
                if (!eff) return null;
                var hp = 0, ep = 0, hpPct = 0, epPct = 0, resolved = false;
                var m;
                if ((m = eff.match(/恢复\s*(\d+(?:\.\d+)?)\s*%?\s*(?:点)?\s*生命/)) || (m = eff.match(/回血\s*(\d+(?:\.\d+)?)/))) {
                    var val = parseFloat(m[1]) || 0;
                    if (eff.indexOf('%') >= 0 && eff.indexOf('生命') >= 0) hpPct = val; else hp = val;
                    resolved = true;
                }
                if ((m = eff.match(/恢复\s*(\d+(?:\.\d+)?)\s*%?\s*(?:点)?\s*(?:能量|魔力|精神力|怒气)/)) || (m = eff.match(/回能\s*(\d+(?:\.\d+)?)/))) {
                    var val2 = parseFloat(m[1]) || 0;
                    if (eff.indexOf('%') >= 0) epPct = val2; else ep = val2;
                    resolved = true;
                }
                return resolved ? { hp: hp, ep: ep, hpPct: hpPct, epPct: epPct } : null;
            }

            async function mxBagUse(name) {
                var msgId = mx2SafeId();
                if (msgId === null) { nebFill('使用 ' + name); mxShopNote('未获取到楼层信息，已填入输入框', ''); return false; }
                try {
                    var vars = getVariables({ type: 'message', message_id: msgId });
                    var sd = vars && vars.stat_data;
                    if (!sd || !sd['背包与商城']) { nebFill('使用 ' + name); mxShopNote('未检测到 MVU 数据，已填入输入框', ''); return false; }
                    var it = getRaw(sd, '背包与商城.背包.物品列表.' + name, null);
                    if (!it) { mxShopNote('背包中没有「' + name + '」', 'warn'); return false; }
                    if (mxIsEquipped(sd, name)) { mxShopNote('「' + name + '」正装备，请先卸下', 'warn'); return false; }
                    mxSessionBegin(sd, msgId);
                    mxSessionRecordPatch(sd, '背包与商城.背包.物品列表');
                    var effect = mxParseUseEffect(it);
                    if (effect) {
                        mxSessionRecordPatch(sd, '个人档案.衍生属性.生命值.当前');
                        mxSessionRecordPatch(sd, '个人档案.衍生属性.能量值.当前');
                    }
                    var took = mxBagTakeItem(sd, name, 1);
                    if (took < 1) { mxShopNote('物品已不在背包', 'warn'); return false; }
                    var effectText = '';
                    if (effect) {
                        var hpObj = getRaw(sd, '个人档案.衍生属性.生命值', null) || {};
                        var epObj = getRaw(sd, '个人档案.衍生属性.能量值', null) || {};
                        var hpCur = mxNum2(hpObj['当前'], 0), hpMax = mxNum2(hpObj['最大'], 1);
                        var epCur = mxNum2(epObj['当前'], 0), epMax = mxNum2(epObj['最大'], 1);
                        var hpGain = effect.hp + Math.round(hpMax * effect.hpPct / 100);
                        var epGain = effect.ep + Math.round(epMax * effect.epPct / 100);
                        if (hpGain > 0) { hpObj['当前'] = Math.min(hpMax, hpCur + hpGain); effectText += '生命值 +' + hpGain + '（' + hpObj['当前'] + '/' + hpMax + '）'; }
                        if (epGain > 0) { epObj['当前'] = Math.min(epMax, epCur + epGain); effectText += (effectText ? ' ' : '') + '能量 +' + epGain + '（' + epObj['当前'] + '/' + epMax + '）'; }
                    }
                    await mxSaveStatData(sd, msgId);
                    var ses = shopState.session;
                    if (ses) { var k = '使用·' + name; ses.items[k] = (ses.items[k] || 0) + 1; }
                    mxShopNote('已使用「' + name + '」（数量 -1' + (effectText ? '，' + effectText : '，效果由 AI 描述') + '）', 'ok');
                    nebFill('使用 ' + name);
                    if (typeof window.__mxRefreshPseudo === 'function') { try { window.__mxRefreshPseudo(); } catch (e3) {} }
                    return true;
                } catch (err) { console.error('[mx-bag] 使用失败:', err); mxShopNote('使用失败：' + ((err && err.message) || err), 'warn'); nebFill('使用 ' + name); return false; }
            }

            async function mxBagEquip(name) {
                var msgId = mx2SafeId();
                if (msgId === null) { nebFill('装备 ' + name); mxShopNote('未获取到楼层信息，已填入输入框', ''); return false; }
                try {
                    var vars = getVariables({ type: 'message', message_id: msgId });
                    var sd = vars && vars.stat_data;
                    if (!sd || !sd['背包与商城']) { nebFill('装备 ' + name); mxShopNote('未检测到 MVU 数据，已填入输入框', ''); return false; }
                    var it = getRaw(sd, '背包与商城.背包.物品列表.' + name, null);
                    if (!it) { mxShopNote('背包中没有「' + name + '」', 'warn'); return false; }
                    if (mxIsEquipped(sd, name)) { mxShopNote('「' + name + '」已装备', 'warn'); return false; }
                    var eq = (it && typeof it === 'object') ? getValue(it, '装备数据', null) : null;
                    if (!eq) { nebFill('装备 ' + name); mxShopNote('「' + name + '」非装备类物品，已填入输入框由 AI 处理', ''); return true; }
                    var slot = String(getValue(eq, '槽位', '') || '武器').trim() || '武器';
                    mxSessionBegin(sd, msgId);
                    mxSessionRecordPatch(sd, '个人档案.强化与技能.装备列表');
                    mxSessionRecordPatch(sd, '个人档案.衍生属性.装备加成');
                    var eqList = mxEquipList(sd);
                    eqList[slot] = name;
                    mxRecalcEquipBonus(sd);
                    await mxSaveStatData(sd, msgId);
                    var ses = shopState.session;
                    if (ses) { var k = '装备·' + name; ses.items[k] = (ses.items[k] || 0) + 1; }
                    var eb = mxEquipBonus(sd);
                    mxShopNote('已装备「' + name + '」到 ' + slot + ' 槽（装备加成：物防+' + eb['物理防御'] + ' 神防+' + eb['神秘防御'] + ' 暴击+' + eb['暴击率'] + '% 移速+' + eb['移动速度'] + '）', 'ok');
                    nebFill('装备 ' + name);
                    if (typeof window.__mxRefreshPseudo === 'function') { try { window.__mxRefreshPseudo(); } catch (e3) {} }
                    return true;
                } catch (err) { console.error('[mx-bag] 装备失败:', err); mxShopNote('装备失败：' + ((err && err.message) || err), 'warn'); nebFill('装备 ' + name); return false; }
            }

            async function mxBagUnequip(name) {
                var msgId = mx2SafeId();
                if (msgId === null) { nebFill('卸下 ' + name); mxShopNote('未获取到楼层信息，已填入输入框', ''); return false; }
                try {
                    var vars = getVariables({ type: 'message', message_id: msgId });
                    var sd = vars && vars.stat_data;
                    if (!sd || !sd['个人档案']) { nebFill('卸下 ' + name); mxShopNote('未检测到 MVU 数据，已填入输入框', ''); return false; }
                    var eqList = mxEquipList(sd);
                    var slot = null;
                    Object.keys(eqList).forEach(function (s) { if (String(eqList[s] || '') === String(name)) slot = s; });
                    if (!slot) { mxShopNote('「' + name + '」未装备，无需卸下', 'warn'); return false; }
                    mxSessionBegin(sd, msgId);
                    mxSessionRecordPatch(sd, '个人档案.强化与技能.装备列表');
                    mxSessionRecordPatch(sd, '个人档案.衍生属性.装备加成');
                    delete eqList[slot];
                    mxRecalcEquipBonus(sd);
                    await mxSaveStatData(sd, msgId);
                    var ses = shopState.session;
                    if (ses) { var k = '卸下·' + name; ses.items[k] = (ses.items[k] || 0) + 1; }
                    mxShopNote('已卸下「' + name + '」（从 ' + slot + ' 槽移除，装备加成已重算）', 'ok');
                    nebFill('卸下 ' + name);
                    if (typeof window.__mxRefreshPseudo === 'function') { try { window.__mxRefreshPseudo(); } catch (e3) {} }
                    return true;
                } catch (err) { console.error('[mx-bag] 卸下失败:', err); mxShopNote('卸下失败：' + ((err && err.message) || err), 'warn'); nebFill('卸下 ' + name); return false; }
            }

            var MX2_RECIPES = [
                { id: 'r_pts', cost: 30, label: '积分包', desc: '兑换 500 积分' },
                { id: 'r_voucher', cost: 80, label: '黑市折扣券', desc: '获得 1 张黑市折扣券' },
                { id: 'r_spins', cost: 120, label: '轮盘加次', desc: '本楼轮盘额外 3 次' },
                { id: 'r_combo', cost: 200, label: '黑市大礼包', desc: '折扣券×2 + 轮盘加 3 次' }
            ];
            async function mxCraft(recipeId) {
                var r = null;
                MX2_RECIPES.forEach(function (x) { if (x.id === recipeId) r = x; });
                if (!r) return false;
                var d = mxFreshStatData();
                if (!d) { mxShopNote('未检测到 MVU 数据', 'warn'); return false; }
                if (mxShardCount(d) < r.cost) { mxShopNote('神秘碎片不足（需 ' + r.cost + '，当前 ' + mxShardCount(d) + '）', 'warn'); return false; }
                var got = '';
                var ok = await mxDeal({
                    label: '合成·' + r.label, record: false,
                    chat: (recipeId === 'r_spins' || recipeId === 'r_combo') ? {
                        key: '_mxRoulette', def: { floorId: mx2LastFloor(), used: 0, bonus: 0, history: [] },
                        mutate: function (obj) { obj.bonus = mxNum2(obj.bonus, 0) + 3; }
                    } : null,
                    apply: function (sd) {
                        if (mxBagTakeItem(sd, MX2_SHARD, r.cost) < r.cost) throw new Error('碎片不足');
                        if (recipeId === 'r_pts') { var b = parsePrice(mxGetBalance(sd)); mxSetBalance(sd, +((isFinite(b) ? b : 0) + 500).toFixed(2)); got = '积分 ×500'; }
                        else if (recipeId === 'r_voucher') { mxBagAddItem(sd, MX2_VOUCHER, { '类型': '道具·券', '使用效果': '在敌方科技/黑市购买时自动核销，额外8折', '描述': '黑市流通的折扣凭证' }, 1); got = '黑市折扣券 ×1'; }
                        else if (recipeId === 'r_spins') { got = '本楼轮盘额外 3 次'; }
                        else if (recipeId === 'r_combo') { mxBagAddItem(sd, MX2_VOUCHER, { '类型': '道具·券', '使用效果': '在敌方科技/黑市购买时自动核销，额外8折', '描述': '黑市流通的折扣凭证' }, 2); got = '折扣券×2 + 轮盘+3次'; }
                    },
                    noteOk: '合成成功：' + r.label + ' -> ' + got + '（碎片 -' + r.cost + '）'
                });
                return ok;
            }

            /* ---------- 角斗场赌盘 ---------- */
            var MX2_BETS = [
                { id: 'win', label: '己方获胜', odds: 0.6 },
                { id: 'lose', label: '己方败北', odds: 3.0 },
                { id: 'fast', label: '五回合内速胜', odds: 2.5 }
            ];
            function mxCombatSnapshot() {
                var st = mxChatGet().combat_state;
                if (!st || !st.units || !st.units.length) return { present: false };
                var key = (st.spawnMsgId != null) ? ('b' + st.spawnMsgId) : ('h' + mxHash(st.units.map(function (u) { return String(u.name || '') + ':' + mxNum2(u.hpMaxBase || u.hp, 0); }).join('|')));
                var enemies = [], playerAlive = false, deadEnemies = [];
                st.units.forEach(function (u) {
                    var hp = mxNum2(u.hp, 1);
                    if (u.isPlayer || u.isAlly) { if (hp > 0) playerAlive = true; }
                    else { enemies.push({ name: String(u.name || ''), hp: hp, attrs: u.attrs || {}, skills: u._skills || null }); if (hp <= 0) deadEnemies.push(String(u.name || '')); }
                });
                var winner = null;
                if (String(st.phase || '') === 'COMBAT_END') {
                    var eAlive = enemies.some(function (e) { return e.hp > 0; });
                    winner = (!eAlive && playerAlive) ? 'win' : (!playerAlive ? 'lose' : 'draw');
                }
                return { present: true, active: !!st.active, phase: st.phase, turn: mxNum2(st.turn, 1), key: key, winner: winner, deadEnemies: deadEnemies, enemies: enemies };
            }
            function mxArenaInfo() {
                var a = mxChatGet()._mxArena;
                if (!a || typeof a !== 'object') a = { bets: [], history: [], settledKeys: {} };
                if (!a.bets) a.bets = []; if (!a.history) a.history = []; if (!a.settledKeys) a.settledKeys = {};
                return a;
            }
            async function mxArenaBet(typeId, amount) {
                var bet = null; MX2_BETS.forEach(function (b) { if (b.id === typeId) bet = b; });
                if (!bet) { mxShopNote('未知的押注类型', 'warn'); return false; }
                amount = Math.round(mxNum2(amount, 0));
                if (!(amount >= MX2.betMin && amount <= MX2.betMax)) { mxShopNote('押注金额需在 ' + MX2.betMin + ' ~ ' + MX2.betMax + ' 积分之间', 'warn'); return false; }
                var snap = mxCombatSnapshot();
                if (!snap.present || !snap.active) { mxShopNote('当前没有进行中的战斗，无法押注', 'warn'); return false; }
                var a = mxArenaInfo();
                if (a.bets && a.bets.length) { mxShopNote('每场战斗限押一注，本场已押', 'warn'); return false; }
                if (a.settledKeys[snap.key]) { mxShopNote('本场战斗已结算，等待下一场开启', 'warn'); return false; }
                return await mxDeal({
                    spend: amount, vipCut: false, label: '角斗场押注·' + bet.label + '×' + amount,
                    fill: '【角斗场押注】' + bet.label + '，押注 ' + amount + ' 积分',
                    chat: {
                        key: '_mxArena', def: { bets: [], history: [], settledKeys: {} },
                        mutate: function (obj) { obj.bets = [{ type: bet.id, amount: amount, key: snap.key, odds: bet.odds, floor: mx2LastFloor(), time: Date.now() }]; }
                    },
                    noteOk: '已押注「' + bet.label + '」' + amount + ' 积分（赔率 1:' + bet.odds + '），战斗结束后自动结算'
                });
            }
            async function mxPayout(gain, noteMsg) {
                await mxDeal({
                    earn: Math.max(0, gain), label: '系统派彩', record: false,
                    apply: function () {},
                    noteOk: noteMsg
                });
            }
            function mx2ArenaSettle(snap) {
                var a = mxArenaInfo();
                if (!a.bets || !a.bets.length) return;
                var bet = a.bets[0];
                if (a.settledKeys[bet.key]) { a.bets = []; mxChatSet({ _mxArena: a }); return; }
                var done = false, payout = 0, res = '';
                if (snap.present && snap.winner) {
                    if (snap.winner === 'draw') { payout = bet.amount; res = '平局·退还押注'; }
                    else if (bet.type === 'win') { if (snap.winner === 'win') { payout = Math.round(bet.amount * (1 + bet.odds)); res = '命中获胜·派彩'; } else res = '未命中'; }
                    else if (bet.type === 'lose') { if (snap.winner === 'lose') { payout = Math.round(bet.amount * (1 + bet.odds)); res = '命中败北·派彩'; } else res = '未命中'; }
                    else if (bet.type === 'fast') { if (snap.winner === 'win' && snap.turn <= 5) { payout = Math.round(bet.amount * (1 + bet.odds)); res = '速胜命中·派彩'; } else res = '未命中'; }
                    done = true;
                } else if (!snap.present) {
                    payout = bet.amount; res = '战斗记录消失·流局退款'; done = true;
                }
                if (!done) return;
                a.settledKeys[bet.key] = 1;
                a.history.unshift({ type: bet.type, amount: bet.amount, res: res, gain: payout - bet.amount, time: Date.now() });
                a.history = a.history.slice(0, 15);
                a.bets = [];
                mxChatSet({ _mxArena: a });
                if (payout > 0) { mxPayout(payout, '角斗场结算：' + res + '（积分 +' + payout + '）'); }
                else { mx2Toastr('角斗场结算：' + res); mxShopNote('角斗场结算：' + res, 'warn'); }
            }

            /* ---------- 悬赏榜 ---------- */
            function mxBountyInfo() {
                var b = mxChatGet()._mxBounty;
                if (!b || typeof b !== 'object') b = { bucket: -1, matrix: [], player: [], claimed: [], log: [] };
                if (!b.matrix) b.matrix = []; if (!b.player) b.player = []; if (!b.claimed) b.claimed = []; if (!b.log) b.log = [];
                return b;
            }
            function mx2BountyRegen(lid) {
                var b = mxBountyInfo();
                var bucket = Math.floor(lid / 10);
                if (b.bucket === bucket && b.matrix.length) return b;
                var list = Object.keys(MX_CODEX.enemies).map(function (n) { return { n: n, p: mxCodexEnemyPower(MX_CODEX.enemies[n].data) }; });
                list = list.filter(function (x) { return b.claimed.indexOf(x.n) < 0; });
                list.sort(function (a, b2) { return b2.p - a.p; });
                b.matrix = list.slice(0, 3).map(function (x) { return { target: x.n, reward: Math.max(100, x.p * 10), claimed: false }; });
                b.bucket = bucket;
                mxChatSet({ _mxBounty: b });
                return b;
            }
            async function mxPostBounty(text, amount) {
                text = String(text || '').trim();
                amount = Math.round(mxNum2(amount, 0));
                if (!text) { mxShopNote('请填写悬赏内容', 'warn'); return false; }
                if (!(amount >= 100 && amount <= 5000)) { mxShopNote('悬赏押金需在 100 ~ 5000 积分之间', 'warn'); return false; }
                var id = 'bt' + Date.now();
                return await mxDeal({
                    spend: amount, vipCut: false, label: '悬赏托管·' + text.slice(0, 12),
                    fill: '【悬赏发布】' + text + '（悬赏 ' + amount + ' 积分）',
                    chat: {
                        key: '_mxBounty', def: { bucket: -1, matrix: [], player: [], claimed: [], log: [] },
                        mutate: function (obj) {
                            obj.player = obj.player || [];
                            obj.player.unshift({ id: id, text: text, amount: amount, status: 'open', floor: mx2LastFloor(), time: Date.now() });
                            obj.player = obj.player.slice(0, 10);
                        }
                    },
                    noteOk: '悬赏已发布并托管 ' + amount + ' 积分，等待世界回应'
                });
            }
            async function mxCancelBounty(id) {
                var b = mxBountyInfo(); var t = null;
                b.player.forEach(function (x) { if (x.id === id && x.status === 'open') t = x; });
                if (!t) { mxShopNote('该悬赏不存在或已结算', 'warn'); return false; }
                return await mxDeal({
                    earn: t.amount, label: '悬赏退款', record: false,
                    chat: {
                        key: '_mxBounty', def: { bucket: -1, matrix: [], player: [], claimed: [], log: [] },
                        mutate: function (obj) {
                            (obj.player || []).forEach(function (x) { if (x.id === id) x.status = 'cancel'; });
                        }
                    },
                    apply: function () {},
                    noteOk: '悬赏已取消，押金 ' + t.amount + ' 积分退回'
                });
            }
            function mxClaimBounty(id) {
                var b = mxBountyInfo(); var t = null;
                b.player.forEach(function (x) { if (x.id === id && x.status === 'open') t = x; });
                if (!t) { mxShopNote('该悬赏不存在或已结算', 'warn'); return false; }
                var cv = mxChatGet(); var bb = cv._mxBounty;
                if (!bb || typeof bb !== 'object') return false;
                (bb.player || []).forEach(function (x) { if (x.id === id) x.status = 'done'; });
                if (!bb.log) bb.log = [];
                bb.log.unshift({ txt: '悬赏已确认履行：' + t.text, time: Date.now() });
                bb.log = bb.log.slice(0, 15);
                mxChatSet({ _mxBounty: bb });
                mxShopNote('已确认悬赏履行，' + t.amount + ' 积分由矩阵转交履约者', 'ok');
                if (typeof nebFill === 'function') { try { nebFill('【悬赏确认】' + t.text + ' 已履行，赏金已转交'); } catch (e) {} }
                return true;
            }
            function mx2BountySettle(snap) {
                if (!snap.present || snap.winner !== 'win' || !snap.deadEnemies || !snap.deadEnemies.length) return;
                var cv = mxChatGet(); var b = cv._mxBounty;
                if (!b || typeof b !== 'object' || !b.matrix || !b.matrix.length) return;
                var changed = false;
                b.matrix.forEach(function (t) {
                    if (t && !t.claimed && snap.deadEnemies.indexOf(t.target) >= 0) {
                        t.claimed = true;
                        if ((b.claimed || []).indexOf(t.target) < 0) { if (!b.claimed) b.claimed = []; b.claimed.push(t.target); }
                        if (!b.log) b.log = [];
                        b.log.unshift({ txt: '讨伐达成：' + t.target + '（积分 +' + t.reward + '）', time: Date.now() });
                        b.log = b.log.slice(0, 15);
                        changed = true;
                        mxPayout(t.reward, '悬赏结算：讨伐「' + t.target + '」达成（积分 +' + t.reward + '）');
                    }
                });
                if (changed) mxChatSet({ _mxBounty: b });
            }

            /* ---------- 限时闪购 ---------- */
            function mxFlashInfo() {
                var lid = mx2LastFloor();
                var bucket = Math.floor(lid / MX2.flashBucket);
                var f = mxChatGet()._mxFlash;
                if (!f || typeof f !== 'object' || mxNum2(f.bucket, -1) !== bucket) { f = { bucket: bucket, bought: {} }; mxChatSet({ _mxFlash: f }); }
                if (!f.bought) f.bought = {};
                return f;
            }
            function mxFlashStock(d) {
                var f = mxFlashInfo();
                var goods = getRaw(d, '背包与商城.商城.商品列表', {}) || {};
                var arr = [];
                Object.keys(goods).forEach(function (n) {
                    if (mxChannelOf(goods[n]) !== 'flash') return;
                    var p = parsePrice(getValue(goods[n], '价格', NaN));
                    if (isFinite(p) && p > 0) arr.push({ name: n, base: p, info: goods[n] });
                });
                arr.sort(function (a, b) { return a.name < b.name ? -1 : 1; });
                var rng = mxRng(mxHash('mx-flash-' + f.bucket));
                for (var i = arr.length - 1; i > 0; i--) { var j = Math.floor(rng() * (i + 1)); var t = arr[i]; arr[i] = arr[j]; arr[j] = t; }
                var count = 2 + (f.bucket % 2);
                return {
                    bucket: f.bucket, bought: f.bought, nextFloor: (f.bucket + 1) * MX2.flashBucket, lid: mx2LastFloor(),
                    stock: arr.slice(0, count).map(function (x) { return { name: x.name, base: x.base, price: Math.round(x.base * MX2.flashCut), info: x.info }; })
                };
            }
            async function mxBuyFlash(name) {
                var d = (typeof getStatData === 'function') ? getStatData() : null;
                if (!d) { mxShopNote('未检测到 MVU 数据', 'warn'); return false; }
                var s = mxFlashStock(d);
                var item = null; s.stock.forEach(function (x) { if (x.name === name) item = x; });
                if (!item) { mxShopNote('闪购商品已轮换', 'warn'); return false; }
                if (s.bought[name]) { mxShopNote('「' + name + '」本轮限购 1 件，已购买', 'warn'); return false; }
                var goods = getRaw(d, '背包与商城.商城.商品列表.' + name, null);
                return await mxDeal({
                    spend: item.price, vipCut: true, label: '闪购·' + name,
                    fill: '闪购购买 ' + name,
                    chat: {
                        key: '_mxFlash', def: { bucket: s.bucket, bought: {} },
                        mutate: function (obj) { obj.bought = obj.bought || {}; obj.bought[name] = 1; }
                    },
                    apply: function (sd) { mxBagAddItem(sd, name, (goods && typeof goods === 'object') ? goods : { '类型': '道具' }, 1); },
                    noteOk: '闪购成功：「' + name + '」（积分 -' + item.price + '，5折限时价）'
                });
            }

            /* ---------- 拍卖行 ---------- */
            function mxAuctionInfo() {
                var lid = mx2LastFloor();
                var bucket = Math.floor(lid / MX2.aucBucket);
                var a = mxChatGet()._mxAuction;
                if (!a || typeof a !== 'object' || mxNum2(a.bucket, -1) !== bucket) { a = { bucket: bucket, sold: {} }; mxChatSet({ _mxAuction: a }); }
                if (!a.sold) a.sold = {};
                return a;
            }
            function mxAuctionStock(d) {
                var a = mxAuctionInfo();
                var lid = mx2LastFloor();
                var pool = [];
                var seen = {};
                var goods = getRaw(d, '背包与商城.商城.商品列表', {}) || {};
                Object.keys(goods).forEach(function (n) {
                    if (mxChannelOf(goods[n]) !== 'auction') return;
                    var p = parsePrice(getValue(goods[n], '价格', NaN));
                    if (isFinite(p) && p > 0) { pool.push({ name: n, base: p, src: 'shop', info: goods[n] }); seen[n] = 1; }
                });
                var codexKinds = { skill: 'skills', equip: 'equips', item: 'items' };
                Object.keys(codexKinds).forEach(function (kind) {
                    var store = MX_CODEX[codexKinds[kind]] || {};
                    Object.keys(store).forEach(function (n) {
                        if (seen[n]) return;
                        var entry = store[n];
                        var lv = mxQualityOfCodex(entry, kind);
                        if (lv < 4) return;
                        var base = mxCodexPrice(kind, entry.data, n);
                        pool.push({ name: n, base: base, src: 'codex', kind: kind, lv: lv, info: entry.data }); seen[n] = 1;
                    });
                });
                var aiPool = mxChatGet()._mxAuctionPool;
                if (Array.isArray(aiPool)) {
                    aiPool.forEach(function (x) {
                        if (!x || !x.name || seen[x.name]) return;
                        var p = parsePrice(getValue(x, '价格', getValue(x, 'base', NaN)));
                        if (isFinite(p) && p > 0) { pool.push({ name: x.name, base: p, src: 'ai', info: x }); seen[x.name] = 1; }
                    });
                }
                var rng = mxRng(mxHash('mx-auc-' + a.bucket));
                for (var i = pool.length - 1; i > 0; i--) { var j = Math.floor(rng() * (i + 1)); var t = pool[i]; pool[i] = pool[j]; pool[j] = t; }
                var count = Math.min(3, pool.length);
                var stock = pool.slice(0, count).map(function (x) {
                    var lv = x.lv || (x.src === 'shop' ? mxQualityLv(x.info) : (x.src === 'ai' ? mxQualityLv(x.info) : 1));
                    if (lv < 1) lv = 1;
                    var mult = MX2.qPriceMult[lv] || 1;
                    return { name: x.name, base: x.base, price: Math.round(x.base * mult), lv: lv, src: x.src };
                });
                return { bucket: a.bucket, sold: a.sold, nextFloor: (a.bucket + 1) * MX2.aucBucket, lid: lid, stock: stock };
            }
            async function mxBuyAuction(name) {
                var d = mxFreshStatData();
                if (!d) { mxShopNote('未检测到 MVU 数据', 'warn'); return false; }
                var s = mxAuctionStock(d);
                var item = null; s.stock.forEach(function (x) { if (x.name === name) item = x; });
                if (!item) { mxShopNote('拍品已轮换或不存在', 'warn'); return false; }
                if (s.sold[name]) { mxShopNote('「' + name + '」已被拍走', 'warn'); return false; }
                return await mxDeal({
                    spend: item.price, vipCut: false, label: '拍卖·' + name,
                    fill: '拍卖成交 ' + name,
                    chat: {
                        key: '_mxAuction', def: { bucket: s.bucket, sold: {} },
                        mutate: function (obj) { obj.sold = obj.sold || {}; obj.sold[name] = 1; }
                    },
                    apply: function (sd) {
                        var g = getRaw(sd, '背包与商城.商城.商品列表.' + name, null);
                        if (g && typeof g === 'object') { mxBagAddItem(sd, name, g, 1); return; }
                        var aiPool = mxChatGet()._mxAuctionPool;
                        if (Array.isArray(aiPool)) {
                            for (var i = 0; i < aiPool.length; i++) { if (aiPool[i] && aiPool[i].name === name) { g = aiPool[i]; break; } }
                        }
                        if (g && typeof g === 'object') { mxBagAddItem(sd, name, g, 1); return; }
                        var ck = ['skill', 'equip', 'item'];
                        for (var k = 0; k < ck.length; k++) {
                            var entry = (MX_CODEX[{ skill: 'skills', equip: 'equips', item: 'items' }[ck[k]]] || {})[name];
                            if (entry) {
                                if (ck[k] === 'skill') { var sl = mxSkillList(sd); if (!sl[name]) sl[name] = mxToMvuSkill(entry.data); return; }
                                else if (ck[k] === 'equip') { mxBagAddItem(sd, name, mxToMvuEquip(entry.data), 1); return; }
                                else { mxBagAddItem(sd, name, { '类型': '道具', '描述': entry.data['描述'] || '拍卖所得' }, 1); return; }
                            }
                        }
                        mxBagAddItem(sd, name, { '类型': '道具' }, 1);
                    },
                    noteOk: '拍卖成交：「' + name + '」（积分 -' + item.price + '，' + mxQualityLabel(item.lv) + '级孤品）'
                });
            }

            /* ---------- 盲盒（图鉴实物抽奖） ---------- */
            var MX2_BLIND = [
                { id: 'n', label: '普通盲盒', cost: 800, hint: '普通/优秀图鉴实物（技能/装备/道具），图鉴空时折算碎片', qlv: [1, 2], fallback: [{ w: 50, kind: 'shard', n: 3 }, { w: 30, kind: 'points', n: 300 }, { w: 20, kind: 'voucher', n: 1 }] },
                { id: 'r', label: '稀有盲盒', cost: 3000, hint: '稀有图鉴实物，小概率史诗', qlv: [3, 4], epBoost: 0.15, fallback: [{ w: 45, kind: 'shard', n: 12 }, { w: 30, kind: 'points', n: 1500 }, { w: 15, kind: 'voucher', n: 1 }, { w: 10, kind: 'shard', n: 20 }] },
                { id: 'l', label: '传说盲盒', cost: 10000, hint: '史诗/传说图鉴实物', qlv: [4, 5], fallback: [{ w: 40, kind: 'shard', n: 40 }, { w: 30, kind: 'points', n: 5000 }, { w: 20, kind: 'voucher', n: 2 }, { w: 10, kind: 'shard', n: 60 }] }
            ];
            function mxBlindPickCodex(tier, rng) {
                var kinds = ['skill', 'equip', 'item'];
                var pool = [];
                kinds.forEach(function (kind) {
                    var store = MX_CODEX[{ skill: 'skills', equip: 'equips', item: 'items' }[kind]] || {};
                    Object.keys(store).forEach(function (n) {
                        var lv = mxQualityOfCodex(store[n], kind);
                        var inRange = (tier.qlv.indexOf(lv) >= 0);
                        if (tier.epBoost && lv === 4 && tier.qlv.indexOf(4) < 0) inRange = (rng() < tier.epBoost);
                        if (inRange) pool.push({ kind: kind, name: n, entry: store[n], lv: lv });
                    });
                });
                if (!pool.length) return null;
                pool.sort(function (a, b) { return a.lv - b.lv; });
                var idx = Math.floor(rng() * pool.length);
                return pool[idx];
            }
            async function mxOpenBlind(tierId) {
                var tier = null; MX2_BLIND.forEach(function (t) { if (t.id === tierId) tier = t; });
                if (!tier) return null;
                var rng = mxRng(((Date.now() & 0xfffff) ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0);
                var pick = mxBlindPickCodex(tier, rng);
                var got = '';
                var ok;
                if (pick) {
                    var price = mxCodexPrice(pick.kind, pick.entry.data, pick.name);
                    ok = await mxDeal({
                        spend: tier.cost, vipCut: false, label: '盲盒·' + tier.label + '·' + pick.name, record: false,
                        fill: '开启' + tier.label + '（获得图鉴实物：' + pick.name + '）',
                        apply: function (sd) {
                            if (pick.kind === 'skill') { var sl = mxSkillList(sd); if (!sl[pick.name]) sl[pick.name] = mxToMvuSkill(pick.entry.data); }
                            else if (pick.kind === 'equip') { mxBagAddItem(sd, pick.name, mxToMvuEquip(pick.entry.data), 1); }
                            else { mxBagAddItem(sd, pick.name, { '类型': '道具', '描述': pick.entry.data['描述'] || pick.entry.data['使用效果'] || '盲盒开出的图鉴道具', '使用效果': pick.entry.data['使用效果'] || '' }, 1); }
                        },
                        noteOk: function () { var msg = '盲盒开启：' + tier.label + ' -> ' + mxQualityLabel(pick.lv) + '「' + pick.name + '」（积分 -' + tier.cost + '，图鉴价 ' + price + '）'; try { if (typeof toastr !== 'undefined') toastr.success(msg); } catch (eT) {} return msg; }
                    });
                    if (ok) got = mxQualityLabel(pick.lv) + '「' + pick.name + '」';
                } else {
                    var fIdx = mxPickWeighted(tier.fallback, rng);
                    var row = tier.fallback[fIdx];
                    ok = await mxDeal({
                        spend: tier.cost, vipCut: false, label: '盲盒·' + tier.label, record: false,
                        fill: '开启' + tier.label,
                        apply: function (sd) {
                            if (row.kind === 'shard') { mxBagAddShards(sd, row.n); got = '神秘碎片 ×' + row.n; }
                            else if (row.kind === 'points') { var b = parsePrice(mxGetBalance(sd)); mxSetBalance(sd, +((isFinite(b) ? b : 0) + row.n).toFixed(2)); got = '积分 ×' + row.n; }
                            else if (row.kind === 'voucher') { mxBagAddItem(sd, MX2_VOUCHER, { '类型': '道具·券', '使用效果': '在敌方科技/黑市购买时自动核销，额外8折', '描述': '黑市流通的折扣凭证' }, row.n); got = '黑市折扣券 ×' + row.n; }
                        },
                        noteOk: function () { var msg = '盲盒开启：' + tier.label + ' -> ' + got + '（图鉴池为空，折算通货）（积分 -' + tier.cost + '）'; try { if (typeof toastr !== 'undefined') toastr.success(msg); } catch (eT) {} return msg; }
                    });
                }
                return ok ? { tier: tier, got: got, pick: pick } : null;
            }

            /* ---------- 轮询结算 / 启动 ---------- */
            var __mx2LastLid = null;
            function mxMall2Tick() {
                try {
                    var lid = mx2LastFloor();
                    if (lid !== __mx2LastLid) { __mx2LastLid = lid; mxCodexScan(lid); mx2BountyRegen(lid); }
                    var snap = mxCombatSnapshot();
                    mx2ArenaSettle(snap);
                    mx2BountySettle(snap);
                } catch (e) {}
            }
            function mxMall2Boot() {
                try { mxCodexLoad(); } catch (e) {}
                try { if (typeof bindMall2 === 'function') bindMall2(); } catch (e) { console.error('[mx-mall2] bindMall2 安装失败', e); }
                try { setTimeout(function () { try { if (typeof bindMall2 === 'function') bindMall2(); } catch (e) {} }, 800); } catch (e) {}
                try { setTimeout(function () { try { if (typeof bindMall2 === 'function') bindMall2(); } catch (e) {} }, 2500); } catch (e) {}
                try { setInterval(mxMall2Tick, 1500); } catch (e) {}
            }
            if (typeof window !== 'undefined' && window && window.document) {
                if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', mxMall2Boot); }
                else { mxMall2Boot(); }
            }

            /* ===== nebula 事件绑定 ===== */
            function bindStatic() {
                var root = document.getElementById('nebula-hud');
                document.getElementById('neb-tabs').addEventListener('click', function(e) {
                    var t = e.target.closest('.neb-tab');
                    if (!t) return;
                    document.querySelectorAll('.neb-tab').forEach(function(x) { x.classList.remove('active'); });
                    document.querySelectorAll('.neb-page').forEach(function(x) { x.classList.remove('active'); });
                    t.classList.add('active');
                    var pg = document.getElementById('page-' + t.dataset.page);
                    if (pg) pg.classList.add('active');
                });
                document.getElementById('neb-collapse').addEventListener('click', function() { root.classList.toggle(
                        'collapsed'); });
                function nebBodyClick(e) {
                    var gh = e.target.closest('.neb-qgroup');
                    if (gh) { gh.parentElement.classList.toggle('open'); return; }
                    var flip = e.target.closest('.neb-flip');
                    if (flip) { flip.classList.toggle('flipped'); return; }
                    var sub = e.target.closest('.neb-subtab');
                    if (sub) {
                        var box = (sub.parentElement && sub.parentElement.closest('.neb-card, .neb-ex-wrap')) ||
                            sub.closest('.neb-card');
                        if (box) {
                            box.querySelectorAll(':scope > .neb-subtabs > .neb-subtab').forEach(function(x) { x.classList.remove(
                                'active'); });
                            box.querySelectorAll(':scope > .neb-subpage').forEach(function(x) { x.classList.remove(
                                'active'); });
                            sub.classList.add('active');
                            var sp = box.querySelector('#sub-' + sub.dataset.sub);
                            if (sp) sp.classList.add('active');
                        }
                        return;
                    }
                }
                var nebStatusBody = document.querySelector('#mx-page-status .neb-body');
                if (nebStatusBody) nebStatusBody.addEventListener('click', nebBodyClick);
                var nebExBody = document.getElementById('mx-ex-body');
                if (nebExBody) nebExBody.addEventListener('click', nebBodyClick);
            }

            function bindDynamic() {
                var qd = document.getElementById('neb-quest-detail');
                var pq = document.getElementById('page-quest');
                if (pq && !pq.dataset.mxqBound) {
                    pq.dataset.mxqBound = '1';
                    pq.addEventListener('click', function(e) {
                        var it = e.target.closest('.neb-quest-item');
                        if (it) {
                            pq.querySelectorAll('.neb-list-item').forEach(function(x) { x.classList.remove(
                                'active'); });
                            it.classList.add('active');
                            if (qd) { qd.innerHTML =
                                    '<button class="neb-detail-close" id="neb-quest-close">×</button><div class="neb-card-title">任务详情</div>' +
                                    kv('任务名称', getValue(questState.list[+it.dataset.q], '任务名称')) +
                                    kv('难度', getValue(questState.list[+it.dataset.q], '难度')) +
                                    kv('进度', getValue(questState.list[+it.dataset.q], '进度百分比'));
                                qd.classList.add('show'); }
                            return;
                        }
                        if (e.target.id === 'neb-quest-close' && qd) { qd.classList.remove('show'); }
                    });
                }
                var bd = document.getElementById('neb-bag-detail');
                var pb = document.getElementById('page-bag');
                if (pb) {
                    pb.addEventListener('click', function(e) {
                        var cat = e.target.closest('.mxs-cat');
                        if (cat) { bagState.cat = cat.dataset.cat || 'all'; mxRefreshExchange(); return; }
                        var it = e.target.closest('.neb-bag-item');
                        if (it) {
                            pb.querySelectorAll('.neb-list-item').forEach(function(x) { x.classList.remove(
                                'active'); });
                            it.classList.add('active');
                            if (bd) { bd.innerHTML = bagDetailCard(bagState.list[+it.dataset.b]);
                                bd.classList.add('show'); }
                            return;
                        }
                        var bagAct = e.target.closest('[data-bagact]');
                        if (bagAct && !bagAct.disabled) {
                            var actName = bagAct.getAttribute('data-name') || '';
                            var act = bagAct.getAttribute('data-bagact');
                            if (act === 'use') { mxBagUse(actName).then(function (ok) { if (ok) { mxShopRerenderSoon(); var d2 = document.getElementById('neb-bag-detail'); if (d2) d2.classList.remove('show'); } }); }
                            else if (act === 'equip') { mxBagEquip(actName).then(function (ok) { if (ok) { mxShopRerenderSoon(); var d3 = document.getElementById('neb-bag-detail'); if (d3) d3.classList.remove('show'); } }); }
                            else if (act === 'unequip') { mxBagUnequip(actName).then(function (ok) { if (ok) { mxShopRerenderSoon(); var d5 = document.getElementById('neb-bag-detail'); if (d5) d5.classList.remove('show'); } }); }
                            else if (act === 'discard') { mx2ConfirmBtn(bagAct, function () { mxBagDiscard(actName).then(function (ok) { if (ok) { mxShopRerenderSoon(); var d4 = document.getElementById('neb-bag-detail'); if (d4) d4.classList.remove('show'); } }); }); }
                            return;
                        }
                        if (e.target.id === 'neb-bag-close' && bd) { bd.classList.remove('show'); }
                    });
                    pb.addEventListener('input', function(e) {
                        if (e.target.id === 'mxs-bag-search') {
                            bagState.search = e.target.value || '';
                            mxShopRerenderSoon();
                        }
                    });
                }
                var sd2 = document.getElementById('neb-shop-detail');
                var ps = document.getElementById('page-shop');
                if (ps) {
                    ps.addEventListener('click', function(e) {
                        var qb = e.target.closest('.mxs-qbtn');
                        if (qb) {
                            var box = qb.closest('.mxs-qty');
                            if (box) {
                                var val = box.querySelector('.mxs-qty-val');
                                var max = 99;
                                var lim = parseFloat(box.getAttribute('data-limit'));
                                if (isFinite(lim) && lim >= 1) max = Math.max(1, Math.floor(lim));
                                if (val) {
                                    var q = Math.max(1, Math.min(max, (parseInt(val.textContent, 10) || 1) + (parseInt(qb.dataset.q, 10) || 0)));
                                    val.textContent = q;
                                    var row = box.parentElement;
                                    var sum = row ? row.querySelector('.mxs-sum') : null;
                                    var p = parseFloat(box.getAttribute('data-price'));
                                    if (sum) {
                                        sum.textContent = (isFinite(p) && p > 0) ? ('合计 ' + (Math.round(p * q * 100) / 100)) : '合计 -';
                                    }
                                    if (row) {
                                        var buyBtn = row.querySelector('.mxs-buy');
                                        if (buyBtn) { buyBtn.textContent = q > 1 ? ('购买×' + q) : '购买'; }
                                    }
                                }
                            }
                            return;
                        }
                        var rt = e.target.closest('#mxs-rt-buy');
                        if (rt && !rt.disabled) {
                            var rv = document.getElementById('mxs-rt-val');
                            mxBuyReality(parseInt(rv && rv.textContent, 10) || 1);
                            return;
                        }
                        var buy = e.target.closest('[data-buy]');
                        if (buy && !buy.disabled) {
                            var qty = 1;
                            var qBox = buy.closest('.mxs-foot');
                            var qv = qBox ? qBox.querySelector('.mxs-qty-val') : null;
                            if (!qv) { qv = document.getElementById('mxs-qty-val'); }
                            if (buy.classList.contains('mxs-buy-lg') || qv) {
                                qty = Math.max(1, Math.min(99, parseInt(qv && qv.textContent, 10) || 1));
                            }
                            mxShopBuy(+buy.getAttribute('data-buy'), qty);
                            return;
                        }
                        var cat = e.target.closest('.mxs-cat');
                        if (cat) { shopState.cat = cat.dataset.cat || 'all'; mxRefreshExchange(); return; }
                        var srt = e.target.closest('.mxs-sort');
                        if (srt) { shopState.sort = srt.dataset.sort || 'default'; mxRefreshExchange(); return; }
                        var it = e.target.closest('.neb-shop-item');
                        if (it) {
                            ps.querySelectorAll('.neb-list-item').forEach(function(x) { x.classList.remove(
                                'active'); });
                            it.classList.add('active');
                            if (sd2) { sd2.innerHTML = shopDetailCard(shopState.list[+it.dataset.s], +it.dataset.s);
                                sd2.classList.add('show'); }
                            return;
                        }
                        if (e.target.id === 'neb-shop-close' && sd2) { sd2.classList.remove('show'); }
                    });
                    ps.addEventListener('input', function(e) {
                        if (e.target.id === 'mxs-shop-search') {
                            shopState.search = e.target.value || '';
                            mxShopRerenderSoon();
                        }
                    });
                }
                var capBtn = document.getElementById('mxs-cap-buy');
                if (capBtn) capBtn.addEventListener('click', function() { mxBuyCapacity(); });
                var undoBtn = document.getElementById('mxs-undo-btn');
                if (undoBtn) undoBtn.addEventListener('click', function() { mxUndoPurchase(); });
                var exTabs = document.getElementById('mx-ex-tabs');
                if (exTabs) exTabs.addEventListener('click', function(e) {
                    var t = e.target.closest('.neb-subtab');
                    if (t && t.dataset.sub) shopState.exSub = t.dataset.sub;
                });
                var shTabs = document.getElementById('neb-shop-subtabs');
                if (shTabs) shTabs.addEventListener('click', function(e) {
                    var t = e.target.closest('.neb-subtab');
                    if (t && t.dataset.sub) shopState.sub = t.dataset.sub;
                });
            }

            /* ===== 商城拓展 II · F：事件绑定（document 级委托，一次性安装，永不因重渲染失效） ===== */

            function mx2ConfirmBtn(btn, fn) {
                if (btn.getAttribute('data-armed') === '1') { btn.setAttribute('data-armed', ''); fn(); return; }
                btn.setAttribute('data-armed', '1');
                btn.setAttribute('data-orig', btn.textContent);
                btn.textContent = '确认?';
                btn.classList.add('armed');
                setTimeout(function () {
                    if (btn.isConnected) {
                        btn.setAttribute('data-armed', '');
                        btn.classList.remove('armed');
                        btn.textContent = btn.getAttribute('data-orig') || '';
                    }
                }, 2500);
            }
            function mx2After() { mxShopRerenderSoon(); }

            function bindMall2() {
                if (typeof window === 'undefined' || !window || !window.document) return;
                if (window.__mx2Delegated) return;
                window.__mx2Delegated = true;
                var inEx = function (t) {
                    try { return !!(t && t.closest && t.closest('#mx-page-exchange')); } catch (e) { return false; }
                };
                document.addEventListener('click', function (e) {
                    var t = e.target;
                    if (!t || !t.closest || !t.closest('#mx-page-exchange')) return;
                    try {
                        /* 页签：顶层 / 商城子页 / 背包子页 */
                        var topTab = t.closest('#mx-ex-tabs .neb-subtab');
                        if (topTab && topTab.dataset.sub) { shopState.exSub = topTab.dataset.sub; mxShopRerenderSoon(); return; }
                        var shopTab = t.closest('#neb-shop-subtabs .neb-subtab');
                        if (shopTab && shopTab.dataset.sub) { shopState.sub = shopTab.dataset.sub; mxShopRerenderSoon(); return; }
                        var bagTab = t.closest('[data-bagsub]');
                        if (bagTab) { mall2State.bagSub = bagTab.getAttribute('data-bagsub') || 'items'; mxRefreshExchange(); return; }
                        /* 敌方科技页 */
                        var chip = t.closest('[data-ekind]');
                        if (chip) { mall2State.enemyKind = chip.getAttribute('data-ekind') || 'all'; mxRefreshExchange(); return; }
                        var ebuy = t.closest('[data-ebuy]');
                        if (ebuy && !ebuy.disabled) {
                            mxEnemyBuy(ebuy.getAttribute('data-kind'), ebuy.getAttribute('data-name'), { voucher: true }).then(mx2After);
                            return;
                        }
                        if (t.id === 'mx2-enemy-close') {
                            var det = document.getElementById('mx2-enemy-detail');
                            if (det) det.classList.remove('show');
                            return;
                        }
                        var etItem = t.closest('.mx2-tech-item');
                        if (etItem) {
                            var pe = document.getElementById('page-enemy');
                            if (pe) pe.querySelectorAll('.neb-list-item').forEach(function (x) { x.classList.remove('active'); });
                            etItem.classList.add('active');
                            var det2 = document.getElementById('mx2-enemy-detail');
                            var x = (mall2State.enemyList || [])[+etItem.getAttribute('data-et')];
                            if (det2 && x) { det2.innerHTML = enemyTechDetailCard(x, mxVipInfo()); det2.classList.add('show'); }
                            return;
                        }
                        /* 黑市页 */
                        var bb = t.closest('[data-bbuy]');
                        if (bb && !bb.disabled) {
                            mxBuyBlackMarket(bb.getAttribute('data-name')).then(mx2After);
                            return;
                        }
                        var sl = t.closest('[data-sell]');
                        if (sl && !sl.disabled) { mx2ConfirmBtn(sl, function () { mxSellItem(sl.getAttribute('data-name')).then(mx2After); }); return; }
                        var sk = t.closest('[data-sellskill]');
                        if (sk && !sk.disabled) { mx2ConfirmBtn(sk, function () { mxSellSkill(sk.getAttribute('data-name')).then(mx2After); }); return; }
                        /* 回购台 */
                        var bk = t.closest('[data-buyback]');
                        if (bk && !bk.disabled) { mxBuyback(+bk.getAttribute('data-buyback')).then(mx2After); return; }
                        /* 竞技场页 */
                        var tp = t.closest('[data-abtype]');
                        if (tp) { mall2State.arenaType = tp.getAttribute('data-abtype') || 'win'; mxRefreshExchange(); return; }
                        var aq = t.closest('[data-aq]');
                        if (aq) {
                            var sp = document.getElementById('mx2-arena-amt');
                            if (sp) {
                                var v = Math.max(MX2.betMin, Math.min(MX2.betMax, (parseInt(sp.textContent, 10) || 100) + (parseInt(aq.getAttribute('data-aq'), 10) || 0)));
                                sp.textContent = v; mall2State.arenaAmt = v;
                            }
                            return;
                        }
                        var ab = t.closest('[data-abet]');
                        if (ab && !ab.disabled) { mxArenaBet(mall2State.arenaType, mall2State.arenaAmt).then(mx2After); return; }
                        var bq = t.closest('[data-bq]');
                        if (bq) {
                            var bs = document.getElementById('mx2-bounty-amt');
                            if (bs) {
                                var bv = Math.max(100, Math.min(5000, (parseInt(bs.textContent, 10) || 500) + (parseInt(bq.getAttribute('data-bq'), 10) || 0)));
                                bs.textContent = bv;
                            }
                            return;
                        }
                        var bp = t.closest('[data-bpost]');
                        if (bp && !bp.disabled) {
                            var txt = document.getElementById('mx2-bounty-text');
                            var amtEl = document.getElementById('mx2-bounty-amt');
                            mxPostBounty(txt ? txt.value : '', amtEl ? amtEl.textContent : 500).then(mx2After);
                            return;
                        }
                        var bc = t.closest('[data-bcancel]');
                        if (bc && !bc.disabled) { mx2ConfirmBtn(bc, function () { mxCancelBounty(bc.getAttribute('data-id')).then(mx2After); }); return; }
                        var bl = t.closest('[data-bclaim]');
                        if (bl && !bl.disabled) { mx2ConfirmBtn(bl, function () { mxClaimBounty(bl.getAttribute('data-id')); mxShopRerenderSoon(); }); return; }
                        /* 拍卖行页 */
                        var au = t.closest('[data-auc]');
                        if (au && !au.disabled) { mxBuyAuction(au.getAttribute('data-name')).then(mx2After); return; }
                        /* 幸运轮盘页 */
                        var sb = t.closest('[data-spin]');
                        if (sb && !sb.disabled) {
                            if (mall2State.spinning) return;
                            mall2State.spinning = true;
                            sb.disabled = true; sb.textContent = '转动中...';
                            mxRouletteSpin().then(function (res) {
                                var disc = document.getElementById('mx2-wheel-disc');
                                var finish = function () { mall2State.spinning = false; mxShopRerenderSoon(); };
                                if (res && disc) {
                                    var sector = Math.floor(360 / MX2_ROU_PRIZES.length);
                                    var cur = mxNum2(mall2State.rouletteRot, 0);
                                    var target = cur + 5 * 360 + (360 - (res.idx * sector + sector / 2));
                                    mall2State.rouletteRot = target;
                                    disc.style.transform = 'rotate(' + target + 'deg)';
                                    setTimeout(finish, 3800);
                                } else { setTimeout(finish, 120); }
                            });
                            return;
                        }
                        /* 商城页：闪购 / 盲盒 */
                        var fb = t.closest('[data-fbuy]');
                        if (fb && !fb.disabled) { mxBuyFlash(fb.getAttribute('data-name')).then(mx2After); return; }
                        var bd = t.closest('[data-blind]');
                        if (bd && !bd.disabled) { mxOpenBlind(bd.getAttribute('data-blind')).then(mx2After); return; }
                        /* 背包页：回收分解 */
                        var cf = t.closest('[data-craft]');
                        if (cf && !cf.disabled) { mxCraft(cf.getAttribute('data-craft')).then(mx2After); return; }
                        var di = t.closest('[data-dis]');
                        if (di && !di.disabled) { mx2ConfirmBtn(di, function () { mxRecycleItem(di.getAttribute('data-dis')).then(mx2After); }); return; }
                    } catch (err) { console.error('[mx-mall2] 点击处理失败:', err); }
                });
                document.addEventListener('input', function (e) {
                    if (!e.target || !e.target.id) return;
                    if (!inEx(e.target)) return;
                    if (e.target.id === 'mx2-enemy-search') {
                        mall2State.enemySearch = e.target.value || '';
                        mxShopRerenderSoon();
                    }
                });
            }

            /* ---------- 复写撤回：同步回退 VIP 累计消费 ---------- */
            async function mxUndoPurchase() {
                var ses = shopState.session;
                if (!ses || !ses.items || !Object.keys(ses.items).length) {
                    mxShopNote('本楼没有可撤回的操作', 'warn');
                    return;
                }
                try {
                    var msgId = mx2SafeId();
                    if (msgId === null || msgId === undefined || msgId !== ses.msgId || !ses.snapshot) {
                        shopState.session = null;
                        mxShopNote('已切换楼层，操作快照失效，无法撤回', 'warn');
                        return;
                    }
                    var hasPatches = !!(ses.patches && ses.patches.length);
                    if (hasPatches) {
                        var vars = getVariables({ type: 'message', message_id: ses.msgId });
                        var sd = vars && vars.stat_data;
                        if (!sd) { await mxSaveStatData(ses.snapshot, ses.msgId); }
                        else {
                            ses.patches.forEach(function (p) {
                                var parts = p.path.split('.'), cur = sd, ok = true;
                                for (var j = 0; j < parts.length - 1; j++) {
                                    if (cur && typeof cur === 'object' && parts[j] in cur) { cur = cur[parts[j]]; }
                                    else { if (cur && typeof cur === 'object') { cur[parts[j]] = {}; cur = cur[parts[j]]; } else { ok = false; break; } }
                                }
                                if (ok && cur && typeof cur === 'object') {
                                    var last = parts[parts.length - 1];
                                    if (p.val === null) { delete cur[last]; }
                                    else { cur[last] = mxClone(p.val, p.val); }
                                }
                            });
                            await mxSaveStatData(sd, ses.msgId);
                            try { if (typeof window !== 'undefined') { window.__mxPseudoState = window.__mxPseudoState || {}; window.__mxPseudoState.statData = sd; } } catch (e6) {}
                        }
                    } else {
                        await mxSaveStatData(ses.snapshot, ses.msgId);
                        try { if (typeof window !== 'undefined') { window.__mxPseudoState = window.__mxPseudoState || {}; window.__mxPseudoState.statData = ses.snapshot; window.__mxPseudoState.messageId = ses.msgId; } } catch (e6) {}
                    }
                    if (ses.chatSnap) { try { mxChatRestore(ses.chatSnap); } catch (eChat) {} }
                    if (ses.cost > 0) { try { mxVipAddSpent(-(ses.cost)); } catch (eVip) {} }
                    if (ses.fillLog && ses.fillLog.length) {
                        try { var l2 = (shopState.session && shopState.session.fillLog) || ses.fillLog; if (typeof nebFill === 'function') nebFill('【矩阵撤回】已撤销本楼操作：' + l2.join('；')); } catch (eF) {}
                    }
                    var det = Object.keys(ses.items).map(function (n) { return n + '×' + ses.items[n]; }).join('、');
                    shopState.session = null;
                    mxShopNote('已撤回本楼操作：' + det + '（积分与 VIP 消费均已退回' + (hasPatches ? '，背包操作已精细回滚' : '') + '）', 'ok');
                    if (typeof window !== 'undefined' && typeof window.__mxRefreshPseudo === 'function') { try { window.__mxRefreshPseudo(); } catch (e2) {} }
                } catch (err) {
                    console.error('[mx-mall2] 撤回失败:', err);
                    mxShopNote('撤回失败：' + ((err && err.message) || err), 'warn');
                }
            }

            /* ===== 长按重roll/编辑功能 ===== */
            function resolveFn(name) {
                try { if (typeof window[name] === 'function') return window[name]; } catch (e) {}
                try { if (HOST && typeof HOST[name] === 'function') return HOST[name]; } catch (e) {}
                try { if (window.parent && window.parent !== window && typeof window.parent[name] === 'function') return window.parent[name]; } catch (e) {}
                return null;
            }

            function getCurrentMessageIdSafe() {
                var fn = resolveFn('getCurrentMessageId');
                if (fn) { try { var id = fn(); if (id !== undefined && id !== null) return id; } catch (e) {} }
                var msgObj = getCurrentMsgObj();
                if (msgObj) {
                    if (msgObj.message_id !== undefined && msgObj.message_id !== null) return msgObj.message_id;
                    if (msgObj.id !== undefined && msgObj.id !== null) return msgObj.id;
                }
                fn = resolveFn('getLastMessageId');
                if (fn) { try { return fn(); } catch (e) {} }
                return null;
            }

            function findUserMessageId(assistantMsgId) {
                try {
                    var fn = resolveFn('getChatMessages');
                    if (!fn || assistantMsgId === null || assistantMsgId === undefined) return null;
                    var start = Math.max(0, assistantMsgId - 10);
                    var msgs = fn(start + '-' + assistantMsgId);
                    if (!msgs || !msgs.length) return null;
                    for (var i = msgs.length - 1; i >= 0; i--) {
                        var mid = start + i;
                        if (mid >= assistantMsgId) continue;
                        if (msgs[i].role === 'user' || msgs[i].is_user) return mid;
                    }
                    return null;
                } catch (e) { return null; }
            }

            function handleLongPressStart(e) {
                if (contextMenuPos || editingMessage || mxIsLoading) {
                    if (window.__mxDebug) console.log('[mx-longpress] start blocked:', { contextMenuPos: !!contextMenuPos, editingMessage: !!editingMessage, mxIsLoading: mxIsLoading });
                    return;
                }
                var content = extractContent(getRawText());
                if (!content) {
                    if (window.__mxDebug) console.log('[mx-longpress] no content, abort');
                    return;
                }
                if (currentMessageInfo.messageId === undefined || currentMessageInfo.messageId === null) {
                    if (window.__mxDebug) console.log('[mx-longpress] no messageId, abort');
                    return;
                }
                var clientX, clientY;
                if (e.touches && e.touches.length) {
                    clientX = e.touches[0].clientX;
                    clientY = e.touches[0].clientY;
                } else {
                    clientX = e.clientX;
                    clientY = e.clientY;
                }
                if (window.__mxDebug) console.log('[mx-longpress] timer started at', clientX, clientY);
                longPressTimer = setTimeout(function() {
                    if (window.__mxDebug) console.log('[mx-longpress] timer fired, showing menu');
                    showContextMenu(clientX, clientY);
                    longPressTimer = null;
                }, 500);
            }

            function handleLongPressEnd() {
                if (longPressTimer) {
                    clearTimeout(longPressTimer);
                    longPressTimer = null;
                }
            }

            function showContextMenu(x, y) {
                contextMenuPos = { x: x, y: y };
                contextMenuOpenedAt = Date.now();
                renderContextMenu();
            }

            function hideContextMenu() {
                contextMenuPos = null;
                renderContextMenu();
            }

            function renderContextMenu() {
                var existing = document.getElementById('mx-context-menu');
                if (!contextMenuPos) {
                    if (existing) existing.remove();
                    return;
                }
                if (existing) existing.remove();
                var menu = document.createElement('div');
                menu.id = 'mx-context-menu';
                menu.className = 'mx-context-menu';
                menu.style.left = Math.min(contextMenuPos.x, window.innerWidth - 260) + 'px';
                menu.style.top = Math.min(contextMenuPos.y, window.innerHeight - 200) + 'px';
                menu.innerHTML =
                    '<div class="mx-ctx-header">' +
                    '<span class="mx-ctx-title"><span class="dot"></span>操作</span>' +
                    '<button class="mx-ctx-close" id="mx-ctx-close-btn"><i class="fa-solid fa-xmark"></i></button></div>' +
                    '<button class="mx-ctx-btn' + (mxIsLoading ? ' disabled' : '') + '" id="mx-ctx-regen"' + (mxIsLoading ? ' disabled' : '') + '>' +
                    '<span class="ctx-ico"><i class="fa-solid fa-rotate"></i></span>' +
                    '<span class="ctx-txt">' + (mxIsLoading ? '处理中...' : '重roll') + '</span></button>' +
                    '<button class="mx-ctx-btn' + (mxIsLoading ? ' disabled' : '') + '" id="mx-ctx-edit"' + (mxIsLoading ? ' disabled' : '') + '>' +
                    '<span class="ctx-ico"><i class="fa-solid fa-pen-to-square"></i></span>' +
                    '<span class="ctx-txt">修改正文</span></button>';
                document.body.appendChild(menu);
                document.getElementById('mx-ctx-close-btn').addEventListener('click', function(e) {
                    e.stopPropagation(); hideContextMenu();
                });
                document.getElementById('mx-ctx-regen').addEventListener('click', function(e) {
                    e.stopPropagation(); if (!mxIsLoading) handleRegenerate();
                });
                document.getElementById('mx-ctx-edit').addEventListener('click', function(e) {
                    e.stopPropagation(); if (!mxIsLoading) handleEdit();
                });
            }

            function handleRegenerate() {
                if (currentMessageInfo.messageId === undefined || currentMessageInfo.messageId === null ||
                    currentMessageInfo.userMessageId === undefined || currentMessageInfo.userMessageId === null) {
                    if (typeof toastr !== 'undefined') toastr.error('无法重新生成：缺少必要的数据');
                    else alert('无法重新生成：缺少必要的数据');
                    hideContextMenu();
                    return;
                }
                mxIsLoading = true;
                renderContextMenu();
                hideContextMenu();
                var userMsgId = currentMessageInfo.userMessageId;
                var assistantMsgId = currentMessageInfo.messageId;
                var getChatFn = resolveFn('getChatMessages');
                var deleteFn = resolveFn('deleteChatMessages');
                var handleUnified = resolveFn('handleUnifiedRequest');
                var slashFn = resolveFn('triggerSlash');
                try {
                    if (!getChatFn) throw new Error('getChatMessages API 不可用');
                    var userMessages = getChatFn(userMsgId);
                    if (!userMessages || !userMessages.length) throw new Error('无法找到用户消息');
                    var userMessageText = userMessages[0].message || userMessages[0].mes || '';
                    if (handleUnified) {
                        if (!deleteFn) throw new Error('deleteChatMessages API 不可用');
                        Promise.resolve(deleteFn([assistantMsgId], { refresh: 'none' })).then(function() {
                            return Promise.resolve(handleUnified(userMessageText, {
                                onDisableOptions: function() { mxIsLoading = true; },
                                onShowGenerating: function() { mxIsLoading = true; },
                                onHideGenerating: function() { mxIsLoading = false; },
                                onEnableOptions: function() { mxIsLoading = false; },
                                onRefreshStory: function() { setTimeout(function() { lastRawText = ''; updateDisplay(); }, 100); },
                                onError: function(error) {
                                    mxIsLoading = false;
                                    var m = error && error.message ? error.message : String(error);
                                    if (typeof toastr !== 'undefined') toastr.error('重新生成失败: ' + m);
                                    else alert('重新生成失败: ' + m);
                                }
                            }));
                        }).then(function(success) {
                            if (success === false) mxIsLoading = false;
                        }).catch(function(error) {
                            mxIsLoading = false;
                            var m = error instanceof Error ? error.message : String(error);
                            if (typeof toastr !== 'undefined') toastr.error('重新生成失败: ' + m);
                            else alert('重新生成失败: ' + m);
                        });
                    } else if (slashFn) {
                        slashFn('/regenerate');
                        mxIsLoading = false;
                        setTimeout(function() { lastRawText = ''; updateDisplay(); }, 1000);
                    } else {
                        throw new Error('无法找到重新生成的API（handleUnifiedRequest / triggerSlash 均不可用）');
                    }
                } catch (error) {
                    mxIsLoading = false;
                    var m = error instanceof Error ? error.message : String(error);
                    if (typeof toastr !== 'undefined') toastr.error('重新生成失败: ' + m);
                    else alert('重新生成失败: ' + m);
                }
            }

            function handleEdit() {
                if (currentMessageInfo.messageId === undefined || currentMessageInfo.messageId === null ||
                    !currentMessageInfo.fullMessage) {
                    if (typeof toastr !== 'undefined') toastr.error('无法编辑：缺少必要的数据');
                    else alert('无法编辑：缺少必要的数据');
                    hideContextMenu();
                    return;
                }
                try {
                    var contentMatch = currentMessageInfo.fullMessage.match(/<content>([\s\S]*?)<\/content>/i);
                    if (!contentMatch) {
                        if (typeof toastr !== 'undefined') toastr.error('无法提取要编辑的文本内容');
                        else alert('无法提取要编辑的文本内容');
                        return;
                    }
                    editingMessage = {
                        messageId: currentMessageInfo.messageId,
                        currentText: contentMatch[1].trim(),
                        fullMessage: currentMessageInfo.fullMessage
                    };
                    hideContextMenu();
                    renderEditModal();
                } catch (error) {
                    var m = error instanceof Error ? error.message : String(error);
                    if (typeof toastr !== 'undefined') toastr.error('编辑消息失败: ' + m);
                    else alert('编辑消息失败: ' + m);
                }
            }

            function renderEditModal() {
                var existing = document.getElementById('mx-edit-modal');
                if (!editingMessage) {
                    if (existing) existing.remove();
                    return;
                }
                if (existing) existing.remove();
                var modal = document.createElement('div');
                modal.id = 'mx-edit-modal';
                modal.className = 'mx-edit-modal';
                modal.innerHTML =
                    '<div class="mx-edit-modal-content">' +
                    '<div class="mx-edit-header"><h2><span class="dot"></span>编辑正文</h2>' +
                    '<button class="mx-edit-close" id="mx-edit-close-btn"><i class="fa-solid fa-xmark"></i></button></div>' +
                    '<div class="mx-edit-body">' +
                    '<textarea class="mx-edit-textarea" id="mx-edit-textarea">' + esc(editingMessage.currentText) + '</textarea>' +
                    '<div class="mx-edit-btns">' +
                    '<button class="mx-edit-cancel" id="mx-edit-cancel-btn"' + (mxIsLoading ? ' disabled' : '') + '><i class="fa-solid fa-xmark"></i>取消</button>' +
                    '<button class="mx-edit-save" id="mx-edit-save-btn"' + (mxIsLoading ? ' disabled' : '') + '><i class="fa-solid fa-floppy-disk"></i>' + (mxIsLoading ? '保存中...' : '保存') + '</button>' +
                    '</div></div></div>';
                document.body.appendChild(modal);
                var textarea = document.getElementById('mx-edit-textarea');
                if (textarea) {
                    textarea.addEventListener('input', function(e) {
                        if (editingMessage) editingMessage.currentText = e.target.value;
                    });
                }
                document.getElementById('mx-edit-close-btn').addEventListener('click', function() {
                    if (!mxIsLoading) { editingMessage = null; renderEditModal(); }
                });
                document.getElementById('mx-edit-cancel-btn').addEventListener('click', function() {
                    if (!mxIsLoading) { editingMessage = null; renderEditModal(); }
                });
                document.getElementById('mx-edit-save-btn').addEventListener('click', function() {
                    handleSaveEdit();
                });
            }

            function handleSaveEdit() {
                if (!editingMessage) return;
                var messageId = editingMessage.messageId;
                var currentText = editingMessage.currentText;
                var fullMessage = editingMessage.fullMessage;
                var setFn = resolveFn('setChatMessages');
                if (!setFn) {
                    if (typeof toastr !== 'undefined') toastr.error('setChatMessages API 不可用');
                    else alert('setChatMessages API 不可用');
                    return;
                }
                try {
                    var updatedMessage = fullMessage.replace(/<content>[\s\S]*?<\/content>/i, '<content>' + currentText + '</content>');
                    mxIsLoading = true;
                    renderEditModal();
                    Promise.resolve(setFn([{ message_id: messageId, message: updatedMessage }], { refresh: 'affected' })).then(function() {
                        editingMessage = null;
                        renderEditModal();
                        mxIsLoading = false;
                        setTimeout(function() { lastRawText = ''; updateDisplay(); }, 100);
                    }).catch(function(error) {
                        mxIsLoading = false;
                        renderEditModal();
                        var m = error instanceof Error ? error.message : String(error);
                        if (typeof toastr !== 'undefined') toastr.error('保存编辑失败: ' + m);
                        else alert('保存编辑失败: ' + m);
                    });
                } catch (error) {
                    mxIsLoading = false;
                    renderEditModal();
                    var m = error instanceof Error ? error.message : String(error);
                    if (typeof toastr !== 'undefined') toastr.error('保存编辑失败: ' + m);
                    else alert('保存编辑失败: ' + m);
                }
            }

            function bindLongPress() {
                var box = document.getElementById('mx-content-box');
                if (!box) { console.warn('[mx-longpress] #mx-content-box not found, long press disabled'); return; }
                console.log('[mx-longpress] binding long press events on #mx-content-box');
                box.addEventListener('mousedown', function(e) {
                    if (contextMenuPos || editingMessage) return;
                    if (currentMessageInfo.messageId === undefined || currentMessageInfo.messageId === null) return;
                    handleLongPressStart(e);
                });
                box.addEventListener('mouseup', function(e) {
                    handleLongPressEnd();
                });
                box.addEventListener('mouseleave', function() {
                    handleLongPressEnd();
                });
                box.addEventListener('touchstart', function(e) {
                    if (contextMenuPos || editingMessage) return;
                    if (currentMessageInfo.messageId === undefined || currentMessageInfo.messageId === null) return;
                    handleLongPressStart(e);
                }, { passive: true });
                box.addEventListener('touchend', function() {
                    handleLongPressEnd();
                });
                box.addEventListener('touchcancel', function() {
                    handleLongPressEnd();
                });
                box.addEventListener('touchmove', function() {
                    handleLongPressEnd();
                }, { passive: true });
            }

            function bindClickOutside() {
                document.addEventListener('click', function(e) {
                    if (!contextMenuPos) return;
                    if (Date.now() - contextMenuOpenedAt < 350) return;
                    var target = e.target;
                    if (!target || !target.closest) return;
                    var menuEl = target.closest('#mx-context-menu');
                    var contentEl = target.closest('#mx-content-box');
                    if (!menuEl && !contentEl) {
                        hideContextMenu();
                    }
                }, true);
            }

            /* ===== 主轮询 ===== */
            function updateDisplay() {
                var rawText = getRawText();
                if (rawText !== lastRawText) {
                    lastRawText = rawText;
                    renderContent(rawText);
                    renderOptions(rawText);
                }
                if (!mxIsLoading && !editingMessage) {
                    var msgId = getCurrentMessageIdSafe();
                    var cbox = document.getElementById('mx-content-box');
                    if (msgId !== null && msgId !== undefined) {
                        currentMessageInfo = {
                            messageId: msgId,
                            userMessageId: findUserMessageId(msgId),
                            fullMessage: rawText
                        };
                        if (cbox) cbox.style.cursor = 'pointer';
                        if (window.__mxDebug) console.log('[mx-longpress] currentMessageInfo ready:', currentMessageInfo);
                    } else {
                        if (cbox) cbox.style.cursor = 'default';
                        if (window.__mxDebug) console.log('[mx-longpress] messageId is null, long press disabled');
                    }
                }
                var sd = getStatData();
                if (sd) {
                    var sig;
                    try { sig = JSON.stringify(sd); } catch (e) { sig = String(sd); }
                    if (sig !== lastStatData) {
                        lastStatData = sig;
                        renderHud(sd);
                    }
                }
                refreshCombatVisibility();
            }

            /* ===== nebFill 暴露 ===== */
            window.nebFill = function(text) {
                try {
                    var ta = document.querySelector('#send_textarea') ||
                        (window.parent && window.parent.document.querySelector('#send_textarea'));
                    if (ta) { ta.value = text;
                        ta.dispatchEvent(new Event('input', { bubbles: true }));
                        ta.focus(); }
                } catch (e) { console.error(e); }
            };

            window.__mxRefreshPseudo = function() { lastRawText = ''; lastStatData = null; updateDisplay(); };

            /* ===== 初始化 ===== */
            bindStatic();

            /* ===== 懒渲染：切换标签时补渲染未激活页面（性能优化） ===== */
            (function() {
                var nebTabs = document.getElementById('neb-tabs');
                if (nebTabs) nebTabs.addEventListener('click', function() {
                    var t = nebTabs.querySelector('.neb-tab.active');
                    if (!t) return;
                    var p = t.getAttribute('data-page');
                    if (__mxNebDirty[p]) mxRenderNebPage(p);
                });
                var mxTabs = document.getElementById('mx-tabs');
                if (mxTabs) mxTabs.addEventListener('click', function() {
                    var t = mxTabs.querySelector('.mx-tab.active');
                    if (t && t.getAttribute('data-mxtab') === 'exchange' && __mxNebDirty.__exchange) {
                        __mxNebDirty.__exchange = false;
                        mxRefreshExchange();
                    }
                });
            })();

            function init() {
                bindLongPress();
                bindClickOutside();
                updateDisplay();
                setInterval(updateDisplay, POLL_MS);
                ensureCombatMount();
            }
            if (typeof waitGlobalInitialized === 'function') {
                waitGlobalInitialized('Mvu').then(init).catch(function() { init(); });
            } else { setTimeout(init, 300); }
        
            /* ====== 中小屏幕适配（增量；桌面端不触发）====== */
            var __mxMobileDone = false;
            function mxMobileInit() {
                if (__mxMobileDone) return; __mxMobileDone = true;
                var mq = window.matchMedia ? window.matchMedia('(max-width:1024px),(max-device-width:1024px)') : null;
                if (!mq) return;
                var root = document.getElementById('mx-console');
                if (!root) return;
                var backdrop = null;
                function ensureBackdrop() {
                    if (backdrop) return;
                    backdrop = document.createElement('div');
                    backdrop.className = 'mx-sheet-backdrop';
                    backdrop.addEventListener('click', function () { closeAllSheets(); });
                    document.body.appendChild(backdrop);
                }
                function refreshBackdrop() {
                    if (!backdrop || !root.classList.contains('mx-mobile')) return;
                    var sheet = document.querySelector('.neb-detail.show');
                    var ctx = document.getElementById('mx-context-menu');
                    if (sheet || ctx) backdrop.classList.add('show');
                    else backdrop.classList.remove('show');
                }
                function closeAllSheets() {
                    document.querySelectorAll('.neb-detail.show').forEach(function (el) { el.classList.remove('show'); });
                    if (typeof hideContextMenu === 'function') hideContextMenu();
                }
                function applyMobile(on) {
                    root.classList.toggle('mx-mobile', on);
                    document.body.classList.toggle('mx-mobile-active', on);
                    if (on) { ensureBackdrop(); refreshBackdrop(); }
                    else if (backdrop) backdrop.classList.remove('show');
                }
                applyMobile(mq.matches);
                try { mq.addEventListener('change', function (e) { applyMobile(e.matches); }); }
                catch (e1) { try { mq.addListener(function (e) { applyMobile(e.matches); }); } catch (e2) {} }
                /* 详情 sheet 显隐 -> 切换遮罩 */
                var neb = document.getElementById('nebula-hud');
                if (neb && window.MutationObserver) {
                    new MutationObserver(function () { refreshBackdrop(); })
                        .observe(neb, { subtree: true, attributes: true, attributeFilter: ['class'] });
                }
                /* body 子节点增删（context menu / edit modal）-> 切换遮罩 */
                if (window.MutationObserver) {
                    new MutationObserver(function () { refreshBackdrop(); })
                        .observe(document.body, { childList: true });
                }
                /* 右键菜单：移动端贴底 sheet 化 */
                var _origRender = renderContextMenu;
                renderContextMenu = function () {
                    _origRender();
                    var menu = document.getElementById('mx-context-menu');
                    if (menu && root.classList.contains('mx-mobile')) {
                        menu.style.left = '0px'; menu.style.right = '0px';
                        menu.style.bottom = '0px'; menu.style.top = 'auto';
                        menu.classList.add('mx-ctx-sheet');
                        if (backdrop) backdrop.classList.add('show');
                    }
                };
                var _origHide = hideContextMenu;
                hideContextMenu = function () {
                    _origHide();
                    if (backdrop) backdrop.classList.remove('show');
                };
                /* 横竖屏 / 窗口变化 */
                var rt;
                window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { applyMobile(mq.matches); }, 150); });
                window.addEventListener('orientationchange', function () { setTimeout(function () { applyMobile(mq.matches); }, 250); });
            }
            function mxMobileBoot() { try { mxMobileInit(); } catch (e) { if (window.__mxDebug) console.error('[mx-mobile]', e); } }
            if (typeof waitGlobalInitialized === 'function') {
                waitGlobalInitialized('Mvu').then(mxMobileBoot).catch(function () { setTimeout(mxMobileBoot, 400); });
            } else { setTimeout(mxMobileBoot, 600); }
            })();
    

/* ===== TRUE PSEUDO-LAYER PIPELINE ===== */
(function(){
  if(window.__mxPseudoPipelineInit)return;
  window.__mxPseudoPipelineInit=true;
  var streamListener=null;
  function node(id){return document.getElementById(id)}
  function setState(text){var el=node('mx-pseudo-state');if(el)el.textContent=text||''}
  function setBusy(busy){window.__mxPseudoBusy=busy;var root=node('mx-console');if(root)root.classList.toggle('mx-pseudo-busy',busy);var input=node('mx-pseudo-text'),send=node('mx-pseudo-send');if(input)input.disabled=busy;if(send)send.disabled=busy}
  function currentMvu(){try{return Mvu.getMvuData({type:'message',message_id:'latest'})}catch(e){return {stat_data:{}}}}
  function stripThinking(raw){return String(raw||'').replace(/<think(?:ing)?[^>]*>[\s\S]*?<\/think(?:ing)?>/gi,'').replace(/<think(?:ing)?[^>]*>[\s\S]*$/gi,'').trim()}
  function normalize(raw){var text=stripThinking(raw);if(!/<(?:content|maintext)>[\s\S]*?<\/(?:content|maintext)>/i.test(text))text='<content>'+text+'</content>';if(!/<option>[\s\S]*?<\/option>/i.test(text))text+='\n<option>1.继续</option>';return text}
  function stream(text){var box=node('mx-content-box');if(!box)return;var clean=stripThinking(text),match=clean.match(/<(?:content|maintext)>([\s\S]*?)(?:<\/(?:content|maintext)>|$)/i);box.textContent=(match?match[1]:clean).replace(/^\s+/,'').trimEnd()}
  window.submitMxAction=async function(text,source){
    text=String(text||'').trim();if(!text||window.__mxPseudoBusy)return;
    if(typeof createChatMessages!=='function'||typeof generate!=='function'){setState('酒馆助手接口不可用');return}
    setBusy(true);setState(source==='option'?'正在执行所选行动...':'正在提交行动...');
    var userId=null,generationId='mx-'+Date.now()+'-'+Math.random().toString(36).slice(2,8);
    try{
      await waitGlobalInitialized('Mvu');
      var oldData=_.cloneDeep(currentMvu());
      await createChatMessages([{role:'user',message:text}],{refresh:'none'});
      userId=getLastMessageId();
      if(typeof eventOn==='function'&&typeof iframe_events!=='undefined')streamListener=eventOn(iframe_events.STREAM_TOKEN_RECEIVED_FULLY,function(full,id){if(id!==generationId)return;stream(full);setState('生成中...')});
      var result=await generate({user_input:'',should_stream:true,should_silence:true,generation_id:generationId});
      if(typeof result!=='string')result=result&&result.content?result.content:'';
      if(!stripThinking(result)){throw new Error('AI 返回了空内容，请重试或检查 API 状态')}
      var reply=normalize(result),parsed=await Mvu.parseMessage(reply,oldData),finalData=parsed||oldData;
      await createChatMessages([{role:'assistant',message:reply,data:{stat_data:_.cloneDeep(finalData.stat_data||{})}}],{refresh:'none'});
      window.__mxPseudoState={latestAssistantText:reply,statData:_.cloneDeep(finalData.stat_data||{}),messageId:getLastMessageId()};
      await eventEmit('mx:pseudo-layer-updated',reply,window.__mxPseudoState.statData,window.__mxPseudoState.messageId);
      if(typeof window.__mxRefreshPseudo==='function')window.__mxRefreshPseudo();
      var input=node('mx-pseudo-text');if(input)input.value='';setState('已更新');
    }catch(error){
      setState('交互失败：'+(error&&error.message?error.message:String(error)));
      if(userId!==null&&typeof deleteChatMessages==='function'){try{await deleteChatMessages([userId],{refresh:'none'})}catch(ignore){}}
    }finally{if(streamListener&&streamListener.stop)streamListener.stop();streamListener=null;setBusy(false)}
  };
  if(typeof eventOn==='function')eventOn('mx:pseudo-layer-updated',function(reply,statData,messageId){window.__mxPseudoState={latestAssistantText:reply,statData:statData,messageId:messageId};if(typeof window.__mxRefreshPseudo==='function')window.__mxRefreshPseudo()});
  var send=node('mx-pseudo-send'),input=node('mx-pseudo-text');if(send)send.addEventListener('click',function(){window.submitMxAction(input?input.value:'','input')});if(input)input.addEventListener('keydown',function(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();window.submitMxAction(input.value,'input')}})
})();
