/* ==========================================================
   Supermarket Simulator — script.js
   Bagian 1: utilitas, data, state, audio, renderer, dunia 3D
   ========================================================== */
(()=>{"use strict";

/* ---------- utilitas ---------- */
const EL={};
const $=id=>id.startsWith("ot-")?document.getElementById(id):(EL[id]||(EL[id]=document.getElementById(id)));
const rp=n=>"Rp"+Math.round(n).toLocaleString("id-ID");
const cl=(v,a,b)=>Math.max(a,Math.min(b,v));
const pick=a=>a[Math.floor(Math.random()*a.length)];
const sT=(id,t)=>{const e=$(id);if(e.textContent!==t)e.textContent=t};
const sD=(id,v)=>{const e=$(id);if(e.style.display!==v)e.style.display=v};
if(!window.THREE){$("boot").innerHTML="<p>Game butuh file <b>three.min.js</b> (atau internet) untuk berjalan.</p>";return}

/* ---------- data ---------- */
const P=[
{id:"mie",n:"Mi instan",p:3500,c:"#f2a23a"},{id:"air",n:"Air mineral",p:3000,c:"#5aa9e6"},
{id:"roti",n:"Roti",p:6500,c:"#c98d4f"},{id:"susu",n:"Susu kotak",p:5500,c:"#f5f5f5"},
{id:"keripik",n:"Keripik",p:8000,c:"#e05b4f"},{id:"sabun",n:"Sabun",p:12000,c:"#6fbf73"},
{id:"teh",n:"Teh botol",p:4500,c:"#d4a017"},{id:"kopi",n:"Kopi sachet",p:2500,c:"#7b4a2d"},
{id:"beras",n:"Beras 1kg",p:14000,c:"#e8e2c8"},{id:"minyak",n:"Minyak goreng",p:18000,c:"#f2d24b"},
{id:"soda",n:"Soda kaleng",p:6000,c:"#e5533a"},{id:"es",n:"Es krim",p:7500,c:"#f08fb0"},{id:"apel",n:"Apel 3 buah",p:9000,c:"#c93a3a"},{id:"wortel",n:"Wortel",p:5000,c:"#f08a24"},{id:"biskuit",n:"Biskuit",p:8500,c:"#e0a030"}];
const PP={};P.forEach(p=>PP[p.id]=p);
const SPH=28,DAYL=13*SPH,SC=SPH/10,fixk=v=>Math.round(v*SC/500)*500;   // 1 jam game = 28 detik
const maxP=id=>Math.round(PP[id].p*2/500)*500;
const pr=id=>Math.min(S.price[id]||PP[id].p,maxP(id));
const mc=id=>Math.round(PP[id].p*.7);                     // modal per barang
const def=()=>({money:300000,rating:3,served:0,land:0,
 stock:{mie:12,air:12,roti:8,susu:0,keripik:0,sabun:0,teh:0,kopi:0,beras:0,minyak:0,soda:0,es:0,apel:0,wortel:0,biskuit:0},
 shelves:["mie","air","roti"],boxes:[],carry:null,price:{},pos:{},day:1,dt:0,
 D:{rev:0,cogs:0,served:0,bad:0,out:0,rc:0,rs:0,on:0},rev:[],mk:{},mkp:{},debt:0,pn:null,sum:null,
 set:{snd:1,sens:1,vib:1,q:"auto"},help:0,worker:false,mach:1,op:false});
let S;
try{S={...def(),...JSON.parse(localStorage.getItem("supermarketV1"))};S.stock={...def().stock,...S.stock};S.set={...def().set,...S.set}}catch(e){S=def()}
const save=()=>{if(window.NOSAVE)return;try{localStorage.setItem("supermarketV1",JSON.stringify(S))}catch(e){}};
const rate=s=>{S.rating=cl(S.rating*.9+s*.1,1,5)};
const vib=n=>{if(S.set.vib!==0&&navigator.vibrate){try{navigator.vibrate(n)}catch(e){}}};
let mt;
function msg(t){const m=$("msg");m.textContent=t;m.classList.remove("show");void m.offsetWidth;m.classList.add("show");clearTimeout(mt);mt=setTimeout(()=>m.classList.remove("show"),2600)}

/* ---------- state runtime ---------- */
let CASH=false,B=null,MV=null,FILL=null,TH=0,SUMV=false,closedMsg=false;
let rainK=0,dOp,ev=null,evT=50,dayT=S.dt||0,spawnT=3,ordT=25,ordId=1,trT=0;
let cs=[],cr=[],ORD=[],TR=[];
let px=3,pz=4.8,yaw=0,pitch=0,vx=0,vz=0,jv={x:0,y:0},K={};
let tab=0,sel=null,AKc=-1,HK=0,bobT=0,stepT=0;

/* ---------- audio (sintesis, tanpa file) ---------- */
let AC=null,AMB=null;
function ensureAC(){if(!AC){try{AC=new (window.AudioContext||window.webkitAudioContext)()}catch(e){}}if(AC&&AC.state==="suspended")AC.resume()}
let RAING=null,rainSnd=false;
function amb(){if(AMB||!AC)return;try{const g=AC.createGain();g.gain.value=S.set.snd?.006:0;[110,165].forEach((f,i)=>{const o=AC.createOscillator();o.type="sine";o.frequency.value=f;const gg=AC.createGain();gg.gain.value=i?.6:1;o.connect(gg);gg.connect(g);o.start()});g.connect(AC.destination);AMB=g;
 /* suara hujan: derau tersaring (nyala saat event hujan) */
 const nb=AC.createBuffer(1,AC.sampleRate*2,AC.sampleRate),d=nb.getChannelData(0);let l=0;for(let i=0;i<d.length;i++){l=l*.55+(Math.random()*2-1)*.45;d[i]=l}
 const ns=AC.createBufferSource();ns.buffer=nb;ns.loop=true;const bp=AC.createBiquadFilter();bp.type="bandpass";bp.frequency.value=2600;bp.Q.value=.35;RAING=AC.createGain();RAING.gain.value=0;ns.connect(bp);bp.connect(RAING);RAING.connect(AC.destination);ns.start();
 music()}catch(e){}}
/* musik latar santai: akor pelan + nada pentatonik acak, dibuat langsung (tanpa file) */
function music(){const ch=[[130.8,261.6,329.6,392,493.9],[110,220,261.6,329.6,392],[87.3,174.6,220,261.6,329.6],[98,196,246.9,293.7,349.2]],pent=[523.3,587.3,659.3,784,880,1046.5,784,659.3];let bar=0;
 const note=(f,t0,dur,ty,vol,att)=>{const o=AC.createOscillator(),g=AC.createGain();o.type=ty;o.frequency.value=f;g.gain.setValueAtTime(.0001,t0);g.gain.linearRampToValueAtTime(vol,t0+att);g.gain.exponentialRampToValueAtTime(.0001,t0+dur);o.connect(g);g.connect(AC.destination);o.start(t0);o.stop(t0+dur+.05)};
 const tick=()=>{try{if(!S.set.snd||!AC||AC.state!=="running"||document.hidden)return;const t=AC.currentTime,c=ch[bar++%4];
  c.forEach((f,i)=>note(f,t,3.9,"sine",i?.011:.016,.9));
  const n=2+Math.floor(Math.random()*3);for(let k=0;k<n;k++)note(pick(pent),t+.4+k*(3/n)+Math.random()*.3,.9,"triangle",.016,.02)}catch(e){}};
 tick();setInterval(tick,3600)}
function snd(f,d,ty,v,f2){try{if(!S.set.snd)return;ensureAC();if(!AC)return;const o=AC.createOscillator(),g=AC.createGain(),t=AC.currentTime;o.type=ty||"sine";o.frequency.setValueAtTime(f,t);if(f2)o.frequency.exponentialRampToValueAtTime(f2,t+d);g.gain.setValueAtTime(v||.08,t);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g);g.connect(AC.destination);o.start(t);o.stop(t+d)}catch(e){}}
const SFX={
 door:()=>snd(330,.35,"sawtooth",.018,560),scan:()=>{snd(2000,.06,"square",.035);setTimeout(()=>snd(2700,.05,"square",.03),55)},
 cash:()=>{snd(1200,.12,"square",.06);setTimeout(()=>snd(1800,.25,"square",.06),90)},
 bad:()=>snd(160,.3,"sawtooth",.08),
 pop:()=>snd(500,.08,"triangle",.07,900),
 bell:()=>{snd(1000,.2,"sine",.06);setTimeout(()=>snd(1500,.3,"sine",.06),150)},
 step:()=>snd(90+Math.random()*30,.05,"triangle",.05),
 buy:()=>snd(700,.1,"square",.05,1000),
 tap:()=>snd(900,.05,"triangle",.05)};
addEventListener("pointerdown",()=>{ensureAC();amb()},{passive:true});

/* ---------- event & harga grosir ---------- */
const EVS=[{k:"ramai",n:"🔥 Jam ramai",t:40},{k:"hujan",n:"🌧️ Hujan deras",t:40},{k:"promo",n:"🏷️ Promo pemasok -30%",t:60}];
const cost=p=>Math.round(p.p*.7*12*(ev&&ev.k==="promo"?.7:1)/100)*100;
const mkl_old=id=>{const m=S.mk[id]||1,o=S.mkp[id]||1,ar=m>o+.001?"▲":m<o-.001?"▼":"•";return (m<.9?"🟢 murah":m>1.15?"🔴 mahal":"🟡 normal")+" "+ar};
function rollMarket(){P.forEach(p=>{const o=S.mk[p.id]||1;S.mkp[p.id]=o;S.mk[p.id]=Math.round(cl(1+(o-1)*.6+(Math.random()-.5)*.5,.7,1.5)*20)/20})}

/* ---------- renderer ---------- */
const cvs=$("c"),dpr=window.devicePixelRatio||1;
const R=new THREE.WebGLRenderer({canvas:cvs,antialias:false,powerPreference:"high-performance"});
const qCap=()=>S.set.q==="low"?.75:S.set.q==="high"?Math.min(dpr,2):Math.min(dpr,1.5);
let PR=qCap();
const sc=new THREE.Scene();
const NIGHT=new THREE.Color("#0f1a33"),DAY=new THREE.Color("#bcd9ee");
sc.background=DAY.clone();
const cam=new THREE.PerspectiveCamera(72,1,.1,60);cam.rotation.order="YXZ";sc.add(cam);
const hemi=new THREE.HemisphereLight("#ffffff","#8a8a8a",1.05);sc.add(hemi);
const dl=new THREE.DirectionalLight("#fff4e0",.45);dl.position.set(5,10,5);sc.add(dl);
const normFov=a=>a>1?cl(2*Math.atan(Math.tan(50*Math.PI/180)/a)*180/Math.PI,28,70):72;
const cashPose=()=>cam.aspect>=1.2?{x:3.25,y:1.65,z:5.15,tx:3.1,ty:1.2,tz:3.0,fov:62}:{x:3.0,y:2.0,z:6.2,tx:3.0,ty:1.2,tz:3.2,fov:92};
function applyFov(){cam.fov=CASH?cashPose().fov:normFov(cam.aspect);cam.updateProjectionMatrix()}
function rs(){const w=innerWidth,h=innerHeight;R.setPixelRatio(PR);R.setSize(w,h,false);cam.aspect=w/h;applyFov()}
let rzT;const rsLater=()=>{clearTimeout(rzT);rzT=setTimeout(rs,60)};
addEventListener("resize",rsLater);addEventListener("orientationchange",rsLater);
if(window.visualViewport)visualViewport.addEventListener("resize",rsLater);
rs();

/* ---------- material, geometri (di-cache), tekstur ---------- */
const MC={},mat=c=>MC[c]||(MC[c]=new THREE.MeshLambertMaterial({color:c}));
const GCH={},bgeo=(w,h,d)=>{const k=w+"|"+h+"|"+d;return GCH[k]||(GCH[k]=new THREE.BoxGeometry(w,h,d))};
function box(w,h,d,c,x,y,z,p){const m=new THREE.Mesh(bgeo(w,h,d),mat(c));m.position.set(x,y,z);p.add(m);return m}
function fit(g,t,z,maxW,bold){g.font=(bold?"bold ":"")+z+"px sans-serif";while(g.measureText(t).width>maxW&&z>10){z-=2;g.font=(bold?"bold ":"")+z+"px sans-serif"}}
function canvasTex(w,h,draw){const c=document.createElement("canvas");c.width=w;c.height=h;draw(c.getContext("2d"),w,h);const t=new THREE.CanvasTexture(c);t.userData={c};return t}
function label(t,s,flat){
 const tx=canvasTex(256,96,g=>{g.fillStyle="#fffe";g.fillRect(0,0,256,96);g.fillStyle="#222";g.textAlign="center";fit(g,t,34,236,1);g.fillText(t,128,42);fit(g,s,28,236,0);g.fillStyle="#2f6e55";g.fillText(s,128,80)});
 if(flat)return new THREE.Mesh(new THREE.PlaneGeometry(1.8,.68),new THREE.MeshBasicMaterial({map:tx}));
 const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:tx}));sp.scale.set(1.8,.68,1);return sp}
function signSprite(t,col){
 const tx=canvasTex(256,128,g=>{g.textAlign="center";g.lineJoin="round";fit(g,t,40,236,1);g.lineWidth=8;g.strokeStyle="#000c";g.strokeText(t,128,52);g.fillStyle="#fff";g.fillText(t,128,52);g.beginPath();g.moveTo(88,78);g.lineTo(168,78);g.lineTo(128,120);g.closePath();g.lineWidth=6;g.stroke();g.fillStyle=col;g.fill()});
 const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:tx}));sp.scale.set(1.9,.95,1);return sp}
function emoSprite(e){const tx=canvasTex(64,64,g=>{g.font="46px sans-serif";g.textAlign="center";g.textBaseline="middle";g.fillText(e,32,34)});const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:tx}));sp.scale.set(.5,.5,1);return sp}
function poster(t,sub,c1,c2){return new THREE.Mesh(new THREE.PlaneGeometry(1.5,1.05),new THREE.MeshBasicMaterial({map:canvasTex(256,180,(g,w,h)=>{const gr=g.createLinearGradient(0,0,w,h);gr.addColorStop(0,c1);gr.addColorStop(1,c2);g.fillStyle=gr;g.fillRect(0,0,w,h);g.strokeStyle="#fff";g.lineWidth=6;g.strokeRect(4,4,w-8,h-8);g.fillStyle="#fff";g.textAlign="center";fit(g,t,54,230,1);g.fillText(t,128,88);fit(g,sub,24,230,0);g.fillText(sub,128,128)})}))}

/* ---------- bentuk barang di rak ---------- */
/* ---------- PRODUK REALISTIS: bentuk halus + label bergambar ---------- */
/* Tiap produk = 1 geometri gabungan + 1 material (peta label + warna vertex), jadi ringan. */
const mkTxt=(g,t,x,y,s,c,o,mw)=>{const f=z=>"bold "+z+"px Impact,'Arial Black',Arial,sans-serif";g.font=f(s);if(mw)while(g.measureText(t).width>mw&&s>6){s-=1;g.font=f(s)}g.textAlign="center";g.textBaseline="middle";if(o){g.lineJoin="round";g.lineWidth=Math.max(2,s*.18);g.strokeStyle=o;g.strokeText(t,x,y)}g.fillStyle=c;g.fillText(t,x,y)};
const mkGrad=(g,x0,y0,x1,y1,st)=>{const q=g.createLinearGradient(x0,y0,x1,y1);st.forEach(s=>q.addColorStop(s[0],s[1]));return q};
const mkLathe=(a,seg)=>new THREE.LatheGeometry(a.map(q=>new THREE.Vector2(q[0],q[1])),seg||18);
const mkBand=(r,h,y,arc)=>{const g=new THREE.CylinderGeometry(r,r,h,22,1,true,-arc/2,arc);g.translate(0,y,0);return g};
const mkCyl=(r,h,y,seg)=>{const g=new THREE.CylinderGeometry(r,r,h,seg||16);g.translate(0,y,0);return g};
const mkBox=(w,h,d,x,y,z,rx)=>{const g=new THREE.BoxGeometry(w,h,d);if(rx)g.rotateX(rx);g.translate(x,y,z);return g};
const AR=1.7*Math.PI; // label botol melingkar ±300°, sambungan di belakang

/* kantong menggembung (pillow pack): bagian depan + belakang, tepi atas/bawah menyatu (segel) */
function mkPillow(w,h,d,pw,ph,sx,sy){
 const f=new THREE.PlaneGeometry(w,h,sx,sy),p=f.attributes.position;
 for(let i=0;i<p.count;i++){const u=Math.abs(p.getX(i))/(w/2),v=Math.abs(p.getY(i))/(h/2);
  p.setZ(i,d*Math.sqrt(Math.max(0,1-Math.pow(u,pw)))*Math.pow(Math.max(0,1-Math.pow(v,ph)),.45))}
 f.computeVertexNormals();const b=f.clone();b.rotateY(Math.PI);f.translate(0,h/2,0);b.translate(0,h/2,0);return[f,b]}

/* atlas: seni label di atas, strip putih 32px di bawah (dipakai semua bagian polos lewat warna vertex) */
function mkAtlas(tw,th,mw,mh,art){return canvasTex(tw,th,g=>{g.fillStyle="#fff";g.fillRect(0,0,tw,th);g.save();g.beginPath();g.rect(0,0,tw,th-32);g.clip();
 g.setTransform(tw/mw,0,0,(th-32)/mh,0,0);art(g,mw,mh);g.restore()})}

/* gabung semua bagian jadi satu geometri; c="lab" -> pakai label, selain itu warna polos */
function mkMerge(parts,tw,th){
 const pos=[],nor=[],uv=[],col=[],oy=32/th,tc=new THREE.Color();
 parts.forEach(pt=>{
  const g=pt.g.index?pt.g.toNonIndexed():pt.g.clone();
  const P3=g.attributes.position.array,N3=g.attributes.normal.array,U2=g.attributes.uv.array;
  const grs=g.groups.length?g.groups:[{start:0,count:P3.length/3,materialIndex:0}];
  grs.forEach(gr=>{
   const k=Array.isArray(pt.c)?pt.c[gr.materialIndex]:pt.c,lab=k==="lab";if(!lab)tc.set(k);
   for(let i=gr.start;i<gr.start+gr.count;i++){
    pos.push(P3[i*3],P3[i*3+1],P3[i*3+2]);nor.push(N3[i*3],N3[i*3+1],N3[i*3+2]);
    if(lab){uv.push(U2[i*2],oy+U2[i*2+1]*(1-oy));col.push(1,1,1)}else{uv.push(.5,16/th);col.push(tc.r,tc.g,tc.b)}}})});
 const G=new THREE.BufferGeometry();
 G.setAttribute("position",new THREE.Float32BufferAttribute(pos,3));G.setAttribute("normal",new THREE.Float32BufferAttribute(nor,3));
 G.setAttribute("uv",new THREE.Float32BufferAttribute(uv,2));G.setAttribute("color",new THREE.Float32BufferAttribute(col,3));
 G.computeBoundingBox();const bb=G.boundingBox,h=bb.max.y-bb.min.y;G.translate(0,-(bb.max.y+bb.min.y)/2,0);return{g:G,h}}

