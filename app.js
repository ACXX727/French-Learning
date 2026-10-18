const $=s=>document.querySelector(s), esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let LESSONS=[],L=null,DATA=[],AUDIO={},KEY='',cats=[];
let state={cards:{},drafts:{},history:[]}, cat='全部主题',tab='learn',queue=[],pos=0,revealed=false,roundDone=0,baseTotal=0,repeats={},frVoice=null;
// L6 沿用最初的存储键，旧进度不丢；新课程各用各的键。
function storageKey(id){return id==='L6'?'lexique-l6-v1':'lexique-'+id.toLowerCase()+'-v1'}
function validState(s){return s&&s.cards&&typeof s.cards==='object'&&!Array.isArray(s.cards)&&s.drafts&&typeof s.drafts==='object'&&Array.isArray(s.history)&&Object.entries(s.cards).every(([id,c])=>DATA.some(d=>d.id===id)&&c&&Number.isFinite(c.stage)&&c.stage>=0&&c.stage<=5&&Number.isFinite(c.due)&&Number.isFinite(c.seen)&&typeof c.star==='boolean')&&Object.values(s.drafts).every(v=>typeof v==='string')&&s.history.every(h=>h&&typeof h.day==='string'&&typeof h.id==='string')}
function loadState(){state={cards:{},drafts:{},history:[]};try{const saved=JSON.parse(localStorage.getItem(KEY)||'null');if(validState(saved))state=saved}catch(e){$('#storageStatus').textContent=' · 本地存储不可用，请导出备份'}
 // 旧版 L6 的看图草稿按序号保存（0–2 是三张照片），现在按练习 id 保存
 if(L&&L.id==='L6')for(const [o,n] of [['0','photo-1'],['1','photo-2'],['2','photo-3']])if(state.drafts[o]!==undefined){if(state.drafts[n]===undefined)state.drafts[n]=state.drafts[o];delete state.drafts[o]}}
function save(){try{localStorage.setItem(KEY,JSON.stringify(state))}catch(e){toast('当前浏览器无法保存，请用“导出进度”备份。')}}
function cs(id){return state.cards[id]||{stage:0,due:0,seen:0,star:false}}
function toast(t){$('#toast').textContent=t;$('#toast').classList.remove('hidden');clearTimeout(window.toastTimer);window.toastTimer=setTimeout(()=>$('#toast').classList.add('hidden'),4500)}
// 课程文件是 lexiqueData({...}); 形式的脚本：用 <script> 加载，双击本地文件（file://）也能打开
let lessonCb=null;window.lexiqueData=d=>{if(lessonCb)lessonCb(d)};
let loadChain=Promise.resolve();
// 每次加载有自己的回调：上一个脚本的 onload 晚于下一次加载开始时，不能误清掉下一次的回调
function loadData(u){const run=()=>new Promise((res,rej)=>{const s=document.createElement('script');let done=false;const cb=d=>{done=true;lessonCb=null;res(d)};lessonCb=cb;const fail=()=>{s.remove();if(lessonCb===cb)lessonCb=null;if(!done)rej(Error('无法加载 '+u))};s.onload=()=>{if(done)s.remove();else fail()};s.onerror=fail;s.src=u+(location.protocol.startsWith('http')?'?t='+Date.now():'');document.head.appendChild(s)});return loadChain=loadChain.then(run,run)}
async function loadLesson(id){
 const meta=LESSONS.find(l=>l.id===id)||LESSONS[LESSONS.length-1];
 L=await loadData(meta.file);DATA=L.cards;AUDIO=L.audio||{};KEY=storageKey(L.id);
 try{localStorage.setItem('lexique-current',L.id)}catch(e){}
 if(location.hash.slice(1)!==L.id)history.replaceState(null,'','#'+L.id);
 stopAudio();loadState();cat='全部主题';freeScope=false;reviewScope=null;cats=[...new Set(DATA.map(d=>d.cat))];
 pIdx=Math.max(0,exercises().findIndex(x=>x.id===state.practiceAt));
 renderLessonChrome();renderCats();renderNotes();start();renderPractice();if(seg==='review')renderReview();
 if(tab==='library')renderLibrary();
}
function renderLessonChrome(){
 document.title=`GANGAN · ${L.id} ${L.title}`;
 $('#lesson').innerHTML=LESSONS.map(l=>`<option value="${esc(l.id)}"${l.id===L.id?' selected':''}>${esc(l.id+' '+l.title)}</option>`).join('');
 $('#lessonLabel').textContent='我的法语 · '+(L.label||L.id);$('#footerLesson').textContent='GANGAN · '+L.id;
 $('#lessonSource').innerHTML=L.source||'';
}
function renderNotes(){$('#lessonNotes').innerHTML=(L.notes||[]).map(n=>`<article class="panel"><h2>${esc(n.title)}</h2>${n.html}</article>`).join('')}
function renderCats(){$('#categories').innerHTML=['全部主题',...cats].map(c=>`<button class="cat ${cat===c?'active':''}" data-cat="${esc(c)}"><span>${esc(c)}</span><small>${c==='全部主题'?DATA.length:DATA.filter(d=>d.cat===c).length}</small></button>`).join('')}
function day(){const n=new Date();return n.getFullYear()+'-'+(n.getMonth()+1)+'-'+n.getDate()}
// 连续学习天数：所有课程共用，记在 lexique-days
function studyDays(){let s=[];try{s=JSON.parse(localStorage.getItem('lexique-days')||'[]')}catch(e){}return new Set([...(Array.isArray(s)?s:[]),...state.history.map(h=>h.day)])}
function markDay(){try{const s=studyDays();s.add(day());localStorage.setItem('lexique-days',JSON.stringify([...s].slice(-400)))}catch(e){}}
function streak(){const s=studyDays(),d=new Date(),key=x=>x.getFullYear()+'-'+(x.getMonth()+1)+'-'+x.getDate();if(!s.has(key(d)))d.setDate(d.getDate()-1);let n=0;while(s.has(key(d))){n++;d.setDate(d.getDate()-1)}return n}
function renderStats(){const seen=DATA.filter(d=>cs(d.id).seen>0).length, due=DATA.filter(d=>cs(d.id).seen&&cs(d.id).due<=Date.now()).length,today=new Set(state.history.filter(h=>h.day===day()).map(h=>h.id)).size,k=streak();$('#stats').innerHTML=[[DATA.length,'词汇与短语','#aba1e8'],[seen,'已学习','#77b6a2'],[due,'到期复习','#dfb171'],[today,k?`今日已练 · 连续 ${k} 天`:'今日已练','#90acd5']].map(([n,t,c])=>`<div class="stat"><i class="dot" style="background:${c}"></i><div><strong>${n}</strong><span>${t}</span></div></div>`).join('');
 const bd=$('#segBadge');bd.textContent=due;bd.classList.toggle('hidden',!due)}
