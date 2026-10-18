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
{id:"beras",n:"Beras 1kg",p:14000,c:"#e8e2c8"},{id:"minyak",n:"Minyak goreng",p:18000,c:"#f2d24b"}];
const PP={};P.forEach(p=>PP[p.id]=p);
const SPH=28,DAYL=13*SPH,SC=SPH/10,fixk=v=>Math.round(v*SC/500)*500;   // 1 jam game = 28 detik
const maxP=id=>Math.round(PP[id].p*2/500)*500;
const pr=id=>Math.min(S.price[id]||PP[id].p,maxP(id));
const mc=id=>Math.round(PP[id].p*.7*(S.mk[id]||1));                     // modal per barang
const def=()=>({money:300000,rating:3,served:0,land:0,
 stock:{mie:12,air:12,roti:8,susu:0,keripik:0,sabun:0,teh:0,kopi:0,beras:0,minyak:0},
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
let ev=null,evT=50,dayT=S.dt||0,spawnT=3,ordT=25,ordId=1,trT=0;
let cs=[],cr=[],ORD=[],TR=[];
let px=3,pz=4.8,yaw=0,pitch=0,vx=0,vz=0,jv={x:0,y:0},K={};
let tab=0,sel=null,AKc=-1,HK=0,bobT=0,stepT=0;

/* ---------- audio (sintesis, tanpa file) ---------- */
let AC=null,AMB=null;
function ensureAC(){if(!AC){try{AC=new (window.AudioContext||window.webkitAudioContext)()}catch(e){}}if(AC&&AC.state==="suspended")AC.resume()}
function amb(){if(AMB||!AC)return;try{const g=AC.createGain();g.gain.value=S.set.snd?.01:0;[110,165].forEach((f,i)=>{const o=AC.createOscillator();o.type="sine";o.frequency.value=f;const gg=AC.createGain();gg.gain.value=i?.6:1;o.connect(gg);gg.connect(g);o.start()});g.connect(AC.destination);AMB=g}catch(e){}}
function snd(f,d,ty,v,f2){try{if(!S.set.snd)return;ensureAC();if(!AC)return;const o=AC.createOscillator(),g=AC.createGain(),t=AC.currentTime;o.type=ty||"sine";o.frequency.setValueAtTime(f,t);if(f2)o.frequency.exponentialRampToValueAtTime(f2,t+d);g.gain.setValueAtTime(v||.08,t);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g);g.connect(AC.destination);o.start(t);o.stop(t+d)}catch(e){}}
const SFX={
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
const cost=p=>Math.round(p.p*.7*12*(ev&&ev.k==="promo"?.7:1)*(S.mk[p.id]||1)/100)*100;
const mkl=id=>{const m=S.mk[id]||1,o=S.mkp[id]||1,ar=m>o+.001?"▲":m<o-.001?"▼":"•";return (m<.9?"🟢 murah":m>1.15?"🔴 mahal":"🟡 normal")+" "+ar};
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
const cashPose=()=>cam.aspect>=1.2?{x:2.85,y:1.75,z:4.85,tx:2.95,ty:1.0,tz:3.4,fov:62}:{x:2.9,y:1.95,z:5.55,tx:2.95,ty:.95,tz:3.45,fov:98};
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
const IM={};P.forEach(p=>IM[p.id]=mat(p.c));
const GS={mie:[.3,.14,.22],roti:[.32,.16,.18],susu:[.16,.3,.16],keripik:[.28,.34,.08],sabun:[.2,.12,.14],kopi:[.2,.1,.12],beras:[.3,.32,.14]};
const GCY={air:[.08,.34],teh:[.07,.32],minyak:[.09,.36]};
const GE={},GH={};
P.forEach(p=>{if(GS[p.id]){const z=GS[p.id];GE[p.id]=bgeo(z[0],z[1],z[2]);GH[p.id]=z[1]}else{const c=GCY[p.id];GE[p.id]=new THREE.CylinderGeometry(c[0],c[0],c[1],8);GH[p.id]=c[1]}});

/* ---------- aset bersama ---------- */
const LM=new THREE.MeshBasicMaterial({color:"#fffbe8"}),winM=new THREE.MeshBasicMaterial({color:"#bcd9ee"});
const OLM=new THREE.MeshBasicMaterial({color:"#ff00ff",side:THREE.BackSide});
const SHM=new THREE.MeshBasicMaterial({color:"#000",transparent:true,opacity:.22,depthWrite:false});
const CIRC=new THREE.CircleGeometry(.32,12),SPHG=new THREE.SphereGeometry(.17,8,6);
const FT=(()=>{const t=canvasTex(128,128,g=>{g.fillStyle="#e6e1d2";g.fillRect(0,0,128,128);g.fillStyle="#d7d2c0";g.fillRect(0,0,64,64);g.fillRect(64,64,64,64);g.strokeStyle="#bdb8a4";g.lineWidth=2;g.strokeRect(0,0,128,128);g.strokeRect(0,0,64,64);g.strokeRect(64,64,64,64)});t.wrapS=t.wrapT=THREE.RepeatWrapping;return t})();
const SKIN=["#f3cfa6","#e0b088","#c68a5c","#8d5a3b"],PANTS=["#3b4468","#2f3e46","#5c4033","#4a4a4a"];
const HAIR=["#3b2a20","#6b4a2f","#d9722b","#222"],SH=["#e0a458","#a98ad9","#6fc4d9","#e88a8a","#e8d27a"];

/* ---------- orang (pelanggan, kurir, pegawai) ---------- */
function person(col,hair,skin,pants,hat,nb){
 skin=skin||"#f3cfa6";pants=pants||"#3b4468";const g=new THREE.Group();
 const sh=new THREE.Mesh(CIRC,SHM);sh.rotation.x=-Math.PI/2;sh.position.y=.012;g.add(sh);
 box(.5,.9,.3,col,0,.75,0,g);
 g.userData.l=[box(.18,.6,.2,pants,-.12,.3,0,g),box(.18,.6,.2,pants,.12,.3,0,g)];
 g.userData.a=[box(.12,.55,.14,col,-.31,.8,0,g),box(.12,.55,.14,col,.31,.8,0,g)];
 const h=new THREE.Mesh(SPHG,mat(skin));h.position.y=1.38;g.add(h);
 box(.34,.12,.34,hair,0,1.5,0,g);if(hat)box(.46,.05,.46,hair,0,1.58,0,g);
 box(.04,.04,.02,"#222",-.06,1.4,.15,g);box(.04,.04,.02,"#222",.06,1.4,.15,g);
 if(!nb){box(.3,.16,.22,"#c0504d",.4,.5,.05,g);box(.3,.03,.22,"#8a3a38",.4,.59,.05,g)}
 return g}
function animPerson(m,mv,now,seed){const a=mv?Math.sin(now*9+seed*7):0;m.userData.l[0].rotation.x=a*.6;m.userData.l[1].rotation.x=-a*.6;m.userData.a[0].rotation.x=-a*.5;m.userData.a[1].rotation.x=a*.5;return Math.abs(a)*.05}

/* ---------- dunia toko ---------- */
let world=null,slots=[],obst=[],shG=[],bxG=null,mDr=null,dL=null,dR=null,dInd=null,signCv=null,signTx=null,wkIc=null,scrCv=null,scrTx=null,rvM=null,gh=null;
const W=()=>14+6*S.land,slotsN=()=>2*(3+2*S.land);
function disposeWorld(){if(!world)return;world.traverse(o=>{if(o.material&&o.material.map){o.material.map.dispose();o.material.dispose()}});sc.remove(world)}

/* label harga di depan rak: digambar ulang di canvas yang sama (hemat memori) */
function drawTag(k){const o=shG[k];if(!o)return;const id=S.shelves[k],t=o.tag.userData.c,g=t.getContext("2d");
 g.fillStyle="#fff";g.fillRect(0,0,256,96);g.strokeStyle="#222";g.lineWidth=6;g.strokeRect(3,3,250,90);g.textAlign="center";g.fillStyle="#1f5f46";
 fit(g,rp(pr(id)),44,230,1);g.fillText(rp(pr(id)),128,52);g.fillStyle="#666";g.font="22px sans-serif";g.fillText("Stok "+S.stock[id],128,82);o.tag.needsUpdate=true}
function refresh(k){const o=shG[k];if(!o)return;const n=Math.min(12,S.stock[S.shelves[k]]);for(let i=0;i<12;i++)o.items[i].visible=i<n;drawTag(k)}

function drawSign(){if(!signCv)return;const g=signCv.getContext("2d"),o=S.op;g.fillStyle=o?"#1f7a4d":"#a83232";g.fillRect(0,0,256,128);g.strokeStyle="#fff";g.lineWidth=6;g.strokeRect(5,5,246,118);g.fillStyle="#fff";g.textAlign="center";g.font="bold 64px sans-serif";g.fillText(o?"BUKA":"TUTUP",128,72);g.font="bold 20px sans-serif";g.fillText("08.00 - 21.00",128,108);signTx.needsUpdate=true;if(dInd)dInd.material.color.set(o?"#6fe39a":"#ff6b6b")}
function drawScr(a,b,t){if(!scrCv)return;const g=scrCv.getContext("2d"),k=scrCv.width/256;g.setTransform(k,0,0,k,0,0);g.fillStyle="#000";g.fillRect(0,0,256,136);g.fillStyle="#8ee5c1";g.textAlign="left";g.font="bold 18px monospace";g.fillText((a||"").slice(0,16),10,24);g.textAlign="right";g.fillText(b||"",246,24);
 g.textAlign="center";g.font="bold 22px monospace";g.fillStyle="#5fbf9b";g.fillText("TOTAL",128,66);g.font="bold 40px monospace";g.fillStyle="#d8fff0";g.fillText(t==null?"":rp(t),128,112);scrTx.needsUpdate=true;
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
 for(let i=0;i<Math.floor(w/4.5);i++)for(const z of[-3,2]){const l=new THREE.Mesh(bgeo(1.6,.06,.5),LM);l.position.set(2.5+i*4.5,3.17,z);add(l)}
 // meja kasir: konveyor kanan, monitor besar kiri (seperti game referensi)
 box(3,.9,1,"#7c4a2d",3,.45,3.5,world);box(3.1,.08,1.1,"#b8784b",3,.94,3.5,world);
 box(1.35,.02,.8,"#33363d",3.6,.99,3.5,world);
 box(.7,.1,.5,"#2b2f3a",2.05,1.03,3.62,world);box(.12,.3,.1,"#2b2f3a",2.05,1.2,3.62,world);box(.94,.62,.06,"#1b1e27",2.05,1.5,3.6,world);
 scrCv=document.createElement("canvas");scrCv.width=512;scrCv.height=272;scrTx=new THREE.CanvasTexture(scrCv);
 add(new THREE.Mesh(new THREE.PlaneGeometry(.84,.52),new THREE.MeshBasicMaterial({map:scrTx}))).position.set(2.05,1.5,3.64);drawScr("SIAP","",null);
 mDr=box(.5,.07,.4,"#555b66",2.05,.99,3.62,world);
 box(.2,.04,.26,"#cfd6df",2.9,1.0,3.88,world);box(.16,.012,.1,"#3b6fb6",2.9,1.025,3.88,world);
 if(S.mach>=2){box(.3,.05,.22,"#222",4.3,1.0,3.5,world);box(.28,.012,.04,"#ff3030",4.3,1.03,3.5,world)}
 if(S.mach>=3){box(.14,.22,.1,"#444c58",3.2,1.1,3.88,world);box(.1,.07,.012,"#8ee5c1",3.2,1.17,3.82,world)}
 if(S.mach>=4){box(.22,.12,.16,"#2b2f3a",1.7,1.04,3.85,world);box(.12,.14,.01,"#fff",1.7,1.17,3.93,world)}
 if(S.mach>=5)box(.7,.015,.02,"#6fe39a",2.05,1.1,3.89,world);
 add(label("KASIR","",false)).position.set(3,2.1,3.5);obst.push({x:3,z:3.5,hx:1.5,hz:.5});
 bxG=new THREE.Group();world.add(bxG);drawBoxes();
 // dekorasi
 const hd=add(label("MINI SUPERMARKET","Belanja hemat & lengkap",true));hd.scale.set(1.9,1.9,1);hd.position.set(w/2,2.5,-5.85);
 add(poster("DISKON","Hemat tiap hari!","#e0524d","#f2a23a")).position.set(w-1.9,1.9,-5.86);
 [-2,1].forEach(z=>{const m=new THREE.Mesh(bgeo(.06,1.2,1.8),winM);m.position.set(.12,1.7,z);add(m)});
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
 wkIc=null;if(S.worker){const wk=person("#e8943a","#222","#e0b088","#2f3e46",true,true);wk.position.set(1.6,0,4.9);wk.rotation.y=Math.PI;wkIc=emoSprite("📦");wkIc.position.set(0,2.05,0);wkIc.visible=false;wk.add(wkIc);add(wk)}
 // rak
for(let i=0;i<3+2*S.land;i++)for(let r=0;r<2;r++)slots.push({x:6.5+i*3,z:r?-1.5:-5.3});
 S.shelves.forEach((id,k)=>{if(!id)return;
  const s=S.pos[k]||slots[k],p=PP[id],g=new THREE.Group();slots[k]=s;g.position.set(s.x,0,s.z);g.rotation.y=(s.r||0)*Math.PI/2;add(g);
  const fr=id==="air"||id==="teh"||id==="susu",c1=fr?"#cfe0ea":"#8a6a4a",c2=fr?"#f4fafd":"#c9a57a",c3=fr?"#9db8c8":"#6e5238";
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
function partTick(dt){for(let i=PART.length-1;i>=0;i--){const p=PART[i];p.l-=dt;if(p.l<=0){sc.remove(p.m);PART.splice(i,1);continue}p.vy-=6*dt;p.m.position.x+=p.vx*dt;p.m.position.y+=p.vy*dt;p.m.position.z+=p.vz*dt;const s=p.l/.7;p.m.scale.set(s,s,s)}}
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
function toggleShop(){S.op=!S.op;drawSign();msg(S.op?"🔓 Toko DIBUKA. Selamat berjualan!":"🔒 Toko DITUTUP. Pelanggan baru tidak masuk.");SFX.bell();vib(15);hKick();save()}

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
function spawn(){
 if(cs.length>=4+S.land+(ev&&ev.k==="ramai"?2:0))return;
 const av=P.filter(p=>S.shelves.includes(p.id)&&S.stock[p.id]>0&&Math.random()<cl(1.6-.6*pr(p.id)/p.p,.15,1));if(!av.length)return;
 const R0=Math.random(),ty=R0<.15?"rush":R0<.3?"bulk":R0<.4?"tawar":"normal";
 const n=ty==="rush"?1+Math.floor(Math.random()*2):ty==="bulk"?3+Math.floor(Math.random()*2):1+Math.floor(Math.random()*3);
 const wants=av.sort(()=>Math.random()-.5).slice(0,n).map(p=>({pid:p.id,q:1+Math.floor(Math.random()*(ty==="bulk"?3:2))}));
 const m=person(pick(SH),pick(HAIR),pick(SKIN),pick(PANTS),Math.random()<.25);sc.add(m);
 if(ty!=="normal"){const ic=emoSprite({rush:"⏱️",bulk:"🛒",tawar:"💬"}[ty]);ic.position.set(0,2.05,0);m.add(ic)}
 SFX.bell();cs.push({m,ty,pat:ty==="rush"?30:ty==="bulk"?100:75,qris:Math.random()<(S.mach>=3?.6:.35),mv:false,x:W()-2.5,z:8,wants,cart:[],st:"in",i:0,t:0,wait:0,qt:0,sp:(ty==="rush"?2.5:1.5)+Math.random()*.5,off:(Math.random()-.5)*1.4,rd:false})}
function mvTo(c,tx,tz,dt){const dx=tx-c.x,dz=tz-c.z,d=Math.hypot(dx,dz);if(d<.08){c.mv=false;return true}c.mv=true;const s=Math.min(d,c.sp*dt);c.x+=dx/d*s;c.z+=dz/d*s;c.m.rotation.y=Math.atan2(dx,dz);return false}
const EXIT=()=>[[W()-2.5,4.8],[W()-2.5,8.5]];
function out(c,s,why){if(c.cm){c.cm.forEach(m=>sc.remove(m));c.cm=null}rate(s);c.st="out";c.rd=false;c.path=EXIT();if(s<=1){S.D.out++;addRev(1,pick(REV[why==="an"?"an":"st"]));msg("Pelanggan kesal dan pergi! Rating turun.")}}
function placeItems(c){const u=[];c.cart.forEach(i=>{for(let j=0;j<i.q;j++)u.push(i.pid)});
 c.cm=u.map((id,k)=>{const m=new THREE.Mesh(GE[id],IM[id]),x=3.05+(k%4)*.32,y=.98+GH[id]/2,z=3.22+Math.floor(k/4)*.26;m.position.set(x,y,z);m.userData.o={x,y,z};m.userData.f=0;
  const ol=new THREE.Mesh(GE[id],OLM);ol.scale.set(1.12,1.12,1.12);ol.visible=false;m.add(ol);m.userData.ol=ol;sc.add(m);return m});SFX.pop()}
function updC(dt,now){
 const q=cs.filter(c=>c.st==="queue").sort((a,b)=>a.qt-b.qt);
 for(const c of cs){c.rd=false;
  if(c.st==="in"){if(mvTo(c,W()-2.5,4.8,dt))c.st="shop"}
  else if(c.st==="shop"){const w=c.wants[c.i];
   if(!w){if(c.cart.length){c.st="queue";c.qt=now;c.wait=0}else out(c,1,"st")}
   else{const k=S.shelves.indexOf(w.pid);if(k<0)c.i++;else{const p=stand(k,c.off);if(mvTo(c,p[0],p[1],dt)){c.t+=dt;if(c.t>1){const n=Math.min(w.q,S.stock[w.pid]);if(n>0){S.stock[w.pid]-=n;c.cart.push({pid:w.pid,q:n});refresh(k);SFX.pop();if(Math.random()<.22)drop(c.x,c.z)}c.i++;c.t=0}}}}}
  else if(c.st==="queue"){c.wait+=dt;const i=q.indexOf(c);if(mvTo(c,3+i*.9,2.2,dt)&&i===0){c.rd=true;if(!c.cm)placeItems(c)}if(c.wait>c.pat)out(c,1,"an")}
  else if(c.st==="out"){const p=c.path[0];if(p&&mvTo(c,p[0],p[1],dt))c.path.shift();if(!c.path.length){sc.remove(c.m);c.dead=true}}
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
function cancelBill(){if(!B)return;const c=B.c;if(B.mm)sc.remove(B.mm);c.st="queue";
 if(c.cm)c.cm.forEach(m=>{m.visible=true;m.userData.f=0;const o=m.userData.o;if(o)m.position.set(o.x,o.y,o.z);if(m.userData.ol)m.userData.ol.visible=false});
 B=null;$("bill").hidden=true;drawScr("SIAP","",null)}
function finishBill(){if(B&&B.mm)sc.remove(B.mm);if(B&&B.c.cm){B.c.cm.forEach(m=>sc.remove(m));B.c.cm=null}B=null;$("bill").hidden=true;drawScr("SIAP","",null)}
const RC=new THREE.Raycaster(),NDC=new THREE.Vector2();
function tapItem(e){
 if(!B||!B.scan||!B.c.cm)return;NDC.set(e.clientX/innerWidth*2-1,-(e.clientY/innerHeight)*2+1);RC.setFromCamera(NDC,cam);
 const live=B.c.cm.filter(m=>m.visible&&!m.userData.f),h=RC.intersectObjects(live,true)[0];if(!h)return;
 let o=h.object;while(o&&!live.includes(o))o=o.parent;if(!o)return;
 o.userData.f=1;B.fly.push({m:o,k:B.c.cm.indexOf(o),t:0});SFX.tap();vib(8)}
function scanTick(dt,now){
 if(!B){if(CASH){const nx=cs.find(c=>c.st==="queue"&&c.rd&&c.cm);if(nx)beginBill(nx);else{sD("scant","block");sT("scant","⏳ Menunggu pelanggan di meja kasir…")}}return}
 if(B.mm&&B.mt<1){B.mt=Math.min(1,B.mt+dt*2.5);B.mm.position.set(3+.2*B.mt,1.25-.27*B.mt+Math.sin(Math.PI*B.mt)*.2,2.4+1.1*B.mt)}
 if(!B.scan)return;const dur=S.mach>=2?.22:.38;
 B.fly=B.fly.filter(f=>{f.t+=dt;const p=Math.min(1,f.t/dur),o=f.m.userData.o;if(o)f.m.position.set(o.x+(2.05-o.x)*p,o.y+(1.3-o.y)*p+Math.sin(Math.PI*p)*.3,o.z+(3.62-o.z)*p);
  if(p>=1){f.m.visible=false;const pid=B.units[f.k];B.run+=pr(pid);B.done++;drawScr(PP[pid].n,rp(pr(pid)),B.run);snd(1500,.07,"square",.05);return false}return true});
 if(!B.fin){B.c.cm.forEach(m=>{if(m.visible&&!m.userData.f&&m.userData.ol){const s=1.12+.03*Math.sin(now*6);m.userData.ol.scale.set(s,s,s)}});sD("scant","block");sT("scant","👆 Ketuk barang untuk dipindai ("+B.done+"/"+B.units.length+")")}
 if(B.done>=B.units.length&&!B.fly.length&&!B.fin){B.fin=true;B.scan=false;sD("scant","none");finishScan()}}
function finishScan(){
 drawScr("TOTAL","",B.tot);
 if(B.method==="cash"){const mm=new THREE.Mesh(bgeo(.28,.015,.14),mat("#4caf50"));mm.position.set(3,1.25,2.4);sc.add(mm);B.mm=mm;B.mt=0}
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
 if(Math.random()<.3)drop(c.x,c.z);c.st="out";c.path=EXIT();finishBill();save()});

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
function courier(){const m=person("#2e9e5b","#222",pick(SKIN),"#222",true);sc.add(m);cr.push({m,x:W()-2.5,z:8,sp:2.6,mv:false,path:[[W()-2.5,4.8],[3.2,2.3],[W()-2.5,4.8],[W()-2.5,8.5]]})}
function updCr(dt,now){for(const c of cr){const p=c.path[0];if(p){if(mvTo(c,p[0],p[1],dt))c.path.shift()}else{sc.remove(c.m);c.dead=true}c.m.position.set(c.x,animPerson(c.m,c.mv,now,0),c.z)}cr=cr.filter(c=>!c.dead)}
function ordTick(dt){
 trTick(dt);ordT-=dt;if(ordT<=0&&dayT<DAYL-40&&ORD.length<3&&S.op){newOrder();ordT=(40+Math.random()*30)*1.5}
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
 const D=S.D,n=S.shelves.filter(Boolean).length,rent=40000,pw=fixk(2000)*n,wg=S.worker?30000:0,fix=rent+pw+wg,net=D.rev-D.cogs-fix;
 const tg=Math.min(fixk(40000)+(S.day-1)*fixk(10000),fixk(250000)),old=S.debt||0,due=fix+old,pay=Math.min(S.money,due);
 S.money-=pay;S.debt=due-pay;let warn="";
 if(S.debt>0){const fine=Math.round(S.debt*.1/500)*500;S.debt+=fine;rate(1);rate(1);warn="⚠️ Uang kurang! Tunggakan "+rp(S.debt)+" (termasuk denda "+rp(fine)+"). Rating turun."}
 let bonus=0;if(net>=tg){bonus=Math.round(tg*.1/500)*500;S.money+=bonus}
 rollMarket();S.pn=net;
 const h='<div class="sumbox"><div class="sumlbl">Untung bersih</div><div class="sumnum '+(net>=0?"pos":"neg")+'">'+(net<0?"−":"")+rp(Math.abs(net))+'</div>'+
  '<div class="sumtg '+(net>=tg?"ok":"")+'">Target '+rp(tg)+': '+(net>=tg?"✅ Tercapai (bonus "+rp(bonus)+") 🎉":"❌ Belum")+'</div></div>'+(warn?'<p class="warn">'+warn+"</p>":"");
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
 if(tab===0)P.forEach(p=>{const on=S.shelves.includes(p.id),c=cost(p);h+=row(p.n,"Rak "+S.stock[p.id]+"/24 • Kardus "+S.boxes.filter(b=>b.id===p.id).length+" • Grosir "+mkl(p.id),on?bt_("stok",p.id,"+1 kardus · "+rp(c),S.money<c):"<small>Belum ada rak</small>")});
 else if(tab===1){const free=P.filter(p=>!S.shelves.includes(p.id)),used=S.shelves.filter(Boolean).length,full=used>=slotsN();h+=HIRE()+"<small class='note'>Rak terpakai "+used+"/"+slotsN()+"</small>";
  if(full)h+="<p class='note'>Slot penuh. Perluas lahan dulu.</p>";else if(!free.length)h+="<p class='note'>Semua produk sudah punya rak.</p>";else free.forEach(p=>h+=row("Rak "+p.n,"",bt_("rak",p.id,rp(150000),S.money<150000)))}
 else if(tab===6){h+="<small class='note'>Pesanan online: berdiri dekat meja kasir, lalu ketuk harga untuk mengemas. Barang diambil dari stok rak."+(S.worker?" Pegawai pengemas akan mengemas otomatis jika stok cukup.":"")+"</small>";if(!ORD.length)h+="<p class='note'>Belum ada pesanan. Pesanan masuk saat toko buka.</p>";
  ORD.forEach(o=>{const miss=o.items.filter(i=>(S.stock[i.id]||0)<i.q);h+=row("<b>Pesanan #"+o.id+"</b> • <span id='ot-"+o.id+"'>"+Math.ceil(o.t)+"d</span>",o.items.map(i=>PP[i.id].n+" ×"+i.q).join(", ")+(miss.length?"<br><span class='bad'>Stok kurang: "+miss.map(i=>PP[i.id].n).join(", ")+"</span>":""),bt_("pack",o.id,rp(o.rw),miss.length))})}
 else if(tab===7){const a=S.rev;h+="<small class='note'>⭐ "+avgRev().toFixed(1).replace(".",",")+" rata-rata ulasan terakhir ("+a.length+"). Ulasan memengaruhi jumlah pelanggan baru.</small>";if(!a.length)h+="<p class='note'>Belum ada ulasan.</p>";
  a.slice(0,10).forEach(r=>{h+=row("<b class='"+(r.s>=4?"good":r.s>=3?"mid":"bad")+"'>"+"★".repeat(r.s)+"☆".repeat(5-r.s)+"</b>","“"+r.t+"” • Hari "+r.d)})}
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
 else if(a==="mach"){const l=+i,m=MACH[l];if(!m||S.mach!==l-1||S.money<m.c)return;S.money-=m.c;S.mach=l;buildStore();SFX.buy();msg("Upgrade: "+m.n+"!")}
 else if(a==="hire"){if(S.money<300000||S.worker)return;S.money-=300000;S.worker=true;buildStore();SFX.buy();msg("Pegawai pengemas mulai bekerja! Gaji Rp30.000/hari.")}
 else if(a==="hrg"){S.price[i]=cl(pr(i)+(+b.dataset.d),500,maxP(i));refresh(S.shelves.indexOf(i))}
 else if(a==="lahan"){if(S.money<1500000||S.land>=2)return;S.money-=1500000;S.land++;buildStore();msg("Toko diperluas!")}
 vib(8);save();phone()});

/* ---------- panduan & pengaturan ---------- */
const HELP=[
["🎮 Gerak & lihat","Joystick kiri untuk jalan. Geser layar untuk menoleh. Titik di tengah layar adalah pembidik. Tombol ✋ di pojok kanan bawah dipakai untuk mengambil, menaruh, atau membuka apa yang kamu bidik."],
["📱 Belanja stok","Ketuk Ponsel → Stok → beli kardus. Kardusnya muncul di dekat pintu. Harga grosir berubah tiap hari, beli saat 🟢 murah."],
["📦 Isi rak","Dekati kardus → ketuk ✋ untuk mengangkat → bawa ke rak yang cocok → ✋ lagi untuk mengisi (tunggu sampai terisi, jangan menjauh). Satu rak maksimal 24 barang. Kardus kosong jadi sampah."],
["🧾 Mode kasir","Arahkan titik ke meja kasir lalu ketuk ✋. Kamu masuk mode kasir dan pelanggan dilayani satu per satu otomatis: ketuk barang agar loncat ke mesin (harga terhitung di layar), pelanggan memberi uang, ketik kembalian di keypad lalu OK (QRIS tanpa kembalian). Ketuk KELUAR DARI KASIR kalau sudah tidak mau melayani. Waspada: ⏱️ buru-buru, 🛒 borong, 💬 minta diskon."],
["🏷️ Harga & rak","Arahkan titik ke rak: ubah harga dengan − / +, atau ketuk ✋ untuk mengangkat rak (✋ lagi untuk menaruh, ↻ untuk memutar). Harga terlalu mahal membuat toko sepi."],
["📅 Hari & biaya","Tiap hari toko mulai TUTUP: arahkan titik ke pintu lalu ketuk ✋ Buka toko (waktu tetap berjalan). Toko tutup otomatis jam 21:00. Tiap hari ada sewa & listrik. Capai target untung untuk bonus. Pegawai pengemas (Ponsel → Properti) mengemas pesanan online otomatis. Sampah pelanggan: pungut dengan ✋ (maks 5) lalu buang ke tong sampah di dekat meja kasir. Toko kotor menurunkan rating."]];
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
  if(dayT>=DAYL){if(!closedMsg){closedMsg=true;S.op=false;drawSign();msg("🌙 Toko tutup jam 21.00. Layani pelanggan terakhir!")}if(!B){const rest=cs.filter(c=>c.st!=="out").length;if(rest===0||dayT>=DAYL+40)endDay()}}}
 /* langit & jam */
 const hh=8+dayT/SPH,sun=.5+.5*Math.cos(2*Math.PI*(hh-12)/24);
 sc.background.copy(NIGHT).lerp(DAY,sun);winM.color.copy(sc.background);hemi.intensity=.5+.6*sun;dl.intensity=.08+.4*sun;
 sT("hc","📅 Hari "+S.day+" • 🕒 "+String(Math.floor(hh)).padStart(2,"0")+":"+String(Math.floor(hh%1*6)*10).padStart(2,"0")+(sun<.25?" 🌙":" ☀️")+(S.op?" • BUKA":" • TUTUP"));
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
 if(dL){const nr=cs.some(c=>c.z>4.4&&Math.abs(c.x-(W()-2.5))<2)||cr.some(c=>c.z>4.4),op=S.op||nr,a=dL.userData,b=dR.userData;dL.position.x+=((op?a.o:a.c)-dL.position.x)*.12;dR.position.x+=((op?b.o:b.c)-dR.position.x)*.12}
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
if(S.sum){SUMV=true;showSum(S.sum.t,S.sum.h)}else if(!S.help)showHelp(0);
setUI();requestAnimationFrame(loop);setInterval(save,10000);
requestAnimationFrame(()=>requestAnimationFrame(()=>{const b=$("boot");b.classList.add("hide");setTimeout(()=>{b.style.display="none"},500)}));
})();
