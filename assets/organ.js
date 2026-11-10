/* ===== Reiteration – organ sound engine (needs site.js first) =====
   1. PIPES   the eleven playable pipes on the start page
   2. RANK    21 Rysum pipes, E to d′ (used for the photo scores and for singing along)
   3. engine  binaural space (headphones), wind, rooms
   4. wind    the little "wind" box at the bottom left: scroll / voice / steady
   5. photo scores: every opened photo is read like a barrel-organ roll
   6. space   the top view on the start page where pipes are dragged around your head */

/* ---------- 1. PIPES (start page) ----------
   left (longest, lowest) to right (shortest, highest). hz = pitch shown under the organ,
   ls/le = where the held part of the note starts/ends (seconds, used for the loop), gain = level match. */
const PIPES=[
  {file:"audio/pipes/pipe-01.wav",hz:198.7,ls:0.45,le:4.25,gain:0.63},
  {file:"audio/pipes/pipe-02.wav",hz:222.3,ls:0.35,le:4.05,gain:0.89},
  {file:"audio/pipes/pipe-03.wav",hz:248.6,ls:0.35,le:4.9, gain:1.79},
  {file:"audio/pipes/pipe-04.wav",hz:266.9,ls:0.5, le:4.25,gain:1.16},
  {file:"audio/pipes/pipe-05.wav",hz:318.7,ls:0.4, le:4.15,gain:0.62},
  {file:"audio/pipes/pipe-06.wav",hz:355.9,ls:0.35,le:4.55,gain:0.6},
  {file:"audio/pipes/pipe-07.wav",hz:398.0,ls:0.35,le:3.75,gain:0.6},
  {file:"audio/pipes/pipe-08.wav",hz:444.7,ls:0.5, le:3.65,gain:0.67},
  {file:"audio/pipes/pipe-09.wav",hz:475.7,ls:0.35,le:4.2, gain:0.73},
  {file:"audio/pipes/pipe-10.wav",hz:498.0,ls:0.35,le:3.85,gain:0.76},
  {file:"audio/pipes/pipe-11.wav",hz:636.9,ls:0.35,le:4.35,gain:1.15}];
PIPES.forEach(p=>{p.note=Math.round(p.hz)+" Hz";p.file=ROOT+p.file});

/* ---------- 2. RANK (Rysum, meantone, measured pitches) ----------
   f = file name in audio/pipes, n = note name, s = measured level of the held part (sets gain automatically).
   F♯ and G♯ in the bass are missing on purpose: short octave. */
const RANK=[
  ["040_E","E",82.99,.55,2.70,.1264],["041_F","F",88.67,.57,2.62,.0820],["043_G","G",99.29,.61,2.84,.1525],
  ["045_A","A",111.05,.82,3.02,.1039],["046_Bb","B♭",118.93,.57,2.68,.1514],["047_B","B",123.96,.47,2.41,.1367],
  ["048_c","c",132.84,.40,2.80,.0915],["049_c#","c♯",138.89,.55,2.62,.2293],["050_d","d",148.59,.34,2.63,.0483],
  ["051_eb","e♭",158.89,.51,2.55,.1447],["052_e","e",166.17,.59,2.71,.1159],["053_f","f",177.98,.46,2.79,.0324],
  ["054_f#","f♯",185.30,.45,3.34,.1208],["055_g","g",198.62,.30,2.90,.0650],["056_g#","g♯",207.64,.42,2.83,.1035],
  ["057_a","a",221.88,.60,2.52,.1186],["058_bb","b♭",237.67,.44,2.65,.0867],["059_b","b",248.02,.34,2.51,.1275],
  ["060_cp","c′",265.50,.35,2.91,.0692],["061_c#p","c♯′",277.31,.37,2.68,.1136],["062_dp","d′",296.77,.32,2.69,.0672]
].map(([f,n,hz,ls,le,s])=>({file:ROOT+"audio/pipes/"+encodeURIComponent(f)+".wav",note:n,hz,ls,le,gain:Math.min(7,.3/s),midi:69+12*Math.log2(hz/440)}));