/* ---- gambar label (satuan: milimeter, titik 0,0 = kiri atas) ---- */
const ART={
mie:(g,w,h)=>{g.fillStyle=mkGrad(g,0,0,0,h,[[0,"#ffb52e"],[.5,"#ef5a24"],[1,"#b02a16"]]);g.fillRect(0,0,w,h);
 g.save();g.translate(w/2,170);for(let i=0;i<14;i++){g.rotate(Math.PI/7);g.fillStyle="rgba(255,255,255,.10)";g.beginPath();g.moveTo(0,0);g.lineTo(-22,-240);g.lineTo(22,-240);g.fill()}g.restore();
 g.fillStyle="rgba(0,0,0,.22)";for(let x=3;x<w;x+=7){g.fillRect(x,0,3,22);g.fillRect(x,h-22,3,22)}
 mkTxt(g,"MIE",w/2,56,50,"#fff","#7a1608",w-50);mkTxt(g,"INSTAN",w/2,98,40,"#ffe14d","#7a1608",w-40);
 g.strokeStyle="rgba(255,255,255,.75)";g.lineWidth=4;g.lineCap="round";for(let k=0;k<3;k++){g.beginPath();for(let y=0;y<=26;y+=2){const x=w/2-26+k*26+Math.sin(y/4+k)*5;y?g.lineTo(x,136-y):g.moveTo(x,136)}g.stroke()}
 g.fillStyle="#ffd34a";g.beginPath();g.ellipse(w/2,170,68,26,0,0,Math.PI*2);g.fill();
 g.strokeStyle="#e8961a";g.lineWidth=4;for(let k=0;k<5;k++){g.beginPath();for(let x=-62;x<=62;x+=4){const y=156+k*5+Math.sin(x/8+k*1.7)*4;x===-62?g.moveTo(w/2+x,y):g.lineTo(w/2+x,y)}g.stroke()}
 g.fillStyle="#fff";g.beginPath();g.moveTo(w/2-74,176);g.quadraticCurveTo(w/2,276,w/2+74,176);g.closePath();g.fill();
 g.fillStyle="#d8281c";g.beginPath();g.moveTo(w/2-62,196);g.quadraticCurveTo(w/2,250,w/2+62,196);g.closePath();g.fill();
 g.fillStyle="#7a1608";g.fillRect(22,236,w-44,28);mkTxt(g,"RASA AYAM BAWANG",w/2,250,15,"#fff",null,w-56);mkTxt(g,"NET 75 g",w/2,280,13,"#ffe9b0")},
air:(g,w,h)=>{g.fillStyle="#fff";g.fillRect(0,0,w,h);g.fillStyle="#1e88e5";g.fillRect(0,0,w,14);g.fillRect(0,h-14,w,14);
 g.fillStyle="#7cc1f5";g.beginPath();g.moveTo(0,h-14);for(let x=0;x<=w;x+=4)g.lineTo(x,h-22+Math.sin(x/9)*5);g.lineTo(w,h-14);g.fill();
 g.fillStyle="#bfe0fa";g.beginPath();g.moveTo(w/2-62,h-20);g.lineTo(w/2-38,h-52);g.lineTo(w/2-24,h-36);g.lineTo(w/2-6,h-58);g.lineTo(w/2+16,h-30);g.lineTo(w/2+34,h-48);g.lineTo(w/2+62,h-20);g.fill();
 mkTxt(g,"AIR",w/2,30,32,"#0d47a1",null,56);mkTxt(g,"MINERAL",w/2,56,20,"#1e88e5",null,60);
 g.fillStyle="#42a5f5";[[w/2-46,26],[w/2+46,30]].forEach(([x,y])=>{g.beginPath();g.moveTo(x,y-9);g.quadraticCurveTo(x+8,y+3,x,y+9);g.quadraticCurveTo(x-8,y+3,x,y-9);g.fill()})},
susu:(g,w,h)=>{g.fillStyle="#fff";g.fillRect(0,0,w,h);g.fillStyle="#2e66b5";g.fillRect(0,0,w,46);
 g.fillStyle="#fff";g.beginPath();g.moveTo(0,46);for(let x=0;x<=w;x+=3)g.lineTo(x,46+Math.sin(x/6)*7+7);g.lineTo(w,40);g.lineTo(0,40);g.fill();
 mkTxt(g,"SUSU",w/2,76,30,"#2e66b5");mkTxt(g,"FULL CREAM",w/2,100,11,"#1f4e96");
 g.fillStyle="#111";[[16,140,13],[52,150,10],[30,172,12],[58,128,8]].forEach(([x,y,r])=>{g.beginPath();g.ellipse(x,y,r,r*.7,.5,0,Math.PI*2);g.fill()});
 g.fillStyle="#d7e6fa";g.beginPath();g.ellipse(w/2,128,22,28,0,0,Math.PI*2);g.fill();g.fillStyle="#fff";g.fillRect(w/2-14,112,28,34);
 mkTxt(g,"UHT",w/2,130,16,"#2e66b5");mkTxt(g,"1 L",w/2,176,16,"#2e66b5")},
keripik:(g,w,h)=>{g.fillStyle=mkGrad(g,0,0,0,h,[[0,"#ff8a1f"],[.45,"#d7352b"],[1,"#8c1710"]]);g.fillRect(0,0,w,h);
 g.save();g.translate(w/2,170);for(let i=0;i<18;i++){g.rotate(Math.PI/9);g.fillStyle="rgba(255,235,120,.14)";g.beginPath();g.moveTo(0,0);g.lineTo(-26,-260);g.lineTo(26,-260);g.fill()}g.restore();
 g.fillStyle="rgba(0,0,0,.25)";for(let x=3;x<w;x+=7){g.fillRect(x,0,3,22);g.fillRect(x,h-22,3,22)}
 mkTxt(g,"KERIPIK",w/2,62,46,"#fff","#6b0f09",w-40);mkTxt(g,"RENYAH GURIH",w/2,100,19,"#ffe14d","#6b0f09",w-50);
 [[90,170,34,.3],[150,150,30,-.5],[120,210,36,.9],[70,235,26,-.2],[170,225,28,.6]].forEach(([x,y,r,a])=>{g.save();g.translate(x,y);g.rotate(a);g.fillStyle="#f6c54a";g.strokeStyle="#a8650c";g.lineWidth=3;g.beginPath();g.ellipse(0,0,r,r*.78,0,0,Math.PI*2);g.fill();g.stroke();g.fillStyle="#e39a1f";for(let k=0;k<5;k++){g.beginPath();g.arc(-r*.4+k*r*.2,Math.sin(k*2)*r*.25,2.5,0,7);g.fill()}g.restore()});
 g.fillStyle="#1f7a3a";g.fillRect(24,272,w-48,34);mkTxt(g,"RASA BALADO",w/2,289,22,"#fff")},
sabun:(g,w,h)=>{g.fillStyle="#fff";g.fillRect(0,0,w,h);g.fillStyle="#2fa86a";g.fillRect(0,0,w,12);g.fillRect(0,h-12,w,12);
 g.strokeStyle="#bfead2";g.lineWidth=3;[[w/2-38,24,7],[w/2-30,58,5],[w/2+40,28,6],[w/2+32,58,8]].forEach(([x,y,r])=>{g.beginPath();g.arc(x,y,r,0,7);g.stroke()});
 mkTxt(g,"SABUN",w/2,28,26,"#1c7a4b",null,46);mkTxt(g,"CAIR",w/2,52,20,"#2fa86a",null,34);mkTxt(g,"Segar & Lembut",w/2,69,9,"#3c3c3c",null,48)},
roti:(g,w,h)=>{g.fillStyle=mkGrad(g,0,0,0,h,[[0,"#fff6da"],[1,"#f2dca0"]]);g.fillRect(0,0,w,h);
 g.fillStyle="rgba(0,0,0,.14)";for(let x=3;x<w;x+=7){g.fillRect(x,0,3,20);g.fillRect(x,h-20,3,20)}
 g.fillStyle="#d02f2f";g.fillRect(0,34,w,50);mkTxt(g,"ROTI",w/2,52,30,"#fff");mkTxt(g,"TAWAR",w/2,74,22,"#ffe14d");
 [[w/2-44,170],[w/2+30,176]].forEach(([x,y],i)=>{g.save();g.translate(x,y);g.rotate(i?.12:-.1);g.fillStyle="#b9783a";g.beginPath();g.moveTo(-34,40);g.lineTo(-34,-6);g.quadraticCurveTo(-48,-34,-14,-40);g.quadraticCurveTo(0,-48,14,-40);g.quadraticCurveTo(48,-34,34,-6);g.lineTo(34,40);g.closePath();g.fill();
  g.fillStyle="#f8e2b0";g.beginPath();g.moveTo(-28,36);g.lineTo(-28,-4);g.quadraticCurveTo(-38,-28,-12,-33);g.quadraticCurveTo(0,-39,12,-33);g.quadraticCurveTo(38,-28,28,-4);g.lineTo(28,36);g.closePath();g.fill();g.restore()});
 mkTxt(g,"LEMBUT & EMPUK",w/2,244,15,"#a5521a",null,w-60);mkTxt(g,"400 g",w/2,268,13,"#8a6a30")},
teh:(g,w,h)=>{g.fillStyle=mkGrad(g,0,0,0,h,[[0,"#1f8a4c"],[1,"#146236"]]);g.fillRect(0,0,w,h);
 g.fillStyle="#2bb066";[[w/2-52,16,0.5],[w/2+54,18,-0.4],[w/2-48,68,-0.2],[w/2+50,70,0.3]].forEach(([x,y,a])=>{g.save();g.translate(x,y);g.rotate(a);g.beginPath();g.ellipse(0,0,13,5,0,0,7);g.fill();g.restore()});
 g.fillStyle="#fff";g.beginPath();g.arc(w/2,h/2,29,0,7);g.fill();g.strokeStyle="#d72b2b";g.lineWidth=4;g.stroke();
 mkTxt(g,"TEH",w/2,h/2-7,22,"#146236",null,38);mkTxt(g,"BOTOL",w/2,h/2+11,12,"#d72b2b",null,38);
 g.fillStyle="#d72b2b";g.fillRect(0,h-14,w,7)},
kopi:(g,w,h)=>{g.fillStyle=mkGrad(g,0,0,0,h,[[0,"#5a3820"],[1,"#2b170a"]]);g.fillRect(0,0,w,h);
 g.fillStyle="rgba(255,255,255,.12)";for(let x=3;x<w;x+=6){g.fillRect(x,0,2,18);g.fillRect(x,h-18,2,18)}
 g.strokeStyle="#e0b24a";g.lineWidth=3;g.strokeRect(10,26,w-20,h-52);
 g.fillStyle="#7b4a2a";g.strokeStyle="#e0b24a";g.lineWidth=3;g.beginPath();g.ellipse(w/2,92,30,40,.5,0,7);g.fill();g.stroke();g.strokeStyle="#2b170a";g.lineWidth=5;g.beginPath();g.moveTo(w/2-14,66);g.quadraticCurveTo(w/2+10,92,w/2+6,120);g.stroke();
 mkTxt(g,"KOPI",w/2,152,36,"#f4cf6a","#1d0f05");mkTxt(g,"HITAM PEKAT",w/2,178,12,"#fff",null,w-34);mkTxt(g,"sachet 25 g",w/2,196,10,"#e0b24a")},
beras:(g,w,h)=>{g.fillStyle="#f1e8d2";g.fillRect(0,0,w,h);g.strokeStyle="rgba(150,130,90,.30)";g.lineWidth=1;for(let x=0;x<w;x+=5){g.beginPath();g.moveTo(x,0);g.lineTo(x,h);g.stroke()}for(let y=0;y<h;y+=5){g.beginPath();g.moveTo(0,y);g.lineTo(w,y);g.stroke()}
 g.fillStyle="#2f8f4e";g.fillRect(0,50,w,16);g.fillRect(0,h-66,w,16);
 g.fillStyle="#fff";g.beginPath();g.arc(w/2,150,62,0,7);g.fill();g.strokeStyle="#2f8f4e";g.lineWidth=6;g.stroke();
 g.fillStyle="#e8c872";for(let i=0;i<9;i++){g.save();g.translate(w/2-32+i*8,200);g.rotate(-.5+i*.12);g.beginPath();g.ellipse(0,0,3,9,0,0,7);g.fill();g.restore()}
 mkTxt(g,"BERAS",w/2,126,34,"#1f6b36",null,100);mkTxt(g,"PULEN WANGI",w/2,164,14,"#2f8f4e",null,100);mkTxt(g,"1 kg",w/2,270,34,"#1f6b36","#fff")},
minyak:(g,w,h)=>{g.fillStyle=mkGrad(g,0,0,0,h,[[0,"#ffcf2e"],[1,"#f08c14"]]);g.fillRect(0,0,w,h);
 g.fillStyle="#d62828";g.fillRect(0,0,w,12);g.fillRect(0,h-12,w,12);
 g.fillStyle="rgba(255,255,255,.28)";g.beginPath();g.moveTo(w/2,16);g.quadraticCurveTo(w/2+34,62,w/2,100);g.quadraticCurveTo(w/2-34,62,w/2,16);g.fill();
 mkTxt(g,"MINYAK",w/2,36,28,"#fff","#a31515",70);mkTxt(g,"GORENG",w/2,64,28,"#fff","#a31515",70);mkTxt(g,"JERNIH & SEHAT",w/2,90,11,"#7a1608",null,66);mkTxt(g,"1 LITER",w/2,h-6,9,"#fff",null,40)},
soda:(g,w,h)=>{g.fillStyle=mkGrad(g,0,0,0,h,[[0,"#ff8a3a"],[1,"#d8261c"]]);g.fillRect(0,0,w,h);
 g.fillStyle="rgba(255,255,255,.30)";g.beginPath();g.moveTo(0,h*.58);g.bezierCurveTo(w*.3,h*.2,w*.6,h*.95,w,h*.45);g.lineTo(w,h*.64);g.bezierCurveTo(w*.6,h*1.08,w*.3,h*.4,0,h*.76);g.fill();
 g.fillStyle="#fff";g.fillRect(0,0,w,6);g.fillRect(0,h-6,w,6);
 mkTxt(g,"SODA",w/2,30,34,"#fff","#8c1408",62);mkTxt(g,"JERUK",w/2,60,20,"#ffe14d","#8c1408",58);mkTxt(g,"330 ml",w/2,80,10,"#fff",null,40)},
es:(g,w,h)=>{g.fillStyle=mkGrad(g,0,0,0,h,[[0,"#fff3e0"],[1,"#ffd9e6"]]);g.fillRect(0,0,w,h);
 g.fillStyle="#f08fb0";g.beginPath();g.moveTo(0,h-12);for(let x=0;x<=w;x+=4)g.lineTo(x,h-14+Math.sin(x/7)*6);g.lineTo(w,h);g.lineTo(0,h);g.fill();
 mkTxt(g,"ES KRIM",w/2,22,30,"#d9457c","#fff",84);mkTxt(g,"VANILA",w/2,42,15,"#a63a5f",null,70)},
biskuit:(g,w,h)=>{g.fillStyle=mkGrad(g,0,0,0,h,[[0,"#ffcf5a"],[1,"#c97d1a"]]);g.fillRect(0,0,w,h);
 g.fillStyle="rgba(0,0,0,.18)";for(let x=3;x<w;x+=7){g.fillRect(x,0,3,16);g.fillRect(x,h-16,3,16)}
 g.fillStyle="#5a2d12";g.fillRect(0,34,w,50);mkTxt(g,"BISKUIT",w/2,50,34,"#ffe9b0",null,w-30);mkTxt(g,"COKELAT",w/2,74,22,"#fff",null,w-40);
 [[60,150,30],[112,170,26],[84,208,28]].forEach(([x,y,r])=>{g.fillStyle="#c68a3e";g.beginPath();g.arc(x,y,r,0,7);g.fill();g.strokeStyle="#8a5a22";g.lineWidth=3;g.stroke();g.fillStyle="#4a2410";for(let k=0;k<6;k++){g.beginPath();g.arc(x-r*.5+(k*7)%(r),y-r*.4+(k*11)%(r*.9),3,0,7);g.fill()}});
 mkTxt(g,"Renyah & manis",w/2,h-34,12,"#5a2d12",null,w-30)},
wortel:(g,w,h)=>{g.fillStyle="#fff";g.fillRect(0,0,w,h);g.fillStyle="#f08a24";g.fillRect(0,0,8,h);mkTxt(g,"WORTEL",w/2+4,h/2,22,"#d36b0c",null,w-24)}
};

