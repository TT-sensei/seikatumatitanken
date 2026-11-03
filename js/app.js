(()=>{
'use strict';
const KEY="machitanken-save-v1",places=window.TOWN_PLACES||[],missions=window.TOWN_MISSIONS||[],$=id=>document.getElementById(id);
const initial={completed:[],points:0,discoveries:[],player:{x:50,y:90},visited:[]};
let state;try{state={...initial,...(JSON.parse(localStorage.getItem(KEY))||{})}}catch{state={...initial}}
state.completed=Array.isArray(state.completed)?state.completed:[];
state.discoveries=Array.isArray(state.discoveries)?state.discoveries:[];
state.visited=Array.isArray(state.visited)?state.visited:[];
state.player=state.player&&Number.isFinite(state.player.x)&&Number.isFinite(state.player.y)?state.player:{...initial.player};
let active=null,selected=null,answered=false,isWalking=false;
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(state))}catch(e){console.warn('保存できませんでした',e)}};
const placeById=id=>places.find(p=>p.id===id);
function render(){
 $('points').textContent=state.points;$('discoveries').textContent=state.discoveries.length;
 $('progress').textContent=state.completed.length+' / '+missions.length;
 $('markers').innerHTML=places.map(p=>{
  const ms=missions.filter(m=>m.placeId===p.id),done=ms.length&&ms.every(m=>state.completed.includes(m.id)),available=ms.some(m=>!state.completed.includes(m.id));
  const visited=state.visited.includes(p.id);
  return '<button class="marker '+(available?'mission':'')+' '+(done?'done':'')+' '+(visited?'visited':'')+'" style="left:'+p.x+'%;top:'+p.y+'%" data-place="'+p.id+'" aria-label="'+p.name+'へ行く"><span class="emoji">'+p.icon+'</span><span class="name">'+p.name+'</span></button>';
 }).join('');
 $('mission-list').innerHTML=missions.map(m=>{const p=placeById(m.placeId),done=state.completed.includes(m.id);return '<button class="mission-row" data-mission="'+m.id+'"><span class="mi-icon">'+(done?'🏅':m.icon)+'</span><span class="mi-copy"><b>'+m.title+'</b><small>'+(p?.name||'')+' ・ '+m.category+'</small></span><b>'+(done?'✓':'›')+'</b></button>'}).join('');
 const items=state.discoveries.slice(-4).reverse();
 $('notes').innerHTML=items.length?'<div class="chips">'+items.map(x=>'<span class="chip">✨ '+x+'</span>').join('')+'</div>':'ミッションをクリアして、発見を集めよう！';
 $('traveler').style.left=state.player.x+'%';$('traveler').style.top=state.player.y+'%';
}
function setMapStatus(message){$('map-status-text').textContent=message}
function clearRoute(){ $('route-path').setAttribute('d','');$('route-shadow').setAttribute('d','')}
function drawRoute(from,to){
 const x1=from.x*10,y1=from.y*7,x2=to.x*10,y2=to.y*7;
 const mx=(x1+x2)/2,my=(y1+y2)/2;
 const bend=(x2-x1)>=0?1:-1;
 const cx=mx+(Math.abs(y2-y1)>Math.abs(x2-x1)?bend*65:0);
 const cy=my+(Math.abs(x2-x1)>=Math.abs(y2-y1)?-45:0);
 const d='M '+x1+' '+y1+' Q '+cx+' '+cy+' '+x2+' '+y2;
 $('route-shadow').setAttribute('d',d);$('route-path').setAttribute('d',d);
}
function open(html){$('modal-content').innerHTML=html;$('backdrop').classList.remove('hidden')}
function close(){$('backdrop').classList.add('hidden');active=null}
function placeView(p){
 const m=missions.find(x=>x.placeId===p.id&&!state.completed.includes(x.id));
 const done=missions.some(x=>x.placeId===p.id)&&missions.filter(x=>x.placeId===p.id).every(x=>state.completed.includes(x.id));
 open('<div class="hero">'+p.icon+'</div><div class="label">みどりのまち・たんけん</div><h2>'+p.name+'</h2><p class="lead">'+p.description+'</p>'+(m?'<div class="question">✨ '+m.title+'<br><small>この場所でミッションにちょうせん！</small></div><button class="primary" id="start">ミッションをはじめる</button>':done?'<div class="question">🏅 この場所のミッションはクリア！</div><p class="lead">ほかの場所にも行ってみよう。新しい発見があるかもしれないよ。</p>':'<p class="lead">ここを見つけたよ！町の様子をよく見てみよう。</p>'));
 if(m)$('start').onclick=()=>start(m);
}
function travelTo(p){
 if(isWalking)return;
 isWalking=true;
 document.querySelectorAll('.marker').forEach(el=>el.classList.toggle('selected',el.dataset.place===p.id));
 drawRoute(state.player,p);
 setMapStatus(p.name+'へ歩いているよ……');
 $('traveler').style.left=p.x+'%';$('traveler').style.top=p.y+'%';
 window.setTimeout(()=>{
  state.player={x:p.x,y:p.y};if(!state.visited.includes(p.id))state.visited.push(p.id);save();
  isWalking=false;setMapStatus(p.name+'に着いたよ！まわりを探検してみよう。');
  document.querySelectorAll('.marker').forEach(el=>el.classList.toggle('selected',el.dataset.place===p.id));
  placeView(p);
 },1180);
}
function start(m){active=m;selected=null;answered=false;questionView()}
function questionView(){
 const m=active;
 open('<div class="hero">'+m.icon+'</div><div class="label">'+m.category+' ・ ミッション</div><h2>'+m.title+'</h2><p class="lead">'+m.intro+'</p><div class="question">'+m.question+'</div><div class="answers">'+m.choices.map((c,i)=>'<button class="answer '+(answered&&i===m.answer?'correct':'')+' '+(answered&&selected===i&&i!==m.answer?'wrong':'')+'" data-answer="'+i+'" '+(answered?'disabled':'')+'>'+['①','②','③','④'][i]+'　'+c+'</button>').join('')+'</div><button class="hint" id="hint">💡 ヒントをみる</button><div id="hint-area"></div><div id="feedback"></div><button class="primary" id="next" '+(!answered?'disabled':'')+'>'+(answered&&selected===m.answer?'つぎへ':'もう一度ちょうせん')+'</button>');
 document.querySelectorAll('[data-answer]').forEach(b=>b.onclick=()=>{
  selected=Number(b.dataset.answer);answered=true;questionView();const ok=selected===m.answer;
  $('feedback').innerHTML='<div class="feedback '+(ok?'good':'try')+'">'+(ok?'正解！ ':'おしい！もう一度考えてみよう。 ')+(ok?m.explanation:'ヒントも使えるよ。')+'</div>';
  $('next').disabled=false;$('next').textContent=ok?'つぎへ':'もう一度ちょうせん';
 });
 $('hint').onclick=()=>$('hint-area').innerHTML='<div class="hint-box">'+m.hint+'</div>';
 $('next').onclick=()=>{if(!answered)return;if(selected===m.answer)complete(m);else{selected=null;answered=false;questionView()}};
}
function complete(m){
 if(!state.completed.includes(m.id)){
  state.completed.push(m.id);state.points+=m.reward?.points||10;
  if(m.reward?.discovery&&!state.discoveries.includes(m.reward.discovery))state.discoveries.push(m.reward.discovery);
  save();render();
 }
 open('<div class="hero">🎉</div><div class="label">ミッション クリア！</div><h2>よくできたね！</h2><p class="lead">'+m.explanation+'</p><div class="question">⭐ '+(m.reward?.points||10)+'ポイント<br>📖「'+(m.reward?.discovery||'発見')+'」をノートに追加！</div><button class="primary" id="finish">町にもどる</button>');
 $('finish').onclick=()=>{close();setMapStatus('次はどこへ行こう？地図から場所をえらんでね。')};
}
function notes(){
 open('<div class="hero">📖</div><div class="label">あつめた はっけん</div><h2>はっけんノート</h2><p class="lead">ミッションで見つけたことが、ここに集まるよ。</p><div class="chips">'+(state.discoveries.length?state.discoveries.map(x=>'<span class="chip">✨ '+x+'</span>').join(''):'まだ発見がないよ。町を探検してみよう！')+'</div><button class="primary" id="finish">とじる</button>');
 $('finish').onclick=close;
}
$('markers').onclick=e=>{const b=e.target.closest('[data-place]');if(b){const p=placeById(b.dataset.place);if(p)travelTo(p)}};
$('mission-list').onclick=e=>{const b=e.target.closest('[data-mission]');if(b){const m=missions.find(x=>x.id===b.dataset.mission);if(m&&!state.completed.includes(m.id)){const p=placeById(m.placeId);if(p&&Math.hypot(state.player.x-p.x,state.player.y-p.y)>1){travelTo(p);return}start(m)}}};
$('open-notes').onclick=notes;$('close').onclick=close;
$('backdrop').onclick=e=>{if(e.target===$('backdrop'))close()};
$('help').onclick=()=>{open('<div class="hero">🧭</div><h2>あそびかた</h2><p class="lead">地図のマークをタップすると、その場所まで歩いていくよ。着いたら、町の様子を見たりミッションにちょうせんしたりしよう。クリアした場所にはしるしがつくよ。進みぐあいは、この端末に自動で保存されるよ。</p><button class="primary" id="finish">探検にもどる</button>');$('finish').onclick=close};
render();
setMapStatus('出発地点にいるよ。行ってみたい場所をえらぼう！');
})();