/* ---------- 3. engine ---------- */
window.Organ=(()=>{
  let ac=null,out,wG,wLP,rooms;
  const cache=new Map(),local=location.protocol==="file:",srcs=new Set(),oscs=new Set(),els=new Set(),tickers=new Set();
  /* wind state: W = bellows 0…1, det = pitch offset in cents, td = tremble depth */
  const wind={W:1,mode:"scroll",det:0,td:0,j1:0,j2:0,lvl:1};

  /* three synthetic rooms: small chamber, hall, stone church */
  function room(sec,dark){const n=Math.floor(ac.sampleRate*sec),b=ac.createBuffer(2,n,ac.sampleRate);
    for(let c=0;c<2;c++){const d=b.getChannelData(c);let lp=0;
      for(let k=0;k<n;k++){const t=k/n,a=Math.min(1,k/(ac.sampleRate*.012)),f=.85-dark*t*.75;lp+=((Math.random()*2-1)-lp)*f;d[k]=lp*a*Math.pow(1-t,2.2)*Math.exp(-t*3)}
      let e=0;for(let k=0;k<n;k++)e+=d[k]*d[k];e=1/Math.sqrt(e);for(let k=0;k<n;k++)d[k]*=e}
    const cv=ac.createConvolver();cv.normalize=false;cv.buffer=b;cv.connect(out);return cv}
  function ctx(){if(!ac){ac=new(window.AudioContext||window.webkitAudioContext)();
      out=ac.createGain();out.gain.value=.38;wG=ac.createGain();wLP=ac.createBiquadFilter();wLP.type="lowpass";wLP.frequency.value=14000;wLP.Q.value=.4;
      const c=ac.createDynamicsCompressor();c.threshold.value=-12;c.knee.value=6;c.ratio.value=20;c.attack.value=.003;c.release.value=.25;
      out.connect(wG);wG.connect(wLP);wLP.connect(c);c.connect(ac.destination);
      rooms=[room(1.4,.3),room(3.6,.6),room(7.5,.85)]}
    if(ac.state==="suspended")ac.resume();return ac}

  /* cache: Promise → AudioBuffer, "el" (opened from the folder, file://) or null (missing → synth) */
  function load(S){if(cache.has(S.file))return cache.get(S.file);let p;
    if(local)p=new Promise(r=>{const a=new Audio();a.preload="auto";a.oncanplaythrough=()=>{a.oncanplaythrough=null;r("el")};a.onerror=()=>r(null);a.src=S.file});
    else p=fetch(S.file).then(r=>{if(!r.ok)throw 0;return r.arrayBuffer()}).then(b=>new Promise((ok,no)=>ctx().decodeAudioData(b,ok,no))).catch(()=>null);
    cache.set(S.file,p);return p}

  const env=(g,t,to,dur)=>{g.gain.cancelScheduledValues(t);g.gain.setValueAtTime(g.gain.value,t);g.gain.linearRampToValueAtTime(to,t+dur)};
  const rateOf=k=>Math.pow(2,(wind.det+wind.td*(k*wind.j1+(1-Math.abs(k))*wind.j2))/1200);

  /* binaural position: x = right, y = up, z = behind (front is −z) */
  function panner(){const p=ac.createPanner();p.panningModel="HRTF";p.distanceModel="inverse";p.refDistance=1;p.maxDistance=60;p.rolloffFactor=.85;return p}
  function setPos(p,[x,y,z],s=.06){if(p.positionX){const t=ac.currentTime;p.positionX.setTargetAtTime(x,t,s);p.positionY.setTargetAtTime(y,t,s);p.positionZ.setTargetAtTime(z,t,s)}else p.setPosition(x,y,z)}

  /* synthesized flue pipe, stands in when a sample is missing */
  function synth(S,g,k){const t=ac.currentTime,o=ac.createOscillator(),w=ac.createPeriodicWave(new Float32Array(6),new Float32Array([0,1,.42,.2,.09,.05]));
    o.setPeriodicWave(w);o.frequency.value=S.hz;o._k=k;oscs.add(o);const lp=ac.createBiquadFilter();lp.frequency.value=S.hz*5;
    const n=ac.createBufferSource(),nb=ac.createBuffer(1,ac.sampleRate,ac.sampleRate),d=nb.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
    n.buffer=nb;n.loop=true;const bp=ac.createBiquadFilter();bp.type="bandpass";bp.frequency.value=S.hz*2;bp.Q.value=2;const ng=ac.createGain();ng.gain.value=.05;
    o.connect(lp);lp.connect(g);n.connect(bp);bp.connect(ng);ng.connect(g);o.start(t);n.start(t);
    return{stop(f){const e=ac.currentTime+f+.1;o.stop(e);n.stop(e);o.onended=()=>oscs.delete(o)}}}

  /* sample loop: attack once, then the held part again and again with short crossfades.
     Every piece gets the current wind pitch, and the wind keeps bending it while it plays. */
  function looper(S,b,g,k){const d=b.duration,ls=Math.min(S.ls??.5,d*.4),le=Math.min(S.le??d-.35,d),xf=Math.min(.3,(le-ls)/3),mine=[];
    let T=ac.currentTime;const seg=(off,len,fadeIn)=>{const s=ac.createBufferSource(),sg=ac.createGain();s.buffer=b;s._k=k;s.playbackRate.value=rateOf(k);s.connect(sg);sg.connect(g);
      sg.gain.setValueAtTime(fadeIn?0:1,T);if(fadeIn)sg.gain.linearRampToValueAtTime(1,T+xf);
      sg.gain.setValueAtTime(1,T+len-xf);sg.gain.linearRampToValueAtTime(0,T+len);s.start(T,off,len);srcs.add(s);mine.push(s);
      s.onended=()=>{srcs.delete(s);mine.splice(mine.indexOf(s),1)};T+=len-xf};
    seg(0,le,false);const iv=setInterval(()=>{while(T<ac.currentTime+1.2)seg(ls,le-ls,true)},250);
    return{stop(f){clearInterval(iv);mine.slice().forEach(s=>{try{s.stop(ac.currentTime+f+.1)}catch(e){}})}}}

  /* opened from the folder (file://): plain audio elements – no space, wind only as volume and pitch */
  function elVoice(S,level){const top=Math.min(1,level*.55*Math.min(4,S.gain||1)),a=new Audio(S.file);a.loop=true;a.volume=0;a.preservesPitch=false;a._top=0;
    a.play().catch(()=>{});els.add(a);const up=setInterval(()=>{a._top=Math.min(top,a._top+.02);if(a._top>=top)clearInterval(up)},30);
    return{stop(){clearInterval(up);const dn=setInterval(()=>{a._top=Math.max(0,a._top-.02);if(!a._top){clearInterval(dn);a.pause();els.delete(a)}},30)},at(){}}}

  /* one sounding pipe: sample → level → fade → binaural panner → master (+ a random room) */
  async function voice(S,o={}){ctx();const b=await load(S);
    if(b==="el")return elVoice(S,o.level??.3);
    const k=Math.random()*2-1,lv=ac.createGain(),f=ac.createGain(),p=panner();lv.gain.value=(o.level??.3)*(b?S.gain||1:.6);f.gain.value=0;
    lv.connect(f);f.connect(p);
    const wet=o.wet??(.05+Math.pow(Math.random(),1.3)*.75),dry=ac.createGain(),send=ac.createGain();dry.gain.value=1-wet*.5;send.gain.value=wet*.8;
    p.connect(dry);dry.connect(out);f.connect(send);send.connect(rooms[o.room??(Math.random()*rooms.length|0)]);
    setPos(p,o.pos||[0,0,-2],.001);env(f,ac.currentTime,1,o.attack??.08);
    const h=b?looper(S,b,lv,k):synth(S,lv,k);let gone=false;
    return{lv,b,stop(t=.5){if(gone)return;gone=true;env(f,ac.currentTime,0,t);h.stop(t)},at(pos,s){setPos(p,pos,s)}}}

  /* ---------- 4. wind ---------- */
  let lastY=scrollY,pump=0,lastT=performance.now(),mic=null;
  addEventListener("wheel",e=>{pump=Math.max(pump,Math.abs(e.deltaY)*(e.deltaMode===1?16:e.deltaMode===2?innerHeight:1))},{passive:true});
  let ty=null;addEventListener("touchmove",e=>{const y=e.touches[0].clientY;if(ty!==null)pump=Math.max(pump,Math.abs(y-ty));ty=y},{passive:true});
  addEventListener("touchend",()=>{ty=null},{passive:true});
  const FLOOR=.55;
  function tick(){const now=performance.now(),dt=Math.min(.1,(now-lastT)/1000);lastT=now;
    let target=1,up=.4,down=1.5;
    if(wind.mode==="scroll"){const dy=Math.abs(scrollY-lastY);const v=Math.max(dy,pump)/Math.max(dt,.016);pump=0;
      target=FLOOR+(1-FLOOR)*Math.pow(Math.min(1,v/1800),.7);up=.25;down=3}
    else if(wind.mode==="voice"&&mic){const m=listen();target=m.wind;up=.07;down=.5}
    lastY=scrollY;
    wind.W+=(target-wind.W)*(1-Math.exp(-dt/(target>wind.W?up:down)));
    const W=wind.W,lack=1-W;
    /* random walks for the trembling of a weak wind */
    wind.j1=Math.max(-1,Math.min(1,wind.j1*.96+(Math.random()-.5)*.5));wind.j2=Math.max(-1,Math.min(1,wind.j2*.9+(Math.random()-.5)*.7));
    wind.det=-62*Math.pow(lack,1.6)+(W>.93?(W-.93)*40:0);wind.td=3+16*lack*lack;
    wind.lvl=Math.pow(W,.8)*(1+(Math.random()-.5)*.35*lack*lack);
    if(ac){const t=ac.currentTime;wG.gain.setTargetAtTime(wind.lvl,t,.04);wLP.frequency.setTargetAtTime(600+13000*Math.pow(W,1.7),t,.05);
      for(const s of srcs)s.playbackRate.setTargetAtTime(rateOf(s._k),t,.05);
      for(const o of oscs)o.detune.setTargetAtTime(wind.det+wind.td*o._k*wind.j1,t,.05)}
    for(const a of els){a.volume=Math.max(0,Math.min(1,a._top*wind.lvl));try{a.playbackRate=rateOf(0)}catch(e){}}
    tickers.forEach(f=>f(dt));gauge()}
  setInterval(tick,33);

  /* the wind box */
  const box=document.createElement("div");box.id="wind";box.setAttribute("role","group");box.setAttribute("aria-label","organ wind");
  box.innerHTML='<span class="wl">wind</span><span class="wg" aria-hidden="true"></span>'+
    ["scroll","voice","steady"].map(m=>`<button type="button" data-m="${m}" aria-pressed="false" title="${{scroll:"scrolling fills the bellows",voice:"blow or sing into the microphone",steady:"full, steady wind"}[m]}">${m}</button>`).join("")+
    '<span class="ws" aria-live="polite"></span>';
  document.body.appendChild(box);const gEl=box.querySelector(".wg"),sEl=box.querySelector(".ws"),btns=[...box.querySelectorAll("button")];
  function gauge(){const n=12,f=wind.W*n;let s="";for(let i=0;i<n;i++){const d=f-i;s+=d>=1?"▓":d>0?(Math.random()<d?"▒":"░"):(Math.random()<.04*(1-wind.W)?G[Math.random()*G.length|0]:"░")}gEl.textContent=s}
  async function setMode(m){if(m==="voice"&&!mic){sEl.textContent="…";
      try{const st=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:false,autoGainControl:false}});
        ctx();const an=ac.createAnalyser();an.fftSize=2048;ac.createMediaStreamSource(st).connect(an);mic={st,an,buf:new Float32Array(2048),hold:null,cand:-1,cn:0,quiet:0,cur:-1};sEl.textContent="blow or sing"}
      catch(e){sEl.textContent="no microphone";m="scroll"}}
    if(m!=="voice"&&mic){mic.st.getTracks().forEach(t=>t.stop());if(mic.hold)mic.hold.then(v=>v.stop(.8));mic=null;sEl.textContent=""}
    wind.mode=m;btns.forEach(b=>b.setAttribute("aria-pressed",b.dataset.m===m));if(m!=="voice")try{localStorage.setItem("wind",m)}catch(e){}}
  btns.forEach(b=>b.onclick=()=>{ctx();setMode(b.dataset.m)});
  let saved=null;try{saved=localStorage.getItem("wind")}catch(e){}setMode(saved==="steady"?"steady":"scroll");

  /* voice: loudness = wind; a steady sung pitch makes the nearest Rysum pipe sound along with you */
  function listen(){const {an,buf}=mic;an.getFloatTimeDomainData(buf);let e=0;for(let i=0;i<buf.length;i++)e+=buf[i]*buf[i];
    const rms=Math.sqrt(e/buf.length),db=20*Math.log10(rms+1e-9),w=Math.max(.04,Math.min(1,(db+52)/34));
    const hz=rms>.012?pitch(buf,ac.sampleRate):0;
    if(hz){let m=69+12*Math.log2(hz/440);while(m>RANK[RANK.length-1].midi+.5)m-=12;while(m<RANK[0].midi-.5)m+=12;
      let bi=0,bd=99;RANK.forEach((r,i)=>{const d=Math.abs(r.midi-m);if(d<bd){bd=d;bi=i}});
      if(bi===mic.cand)mic.cn++;else{mic.cand=bi;mic.cn=0}mic.quiet=0;
      if(mic.cn>=7&&mic.cur!==bi){if(mic.hold)mic.hold.then(v=>v.stop(.7));mic.cur=bi;mic.hold=voice(RANK[bi],{level:.34,pos:[0,.4,-1.3],attack:.35,wet:.4});sEl.textContent="● "+RANK[bi].note}}
    else if(++mic.quiet>12&&mic.cur>=0){mic.hold.then(v=>v.stop(1.2));mic.hold=null;mic.cur=-1;mic.cand=-1;sEl.textContent="blow or sing"}
    return{wind:w}}
  /* normalized autocorrelation, 70–1000 Hz, first strong peak (avoids octave jumps) */
  function pitch(b,sr){const n=b.length,mn=Math.floor(sr/1000),mx=Math.floor(sr/70),L=n-mx,r=new Float32Array(mx+2);let best=0;
    for(let lag=mn;lag<=mx+1;lag++){let s=0,e1=0,e2=0;for(let i=0;i<L;i++){const a=b[i],c=b[i+lag];s+=a*c;e1+=a*a;e2+=c*c}r[lag]=s/Math.sqrt(e1*e2+1e-12);if(r[lag]>best)best=r[lag]}
    if(best<.82)return 0;for(let lag=mn+1;lag<=mx;lag++)if(r[lag]>.9*best&&r[lag]>=r[lag-1]&&r[lag]>=r[lag+1]){const a=r[lag-1],c=r[lag+1],d=a-2*r[lag]+c;return sr/(lag+(d?(a-c)/(2*d):0))}return 0}

  /* ---------- 5. photo scores ----------
     The photo is cut into 21 horizontal bands (top = high, bottom = low) and read from left to right
     like a barrel-organ roll: bright and grainy places open the pipe of their band.
     The sound travels with the reading line from your left ear to your right; high bands sound above you. */
  const DUR=14,TAIL=5,cv=document.createElement("canvas"),cx=cv.getContext("2d",{willReadFrequently:true}),COLS=56;
  function read(img){const R=RANK.length,H=R*4,Wd=COLS*3;cv.width=Wd;cv.height=H;let d;
    try{cx.drawImage(img,0,0,Wd,H);d=cx.getImageData(0,0,Wd,H).data}catch(e){return null}
    const L=[];let sum=0,sq=0;
    for(let r=0;r<R;r++){L.push(new Float32Array(COLS));for(let c=0;c<COLS;c++){let s=0,v=0;
      for(let y=0;y<4;y++)for(let x=0;x<3;x++){const i=((r*4+y)*Wd+c*3+x)*4,l=(.3*d[i]+.59*d[i+1]+.11*d[i+2])/255;s+=l;v+=l*l}
      s/=12;L[r][c]=s+Math.sqrt(Math.max(0,v/12-s*s))*1.5;sum+=s;sq+=s*s}}
    const n=R*COLS,mean=sum/n,sd=Math.sqrt(Math.max(1e-6,sq/n-mean*mean));
    const all=L.flatMap(a=>[...a]).sort((a,b)=>a-b),hi=all[Math.floor(all.length*.93)];
    return{A:L.map(row=>row.map(v=>Math.max(0,Math.min(1.2,(v-mean)/Math.max(.02,hi-mean))))),sd}}
  function fake(src){let h=2166136261;for(const ch of src)h=Math.imul(h^ch.charCodeAt(0),16777619);const rnd=()=>{h=Math.imul(h^h>>>15,2246822507);h=Math.imul(h^h>>>13,3266489909);return((h^=h>>>16)>>>0)/4294967296};
    const bl=[...Array(5)].map(()=>({r:rnd()*RANK.length,c:rnd()*COLS,s:2+rnd()*5,w:4+rnd()*14}));
    return{A:RANK.map((_,r)=>Float32Array.from({length:COLS},(_,c)=>Math.min(1,bl.reduce((a,b)=>a+Math.exp(-((r-b.r)**2)/(2*b.s)-((c-b.c)**2)/(2*b.w*b.w)),0)))),sd:.2}}
  function choose({A,sd}){const R=A.length,score=A.map(row=>{const s=[...row].sort((a,b)=>b-a);return s.slice(0,Math.ceil(s.length*.25)).reduce((a,b)=>a+b,0)});
    const K=Math.max(3,Math.min(6,Math.round(2+sd*14))),order=[...score.keys()].sort((a,b)=>score[b]-score[a]),pick=[];
    for(const r of order){if(pick.length>=K)break;if(pick.every(p=>Math.abs(p-r)>=2))pick.push(r)}
    return pick.map(r=>({band:r,pipe:R-1-r,row:A[r]}))}
  const smooth=a=>Float32Array.from(a,(_,i)=>{let s=0,n=0;for(let k=-3;k<=3;k++){const j=i+k;if(j>=0&&j<a.length){const w=4-Math.abs(k);s+=a[j]*w;n+=w}}return s/n});

  let lb=null,line=null,lbs=null;
  function ui(){if(lb)return;lb=$("lb");if(!lb)return;line=document.createElement("div");line.id="lbscan";line.setAttribute("aria-hidden","true");
    lbs=document.createElement("span");lbs.id="lbs";lb.append(line,lbs)}
  function score(img){ctx();ui();const read1=read(img)||fake(img.currentSrc||img.src),picks=choose(read1),t0=ac.currentTime+.08,base=.42/Math.sqrt(picks.length);
    const vs=[];let dead=false,raf=0;
    if(lbs)lbs.textContent=picks.slice().sort((a,b)=>a.pipe-b.pipe).map(p=>RANK[p.pipe].note).join("   ");
    picks.forEach((p,j)=>{const S=RANK[p.pipe],row=smooth(p.row),curve=new Float32Array(COLS+1);curve[0]=0;
      for(let c=0;c<COLS;c++)curve[c+1]=base*(.16+.84*Math.pow(Math.min(1,row[c]),1.15));
      const elev=-.7+1.9*(p.pipe/(RANK.length-1)),lag=.75+Math.random()*.4;
      vs.push(voice(S,{level:local?.16:0,attack:.05,wet:.25+Math.random()*.45}).then(v=>{if(dead){v.stop(.05);return v}
        if(!v.lv){setTimeout(()=>v.stop(),DUR*1000);return v}
        const g=v.lv.gain,gg=S.gain||1,now=ac.currentTime,el=now-t0,cs=curve.map(x=>x*gg);
        if(el<DUR-.3){const i0=Math.max(0,Math.floor(el/DUR*COLS));const part=cs.slice(i0);if(i0>0)part[0]=0;g.setValueCurveAtTime(part,now,t0+DUR-now)}
        else g.setValueAtTime(cs[COLS],now);
        g.setValueAtTime(cs[COLS],Math.max(now,t0+DUR)+.01);g.linearRampToValueAtTime(0,t0+DUR+TAIL);
        v._p=(pr)=>{const az=(-80+160*Math.min(1,pr*lag))*Math.PI/180,dd=2.2;v.at([Math.sin(az)*dd,elev,-Math.cos(az)*dd],.08)};v._p(0);return v}))});
    const tk=()=>{const pr=Math.min(1,(ac.currentTime-t0)/DUR);vs.forEach(p=>p.then(v=>v&&v._p&&v._p(pr)))};tickers.add(tk);
    const draw=()=>{if(dead||!line)return;const pr=(ac.currentTime-t0)/DUR,r=img.getBoundingClientRect();
      if(pr>=0&&pr<=1&&r.width){line.style.cssText=`left:${r.left+r.width*pr}px;top:${r.top}px;height:${r.height}px;opacity:${Math.min(1,(1-pr)*8)}`}else line.style.opacity=0;
      raf=requestAnimationFrame(draw)};draw();
    const end=setTimeout(()=>stop(.2),(DUR+TAIL+.5)*1000);
    function stop(t){if(dead)return;dead=true;clearTimeout(end);tickers.delete(tk);cancelAnimationFrame(raf);if(line)line.style.opacity=0;vs.forEach(p=>p.then(v=>v&&v.stop(t)))}
    return{stop}}
  let cur=null,seq=0,wait=0;

  /* ---------- 6. start-page pipes in space ---------- */
  const live={};
  return{n:PIPES.length,wind,tickers,
    async toggle(i,pos){if(live[i]){const v=live[i];live[i]=null;(await v).stop(.5);return false}live[i]=voice(PIPES[i],{level:.3,pos});return true},
    move(i,pos){if(live[i])live[i].then(v=>v&&v.at(pos,.05))},
    /* called by the photo viewer for every photo shown (open, arrows, swipe) */
    photo(img){const my=++seq;clearTimeout(wait);if(cur){cur.stop(1.4);cur=null}if(lbs)lbs.textContent="";
      wait=setTimeout(()=>{const go=()=>{if(my===seq&&!$("lb").hidden)cur=score(img)};
        if(img.complete&&img.naturalWidth)go();else img.addEventListener("load",go,{once:true})},140)},
    hush(){seq++;clearTimeout(wait);if(cur){cur.stop(2.5);cur=null}},
    preload(){PIPES.forEach(load)}}})();