function filtered(){return DATA.filter(d=>cat==='全部主题'||d.cat===cat)}
function shuffle(arr){for(let i=arr.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]]}return arr}
// 一个下拉框同时管卡片模式和范围：“只学收藏”用法语→中文模式；默认是到期复习 + 新词，没有到期卡时可以切到全部自由练习
// 复习模块启动的会话用 reviewScope：review 只看到期卡，weak 只练易错词
let freeScope=false,reviewScope=null,seg='study',rvFilter='all';
function scopeNow(){return reviewScope||($('#mode').value==='star'?'star':freeScope?'all':'due')}
function cardMode(){const v=$('#mode').value;return v==='star'?'read':v}
function isWeak(c){return c.seen>0&&(((c.lapse||0)>=1&&c.stage<3)||(c.seen>=2&&c.stage===0))}
function start(){const scope=scopeNow(),now=Date.now(),isDue=d=>cs(d.id).seen&&cs(d.id).due<=now,byDue=(x,y)=>cs(x.id).due-cs(y.id).due;let a=filtered();
 if(scope==='star')a=shuffle(a.filter(d=>cs(d.id).star));else if(scope==='due')a=[...a.filter(isDue).sort(byDue),...a.filter(d=>!cs(d.id).seen)];else if(scope==='review')a=a.filter(isDue).sort(byDue);else if(scope==='weak')a=shuffle(a.filter(d=>isWeak(cs(d.id))));else a=shuffle([...a]);
 queue=a.slice(0,10);pos=0;revealed=false;roundDone=0;baseTotal=queue.length;repeats={};renderCard()}