/* ---- bentuk tiap produk ---- */
const PRODS={
mie:()=>{const w=.22,h=.30,d=.06,[f,b]=mkPillow(w,h,d,2.6,4,8,12);return{tw:256,th:512,mm:[220,300],art:ART.mie,parts:[{g:f,c:"lab"},{g:b,c:"#e0561f"},{g:mkBox(w,.022,.012,0,h-.011,0),c:"#b8401a"},{g:mkBox(w,.022,.012,0,.011,0),c:"#b8401a"}]}},
air:()=>({tw:512,th:256,mm:[.0462*AR*1000,105],art:ART.air,parts:[
 {g:mkLathe([[0,0],[.036,0],[.043,.008],[.045,.02],[.045,.16],[.043,.19],[.034,.22],[.022,.243],[.0195,.25],[.0195,.262],[.0215,.264],[.0215,.268],[0,.268]]),c:"#bfe1f6"},
 {g:mkCyl(.0235,.03,.262),c:"#1976d2"},{g:mkBand(.0462,.105,.105,AR),c:"lab"}]}),
susu:()=>{const w=.075,h=.19,d=.075;return{tw:256,th:512,mm:[75,190],art:ART.susu,parts:[
 {g:new THREE.BoxGeometry(w,h,d).translate(0,h/2,0),c:["#f4f6fa","#f4f6fa","#2e66b5","#cfd6e2","lab","lab"]},
 {g:mkBox(w,.053,.053,0,h,0,Math.PI/4),c:"#2e66b5"},{g:mkBox(w,.008,.012,0,h+.0375,0),c:"#1f4e96"}]}},
keripik:()=>{const w=.24,h=.34,d=.10,[f,b]=mkPillow(w,h,d,2.2,3,10,12);return{tw:256,th:512,mm:[240,340],art:ART.keripik,parts:[{g:f,c:"lab"},{g:b,c:"#c4281e"},{g:mkBox(w,.024,.012,0,h-.012,0),c:"#9c1d15"},{g:mkBox(w,.024,.012,0,.012,0),c:"#9c1d15"}]}},
sabun:()=>({tw:512,th:256,mm:[.0372*AR*1000,80],art:ART.sabun,parts:[
 {g:mkLathe([[0,0],[.03,0],[.036,.008],[.0365,.02],[.0365,.14],[.034,.155],[.024,.168],[.014,.176],[.013,.185],[0,.185]]),c:"#5cc08a"},
 {g:mkCyl(.0185,.022,.196),c:"#f2f2f2"},{g:mkCyl(.006,.03,.222,10),c:"#f2f2f2"},{g:mkBox(.045,.014,.016,.015,.24,0),c:"#f2f2f2"},
 {g:mkBand(.0372,.08,.085,AR),c:"lab"}]}),
roti:()=>{const w=.27,h=.30,d=.08,[f,b]=mkPillow(w,h,d,3.2,5,10,12);return{tw:256,th:512,mm:[270,300],art:ART.roti,parts:[{g:f,c:"lab"},{g:b,c:"#f6e7c1"},{g:mkBox(w,.02,.012,0,h-.01,0),c:"#d9bd7c"},{g:mkBox(w,.02,.012,0,.01,0),c:"#d9bd7c"},{g:mkBox(.05,.022,.026,0,h+.004,0),c:"#d33a3a"}]}},
teh:()=>({tw:512,th:256,mm:[.0346*AR*1000,85],art:ART.teh,parts:[
 {g:mkLathe([[0,0],[.03,0],[.034,.01],[.034,.14],[.03,.165],[.02,.19],[.014,.215],[.0125,.235],[.0145,.238],[.0145,.243],[0,.243]]),c:"#5a2f14"},
 {g:mkCyl(.0175,.01,.245),c:"#d8dce2"},{g:mkBand(.0346,.085,.085,AR),c:"lab"}]}),
kopi:()=>{const w=.15,h=.21,d=.035,[f,b]=mkPillow(w,h,d,2.4,3.5,8,12);return{tw:256,th:512,mm:[150,210],art:ART.kopi,parts:[{g:f,c:"lab"},{g:b,c:"#3b2415"},{g:mkBox(w,.018,.01,0,h-.009,0),c:"#2a190d"},{g:mkBox(w,.018,.01,0,.009,0),c:"#2a190d"}]}},
beras:()=>{const w=.20,h=.32,d=.075,[f,b]=mkPillow(w,h,d,4.5,7,10,14);return{tw:256,th:512,mm:[200,320],art:ART.beras,parts:[{g:f,c:"lab"},{g:b,c:"#efe6d0"},{g:mkBox(w,.026,.012,0,h-.013,0),c:"#cbbd94"},{g:mkBox(w,.026,.012,0,.013,0),c:"#cbbd94"}]}},
minyak:()=>({tw:512,th:256,mm:[.0527*AR*1000,120],art:ART.minyak,parts:[
 {g:mkLathe([[0,0],[.04,0],[.05,.008],[.052,.02],[.052,.16],[.05,.19],[.042,.215],[.03,.235],[.02,.25],[.0185,.26],[.0185,.272],[0,.272]]),c:"#f2b51e"},
 {g:mkCyl(.023,.026,.274),c:"#d62828"},{g:mkBand(.0527,.12,.1,AR),c:"lab"}]}),
soda:()=>({k:1.4,tw:512,th:256,mm:[179,90],art:ART.soda,parts:[
 {g:mkLathe([[0,0],[.028,0],[.0325,.004],[.033,.01],[.033,.115],[.0325,.121],[.029,.124],[.0275,.127],[0,.127]]),c:"#c9ced6"},
 {g:mkBand(.0336,.09,.063,AR),c:"lab"},{g:mkBox(.022,.002,.013,0,.1285,0),c:"#8e949c"}]}),
es:()=>{const bd=new THREE.CylinderGeometry(.0527,.0425,.07,22,1,true,-AR/2,AR);bd.translate(0,.05,0);return{k:1.35,tw:512,th:256,mm:[281,70],art:ART.es,parts:[
 {g:mkLathe([[0,0],[.038,0],[.0415,.004],[.0525,.092],[.0535,.098],[0,.098]]),c:"#f4eadb"},
 {g:bd,c:"lab"},{g:mkCyl(.0545,.012,.104),c:"#f08fb0"},{g:mkCyl(.014,.006,.113,10),c:"#d9457c"}]}},
apel:()=>{const ap=[[-.047,0,.01],[.047,0,.01],[0,.0814,-.008]],A=[];
 ap.forEach(([x,y,z])=>{A.push({g:mkLathe([[.0001,0],[.022,.003],[.04,.013],[.047,.03],[.0455,.05],[.037,.066],[.02,.074],[.008,.0715],[.0001,.066]],14).translate(x,y,z),c:"#c62f2f"});
  A.push({g:mkCyl(.003,.024,.077,6).translate(x,y,z),c:"#5a3a1c"});A.push({g:mkBox(.03,.003,.014,.017,.085,0).translate(x,y,z),c:"#3f9a3a"})});
 return{tw:64,th:64,mm:[1,1],art:()=>{},parts:A}},
wortel:()=>{const A=[{g:mkBox(.27,.02,.14,0,.01,0),c:"#f4f1ea"},{g:new THREE.BoxGeometry(.09,.034,.004).translate(0,.017,.0722),c:["#fff","#fff","#fff","#fff","lab","#fff"]}];
 [-.04,0,.04].forEach(z=>{const c=new THREE.CylinderGeometry(.021,.005,.24,8);c.rotateZ(Math.PI/2);c.translate(.005,.043,z);A.push({g:c,c:"#f08a24"});
  const l=new THREE.CylinderGeometry(.016,.008,.05,6);l.rotateZ(Math.PI/2);l.translate(-.135,.043,z);A.push({g:l,c:"#3fa34d"})});
 return{tw:128,th:96,mm:[90,34],art:ART.wortel,parts:A}},
biskuit:()=>{const w=.17,h=.22,d=.045;return{tw:256,th:512,mm:[170,220],art:ART.biskuit,parts:[
 {g:new THREE.BoxGeometry(w,h,d).translate(0,h/2,0),c:["#c9902c","#c9902c","#a8731c","#a8731c","lab","lab"]}]}}
};

/* ---- bangun semua: GE (geometri), GH (tinggi), IM (material) ---- */
const GE={},GH={},IM={};
P.forEach(p=>{const s=PRODS[p.id](),r=mkMerge(s.parts,s.tw,s.th);if(s.k){r.g.scale(s.k,s.k,s.k);r.h*=s.k}GE[p.id]=r.g;GH[p.id]=r.h;
 const m=new THREE.MeshLambertMaterial({map:mkAtlas(s.tw,s.th,s.mm[0],s.mm[1],s.art),vertexColors:true});m.userData.keep=1;IM[p.id]=m});
/* ---------- aset bersama ---------- */
const LM=new THREE.MeshBasicMaterial({color:"#fffbe8"}),winM=new THREE.MeshBasicMaterial({color:"#bcd9ee"});
const OLM=new THREE.MeshBasicMaterial({color:"#2bff3a",side:THREE.BackSide,visible:false});
/* suasana: hujan di jendela/pintu & cahaya lampu malam */
const RAINTX=canvasTex(128,256,g=>{g.strokeStyle="rgba(215,230,250,.9)";g.lineWidth=2;g.lineCap="round";for(let i=0;i<30;i++){const x=Math.random()*128,y=Math.random()*256,l=16+Math.random()*28;g.beginPath();g.moveTo(x,y);g.lineTo(x-3,y+l);g.stroke()}});
RAINTX.wrapS=RAINTX.wrapT=THREE.RepeatWrapping;const RAINTX2=RAINTX.clone();RAINTX2.needsUpdate=true;RAINTX2.repeat.set(4,2);
const RAINM=new THREE.MeshBasicMaterial({map:RAINTX,transparent:true,opacity:0,depthWrite:false}),RAINM2=new THREE.MeshBasicMaterial({map:RAINTX2,transparent:true,opacity:0,depthWrite:false});
const HALOM=new THREE.MeshBasicMaterial({map:canvasTex(128,128,g=>{const r=g.createRadialGradient(64,64,0,64,64,64);r.addColorStop(0,"rgba(255,236,180,1)");r.addColorStop(1,"rgba(255,236,180,0)");g.fillStyle=r;g.fillRect(0,0,128,128)}),transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending});
[RAINM,RAINM2,HALOM].forEach(m=>m.userData.keep=1);
const PEND=new THREE.CylinderGeometry(.09,.24,.2,14),CLKR=new THREE.CircleGeometry(.31,24),CLKF=new THREE.CircleGeometry(.28,24),PLG=new THREE.CylinderGeometry(.22,.17,.4,10),RUGG=new THREE.CircleGeometry(1.1,28),RUGI=new THREE.CircleGeometry(.82,28);
const RAINPW=new THREE.PlaneGeometry(1.8,1.2),RAINPO=new THREE.PlaneGeometry(7,3.4),HALOG=new THREE.PlaneGeometry(3.4,1.9),RAINC=new THREE.Color("#7f8b99");
const SHM=new THREE.MeshBasicMaterial({color:"#000",transparent:true,opacity:.22,depthWrite:false});
const CIRC=new THREE.CircleGeometry(.32,12),SPHG=new THREE.SphereGeometry(.17,8,6);
const FT=(()=>{const t=canvasTex(128,128,g=>{g.fillStyle="#e6e1d2";g.fillRect(0,0,128,128);g.fillStyle="#d7d2c0";g.fillRect(0,0,64,64);g.fillRect(64,64,64,64);g.strokeStyle="#bdb8a4";g.lineWidth=2;g.strokeRect(0,0,128,128);g.strokeRect(0,0,64,64);g.strokeRect(64,64,64,64)});t.wrapS=t.wrapT=THREE.RepeatWrapping;return t})();
const SKIN=["#f3cfa6","#e0b088","#c68a5c","#8d5a3b"],PANTS=["#3b4468","#2f3e46","#5c4033","#4a4a4a"];
const HAIR=["#3b2a20","#6b4a2f","#d9722b","#222"],SH=["#e0a458","#a98ad9","#6fc4d9","#e88a8a","#e8d27a"];

/* ---------- orang (pelanggan, kurir, pegawai) ---------- */
/* geometri badan (dipakai bersama semua orang, jadi ringan) */
const PGM={cyl:(a,b,h,n)=>{const k=a+"|"+b+"|"+h+"|"+n;return PGM[k]||(PGM[k]=new THREE.CylinderGeometry(a,b,h,n||10))},
 sph:(r,w,h)=>{const k="s"+r+"|"+w+"|"+h;return PGM[k]||(PGM[k]=new THREE.SphereGeometry(r,w||10,h||8))}};
const PHEAD=new THREE.SphereGeometry(1,14,10),PCAP=new THREE.SphereGeometry(1,14,8,0,Math.PI*2,0,Math.PI*.44),PSH=new THREE.SphereGeometry(1,10,6,0,Math.PI*2,0,Math.PI*.5);
function pm(geo,c,x,y,z,p,sx,sy,sz){const m=new THREE.Mesh(geo,mat(c));m.position.set(x,y,z);if(sx)m.scale.set(sx,sy,sz);p.add(m);return m}
function person(col,hair,skin,pants,hat,nb,kind){
 skin=skin||"#f3cfa6";pants=pants||"#3b4468";const g=new THREE.Group(),shoe="#2b2623";
 const sh=new THREE.Mesh(CIRC,SHM);sh.rotation.x=-Math.PI/2;sh.position.y=.012;g.add(sh);
 /* kaki: pivot di pinggul, celana + sepatu */
 g.userData.l=[-1,1].map(s=>{const L=new THREE.Group();L.position.set(s*.105,.64,0);g.add(L);
  pm(PGM.cyl(.085,.07,.32,9),pants,0,-.16,0,L);
  const K=new THREE.Group();K.position.y=-.32;L.add(K);L.userData.k=K;
  pm(PGM.sph(.07,8,6),pants,0,0,0,K);pm(PGM.cyl(.07,.058,.3,9),pants,0,-.15,0,K);pm(PHEAD,shoe,0,-.3,.035,K,.075,.045,.115);return L});
 /* pinggul + ikat pinggang */
 pm(PGM.cyl(.2,.2,.14,12),pants,0,.66,0,g,1,1,.68);pm(PGM.cyl(.205,.205,.035,12),"#2a2a2a",0,.74,0,g,1,1,.68);
 /* badan: bahu lebih lebar dari pinggang */
 pm(PGM.cyl(.215,.185,.5,12),col,0,.99,0,g,1,1,.66);
 pm(PSH,col,0,1.24,0,g,.215,.07,.14);
 pm(PGM.cyl(.062,.07,.09,8),skin,0,1.3,0,g);                 /* leher */
 pm(PGM.cyl(.075,.075,.025,8),"#ffffff",0,1.275,.012,g,1,1,1);   /* kerah */
 /* tangan: pivot di bahu, lengan baju + lengan bawah + telapak */
 g.userData.a=[-1,1].map(s=>{const A=new THREE.Group();A.position.set(s*.265,1.2,0);g.add(A);
  pm(PGM.sph(.075,8,6),col,0,0,0,A);
  pm(PGM.cyl(.062,.056,.27,8),col,0,-.14,0,A);
  const E=new THREE.Group();E.position.y=-.27;A.add(E);A.userData.e=E;
  pm(PGM.cyl(.05,.042,.25,8),skin,0,-.125,0,E);
  pm(PGM.sph(.052,8,6),skin,0,-.27,0,E);return A});
 /* kepala: agak lonjong, ada telinga, hidung, mata, alis, mulut */
 const hd=new THREE.Group();hd.position.set(0,1.44,0);g.add(hd);g.userData.h=hd;g.userData.k=0;g.userData.ph=0;g.rotation.order="YXZ";
 pm(PHEAD,skin,0,0,0,hd,.135,.16,.145);
 pm(PGM.sph(.028,6,5),skin,-.14,-.01,0,hd);pm(PGM.sph(.028,6,5),skin,.14,-.01,0,hd);
 pm(PGM.sph(.026,6,5),skin,0,-.025,.15,hd,1,1.2,1);
 [-1,1].forEach(s=>{pm(PGM.sph(.02,6,5),"#fafafa",s*.052,.015,.128,hd,1,1,.5);pm(PGM.sph(.011,6,5),"#1b1b1b",s*.052,.015,.14,hd);
  pm(bgeo(.055,.014,.01),hair,s*.052,.058,.13,hd)});
 pm(bgeo(.06,.012,.01),"#a8554f",0,-.075,.138,hd);
 /* rambut: tutup kepala + rambut belakang (kadang panjang) */
 pm(PCAP,hair,0,.015,-.012,hd,.15,.17,.158);
 const long=Math.random()<.4;pm(PGM.sph(1,10,8),hair,0,-.01,-.06,hd,.15,long?.2:.14,.1);
 if(long)pm(bgeo(.27,.24,.07),hair,0,-.13,-.1,hd);
 /* topi */
 if(hat&&kind!=="courier"){pm(PCAP,col,0,.04,0,hd,.158,.15,.166);pm(bgeo(.2,.012,.14),col,0,.035,.17,hd)}
 /* seragam: pegawai = celemek + papan nama, kurir = helm + tas ransel */
 if(kind==="worker"){pm(bgeo(.36,.46,.02),"#f6f3ea",0,.93,.135,g);pm(bgeo(.2,.14,.02),"#f6f3ea",0,1.2,.13,g);
  [-1,1].forEach(s=>pm(bgeo(.03,.1,.02),"#f6f3ea",s*.09,1.27,.1,g));pm(bgeo(.085,.036,.012),"#2f9e6e",.09,1.12,.15,g);pm(bgeo(.3,.03,.02),"#d9d4c4",0,.74,.14,g)}
 if(kind==="courier"){pm(PCAP,col,0,.03,0,hd,.168,.17,.176);pm(bgeo(.2,.012,.11),"#1d6b3d",0,.045,.15,hd);pm(bgeo(.05,.04,.01),"#fff",0,.1,.16,hd);
  pm(bgeo(.36,.4,.2),col,0,1.0,-.2,g);pm(bgeo(.37,.05,.21),"#f3f3f3",0,1.14,-.2,g);pm(bgeo(.2,.1,.01),"#1d6b3d",0,.98,-.305,g);
  [-1,1].forEach(s=>pm(bgeo(.04,.34,.02),"#1d6b3d",s*.1,1.04,-.07,g))}
 /* tas belanja di tangan kanan */
 if(!nb){const T=g.userData.a[1].userData.e,bg1=pm(bgeo(.22,.2,.12),"#c0504d",0,-.39,.02,T),bg2=pm(bgeo(.22,.03,.12),"#8a3a38",0,-.29,.02,T);g.userData.bag=[bg1,bg2];
  const hn=new THREE.Mesh(new THREE.TorusGeometry(.055,.008,5,10,Math.PI),mat("#8a3a38"));hn.position.set(0,-.28,.02);T.add(hn);g.userData.bag.push(hn)}
 return g}