/* start page: the eleven pipes, and the top view where they are moved around the listener */
(()=>{const polys=[...document.querySelectorAll(".org polygon")],notes=$("notes");if(!polys.length)return;
  const svg=$("spc"),dotsG=$("dots"),N=PIPES.length,KEY="pipe-space";
  /* a = angle (0 = in front, positive = to the right), r = 0…1 of the ring (0.5 m … 6 m) */
  const arc=()=>PIPES.map((_,i)=>({a:(-70+140*i/(N-1))*Math.PI/180,r:.5}));
  let SP=null;try{SP=JSON.parse(localStorage.getItem(KEY))}catch(e){}if(!Array.isArray(SP)||SP.length!==N)SP=arc();
  const pos=i=>{const d=.5+5.5*SP[i].r;return[Math.sin(SP[i].a)*d,0,-Math.cos(SP[i].a)*d]};
  const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(SP))}catch(e){}};
  const showNotes=()=>{notes.textContent=polys.map((p,i)=>p.classList.contains("on")?PIPES[i].note:"").filter(Boolean).join("  ·  ")};
  const dots=[];
  async function hit(i){const p=polys[i],on=!p.classList.contains("on");p.classList.toggle("on",on);p.setAttribute("aria-pressed",on);if(dots[i])dots[i].classList.toggle("on",on);showNotes();await Organ.toggle(i,pos(i))}
  polys.forEach((p,i)=>{p.setAttribute("tabindex","0");p.setAttribute("role","button");p.setAttribute("aria-label","pipe "+(i+1)+", "+PIPES[i].note);p.setAttribute("aria-pressed","false");
    p.addEventListener("click",()=>hit(i));p.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();hit(i)}})});
  addEventListener("pointerdown",()=>Organ.preload(),{once:true});
  if(!svg)return;
  const NS="http://www.w3.org/2000/svg",RAD=100;
  function draw(i){const x=Math.sin(SP[i].a)*SP[i].r*RAD,y=-Math.cos(SP[i].a)*SP[i].r*RAD;dots[i].setAttribute("transform",`translate(${x.toFixed(1)} ${y.toFixed(1)})`)}
  PIPES.forEach((P,i)=>{const g=document.createElementNS(NS,"g");g.setAttribute("class","dot");g.setAttribute("tabindex","0");g.setAttribute("role","button");
    g.setAttribute("aria-label",`pipe ${i+1}, ${P.note}. Click to sound, drag or use the arrow keys to move it`);
    g.innerHTML=`<circle class="halo" r="7.5"/><circle r="${5.5-i*.25}"/><text y="-10">${i+1}</text>`;dotsG.appendChild(g);dots.push(g);draw(i);
    let drag=null;
    g.addEventListener("pointerdown",e=>{e.preventDefault();g.setPointerCapture(e.pointerId);drag={x:e.clientX,y:e.clientY,moved:false}});
    g.addEventListener("pointermove",e=>{if(!drag)return;if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>4)drag.moved=true;if(!drag.moved)return;
      const r=svg.getBoundingClientRect(),sx=(e.clientX-r.left)/r.width*220-110,sy=(e.clientY-r.top)/r.height*220-110;
      SP[i].a=Math.atan2(sx,-sy);SP[i].r=Math.max(.06,Math.min(1,Math.hypot(sx,sy)/RAD));draw(i);Organ.move(i,pos(i))});
    const up=()=>{if(!drag)return;if(!drag.moved)hit(i);else save();drag=null};
    g.addEventListener("pointerup",up);g.addEventListener("pointercancel",()=>{drag=null});
    g.addEventListener("keydown",e=>{const k=e.key;if(k==="Enter"||k===" "){e.preventDefault();hit(i);return}
      const st={ArrowLeft:[-.12,0],ArrowRight:[.12,0],ArrowUp:[0,-.06],ArrowDown:[0,.06]}[k];if(!st)return;e.preventDefault();
      SP[i].a+=st[0];SP[i].r=Math.max(.06,Math.min(1,SP[i].r+st[1]));draw(i);Organ.move(i,pos(i));save()})});
  /* orbit: every pipe circles the listener at its own speed and direction */
  const orb=$("orbit"),w=PIPES.map(()=>(.18+Math.random()*.6)*(Math.random()<.5?-1:1));let orbit=false;
  if(orb)orb.onclick=()=>{orbit=!orbit;orb.setAttribute("aria-pressed",orbit);if(!orbit)save()};
  Organ.tickers.add(dt=>{if(!orbit)return;SP.forEach((s,i)=>{s.a+=w[i]*dt;draw(i);Organ.move(i,pos(i))})});
  const set=f=>{SP=f();dots.forEach((_,i)=>{draw(i);Organ.move(i,pos(i))});save()};
  const sc=$("scatter");if(sc)sc.onclick=()=>set(()=>PIPES.map(()=>({a:Math.random()*Math.PI*2,r:.12+Math.random()*.88})));
  const ar=$("arc");if(ar)ar.onclick=()=>set(arc);
})();
