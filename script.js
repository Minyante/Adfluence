// Mobile nav toggle
const hamburger = document.getElementById('hamburger');
const nav = document.getElementById('nav');
hamburger?.addEventListener('click', () => {
  nav.classList.toggle('open');
});

// Smooth scroll for in-page anchors
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const href = a.getAttribute('href');
    if (!href || href === '#') return;
    const el = document.querySelector(href);
    if (el) {
      e.preventDefault();
      el.scrollIntoView({behavior: 'smooth', block: 'start'});
      nav.classList.remove('open');
    }
  });
});

// Footer year
document.getElementById('y').textContent = new Date().getFullYear();

// Simple fade-in for intro: only after user scrolls and section is reached
function handleIntroFadeIn() {
  const section = document.querySelector('.intro-section');
  const headline = document.querySelector('.intro-headline');
  const introText = document.querySelector('.intro-text');
  if (!section || !headline || !introText) return;

  let done = false;
  function checkAndReveal(){
    if (done) return;
    const scrolled = window.scrollY > 10; // ensure user actually scrolled
    const rect = section.getBoundingClientRect();
    const nearViewport = rect.top < window.innerHeight * 0.7; // reveal when approaching
    if (scrolled && nearViewport){
      headline.classList.add('fade-in');
      setTimeout(() => introText.classList.add('fade-in'), 120);
      done = true;
      window.removeEventListener('scroll', onScroll);
    }
  }
  function onScroll(){ requestAnimationFrame(checkAndReveal); }
  window.addEventListener('scroll', onScroll, { passive: true });
}

// Initialize fade-in animation
handleIntroFadeIn();

// --- Problem section integrated overlay control ---
let problemActive = false;
let problemInited = false;
let problemOrange = null;
let problemBlues = [];
let problemOverlayAlpha = 0; // fades overlay in/out

function handleProblemSection(){
  const section = document.querySelector('.problem-section');
  const headline = document.querySelector('.problem-headline');
  const text = document.querySelector('.problem-text');
  if (!section) return;

  const onEnter = () => {
    problemInited = false;
    problemOverlayAlpha = 0;
    problemActive = true;
    if (headline) headline.classList.add('fade-in');
    if (text) setTimeout(()=> text.classList.add('fade-in'), 500);
  };
  const onExit = () => {
    problemActive = false;
    problemInited = false;
    for (const b of problemBlues) b.progress = 0;
  };

  const observer = new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{
      if (entry.isIntersecting) onEnter(); else onExit();
    });
  }, { threshold: 0.65, rootMargin: '-5% 0% -25% 0%' });

  observer.observe(section);
}

handleProblemSection();