function animPerson(m,mv,now,seed){
 const u=m.userData,dt=Math.min(.1,Math.max(0,now-(u.t===undefined?now:u.t)));u.t=now;
 u.k+=((mv?1:0)-u.k)*Math.min(1,dt*7);u.ph+=dt*8.5*u.k;const k=u.k,ph=u.ph+seed*3,a=Math.sin(ph)*k,c=Math.cos(ph);
 const[l0,l1]=u.l,[a0,a1]=u.a;
 l0.rotation.x=a*.62;l1.rotation.x=-a*.62;
 l0.userData.k.rotation.x=.05+k*.75*Math.max(0,-c);l1.userData.k.rotation.x=.05+k*.75*Math.max(0,c);
 a0.rotation.x=-a*.5;a1.rotation.x=a*.5;
 a0.userData.e.rotation.x=-(.1+k*.5*Math.max(0,a));a1.userData.e.rotation.x=-(.1+k*.5*Math.max(0,-a));
 u.h.rotation.y=Math.sin(ph)*.07*k;u.h.rotation.x=-.04*k+Math.sin(now*1.3+seed)*.015*(1-k);
 const rr=u.rr=(u.rr||0)+((u.rc||0)-(u.rr||0))*Math.min(1,dt*9);
 if(rr>.01){a0.rotation.x=a0.rotation.x*(1-rr)-1.4*rr;a0.userData.e.rotation.x=a0.userData.e.rotation.x*(1-rr)-.3*rr;u.h.rotation.x+=.12*rr}
 const py=u.pyr=(u.pyr||0)+((u.py||0)-(u.pyr||0))*Math.min(1,dt*6);
 if(py>.01){a1.rotation.x=a1.rotation.x*(1-py)-1.2*py;a1.userData.e.rotation.x=a1.userData.e.rotation.x*(1-py)-.5*py;u.h.rotation.x+=.05*py}
 m.rotation.x=.07*k+.1*rr;
 return (1-Math.abs(a))*.045*k}

/* ---------- dunia toko ---------- */
let clkH=null,clkM=null,world=null,slots=[],obst=[],shG=[],bxG=null,mDr=null,dL=null,dR=null,dInd=null,signCv=null,signTx=null,wkIc=null,scrCv=null,scrTx=null,rvM=null,gh=null;
const W=()=>14+6*S.land,slotsN=()=>2*(3+2*S.land);
function disposeWorld(){if(!world)return;world.traverse(o=>{if(o.material&&o.material.map&&!(o.material.userData&&o.material.userData.keep)){o.material.map.dispose();o.material.dispose()}});sc.remove(world)}

/* label harga di depan rak: digambar ulang di canvas yang sama (hemat memori) */
function drawTag(k){const o=shG[k];if(!o)return;const id=S.shelves[k],t=o.tag.userData.c,g=t.getContext("2d");
 g.fillStyle="#fff";g.fillRect(0,0,256,96);g.strokeStyle="#222";g.lineWidth=6;g.strokeRect(3,3,250,90);g.textAlign="center";g.fillStyle="#1f5f46";
 fit(g,rp(pr(id)),44,230,1);g.fillText(rp(pr(id)),128,52);g.fillStyle="#666";g.font="22px sans-serif";g.fillText("Stok "+S.stock[id],128,82);o.tag.needsUpdate=true}
function refresh(k){const o=shG[k];if(!o)return;const n=Math.min(12,S.stock[S.shelves[k]]);for(let i=0;i<12;i++)o.items[i].visible=i<n;drawTag(k)}

function drawSign(){if(!signCv)return;const g=signCv.getContext("2d"),o=S.op;g.fillStyle=o?"#1f7a4d":"#a83232";g.fillRect(0,0,256,128);g.strokeStyle="#fff";g.lineWidth=6;g.strokeRect(5,5,246,118);g.fillStyle="#fff";g.textAlign="center";g.font="bold 64px sans-serif";g.fillText(o?"BUKA":"TUTUP",128,72);signTx.needsUpdate=true;if(dInd)dInd.material.color.set(o?"#6fe39a":"#ff6b6b")}
function drawScr(a,b,t){if(!scrCv)return;const g=scrCv.getContext("2d"),k=scrCv.width/256;g.setTransform(k,0,0,k,0,0);g.fillStyle="#000";g.fillRect(0,0,256,136);g.fillStyle="#8ee5c1";g.textAlign="left";g.font="bold 18px monospace";g.fillText((a||"").slice(0,16),10,24);g.textAlign="right";g.fillText(b||"",246,24);
 g.textAlign="center";g.font="bold 22px monospace";g.fillStyle="#5fbf9b";g.fillText("TOTAL",128,66);g.font="bold 34px monospace";g.fillStyle="#d8fff0";g.fillText(t==null?"":rp(t),128,112);scrTx.needsUpdate=true;
 sT("lcdv",t==null?"Rp0":rp(t));sT("lcdi",a&&b?a+"  "+b:(a||""))}
const avgRev=()=>{const a=S.rev.slice(0,20);return a.length?a.reduce((x,r)=>x+r.s,0)/a.length:S.rating};
function drawBoard(){if(!rvM)return;const g=rvM.material.map.userData.c.getContext("2d");g.fillStyle="#fffbe8";g.fillRect(0,0,256,160);g.strokeStyle="#8a6a4a";g.lineWidth=6;g.strokeRect(3,3,250,154);g.fillStyle="#222";g.textAlign="left";g.font="bold 18px sans-serif";g.fillText("ULASAN ★ "+avgRev().toFixed(1).replace(".",","),12,28);g.font="13px sans-serif";
 S.rev.slice(0,4).forEach((r,i)=>{g.fillStyle=r.s>=4?"#1f7a4d":r.s>=3?"#9a6a00":"#c0504d";g.fillText("★".repeat(r.s)+" "+r.t.slice(0,26),12,56+i*26)});rvM.material.map.needsUpdate=true}

function buildStore(){
 while(S.shelves.length<slotsN())S.shelves.push(null);
 disposeWorld();world=new THREE.Group();sc.add(world);slots=[];obst=[];shG=[];
 const w=W(),wl="#e8e2d0",add=m=>{world.add(m);return m};
 // lantai & dinding
 FT.repeat.set(w/1.5,8);const fl=new THREE.Mesh(new THREE.PlaneGeometry(w,12),new THREE.MeshLambertMaterial({map:FT}));fl.rotation.x=-Math.PI/2;fl.position.set(w/2,0,0);add(fl);
 box(w,.1,12,"#f4f1e8",w/2,3.25,0,world);
 box(w,3.2,.2,wl,w/2,1.6,-6,world);box(.2,3.2,12,wl,0,1.6,0,world);box(.2,3.2,12,wl,w,1.6,0,world);
 box(w-4,3.2,.2,wl,(w-4)/2,1.6,6,world);box(1,3.2,.2,wl,w-.5,1.6,6,world);box(3,.5,.2,"#4f91b7",w-2.5,2.95,6,world);
 box(w,.25,.06,"#4f91b7",w/2,.125,-5.88,world);box(.06,.25,12,"#4f91b7",.12,.125,0,world);box(.06,.25,12,"#4f91b7",w-.12,.125,0,world);
 for(let i=0;i<Math.floor(w/4.5);i++)for(const z of[-3,2]){const l=new THREE.Mesh(bgeo(1.6,.06,.5),LM);l.position.set(2.5+i*4.5,3.17,z);add(l);const ha=new THREE.Mesh(HALOG,HALOM);ha.rotation.x=Math.PI/2;ha.position.set(2.5+i*4.5,3.1,z);add(ha)}
 // meja kasir: konveyor kanan, monitor besar kiri (seperti game referensi)
 box(3,.9,1,"#7c4a2d",3,.45,3.5,world);box(3.1,.08,1.1,"#b8784b",3,.94,3.5,world);
 box(1.35,.02,.8,"#33363d",3.6,.99,3.5,world);
 box(.7,.1,.5,"#2b2f3a",2.05,1.03,3.62,world);box(.12,.3,.1,"#2b2f3a",2.05,1.2,3.55,world);box(.94,.62,.06,"#1b1e27",2.05,1.5,3.6,world);
 scrCv=document.createElement("canvas");scrCv.width=512;scrCv.height=272;scrTx=new THREE.CanvasTexture(scrCv);
 add(new THREE.Mesh(new THREE.PlaneGeometry(.84,.52),new THREE.MeshBasicMaterial({map:scrTx}))).position.set(2.05,1.5,3.64);drawScr("SIAP","",null);
 mDr=box(.5,.07,.4,"#555b66",2.05,.99,3.62,world);
 box(.2,.04,.26,"#cfd6df",2.9,1.0,3.88,world);box(.16,.012,.1,"#3b6fb6",2.9,1.025,3.88,world);
 if(S.mach>=2){box(.3,.05,.22,"#222",4.3,1.0,3.5,world);box(.28,.012,.04,"#ff3030",4.3,1.03,3.5,world)}
 if(S.mach>=3){box(.14,.22,.1,"#444c58",3.2,1.1,3.88,world);box(.1,.07,.012,"#8ee5c1",3.2,1.17,3.82,world)}
 if(S.mach>=4){box(.22,.12,.16,"#2b2f3a",1.7,1.04,3.85,world);box(.12,.14,.01,"#fff",1.7,1.17,3.93,world)}
 if(S.mach>=5)box(.7,.015,.02,"#6fe39a",2.05,1.1,3.89,world);
 {const ks=add(signSprite("KASIR","#2f9e6e"));ks.scale.set(.95,.475,1);ks.position.set(3,2.25,3.5)};obst.push({x:3,z:3.5,hx:1.5,hz:.5});
 bxG=new THREE.Group();world.add(bxG);drawBoxes();
 // dekorasi tambahan (hanya tampilan)
 box(w-.4,.82,.03,"#d9d1ba",w/2,.53,-5.89,world);box(w-.4,.05,.05,"#4f91b7",w/2,.97,-5.88,world);
 box(.03,.82,11.6,"#d9d1ba",.115,.53,0,world);box(.05,.05,11.6,"#4f91b7",.12,.97,0,world);
 box(.03,.82,11.6,"#d9d1ba",w-.115,.53,0,world);box(.05,.05,11.6,"#4f91b7",w-.12,.97,0,world);
 [-2,1].forEach(z=>{box(.06,.04,2.9,"#555",.17,2.45,z,world);[-1,1].forEach(sd=>box(.05,1.35,.34,"#c9534d",.18,1.75,z+sd*1.08,world))});
 [2.1,3.9].forEach(x=>{box(.02,.5,.02,"#333",x,3.0,3.5,world);const lp=new THREE.Mesh(PEND,LM);lp.position.set(x,2.65,3.5);add(lp)});
 {const ck=new THREE.Group();ck.position.set(.16,2.55,3.6);ck.rotation.y=Math.PI/2;add(ck);
  ck.add(new THREE.Mesh(CLKR,mat("#333")));const fc=new THREE.Mesh(CLKF,mat("#fffbe8"));fc.position.z=.01;ck.add(fc);
  for(let i=0;i<12;i++){const a=i/12*Math.PI*2,t=box(.02,i%3?.04:.07,.01,"#333",Math.sin(a)*.22,Math.cos(a)*.22,.02,ck);t.rotation.z=-a}
  clkH=new THREE.Group();clkH.position.z=.03;ck.add(clkH);box(.03,.13,.01,"#222",0,.065,0,clkH);
  clkM=new THREE.Group();clkM.position.z=.04;ck.add(clkM);box(.02,.2,.01,"#444",0,.1,0,clkM);box(.045,.045,.012,"#222",0,0,.045,ck)}
 [[.75,5.2],[w-.75,5.25]].forEach(([x,z])=>{const pt=new THREE.Mesh(PLG,mat("#8a5a3a"));pt.position.set(x,.2,z);add(pt);
  [[0,.85,0,.34,"#3f8a43"],[.17,1.15,.05,.24,"#4a9a4e"],[-.16,1.05,-.08,.22,"#357a3a"],[.02,1.38,0,.17,"#58a85c"]].forEach(([dx,y,dz,r,c])=>{const lf=new THREE.Mesh(PGM.sph(r,10,8),mat(c));lf.position.set(x+dx,y,z+dz);add(lf)});obst.push({x,z,hx:.3,hz:.3})});
 {const rg=new THREE.Mesh(RUGG,mat("#b45a58"));rg.rotation.x=-Math.PI/2;rg.position.set(3,.013,4.75);add(rg);const ri=new THREE.Mesh(RUGI,mat("#e6cfa6"));ri.rotation.x=-Math.PI/2;ri.position.set(3,.016,4.75);add(ri)}
 add(poster("SEGAR","Buah & Sayur","#3f8a43","#a8d672")).position.set(4.35,2.4,-5.86);
 add(poster("PROMO","Hemat Pekan Ini","#4f91b7","#7fc4e0")).position.set(10.1,2.4,-5.86);

 // dekorasi
 const hd=add(label("MINI SUPERMARKET","Belanja hemat & lengkap",true));hd.scale.set(1.9,1.9,1);hd.position.set(w/2,2.5,-5.85);
 add(poster("DISKON","Hemat tiap hari!","#e0524d","#f2a23a")).position.set(w-1.9,1.9,-5.86);
 [-2,1].forEach(z=>{const m=new THREE.Mesh(bgeo(.06,1.2,1.8),winM);m.position.set(.12,1.7,z);add(m);const rw=new THREE.Mesh(RAINPW,RAINM);rw.rotation.y=Math.PI/2;rw.position.set(.16,1.7,z);add(rw)});
 const ro=new THREE.Mesh(RAINPO,RAINM2);ro.rotation.y=Math.PI;ro.position.set(w-2.5,1.7,7.6);add(ro);
 [[.9,-5.1],[w-.9,-5.1]].forEach(([x,z])=>{box(.4,.4,.4,"#8a5a3a",x,.2,z,world);const lf=new THREE.Mesh(new THREE.SphereGeometry(.38,8,6),mat("#4a8a4a"));lf.position.set(x,.75,z);add(lf)});
 const trolley=(x,z)=>{box(.7,.08,1,"#9aa3b0",x,.2,z,world);box(.7,.32,1,"#c0504d",x,.45,z,world);box(.7,.05,.05,"#9aa3b0",x,.85,z-.55,world);box(.05,.4,.05,"#9aa3b0",x-.3,.65,z-.55,world);box(.05,.4,.05,"#9aa3b0",x+.3,.65,z-.55,world)};
 trolley(w-.6,2);trolley(w-.6,3.3);obst.push({x:w-.6,z:2.65,hx:.4,hz:1.3});
 box(.4,.6,.4,"#4a4f5a",.8,.3,1.9,world);box(.44,.06,.44,"#2f3340",.8,.62,1.9,world);obst.push({x:.8,z:1.9,hx:.3,hz:.3});
 rvM=add(new THREE.Mesh(new THREE.PlaneGeometry(2,1.25),new THREE.MeshBasicMaterial({map:canvasTex(256,160,()=>{})})));rvM.position.set(2.2,1.9,-5.85);drawBoard();
 // pintu kaca geser
 box(.15,3,.28,"#2f4a63",w-3.93,1.5,6,world);box(.15,3,.28,"#2f4a63",w-1.07,1.5,6,world);box(2.9,.18,.3,"#2f4a63",w-2.5,2.68,6,world);
 box(2.8,.03,1,"#3b3f4c",w-2.5,.015,5.3,world);box(w+12,.1,10,"#9a9aa0",w/2,-.05,11,world);
 for(let i=0;i<6;i++)box(.6,.08,1.1,i%2?"#fff":"#c0504d",w-4+i*.6,3.05,6.55,world);
 const gm=new THREE.MeshLambertMaterial({color:"#bfe3f5",transparent:true,opacity:.35});
 const mkDoor=cx=>{const g=new THREE.Group();g.position.set(cx,0,6);world.add(g);const gl=new THREE.Mesh(bgeo(1.5,2.6,.04),gm);gl.position.y=1.35;g.add(gl);box(1.5,.08,.06,"#2f4a63",0,2.65,0,g);box(1.5,.08,.06,"#2f4a63",0,.08,0,g);box(.08,2.6,.06,"#2f4a63",-.71,1.35,0,g);box(.08,2.6,.06,"#2f4a63",.71,1.35,0,g);return g};
 dL=mkDoor(w-3.25);dR=mkDoor(w-1.75);dL.userData.c=w-3.25;dL.userData.o=w-4.2;dR.userData.c=w-1.75;dR.userData.o=w-.8;
 box(.04,.5,.06,"#c9ced6",.5,1.2,0,dL);box(.04,.5,.06,"#c9ced6",-.5,1.2,0,dR);
 signCv=document.createElement("canvas");signCv.width=256;signCv.height=128;signTx=new THREE.CanvasTexture(signCv);
 const sg=new THREE.Mesh(new THREE.PlaneGeometry(.9,.45),new THREE.MeshBasicMaterial({map:signTx}));sg.position.set(.2,1.6,-.12);sg.rotation.y=Math.PI;dL.add(sg);
 dInd=new THREE.Mesh(bgeo(.34,.12,.05),new THREE.MeshBasicMaterial({color:"#6fe39a"}));dInd.position.set(w-2.5,2.95,5.87);add(dInd);drawSign();
 // pegawai pengemas
 wkIc=null;if(S.worker){const wk=person("#e8943a","#222","#e0b088","#2f3e46",true,true,"worker");wk.position.set(1.6,0,4.9);wk.rotation.y=Math.PI;wkIc=emoSprite("📦");wkIc.position.set(0,2.05,0);wkIc.visible=false;wk.add(wkIc);add(wk)}
 // rak
for(let i=0;i<3+2*S.land;i++)for(let r=0;r<2;r++)slots.push({x:6.5+i*3,z:r?-1.5:-5.3});
 S.shelves.forEach((id,k)=>{if(!id)return;
  const s=S.pos[k]||slots[k],p=PP[id],g=new THREE.Group();slots[k]=s;g.position.set(s.x,0,s.z);g.rotation.y=(s.r||0)*Math.PI/2;add(g);
  const fr=id==="air"||id==="teh"||id==="susu"||id==="soda"||id==="es",c1=fr?"#cfe0ea":"#8a6a4a",c2=fr?"#f4fafd":"#c9a57a",c3=fr?"#9db8c8":"#6e5238";
  box(2.4,1.5,.5,c1,0,.75,0,g);box(2.4,.06,.34,c2,0,.5,.3,g);box(2.4,.06,.34,c2,0,1,.3,g);box(2.4,.06,.5,c3,0,1.53,0,g);box(2.4,.14,.5,p.c,0,1.64,0,g);
  box(.06,1.5,.56,c3,-1.2,.75,.03,g);box(.06,1.5,.56,c3,1.2,.75,.03,g);
  if(fr){const gl=new THREE.Mesh(bgeo(2.3,1.1,.03),new THREE.MeshLambertMaterial({color:"#bfe3f5",transparent:true,opacity:.28}));gl.position.set(0,.85,.5);g.add(gl);box(2.3,.05,.05,"#fff",0,1.42,.5,g)}
  const sp=signSprite(p.n,p.c);sp.position.set(0,2.15,.4);g.add(sp);
  const tag=canvasTex(256,96,()=>{});const tg=new THREE.Mesh(new THREE.PlaneGeometry(1.1,.41),new THREE.MeshBasicMaterial({map:tag}));tg.position.set(0,.27,.27);g.add(tg);
  const items=[];for(let i=0;i<12;i++){const m=new THREE.Mesh(GE[id],IM[id]);m.position.set(-1+(i%6)*.4,(i<6?.53:1.03)+GH[id]/2,.3);g.add(m);items.push(m)}
  shG[k]={g,items,tag};
  obst.push({x:s.x,z:s.z,hx:(s.r||0)%2?.45:1.25,hz:(s.r||0)%2?1.25:.45,k});refresh(k)});
}
function drawBoxes(){while(bxG.children.length)bxG.remove(bxG.children[0]);S.boxes.forEach((b,i)=>{const p=bp(i);box(.6,.45,.6,"#c9a06a",p.x,.225,p.z,bxG);box(.62,.06,.2,PP[b.id].c,p.x,.47,p.z,bxG)})}
const bp=n=>({x:6+(n%5)*.8,z:5.3-Math.floor(n/5)*.8});
      /* ==========================================================
   Bagian 2: input, interaksi, pelanggan, kasir, ulasan, pesanan
   ========================================================== */

