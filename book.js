'use strict';
(() => {
  const main = document.querySelector('main');
  const pages = [...main.querySelectorAll(':scope > section')];
  const names = ['封面', '班级日志', '光影相册', '未完待续'];
  const ids = ['cover', 'journal', 'moments', 'next-story'];
  if (pages.length !== 4) return;
  const ribbon = main.querySelector('.ribbon');
  pages[0].append(ribbon);
  pages.forEach((page, i) => {
    page.id = ids[i]; page.classList.add('book-page'); page.tabIndex = -1;
    page.setAttribute('aria-label', names[i]);
  });
  const tabs = document.createElement('nav');
  tabs.className = 'book-tabs'; tabs.setAttribute('aria-label', '手账目录');
  names.forEach((name, i) => {
    const a = document.createElement('a'); a.href = '#' + ids[i];
    a.textContent = `0${i + 1} / ${name}`; tabs.append(a);
  });
  main.before(tabs);
  const controls = document.createElement('div'); controls.className = 'book-controls';
  const previous = document.createElement('button'); previous.textContent = '← 上一页';
  const next = document.createElement('button'); next.textContent = '下一页 →';
  const counter = document.createElement('span'); counter.setAttribute('aria-live', 'polite');
  controls.append(previous, counter, next); main.after(controls);
  const hint = document.createElement('p'); hint.className = 'book-hint';
  hint.textContent = '像翻开一本手账一样，慢慢读我们的故事。 · 左右方向键 / 手机左右滑动翻页';
  controls.after(hint);
  let active = -1, busy = false;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const target = () => Math.max(0, ids.indexOf(location.hash.slice(1)));
  const noMotion = () => reduced.matches || document.documentElement.classList.contains('motion-paused');
  function update() {
    previous.disabled = active === 0 || busy; next.disabled = active === 3 || busy;
    counter.textContent = `${String(active + 1).padStart(2, '0')} / 04 · ${names[active]}`;
    [...tabs.children].forEach((a, i) => {
      if (i === active) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
  }
  async function turn(index, initial = false) {
    if (busy || index === active) return;
    busy = true;
    const old = pages[active], page = pages[index], forward = index > active;
    const animate = !initial && !noMotion() && typeof page.animate === 'function';
    if (old) { update(); old.inert = true; }
    main.classList.add('turning');
    try {
      if (old && animate) {
        const out = old.animate([
          { transform: 'rotateY(0deg)', opacity: 1 },
          { transform: `rotateY(${forward ? -12 : 12}deg)`, opacity: 0 }
        ], { duration: 160, easing: 'ease-in', fill: 'forwards' });
        await out.finished.catch(() => {}); out.cancel();
      }
      pages.forEach(p => { p.hidden = true; p.inert = true; });
      active = index; page.hidden = false; page.inert = false;
      // The previous edition's scroll reveals must not hide newly opened pages.
      page.querySelectorAll('.reveal-pending').forEach(el => el.classList.remove('reveal-pending'));
      if (!initial) main.scrollIntoView({ block: 'start', behavior: 'instant' });
      if (animate) {
        const incoming = page.animate([
          { transform: `rotateY(${forward ? 14 : -14}deg)`, opacity: 0 },
          { transform: 'rotateY(0deg)', opacity: 1 }
        ], { duration: 320, easing: 'cubic-bezier(.2,.7,.2,1)' });
        await incoming.finished.catch(() => {});
      }
      if (!initial) page.focus({ preventScroll: true });
    } finally { busy = false; main.classList.remove('turning'); update(); }
    if (target() !== active) turn(target());
  }
  function move(delta) { if (!busy && active + delta >= 0 && active + delta < 4) location.hash = ids[active + delta]; }
  previous.onclick = () => move(-1); next.onclick = () => move(1);
  addEventListener('hashchange', () => turn(target()));
  document.addEventListener('keydown', e => {
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || document.querySelector('dialog[open]') || e.target.closest('input,textarea,select,[contenteditable="true"]')) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); move(e.key === 'ArrowRight' ? 1 : -1); }
  });
  let touch = null;
  main.addEventListener('touchstart', e => {
    touch = e.touches.length === 1 && !e.target.closest('button,a,input,textarea,select') ? { x:e.touches[0].clientX, y:e.touches[0].clientY } : null;
  }, { passive:true });
  main.addEventListener('touchcancel', () => touch = null, { passive:true });
  main.addEventListener('touchend', e => {
    if (!touch || !e.changedTouches.length) return;
    const dx=e.changedTouches[0].clientX-touch.x, dy=e.changedTouches[0].clientY-touch.y; touch=null;
    if (Math.abs(dx)>80 && Math.abs(dx)>Math.abs(dy)*2) move(dx<0?1:-1);
  }, { passive:true });
  function paginate(selector, size) {
    const list=document.querySelector(selector), bar=document.createElement('div');
    bar.className='collection-pager'; list.after(bar); let current=0;
    function draw() {
      const items=[...list.children], total=Math.max(1,Math.ceil(items.length/size));
      current=Math.min(current,total-1);
      items.forEach((el,i)=>el.hidden=Math.floor(i/size)!==current);
      bar.replaceChildren(); bar.hidden=total===1;
      if(total===1)return;
      const back=document.createElement('button'),label=document.createElement('span'),forth=document.createElement('button');
      back.textContent='← 前一组';forth.textContent='后一组 →';label.textContent=`第 ${current+1} / ${total} 组`;
      label.setAttribute('aria-live','polite');back.disabled=current===0;forth.disabled=current===total-1;
      back.onclick=()=>{current--;draw();};forth.onclick=()=>{current++;draw();};
      bar.append(back,label,forth);
    }
    new MutationObserver(()=>{current=0;draw();}).observe(list,{childList:true});draw();
  }
  paginate('#entries',4);paginate('#gallery',6);
  document.documentElement.classList.add('book-ready');
  turn(target(),true);
})();
