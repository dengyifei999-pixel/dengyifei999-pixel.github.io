/* ================= 工作台 UI ================= */
"use strict";
/* ---------- 动作定义（属性面板用） ---------- */
const ACTION_DEFS = {
  show_scene:     { label:"切换场景",   params:{ scene:{type:"select",options:["lock","photo","wechat","monitor","about","airdrop","photos","findmy"],label:"场景"} } },
  set_clock:      { label:"设置状态栏时间", params:{ text:{type:"text",label:"时间文本"} } },
  airdrop_banner: { label:"AirDrop 横幅", params:{ device:{type:"text",label:"设备名"}, pitch:{type:"number",label:"音调（1=正常）"} } },
  airdrop_tap:    { label:"AirDrop 点按", params:{ choice:{type:"select",options:["accept","decline"],label:"选择"} } },
  show_photo:     { label:"查看照片",   params:{ asset:{type:"asset",label:"素材"}, time:{type:"text",label:"拍摄时间"} } },
  exif_show:      { label:"弹出 EXIF 面板", params:{} },
  wx_send:        { label:"微信发消息",  params:{ side:{type:"select",options:[["l","对方（左）"],["r","自己（右）"]],label:"发送方"}, text:{type:"text",label:"内容"} } },
  wx_typing:      { label:"对方正在输入", params:{ on:{type:"bool",label:"开启"} } },
  wx_loc:         { label:"微信位置卡片", params:{} },
  kb_show:        { label:"升起键盘",   params:{} },
  kb_hide:        { label:"收起键盘",   params:{} },
  ime_type:       { label:"打字（IME）", params:{ dur:{type:"number",label:"时长(秒)"}, text:{type:"text",label:"文本（无拼音时随机）"}, chunks:{type:"json",label:"拼音分词 JSON"} } },
  monitor:        { label:"监控切换",   params:{ mode:{type:"select",options:["live","offline"],label:"模式"} } },
  ad_set:         { label:"隔空投送设置", params:{ mode:{type:"select",options:[["off","接收关闭"],["contacts","仅限联系人"],["all","所有人"]],label:"模式"} } },
  photos_grid:    { label:"打开相册图库", params:{} },
  findmy_show:    { label:"打开查找",   params:{} },
  dim:            { label:"屏幕压暗",   params:{} },
  title:          { label:"片名卡",     params:{} },
  sound:          { label:"声音",       params:{ name:{type:"select",options:[["hum_start","监控底噪起"],["hum_stop","底噪停"],["buzz","故障嗡鸣"],["silence","全场静音"]],label:"音效"} } }
};

let script=null, selIdx=-1, dragging=false;

/* ---------- 摘要 ---------- */
function summarize(e){
  const p=e.params||{};
  switch(e.action){
    case "show_scene": return "切到「"+({lock:"锁屏",photo:"照片",wechat:"微信",monitor:"监控",about:"关于本机",airdrop:"隔空投送",photos:"图库",findmy:"查找"}[p.scene]||p.scene)+"」";
    case "set_clock": return "状态栏时间 "+p.text;
    case "airdrop_banner": return "AirDrop 横幅「"+p.device+"」";
    case "airdrop_tap": return p.choice==="accept"?"点「接受」":"点「拒绝」";
    case "show_photo": return "查看照片「"+p.asset+"」";
    case "exif_show": return "弹出 EXIF 面板";
    case "wx_send": return (p.side==="r"?"发出：":"收到：")+(p.text||"");
    case "wx_typing": return p.on?"对方正在输入…":"停止输入提示";
    case "wx_loc": return "位置共享卡片";
    case "kb_show": return "升起键盘";
    case "kb_hide": return "收起键盘";
    case "ime_type": { const t=p.chunks?p.chunks.map(c=>c.hz).join(""):(p.text||""); return "打字「"+t+"」"; }
    case "monitor": return p.mode==="offline"?"监控：走廊离线":"监控：客厅实时";
    case "ad_set": return "隔空投送→"+({off:"接收关闭",contacts:"仅限联系人",all:"所有人"}[p.mode]||p.mode);
    case "photos_grid": return "打开相册图库";
    case "findmy_show": return "打开查找（0 米）";
    case "dim": return "屏幕压暗";
    case "title": return "片名卡";
    case "sound": return "声音·"+({hum_start:"底噪起",hum_stop:"底噪停",buzz:"嗡鸣",silence:"静音"}[p.name]||p.name);
    default: return e.action;
  }
}

