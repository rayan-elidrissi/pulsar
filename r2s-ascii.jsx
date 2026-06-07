// r2s-ascii.jsx — ASCII glyph image renderer (the signature effect).
// Draws an <img> as a grid of monospace glyphs sampled by luminance, with
// support for a progressive "scan" reveal, a dirty→clean morph, and accent
// tinting of bright cells. Pure canvas; no deps.

const GLYPH_RAMPS = {
  ascii:  " .`':,-~+=*xX#%@█",
  blocks: " ░░▒▒▓▓████",
  dense:  " .:-=oO0@#█",
  binary: " ..::01011█",
  dots:   " ··•••●●●●",
};

// Load an image once, return {img, w, h}. Cached by src.
const __imgCache = {};
function loadImage(src) {
  if (__imgCache[src]) return __imgCache[src];
  const p = new Promise((res, rej) => {
    const im = new Image();
    im.crossOrigin = "anonymous";
    im.onload = () => res(im);
    im.onerror = rej;
    im.src = src;
  });
  __imgCache[src] = p;
  return p;
}

// Sample an image into a luminance + color grid at a given column count.
// `clean` quantizes luminance into coarse bands and median-blurs, simulating
// "small unimportant details removed".
function sampleGrid(img, cols, aspectCorrect = 0.5, clean = false) {
  const ar = img.height / img.width;
  const rows = Math.max(3, Math.round(cols * ar * aspectCorrect * 2));
  const c = document.createElement("canvas");
  c.width = cols; c.height = rows;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, cols, rows);
  const data = ctx.getImageData(0, 0, cols, rows).data;
  const lum = new Float32Array(cols * rows);
  const col = new Array(cols * rows);
  for (let i = 0; i < cols * rows; i++) {
    const r = data[i*4], g = data[i*4+1], b = data[i*4+2];
    let l = (0.299*r + 0.587*g + 0.114*b) / 255;
    lum[i] = l;
    col[i] = [r, g, b];
  }
  if (clean) {
    // 3x3 box blur to drop fine detail, then quantize to 6 luminance bands
    const out = new Float32Array(cols * rows);
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      let s = 0, n = 0;
      for (let dy=-1; dy<=1; dy++) for (let dx=-1; dx<=1; dx++) {
        const xx=x+dx, yy=y+dy;
        if (xx>=0&&xx<cols&&yy>=0&&yy<rows){ s+=lum[yy*cols+xx]; n++; }
      }
      const v = s/n;
      out[y*cols+x] = Math.round(v*5)/5;
    }
    return { cols, rows, lum: out, col };
  }
  return { cols, rows, lum, col };
}