/* ---------- tangan, barang bawaan, partikel ---------- */
const BM={},bmat=c=>BM[c]||(BM[c]=new THREE.MeshBasicMaterial({color:c}));
const hands=new THREE.Group();cam.add(hands);
[-.27,.27].forEach(x=>{box(.11,.11,.24,"#4f91b7",x,-.43,-.5,hands);box(.09,.09,.14,"#e0b088",x,-.42,-.7,hands)});
const carryM=new THREE.Group();cam.add(carryM);box(.4,.3,.4,"#c9a06a",0,-.4,-.85,carryM);
const cst=box(.42,.05,.14,"#fff",0,-.24,-.85,carryM);cst.material=new THREE.MeshLambertMaterial({color:"#fff"});carryM.visible=false;
const carryT=box(.28,.3,.2,"#2f3340",.35,-.38,-.8,cam);carryT.visible=false;
const PART=[],PG=bgeo(.07,.07,.07);
function burst(x,y,z,col,n){for(let i=0;i<n&&PART.length<40;i++){const m=new THREE.Mesh(PG,bmat(col));m.position.set(x,y,z);sc.add(m);PART.push({m,vx:(Math.random()-.5)*1.6,vy:1.4+Math.random()*1.4,vz:(Math.random()-.5)*1.6,l:.7})}}
function partTick(dt){for(let i=MF.length-1;i>=0;i--){const f=MF[i];f.t+=dt;const p=Math.min(1,f.t/.4),k=1-.5*p;f.o.position.set(f.x+(2.05-f.x)*p,f.y+(1.12-f.y)*p+Math.sin(Math.PI*p)*.18,f.z+(3.62-f.z)*p);f.o.scale.set(k,k,k);if(p>=1){sc.remove(f.o);MF.splice(i,1)}}
 for(let i=PART.length-1;i>=0;i--){const p=PART[i];p.l-=dt;if(p.l<=0){sc.remove(p.m);PART.splice(i,1);continue}p.vy-=6*dt;p.m.position.x+=p.vx*dt;p.m.position.y+=p.vy*dt;p.m.position.z+=p.vz*dt;const s=p.l/.7;p.m.scale.set(s,s,s)}}
const hKick=()=>{HK=1;vib(10)};

/* ---------- ghost rak (saat memindah) ---------- */
gh=new THREE.Mesh(bgeo(2.4,1.5,.5),new THREE.MeshBasicMaterial({color:"#6fbf73",transparent:true,opacity:.55}));gh.visible=false;sc.add(gh);
const gf=new THREE.Mesh(bgeo(2.2,.04,.35),bmat("#fff"));gf.position.set(0,-.73,.45);gh.add(gf);

/* ---------- input: geser = lihat, joystick = jalan ---------- */
const joy=$("joy");let lk=null,jp=null;
cvs.addEventListener("pointerdown",e=>{ensureAC();if(CASH){tapItem(e);return}lk={id:e.pointerId,x:e.clientX,y:e.clientY};try{cvs.setPointerCapture(e.pointerId)}catch(_){}});
cvs.addEventListener("pointermove",e=>{if(lk&&lk.id===e.pointerId){const k=.0045*S.set.sens;yaw-=(e.clientX-lk.x)*k;pitch=cl(pitch-(e.clientY-lk.y)*k,-1.2,1.2);lk.x=e.clientX;lk.y=e.clientY}});
const lkEnd=e=>{if(lk&&lk.id===e.pointerId)lk=null};cvs.addEventListener("pointerup",lkEnd);cvs.addEventListener("pointercancel",lkEnd);
function jm(e){const r=joy.getBoundingClientRect(),m=r.width*.34;let dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2;const d=Math.hypot(dx,dy);if(d>m){dx*=m/d;dy*=m/d}jv={x:dx/m,y:dy/m};$("knob").style.transform="translate("+dx+"px,"+dy+"px)"}
joy.addEventListener("pointerdown",e=>{jp=e.pointerId;try{joy.setPointerCapture(e.pointerId)}catch(_){}jm(e)});
joy.addEventListener("pointermove",e=>{if(jp===e.pointerId)jm(e)});
const jEnd=e=>{if(jp===e.pointerId){jp=null;jv={x:0,y:0};$("knob").style.transform=""}};joy.addEventListener("pointerup",jEnd);joy.addEventListener("pointercancel",jEnd);
addEventListener("keydown",e=>{const k=e.key.toLowerCase();K[k]=1;if(k==="e")enterCash();if(k==="f"){const h=handTarget();if(h&&!h.dis)h.f()}});
addEventListener("keyup",e=>K[e.key.toLowerCase()]=0);
addEventListener("blur",()=>{K={};jv={x:0,y:0}});

/* ---------- pertanyaan jarak / bidikan ---------- */
const nearC=()=>Math.hypot(px-3,pz-3.5)<3.4;
const fwd=()=>[-Math.sin(yaw),-Math.cos(yaw)];
function aimAt(tx,tz,maxD,minDot){const f=fwd(),dx=tx-px,dz=tz-pz,d=Math.hypot(dx,dz);return d>.01&&d<maxD&&(dx*f[0]+dz*f[1])/d>minDot}
function stand(k,off){const s=slots[k],t=(s.r||0)*Math.PI/2,sn=Math.sin(t),co=Math.cos(t);return [s.x+sn*1.4+off*co,s.z+co*1.4-off*sn]}
const hz2=r=>r%2?[.45,1.25]:[1.25,.45];
function okPlace(x,z,r,k){const [hx,hz]=hz2(r);if(x+hx>1.5&&x-hx<8.6&&z+hz>1.2&&z-hz<3.2)return false;return !obst.some(o=>o.k!==k&&Math.abs(x-o.x)<hx+o.hx+.15&&Math.abs(z-o.z)<hz+o.hz+.15)}
function aimShelf(){if(MV||S.carry||CASH)return -1;const f=fwd();let b=-1,bd=3.4;S.shelves.forEach((id,k)=>{if(!id||!slots[k])return;const s=slots[k],dx=s.x-px,dz=s.z-pz,d=Math.hypot(dx,dz);if(d>.01&&d<bd&&(dx*f[0]+dz*f[1])/d>.86){bd=d;b=k}});return b}
function aimTrash(){if(MV||S.carry||CASH||FILL)return -1;const f=fwd();let b=-1,bd=3;TR.forEach((t,i)=>{const dx=t.x-px,dz=t.z-pz,d=Math.hypot(dx,dz);if(d>.05&&d<bd&&(dx*f[0]+dz*f[1])/d>.8){bd=d;b=i}});return b}
const aimDoor=()=>!(MV||S.carry||CASH||SUMV||dayT>=DAYL)&&aimAt(W()-2.5,6,3.8,.8);
const aimCounter=()=>!(MV||S.carry||CASH||FILL)&&aimAt(3,3.5,3.8,.8);
const nearBin=()=>aimAt(.8,1.9,2.4,.7);
function nearBox(){let b=-1,bd=1.9;S.boxes.forEach((x,i)=>{const p=bp(i),d=Math.hypot(px-p.x,pz-p.z);if(d<bd){bd=d;b=i}});return b}
function nearShelf(){if(!S.carry)return -1;const k=S.shelves.indexOf(S.carry.id);if(k<0)return -1;const q=stand(k,0);return Math.hypot(px-q[0],pz-q[1])<2.4?k:-1}
      
/* ---------- kardus & isi rak (bertahap) ---------- */
function boxAct(){
 if(FILL){endFill();return}
 const c=S.carry;
 if(c){const k=nearShelf();
  if(k>=0){if(Math.min(24-S.stock[c.id],c.q)<=0){msg("Rak sudah penuh (24).");return}FILL={k,t:0};hKick();return}
  if(Math.hypot(px-8,pz-4.8)<3.5&&S.boxes.length<10){S.boxes.push(c);S.carry=null;drawBoxes();SFX.pop();hKick();save()}else msg("Taruh di dekat pintu, atau isi rak yang sesuai.");return}
 const i=nearBox();if(i>=0){S.carry=S.boxes.splice(i,1)[0];drawBoxes();SFX.pop();hKick();save()}}
function endFill(){if(!FILL)return;const c=S.carry,k=FILL.k;refresh(k);if(c)msg("Rak "+PP[c.id].n+": "+S.stock[c.id]+"/24");
 if(c&&c.q<=0){S.carry=null;drop(px-Math.sin(yaw)*.8,pz-Math.cos(yaw)*.8,true)}
 if(shG[k])burst(slots[k].x,1.7,slots[k].z+.4,"#6fe39a",8);FILL=null;sD("fillt","none");save()}
function fillTick(dt){if(!FILL)return;const c=S.carry;if(!c||nearShelf()!==FILL.k){endFill();return}FILL.t+=dt;
 while(FILL.t>=.1){FILL.t-=.1;if(S.stock[c.id]>=24||c.q<=0){endFill();return}S.stock[c.id]++;c.q--;refresh(FILL.k);snd(700+Math.random()*200,.04,"triangle",.04)}
 sD("fillt","block");sT("fillx","📥 Mengisi rak "+PP[c.id].n+"… "+S.stock[c.id]+"/24");$("fillb").style.width=Math.round(S.stock[c.id]/24*100)+"%";if(S.stock[c.id]>=24||c.q<=0)endFill()}

/* ---------- rak: angkat, putar, taruh ---------- */
function pickShelf(k){if(MV||!slots[k]||!shG[k])return;const s=slots[k];MV={k,x:s.x,z:s.z,r:s.r||0,ok:true};shG[k].g.visible=false;SFX.pop();hKick()}
function placeShelf(){if(!MV||!MV.ok)return;S.pos[MV.k]={x:MV.x,z:MV.z,r:MV.r};MV=null;buildStore();SFX.buy();vib(15);msg("Rak dipindah!");save()}
function cancelShelf(){if(!MV)return;if(shG[MV.k])shG[MV.k].g.visible=true;MV=null}
$("mvrot").onclick=()=>{if(MV)MV.r=(MV.r+1)%4};$("mvx").onclick=cancelShelf;

/* ---------- harga dari titik tengah ---------- */
function chg(d){const k=AKc;if(k<0||MV)return;const id=S.shelves[k],mx=maxP(id),v=cl(pr(id)+d,500,mx);if(v===pr(id)){msg(d>0?"Sudah harga maksimal ("+rp(mx)+"). Lebih mahal = susah laku.":"Harga minimal Rp500.");return}S.price[id]=v;refresh(k);SFX.pop();vib(8);save()}
$("pm1").onclick=()=>chg(-500);$("pp1").onclick=()=>chg(500);

/* ---------- buka / tutup toko ---------- */
function toggleShop(){S.op=!S.op;if(S.op)spawnT=6+Math.random()*6;drawSign();msg(S.op?"🔓 Toko DIBUKA. Selamat berjualan!":"🔒 Toko DITUTUP. Pelanggan baru tidak masuk.");SFX.bell();vib(15);hKick();save()}

/* ---------- sampah ---------- */
const TC=["#e8e8e8","#c9a06a","#5aa9e6","#e05b4f","#f2c14e"];
function drop(x,z,big){if(TR.length>=14)return;const m=new THREE.Mesh(big?bgeo(.5,.05,.4):bgeo(.14,.05,.1),mat(big?"#b48a5a":pick(TC)));m.position.set(x+(Math.random()-.5)*.3,.03,z+(Math.random()-.5)*.3);m.rotation.y=Math.random()*3;sc.add(m);TR.push({m,x:m.position.x,z:m.position.z})}
function pickTrash(i){const t=TR[i];if(!t||TH>=5)return;const near=TR.map(o=>({o,d:Math.hypot(o.x-t.x,o.z-t.z)})).filter(a=>a.d<1.3).sort((a,b)=>a.d-b.d).slice(0,5-TH);const rm=new Set(near.map(a=>a.o));
 TR=TR.filter(o=>{if(rm.has(o)){sc.remove(o.m);return false}return true});TH+=rm.size;SFX.pop();hKick();msg("🧹 Memungut "+rm.size+" sampah ("+TH+"/5). Buang ke tong sampah!")}
function throwTrash(){if(TH<=0)return;const n=TH;TH=0;SFX.pop();hKick();burst(.8,.8,1.9,"#9aa3b0",8);msg("🗑️ "+n+" sampah dibuang")}
function trTick(dt){trT+=dt;if(trT>20){trT=0;if(TR.length>=6){rate(2);if(Math.random()<.5)addRev(2,pick(REV.kt))}}}

/* ---------- tombol tangan (✋): satu tombol untuk semua interaksi ---------- */
function handTarget(){
 if(CASH)return null;
 if(MV)return{l:"📍 Taruh rak",f:placeShelf,dis:!MV.ok};
 if(FILL)return{l:"⏹ Berhenti",f:endFill};
 if(TH>0){if(nearBin())return{l:"🗑️ Buang sampah ("+TH+")",f:throwTrash};const ti=aimTrash();if(ti>=0&&TH<5)return{l:"🧹 Pungut lagi ("+TH+"/5)",f:()=>pickTrash(ti)};return{l:"🗑️ Bawa ke tong sampah ("+TH+")",f:()=>msg("Tong sampah ada di dekat meja kasir (sisi kiri).")}}
 if(S.carry)return nearShelf()>=0?{l:"📥 Isi rak "+PP[S.carry.id].n,f:boxAct}:{l:"📦 Taruh kardus",f:boxAct};
 const ti=aimTrash();if(ti>=0)return{l:"🧹 Ambil sampah",f:()=>pickTrash(ti)};
 const nb=nearBox();if(nb>=0)return{l:"📦 Angkat "+PP[S.boxes[nb].id].n,f:boxAct};
 const ak=aimShelf();if(ak>=0)return{l:"🔧 Angkat rak "+PP[S.shelves[ak]].n,f:()=>pickShelf(ak)};
 if(aimDoor())return{l:S.op?"🔒 Tutup toko":"🔓 Buka toko",f:toggleShop};
 if(aimCounter())return{l:"🧾 Mulai melayani (kasir)",f:enterCash};
 return null}
$("hand").addEventListener("click",()=>{const h=handTarget();if(h&&!h.dis)h.f()});
      /* ---------- pelanggan ---------- */
/* ---------- uang di tangan pelanggan (kipas) & HP untuk QRIS ---------- */
const MONC={2000:"#c9ccd1",5000:"#d8b48a",10000:"#b9a3e3",20000:"#9ad8a6",50000:"#8cc4ee",100000:"#f09aa6"},MTX={},DEN=[100000,50000,20000,10000,5000,2000],BILLG=new THREE.PlaneGeometry(.15,.07),MF=[];
function moneyMat(v){return MTX[v]||(MTX[v]=new THREE.MeshBasicMaterial({side:THREE.DoubleSide,map:canvasTex(192,90,(g,w,h)=>{
 g.fillStyle=MONC[v]||"#ccc";g.fillRect(0,0,w,h);g.strokeStyle="rgba(0,0,0,.35)";g.lineWidth=4;g.strokeRect(6,6,w-12,h-12);
 g.strokeStyle="rgba(255,255,255,.55)";g.lineWidth=2;for(let k=0;k<5;k++){g.beginPath();for(let x=12;x<w-12;x+=4){const y=14+k*13+Math.sin(x/9+k)*3;x===12?g.moveTo(x,y):g.lineTo(x,y)}g.stroke()}
 g.fillStyle="rgba(0,0,0,.25)";g.beginPath();g.ellipse(34,h/2,20,24,0,0,7);g.fill();g.fillStyle="rgba(255,255,255,.5)";g.beginPath();g.arc(34,h/2-6,9,0,7);g.fill();g.fillRect(24,h/2+4,20,16);
 g.fillStyle="#1e1e1e";g.textAlign="center";g.font="bold 40px sans-serif";g.fillText(String(v/1000),w*.68,h*.52);g.font="bold 13px sans-serif";g.fillText("RIBU RUPIAH",w*.68,h*.74)})}))}
function splitPaid(n){const tot=n,go=i0=>{let m=n,i=i0;const o=[];for(;i<DEN.length&&m>0;i++)while(m>=DEN[i]&&o.length<5){o.push(DEN[i]);m-=DEN[i]}return m===0?o:null};
 n=tot;let r=null;if(n>=20000&&Math.random()<.4){const i=DEN.findIndex(d=>d<=n/2);if(i>=0)r=go(i)}return r||go(0)||[tot]}
