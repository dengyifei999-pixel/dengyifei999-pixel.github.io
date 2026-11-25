/* ================= 播放引擎（JSON 剧本驱动） ================= */
"use strict";
const $ = id => document.getElementById(id);
const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
let SILENT = false; // 拖动定位时静默快进

/* ---------- 音效 ---------- */
let AC=null, humNode=null, humGain=null, muted=false;
function audio(){ if(!AC){ AC=new (window.AudioContext||window.webkitAudioContext)(); } return AC; }
function beep(freq,dur,type,gain,t0){
  if(!AC||muted||SILENT) return;
  const o=AC.createOscillator(), g=AC.createGain(), t=AC.currentTime+(t0||0);
  o.type=type||"sine"; o.frequency.value=freq;
  g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(gain||.08,t+.012);
  g.gain.exponentialRampToValueAtTime(.0001,t+dur);
  o.connect(g).connect(AC.destination); o.start(t); o.stop(t+dur+.05);
}
function ding(pitch){ const p=pitch||1; beep(1318*p,.28,"sine",.07); beep(988*p,.4,"sine",.07,.14); }
function tick(){ beep(1900,.03,"square",.018); }
function pop(){ beep(520,.07,"triangle",.06); beep(880,.09,"triangle",.05,.03); }
function buzz(){ beep(120,.5,"sawtooth",.05); }
function humStart(){
  if(!AC||muted||SILENT) return; humStop();
  const len=AC.sampleRate*1.2, buf=AC.createBuffer(1,len,AC.sampleRate), d=buf.getChannelData(0);
  for(let i=0;i<len;i++) d[i]=(Math.random()*2-1)*.5;
  humNode=AC.createBufferSource(); humNode.buffer=buf; humNode.loop=true;
  const f=AC.createBiquadFilter(); f.type="lowpass"; f.frequency.value=420;
  humGain=AC.createGain(); humGain.gain.value=.028;
  humNode.connect(f).connect(humGain).connect(AC.destination); humNode.start();
}
function humStop(){ if(humNode){ try{humNode.stop()}catch(e){} humNode=null; } }

