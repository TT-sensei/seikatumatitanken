(()=>{
'use strict';
const KEY="machitanken-save-v1",places=window.TOWN_PLACES||[],missions=window.TOWN_MISSIONS||[],$=id=>document.getElementById(id);
const initial={completed:[],points:0,discoveries:[],player:{x:50,y:90},visited:[],reflections:[],townNotes:[]};
let state;try{state={...initial,...(JSON.parse(localStorage.getItem(KEY))||{})}}catch{state={...initial}}
for(const k of ["completed","discoveries","visited","reflections","townNotes"])if(!Array.isArray(state[k]))state[k]=[];
state.player=state.player&&Number.isFinite(state.player.x)&&Number.isFinite(state.player.y)?state.player:{...initial.player};
let active=null,selected=null,answered=false,isWalking=false,selectedCategory="すべて";
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(state))}catch(e){console.warn("保存できませんでした",e)}};
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const rubyMap={"横断歩道":"おうだんほどう","自動販売機":"じどうはんばいき","図書館":"としょかん","郵便局":"ゆうびんきょく","消防署":"しょうぼうしょ","交番":"こうばん","生き物":"いきもの","自然":"しぜん","観察":"かんさつ","植物":"しょくぶつ","季節":"きせつ","標識":"ひょうしき","安全":"あんぜん","道路":"どうろ","信号":"しんごう","歩道":"ほどう","車道":"しゃどう","消火栓":"しょうかせん","電柱":"でんちゅう","側溝":"そっこう","郵便":"ゆうびん","配達":"はいたつ","地域":"ちいき","環境":"かんきょう","分別":"ぶんべつ","資源":"しげん","公園":"こうえん","遊具":"ゆうぐ","植物":"しょくぶつ","葉っぱ":"はっぱ","野菜":"やさい","仕事":"しごと","施設":"しせつ","町":"まち","場所":"ばしょ","生き物":"いきもの","季節":"きせつ","消防車":"しょうぼうしゃ","警察官":"けいさつかん","点字":"てんじ","反射材":"はんしゃざい"};
function rich(s){let out=esc(s);for(const [word,reading] of Object.entries(rubyMap).sort((a,b)=>b[0].length-a[0].length))out=out.split(word).join('<ruby>'+word+'<rt>'+reading+'</rt></ruby>');return out}
const placeById=id=>places.find(p=>p.id===id);
const typeName=t=>({quiz:"クイズ",observe:"見つけて記録",think:"考えて記録",compare:"くらべてみよう"}[t]||"ミッション");
function render(){
 $("points").textContent=state.points;$("discoveries").textContent=state.discoveries.length;
 $("progress").textContent=state.completed.length+" / "+missions.length;
 $("markers").innerHTML=places.map(p=>{
  const ms=missions.filter(m=>m.placeId===p.id),done=ms.length&&ms.every(m=>state.completed.includes(m.id)),available=ms.some(m=>!state.completed.includes(m.id)),visited=state.visited.includes(p.id);
  return '<button class="marker '+(available?"mission ":"")+(done?"done ":"")+(visited?"visited ":"")+'" style="left:'+p.x+'%;top:'+p.y+'%" data-place="'+esc(p.id)+'" aria-label="'+esc(p.name)+'へ行く"><span class="emoji">'+p.icon+'</span><span class="name">'+rich(p.name)+'</span></button>';
 }).join("");
 const cats=["すべて",...new Set(missions.map(m=>m.category))];
 const filtered=missions.filter(m=>selectedCategory==="すべて"||m.category===selectedCategory);
 $("mission-list").innerHTML='<select id="mission-filter" aria-label="分野をえらぶ">'+cats.map(c=>'<option '+(c===selectedCategory?"selected":"")+'>'+esc(c)+'</option>').join("")+'</select>'+filtered.map(m=>{const p=placeById(m.placeId),done=state.completed.includes(m.id);return '<button class="mission-row" data-mission="'+esc(m.id)+'"><span class="mi-icon">'+(done?"🏅":m.icon)+'</span><span class="mi-copy"><b>'+rich(m.title)+'</b><small>'+rich(p?.name||"")+' ・ '+rich(m.category)+' ・ '+typeName(m.type)+'</small></span><b>'+(done?"✓":"›")+'</b></button>'}).join("");
 const items=state.discoveries.slice(-4).reverse();
 $("notes").innerHTML=items.length?'<div class="chips">'+items.map(x=>'<span class="chip">✨ '+rich(x)+'</span>').join("")+'</div>':"ミッションをクリアして、発見を集めよう！";
 $("traveler").style.left=state.player.x+"%";$("traveler").style.top=state.player.y+"%";
}
function setMapStatus(message){$("map-status-text").textContent=message}
function drawRoute(from,to){const x1=from.x*10,y1=from.y*7,x2=to.x*10,y2=to.y*7,mx=(x1+x2)/2,my=(y1+y2)/2,bend=(x2-x1)>=0?1:-1,cx=mx+(Math.abs(y2-y1)>Math.abs(x2-x1)?bend*65:0),cy=my+(Math.abs(x2-x1)>=Math.abs(y2-y1)?-45:0),d="M "+x1+" "+y1+" Q "+cx+" "+cy+" "+x2+" "+y2;$("route-shadow").setAttribute("d",d);$("route-path").setAttribute("d",d)}
function open(html){$("modal-content").innerHTML=html;$("backdrop").classList.remove("hidden")}
function close(){$("backdrop").classList.add("hidden");active=null}
function placeView(p){
 const ms=missions.filter(x=>x.placeId===p.id&&!state.completed.includes(x.id));
 open('<div class="hero">'+p.icon+'</div><div class="label">みどりのまち・たんけん</div><h2>'+rich(p.name)+'</h2><p class="lead">'+rich(p.description)+'</p>'+(ms.length?'<div class="question">✨ この場所のミッション '+ms.length+'こ</div>'+ms.slice(0,3).map(m=>'<button class="mission-row" data-start="'+esc(m.id)+'"><span class="mi-icon">'+m.icon+'</span><span class="mi-copy"><b>'+rich(m.title)+'</b><small>'+typeName(m.type)+'</small></span><b>›</b></button>').join(""):'<div class="question">🏅 この場所のミッションはクリア！</div><p class="lead">ほかの場所にも行ってみよう。</p>'));
 $("modal-content").querySelectorAll("[data-start]").forEach(b=>b.onclick=()=>{const m=missions.find(x=>x.id===b.dataset.start);if(m)start(m)});
}
function travelTo(p,afterArrival){
 if(isWalking)return;isWalking=true;
 document.querySelectorAll(".marker").forEach(el=>el.classList.toggle("selected",el.dataset.place===p.id));
 drawRoute(state.player,p);setMapStatus(p.name+"へ歩いているよ……");
 $("traveler").style.left=p.x+"%";$("traveler").style.top=p.y+"%";
 window.setTimeout(()=>{state.player={x:p.x,y:p.y};if(!state.visited.includes(p.id))state.visited.push(p.id);save();isWalking=false;setMapStatus(p.name+"に着いたよ！まわりを探検してみよう。");document.querySelectorAll(".marker").forEach(el=>el.classList.toggle("selected",el.dataset.place===p.id));if(typeof afterArrival==="function")afterArrival();else placeView(p)},1180);
}
function start(m){active=m;selected=null;answered=false;questionView()}
function questionView(){
 const m=active,free=m.type==="observe"||m.type==="think"||m.type==="compare";
 const answers=free?'<textarea id="reflection-input" rows="3" placeholder="'+esc(m.placeholder||"気づいたことを書いてね。")+'"></textarea>':'<div class="answers">'+m.choices.map((c,i)=>'<button class="answer '+(answered&&i===m.answer?"correct ":"")+(answered&&selected===i&&i!==m.answer?"wrong":"")+'" data-answer="'+i+'" '+(answered?"disabled":"")+'>'+["①","②","③","④"][i]+'　'+rich(c)+'</button>').join("")+'</div>';
 open('<div class="hero">'+m.icon+'</div><div class="label">'+rich(m.category)+' ・ '+typeName(m.type)+'</div><h2>'+rich(m.title)+'</h2><p class="lead">'+rich(m.intro)+'</p><div class="question">'+rich(m.question)+'</div>'+answers+'<button class="hint" id="hint">💡 ヒントをみる</button><div id="hint-area"></div><div id="feedback"></div><button class="primary" id="next" '+(!free&&!answered?"disabled":"")+'>'+(free?"記録してクリア":"つぎへ")+'</button>');
 if(!free)document.querySelectorAll("[data-answer]").forEach(b=>b.onclick=()=>{selected=Number(b.dataset.answer);answered=true;questionView();const ok=selected===m.answer;$("feedback").innerHTML='<div class="feedback '+(ok?"good":"try")+'">'+(ok?"正解！ ":"おしい！もう一度考えてみよう。 ")+(ok?rich(m.explanation):"ヒントも使えるよ。")+'</div>';$("next").disabled=false;$("next").textContent=ok?"つぎへ":"もう一度ちょうせん"});
 $("hint").onclick=()=>$("hint-area").innerHTML='<div class="hint-box">'+rich(m.hint)+'</div>';
 $("next").onclick=()=>{if(free){const value=$("reflection-input").value.trim();if(!value){$("feedback").innerHTML='<div class="feedback try">気づいたことを少し書いてみよう。</div>';return}complete(m,value);return}if(!answered)return;if(selected===m.answer)complete(m);else{selected=null;answered=false;questionView()}};
}
function complete(m,reflection=""){
 if(!state.completed.includes(m.id)){state.completed.push(m.id);state.points+=m.reward?.points||10;if(m.reward?.discovery&&!state.discoveries.includes(m.reward.discovery))state.discoveries.push(m.reward.discovery);if(reflection)state.reflections.push({title:m.title,category:m.category,text:reflection,date:new Date().toLocaleDateString("ja-JP")});save();render()}
 open('<div class="hero">🎉</div><div class="label">ミッション クリア！</div><h2>よくできたね！</h2><p class="lead">'+rich(m.explanation)+'</p><div class="question">⭐ '+(m.reward?.points||10)+'ポイント<br>📖「'+rich(m.reward?.discovery||"発見")+'」をノートに追加！</div><button class="primary" id="finish">町にもどる</button>');$("finish").onclick=()=>{close();setMapStatus("次はどこへ行こう？地図から場所をえらんでね。")};
}
function notes(){
 const reflections=state.reflections.slice().reverse(),own=state.townNotes.slice().reverse();
 open('<div class="hero">📖</div><div class="label">あつめた はっけん</div><h2>はっけんノート</h2><h3>ゲームで発見！</h3><div class="chips">'+(state.discoveries.length?state.discoveries.map(x=>'<span class="chip">✨ '+rich(x)+'</span>').join(""):'まだ発見がないよ。')+'</div><h3>考えたこと・観察したこと</h3>'+(reflections.length?reflections.map(x=>'<div class="question"><b>'+rich(x.title)+'</b><br>'+esc(x.text)+'<small> ・ '+esc(x.date)+'</small></div>').join(""):'<p class="lead">記録したことは、ここに集まるよ。</p>')+'<h3>自分の町で発見！</h3><p class="lead">自分の町で見つけたことも書いてみよう。</p><textarea id="town-note-input" rows="3" placeholder="どこで、何を見つけたかな？"></textarea><button class="primary" id="save-town-note">発見をノートに書く</button>'+(own.length?own.map(x=>'<div class="question">'+esc(x.text)+'<small> ・ '+esc(x.date)+'</small></div>').join(""):"")+'<button class="primary" id="finish">とじる</button>');
 $("save-town-note").onclick=()=>{const value=$("town-note-input").value.trim();if(!value)return;state.townNotes.push({text:value,date:new Date().toLocaleDateString("ja-JP")});save();notes()};$("finish").onclick=close;
}
$("markers").onclick=e=>{const b=e.target.closest("[data-place]");if(b){const p=placeById(b.dataset.place);if(p)travelTo(p)}};
$("mission-list").onclick=e=>{const b=e.target.closest("[data-mission]");if(b){const m=missions.find(x=>x.id===b.dataset.mission);if(m&&!state.completed.includes(m.id)){const p=placeById(m.placeId);if(p&&Math.hypot(state.player.x-p.x,state.player.y-p.y)>1){travelTo(p,()=>start(m));return}start(m)}}};
$("mission-list").onchange=e=>{if(e.target.id==="mission-filter"){selectedCategory=e.target.value;render()}};
$("open-notes").onclick=notes;$("close").onclick=close;$("backdrop").onclick=e=>{if(e.target===$("backdrop"))close()};
$("help").onclick=()=>{open('<div class="hero">🧭</div><h2>あそびかた</h2><p class="lead">地図のマークをタップすると、その場所まで歩いていくよ。クイズだけでなく、見つけたことや考えたことを書くミッションもあるよ。発見ノートには、ゲームの記録と自分の町で見つけたことを残せるよ。道路や川には近づきすぎず、安全な場所から観察しよう。進みぐあいは、この端末に自動で保存されるよ。</p><button class="primary" id="finish">探検にもどる</button>');$("finish").onclick=close};
render();setMapStatus("出発地点にいるよ。行ってみたい場所をえらぼう！");
})();