function makeFan(arr){const g=new THREE.Group(),n=arr.length;arr.forEach((v,i)=>{const pv=new THREE.Group();pv.rotation.z=(i-(n-1)/2)*.2;pv.position.z=.004*i;const b=new THREE.Mesh(BILLG,moneyMat(v));b.position.y=-.075;b.rotation.x=Math.PI;b.position.y=-.075;pv.add(b);g.add(pv)});return g}
function makePhone(){const g=new THREE.Group(),pv=new THREE.Group();pv.position.y=-.06;pv.rotation.x=.35;g.add(pv);
 pv.add(new THREE.Mesh(bgeo(.07,.13,.01),mat("#1d2330")));
 const qr=new THREE.Mesh(new THREE.PlaneGeometry(.06,.11),new THREE.MeshBasicMaterial({map:canvasTex(64,112,g2=>{g2.fillStyle="#fff";g2.fillRect(0,0,64,112);g2.fillStyle="#1f8a4c";g2.fillRect(0,0,64,10);g2.fillStyle="#111";
  for(let y=0;y<9;y++)for(let x=0;x<9;x++)if((x*7+y*13+x*y)%3===0)g2.fillRect(8+x*5.3,24+y*5.3,5,5);[[8,24],[43,24],[8,59]].forEach(([x,y])=>{g2.fillStyle="#111";g2.fillRect(x,y,13,13);g2.fillStyle="#fff";g2.fillRect(x+3,y+3,7,7);g2.fillStyle="#111";g2.fillRect(x+5,y+5,3,3)});g2.fillStyle="#1f8a4c";g2.font="bold 11px sans-serif";g2.textAlign="center";g2.fillText("QRIS",32,100)})}));
 qr.position.z=.0065;pv.add(qr);return g}
function holdPay(c){dropPay(c);const E=c.m.userData.a[1].userData.e,o=c.qris?makePhone():makeFan(splitPaid(B.paid));o.position.set(0,-.32,0);o.scale.setScalar(c.qris?1.6:2.4);o.rotation.x=c.qris?-.9:-1.45;E.add(o);c.hold=o;c.m.userData.py=1;(c.m.userData.bag||[]).forEach(m=>m.visible=false);if(c.qris)SFX.scan()}
function dropPay(c){if(!c||!c.m)return;if(c.hold){if(c.hold.parent)c.hold.parent.remove(c.hold);c.hold=null}c.m.userData.py=0;(c.m.userData.bag||[]).forEach(m=>m.visible=true)}
function flyHold(c){const o=c.hold;if(!o)return;if(c.qris){dropPay(c);return}
 const wp=new THREE.Vector3(),wq=new THREE.Quaternion();o.updateWorldMatrix(true,false);o.getWorldPosition(wp);o.getWorldQuaternion(wq);
 o.parent.remove(o);o.position.copy(wp);o.quaternion.copy(wq);sc.add(o);MF.push({o,x:wp.x,y:wp.y,z:wp.z,t:0});c.hold=null;dropPay(c)}
/* ---------- bubble obrolan, troli, tingkah pelanggan ---------- */
function bubble(t){const tx=canvasTex(256,96,g=>{const r=20,x0=4,y0=4,x1=252,y1=70;g.fillStyle="#fffffff2";g.strokeStyle="#3a3a3a";g.lineWidth=5;g.lineJoin="round";
  g.beginPath();g.moveTo(x0+r,y0);g.lineTo(x1-r,y0);g.quadraticCurveTo(x1,y0,x1,y0+r);g.lineTo(x1,y1-r);g.quadraticCurveTo(x1,y1,x1-r,y1);g.lineTo(138,y1);g.lineTo(128,92);g.lineTo(118,y1);g.lineTo(x0+r,y1);g.quadraticCurveTo(x0,y1,x0,y1-r);g.lineTo(x0,y0+r);g.quadraticCurveTo(x0,y0,x0+r,y0);g.closePath();g.fill();g.stroke();
  g.fillStyle="#222";g.textAlign="center";fit(g,t,28,222,1);g.fillText(t,128,48)});
 const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:tx,depthTest:false}));sp.renderOrder=5;return sp}
function unsay(c){if(c.bub){c.m.remove(c.bub.s);c.bub.s.material.map.dispose();c.bub.s.material.dispose();c.bub=null}}
function say(c,t,force){if(c.bub&&!force)return;unsay(c);const k=c.m.scale.x,sp=bubble(t);sp.scale.set(1.35/k,.5/k,1);sp.position.set(0,2.4/k,0);c.m.add(sp);c.bub={s:sp,until:performance.now()/1000+2.6}}
function addTrolley(m){box(.42,.05,.56,"#9aa3b0",.5,.2,.28,m);box(.42,.26,.56,"#c0504d",.5,.36,.28,m);box(.46,.03,.6,"#8a8f99",.5,.5,.28,m);
 box(.44,.04,.04,"#9aa3b0",.5,.78,.02,m);[-.2,.2].forEach(x=>box(.04,.3,.04,"#9aa3b0",.5+x,.63,.02,m));[-.17,.17].forEach(x=>[.06,.5].forEach(z=>box(.05,.1,.05,"#333",.5+x,.1,z,m)))}
const KIDP=["es","biskuit","soda","keripik","roti"];
function spawn(){
 if(cs.length>=4+S.land+(ev&&ev.k==="ramai"?2:0))return;
 const av=P.filter(p=>S.shelves.includes(p.id)&&S.stock[p.id]>0&&Math.random()<cl(1.6-.6*pr(p.id)/p.p,.15,1));if(!av.length)return;
 const R0=Math.random(),ty=R0<.15?"rush":R0<.25?"bulk":R0<.35?"tawar":"normal";
 const kid=ty==="normal"&&Math.random()<.16;
 const n=kid?1:ty==="rush"?1:ty==="bulk"?2+Math.floor(Math.random()*2):1+Math.floor(Math.random()*2);
 const wants=av.sort(()=>Math.random()-.5).slice(0,n).map(p=>({pid:p.id,q:1+Math.floor(Math.random()*2)}));
 const wants2=kid?(()=>{const kp=av.filter(p=>KIDP.includes(p.id));return kp.length?[{pid:pick(kp).id,q:1}]:wants})():wants;
 const m=person(pick(SH),pick(HAIR),pick(SKIN),pick(PANTS),Math.random()<.25,ty==="bulk");if(kid)m.scale.setScalar(.72);if(ty==="bulk")addTrolley(m);sc.add(m);
 if(ty!=="normal"){const ic=emoSprite({rush:"⏱️",bulk:"🛒",tawar:"💬"}[ty]);ic.position.set(0,2.05,0);m.add(ic)}
 SFX.bell();cs.push({m,ty,pat:ty==="rush"?45:ty==="bulk"?150:120,qris:Math.random()<(S.mach>=3?.6:.35),mv:false,x:W()-2.5,z:8,kid,wants:wants2,cart:[],st:"in",i:0,t:0,wait:0,qt:0,sp:(ty==="rush"?2.5:kid?1.9:1.5)+Math.random()*.5,off:(Math.random()-.5)*1.4,rd:false})}
function mvTo(c,tx,tz,dt){const dx=tx-c.x,dz=tz-c.z,d=Math.hypot(dx,dz);if(d<.08){c.mv=false;return true}c.mv=true;const s=Math.min(d,c.sp*dt);c.x+=dx/d*s;c.z+=dz/d*s;c.m.rotation.y=Math.atan2(dx,dz);return false}
const EXIT=()=>[[W()-2.5,4.8],[W()-2.5,8.5]];
      //rubah
      /* ---------- jalur pelanggan: menghindari rak ---------- */
function segHit(ax,az,bx,bz,o,m){
 const e=.001,x0=o.x-o.hx-m+e,x1=o.x+o.hx+m-e,z0=o.z-o.hz-m+e,z1=o.z+o.hz+m-e;
 let t0=0,t1=1;const dx=bx-ax,dz=bz-az;
 for(const [p,d,lo,hi] of [[ax,dx,x0,x1],[az,dz,z0,z1]]){
  if(Math.abs(d)<1e-9){if(p<=lo||p>=hi)return false}
  else{let a=(lo-p)/d,b=(hi-p)/d;if(a>b){const t=a;a=b;b=t}t0=Math.max(t0,a);t1=Math.min(t1,b);if(t0>=t1)return false}}
 return true}
function route(ax,az,bx,bz){
 const m=.45;
 const free=(px,pz,qx,qz)=>!obst.some(o=>segHit(px,pz,qx,qz,o,m));
 if(free(ax,az,bx,bz))return[[bx,bz]];
 const N=[[ax,az],[bx,bz]];
 obst.forEach(o=>{for(const sx of[-1,1])for(const sz of[-1,1]){
  const px=o.x+sx*(o.hx+m+.06),pz=o.z+sz*(o.hz+m+.06);
  if(px>.4&&px<W()-.4&&pz>-5.6&&pz<5.8&&!obst.some(q=>Math.abs(px-q.x)<q.hx+m&&Math.abs(pz-q.z)<q.hz+m))N.push([px,pz])}});
 const n=N.length,d=Array(n).fill(1e9),pv=Array(n).fill(-1),dn=Array(n).fill(false);d[0]=0;
 for(let it=0;it<n;it++){let u=-1;for(let i=0;i<n;i++)if(!dn[i]&&(u<0||d[i]<d[u]))u=i;if(u<0||d[u]>=1e9)break;dn[u]=true;if(u===1)break;
  for(let v=0;v<n;v++)if(!dn[v]){const w=Math.hypot(N[u][0]-N[v][0],N[u][1]-N[v][1]);if(d[u]+w<d[v]&&free(N[u][0],N[u][1],N[v][0],N[v][1])){d[v]=d[u]+w;pv[v]=u}}}
 if(pv[1]<0)return[[bx,bz]];
 const p=[];for(let i=1;i>0;i=pv[i])p.unshift(N[i]);return p}
function walk(c,tx,tz,dt){
 if(!c.rt||c.rt.x!==tx||c.rt.z!==tz||c.rt.o!==obst)c.rt={x:tx,z:tz,o:obst,p:route(c.x,c.z,tx,tz)};
 const p=c.rt.p;
 while(p.length>1&&Math.hypot(p[0][0]-c.x,p[0][1]-c.z)<.12)p.shift();
 if(p.length>1){mvTo(c,p[0][0],p[0][1],dt);return false}
 return mvTo(c,tx,tz,dt)} //rubah
function out(c,s,why){dropPay(c);if(c.cm){c.cm.forEach(m=>sc.remove(m));c.cm=null}rate(s);c.st="out";c.rd=false;c.path=EXIT();if(s<=1){say(c,why==="an"?"Lama banget, pergi ah!":"Yah, kosong…",true);S.D.out++;addRev(1,pick(REV[why==="an"?"an":"st"]));msg("Pelanggan kesal dan pergi! Rating turun.")}}
function placeItems(c){const u=[];c.cart.forEach(i=>{for(let j=0;j<i.q;j++)u.push(i.pid)});
 const od=u.map((_,k)=>k).sort((a,b)=>GH[u[b]]-GH[u[a]]);
 c.cm=u.map((id,k)=>{const s=od.indexOf(k),m=new THREE.Mesh(GE[id],IM[id]),x=3.05+(s%4)*.32,y=.98+GH[id]/2,z=3.22+Math.floor(s/4)*.26;m.position.set(x,y,z);m.userData.o={x,y,z};m.userData.f=0;
  const ol=new THREE.Mesh(GE[id],OLM);ol.scale.set(1.12,1.12,1.12);ol.visible=false;m.add(ol);m.userData.ol=ol;sc.add(m);return m});SFX.pop()}
function updC(dt,now){
 const q=cs.filter(c=>c.st==="queue"||c.st==="pay").sort((a,b)=>a.qt-b.qt);
 for(const c of cs){c.rd=false;
  c.m.userData.rc=0;if(c.bub&&performance.now()/1000>c.bub.until)unsay(c);
  if(c.st==="in"){if(walk(c,W()-2.5,4.8,dt)){c.st="shop";if(Math.random()<.5)say(c,pick(c.kid?["Waaah, banyak jajan!","Ma, ayo cepat!"]:["Selamat siang!","Cari apa ya…","Tokonya rapi, nih"]))}}
  else if(c.st==="shop"){const w=c.wants[c.i];
   if(c.brInit===undefined){c.brInit=1;c.br=Math.random()<.45?pick(S.shelves.map((id,k)=>id&&slots[k]?k:-1).filter(k=>k>=0)):-1}
   if(w&&c.br>=0&&!c.brd){const sl=slots[c.br];if(!sl)c.brd=1;else{const p=stand(c.br,c.off);if(walk(c,p[0],p[1],dt)){c.bt=(c.bt||0)+dt;c.m.rotation.y=Math.atan2(sl.x-c.x,sl.z-c.z);c.m.userData.rc=c.bt>.6&&c.bt<1.3?1:0;if(c.bt>1.9)c.brd=1}}}
   else if(!w){if(c.cart.length){c.st="queue";c.qt=now;c.wait=0}else out(c,1,"st")}
   else{const k=S.shelves.indexOf(w.pid);if(k<0)c.i++;else{const p=stand(k,c.off);if(walk(c,p[0],p[1],dt)){c.t+=dt;c.m.rotation.y=Math.atan2(slots[k].x-c.x,slots[k].z-c.z);if(c.t>.35&&c.t<1)c.m.userData.rc=1;
    if(c.t>1){const n=Math.min(w.q,S.stock[w.pid]);if(n>0){S.stock[w.pid]-=n;c.cart.push({pid:w.pid,q:n});refresh(k);SFX.pop();if(Math.random()<.22)drop(c.x,c.z);
      const ra=pr(w.pid)/PP[w.pid].p;if(ra<=.95&&Math.random()<.7)say(c,"Murah banget!");else if(ra>=1.4&&Math.random()<.6)say(c,"Agak mahal ya…");else if(Math.random()<.25)say(c,pick(c.kid?["Mau ini, Ma!","Yeay!"]:["Ini dia!","Oke, ambil","Kelihatannya enak"]))}
     else say(c,"Yah, habis…",true);c.i++;c.t=0}}}}}
  else if(c.st==="queue"){const i=q.indexOf(c);c.wait+=dt*(i>0?.5:1);if(walk(c,3+i*.9,2.2,dt)&&i===0){c.rd=true;if(!c.cm&&!B)placeItems(c)}if(c.wait>c.pat*.55&&!c.said2){c.said2=1;say(c,"Lama ya…")}if(c.wait>c.pat)out(c,1,"an")}
  else if(c.st==="pay"){mvTo(c,3,2.62,dt);if(!c.mv)c.m.rotation.y*=.8}
  else if(c.st==="out"){if(c.bye){say(c,c.bye,true);c.bye=null}const p=c.path[0];if(p&&walk(c,p[0],p[1],dt))c.path.shift();if(!c.path.length){sc.remove(c.m);c.dead=true}}
  c.m.position.set(c.x,animPerson(c.m,c.mv,now,c.off),c.z)}
 cs=cs.filter(c=>!c.dead)}

/* ---------- ulasan ---------- */
const REV={ex:["Kembaliannya pas, kasirnya teliti! 👍","Cepat dan akurat, mantap!","Pelayanan ramah, besok belanja lagi."],xs:["Kembaliannya kelebihan, makasih ya! 😄","Kasirnya baik hati banget."],sh:["Kembaliannya kurang! Hitung yang bener dong.","Kok kembaliannya kurang? Kecewa."],sl:["Antreannya lama, tapi barangnya lengkap.","Lumayan, cuma kelamaan nunggu."],qr:["QRIS-nya cepat banget, praktis!","Bayar tanpa ribet, mantap."],st:["Barang yang dicari habis terus.","Stoknya kosong, jauh-jauh ke sini."],an:["Antrean lama banget, pergi aja deh.","Nunggu kelamaan, kecewa."],d5:["Makasih diskonnya, kasirnya baik!","Dikasih diskon, pasti balik lagi."],d3:["Minta diskon nggak dikasih, pelit ih.","Diskon dikit aja nggak boleh."],on:["Pesanan online lengkap dan cepat, mantap!","Kurirnya datang tepat waktu, top!"],ru:["Kasirnya sat-set, pas banget lagi buru-buru!"],kt:["Tokonya kotor, sampah di mana-mana.","Lantainya berantakan, kurang nyaman."]};
let rvT;
function addRev(s,t){S.rev.unshift({s,t,d:S.day});if(S.rev.length>30)S.rev.pop();S.D.rc=(S.D.rc||0)+1;S.D.rs=(S.D.rs||0)+s;
 const e=$("rvt");e.textContent="★".repeat(s)+"☆".repeat(5-s)+" “"+t+"”";e.classList.remove("show");void e.offsetWidth;e.classList.add("show");clearTimeout(rvT);rvT=setTimeout(()=>e.classList.remove("show"),3500);drawBoard()}

/* ---------- MODE KASIR ---------- */
function enterCash(){
 if(CASH||B)return;if(MV||S.carry||TH>0||FILL){msg("Tangan penuh. Taruh dulu yang kamu pegang.");return}
 if(!nearC()){msg("Dekati meja kasir dulu.");return}
 CASH=true;document.body.classList.add("cash");applyFov();hKick();msg("Mode kasir: pelanggan dilayani satu per satu. Ketuk KELUAR kalau sudah selesai.")}
function leaveCash(){if(B)cancelBill();CASH=false;document.body.classList.remove("cash");sD("scant","none");applyFov()}
function beginBill(c){
 c.st="pay";let tot=0;const units=[];c.cart.forEach(i=>{for(let j=0;j<i.q;j++){units.push(i.pid);tot+=pr(i.pid)}});
 const nt=[5000,10000,20000,50000,100000].filter(n=>n>=tot);let paid=nt[0]||Math.ceil(tot/100000)*100000;if(nt[1]&&Math.random()<.45)paid=nt[1];
 B={c,tot,paid,give:0,units,method:c.qris?"qris":"cash",hag:c.ty==="tawar"?Math.max(500,Math.round(tot*.1/500)*500):0,scan:true,done:0,fly:[],fin:false,run:0,dsc:0};
 $("hag").hidden=true;$("pay").hidden=true;$("bill").hidden=true;
 c.cm.forEach(m=>{m.userData.f=0;if(m.userData.ol)m.userData.ol.visible=false});drawScr("Siap dipindai","",0)}
function cancelBill(){if(!B)return;const c=B.c;if(B.mm)sc.remove(B.mm);dropPay(c);c.st="queue";
 if(c.cm)c.cm.forEach(m=>{m.visible=true;m.userData.f=0;const o=m.userData.o;if(o)m.position.set(o.x,o.y,o.z);if(m.userData.ol)m.userData.ol.visible=false});
 B=null;$("bill").hidden=true;drawScr("SIAP","",null)}