// Animated network background (orange + light blue blobs with connecting lines)
(function animateBackground(){
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let width, height, dpr;

  // URL override: ?motion=off or ?motion=on (from v6.1)
  const params = new URLSearchParams(location.search);
  const motionParam = params.get('motion');
  const forceOff = motionParam === 'off';
  const forceOn  = motionParam === 'on';

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const intensity = forceOff ? 0 : (prefersReduced && !forceOn ? 0.6 : 1.0);

  const baseBlobCount = 14; // higher baseline than v6.1
  const blobCount = Math.floor(baseBlobCount * (0.6 + 0.4*intensity)); // 9–14

  const blobs = [];
  function rand(min, max){ return Math.random()*(max-min)+min; }

  function resize(){
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function makeBlobs(){
    blobs.length = 0;
    for (let i=0; i<blobCount; i++){
      const r = rand(70, 140);
      const speed = rand(0.25, 0.55) * (0.9 + 0.6*intensity); // faster than before
      const angle = rand(0, Math.PI*2);
      // alternate palette: light blue (#53c7ff ~ hue 197) and orange (#ff8a00 ~ hue 28)
      const isBlue = i % 2 === 0;
      const hue = isBlue ? rand(190, 205) : rand(22, 34);
      const sat = isBlue ? rand(70, 95) : rand(85, 100);
      const lum = isBlue ? rand(60, 75) : rand(55, 60);
      const alpha = isBlue ? rand(0.08, 0.16) : rand(0.10, 0.18);
      blobs.push({
        x: rand(-r, width+r),
        y: rand(-r, height+r),
        r, vx: Math.cos(angle)*speed, vy: Math.sin(angle)*speed,
        hue, sat, lum, alpha, isBlue
      });
    }
  }

  function step(){
    ctx.clearRect(0,0,width,height);

    // background wash
    const g = ctx.createLinearGradient(0,0,width,height);
    g.addColorStop(0, '#0a1b2e');
    g.addColorStop(1, '#06111d');
    ctx.fillStyle = g;
    ctx.fillRect(0,0,width,height);

    // draw connections (before blobs so glow sits on top)
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (let i=0; i<blobs.length; i++){
      for (let j=i+1; j<blobs.length; j++){
        const a = blobs[i], b = blobs[j];
        const dx = a.x-b.x, dy = a.y-b.y;
        const dist = Math.hypot(dx,dy);
        const threshold = 240; // distance to connect
        if (dist < threshold){
          const t = 1 - (dist/threshold);
          // Color mix: blue->orange depending on pair
          const hue = (a.isBlue && b.isBlue) ? 198 : (!a.isBlue && !b.isBlue ? 28 : 210);
          const sat = (a.isBlue && b.isBlue) ? 85 : (!a.isBlue && !b.isBlue ? 95 : 70);
          const lum = 60 + 20*t;
            // Fade alpha more gradually until fully gone
            const fadeAlpha = Math.pow(t, 1.5); // smoother fade, fades slower at first, faster at end
            ctx.strokeStyle = `hsla(${hue}, ${sat}%, ${lum}%, ${fadeAlpha})`;
          ctx.lineWidth = 1.2 + 1.8*t;
          ctx.beginPath();
          // slight curve
          const mx = (a.x+b.x)/2 + (dy*0.15);
          const my = (a.y+b.y)/2 - (dx*0.15);
          ctx.moveTo(a.x, a.y);
          ctx.quadraticCurveTo(mx, my, b.x, b.y);
          ctx.stroke();
        }
      }
    }
    ctx.restore();

    // draw blobs
    ctx.globalCompositeOperation = 'lighter';
    for (const b of blobs){
      b.x += b.vx; b.y += b.vy;
      if (b.x < -b.r || b.x > width + b.r) b.vx *= -1;
      if (b.y < -b.r || b.y > height + b.r) b.vy *= -1;

      const rad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
      const col = `hsla(${b.hue}, ${b.sat}%, ${b.lum}%, ${b.alpha})`;
      rad.addColorStop(0, col);
      rad.addColorStop(1, 'hsla(210, 40%, 10%, 0)');
      ctx.fillStyle = rad;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI*2); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';

    // --- Integrated problem overlay drawing ---
    // helper local fns for overlay
    function drawCurveSegment(o, b, tEnd){
      const mx = (o.x+b.x)/2 + ((b.y-o.y)*0.12);
      const my = (o.y+b.y)/2 - ((b.x-o.x)*0.12);
      const steps = Math.max(4, Math.floor(tEnd*40));
      ctx.beginPath();
      for (let i=0; i<=steps; i++){
        const t = (i/steps) * tEnd;
        const x = (1-t)*(1-t)*o.x + 2*(1-t)*t*mx + t*t*b.x;
        const y = (1-t)*(1-t)*o.y + 2*(1-t)*t*my + t*t*b.y;
        if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
      }
      ctx.stroke();
    }
    function drawBlob(b){
      const rad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
      const col = `hsla(${b.hue}, ${b.sat}%, ${b.lum}%, ${b.alpha})`;
      rad.addColorStop(0, col);
      rad.addColorStop(1, 'hsla(210, 40%, 10%, 0)');
      ctx.fillStyle = rad;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI*2); ctx.fill();
    }

    // initialize overlay nodes
    function initProblemOverlay(){
      if (problemInited) return;
      problemInited = true;
      problemBlues = [];
      const blueCount = 22;
      function rand(min,max){ return Math.random()*(max-min)+min; }
      problemOrange = {
        x: width*0.5, y: height*0.52, r: 56, hue: 28, sat: 100, lum: 56, alpha: 0.28,
        vx: 0.12, vy: -0.05
      };
      const ring = Math.min(width, height);
      for (let i=0; i<blueCount; i++){
        const angle = (i/blueCount)*Math.PI*2 + rand(-0.2,0.2);
        const rad = rand(ring*0.12, ring*0.20);
        problemBlues.push({
          x: problemOrange.x + Math.cos(angle)*rad,
          y: problemOrange.y + Math.sin(angle)*rad,
          r: rand(30, 60), hue: 200, sat: 92, lum: 68, alpha: 0.22,
          vx: rand(-0.06,0.06), vy: rand(-0.06,0.06), progress: 0
        });
      }
    }

    // fade overlay alpha toward target
    const targetAlpha = problemActive ? 1 : 0;
    problemOverlayAlpha += (targetAlpha - problemOverlayAlpha) * 0.08;
    if (problemOverlayAlpha > 0.01){
      if (problemActive) initProblemOverlay();

      // minimal motion updates
      if (problemOrange){
        problemOrange.x += problemOrange.vx; problemOrange.y += problemOrange.vy;
        if (problemOrange.x < width*0.45 || problemOrange.x > width*0.55) problemOrange.vx *= -1;
        if (problemOrange.y < height*0.47 || problemOrange.y > height*0.57) problemOrange.vy *= -1;
      }
      for (const b of problemBlues){
        b.x += b.vx; b.y += b.vy;
        if (b.x < width*0.18 || b.x > width*0.82) b.vx *= -1;
        if (b.y < height*0.28 || b.y > height*0.72) b.vy *= -1;
        if (problemActive) b.progress = Math.min(1, b.progress + 0.006);
      }

      // draw connections
      if (problemOrange){
        ctx.save();
        ctx.globalAlpha = problemOverlayAlpha;
        ctx.globalCompositeOperation = 'screen';
        for (const b of problemBlues){
          const dx = b.x - problemOrange.x, dy = b.y - problemOrange.y;
          const dist = Math.hypot(dx,dy);
          const useOrange = dist < 240;
          ctx.strokeStyle = `hsla(${useOrange?28:198}, ${useOrange?100:90}%, 62%, ${0.18 + 0.22*b.progress})`;
          ctx.lineWidth = 1.6 + 1.8*b.progress;
          drawCurveSegment(problemOrange, b, b.progress);
        }
        ctx.restore();

        // draw blobs last
        ctx.save();
        ctx.globalAlpha = problemOverlayAlpha;
        ctx.globalCompositeOperation = 'lighter';
        drawBlob(problemOrange);
        for (const b of problemBlues) drawBlob(b);
        ctx.restore();
      }
    }

    if (!paused) requestAnimationFrame(step);
  }

  let paused = false;
  function start(){ paused = false; requestAnimationFrame(step); }
  function pause(){ paused = true; }

  function init(){
    resize();
    makeBlobs();
    if (!forceOff) start();
  }

  window.addEventListener('resize', ()=>{ resize(); makeBlobs(); });
  document.addEventListener('visibilitychange', ()=>{
    if (document.hidden) pause(); else if (!forceOff) start();
  });

  init();
})();