/* ---------- 列表渲染 ---------- */
function renderList(){
  const el=document.getElementById("ev-list"); el.innerHTML="";
  const sorted=script.events.map((e,i)=>({e,i})).sort((a,b)=>a.e.t-b.e.t);
  sorted.forEach(({e,i})=>{
    const row=document.createElement("div");
    row.className="ev-row"+(i===selIdx?" sel":"");
    const tin=document.createElement("input");
    tin.className="t"; tin.type="number"; tin.step="0.1"; tin.value=e.t;
    tin.addEventListener("click",ev=>ev.stopPropagation());
    tin.addEventListener("change",()=>{ e.t=parseFloat(tin.value)||0; commit(true); });
    const sum=document.createElement("span"); sum.className="sum"; sum.textContent=summarize(e);
    const del=document.createElement("span"); del.className="del"; del.textContent="✕";
    del.title="删除";
    del.addEventListener("click",ev=>{ ev.stopPropagation();
      script.events.splice(i,1); if(selIdx===i)selIdx=-1; commit(true); });
    row.append(tin,sum,del);
    row.addEventListener("click",()=>{ selIdx=i; renderList(); renderProps(); });
    el.appendChild(row);
  });
}

/* ---------- 属性面板 ---------- */
function renderProps(){
  const panel=document.getElementById("prop-panel"); panel.innerHTML="";
  if(selIdx<0||!script.events[selIdx]){
    panel.innerHTML='<div class="empty">在左侧选择一个事件进行编辑</div>'; return;
  }
  const ev=script.events[selIdx];
  // 动作选择
  const actRow=document.createElement("div"); actRow.className="prop-row";
  actRow.innerHTML='<label>动作</label>';
  const sel=document.createElement("select");
  Object.keys(ACTION_DEFS).forEach(k=>{
    const o=document.createElement("option"); o.value=k; o.textContent=ACTION_DEFS[k].label+" · "+k;
    if(k===ev.action) o.selected=true; sel.appendChild(o);
  });
  sel.addEventListener("change",()=>{ ev.action=sel.value;
    // 给新动作补默认参数
    const defs=ACTION_DEFS[ev.action].params; ev.params=ev.params||{};
    Object.keys(defs).forEach(k=>{
      if(ev.params[k]!==undefined) return;
      const d=defs[k];
      ev.params[k]=d.type==="number"?1:d.type==="bool"?true:d.type==="json"?null:
        d.type==="select"?(Array.isArray(d.options[0])?d.options[0][0]:d.options[0]):
        d.type==="asset"?Object.keys(ASSETS)[0]:"";
    });
    commit(true); renderProps();
  });
  actRow.appendChild(sel); panel.appendChild(actRow);

  const defs=ACTION_DEFS[ev.action].params;
  Object.keys(defs).forEach(k=>{
    const d=defs[k], v=ev.params?ev.params[k]:undefined;
    const row=document.createElement("div"); row.className="prop-row";
    const lab=document.createElement("label"); lab.textContent=d.label||k; row.appendChild(lab);
    let input;
    if(d.type==="select"){
      input=document.createElement("select");
      d.options.forEach(op=>{
        const o=document.createElement("option");
        if(Array.isArray(op)){ o.value=op[0]; o.textContent=op[1]; } else { o.value=op; o.textContent=op; }
        if(String(v)===String(o.value)) o.selected=true;
        input.appendChild(o);
      });
      input.addEventListener("change",()=>{ ev.params[k]=input.value; commit(false); });
    } else if(d.type==="number"){
      input=document.createElement("input"); input.type="number"; input.step="0.1"; input.value=v??1;
      input.addEventListener("change",()=>{ ev.params[k]=parseFloat(input.value)||0; commit(false); });
    } else if(d.type==="bool"){
      input=document.createElement("input"); input.type="checkbox"; input.checked=!!v;
      input.addEventListener("change",()=>{ ev.params[k]=input.checked; commit(false); });
    } else if(d.type==="json"){
      input=document.createElement("textarea");
      input.value=v?JSON.stringify(v,null,1):"";
      input.addEventListener("change",()=>{
        try{ ev.params[k]=input.value.trim()?JSON.parse(input.value):null; input.classList.remove("err"); commit(false); }
        catch(err){ input.classList.add("err"); }
      });
    } else if(d.type==="asset"){
      input=document.createElement("select");
      Object.keys(ASSETS).forEach(a=>{
        const o=document.createElement("option"); o.value=a; o.textContent=a+"（"+(ASSETS[a].label||"上传图")+"）";
        if(v===a) o.selected=true; input.appendChild(o);
      });
      input.addEventListener("change",()=>{ ev.params[k]=input.value; commit(false); });
    } else {
      input=document.createElement("input"); input.type="text"; input.value=v??"";
      input.addEventListener("change",()=>{ ev.params[k]=input.value; commit(false); });
    }
    row.appendChild(input); panel.appendChild(row);
  });
}