// 卡片配图三选一：color 色样 / img 单张图片 / art 拼图（atlas 名 + 序号，按 grid×grid 排列）
function art(d){
 const cap=d.caption?`<figcaption>${esc(d.caption)}</figcaption>`:'';
 if(d.color)return `<figure class="visual"><div class="color-swatch" style="background:${esc(d.color)}" role="img" aria-label="${esc(d.zh)}色样"></div><figcaption>颜色示例 · ${esc(d.colorLabel||d.term)}</figcaption></figure>`;
 if(d.img)return `<figure class="visual"><img class="ai-art" src="${esc(d.img)}" alt="${esc(d.zh)}" loading="lazy" style="object-fit:cover">${cap}</figure>`;
 if(!d.art||!L.atlases||!L.atlases[d.art[0]])return '';
 const [sheet,n]=d.art,g=L.grid||5,step=100/(g-1);
 return `<figure class="visual"><div class="ai-art" style="background-image:url('${esc(L.atlases[sheet])}');background-size:${g*100}% ${g*100}%;background-position:${n%g*step}% ${Math.floor(n/g)*step}%" role="img" aria-label="${esc(d.zh)}：教学插画"></div>${cap}</figure>`
}
function audioButtons(d){return `<button class="audio" data-speak="${d.id}">◖ 朗读</button><button class="audio" data-slow="${d.id}">慢速 0.7×</button>`}
function renderCard(){renderStats();$('#sessionLabel').textContent=cat+' · '+{due:'到期复习 + 新词',all:'自由练习',star:'收藏',review:'复习 · 到期卡',weak:'复习 · 易错词'}[scopeNow()]+' · 每轮 10 张';$('#sessionCount').textContent=`${Math.min(pos,queue.length)} / ${queue.length}`;$('#bar').style.width=(queue.length?pos/queue.length*100:0)+'%';if(pos>=queue.length){const sc=scopeNow(),none=!baseTotal;$('#card').innerHTML=`<div class="empty"><div style="font-size:45px">${none?'☕':'✦'}</div><h2>${none?({star:'还没有收藏的卡片',review:'到期的卡都复习完了',weak:'现在没有易错词'}[sc]||'到期的卡都复习完了'):'这一轮，完成了。'}</h2><p class="muted">${none?({star:'学习时点卡片右上角的 ☆，就能把难记的词收进来。',review:'很好！下次到期的词会出现在复习列表里。',weak:'答错过的词会自动记进易错词。'}[sc]||'可以来一轮自由练习，或者去右边练“看图表达”。'):`完成 ${baseTotal} 张词卡，共 ${pos} 次回忆。`}</p><p class="muted" style="font-size:12px">到期时间保存在本地；之后重新打开会自动筛选。</p><div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:18px">${reviewScope?(none?'<button class="primary" id="backReview">回到复习列表</button>':'<button class="primary" id="nextRound">继续复习</button><button id="backReview">回到复习列表</button>'):none&&sc==='due'?'<button class="primary" id="freeRound">全部自由练习</button><button id="nextRound">重新检查到期卡</button>':`<button class="primary" id="nextRound">${none?'重新检查':'继续下一轮'}</button>`}</div></div>`;return}
let d=queue[pos],mode=cardMode();$('#sessionCount').textContent=`${pos+1} / ${queue.length}`;let q=mode==='read'?`${art(d)}<div class="term">${esc(d.term)}</div><div class="ipa">/${esc(d.ipa)}/</div>${audioButtons(d)}`:mode==='reverse'?`<div style="font-size:12px;color:var(--muted);margin-top:45px">请用法语说出来</div><div class="term zh-title" style="margin-top:35px">${esc(d.zh)}</div><p class="muted" style="font-size:12px">包含冠词或完整搭配；形容词回忆阴阳性。</p>`:`<div style="font-size:48px;margin-top:20px;color:var(--purple)">◖</div><p>听一听，输入你听到的法语</p>${audioButtons(d)}<form id="spellForm" class="spelling"><input id="spellInput" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="法语拼写" placeholder="保留冠词与重音符号"><button class="primary" type="submit">检查</button></form><p id="spellFeedback" class="feedback" role="status"></p>`;
let ans=revealed?`<div class="answer">${mode!=='read'?art(d)+`<div class="term">${esc(d.term)}</div><p class="ipa">/${esc(d.ipa)}/</p>${audioButtons(d)}`:''}<div class="meaning">${esc(d.zh)}</div><div class="example"><div class="fr" lang="fr">${esc(d.ex)} <button class="audio" data-example="${d.id}" aria-label="朗读例句">◖</button></div><div class="cn">${esc(d.tr)}</div></div><div class="hint"><b>记忆线索 · MÉMO</b>${esc(d.hint)}</div></div>`:'';
$('#card').innerHTML=`<article class="flash"><div class="flash-top"><span class="pill">${esc(d.cat)}</span><span class="muted">${cs(d.id).seen?'复习':'初次学习'}</span><button class="star ${cs(d.id).star?'on':''}" data-star="${d.id}" aria-label="收藏或取消收藏" aria-pressed="${cs(d.id).star}">${cs(d.id).star?'★':'☆'}</button></div><div class="question${!revealed&&mode!=='spell'?' tappable':''}">${q}</div>${ans}<div class="actions">${revealed?'<button class="again" data-grade="again">没记住<small>本轮再练 · 10 分钟后</small></button><button class="hard" data-grade="hard">有点模糊<small>10 分钟后复习</small></button><button class="good" data-grade="good">记住了<small>'+nextLabel(d.id)+'</small></button>':'<button class="primary" id="reveal">想好了，揭晓答案 <small>先尝试回忆，不急着翻卡</small></button>'}</div></article>`;
if(mode==='spell'&&revealed){$('#spellForm').classList.add('hidden');$('#spellFeedback').textContent=window.spellMessage||'对照正确拼写，再评估熟悉度。'}
}
function nextLabel(id){return [1,3,7,14,30][Math.min(cs(id).stage,4)]+' 天后复习'}
function reveal(){if(pos>=queue.length||revealed)return;revealed=true;renderCard()}
function grade(g){if(!revealed||pos>=queue.length)return;const d=queue[pos],c={...cs(d.id)};c.seen++;if(g==='good'){c.due=Date.now()+[1,3,7,14,30][Math.min(c.stage,4)]*86400000;c.stage=Math.min(c.stage+1,5)}else{c.due=Date.now()+600000;c.stage=g==='again'?0:Math.max(0,c.stage-1);if(g==='again')c.lapse=(c.lapse||0)+1;if(g==='again'&&(repeats[d.id]||0)<2){queue.push(d);repeats[d.id]=(repeats[d.id]||0)+1}}state.cards[d.id]=c;state.history.push({day:day(),id:d.id});markDay();state.history=state.history.slice(-20000);save();pos++;revealed=false;window.spellMessage='';stopAudio();renderCard()}
function star(id){state.cards[id]={...cs(id),star:!cs(id).star};save();if(tab==='learn'){if(seg==='review')renderReview();else renderCard()}if(tab==='library')renderLibrary()}
// —— 复习模块：列出所有学过的词，按到期时间分组 ——
function setSeg(s){seg=s;$('#studyPane').classList.toggle('hidden',s!=='study');$('#reviewPane').classList.toggle('hidden',s!=='review');for(const [id,v] of [['#segStudy','study'],['#segReview','review']]){$(id).classList.toggle('on',s===v);$(id).setAttribute('aria-selected',s===v)}if(s==='review')renderReview()}
function whenLabel(due){const ms=due-Date.now();if(ms<=0)return '现在复习';const m=ms/6e4;if(m<60)return Math.ceil(m)+' 分钟后';const h=m/60;if(h<24)return Math.round(h)+' 小时后';return Math.round(h/24)+' 天后'}
function renderReview(){if(!L)return;const now=Date.now(),eod=new Date();eod.setHours(23,59,59,999);const e=eod.getTime(),C=d=>cs(d.id);
 const seen=filtered().filter(d=>C(d).seen>0),due=seen.filter(d=>C(d).due<=now),later=seen.filter(d=>C(d).due>now&&C(d).due<=e),week=seen.filter(d=>C(d).due>e&&C(d).due<=now+7*864e5),weak=seen.filter(d=>isWeak(C(d)));
 $('#rvSummary').innerHTML=[[due.length,'现在到期','due'],[later.length,'今天稍后',''],[week.length,'7 天内',''],[weak.length,'易错词','weak']].map(([n,t,k])=>`<div class="rv-stat ${k}"><strong>${n}</strong><span>${t}</span></div>`).join('');
 $('#rvStart').disabled=!due.length;$('#rvStart').textContent=due.length?`开始复习到期卡（${due.length}）`:'暂时没有到期卡';$('#rvWeakStart').disabled=!weak.length;$('#rvWeakStart').textContent=`练习易错词（${weak.length}）`;
 document.querySelectorAll('[data-rvf]').forEach(b=>{b.classList.toggle('on',b.dataset.rvf===rvFilter);b.setAttribute('aria-pressed',b.dataset.rvf===rvFilter)});
 if(!seen.length){$('#rvList').innerHTML=`<div class="empty"><div style="font-size:38px">🌱</div><h2>还没有学过的词</h2><p class="muted">先在“学习”里翻几张卡片，复习计划会自动出现在这里。</p><button class="primary" id="toStudy">去学习</button></div>`;return}
 const list=(rvFilter==='due'?due:rvFilter==='weak'?weak:rvFilter==='star'?seen.filter(d=>C(d).star):seen).slice().sort((a,b)=>C(a).due-C(b).due);
 const bucket=t=>t<=now?'现在到期':t<=e?'今天稍后':t<=e+864e5?'明天':t<=now+7*864e5?'7 天内':'更晚',groups=[];
 for(const d of list){const g=bucket(C(d).due);if(!groups.length||groups[groups.length-1][0]!==g)groups.push([g,[]]);groups[groups.length-1][1].push(d)}
 $('#rvList').innerHTML=groups.map(([g,ds])=>`<h3 class="rv-group">${g}<small>${ds.length}</small></h3><ul class="rv-ul">${ds.map(d=>{const c=C(d);return `<li class="rv-row"><button class="rv-say" data-speak="${d.id}" aria-label="朗读 ${esc(d.term)}">◖</button><div class="rv-main"><b lang="fr">${esc(d.term)}</b><span>${esc(d.zh)}</span></div><div class="rv-meta">${isWeak(c)?'<span class="rv-weak">易错</span>':''}<span class="rv-when${c.due<=now?' now':''}">${whenLabel(c.due)}</span><span class="rv-level" aria-label="熟练度 ${c.stage} / 5">${'●'.repeat(c.stage)}${'○'.repeat(5-c.stage)}</span></div><button class="star ${c.star?'on':''}" data-star="${d.id}" aria-label="收藏 ${esc(d.term)}" aria-pressed="${c.star}">${c.star?'★':'☆'}</button></li>`}).join('')}</ul>`).join('')||'<p class="muted rv-none">这个筛选下没有单词。</p>'}
