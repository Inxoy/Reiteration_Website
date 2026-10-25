/* ===== Reiteration – shared script for every page =====
   Everything here only runs if the matching element exists on the page. */
const $=id=>document.getElementById(id),R=document.documentElement,G="▓▒░01/\\|·",
  ROOT=R.dataset.root||"",rm=matchMedia("(prefers-reduced-motion: reduce)").matches;

/* opened straight from the folder (file://): links to a folder ("mariia-iii/", "../") would show a file list,
   so point them at the index.html inside. Online nothing changes. */
if(location.protocol==="file:")document.querySelectorAll("a[href]").forEach(a=>{const h=a.getAttribute("href");
  if(!/^[a-z]+:|^#|^\/\//i.test(h)){const [p,hash]=h.split("#");if(p===""||p.endsWith("/"))a.setAttribute("href",(p||"./")+"index.html"+(hash!==undefined?"#"+hash:""))}});

/* e-mail addresses are assembled here so spam bots can't read them from the page */
document.querySelectorAll(".m").forEach(a=>{const e=a.dataset.u+"@"+a.dataset.d;a.href="mailto:"+e;if(!a.textContent.trim())a.textContent=e});

/* gallery layout + parallax + "lamp" brightness, and the background that gains contrast while scrolling */
(()=>{const bg=$("bg"),figs=[...document.querySelectorAll(".ph:not([data-fixed])")],col=R.dataset.bg==="color";let last=-1,tick=false;
  function mul(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
  const rd=mul(11),pick=a=>a[rd()*a.length|0];let lw=-9;
  figs.forEach((f,i)=>{const im=f.firstElementChild,land=+im.getAttribute("width")>im.getAttribute("height")*1.15;
    if(land&&i-lw>=5){f.classList.add("wide");lw=i}
    else{f.style.setProperty("--w",(land?pick([38,44,52,58]):pick([19,23,27,31]))+"%");
      if(rd()<.55)f.style.setProperty("--ml",pick([2,6,10,14])+"%");
      f.style.setProperty("--mt",pick([0,4,9,14])+"vh")}
    f._s=rm?0:rd()*.14-.04;f._y=0});
  const b0=parseFloat(R.dataset.bright||(col?.3:.4));
  function frame(){tick=false;const vh=innerHeight,m=R.scrollHeight-vh,d=Math.min(1,Math.max(0,scrollY/Math.max(1,m)));
    if(bg&&Math.abs(d-last)>=.004){last=d;R.style.setProperty("--d",d);
      bg.style.filter=(col?"":"grayscale(1) ")+`brightness(${b0+d*.1}) contrast(${1+d*.9})`}
    for(const f of figs){const r=f.getBoundingClientRect(),c=r.top+r.height/2-f._y,off=c-vh/2;
      if(Math.abs(off)>vh*1.6)continue;
      const y=-off*f._s;f._y=y;f.style.transform=`translateY(${y.toFixed(1)}px)`;
      const dist=Math.min(1,Math.abs(c+y-vh/2)/(vh*.7));f.style.setProperty("--b",(.3+.7*Math.pow(1-dist,1.3)).toFixed(2))}}
  addEventListener("scroll",()=>{if(!tick){tick=true;requestAnimationFrame(frame)}},{passive:true});
  addEventListener("resize",frame);addEventListener("load",frame);frame()})();

/* scramble on hover (elements with data-r) */
document.querySelectorAll("[data-r]").forEach(el=>{const o=el.textContent;let t;el.setAttribute("aria-label",o);el.textContent="";
  const sp=[...o].map(c=>{const s=document.createElement("span");s.textContent=c;s.setAttribute("aria-hidden","true");el.appendChild(s);return s});
  const trig=el.closest("a")||el;
  trig.addEventListener("mouseenter",()=>{let i=0;clearInterval(t);t=setInterval(()=>{
    sp.forEach(s=>{if(s.textContent!==" "&&Math.random()<=.12+i*.04){s.dataset.g=G[Math.random()*G.length|0];s.classList.add("x")}else s.classList.remove("x")});
    if(++i>14){clearInterval(t);sp.forEach(s=>s.classList.remove("x"))}},60)})});

/* photo viewer: click = open (and a pipe sounds), click again = zoom, arrows/swipe = next, esc = close.
   Each gallery is browsed on its own; data-cap is shown under the photo. */
(()=>{const lb=$("lb");if(!lb)return;const all=[...document.querySelectorAll(".ph img")],li=$("lbi");let ph=all,ci=0;
  function show(i){ci=(i+ph.length)%ph.length;li.src=ph[ci].src;lb.classList.remove("z");li.style.transformOrigin="50% 50%";
    $("lbt").textContent=ph[ci].dataset.cap||"";$("lbc").textContent=(ci+1)+" / "+ph.length;lb.hidden=false;document.body.style.overflow="hidden"}
  function shut(){lb.hidden=true;document.body.style.overflow=""}
  all.forEach((im,i)=>im.onclick=()=>{ph=[...im.closest(".gal").querySelectorAll(".ph img")];show(ph.indexOf(im));if(window.Organ)Organ.once(i%Organ.n)});
  $("lbx").onclick=shut;$("lbp").onclick=()=>show(ci-1);$("lbn").onclick=()=>show(ci+1);
  lb.onclick=e=>{if(e.target===lb)shut()};li.onclick=()=>lb.classList.toggle("z");
  const pan=(x,y)=>{if(lb.classList.contains("z"))li.style.transformOrigin=`${x/innerWidth*100}% ${y/innerHeight*100}%`};
  lb.onmousemove=e=>pan(e.clientX,e.clientY);
  let sx=0;lb.addEventListener("touchstart",e=>{sx=e.touches[0].clientX},{passive:true});
  lb.addEventListener("touchmove",e=>pan(e.touches[0].clientX,e.touches[0].clientY),{passive:true});
  lb.addEventListener("touchend",e=>{if(lb.classList.contains("z"))return;const dx=e.changedTouches[0].clientX-sx;if(Math.abs(dx)>60)show(ci+(dx<0?1:-1))});
  addEventListener("keydown",e=>{if(lb.hidden)return;if(e.key==="Escape")shut();if(e.key==="ArrowLeft")show(ci-1);if(e.key==="ArrowRight")show(ci+1)})})();

/* bandcamp players: <button data-bc="EmbeddedPlayer URL" data-big> loads the player only when clicked */
document.querySelectorAll("button[data-bc]").forEach(b=>b.onclick=()=>{const f=document.createElement("iframe");f.src=b.dataset.bc;f.title=b.dataset.title||"Bandcamp player";f.allow="autoplay";if(b.hasAttribute("data-big"))f.className="big";b.replaceWith(f)});

/* quick links: smooth scroll for links to a section on the same page */
document.querySelectorAll('#nav a[href^="#"]').forEach(a=>a.onclick=e=>{const t=document.querySelector(a.getAttribute("href"));if(!t)return;e.preventDefault();t.scrollIntoView({behavior:rm?"auto":"smooth",block:"start"})});

/* listen button (plays the audio element #au) */
(()=>{const au=$("au"),sb=$("snd");if(!au||!sb)return;
  sb.onclick=()=>{if(au.paused){au.play().catch(()=>{});sb.firstChild.textContent="● listening ";sb.setAttribute("aria-pressed","true")}else{au.pause();sb.firstChild.textContent="◌ listen ";sb.setAttribute("aria-pressed","false")}}})();

/* easter egg: the eye does not like being clicked */
(()=>{const e=$("eye"),m=$("eyemsg");if(!e||!m)return;let t;
  e.addEventListener("click",ev=>{ev.stopPropagation();ev.preventDefault();m.hidden=false;m.style.animation="none";void m.offsetWidth;m.style.animation="";
  clearTimeout(t);t=setTimeout(()=>m.hidden=true,2600)});addEventListener("click",()=>{m.hidden=true})})();

/* grain trail: the cursor leaves a fading smear of grain (colours via data-trail="r,g,b" on <html>) */
(()=>{const cv=$("trail");if(!cv)return;const c=cv.getContext("2d"),light=R.dataset.trail||"232,228,220";let pts=[],dpr=1,run=false,lx=null,ly=null;
  const size=()=>{dpr=Math.min(2,devicePixelRatio||1);cv.width=innerWidth*dpr;cv.height=innerHeight*dpr};size();addEventListener("resize",size);
  addEventListener("pointermove",e=>{if(e.pointerType==="touch")return;const x=e.clientX,y=e.clientY,now=performance.now();
    if(lx===null){lx=x;ly=y}const dx=x-lx,dy=y-ly,steps=Math.max(1,Math.hypot(dx,dy)/6|0);
    for(let k=1;k<=steps;k++)pts.push({x:lx+dx*k/steps,y:ly+dy*k/steps,t:now,r:8+Math.random()*16});
    lx=x;ly=y;if(pts.length>260)pts.splice(0,pts.length-260);if(!run){run=true;requestAnimationFrame(draw)}},{passive:true});
  document.addEventListener("pointerleave",()=>{lx=ly=null});
  function draw(now){c.clearRect(0,0,cv.width,cv.height);pts=pts.filter(p=>now-p.t<1100);
    for(const p of pts){const age=(now-p.t)/1100,a=1-age,n=rm?4:9,spread=p.r*(.5+age*1.4);
      for(let k=0;k<n;k++){const ang=Math.random()*6.283,rr=Math.random()*spread,s=(Math.random()<.8?1:2)*dpr;
        c.fillStyle=Math.random()<.55?`rgba(${light},${(a*.75).toFixed(3)})`:`rgba(0,0,0,${(a*.85).toFixed(3)})`;
        c.fillRect((p.x+Math.cos(ang)*rr)*dpr,(p.y+Math.sin(ang)*rr)*dpr,s,s)}}
    if(pts.length)requestAnimationFrame(draw);else{run=false;c.clearRect(0,0,cv.width,cv.height)}}})();