/* ---------- 素材面板 ---------- */
function renderAssets(){
  const g=document.getElementById("asset-grid"); g.innerHTML="";
  Object.keys(ASSETS).forEach(k=>{
    const a=ASSETS[k];
    const d=document.createElement("div"); d.className="asset-th";
    if(a.kind==="img"&&a.el){ const im=document.createElement("img"); im.src=a.dataUrl; d.appendChild(im); }
    else { const cv=document.createElement("canvas"); cv.width=144; cv.height=144;
      a.painter(cv.getContext("2d"),144,144); d.appendChild(cv); }
    const nm=document.createElement("div"); nm.className="nm"; nm.textContent=k;
    d.appendChild(nm); g.appendChild(d);
  });
}
document.getElementById("btn-upload").addEventListener("click",()=>document.getElementById("upload-file").click());
document.getElementById("upload-file").addEventListener("change",e=>{
  const f=e.target.files[0]; if(!f) return;
  const rd=new FileReader();
  rd.onload=()=>{
    const img=new Image();
    img.onload=()=>{
      const key=f.name.replace(/\.[^.]+$/,"").replace(/[^\w-]/g,"_")||("asset"+Object.keys(ASSETS).length);
      ASSETS[key]={kind:"img",el:img,dataUrl:rd.result,label:"上传图"};
      renderAssets(); commit(false);
    };
    img.src=rd.result;
  };
  rd.readAsDataURL(f); e.target.value="";
});

/* ---------- 提交改动（保存 + 重载播放器） ---------- */
function commit(resort){
  document.getElementById("script-name").value=script.name;
  try{ localStorage.setItem("screenlife-script",JSON.stringify(script)); }catch(e){}
  const keepT=Player.t;
  Player.load(script);
  Player.seek(Math.min(keepT,script.duration));
  if(resort) renderList();
}

/* ---------- 走带 ---------- */
const slider=document.getElementById("tp-slider");
function fmt(t){ const m=String(Math.floor(t/60)).padStart(2,"0"), s=(t%60).toFixed(1).padStart(4,"0");
  return m+":"+s; }
Player.onTick=t=>{
  document.getElementById("tp-time").textContent=fmt(t)+" / "+fmt(script.duration);
  if(!dragging) slider.value=t;
  document.getElementById("tp-play").textContent=Player.playing?"⏸ 暂停":"▶ 播放";
};
slider.addEventListener("pointerdown",()=>dragging=true);
addEventListener("pointerup",()=>{ if(dragging){ dragging=false; Player.seek(parseFloat(slider.value)); } });
slider.addEventListener("input",()=>{ if(dragging) Player.seek(parseFloat(slider.value)); });
document.getElementById("tp-play").addEventListener("click",()=>{
  Player.playing?Player.pause():Player.play();
  document.getElementById("tp-play").textContent=Player.playing?"⏸ 暂停":"▶ 播放";
});

/* ---------- 顶栏 ---------- */
document.getElementById("script-name").addEventListener("change",e=>{ script.name=e.target.value; commit(false); });
document.getElementById("btn-save").addEventListener("click",()=>{ commit(false); flashBtn("btn-save","已保存 ✓"); });
document.getElementById("btn-export").addEventListener("click",()=>{
  const blob=new Blob([JSON.stringify(script,null,2)],{type:"application/json"});
  const a=document.createElement("a"); a.href=URL.createObjectURL(blob);
  a.download=(script.name||"script")+".screenlife.json"; a.click(); URL.revokeObjectURL(a.href);
});
document.getElementById("btn-import").addEventListener("click",()=>document.getElementById("import-file").click());
document.getElementById("import-file").addEventListener("change",e=>{
  const f=e.target.files[0]; if(!f) return;
  const rd=new FileReader();
  rd.onload=()=>{ try{ script=JSON.parse(rd.result); selIdx=-1; commit(true); renderProps(); }
    catch(err){ alert("JSON 解析失败"); } };
  rd.readAsText(f); e.target.value="";
});
document.getElementById("btn-add-ev").addEventListener("click",()=>{
  script.events.push({t:Math.round(Player.t*10)/10,action:"show_scene",params:{scene:"lock"}});
  selIdx=script.events.length-1; commit(true); renderProps();
});
document.getElementById("btn-rec").addEventListener("click",()=>{
  document.body.classList.toggle("rec");
  document.getElementById("btn-rec").classList.toggle("rec-on");
  fit();
});
function flashBtn(id,txt){ const b=document.getElementById(id); const o=b.textContent;
  b.textContent=txt; setTimeout(()=>b.textContent=o,1200); }