function finishBill(){if(B&&B.mm)sc.remove(B.mm);if(B)flyHold(B.c);if(B&&B.c.cm){B.c.cm.forEach(m=>sc.remove(m));B.c.cm=null}B=null;$("bill").hidden=true;drawScr("SIAP","",null)}
const RC=new THREE.Raycaster(),NDC=new THREE.Vector2();
function tapItem(e){
 if(!B||!B.scan||!B.c.cm)return;NDC.set(e.clientX/innerWidth*2-1,-(e.clientY/innerHeight)*2+1);RC.setFromCamera(NDC,cam);
 const live=B.c.cm.filter(m=>m.visible&&!m.userData.f),h=RC.intersectObjects(live,true)[0];if(!h)return;
 let o=h.object;while(o&&!live.includes(o))o=o.parent;if(!o)return;
 o.userData.f=1;B.fly.push({m:o,k:B.c.cm.indexOf(o),t:0});SFX.scan();vib(8)}
function scanTick(dt,now){
 if(!B){if(CASH){const nx=cs.find(c=>c.st==="queue"&&c.rd&&c.cm);if(nx)beginBill(nx);else{sD("scant","block");sT("scant","⏳ Menunggu pelanggan di meja kasir…")}}return}
 if(B.mm&&B.mt<1){B.mt=Math.min(1,B.mt+dt*2.5);B.mm.position.set(3+.2*B.mt,1.25-.27*B.mt+Math.sin(Math.PI*B.mt)*.2,2.4+1.1*B.mt)}
 if(!B.scan)return;const dur=S.mach>=2?.22:.38;
 B.fly=B.fly.filter(f=>{f.t+=dt;const p=Math.min(1,f.t/dur),o=f.m.userData.o;if(o)f.m.position.set(o.x+(2.05-o.x)*p,o.y+(1.3-o.y)*p+Math.sin(Math.PI*p)*.3,o.z+(3.62-o.z)*p);
  if(p>=1){f.m.visible=false;const pid=B.units[f.k];B.run+=pr(pid);B.done++;drawScr(PP[pid].n,rp(pr(pid)),B.run);snd(1500,.07,"square",.05);return false}return true});
 if(!B.fin){B.c.cm.forEach(m=>{if(m.visible&&!m.userData.f&&m.userData.ol){const s=1.12+.03*Math.sin(now*6);m.userData.ol.scale.set(s,s,s)}});sD("scant","block");sT("scant","👆 Ketuk barang untuk dipindai ("+B.done+"/"+B.units.length+")")}
 if(B.done>=B.units.length&&!B.fly.length&&!B.fin){B.fin=true;B.scan=false;sD("scant","none");finishScan()}}
function finishScan(){
 drawScr("","",B.tot);
 holdPay(B.c);
 SFX.pop();$("bill").hidden=false;
 if(B.hag){$("hag").hidden=false;sT("hgt","💬 Pelanggan minta diskon "+rp(B.hag)+". Kasih?")}else showPay()}
function showPay(){
 $("hag").hidden=true;$("pay").hidden=false;const q=B.method==="qris";
 document.querySelectorAll(".cashonly").forEach(e=>e.style.display=q?"none":"");
 $("ok").style.gridColumn=q?"1 / -1":"";sT("ok",q?"✅ Terima pembayaran QRIS":"✅ Beri kembalian");
 sT("bp",rp(B.paid));sT("bt",rp(B.tot));sT("bg",rp(B.give));hintUI();
 if(q&&S.mach>=3){const b=B;setTimeout(()=>{if(B===b)$("ok").click()},700)}}
function hintUI(){const q=B&&B.method==="qris",v=S.mach>=5&&!q;sD("hintrow",v?"flex":"none");if(v)sT("hintv",S.set.hint!==0?rp(B.paid-B.tot):"(mati)")}
$("hintrow").addEventListener("click",()=>{if(!B)return;S.set.hint=S.set.hint===0?1:0;save();hintUI()});
$("hy").addEventListener("click",()=>{if(!B||!B.hag)return;B.tot-=B.hag;B.hag=0;B.dsc=1;rate(4);msg("Diskon diberikan. Pelanggan senang!");showPay()});
$("hn").addEventListener("click",()=>{if(!B||!B.hag)return;B.hag=0;B.dsc=-1;rate(2);msg("Diskon ditolak. Pelanggan agak kesal.");showPay()});
/* tombol uang rupiah: ketuk pecahan untuk menambah kembalian */
const BILLS=[[2000,"#c9ccd1"],[5000,"#d8b48a"],[10000,"#b9a3e3"],[20000,"#9ad8a6"],[50000,"#8cc4ee"],[100000,"#f09aa6"]];
const COINS=[[500,"#dfe3e8"],[1000,"#f2c14e"]];
function addGive(v){if(!B||B.give+v>9999999)return;B.give+=v;(B.stk=B.stk||[]).push(v);sT("bg",rp(B.give));vib(6)}
function undoGive(){if(!B||!B.stk||!B.stk.length)return;B.give-=B.stk.pop();sT("bg",rp(B.give));vib(6)}
function moneyBtn(v,c,coin){const b=document.createElement("button");b.className="bn"+(coin?" cn":"");b.style.background=c;
 b.innerHTML=coin?"<small>Rp</small>"+v.toLocaleString("id-ID"):"Rp"+v.toLocaleString("id-ID");
 b.addEventListener("click",()=>addGive(v));$(coin?"dcoin":"dbill").appendChild(b)}
BILLS.forEach(d=>moneyBtn(d[0],d[1],false));COINS.forEach(d=>moneyBtn(d[0],d[1],true));
{const u=document.createElement("button");u.className="bn undo";u.textContent="↶";u.setAttribute("aria-label","Urungkan");u.addEventListener("click",undoGive);$("dcoin").appendChild(u)}
$("rs").addEventListener("click",()=>{if(B){B.give=0;B.stk=[];sT("bg",rp(0))}});
$("exitk").addEventListener("click",leaveCash);$("bc").addEventListener("click",leaveCash);
$("ok").addEventListener("click",()=>{
 if(!B||!B.fin)return;if(B.method==="qris"){B.paid=B.tot;B.give=0}
 const exp=B.paid-B.tot,d=B.give-exp,c=B.c,m0=S.money;let t;
 if(d===0){SFX.cash();S.money+=B.tot;rate(5);t="Pas! Kembalian "+rp(exp)+" benar. +"+rp(B.tot)}
 else if(d>0){SFX.bad();S.money+=B.tot-d;rate(3);t="Kelebihan "+rp(d)+"! Kamu rugi. (seharusnya "+rp(exp)+")"}
 else{SFX.bad();S.money+=B.tot;rate(1);t="Kurang "+rp(-d)+"! Pelanggan kesal. (seharusnya "+rp(exp)+")"}
 if(B.method==="qris")t="✅ QRIS diterima! +"+rp(B.tot);
 S.D.rev+=S.money-m0;S.D.served++;S.D.cogs+=B.units.reduce((a,id)=>a+mc(id),0);if(d!==0)S.D.bad++;
 {let st=5,rk="ex";if(B.method==="qris")rk="qr";else if(d>0)rk="xs";else if(d<0){rk="sh";st=1}
  if(st>1&&c.wait>c.pat*.6){rk="sl";st=3}if(B.dsc===1)rk="d5";else if(B.dsc===-1){rk="d3";st=Math.min(st,3)}if(c.ty==="rush"&&st>=4&&c.wait<8)rk="ru";addRev(st,pick(REV[rk]))}
 if(S.mach>=4){rate(5);snd(260,.18,"sawtooth",.03)}
 S.served++;msg(t);vib(d===0?[12,40,12]:30);burst(2.05,1.3,3.6,d===0?"#ffd166":"#ff8a80",d===0?10:5);
 if(Math.random()<.3)drop(c.x,c.z);c.st="out";c.path=EXIT();c.bye=d>=0?pick(["Makasih ya!","Sampai jumpa!","Besok mampir lagi","Mantap, terima kasih"]):"Kok kurang sih…";finishBill();save()});

/* ---------- pesanan online & pegawai pengemas ---------- */
function packOrder(o,auto){
 if(!ORD.includes(o))return false;if(!auto&&!nearC()){msg("Ke meja kasir dulu untuk mengemas pesanan.");return false}
 if(o.items.some(it=>(S.stock[it.id]||0)<it.q)){if(!auto)msg("Stok belum cukup.");return false}
 let cg=0;o.items.forEach(it=>{S.stock[it.id]-=it.q;cg+=mc(it.id)*it.q;refresh(S.shelves.indexOf(it.id))});
 S.money+=o.rw;S.D.rev+=o.rw;S.D.cogs+=cg;S.D.on=(S.D.on||0)+1;ORD=ORD.filter(x=>x!==o);courier();SFX.cash();rate(4);addRev(5,pick(REV.on));
 msg((auto?"🧑‍🍳 Pegawai mengemas pesanan! +":"✅ Pesanan terkirim! +")+rp(o.rw));if(tab===6&&!$("phone").hidden)phone();return true}
function newOrder(){const av=P.filter(p=>S.shelves.includes(p.id));if(!av.length)return;
 const its=av.sort(()=>Math.random()-.5).slice(0,2+Math.floor(Math.random()*2)).map(p=>({id:p.id,q:1+Math.floor(Math.random()*3)}));let sub=0;its.forEach(i=>sub+=pr(i.id)*i.q);
 ORD.push({id:ordId++,items:its,t:(75+Math.random()*45)*1.5,rw:Math.round((sub*1.25+5000)/500)*500});msg("🛵 Pesanan online masuk!");SFX.bell();if(tab===6&&!$("phone").hidden)phone()}
function courier(){const m=person("#2e9e5b","#222",pick(SKIN),"#222",true,true,"courier");sc.add(m);cr.push({m,x:W()-2.5,z:8,sp:2.6,mv:false,path:[[W()-2.5,4.8],[3.2,2.3],[W()-2.5,4.8],[W()-2.5,8.5]]})}
function updCr(dt,now){for(const c of cr){const p=c.path[0];if(p){if(mvTo(c,p[0],p[1],dt))c.path.shift()}else{sc.remove(c.m);c.dead=true}c.m.position.set(c.x,animPerson(c.m,c.mv,now,0),c.z)}cr=cr.filter(c=>!c.dead)}
function ordTick(dt){
 trTick(dt);ordT-=dt;if(ordT<=0&&ORD.length<3&&S.op){newOrder();ordT=(40+Math.random()*30)*1.5}
 if(S.worker)[...ORD].forEach(o=>{const ok=!o.items.some(it=>(S.stock[it.id]||0)<it.q);if(ok){o.pk=(o.pk===undefined?3+Math.random()*3:o.pk)-dt;if(o.pk<=0)packOrder(o,true)}else o.pk=undefined});
 if(wkIc)wkIc.visible=ORD.some(o=>o.pk!==undefined&&o.pk>0);
 ORD.forEach(o=>o.t-=dt);const ex=ORD.filter(o=>o.t<=0);
 if(ex.length){ORD=ORD.filter(o=>o.t>0);ex.forEach(()=>{rate(2);addRev(2,"Pesanan online telat, dibatalkan.")});msg("⏰ Pesanan online hangus!");SFX.bad();if(tab===6&&!$("phone").hidden)phone()}
 sT("ph","📱 Ponsel"+(ORD.length?" ("+ORD.length+")":""));
 if(!$("phone").hidden&&tab===6)ORD.forEach(o=>{const e=$("ot-"+o.id),t=Math.ceil(o.t)+"d";if(e&&e.textContent!==t)e.textContent=t})}

/* ==========================================================
   Bagian 3: akhir hari, ponsel, panduan, pengaturan, loop utama
   ========================================================== */
     /* ---------- akhir hari ---------- */
function showSum(t,h){sT("st",t);$("sb").innerHTML=h;sT("sn","▶ Mulai hari ke-"+(S.day+1));$("sum").hidden=false}
function endDay(){
 SUMV=true;ORD=[];cr.forEach(c=>sc.remove(c.m));cr=[];ordT=20;
 cs.forEach(c=>{if(c.cm)c.cm.forEach(m=>sc.remove(m));sc.remove(c.m)});cs=[];leaveCash();
 const D=S.D,n=S.shelves.filter(Boolean).length,rent=25000,pw=fixk(1200)*n,wg=S.worker?30000:0,fix=rent+pw+wg,net=D.rev-D.cogs-fix;
 const tg=Math.min(fixk(20000)+(S.day-1)*fixk(6000),fixk(150000)),old=S.debt||0,due=fix+old,pay=Math.min(S.money,due);
 S.money-=pay;S.debt=due-pay;let warn="";
 if(S.debt>0){const fine=Math.round(S.debt*.1/500)*500;S.debt+=fine;rate(1);rate(1);warn="⚠️ Uang kurang! Tunggakan "+rp(S.debt)+" (termasuk denda "+rp(fine)+"). Rating turun."}
 let bonus=0;if(net>=tg){bonus=Math.round(tg*.1/500)*500;S.money+=bonus}
 rollMarket();S.pn=net;
 const m=v=>(v<0?"−":"")+rp(Math.abs(v));
 const det='<div class="sumdet"><b>Rincian hari ini</b>'+row("Pelanggan dilayani",D.served+(D.on?" • pesanan online "+D.on:""),"")+
  row("Pendapatan","",m(D.rev))+row("Modal barang","",m(-D.cogs))+row("<b>Untung kotor</b>","",'<b>'+m(D.rev-D.cogs)+"</b>")+
  row("Sewa toko","",m(-rent))+row("Listrik ("+n+" rak)","",m(-pw))+(wg?row("Gaji pegawai","",m(-wg)):"")+
  row("<b>Untung bersih</b>","",'<b class="'+(net>=0?"pos":"neg")+'">'+m(net)+"</b>")+
  (old?row("Tunggakan kemarin","",m(-old)):"")+row("Uang dibayar","",m(-pay))+(bonus?row("Bonus target","",m(bonus)):"")+row("Uang sekarang","",rp(S.money))+"</div>";
 const h='<div class="sumbox"><div class="sumlbl">Untung bersih</div><div class="sumnum '+(net>=0?"pos":"neg")+'">'+(net<0?"−":"")+rp(Math.abs(net))+'</div>'+
  '<div class="sumtg '+(net>=tg?"ok":"")+'">Target '+rp(tg)+': '+(net>=tg?"✅ Tercapai (bonus "+rp(bonus)+") 🎉":"❌ Belum")+'</div></div>'+det+(warn?'<p class="warn">'+warn+"</p>":"");
 const tt="🌙 Hari ke-"+S.day+" selesai";S.sum={t:tt,h};save();showSum(tt,h);vib(net>=tg?[20,60,20]:20)}
$("sn").addEventListener("click",()=>{
 S.day++;S.D={rev:0,cogs:0,served:0,bad:0,out:0,rc:0,rs:0,on:0};S.sum=null;dayT=0;S.dt=0;spawnT=3;ev=null;evT=40+Math.random()*40;
 px=3;pz=4.8;vx=vz=0;TR.forEach(o=>sc.remove(o.m));TR=[];TH=0;closedMsg=false;S.op=false;drawSign();SUMV=false;$("sum").hidden=true;save();
 msg("Hari ke-"+S.day+" dimulai! Siapkan stok, lalu buka toko di pintu 🚪")});
$("sp").addEventListener("click",()=>$("ph").click());

/* ---------- ponsel ---------- */
const MACH=[null,{n:"Kasir manual",d:"Ketuk barang satu per satu.",c:0},{n:"Scanner barcode",d:"Barang dipindai 2× lebih cepat.",c:150000},{n:"Mesin EDC/QRIS",d:"Pelanggan non-tunai ±60% dan QRIS diterima otomatis.",c:250000},{n:"Printer struk",d:"Tiap transaksi keluar struk, rating naik sedikit.",c:200000},{n:"Laci pintar",d:"Layar menampilkan kembalian yang benar (bisa dimatikan).",c:400000}];
const row=(t,sub,btn,st)=>'<div class="row"'+(st?' style="'+st+'"':"")+'><span>'+t+(sub?"<small>"+sub+"</small>":"")+"</span>"+(btn||"")+"</div>";
const bt_=(a,i,txt,dis,d)=>'<button class="btn" data-a="'+a+'"'+(i!==undefined?' data-i="'+i+'"':"")+(d?' data-d="'+d+'"':"")+(dis?" disabled":"")+">"+txt+"</button>";
const HIRE=()=>S.worker?row("🧑‍🍳 Pegawai pengemas","Sudah bekerja: mengemas pesanan online otomatis • gaji Rp30.000/hari"):row("🧑‍🍳 Pegawai pengemas","Mengemas pesanan online otomatis • gaji Rp30.000/hari",bt_("hire",undefined,rp(300000),S.money<300000));
function phone(){
 let h="";
 if(tab===0)P.forEach(p=>{const on=S.shelves.includes(p.id),c=cost(p);h+=row(p.n,"Rak "+S.stock[p.id]+"/24 • Kardus "+S.boxes.filter(b=>b.id===p.id).length+"",on?bt_("stok",p.id,"+1 kardus · "+rp(c),S.money<c):"<small>Belum ada rak</small>")});
 else if(tab===1){const free=P.filter(p=>!S.shelves.includes(p.id)),used=S.shelves.filter(Boolean).length,full=used>=slotsN();h+=HIRE()+"<small class='note'>Rak terpakai "+used+"/"+slotsN()+"</small>";
  if(full)h+="<p class='note'>Slot penuh. Perluas lahan dulu.</p>";else if(!free.length)h+="<p class='note'>Semua produk sudah punya rak.</p>";else free.forEach(p=>h+=row("Rak "+p.n,"",bt_("rak",p.id,rp(150000),S.money<150000)))}
 else if(tab===6){h+="<small class='note'>Pesanan online: berdiri dekat meja kasir, lalu ketuk harga untuk mengemas. Barang diambil dari stok rak."+(S.worker?" Pegawai pengemas akan mengemas otomatis jika stok cukup.":"")+"</small>";if(!ORD.length)h+="<p class='note'>Belum ada pesanan. Pesanan masuk saat toko buka.</p>";
  ORD.forEach(o=>{const miss=o.items.filter(i=>(S.stock[i.id]||0)<i.q);h+=row("<b>Pesanan #"+o.id+"</b> • <span id='ot-"+o.id+"'>"+Math.ceil(o.t)+"d</span>",o.items.map(i=>PP[i.id].n+" ×"+i.q).join(", ")+(miss.length?"<br><span class='bad'>Stok kurang: "+miss.map(i=>PP[i.id].n).join(", ")+"</span>":""),bt_("pack",o.id,rp(o.rw),miss.length)+bt_("tolak",o.id,"✖ Tolak"))})}
 else if(tab===7){const a=S.rev;h+="<small class='note'>⭐ "+avgRev().toFixed(1).replace(".",",")+" rata-rata ulasan terakhir ("+a.length+"). Ulasan memengaruhi jumlah pelanggan baru.</small>";if(!a.length)h+="<p class='note'>Belum ada ulasan.</p>";
  a.slice(0,10).forEach(r=>{h+=row("<b class='"+(r.s>=4?"good":r.s>=3?"mid":"bad")+"'>"+"★".repeat(r.s)+"☆".repeat(5-r.s)+"</b>","“"+r.t+"”")})}
 else if(tab===5){h+="<small class='note'>Level mesin: "+S.mach+" • "+MACH[S.mach].n+". Mesin kasir ada di meja kasir (monitor besar di kiri).</small>";
  for(let l=2;l<=5;l++){const m=MACH[l],own=S.mach>=l,can=S.mach===l-1&&S.money>=m.c;h+=row(m.n,m.d+(own||S.mach===l-1?"":" • butuh level sebelumnya"),bt_("mach",l,own?"✓ Dimiliki":rp(m.c),own||!can))}}
 else if(tab===3){h+="<small class='note'>Harga jual per barang (kelipatan Rp500). Terlalu mahal = pelanggan malas beli. Bisa juga diubah dengan mengarahkan titik ke rak.</small>";
  S.shelves.filter(Boolean).forEach(id=>{const p=PP[id],pc=pr(id),bc=mc(id);h+=row(p.n,"Modal "+rp(bc)+" • Untung "+rp(pc-bc),'<span class="stepper">'+bt_("hrg",id,"−",false,-500)+"<b>"+rp(pc)+"</b>"+bt_("hrg",id,"+",false,500)+"</span>")})}
 else h+="<p class='note'>Lahan level "+S.land+"/2 (lebar "+W()+" m)</p>"+(S.land>=2?"<p class='note'>Sudah maksimal.</p>":row("Perluas toko +6 m","+4 slot rak",bt_("lahan",undefined,rp(1500000),S.money<1500000)));
 $("pb").innerHTML=h;sT("pm","💵 "+rp(S.money));
 document.querySelectorAll("#phone .tabs button").forEach(b=>b.classList.toggle("on",+b.dataset.t===tab))}