/* ---------- Canvas 绘制 ---------- */
function noise(ctx,w,h,amt){
  const img=ctx.getImageData(0,0,w,h), d=img.data;
  for(let i=0;i<d.length;i+=4){ const n=(Math.random()-.5)*amt;
    d[i]+=n; d[i+1]+=n; d[i+2]+=n; }
  ctx.putImageData(img,0,0);
}
function vignette(ctx,w,h,inner,alpha){
  const g=ctx.createRadialGradient(w/2,h/2,inner,w/2,h/2,Math.max(w,h)*.75);
  g.addColorStop(0,"rgba(0,0,0,0)"); g.addColorStop(1,"rgba(0,0,0,"+alpha+")");
  ctx.fillStyle=g; ctx.fillRect(0,0,w,h);
}
function flash(ctx,w,h,cx,cy,r,alpha){
  const g=ctx.createRadialGradient(cx,cy,0,cx,cy,r);
  g.addColorStop(0,"rgba(210,215,225,"+alpha+")"); g.addColorStop(1,"rgba(210,215,225,0)");
  ctx.fillStyle=g; ctx.fillRect(0,0,w,h);
}
function rr(ctx,x,y,w,h,r){
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath();
}
function paintLivingRoom(ctx,w,h){
  ctx.fillStyle="#070708"; ctx.fillRect(0,0,w,h);
  ctx.fillStyle="#111114"; ctx.fillRect(0,h*.62,w,h*.38);
  ctx.strokeStyle="rgba(255,255,255,.05)"; ctx.lineWidth=3;
  for(let i=1;i<6;i++){ ctx.beginPath(); ctx.moveTo(w/2+(i-3)*70, h); ctx.lineTo(w/2+(i-3)*26, h*.62); ctx.stroke(); }
  ctx.fillStyle="#0c0d10"; ctx.fillRect(w*.58,h*.30,w*.30,h*.20);
  ctx.strokeStyle="rgba(255,255,255,.10)"; ctx.lineWidth=2; ctx.strokeRect(w*.58,h*.30,w*.30,h*.20);
  flash(ctx,w,h,w*.60,h*.36,w*.16,.10);
  ctx.fillStyle="#1b1c20"; rr(ctx,w*.10,h*.56,w*.42,h*.14,18); ctx.fill();
  ctx.fillStyle="#232428"; rr(ctx,w*.10,h*.52,w*.42,h*.07,16); ctx.fill();
  ctx.fillStyle="#191a1e"; rr(ctx,w*.13,h*.545,w*.17,h*.09,10); ctx.fill();
  ctx.fillStyle="#1d1e22"; rr(ctx,w*.32,h*.545,w*.17,h*.09,10); ctx.fill();
  ctx.fillStyle="#151619"; rr(ctx,w*.24,h*.72,w*.26,h*.05,8); ctx.fill();
  ctx.fillStyle="#0d0e10"; ctx.fillRect(w*.27,h*.77,8,h*.06); ctx.fillRect(w*.45,h*.77,8,h*.06);
  for(let i=0;i<5;i++){ ctx.fillStyle=i%2?"#101116":"#14151a";
    ctx.fillRect(w*.90+i*(w*.02),0,w*.02,h*.66); }
  flash(ctx,w,h,w*.42,h*.55,w*.85,.16);
  noise(ctx,w,h,46); vignette(ctx,w,h,h*.24,.88);
}
function paintHallway(ctx,w,h){
  ctx.fillStyle="#060607"; ctx.fillRect(0,0,w,h);
  const vx=w*.56, vy=h*.42;
  ctx.fillStyle="#0e0e11";
  ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(vx-70,vy-160); ctx.lineTo(vx-70,vy+170); ctx.lineTo(0,h); ctx.closePath(); ctx.fill();
  ctx.fillStyle="#0b0b0e";
  ctx.beginPath(); ctx.moveTo(w,0); ctx.lineTo(vx+80,vy-160); ctx.lineTo(vx+80,vy+170); ctx.lineTo(w,h); ctx.closePath(); ctx.fill();
  ctx.fillStyle="#121216";
  ctx.beginPath(); ctx.moveTo(0,h); ctx.lineTo(vx-70,vy+170); ctx.lineTo(vx+80,vy+170); ctx.lineTo(w,h); ctx.closePath(); ctx.fill();
  ctx.fillStyle="#16171b"; ctx.fillRect(vx-62,vy-160,134,330);
  ctx.fillStyle="#1e1f24"; ctx.fillRect(vx-58,vy-156,108,326);
  const g=ctx.createLinearGradient(vx+50,0,vx+72,0);
  g.addColorStop(0,"rgba(255,244,214,0)"); g.addColorStop(.5,"rgba(255,244,214,.85)"); g.addColorStop(1,"rgba(255,244,214,0)");
  ctx.fillStyle=g; ctx.fillRect(vx+50,vy-156,22,326);
  flash(ctx,w,h,vx+60,vy,w*.28,.10);
  ctx.strokeStyle="rgba(255,255,255,.06)"; ctx.lineWidth=4;
  ctx.beginPath(); ctx.moveTo(0,h*.86); ctx.lineTo(vx-70,vy+150); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(w,h*.86); ctx.lineTo(vx+80,vy+150); ctx.stroke();
  flash(ctx,w,h,w*.5,h*.5,w*.7,.10);
  noise(ctx,w,h,52); vignette(ctx,w,h,h*.22,.9);
}
function paintBedroomSelfie(ctx,w,h){
  ctx.fillStyle="#050506"; ctx.fillRect(0,0,w,h);
  ctx.save(); ctx.translate(w*.42,h*.60); ctx.rotate(-.16);
  ctx.fillStyle="#141419"; rr(ctx,-w*.34,-h*.16,w*.66,h*.34,26); ctx.fill();
  ctx.fillStyle="#1a1a21"; rr(ctx,-w*.32,-h*.14,w*.62,h*.30,22); ctx.fill();
  ctx.fillStyle="#1f1f27";
  ctx.beginPath(); ctx.ellipse(-w*.02,-h*.02,w*.17,h*.085,.08,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(w*.10,-h*.005,w*.10,h*.06,.1,0,Math.PI*2); ctx.fill();
  ctx.fillStyle="rgba(200,214,235,.9)"; rr(ctx,w*.045,-h*.075,w*.052,h*.028,6); ctx.fill();
  ctx.restore();
  flash(ctx,w,h,w*.47,h*.545,w*.34,.22);
  ctx.fillStyle="#0c0c10"; ctx.fillRect(0,0,w,h*.09);
  ctx.fillStyle="#0e0e13";
  for(let i=0;i<8;i++) ctx.fillRect(i*(w/8)+3,h*.075,w/8-6,h*.05);
  noise(ctx,w,h,58); vignette(ctx,w,h,h*.18,.92);
}
function paintCamLive(ctx,w,h,t){
  ctx.fillStyle="#0a0c0a"; ctx.fillRect(0,0,w,h);
  ctx.strokeStyle="rgba(140,190,150,.20)"; ctx.lineWidth=2;
  ctx.strokeRect(w*.58,h*.30,w*.30,h*.24);
  ctx.strokeRect(w*.10,h*.52,w*.40,h*.16);
  ctx.beginPath(); ctx.moveTo(0,h*.68); ctx.lineTo(w,h*.66); ctx.stroke();
  ctx.strokeRect(w*.86,0,w*.14,h*.6);
  const img=ctx.getImageData(0,0,w,h), d=img.data;
  for(let i=0;i<d.length;i+=4){ const n=(Math.random()-.5)*30;
    d[i]+=n*.6; d[i+1]+=n; d[i+2]+=n*.6; }
  ctx.putImageData(img,0,0);
  const y=((t||0)*40)%h;
  ctx.fillStyle="rgba(160,220,170,.05)"; ctx.fillRect(0,y,w,26);
  vignette(ctx,w,h,h*.3,.55);
}
function paintCamStatic(ctx,w,h){
  const img=ctx.createImageData(w,h), d=img.data;
  for(let i=0;i<d.length;i+=4){ const v=Math.random()*255;
    d[i]=v; d[i+1]=v; d[i+2]=v; d[i+3]=255; }
  ctx.putImageData(img,0,0);
  ctx.fillStyle="rgba(8,8,10,.55)"; ctx.fillRect(0,0,w,h);
}
function paintFindMy(ctx,w,h){
  ctx.fillStyle="#151a15"; ctx.fillRect(0,0,w,h);
  ctx.fillStyle="#1b211b";
  for(let gx=0;gx<4;gx++) for(let gy=0;gy<5;gy++)
    if((gx+gy)%3!==1) rr(ctx,gx*200+26,gy*200+30,150,146,10), ctx.fill();
  ctx.strokeStyle="#2c352c"; ctx.lineWidth=16;
  for(let i=0;i<5;i++){ ctx.beginPath(); ctx.moveTo(0,i*200+26); ctx.lineTo(w,i*200+26); ctx.stroke(); }
  for(let i=0;i<4;i++){ ctx.beginPath(); ctx.moveTo(i*210+40,0); ctx.lineTo(i*210+40,h); ctx.stroke(); }
  ctx.strokeStyle="#3a4436"; ctx.lineWidth=5;
  ctx.beginPath(); ctx.moveTo(0,430); ctx.bezierCurveTo(220,400,420,470,w,420); ctx.stroke();
}

/* ---------- 素材库 ---------- */
const ASSETS = {
  living: { kind:"gen", painter:paintLivingRoom, label:"客厅闪光灯" },
  hall:   { kind:"gen", painter:paintHallway,    label:"走廊门缝" },
  selfie: { kind:"gen", painter:paintBedroomSelfie, label:"卧室俯拍" }
};
function drawAsset(key,ctx,w,h){
  const a=ASSETS[key];
  if(a&&a.kind==="img"&&a.el){
    const iw=a.el.naturalWidth, ih=a.el.naturalHeight;
    const s=Math.max(w/iw,h/ih), dw=iw*s, dh=ih*s;
    ctx.fillStyle="#000"; ctx.fillRect(0,0,w,h);
    ctx.drawImage(a.el,(w-dw)/2,(h-dh)/2,dw,dh);
    noise(ctx,w,h,14);
  } else if(a&&a.kind==="gen"){ a.painter(ctx,w,h); }
  else { ctx.fillStyle="#101013"; ctx.fillRect(0,0,w,h); noise(ctx,w,h,30); }
}

/* ---------- 场景 / 动作 ---------- */
const SCENES=["sc-lock","sc-photo","sc-wechat","sc-monitor","sc-about","sc-airdrop","sc-photos","sc-findmy"];
let current=null;
function show(id){
  SCENES.forEach(s=>$(s).classList.remove("active"));
  if(id) $("sc-"+id).classList.add("active");
  current=id;
  $("statusbar").classList.toggle("light", id==="wechat");
  document.querySelector(".homebar").classList.toggle("dark", id==="wechat");
}
function setClock(s){ $("sb-time").textContent=s; $("lk-time").textContent=s; }
function adShow(name){ $("ad-title").textContent='"'+name+'"';
  $("ad-accept").classList.remove("hit"); $("ad-decline").classList.remove("hit");
  $("ad-banner").classList.add("show"); }
function adHide(){ $("ad-banner").classList.remove("show"); }
function wxSend(side,text){
  const old=document.querySelector(".wx-typing"); if(old) old.remove();
  const m=document.createElement("div"); m.className="wx-msg "+side;
  m.innerHTML='<div class="av">'+(side==="l"?"哲":"北")+'</div><div class="wx-bub"></div>';
  m.querySelector(".wx-bub").textContent=text;
  $("wx-msgs").appendChild(m); pop();
  if(side==="r") $("wx-draft").innerHTML="";
}
function wxLocCard(){
  const m=document.createElement("div"); m.className="wx-msg l";
  m.innerHTML='<div class="av">哲</div><div class="wx-loc"><div class="map"><div class="pin"></div></div>'+
    '<div class="txt"><div class="n">位置 · 共享实时位置</div><div class="s">距你 12.3 公里 · 星海写字楼</div></div></div>';
  $("wx-msgs").appendChild(m); pop();
}
function wxTyping(on){
  const old=document.querySelector(".wx-typing"); if(old) old.remove();
  if(!on) return;
  const m=document.createElement("div"); m.className="wx-msg l wx-typing";
  m.innerHTML='<div class="av">哲</div><div class="wx-bub"><i></i><i></i><i></i></div>';
  $("wx-msgs").appendChild(m);
}
function showPhoto(key,time){
  const c=$("ph-canvas");
  drawAsset(key,c.getContext("2d"),c.width,c.height);
  $("ph-date").textContent="11月25日"; $("ph-time").textContent=time||"23:46";
  $("ph-exif").classList.remove("show");
  if(key==="selfie") $("exif-loc").textContent="家 · 距此处 0 米";
  show("photo");
}
function buildGrid(){
  const g=$("ph-grid"); g.innerHTML="";
  for(let i=0;i<12;i++){
    const th=document.createElement("div"); th.className="th";
    if(i===0){ const cv=document.createElement("canvas"); cv.width=260; cv.height=260;
      drawAsset("selfie",cv.getContext("2d"),260,260); th.appendChild(cv);
      th.classList.add("hasnew"); th.innerHTML+='<span class="new">1</span>'; }
    else { const cv=document.createElement("canvas"); cv.width=260; cv.height=260;
      const x=cv.getContext("2d"); x.fillStyle=["#17171b","#131316","#1a1a1f"][i%3];
      x.fillRect(0,0,260,260); noise(x,260,260,24); th.appendChild(cv); }
    g.appendChild(th);
  }
}
function buildFindMy(){
  $("fm-devs").innerHTML="";
  for(let i=0;i<2;i++){
    const d=document.createElement("div"); d.className="fm-dev";
    d.innerHTML='<div class="ic"><i></i></div><div><div class="n">小北的 iPhone</div>'+
      '<div class="s">现在 · 与<b>你</b>同在</div></div><div class="r">距离<br><b style="color:#ff453a">0 米</b></div>';
    $("fm-devs").appendChild(d);
  }
}
let fmT=0;
function drawFindMyDots(t){
  const c=$("fm-canvas"); if(!c) return; const ctx=c.getContext("2d");
  paintFindMy(ctx,c.width,c.height);
  const cx=c.width*.5, cy=c.height*.44;
  const r=20+((t*1.2)%1)*70, a=1-((t*1.2)%1);
  ctx.strokeStyle="rgba(48,209,88,"+(a*.5)+")"; ctx.lineWidth=2.5;
  ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.stroke();
  [[-3,-2],[3,2]].forEach(o=>{
    ctx.fillStyle="rgba(48,209,88,.30)";
    ctx.beginPath(); ctx.arc(cx+o[0],cy+o[1],22,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="#30d158";
    ctx.beginPath(); ctx.arc(cx+o[0],cy+o[1],9,0,Math.PI*2); ctx.fill();
  });
  ctx.fillStyle="#fff"; ctx.font="600 24px -apple-system,'PingFang SC',sans-serif";
  ctx.textAlign="center"; ctx.fillText("0 米",cx,cy-44);
}

/* ---------- 键盘 + IME ---------- */
const KB_ROWS=[ ["q","w","e","r","t","y","u","i","o","p"],
  ["a","s","d","f","g","h","j","k","l"],
  ["⇧","z","x","c","v","b","n","m","⌫"],
  ["123","空格","发送"] ];
function buildKeyboard(){
  const kb=$("kb"); kb.innerHTML="";
  const ime=document.createElement("div"); ime.className="kb-ime";
  ime.innerHTML='<div id="kb-pinyin"></div><div id="kb-cand">'+
    '<span class="c1"></span><span class="c2"></span><span class="c3"></span></div>';
  kb.appendChild(ime);
  KB_ROWS.forEach(r=>{
    const row=document.createElement("div"); row.className="row";
    r.forEach(k=>{
      const d=document.createElement("div");
      const letter=/^[a-z]$/.test(k);
      d.className="key"+(k==="空格"?" space":(k==="发送"?" wide send":(!letter?" wide":"")));
      d.textContent=k; if(letter) d.dataset.k=k;
      row.appendChild(d);
    });
    kb.appendChild(row);
  });
}
function kbShow(){ $("sc-wechat").classList.add("kb-on"); }
function kbHide(){ $("sc-wechat").classList.remove("kb-on"); }
let kbTimers=[];
function flashKey(letter){
  if(SILENT) return;
  const key=document.querySelector('#kb .key[data-k="'+letter+'"]');
  if(!key) return;
  key.classList.add("hit");
  beep(1400+Math.random()*600,.045,"square",.022);
  kbTimers.push(setTimeout(()=>key.classList.remove("hit"),115));
}
let flashJobs=[], imeJobs=[], imeState=null;
function imeClearBar(){
  const p=$("kb-pinyin"); if(!p) return;
  p.textContent="";
  const c=$("kb-cand").children; c[0].textContent=""; c[1].textContent=""; c[2].textContent="";
}
/* chunks: [{py:"tou song", hz:"投送"}]；无 chunks 时按 text 随机生成假拼音 */
function typeIME(t0,dur,chunks,text){
  if(!chunks&&text){
    chunks=[...text].map(ch=>({py:[...Array(Math.max(1,Math.min(4,Math.ceil(Math.random()*3))))]
      .map(()=>String.fromCharCode(97+Math.floor(Math.random()*26))).join(""),hz:ch}));
  }
  chunks=(chunks||[]).map(c=>({py:(typeof c.py==="string"?c.py.split(" ").filter(Boolean):c.py),hz:c.hz}));
  const st={el:$("wx-draft"),chunks,committed:""};
  imeState=st; imeClearBar();
  const total=chunks.reduce((a,c)=>a+c.py.join("").length,0)||1;
  let li=0;
  chunks.forEach((c,ci)=>{
    const letters=c.py.join("");
    for(let i=0;i<letters.length;i++){
      const tt=t0+dur*(li+.35)/total;
      flashJobs.push({t:tt,ch:letters[i],done:false});
      imeJobs.push({t:tt,k:"py",ci,upto:i+1,done:false,st});
      li++;
    }
    imeJobs.push({t:t0+dur*li/total,k:"commit",ci,done:false,st});
  });
}
function runFlashJobs(t){
  flashJobs.forEach(j=>{ if(!j.done&&t>=j.t){ j.done=true; flashKey(j.ch); } });
}
function runIMEJobs(t){
  if(!imeState) return;
  imeJobs.forEach(j=>{
    if(j.done||t<j.t) return; j.done=true;
    if(j.st&&j.st!==imeState) return; // 已被后一次打字接管
    const st=imeState, c=st.chunks[j.ci];
    if(j.k==="py"){
      let left=j.upto; const parts=[];
      for(const syl of c.py){
        if(left<=0) break;
        parts.push(syl.slice(0,Math.min(syl.length,left)));
        left-=syl.length;
      }
      $("kb-pinyin").textContent=parts.join("'");
      const cc=$("kb-cand").children;
      cc[0].textContent=c.hz; cc[1].textContent=c.hz.slice(0,1); cc[2].textContent="…";
    } else {
      st.committed+=c.hz;
      st.el.innerHTML=st.committed+'<span class="caret"></span>';
      if(!SILENT) tick(); imeClearBar();
    }
  });
}

/* ---------- 监控模式 ---------- */
let monMode="off", clockT=0, clockSec=12;
function monC(){ return $("mon-canvas").getContext("2d"); }
function monitorMode(mode){
  monMode=mode;
  const off=mode==="offline";
  $("mon-offline").style.display=off?"flex":"none";
  $("tab-hall").classList.toggle("on",off);
  $("tab-hall").classList.toggle("off",!off);
  $("tab-living").classList.toggle("on",!off);
  if(off){ $("mon-sub").textContent="● 1 台设备离线"; $("mon-sub").style.color="#ff9f0a"; }
  else { $("mon-sub").textContent="● 连接正常"; $("mon-sub").style.color="#6fd37a"; }
}

/* ---------- 动作表 ---------- */
const ACTIONS={
  show_scene:  p=>show(p.scene),
  set_clock:   p=>setClock(p.text),
  airdrop_banner: p=>{ adShow(p.device); ding(p.pitch==null?1:p.pitch); },
  airdrop_tap: p=>{ $(p.choice==="accept"?"ad-accept":"ad-decline").classList.add("hit");
                    setTimeout(adHide,320); },
  show_photo:  p=>showPhoto(p.asset,p.time),
  exif_show:   ()=>$("ph-exif").classList.add("show"),
  wx_send:     p=>wxSend(p.side,p.text),
  wx_typing:   p=>wxTyping(!!p.on),
  wx_loc:      ()=>wxLocCard(),
  kb_show:     ()=>kbShow(),
  kb_hide:     ()=>kbHide(),
  ime_type:    (p,t)=>typeIME(t,p.dur||2.5,p.chunks,p.text),
  monitor:     p=>monitorMode(p.mode),
  ad_set:      p=>{ document.querySelectorAll("#ad-cells .cell").forEach(c=>
                    c.querySelector(".check").textContent = c.dataset.k===p.mode?"✓":"");
                    if(!SILENT) tick(); },
  photos_grid: ()=>{ buildGrid(); show("photos"); },
  findmy_show: ()=>{ buildFindMy(); show("findmy"); },
  dim:         ()=>{ const d=$("dim"); d.style.transition="opacity 2.4s"; d.style.opacity="1"; humStop(); },
  title:       ()=>$("title-card").classList.add("show"),
  sound:       p=>{ ({hum_start:humStart,hum_stop:humStop,buzz,
                    silence:()=>{ if(AC&&!SILENT) AC.suspend(); }})[p.name]?.(); }
};

/* ---------- 播放器 ---------- */
const Player={
  script:null, evs:[], t:0, playing:false, lastTs:null, onTick:null,
  load(script){
    this.script=script;
    this.evs=(script.events||[]).map(e=>({t:+e.t,action:e.action,params:e.params||{},done:false}))
      .sort((a,b)=>a.t-b.t);
    this.seek(0);
  },
  fire(e){ const fn=ACTIONS[e.action]; if(fn) fn(e.params,e.t); },
  play(){
    if(!this.script) return;
    if(this.t>=this.script.duration) this.seek(0);
    audio(); if(AC&&AC.state==="suspended") AC.resume();
    this.playing=true; this.lastTs=null;
  },
  pause(){ this.playing=false; },
  /* 静默快进到 t（拖动时间轴用） */
  seek(t2){
    t2=clamp(t2,0,this.script?this.script.duration:0);
    SILENT=true;
    this.resetState();
    this.evs.forEach(e=>{ if(e.t<=t2){ e.done=true; this.fire(e); } });
    runFlashJobs(t2); runIMEJobs(t2);
    this.t=t2; SILENT=false;
    // 暂停态下补一帧连续画面
    if(current==="monitor"){ monMode==="offline"?paintCamStatic(monC(),724,500):paintCamLive(monC(),724,500,t2); }
    if(current==="findmy") drawFindMyDots(1.5);
    if(this.onTick) this.onTick(t2);
  },
  resetState(){
    this.t=0; this.lastTs=null; monMode="off"; clockSec=12; fmT=0;
    flashJobs=[]; imeJobs=[]; imeState=null;
    kbTimers.forEach(clearTimeout); kbTimers=[];
    this.evs.forEach(e=>e.done=false);
    SCENES.concat(["ad-banner"]).forEach(s=>{ const el=$(s); if(el&&el._snap!=null) el.innerHTML=el._snap; });
    kbHide(); show(null); setClock("23:47");
    $("dim").style.transition="none"; $("dim").style.opacity="0";
    $("title-card").classList.remove("show");
    humStop(); if(AC&&AC.state==="suspended") AC.resume();
  },
  frame(ts){
    if(this.lastTs===null) this.lastTs=ts;
    const dt=Math.min(.1,(ts-this.lastTs)/1000); this.lastTs=ts;
    if(this.playing&&this.script){
      this.t+=dt;
      this.evs.forEach(e=>{ if(!e.done&&this.t>=e.t){ e.done=true; this.fire(e); } });
      runFlashJobs(this.t); runIMEJobs(this.t);
      if(this.t>=this.script.duration){ this.playing=false; }
      if(this.onTick) this.onTick(this.t);
    }
    if(current==="monitor"&&this.playing){
      if(monMode==="live"){
        clockT+=dt;
        if(clockT>0.9){ clockT=0; clockSec++;
          $("mon-ts").textContent="2026-11-25 23:50:"+String(clockSec%60).padStart(2,"0"); }
        paintCamLive(monC(),724,500,this.t);
      } else if(monMode==="offline"&&Math.random()<.2){ paintCamStatic(monC(),724,500); }
    }
    if(current==="findmy"&&this.playing){ fmT+=dt; drawFindMyDots(fmT); }
  }
};
function engineInit(){
  buildKeyboard();
  SCENES.concat(["ad-banner"]).forEach(s=>{ const el=$(s); if(el) el._snap=el.innerHTML; });
}