/* ---------- 移动端 Tab ---------- */
(function(){
  const mt=document.getElementById("mobile-tabs");
  const panes={timeline:document.getElementById("col-left"),props:document.getElementById("col-right")};
  function applyPane(name){
    mt.querySelectorAll("button").forEach(x=>x.classList.toggle("on",x.dataset.pane===name));
    panes.timeline.classList.toggle("mob-on",name==="timeline");
    panes.props.classList.toggle("mob-on",name==="props");
    fit();
  }
  mt.querySelectorAll("button").forEach(b=>
    b.addEventListener("click",()=>applyPane(b.dataset.pane)));
  const mq=matchMedia("(max-width:900px)");
  function syncMQ(){
    if(mq.matches) applyPane("timeline");
    else { panes.timeline.classList.remove("mob-on"); panes.props.classList.remove("mob-on"); fit(); }
  }
  mq.addEventListener("change",syncMQ);
  syncMQ();
})();

/* ---------- 布局 / 启动 ---------- */
function fit(){
  const st=document.getElementById("stage");
  const s=Math.min((st.clientHeight-40)/844,(st.clientWidth-40)/390);
  document.documentElement.style.setProperty("--s",Math.max(.05,Math.min(s,2)));
}
addEventListener("resize",fit);
addEventListener("load",fit);
addEventListener("keydown",e=>{
  if(e.code==="Space"&&e.target.tagName!=="INPUT"&&e.target.tagName!=="TEXTAREA"){
    e.preventDefault(); document.getElementById("tp-play").click(); }
});

(function boot(){
  engineInit();
  try{ const saved=localStorage.getItem("screenlife-script");
    script=saved?JSON.parse(saved):JSON.parse(JSON.stringify(DEFAULT_SCRIPT)); }
  catch(e){ script=JSON.parse(JSON.stringify(DEFAULT_SCRIPT)); }
  document.getElementById("script-name").value=script.name;
  slider.max=script.duration;
  Player.load(script);
  renderList(); renderProps(); renderAssets();
  requestAnimationFrame(()=>{ fit(); fit(); });
  (function loop(ts){ Player.frame(ts); requestAnimationFrame(loop); })(0);
})();

/* ================= AI 写剧本 ================= */
const AI_SYS = `你是「桌面电影」（screenlife）编剧。用户给你故事想法，你输出一个 JSON 剧本，驱动一个手机桌面电影播放器。只输出 JSON，不要任何解释、不要 markdown 代码围栏。

JSON 格式：
{"name":"片名","duration":总秒数,"events":[{"t":秒数,"action":"动作名","params":{...}}]}

可用动作与参数（严格只用这些）：
- show_scene {scene:"lock"|"photo"|"wechat"|"monitor"|"about"|"airdrop"|"photos"|"findmy"} 切换场景：锁屏/照片查看器/微信/监控App/关于本机/隔空投送设置/相册图库/查找
- set_clock {text:"23:47"} 设置状态栏与锁屏时间
- airdrop_banner {device:"设备名",pitch:1} 隔空投送横幅（pitch<1 提示音降调，更诡异）
- airdrop_tap {choice:"accept"|"decline"} 点按横幅上的按钮
- show_photo {asset:"living"|"hall"|"selfie",time:"23:46"} 查看照片（living=客厅闪光灯/hall=走廊门缝/selfie=卧室俯拍）
- exif_show {} 照片底部弹出 EXIF 信息面板
- wx_send {side:"l"|"r",text:"内容"} 微信消息，l=对方，r=自己
- wx_typing {on:true} 对方正在输入（on:false 停止）
- wx_loc {} 微信位置共享卡片
- kb_show {} / kb_hide {} 升起/收起 26 键键盘
- ime_type {dur:秒,chunks:[{"py":"ni hao","hz":"你好"}]} 模拟拼音打字：键盘按键逐个亮起、拼音显示在候选栏、整词上屏。chunks 里 py 用空格分音节
- monitor {mode:"live"|"offline"} 监控画面实时/设备离线
- ad_set {mode:"off"|"contacts"|"all"} 隔空投送接收设置切换
- photos_grid {} 打开相册图库（首图是新照片带红点）
- findmy_show {} 打开「查找」，两台设备距离 0 米
- dim {} 屏幕缓缓压暗
- title {} 片名卡淡入
- sound {name:"hum_start"|"hum_stop"|"buzz"|"silence"} 监控底噪起/停、故障嗡鸣、全场静音

编剧要求：
1. 用日常细节制造代入感：真实时间线（状态栏时间随剧情推进）、生活化对白、App 的真实使用逻辑。
2. 恐怖/悬疑靠「异常的日常」而非惊吓：不该出现的照片、距离 0 米的设备、离线又上线的摄像头。
3. 节奏：每个事件间隔 1.5-4 秒给观众反应时间；打字用 ime_type 而不是直接 wx_send 出现草稿。
4. 结构：开场 3 秒内建立场景 → 第一次异常 → 通讯求证 → 异常升级 → 日常防御动作失效 → 最终揭示 → dim + title 收尾。
5. duration 与用户要求一致，最后一个事件不晚于 duration-1。events 按 t 升序。`;