function normalize(s){return s.toLowerCase().normalize('NFC').replace(/[’‘]/g,"'").replace(/[.!?]/g,'').replace(/\s+/g,' ').trim()}
function variants(d){return d.variants||d.term.split(' / ')}
function checkSpelling(e){e.preventDefault();let d=queue[pos],answer=$('#spellInput').value;if(!answer.trim()){toast('先输入听到的法语，或点击揭晓答案。');return}let ok=variants(d).some(v=>normalize(v)===normalize(answer));window.spellMessage=ok?'✓ 拼写正确！再确认你能说出意思。':'还差一点：你写的是“'+answer+'”。请对照下面的冠词、词尾与重音。';reveal()}
let activeAudio=null;
const canTTS='speechSynthesis' in window;
function stopAudio(){if(activeAudio){activeAudio.pause();activeAudio.currentTime=0;activeAudio=null}clearTimeout(ttsTimer);if(canTTS)speechSynthesis.cancel()}
function pickVoice(){if(!canTTS)return;const fr=speechSynthesis.getVoices().filter(v=>/^fr\b/i.test(v.lang.replace('_','-'))),frFR=fr.filter(v=>/fr[-_]FR/i.test(v.lang));frVoice=frFR.find(v=>/premium|enhanced|natural|neural|online|google/i.test(v.name))||frFR[0]||fr[0]||null;refreshVoices()}
// 有录音（AUDIO[文本] = 音频地址）就播录音，否则用系统法语语音
function speak(d,slow=false,example=false){
 const parts=example?[d.ex]:variants(d),t=parts.join(', '),clip=AUDIO[t];
 stopAudio();
 if(clip){const a=activeAudio=new Audio(clip);a.playbackRate=slow?.7:1;a.preservesPitch=true;a.play().catch(()=>{if(activeAudio===a){activeAudio=null;tts(parts,slow)}});return}
 tts(parts,slow);
}
// 录音不可用（未生成、离线且未缓存）时用系统法语语音；单词的几种形式逐个读，中间停顿一下
let ttsTimer=0;
function tts(parts,slow){
 if(!canTTS){toast('这个浏览器不支持朗读，请换用 Safari、Chrome 或 Edge。');return}
 let i=0;const next=()=>{const u=new SpeechSynthesisUtterance(parts[i]);u.lang=frVoice?frVoice.lang:'fr-FR';if(frVoice)u.voice=frVoice;u.rate=slow?.7:.95;
  u.onend=()=>{if(++i<parts.length)ttsTimer=setTimeout(next,slow?800:600)};
  u.onerror=e=>{if(e.error!=='canceled'&&e.error!=='interrupted')toast('朗读失败：请确认设备已安装法语语音，并打开声音。')};
  speechSynthesis.speak(u)};
 next();
}
function refreshVoices(){const n=Object.keys(AUDIO).length,name=frVoice?frVoice.name:'';const msg=n?`标准法语录音 · ${n} 条`:!canTTS?'当前浏览器不支持朗读':frVoice?`系统法语语音 · ${name}`:'未检测到法语语音，将尝试默认语音';$('#audioSetupStatus').innerHTML='<b>当前状态：</b>'+esc(msg);$('#voiceStatus').textContent=msg;const b=$('#audioBanner'),ok=n||frVoice;b.textContent='◖ '+(n?'标准录音':frVoice?'系统语音':'朗读设置');b.title=msg+(ok?'':' · 点此查看如何安装');b.setAttribute('aria-label','朗读：'+b.title);b.classList.toggle('warn',!ok);}
function showAudioSetup(){$('#tips').open=false;setTab('notes');$('#audioSetup').scrollIntoView({behavior:'smooth',block:'start'})}
function renderLibrary(){const q=$('#search').value.toLowerCase();let list=filtered().filter(d=>(!$('#starOnly').checked||cs(d.id).star)&&[d.term,d.zh,d.hint,d.ex].join(' ').toLowerCase().includes(q));$('#resultCount').textContent=list.length+' 张卡片';$('#wordGrid').innerHTML=list.map(d=>`<article class="word"><div class="word-top"><span class="pill">${esc(d.cat)}</span><button class="star ${cs(d.id).star?'on':''}" data-star="${d.id}" aria-label="收藏 ${esc(d.term)}" aria-pressed="${cs(d.id).star}">${cs(d.id).star?'★':'☆'}</button></div>${art(d)}<h3 lang="fr">${esc(d.term)}</h3><div class="ipa">/${esc(d.ipa)}/</div><p>${esc(d.zh)}</p>${audioButtons(d)}<details><summary>例句与记忆法</summary><p lang="fr">${esc(d.ex)} <button class="audio" data-example="${d.id}">◖</button></p><p class="muted">${esc(d.tr)}</p><p>${esc(d.hint)}</p></details></article>`).join('')||'<p class="muted">没有匹配的词，试试其他关键词或主题。</p>'}
function exercises(){return (L&&L.practice&&L.practice.items)||[]}
// —— AI 纠错（DeepSeek）：Key 只存在本机浏览器，只发给 api.deepseek.com ——
const AI_KEY='lexique-ai',AI_BASE='https://api.deepseek.com';let aiResults={},aiRuns={};
function aiConf(){for(const s of [localStorage,sessionStorage]){try{const c=JSON.parse(s.getItem(AI_KEY)||'null');if(c&&c.key)return c}catch(e){}}return null}
function aiSave(c,remember){try{localStorage.removeItem(AI_KEY);sessionStorage.removeItem(AI_KEY);if(c)(remember?localStorage:sessionStorage).setItem(AI_KEY,JSON.stringify(c))}catch(e){toast('浏览器不允许保存，Key 只在本次打开时有效。')}renderAiLogin()}
function renderAiLogin(){const c=aiConf(),b=$('#aiLogin');b.textContent=c?'✦ AI 已连接':'✦ AI 纠错';b.classList.toggle('on',!!c);$('#aiConnected').classList.toggle('hidden',!c);$('#aiForm').classList.toggle('hidden',!!c);if(c)$('#aiModel').textContent=c.model}
function openAiDialog(msg){renderAiLogin();$('#aiError').textContent=msg||'';$('#aiDialog').showModal();if(!aiConf())setTimeout(()=>$('#aiKeyInput').focus(),50)}
function aiErrorText(status){return {401:'API Key 无效或已失效，请重新填写。',402:'DeepSeek 账户余额不足，请到 platform.deepseek.com 充值。',429:'请求太频繁，稍等几秒再试。'}[status]||(status>=500?'DeepSeek 服务繁忙，请稍后再试。':`DeepSeek 返回错误（${status}）。`)}
async function aiConnect(e){e.preventDefault();const key=$('#aiKeyInput').value.trim(),btn=$('#aiConnectBtn');$('#aiError').textContent='';if(!/^sk-\S{10,}$/.test(key)){$('#aiError').textContent='API Key 一般以 sk- 开头，请检查是否复制完整。';return}
 btn.disabled=true;btn.textContent='正在验证…';
 try{const r=await fetch(AI_BASE+'/models',{headers:{Authorization:'Bearer '+key}});if(!r.ok){$('#aiError').textContent=aiErrorText(r.status);return}
  const ids=((await r.json()).data||[]).map(m=>m.id),model=ids.includes('deepseek-chat')?'deepseek-chat':ids.find(x=>/chat/.test(x))||ids[0]||'deepseek-chat';
  aiSave({key,model},$('#aiRemember').checked);$('#aiKeyInput').value='';$('#aiDialog').close();toast('已连接 DeepSeek，可以在“看图表达”里使用 AI 纠错了。')}
 catch(err){$('#aiError').textContent='连不上 DeepSeek：请检查网络（这个功能需要联网）。'}
 finally{btn.disabled=false;btn.textContent='连接'}}
