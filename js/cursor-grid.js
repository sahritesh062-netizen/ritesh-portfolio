/* ============================================================
   CursorGrid — vanilla JS port of React Bits' CursorGrid-JS-CSS
   Source: https://reactbits.dev/r/CursorGrid-JS-CSS.json
   No external dependencies. Ported logic 1:1 from the React
   version's useEffect body (refs -> plain closures).
   ============================================================ */
(function () {
  const FALLOFF_CURVES = {
    linear: t => t,
    smooth: t => t * t * (3 - 2 * t),
    sharp: t => t * t * t
  };

  function hexToRgb(hex) {
    const h = hex.replace('#', '');
    const v = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
    const num = parseInt(v.slice(0, 6), 16);
    return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
  }

  function createCursorGrid(container, options) {
    if (!container) return null;

    const config = Object.assign(
      {
        cellSize: 70,
        color: '#7df296',
        radius: 140,
        falloff: 'smooth',
        holdTime: 400,
        fadeDuration: 800,
        lineWidth: 1.2,
        maxOpacity: 1,
        fillOpacity: 0,
        gridOpacity: 0,
        cellRadius: 0,
        clickPulse: true,
        pulseSpeed: 600
      },
      options || {}
    );

    container.classList.add('cursor-grid');
    const canvas = document.createElement('canvas');
    canvas.className = 'cursor-grid__canvas';
    container.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    let cols = 0,
      rows = 0,
      offX = 0,
      offY = 0;
    let alphas = new Float32Array(0);
    let touched = new Float64Array(0);
    let w = 0,
      h = 0;
    const pulses = [];
    let raf = 0;
    let running = false;
    let lastFrame = 0;

    function rebuild() {
      w = container.offsetWidth;
      h = container.offsetHeight;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(w / config.cellSize) + 1;
      rows = Math.ceil(h / config.cellSize) + 1;
      offX = (w - cols * config.cellSize) / 2;
      offY = (h - rows * config.cellSize) / 2;
      alphas = new Float32Array(cols * rows);
      touched = new Float64Array(cols * rows);
    }

    function cellCenter(i) {
      const cx = offX + (i % cols) * config.cellSize + config.cellSize / 2;
      const cy = offY + Math.floor(i / cols) * config.cellSize + config.cellSize / 2;
      return [cx, cy];
    }

    function energize(x, y, boost) {
      const r = Math.max(config.radius, 1);
      const ease = FALLOFF_CURVES[config.falloff] || FALLOFF_CURVES.linear;
      const now = performance.now();
      const minCol = Math.max(0, Math.floor((x - r - offX) / config.cellSize));
      const maxCol = Math.min(cols - 1, Math.floor((x + r - offX) / config.cellSize));
      const minRow = Math.max(0, Math.floor((y - r - offY) / config.cellSize));
      const maxRow = Math.min(rows - 1, Math.floor((y + r - offY) / config.cellSize));
      for (let cRow = minRow; cRow <= maxRow; cRow++) {
        for (let cCol = minCol; cCol <= maxCol; cCol++) {
          const i = cRow * cols + cCol;
          const [cx, cy] = cellCenter(i);
          const dist = Math.hypot(cx - x, cy - y);
          if (dist > r) continue;
          const level = ease(1 - dist / r) * config.maxOpacity * (boost || 1);
          if (level > alphas[i]) {
            alphas[i] = level;
            touched[i] = now;
          } else if (level > 0) {
            touched[i] = now;
          }
        }
      }
    }

    function draw(now) {
      const dt = Math.min(now - lastFrame, 50);
      lastFrame = now;
      ctx.clearRect(0, 0, w, h);
      const [cr, cg, cb] = hexToRgb(config.color);

      if (config.gridOpacity > 0) {
        ctx.strokeStyle = `rgba(${cr}, ${cg}, ${cb}, ${config.gridOpacity})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let cCol = 0; cCol <= cols; cCol++) {
          const x = Math.round(offX + cCol * config.cellSize) + 0.5;
          ctx.moveTo(x, 0);
          ctx.lineTo(x, h);
        }
        for (let cRow = 0; cRow <= rows; cRow++) {
          const y = Math.round(offY + cRow * config.cellSize) + 0.5;
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
        }
        ctx.stroke();
      }

      for (let pi = pulses.length - 1; pi >= 0; pi--) {
        const pulse = pulses[pi];
        const age = (now - pulse.t0) / 1000;
        const ringR = age * config.pulseSpeed;
        if (ringR > Math.hypot(w, h)) {
          pulses.splice(pi, 1);
          continue;
        }
        const band = config.cellSize;
        const minCol = Math.max(0, Math.floor((pulse.x - ringR - band - offX) / config.cellSize));
        const maxCol = Math.min(cols - 1, Math.floor((pulse.x + ringR + band - offX) / config.cellSize));
        const minRow = Math.max(0, Math.floor((pulse.y - ringR - band - offY) / config.cellSize));
        const maxRow = Math.min(rows - 1, Math.floor((pulse.y + ringR + band - offY) / config.cellSize));
        for (let cRow = minRow; cRow <= maxRow; cRow++) {
          for (let cCol = minCol; cCol <= maxCol; cCol++) {
            const i = cRow * cols + cCol;
            const [cx, cy] = cellCenter(i);
            const dist = Math.hypot(cx - pulse.x, cy - pulse.y);
            if (Math.abs(dist - ringR) < band / 2 && config.maxOpacity > alphas[i]) {
              alphas[i] = config.maxOpacity;
              touched[i] = now;
            }
          }
        }
      }

      let anyVisible = pulses.length > 0;
      const fadeStep = dt / Math.max(config.fadeDuration, 16);
      const half = config.cellSize / 2;

      for (let i = 0; i < alphas.length; i++) {
        let a = alphas[i];
        if (a <= 0) continue;
        if (now - touched[i] > config.holdTime) {
          a = Math.max(0, a - fadeStep);
          alphas[i] = a;
          if (a <= 0) continue;
        }
        anyVisible = true;

        const [cx, cy] = cellCenter(i);
        const gradient = ctx.createRadialGradient(cx, cy, half * 0.1, cx, cy, config.cellSize);
        gradient.addColorStop(0, `rgba(${cr}, ${cg}, ${cb}, ${a})`);
        gradient.addColorStop(1, `rgba(${cr}, ${cg}, ${cb}, 0)`);

        const x = cx - half + 0.5;
        const y = cy - half + 0.5;
        const s = config.cellSize - 1;

        ctx.beginPath();
        if (config.cellRadius > 0) {
          ctx.roundRect(x, y, s, s, config.cellRadius);
        } else {
          ctx.rect(x, y, s, s);
        }
        if (config.fillOpacity > 0) {
          ctx.fillStyle = `rgba(${cr}, ${cg}, ${cb}, ${a * config.fillOpacity})`;
          ctx.fill();
        }
        ctx.strokeStyle = gradient;
        ctx.lineWidth = config.lineWidth;
        ctx.stroke();
      }

      if (anyVisible) {
        raf = requestAnimationFrame(draw);
      } else {
        running = false;
        if (config.gridOpacity <= 0) ctx.clearRect(0, 0, w, h);
      }
    }

    function wake() {
      if (running) return;
      running = true;
      lastFrame = performance.now();
      raf = requestAnimationFrame(draw);
    }

    function toLocal(e) {
      // container is now a fixed, full-viewport layer, so its
      // bounding rect equals the viewport - clientX/Y map directly.
      const rect = container.getBoundingClientRect();
      return [e.clientX - rect.left, e.clientY - rect.top];
    }

    function onPointerMove(e) {
      const [x, y] = toLocal(e);
      energize(x, y);
      wake();
    }

    function onPointerDown(e) {
      if (!config.clickPulse) return;
      const [x, y] = toLocal(e);
      pulses.push({ x, y, t0: performance.now() });
      wake();
    }

    const ro = new ResizeObserver(() => {
      rebuild();
      wake();
    });
    ro.observe(container);
    rebuild();
    wake();

    // Listen on window (not the container) so the grid reacts to the
    // cursor everywhere on the page, even over text/images/buttons that
    // sit visually on top of this fixed layer.
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerdown', onPointerDown);

    return {
      destroy() {
        cancelAnimationFrame(raf);
        ro.disconnect();
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerdown', onPointerDown);
        container.removeChild(canvas);
      }
    };
  }

  // Expose globally in case you want to mount more instances elsewhere
  window.createCursorGrid = createCursorGrid;

  // Auto-mount on the placeholder placed in the Contact section
  document.addEventListener('DOMContentLoaded', function () {
    const mount = document.getElementById('cursor-grid-mount');
    if (mount) {
      createCursorGrid(mount, {
        cellSize: 70,
        color: '#b7ff00',
        radius: 140,
        falloff: 'smooth',
        holdTime: 400,
        fadeDuration: 800,
        lineWidth: 1.2,
        maxOpacity: 0.5,
        fillOpacity: 0,
        gridOpacity: 0,
        cellRadius: 0,
        clickPulse: true,
        pulseSpeed: 600
      });
    }
  });
})();