(function aiInit(){
  const mask=document.getElementById("ai-mask");
  const keyInput=document.getElementById("ai-key");
  const status=document.getElementById("ai-status");
  try{ keyInput.value=localStorage.getItem("screenlife-ai-key")||""; }catch(e){}

  function setStatus(txt,cls){ status.textContent=txt||""; status.className=cls||""; }
  function userPrompt(){
    const idea=document.getElementById("ai-idea").value.trim();
    const dur=parseInt(document.getElementById("ai-dur").value,10)||60;
    const mood=document.getElementById("ai-mood").value;
    return "故事想法："+(idea||"（自由发挥一个日常恐怖小故事）")+"\n氛围："+mood+"\n总时长："+dur+" 秒\n请输出剧本 JSON。";
  }
  function applyScript(obj){
    if(!obj||!Array.isArray(obj.events)||!obj.events.length) throw new Error("bad");
    obj.duration=+obj.duration||60;
    obj.events.forEach(e=>{ e.t=+e.t||0; e.params=e.params||{}; });
    script=obj; selIdx=-1;
    slider.max=script.duration;
    commit(true); renderProps();
    mask.classList.remove("show");
  }

  document.getElementById("btn-ai").addEventListener("click",()=>{
    mask.classList.add("show"); setStatus("");
  });
  document.getElementById("ai-close").addEventListener("click",()=>mask.classList.remove("show"));
  mask.addEventListener("click",e=>{ if(e.target===mask) mask.classList.remove("show"); });
  keyInput.addEventListener("change",()=>{
    try{ localStorage.setItem("screenlife-ai-key",keyInput.value.trim()); }catch(e){}
  });

  document.getElementById("ai-copy").addEventListener("click",()=>{
    const full=AI_SYS+"\n\n"+userPrompt();
    const done=()=>setStatus("✓ 提示词已复制。发给 Kimi，把返回的 JSON 用顶栏「导入 JSON」导入即可。","ok");
    if(navigator.clipboard&&navigator.clipboard.writeText){
      navigator.clipboard.writeText(full).then(done,()=>{ fallbackCopy(full); done(); });
    } else { fallbackCopy(full); done(); }
  });
  function fallbackCopy(txt){
    const ta=document.createElement("textarea"); ta.value=txt;
    document.body.appendChild(ta); ta.select();
    try{ document.execCommand("copy"); }catch(e){}
    ta.remove();
  }

  document.getElementById("ai-gen").addEventListener("click",async ()=>{
    const key=keyInput.value.trim();
    if(!key){ setStatus("未填 API Key：请点左侧「复制提示词」发给 Kimi，再导入 JSON；或填入 Key 直接生成。","err"); return; }
    const btn=document.getElementById("ai-gen");
    btn.disabled=true; setStatus("AI 正在写剧本…（约 10-30 秒）","");
    try{
      const res=await fetch("https://api.moonshot.cn/v1/chat/completions",{
        method:"POST",
        headers:{"Content-Type":"application/json","Authorization":"Bearer "+key},
        body:JSON.stringify({
          model:"moonshot-v1-8k", temperature:0.8,
          messages:[{role:"system",content:AI_SYS},{role:"user",content:userPrompt()}]
        })
      });
      if(!res.ok) throw new Error("HTTP "+res.status+"："+(await res.text()).slice(0,160));
      const data=await res.json();
      let txt=(data.choices&&data.choices[0]&&data.choices[0].message.content||"").trim();
      txt=txt.replace(/^```(?:json)?/i,"").replace(/```$/,"").trim();
      const m=txt.match(/\{[\s\S]*\}/); if(m) txt=m[0];
      applyScript(JSON.parse(txt));
    }catch(err){
      setStatus("生成失败："+err.message+"（可改用「复制提示词」方式）","err");
    }
    btn.disabled=false;
  });
})();