// 词级差异：删掉的用删除线，新加的用下划线
function diffHtml(a,b){const tok=s=>s.match(/\s+|[\p{L}\p{M}\d'’-]+|[^\s\p{L}\p{M}\d'’-]/gu)||[],x=tok(a),y=tok(b),n=x.length,m=y.length;
 if(n*m>250000)return esc(b);const dp=Array.from({length:n+1},()=>new Uint16Array(m+1));for(let i=n-1;i>=0;i--)for(let j=m-1;j>=0;j--)dp[i][j]=x[i]===y[j]?dp[i+1][j+1]+1:Math.max(dp[i+1][j],dp[i][j+1]);
 let i=0,j=0,out=[];const push=(t,s)=>{const last=out[out.length-1];if(last&&last[0]===t)last[1]+=s;else out.push([t,s])};
 while(i<n&&j<m){if(x[i]===y[j]){push('=',x[i]);i++;j++}else if(dp[i+1][j]>=dp[i][j+1])push('-',x[i++]);else push('+',y[j++])}while(i<n)push('-',x[i++]);while(j<m)push('+',y[j++]);
 return out.map(([t,s])=>t==='='?esc(s):/^\s+$/.test(s)?(t==='+'?esc(s):''):t==='-'?`<del>${esc(s)}</del>`:`<ins>${esc(s)}</ins>`).join('')}