$("ph").addEventListener("click",()=>{$("phone").hidden=false;phone()});$("pc").addEventListener("click",()=>$("phone").hidden=true);
document.querySelectorAll("#phone .tabs button").forEach(b=>b.addEventListener("click",()=>{tab=+b.dataset.t;phone();b.scrollIntoView({inline:"center",block:"nearest"})}));
$("pb").addEventListener("click",e=>{
 const b=e.target.closest("button");if(!b||b.disabled)return;const a=b.dataset.a,i=b.dataset.i;
 if(a==="stok"){const c=cost(PP[i]);if(S.money<c)return;if(S.boxes.length>=10){msg("Area kardus penuh! Isi rak dulu.");return}S.money-=c;S.boxes.push({id:i,q:12});drawBoxes();SFX.buy();msg("Kardus "+PP[i].n+" tiba di dekat pintu 📦")}
 else if(a==="rak"){if(S.money<150000)return;S.money-=150000;S.shelves[S.shelves.findIndex(x=>!x)]=i;buildStore();SFX.buy();msg("Rak "+PP[i].n+" dipasang. Isi stoknya!")}
 else if(a==="pack"){const o=ORD.find(x=>x.id===+i);if(o)packOrder(o,false)}
 else if(a==="tolak"){const o=ORD.find(x=>x.id===+i);if(o){ORD=ORD.filter(x=>x!==o);SFX.tap();msg("🚫 Pesanan #"+o.id+" ditolak.");phone()}}
 else if(a==="mach"){const l=+i,m=MACH[l];if(!m||S.mach!==l-1||S.money<m.c)return;S.money-=m.c;S.mach=l;buildStore();SFX.buy();msg("Upgrade: "+m.n+"!")}
 else if(a==="hire"){if(S.money<300000||S.worker)return;S.money-=300000;S.worker=true;buildStore();SFX.buy();msg("Pegawai pengemas mulai bekerja! Gaji Rp30.000/hari.")}
 else if(a==="hrg"){S.price[i]=cl(pr(i)+(+b.dataset.d),500,maxP(i));refresh(S.shelves.indexOf(i))}
 else if(a==="lahan"){if(S.money<1500000||S.land>=2)return;S.money-=1500000;S.land++;buildStore();msg("Toko diperluas!")}
 vib(8);save();phone()});

/* ---------- panduan & pengaturan ---------- */
const HELP=[
["🎮 Gerak & lihat","Joystick kiri untuk jalan. Geser layar untuk menoleh. Titik di tengah layar adalah pembidik. Tombol ✋ di pojok kanan bawah dipakai untuk mengambil, menaruh, atau membuka apa yang kamu bidik."],
["📱 Belanja stok","Ketuk Ponsel → Stok → beli kardus. Kardusnya muncul di dekat pintu. Harga grosir selalu tetap."],
["📦 Isi rak","Dekati kardus → ketuk ✋ untuk mengangkat → bawa ke rak yang cocok → ✋ lagi untuk mengisi (tunggu sampai terisi, jangan menjauh). Satu rak maksimal 24 barang. Kardus kosong jadi sampah."],
["🧾 Mode kasir","Arahkan titik ke meja kasir lalu ketuk ✋. Kamu masuk mode kasir dan pelanggan dilayani satu per satu otomatis: ketuk barang agar loncat ke mesin (harga terhitung di layar), pelanggan memberi uang, ketik kembalian di keypad lalu OK (QRIS tanpa kembalian). Ketuk KELUAR DARI KASIR kalau sudah tidak mau melayani. Waspada: ⏱️ buru-buru, 🛒 borong, 💬 minta diskon."],
["🏷️ Harga & rak","Arahkan titik ke rak: ubah harga dengan − / +, atau ketuk ✋ untuk mengangkat rak (✋ lagi untuk menaruh, ↻ untuk memutar). Harga terlalu mahal membuat toko sepi."],
["🕹️ Santai","Tidak ada hari, sewa, atau target. Buka atau tutup toko kapan saja di pintu 🚪 (ketuk ✋). Jam di atas hanya mengatur siang dan malam. Sampah pelanggan: pungut dengan ✋ (maks 5) lalu buang ke tong sampah di dekat meja kasir. Toko kotor menurunkan rating."]];
let hi=0,hp=false;
function showHelp(i){hi=i;sT("hh",HELP[i][0]);sT("hb",HELP[i][1]);$("hdots").innerHTML=HELP.map((_,j)=>'<i class="'+(j===i?"on":"")+'"></i>').join("");$("hprev").style.visibility=i?"visible":"hidden";sT("hnext",i===HELP.length-1?"Selesai ✓":"Lanjut ▶");$("help").hidden=false;if(!SUMV&&!hp){SUMV=true;hp=true}}
function closeHelp(){$("help").hidden=true;S.help=1;save();if(hp){SUMV=false;hp=false}}
$("hprev").addEventListener("click",()=>showHelp(Math.max(0,hi-1)));$("hnext").addEventListener("click",()=>hi>=HELP.length-1?closeHelp():showHelp(hi+1));$("hskip").addEventListener("click",closeHelp);$("qm").addEventListener("click",()=>showHelp(0));
const QN={auto:"Otomatis",low:"Hemat (rendah)",high:"Tinggi"};
function setUI(){sT("tsnd",S.set.snd?"🔊 Suara: Hidup":"🔇 Suara: Mati");sT("tvib",S.set.vib!==0?"📳 Getar: Hidup":"📴 Getar: Mati");sT("tq","🖼️ Kualitas grafis: "+QN[S.set.q]);$("sens").value=Math.round(S.set.sens*100);if(AMB)AMB.gain.value=S.set.snd?.01:0}
$("gear").addEventListener("click",()=>{setUI();$("set").hidden=false});$("sc2").addEventListener("click",()=>$("set").hidden=true);
$("tsnd").addEventListener("click",()=>{S.set.snd=S.set.snd?0:1;setUI();save()});
$("tvib").addEventListener("click",()=>{S.set.vib=S.set.vib!==0?0:1;setUI();vib(15);save()});
$("tq").addEventListener("click",()=>{S.set.q=S.set.q==="auto"?"low":S.set.q==="low"?"high":"auto";PR=qCap();rs();setUI();save()});
$("sens").addEventListener("input",e=>{S.set.sens=e.target.value/100;save()});
$("shelp").addEventListener("click",()=>{$("set").hidden=true;showHelp(0)});
let rsT=0;$("srst").addEventListener("click",()=>{if(!rsT){rsT=1;sT("srst","⚠️ Yakin? Ketuk lagi untuk hapus");setTimeout(()=>{rsT=0;sT("srst","🗑️ Reset progres")},3500)}else{window.NOSAVE=1;try{localStorage.removeItem("supermarketV1")}catch(e){}location.reload()}});
document.addEventListener("click",e=>{if(e.target.closest&&e.target.closest("button"))SFX.tap()},true);

/* ---------- loop utama ---------- */
let lastT=performance.now(),lastMoney=S.money,lastPc=-1,errShown=false,fpsA=0,fpsN=0,xhOn=false;
function perf(dt){if(S.set.q!=="auto")return;fpsA+=dt;fpsN++;if(fpsN>=90){const a=fpsA/fpsN;fpsA=0;fpsN=0;const cap=qCap();if(a>1/38&&PR>.75){PR=Math.max(.75,PR-.25);rs()}else if(a<1/55&&PR<cap){PR=Math.min(cap,PR+.25);rs()}}}
function frame(t){
 const dt=Math.min((t-lastT)/1000,.05),now=t/1000;lastT=t;perf(dt);
 /* gerak (dengan akselerasi halus) */
 const kx=(K.d||K.arrowright?1:0)-(K.a||K.arrowleft?1:0),ky=(K.w||K.arrowup?1:0)-(K.s||K.arrowdown?1:0);
 const mx=cl(jv.x+kx,-1,1),my=cl(-jv.y+ky,-1,1),can=!B&&!CASH&&!SUMV&&$("phone").hidden;
 const tvx=can?(-Math.sin(yaw)*my+Math.cos(yaw)*mx)*3.2:0,tvz=can?(-Math.cos(yaw)*my-Math.sin(yaw)*mx)*3.2:0,kk=Math.min(1,dt*12);
 vx+=(tvx-vx)*kk;vz+=(tvz-vz)*kk;px+=vx*dt;pz+=vz*dt;
 const mvg=Math.hypot(vx,vz)>.5;if(mvg){bobT+=dt*9;stepT+=dt;if(stepT>.42){stepT=0;SFX.step()}}
 px=cl(px,.5,W()-.5);pz=cl(pz,-5.5,5.5);
 for(const o of obst){const dx=px-o.x,dz=pz-o.z,ox=o.hx+.35-Math.abs(dx),oz=o.hz+.35-Math.abs(dz);if(ox>0&&oz>0){if(ox<oz)px+=Math.sign(dx||1)*ox;else pz+=Math.sign(dz||1)*oz}}
 /* hari, pelanggan, event */
 if(!SUMV){dayT+=dt;S.dt=dayT;spawnT-=dt;
  if(spawnT<=0&&dayT<DAYL&&S.op){spawnT=cl(9/((S.rating*.6+avgRev()*.4)/3),4,18)*(.7+Math.random()*.6)*(ev?ev.k==="ramai"?.5:ev.k==="hujan"?2:1:1);spawn()}
  evT-=dt;if(ev){ev.t-=dt;if(ev.t<=0){ev=null;msg("Event selesai.");evT=60+Math.random()*60}}else if(evT<=0){const e=pick(EVS);ev={k:e.k,n:e.n,t:e.t};msg(e.n+"!");SFX.bell()}
  updC(dt,now);updCr(dt,now);ordTick(dt);
  if(dayT>=DAYL){dayT=0;S.dt=0}}
 /* langit & jam */
 const hh=8+dayT/SPH,sun=.5+.5*Math.cos(2*Math.PI*(hh-12)/24);
 if(clkH){clkH.rotation.z=-(hh%12)/12*Math.PI*2;clkM.rotation.z=-(hh%1)*Math.PI*2}
 sc.background.copy(NIGHT).lerp(DAY,sun);
 rainK+=((ev&&ev.k==="hujan"?1:0)-rainK)*Math.min(1,dt*1.2);if(rainK>.01)sc.background.lerp(RAINC,rainK*.55*sun+rainK*.1);
 winM.color.copy(sc.background);hemi.intensity=.8+.3*sun-.08*rainK;dl.intensity=.2+.28*sun;
 RAINM.opacity=RAINM2.opacity=rainK*.85;RAINTX.offset.y-=dt*1.8;RAINTX2.offset.y-=dt*1.3;HALOM.opacity=(1-sun)*.55;
 const rs2=!!(S.set.snd&&ev&&ev.k==="hujan");if(rs2!==rainSnd&&RAING){rainSnd=rs2;RAING.gain.setTargetAtTime(rs2?.07:0,AC.currentTime,.8)}
 sT("hc","🕒 "+String(Math.floor(hh)).padStart(2,"0")+":"+String(Math.floor(hh%1*6)*10).padStart(2,"0")+(sun<.25?" 🌙":" ☀️")+(S.op?" • BUKA":" • TUTUP"));
 const pc=Math.round(cl(dayT/DAYL,0,1)*100);if(pc!==lastPc){lastPc=pc;$("dayb").style.width=pc+"%"}
 /* kamera, tangan */
 if(CASH){const p=cashPose(),k2=Math.min(1,dt*6);cam.position.x+=(p.x-cam.position.x)*k2;cam.position.y+=(p.y-cam.position.y)*k2;cam.position.z+=(p.z-cam.position.z)*k2;cam.lookAt(p.tx,p.ty,p.tz)}
 else{cam.position.set(px,1.6+(mvg?Math.sin(bobT)*.04:0),pz);cam.rotation.set(pitch,yaw,0)}
 hands.visible=!CASH;hands.position.set(mvg?Math.sin(bobT*.5)*.012:0,mvg?Math.abs(Math.sin(bobT))*.015:0,-HK*.14);HK=Math.max(0,HK-dt*5);
 carryT.visible=TH>0&&!CASH;carryM.visible=!!S.carry&&!CASH;if(S.carry)cst.material.color.set(PP[S.carry.id].c);
 /* ghost rak */
 if(MV){const f=fwd(),q=hz2(MV.r);MV.x=cl(Math.round((px+f[0]*2.6)*2)/2,q[0]+.25,W()-q[0]-.25);MV.z=cl(Math.round((pz+f[1]*2.6)*2)/2,-5.9+q[1]+.1,3.7-q[1]);MV.ok=okPlace(MV.x,MV.z,MV.r,MV.k);
  gh.visible=true;gh.position.set(MV.x,.75,MV.z);gh.rotation.y=MV.r*Math.PI/2;gh.material.color.set(MV.ok?"#6fbf73":"#e05b4f")}else gh.visible=false;
 /* interaksi */
 fillTick(dt);scanTick(dt,now);
 /* pintu geser, laci */
 if(dL){const nr=cs.some(c=>c.z>4.4&&Math.abs(c.x-(W()-2.5))<2)||cr.some(c=>c.z>4.4),op=S.op||nr,a=dL.userData,b=dR.userData;if(op!==dOp){if(dOp!==undefined)SFX.door();dOp=op}dL.position.x+=((op?a.o:a.c)-dL.position.x)*.12;dR.position.x+=((op?b.o:b.c)-dR.position.x)*.12}
 if(mDr)mDr.position.z+=((B&&!$("pay").hidden?3.98:3.62)-mDr.position.z)*.2;
 partTick(dt);
 R.render(sc,cam);
 /* UI (hanya menulis kalau berubah) */
 sT("hm","💵 "+rp(S.money));sT("hr","⭐ "+S.rating.toFixed(1).replace(".",","));sT("hs","👥 "+S.served+" dilayani");
 if(S.money!==lastMoney){const e=$("hm");e.classList.remove("up","dn");void e.offsetWidth;e.classList.add(S.money>lastMoney?"up":"dn");lastMoney=S.money}
 if(ev){sD("he","");sT("he",ev.n+" ("+Math.ceil(ev.t)+"d)")}else sD("he","none");
 AKc=aimShelf();const am=$("aim");
 if(AKc>=0&&!CASH){const id=S.shelves[AKc],pc2=pr(id),ra=pc2/PP[id].p;sD("aim","flex");sT("pv",rp(pc2));const t2="maks "+rp(maxP(id))+" • "+(ra<=1?"Laris":ra<=1.5?"Normal":"Sepi");if($("ph2").textContent!==t2){$("ph2").textContent=t2;$("ph2").style.color=ra<=1?"#6fe39a":ra<=1.5?"#ffd166":"#ff8a80"}}else sD("aim","none");
 sD("mvbar",MV?"flex":"none");
 const hd=handTarget(),hb=$("hand");if(hb.disabled!==(!hd||!!hd.dis))hb.disabled=!hd||!!hd.dis;
 const ht=hd?hd.l:"";sT("handl",ht);sD("handl",hd?"block":"none");
 if(xhOn!==!!hd){xhOn=!!hd;$("xh").classList.toggle("on",xhOn)}
}
function loop(t){requestAnimationFrame(loop);if(document.hidden){lastT=t;return}if(t-lastT<14.5)return;
 try{frame(t)}catch(e){console.error(e);if(!errShown){errShown=true;msg("⚠️ Ada galat kecil. Muat ulang halaman kalau game macet.")}}}
document.addEventListener("visibilitychange",()=>{if(document.hidden)save();else lastT=performance.now()});
addEventListener("pagehide",save);   
 /* ---------- mulai ---------- */
buildStore();
S.sum=null;if(!S.help)showHelp(0);
setUI();requestAnimationFrame(loop);setInterval(save,10000);
requestAnimationFrame(()=>requestAnimationFrame(()=>{const b=$("boot");b.classList.add("hide");setTimeout(()=>{b.style.display="none"},500)}));
})();