// React component. Props:
//   src        image url
//   cleanSrc   optional — when morph>0, blends toward a cleaned grid of `src`
//   cols       glyph columns (density)
//   charset    key of GLYPH_RAMPS or a raw string
//   reveal     0..1 progressive scan-in (default 1)
//   morph      0..1 dirty->clean blend (default 0)
//   tint       bool — tint bright cells with accent
//   color      bool — sample source color instead of monochrome ink
//   scan       bool — draw a moving scan line during reveal<1
function AsciiImage({ src, cols = 120, charset = "ascii", reveal = 1, morph = 0,
                      tint = true, color = false, className = "", style = {} }) {
  const ref = React.useRef(null);
  const wrapRef = React.useRef(null);
  const stateRef = React.useRef({ dirty: null, clean: null });
  const [ready, setReady] = React.useState(false);
  const ramp = GLYPH_RAMPS[charset] || charset || GLYPH_RAMPS.ascii;

  React.useEffect(() => {
    let alive = true;
    setReady(false);
    loadImage(src).then((img) => {
      if (!alive) return;
      stateRef.current.dirty = sampleGrid(img, cols, 0.5, false);
      stateRef.current.clean = sampleGrid(img, cols, 0.5, true);
      setReady(true);
    }).catch(()=>{});
    return () => { alive = false; };
  }, [src, cols]);

  React.useEffect(() => {
    if (!ready) return;
    const cv = ref.current, wrap = wrapRef.current;
    if (!cv || !wrap) return;
    const g = stateRef.current.dirty;
    const gc = stateRef.current.clean;
    const ctx = cv.getContext("2d");
    const dpr = Math.min(2, window.devicePixelRatio || 1);

    function draw() {
      const W = wrap.clientWidth, H = wrap.clientHeight;
      if (!W || !H) return;
      cv.width = W * dpr; cv.height = H * dpr;
      cv.style.width = W+"px"; cv.style.height = H+"px";
      ctx.setTransform(dpr,0,0,dpr,0,0);
      ctx.clearRect(0,0,W,H);
      const cw = W / g.cols;
      const ch = H / g.rows;
      const fs = Math.max(cw, ch) * 1.32;
      ctx.font = `${fs}px "IBM Plex Mono", monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const css = getComputedStyle(document.documentElement);
      const ink = css.getPropertyValue("--ink").trim() || "#ece7de";
      const accent = css.getPropertyValue("--accent").trim() || "#e89b4c";
      const revRow = reveal >= 1 ? g.rows + 2 : reveal * (g.rows + 2);
      for (let y = 0; y < g.rows; y++) {
        if (y > revRow) break;
        const edge = revRow - y;            // fade-in band near the scan front
        const rowA = edge < 1 ? edge : 1;
        for (let x = 0; x < g.cols; x++) {
          const i = y * g.cols + x;
          let l = g.lum[i];
          if (morph > 0) l = l * (1 - morph) + gc.lum[i] * morph;
          // luminance -> glyph
          let gi = Math.round((1 - l) * (ramp.length - 1)); // dark = denser glyph? invert for dark bg
          gi = Math.round(l * (ramp.length - 1));
          const ch0 = ramp[gi];
          if (ch0 === " ") continue;
          let alpha = (0.25 + l * 0.85) * rowA;
          if (color) {
            const [r,gg,b] = g.col[i];
            ctx.fillStyle = `rgba(${r},${gg},${b},${Math.min(1,alpha+0.1)})`;
          } else if (tint && l > 0.72) {
            ctx.fillStyle = accent;
            ctx.globalAlpha = Math.min(1, alpha);
          } else {
            ctx.fillStyle = ink;
            ctx.globalAlpha = Math.min(1, alpha);
          }
          ctx.fillText(ch0, (x + 0.5) * cw, (y + 0.5) * ch);
          ctx.globalAlpha = 1;
        }
      }
    }
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [ready, reveal, morph, tint, color, ramp]);

  return (
    <div ref={wrapRef} className={className}
         style={{ position:"relative", width:"100%", height:"100%", ...style }}>
      <canvas ref={ref} style={{ display:"block", width:"100%", height:"100%" }} />
      {!ready && (
        <div style={{ position:"absolute", inset:0, display:"grid", placeItems:"center",
                      color:"var(--ink-faint)", fontSize:11, letterSpacing:"0.2em" }}>
          DECODING<span className="cursor-blink">_</span>
        </div>
      )}
      {reveal < 1 && ready && (
        <div className="scan-front" style={{
          position:"absolute", left:0, right:0, top:`calc(${reveal*100}% - 1px)`, height:2,
          background:"linear-gradient(90deg,transparent,var(--accent),transparent)",
          boxShadow:"0 0 18px 3px var(--accent-soft)", pointerEvents:"none"
        }} />
      )}
    </div>
  );
}

// Hook: animate a value 0->1 over `ms`, restartable via `key`.
function useProgress(active, ms = 1600, key = 0) {
  const [p, setP] = React.useState(active ? 0 : 1);
  React.useEffect(() => {
    if (!active) { setP(1); return; }
    setP(0);
    let raf, t0;
    const step = (t) => {
      if (!t0) t0 = t;
      const v = Math.min(1, (t - t0) / ms);
      setP(v);
      if (v < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [active, ms, key]);
  return p;
}

Object.assign(window, { AsciiImage, GLYPH_RAMPS, loadImage, sampleGrid, useProgress });