function fmtLine(s){return esc(s).replace(/「([^」]*)」/g,'<b>「$1」</b>')}
function aiRender(text,original,done){const parts=text.replace(/^\s*修改后[:：]\s*/,'').split(/\n\s*-{3,}\s*\n?/),fixed=(parts[0]||'').trim(),issues=parts[1],tip=parts[2];
 const same=done||parts.length>1?fixed.replace(/\s+/g,' ')===original.trim().replace(/\s+/g,' '):false;
 let h=`<div class="ai-block"><div class="ai-label">${parts.length>1?(same?'✓ 没有发现需要修改的地方':'修改建议'):'正在批改…'}</div><p class="ai-fixed" lang="fr">${parts.length>1?(same?esc(fixed):diffHtml(original,fixed)):esc(fixed)+'<span class="ai-caret"></span>'}</p></div>`;
 if(issues!==undefined){const items=issues.split('\n').map(s=>s.replace(/^\s*[-•*\d.、]+\s*/,'').trim()).filter(Boolean);h+=`<div class="ai-block"><div class="ai-label">问题说明</div>${items.length?`<ul class="ai-issues">${items.map(s=>`<li>${fmtLine(s)}</li>`).join('')}</ul>`:''}${parts.length===2&&!done?'<span class="ai-caret"></span>':''}</div>`}
 if(tip!==undefined)h+=`<div class="ai-block ai-tip"><div class="ai-label">小建议</div><p>${fmtLine(tip.trim())}${done?'':'<span class="ai-caret"></span>'}</p></div>`;
 return h}
// 批改结果按练习保存：批改中切到别的图也不会丢，切回来继续看到进度
async function aiCheck(){const c=aiConf();if(!c){openAiDialog();return}
 const x=pItem(),k=pKey(x),text=$('#pmText').value.trim();
 if(!text){toast('先用法语写下你的描述，再让 AI 纠错。');$('#pmText').focus();return}
 if(aiRuns[k])aiRuns[k].abort();const ctl=aiRuns[k]=new AbortController();
 const here=()=>pItem()&&pKey(pItem())===k,show=h=>{aiResults[k]=h;if(here())$('#pmResult').innerHTML=h},setBtn=()=>{if(here()){const r=aiRuns[k]===ctl;$('#pmCheck').disabled=r;$('#pmCheck').textContent=r?'批改中…':'✦ AI 纠错'}};
 setBtn();show('<div class="ai-block ai-wait"><div class="ai-shimmer"></div><div class="ai-shimmer short"></div></div>');
 const sys='你是耐心、专业的法语老师。学生是中文母语的 A1–A2 法语初学者，正在练习用 être / avoir / porter 等句型描述人物外貌和穿着。\n请批改学生的法语：拼写和重音、名词阴阳性与冠词、形容词性数配合、动词变位、句型与搭配。只改真正的错误，尽量保留学生原本的用词和意思，不要整句重写，不要因为风格不同而修改。\n严格按下面的格式输出，不要输出任何其他内容，不要用 Markdown 标记：\n修改后：<修改后的完整法语原文；如果完全正确就原样照抄>\n---\n- 「原来的写法」→「改正后的写法」：一句中文解释用到的语法规则\n（每个错误一行；没有错误就只写一行：- 没有发现错误）\n---\n<一句中文鼓励，再给一个让描述更丰富的小建议，可以附一个简短的法语例句>';
 const user=`题目：${x.ask||''}\n答题要点：${(x.points||[]).join('；')}\n句型提示：${(x.frame||'').replace(/\n/g,' / ')}\n参考答案（学生看不到，你只用来判断内容是否回答了题目、是否和图片相符，不要求学生和它一样）：${x.fr}（${x.zh}）\n\n学生的回答：\n${text}\n\n如果学生没有回答到题目的某个要点，或者内容和图片不符，请在“问题说明”里用一行指出（这一行不需要「→」格式）。如果句子里还留着句型里的“…”没有填，提醒学生补全。`;
 let acc='',started=false;
 try{const r=await fetch(AI_BASE+'/chat/completions',{method:'POST',signal:ctl.signal,headers:{'Content-Type':'application/json',Authorization:'Bearer '+c.key},body:JSON.stringify({model:c.model,stream:true,temperature:.2,max_tokens:900,messages:[{role:'system',content:sys},{role:'user',content:user}]})});
  if(!r.ok){if(r.status===401){aiSave(null);openAiDialog(aiErrorText(401))}throw Object.assign(Error(aiErrorText(r.status)),{shown:true})}
  const rd=r.body.getReader(),dec=new TextDecoder();let buf='',frame=0;
  const paint=()=>{frame=0;show(aiRender(acc,text,false))};
  for(;;){const {value,done}=await rd.read();if(done)break;buf+=dec.decode(value,{stream:true});const lines=buf.split('\n');buf=lines.pop();
   for(const ln of lines){const s=ln.trim();if(!s.startsWith('data:'))continue;const p=s.slice(5).trim();if(p==='[DONE]')continue;try{const t=JSON.parse(p).choices?.[0]?.delta?.content;if(t){acc+=t;started=true;if(!frame)frame=setTimeout(paint,40)}}catch(e){}}}
  if(frame)clearTimeout(frame);
  if(!acc.trim())throw Object.assign(Error('AI 没有返回内容，请再试一次。'),{shown:true});
  show(aiRender(acc,text,true)+`<div class="ai-foot">由 DeepSeek 生成，仅供参考</div>`)}
 catch(err){if(err.name==='AbortError')return;show(`<div class="ai-block ai-err">${esc(err.shown?err.message:'连不上 DeepSeek：请检查网络（这个功能需要联网）。')}${started?'':' <button class="link" id="pmRetry">重试</button>'}</div>`)}
 finally{if(aiRuns[k]===ctl){delete aiRuns[k];setBtn()}}}
