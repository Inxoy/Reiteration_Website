/* ===== Reiteration – organ pipe sound engine (needs site.js first) =====
   Used by the playable pipes on the start page and for the short note when a photo is opened. */
/* ---------- PIPES ----------
   One sample per pipe, left (longest, lowest) to right (shortest, highest).
   hz = pitch shown under the organ, ls/le = where the held part of the note starts/ends (seconds, used for the loop),
   gain = level match between the recordings. If a file is missing, a soft synthesized tone at hz stands in.
   Every time a pipe sounds it gets a random place in the stereo field and a random amount and size of reverb. */
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
window.Organ=(()=>{
  let ac,out,rooms;const buf=[],live={},local=location.protocol==="file:";
  /* three synthetic rooms: small chamber, hall, stone church */
  function room(sec,dark){const n=Math.floor(ac.sampleRate*sec),b=ac.createBuffer(2,n,ac.sampleRate);
    for(let c=0;c<2;c++){const d=b.getChannelData(c);let lp=0;
      for(let k=0;k<n;k++){const t=k/n,a=Math.min(1,k/(ac.sampleRate*.012)),f=.85-dark*t*.75;lp+=((Math.random()*2-1)-lp)*f;d[k]=lp*a*Math.pow(1-t,2.2)*Math.exp(-t*3)}
      let e=0;for(let k=0;k<n;k++)e+=d[k]*d[k];e=1/Math.sqrt(e);for(let k=0;k<n;k++)d[k]*=e}
    const cv=ac.createConvolver();cv.normalize=false;cv.buffer=b;const g=ac.createGain();g.gain.value=1;cv.connect(g);g.connect(out);return cv}
  function ctx(){if(!ac){ac=new(window.AudioContext||window.webkitAudioContext)();out=ac.createGain();out.gain.value=.38;
      const c=ac.createDynamicsCompressor();c.threshold.value=-12;c.knee.value=6;c.ratio.value=20;c.attack.value=.003;c.release.value=.25;out.connect(c);c.connect(ac.destination);
      rooms=[room(1.4,.3),room(3.6,.6),room(7.5,.85)]}
    if(ac.state==="suspended")ac.resume();return ac}
  /* buf[i]: undefined = not tried, Promise = loading, AudioBuffer = ok, "el" = use <audio> (file://), null = synth */
  function load(i){if(buf[i]!==undefined)return Promise.resolve(buf[i]);
    if(local)return buf[i]=new Promise(r=>{const a=new Audio();a.preload="auto";a.oncanplaythrough=()=>{a.oncanplaythrough=null;r(buf[i]="el")};a.onerror=()=>r(buf[i]=null);a.src=PIPES[i].file});
    return buf[i]=fetch(PIPES[i].file).then(r=>{if(!r.ok)throw 0;return r.arrayBuffer()}).then(b=>new Promise((ok,no)=>ctx().decodeAudioData(b,ok,no)))
      .then(b=>buf[i]=b).catch(()=>buf[i]=null)}
  const env=(g,t,to,dur)=>{g.gain.cancelScheduledValues(t);g.gain.setValueAtTime(g.gain.value,t);g.gain.linearRampToValueAtTime(to,t+dur)};
  /* random place: pan -0.9…0.9, a random room, wet 5–85 % */
  function place(g){const pan=Math.random()*1.8-.9,wet=.05+Math.pow(Math.random(),1.3)*.8;let p;
    if(ac.createStereoPanner){p=ac.createStereoPanner();p.pan.value=pan}else{p=ac.createPanner();p.panningModel="equalpower";p.setPosition(pan,0,1-Math.abs(pan))}
    const dry=ac.createGain(),send=ac.createGain();dry.gain.value=1-wet*.55;send.gain.value=wet;
    g.connect(p);p.connect(dry);dry.connect(out);p.connect(send);send.connect(rooms[Math.random()*rooms.length|0])}
  /* synthesized flue pipe: a few soft harmonics plus a little wind */
  function synth(i,g){const t=ac.currentTime,o=ac.createOscillator(),w=ac.createPeriodicWave(new Float32Array([0,0,0,0,0,0]),new Float32Array([0,1,.42,.2,.09,.05]));
    o.setPeriodicWave(w);o.frequency.value=PIPES[i].hz;const lp=ac.createBiquadFilter();lp.frequency.value=PIPES[i].hz*5;
    const n=ac.createBufferSource(),nb=ac.createBuffer(1,ac.sampleRate,ac.sampleRate),d=nb.getChannelData(0);for(let k=0;k<d.length;k++)d[k]=Math.random()*2-1;
    n.buffer=nb;n.loop=true;const bp=ac.createBiquadFilter();bp.type="bandpass";bp.frequency.value=PIPES[i].hz*2;bp.Q.value=2;const ng=ac.createGain();ng.gain.value=.05;
    o.connect(lp);lp.connect(g);n.connect(bp);bp.connect(ng);ng.connect(g);o.start(t);n.start(t);return[o,n]}
  /* sample loop: plays the attack once, then repeats the held part with short crossfades so there is no click */
  function looper(i,b,g){const d=b.duration,P=PIPES[i],ls=Math.min(P.ls??.5,d*.4),le=Math.min(P.le??d-.35,d),xf=Math.min(.3,(le-ls)/3),srcs=[];
    let T=ac.currentTime;const seg=(off,len,fadeIn)=>{const s=ac.createBufferSource(),sg=ac.createGain();s.buffer=b;s.connect(sg);sg.connect(g);
      sg.gain.setValueAtTime(fadeIn?0:1,T);if(fadeIn)sg.gain.linearRampToValueAtTime(1,T+xf);
      sg.gain.setValueAtTime(1,T+len-xf);sg.gain.linearRampToValueAtTime(0,T+len);s.start(T,off,len);srcs.push(s);
      s.onended=()=>srcs.splice(srcs.indexOf(s),1);T+=len-xf};
    seg(0,le,false);const iv=setInterval(()=>{while(T<ac.currentTime+1.2)seg(ls,le-ls,true)},250);
    return{stop(){clearInterval(iv);srcs.slice().forEach(s=>{try{s.stop(ac.currentTime+.6)}catch(e){}})}}}
  /* opened from the folder (file://): plain audio elements, kept quiet so several pipes together do not clip */
  function elVoice(i,level){const top=Math.min(1,level*.55*(PIPES[i].gain||1)),a=new Audio(PIPES[i].file);a.loop=true;a.volume=0;a.play().catch(()=>{});let v=0;const up=setInterval(()=>{v=Math.min(top,v+.02);a.volume=v;if(v>=top)clearInterval(up)},30);
    return{stop(){clearInterval(up);const dn=setInterval(()=>{v=Math.max(0,v-.02);a.volume=v;if(!v){clearInterval(dn);a.pause()}},30)}}}
  async function voice(i,level){ctx();const b=await load(i);
    if(b==="el")return elVoice(i,level);
    const g=ac.createGain(),to=level*(b?PIPES[i].gain||1:1);g.gain.value=0;place(g);env(g,ac.currentTime,to,.08);
    let h;if(b){h=looper(i,b,g)}else{const n=synth(i,g);h={stop(){n.forEach(x=>x.stop(ac.currentTime+.6))}}}
    return{stop(){if(ac)env(g,ac.currentTime,0,.5);h.stop()}}}
  return{n:PIPES.length,
    async toggle(i){if(live[i]){const v=live[i];live[i]=null;(await v).stop();return false}
      live[i]=voice(i,.3);return true},
    async once(i){const v=await voice(i,.22);setTimeout(()=>v.stop(),2200)},
    preload(){PIPES.forEach((_,i)=>load(i))}}})();
const polys=[...document.querySelectorAll(".org polygon")],notes=$("notes");
if(polys.length){
const showNotes=()=>{notes.textContent=polys.map((p,i)=>p.classList.contains("on")?PIPES[i].note:"").filter(Boolean).join("  ·  ")};
polys.forEach((p,i)=>{p.setAttribute("tabindex","0");p.setAttribute("role","button");p.setAttribute("aria-label","pipe "+(i+1)+", "+PIPES[i].note);p.setAttribute("aria-pressed","false");
  const hit=async()=>{const on=!p.classList.contains("on");p.classList.toggle("on",on);p.setAttribute("aria-pressed",on);showNotes();await Organ.toggle(i)};
  p.addEventListener("click",hit);p.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();hit()}})});
}
if(polys.length)addEventListener("pointerdown",()=>Organ.preload(),{once:true});