// —— 看图表达模块：一次一张图，左右切换 ——
let pIdx=0;
function pItem(){return exercises()[pIdx]}
function pKey(x){return L.id+':'+x.id}
function pDone(x){return !!(state.drafts[x.id]||'').trim()}
function renderPractice(){if(!L)return;const items=exercises(),box=$('#practice');renderHandleCount();box.classList.toggle('pm-empty',!items.length);if(!items.length){$('#pmTitle').textContent='这一课还没有看图练习';return}
 pIdx=Math.min(Math.max(pIdx,0),items.length-1);const x=items[pIdx],k=pKey(x);
 $('#pmTitle').textContent=x.title||`练习 ${pIdx+1}`;$('#pmCount').textContent=`${pIdx+1} / ${items.length}`;$('#pmPrev').disabled=pIdx===0;$('#pmNext').disabled=pIdx===items.length-1;
 const img=$('#pmImg');img.src=x.img;img.alt=`${x.title||'看图练习'}：${x.zh}`;$('#pmAsk').textContent=x.ask||x.task||'';$('#pmPoints').innerHTML=(x.points||[]).map(s=>`<li>${esc(s)}</li>`).join('');$('#pmFrame').textContent=x.frame||'';$('.pm-frame').classList.toggle('hidden',!x.frame);
 $('#pmWords').innerHTML=(x.words||[]).map(id=>DATA.find(d=>d.id===id)).filter(Boolean).map(d=>`<button class="wchip" data-speak="${d.id}" title="点一下听发音"><b lang="fr">${esc(d.term)}</b><span>${esc(d.zh)}</span></button>`).join('');
 const ta=$('#pmText');ta.value=state.drafts[x.id]||'';ta.placeholder='照着上面的句型，用法语回答问题…';
 $('#pmRefFr').textContent=x.fr;$('#pmRefZh').textContent=x.zh;$('#pmRefBox').classList.add('hidden');$('#pmRef').setAttribute('aria-expanded','false');$('#pmRef').textContent='参考答案';
 $('#pmResult').innerHTML=aiResults[k]||'';const run=!!aiRuns[k];$('#pmCheck').disabled=run;$('#pmCheck').textContent=run?'批改中…':'✦ AI 纠错';
 $('#pmDots').innerHTML=items.map((y,i)=>`<button role="tab" class="pm-dot${i===pIdx?' on':''}${pDone(y)?' done':''}" data-pm="${i}" aria-selected="${i===pIdx}" aria-label="${i+1}. ${esc(y.title||'')}${pDone(y)?'（已写）':''}" title="${esc(y.title||'')}"></button>`).join('')}
function renderHandleCount(){const items=exercises();$('#pmHandleCount').textContent=items.length?`${items.filter(pDone).length}/${items.length}`:'';$('#pmHandle').setAttribute('aria-label',`看图表达，已写 ${items.filter(pDone).length} / ${items.length} 组`)}
function goPractice(i){pIdx=i;state.practiceAt=exercises()[i]?.id;save();renderPractice()}
function setTab(t){tab=t;['learn','library','notes'].forEach(x=>$('#'+x).classList.toggle('hidden',x!==t));document.querySelectorAll('[data-tab]').forEach(b=>{b.classList.toggle('active',b.dataset.tab===t);b.setAttribute('aria-current',b.dataset.tab===t?'page':'false')});if(!L)return;if(t==='library')renderLibrary();}
// 宽屏时看图表达固定在右侧，不需要单独的标签页
// 看图表达抽屉：默认收起；打开时焦点进面板，关闭时回到把手
function setPractice(open){const p=$('#practice'),h=$('#pmHandle');document.body.classList.toggle('pm-open',open);h.setAttribute('aria-expanded',open);p.inert=!open;p.setAttribute('aria-hidden',!open);
 if(open){renderPractice();setTimeout(()=>$('#pmClose').focus({preventScroll:true}),60)}else if(p.contains(document.activeElement))h.focus({preventScroll:true})}
$('#pmHandle').onclick=()=>setPractice(true);$('#pmClose').onclick=$('#pmScrim').onclick=()=>setPractice(false);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.body.classList.contains('pm-open')&&!$('#aiDialog').open&&!$('#tips').open)setPractice(false)});
document.addEventListener('click',e=>{let b=e.target.closest('button');if(!b){if(e.target.closest('.question.tappable')&&!e.target.closest('input,form,a'))reveal();return}if(b.dataset.tab)setTab(b.dataset.tab);if(!L)return;if(b.dataset.cat){cat=b.dataset.cat;renderCats();if(tab==='practice'||tab==='notes')setTab('learn');start();if(tab==='library')renderLibrary()}if(b.dataset.star)star(b.dataset.star);if(b.dataset.grade)grade(b.dataset.grade);if(['reveal'].includes(b.id))reveal();if(['restart','nextRound'].includes(b.id))start();if(b.id==='freeRound'){freeScope=true;start()}if(b.dataset.speak||b.dataset.slow||b.dataset.example){let id=b.dataset.speak||b.dataset.slow||b.dataset.example;speak(DATA.find(d=>d.id===id),!!b.dataset.slow,!!b.dataset.example)}
 // 看图表达
 if(b.id==='pmPrev'&&pIdx>0)goPractice(pIdx-1);if(b.id==='pmNext'&&pIdx<exercises().length-1)goPractice(pIdx+1);if(b.dataset.pm!==undefined)goPractice(Number(b.dataset.pm));
 if(b.id==='pmCheck'||b.id==='pmRetry')aiCheck();
 // 把句型填进输入框，并选中第一个“…”，直接打字就能替换
 if(b.id==='pmUseFrame'&&pItem()&&pItem().frame){const ta=$('#pmText'),cur=ta.value.replace(/\s+$/,''),at=cur?cur.length+1:0;ta.value=(cur?cur+'\n':'')+pItem().frame;ta.dispatchEvent(new Event('input',{bubbles:true}));const i=ta.value.indexOf('…',at);ta.focus();if(i>=0)ta.setSelectionRange(i,i+1)}if(b.id==='pmRefSpeak'&&pItem())speak({ex:pItem().fr},false,true);
 if(b.id==='pmRef'){const box=$('#pmRefBox'),open=box.classList.toggle('hidden')===false;b.setAttribute('aria-expanded',open);b.textContent=open?'收起参考':'参考答案'}
 // 复习
 if(b.id==='segStudy')setSeg('study');if(b.id==='segReview')setSeg('review');
 if(b.id==='rvStart'||b.id==='rvWeakStart'){reviewScope=b.id==='rvStart'?'review':'weak';setSeg('study');start()}
 if(b.id==='backReview'){reviewScope=null;start();setSeg('review')}if(b.id==='toStudy')setSeg('study');
 if(b.dataset.rvf){rvFilter=b.dataset.rvf;renderReview()}
 if(b.dataset.cat&&seg==='review')renderReview()});
document.addEventListener('submit',e=>{if(e.target.id==='spellForm')checkSpelling(e)});document.addEventListener('input',e=>{if(e.target.id==='pmText'&&pItem()){const x=pItem();state.drafts[x.id]=e.target.value;save();const dot=document.querySelector(`[data-pm="${pIdx}"]`);if(dot)dot.classList.toggle('done',pDone(x));renderHandleCount()}});
let lastMode='read';$('#mode').onchange=e=>{const v=e.target.value,scopeChanged=v==='star'||lastMode==='star'||reviewScope;lastMode=v;revealed=false;window.spellMessage='';if(scopeChanged){freeScope=false;reviewScope=null;start()}else renderCard()};$('#search').oninput=renderLibrary;$('#starOnly').onchange=renderLibrary;
$('#lesson').onchange=e=>loadLesson(e.target.value).catch(()=>toast('课程加载失败，请检查网络。'));
window.addEventListener('hashchange',()=>{const id=location.hash.slice(1);if(L&&id!==L.id&&LESSONS.some(l=>l.id===id))loadLesson(id).catch(()=>toast('课程加载失败，请检查网络。'))});
document.addEventListener('keydown',e=>{if(['INPUT','TEXTAREA','SELECT','BUTTON','SUMMARY'].includes(e.target.tagName)||tab!=='learn'||seg!=='study'||!L||e.ctrlKey||e.metaKey||e.altKey||e.repeat)return;if(e.code==='Space'){e.preventDefault();reveal()}if(['1','2','3'].includes(e.key))grade({'1':'again','2':'hard','3':'good'}[e.key]);if(e.key.toLowerCase()==='r'&&queue[pos])speak(queue[pos])});
$('#export').onclick=()=>{if(!L)return;const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),a=document.createElement('a'),u=URL.createObjectURL(blob);a.href=u;a.download=`GANGAN-${L.id}-学习进度.json`;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)};$('#import').onclick=()=>$('#importFile').click();$('#importFile').onchange=async e=>{const f=e.target.files[0];if(!f||!L)return;try{if(f.size>5000000)throw Error();const incoming=JSON.parse(await f.text());if(!validState(incoming))throw Error();if(confirm(`将用备份替换 ${L.id} 的学习进度和看图练习草稿。继续吗？`)){state=incoming;save();start();renderLibrary();renderPractice();toast('学习进度已恢复。')}}catch(err){toast(`文件格式不正确，请选择 ${L.id} 导出的进度 JSON。`)}e.target.value=''};
$('#aiLogin').onclick=()=>openAiDialog();$('#aiForm').onsubmit=aiConnect;$('#aiCancel').onclick=$('#aiDone').onclick=$('#aiClose').onclick=()=>$('#aiDialog').close();
$('#aiLogout').onclick=()=>{aiSave(null);aiResults={};toast('已退出，Key 已从这台设备删除。')};$('#aiShow').onclick=e=>{const t=$('#aiKeyInput');t.type=t.type==='password'?'text':'password';e.target.textContent=t.type==='password'?'显示':'隐藏'};
$('#aiDialog').addEventListener('click',e=>{if(e.target.id==='aiDialog')e.target.close()});
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)&&e.target.id==='pmText'){e.preventDefault();aiCheck()}});
renderAiLogin();
// 提示面板：点外面或按 Esc 收起
document.addEventListener('pointerdown',e=>{const t=$('#tips');if(t.open&&!t.contains(e.target))t.open=false});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('#tips').open){$('#tips').open=false;$('#tips summary').focus()}});
$('#audioBanner').onclick=showAudioSetup;$('#audioSetupSide').onclick=showAudioSetup;refreshVoices();pickVoice();if(canTTS)speechSynthesis.addEventListener('voiceschanged',pickVoice);setInterval(()=>{if(L)renderStats()},60000);
(async()=>{try{const idx=await loadData('lessons/index.js');LESSONS=idx.lessons;let want=location.hash.slice(1);if(!LESSONS.some(l=>l.id===want)){try{want=localStorage.getItem('lexique-current')}catch(e){}}if(!LESSONS.some(l=>l.id===want))want=idx.default;await loadLesson(want);refreshVoices()}catch(e){$('#card').innerHTML='<div class="empty"><h2>课程数据加载失败</h2><p class="muted">请检查网络后刷新。如果是从本地文件夹打开，请确认 index.html 旁边的 lessons 文件夹完整。</p><p class="muted" style="font-size:11px">'+esc(e&&e.message||e)+'</p></div>'}})();
if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('sw.js').catch(()=>{});
