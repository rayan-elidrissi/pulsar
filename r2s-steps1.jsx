// r2s-steps1.jsx — wizard screens 00–03 (Brief, Capture, Clean, Backdrop).
const SCENE_IMG = "assets/port-scene.jpg";

// Shared title block for a step body.
function StepTitle({ step, t }){
  return (
    <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:22}}>
      <div style={{display:"flex",alignItems:"center",gap:12}}>
        <span style={{fontFamily:"var(--mono)",fontSize:12,color:"var(--accent)"}}>{step.n}</span>
        <span className="tag">{step.label}</span>
      </div>
      <h1 className="serif" style={{margin:0,fontSize:34,fontWeight:400,lineHeight:1.08,
        letterSpacing:"-0.01em",maxWidth:"22ch",color:"var(--ink)"}}>
        <ScrambleText text={step.title} active={t.scramble} />
      </h1>
    </div>
  );
}

// 00 — BRIEF -------------------------------------------------------------------
function IntroStep({ step, t, onBegin }){
  return (
    <div style={{display:"grid",gridTemplateColumns:"1.05fr 1fr",gap:48,height:"100%",
      alignItems:"center"}} className="reveal">
      <div style={{display:"flex",flexDirection:"column",gap:26,maxWidth:560}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <span className="chip"><span className="dot" />REAL2SIM</span>
          <span className="tag">Port digital-twin pipeline</span>
        </div>
        <h1 className="serif" style={{margin:0,fontSize:"clamp(38px,4.4vw,62px)",fontWeight:400,
          lineHeight:1.02,letterSpacing:"-0.02em"}}>
          Rehearse the <em style={{fontStyle:"italic",color:"var(--accent)"}}>worst failure</em><br/>before it ever happens.
        </h1>
        <p style={{margin:0,fontSize:14.5,lineHeight:1.7,color:"var(--ink-dim)",maxWidth:"54ch"}}>
          Automation makes ports faster — and makes every rare physical failure more costly.
          From a single image of the terminal, we reconstruct an interactive digital twin so
          operators can practice cranes, AGVs and vessels failing <em style={{color:"var(--ink)"}}>in
          simulation</em> — not live on the apron.
        </p>
        <div style={{display:"flex",flexDirection:"column",gap:1,border:"1px solid var(--line)",
          borderRadius:3,overflow:"hidden"}}>
          <PanelHead idx="//">Failure library — rehearsable scenarios</PanelHead>
          {FAILURES.map(f=>(
            <div key={f.code} style={{display:"grid",gridTemplateColumns:"58px 1fr auto",gap:14,
              alignItems:"center",padding:"9px 14px",borderTop:"1px solid var(--line)"}}>
              <span style={{fontFamily:"var(--mono)",fontSize:11,color:"var(--ink-mute)"}}>{f.code}</span>
              <span style={{fontSize:12.5,color:"var(--ink-dim)"}}>{f.name}</span>
              <Sev s={f.sev} />
            </div>
          ))}
        </div>
        <div style={{display:"flex",gap:14,alignItems:"center"}}>
          <button className="btn btn-primary" onClick={onBegin}>Begin capture →</button>
          <span className="tag">8 stages · ~ realtime</span>
        </div>
      </div>
      <Viewport label="source · hong kong kwai tsing" badge={<span className="chip"><span className="dot"/>LIVE FEED</span>}
        style={{height:"min(70vh,560px)"}}>
        <AsciiImage src={SCENE_IMG} cols={t.cols} charset={t.charset} reveal={1}
          tint={t.tint} color={t.colorAscii} />
        <div className="scan" style={{top:"50%",animation:"sweep 5.5s linear infinite"}} />
      </Viewport>
    </div>
  );
}

// 01 — CAPTURE -----------------------------------------------------------------
function UploadStep({ step, t, state, setState }){
  const up = state.uploaded;
  const rev = useProgress(up, 2200, up?1:0);
  React.useEffect(()=>{ if(up && rev>=1 && !state.canNext) setState(s=>({...s,canNext:true})); },[up,rev]);
  return (
    <div style={{display:"grid",gridTemplateColumns:"1fr 340px",gap:40,height:"100%"}} className="reveal">
      <div style={{display:"flex",flexDirection:"column"}}>
        <StepTitle step={step} t={t} />
        <Viewport label={up?"frame 0001 · 4096×2304":"awaiting input"} style={{flex:1,minHeight:0}}>
          {!up ? (
            <button onClick={()=>setState(s=>({...s,uploaded:true}))}
              style={{all:"unset",cursor:"pointer",position:"absolute",inset:18,display:"grid",
                placeItems:"center",border:"1px dashed var(--line-2)",borderRadius:4}}
              onMouseEnter={e=>e.currentTarget.style.borderColor="var(--accent-line)"}
              onMouseLeave={e=>e.currentTarget.style.borderColor="var(--line-2)"}>
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:14,textAlign:"center"}}>
                <div style={{fontSize:30,color:"var(--ink-faint)"}}>⌖</div>
                <div style={{fontSize:14,color:"var(--ink-dim)"}}>Drop terminal image or video</div>
                <div className="tag">JPG · PNG · MP4 · up to 8K — or use the sample</div>
                <span className="btn" style={{marginTop:6}}>Use sample frame</span>
              </div>
            </button>
          ) : (
            <AsciiImage src={SCENE_IMG} cols={t.cols} charset={t.charset} reveal={rev}
              tint={t.tint} color={t.colorAscii} />
          )}
        </Viewport>
      </div>
      <aside style={{display:"flex",flexDirection:"column",gap:18,paddingTop:96}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:18}}>
          <Readout label="Resolution" value={up?"4096²":"—"} sub="ingest buffer" />
          <Readout label="Perspective" value={up?"38.4°":"—"} sub="est. fov" accent={up} />
          <Readout label="Geo-anchor" value={up?"22.32 N":"—"} sub="114.13 E" />
          <Readout label="Confidence" value={up?`${Math.round(rev*97)}%`:"—"} sub="scene parse" accent={up} />
        </div>
        <hr className="hr" />
        <div>
          <span className="tag" style={{display:"block",marginBottom:12}}>Ingest pipeline</span>
          {up ? <PipeLog lines={PIPELINE_LOG.upload} active={true} />
              : <span style={{fontSize:12,color:"var(--ink-faint)"}}>// idle — no source loaded</span>}
        </div>
      </aside>
    </div>
  );
}

// 02 — CLEAN PLATE -------------------------------------------------------------
function CleanStep({ step, t, state, setState }){
  const [m,setM]=React.useState(0);
  const auto=React.useRef(true);
  React.useEffect(()=>{
    let raf,t0;
    const run=(ts)=>{ if(!auto.current)return; if(!t0)t0=ts;
      const v=Math.min(1,(ts-t0)/2600); setM(v); if(v<1)raf=requestAnimationFrame(run);
      else if(!state.canNext)setState(s=>({...s,canNext:true})); };
    raf=requestAnimationFrame(run); return ()=>cancelAnimationFrame(raf);
  },[]);
  const removed=[
    {k:"Moving trucks & cargo",n:34},{k:"Personnel on apron",n:11},
    {k:"Transient shadows",n:"∿"},{k:"Water glare / reflections",n:"∿"},
    {k:"Birds / airborne debris",n:6},{k:"Lens vignette & noise",n:"✓"},
  ];
  return (
    <div style={{display:"grid",gridTemplateColumns:"1fr 340px",gap:40,height:"100%"}} className="reveal">
      <div style={{display:"flex",flexDirection:"column"}}>
        <StepTitle step={step} t={t} />
        <Viewport label={m<0.5?"raw capture":"clean plate · transients removed"} style={{flex:1,minHeight:0}}
          badge={<span className="chip"><span className="dot"/>{Math.round(m*100)}% CLEANED</span>}>
          <AsciiImage src={SCENE_IMG} cols={t.cols} charset={t.charset} reveal={1} morph={m}
            tint={t.tint} color={t.colorAscii} />
        </Viewport>
        <div style={{display:"flex",alignItems:"center",gap:14,marginTop:16}}>
          <span className="tag" style={{whiteSpace:"nowrap"}}>Raw</span>
          <input type="range" min="0" max="1" step="0.01" value={m}
            onMouseDown={()=>auto.current=false} onChange={e=>setM(+e.target.value)}
            style={{flex:1,accentColor:"var(--accent)"}} />
          <span className="tag" style={{whiteSpace:"nowrap"}}>Clean</span>
        </div>
      </div>
      <aside style={{display:"flex",flexDirection:"column",gap:18,paddingTop:96}}>
        <Readout label="Detail band filter" value="σ 2.4px" sub="high-freq culled" accent />
        <hr className="hr" />
        <span className="tag">Removed from plate</span>
        <div style={{display:"flex",flexDirection:"column",gap:1}}>
          {removed.map((r,i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",
              padding:"8px 0",borderTop:i?"1px solid var(--line)":"none",opacity:m>i/removed.length?1:0.3,
              transition:"opacity .4s"}}>
              <span style={{fontSize:12.5,color:"var(--ink-dim)"}}>{r.k}</span>
              <span style={{fontFamily:"var(--mono)",fontSize:12,color: m>i/removed.length?"var(--accent)":"var(--ink-faint)"}}>{r.n}</span>
            </div>
          ))}
        </div>
        <p style={{margin:0,fontSize:11.5,lineHeight:1.6,color:"var(--ink-mute)"}}>
          // Only the static terminal survives. Anything that moves becomes a controllable
          asset later — never baked into the backdrop.
        </p>
      </aside>
    </div>
  );
}

// 03 — BACKDROP ----------------------------------------------------------------
function BackdropStep({ step, t, state, setState }){
  const [layers,setLayers]=React.useState({Quay:true,Water:true,Skyline:true,Rails:true});
  React.useEffect(()=>{ if(!state.canNext)setState(s=>({...s,canNext:true})); },[]);
  const L=[
    {k:"Quay",d:"apron deck plane",v:"0.0 m"},{k:"Water",d:"harbour basin plane",v:"-3.2 m"},
    {k:"Skyline",d:"far skyline billboard",v:"∞"},{k:"Rails",d:"gantry rail splines ×2",v:"34.5 m gauge"},
  ];
  return (
    <div style={{display:"grid",gridTemplateColumns:"1fr 340px",gap:40,height:"100%"}} className="reveal">
      <div style={{display:"flex",flexDirection:"column"}}>
        <StepTitle step={step} t={t} />
        <Viewport label="static backdrop · de-lit albedo" style={{flex:1,minHeight:0}}
          badge={<span className="chip"><span className="dot"/>BAKED</span>}>
          <AsciiImage src={SCENE_IMG} cols={Math.round(t.cols*0.82)} charset={t.charset} reveal={1} morph={1}
            tint={t.tint} color={t.colorAscii} />
        </Viewport>
      </div>
      <aside style={{display:"flex",flexDirection:"column",gap:18,paddingTop:96}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:18}}>
          <Readout label="Planes fit" value="4" sub="RANSAC" accent />
          <Readout label="Depth range" value="0–840 m" sub="monodepth-v2" />
        </div>
        <hr className="hr" />
        <span className="tag">Backdrop layers</span>
        <div style={{display:"flex",flexDirection:"column",gap:1}}>
          {L.map((l,i)=>(
            <button key={l.k} onClick={()=>setLayers(s=>({...s,[l.k]:!s[l.k]}))}
              style={{all:"unset",cursor:"pointer",display:"grid",gridTemplateColumns:"22px 1fr auto",
                gap:12,alignItems:"center",padding:"10px 0",borderTop:i?"1px solid var(--line)":"none"}}>
              <span style={{width:14,height:14,borderRadius:2,border:"1px solid var(--line-2)",
                background:layers[l.k]?"var(--accent)":"transparent",display:"grid",placeItems:"center",
                color:"#1b1206",fontSize:10}}>{layers[l.k]?"✓":""}</span>
              <span style={{display:"flex",flexDirection:"column"}}>
                <span style={{fontSize:13,color:"var(--ink)"}}>{l.k}</span>
                <span style={{fontSize:11,color:"var(--ink-mute)"}}>{l.d}</span>
              </span>
              <span style={{fontFamily:"var(--mono)",fontSize:11,color:"var(--ink-mute)"}}>{l.v}</span>
            </button>
          ))}
        </div>
        <p style={{margin:0,fontSize:11.5,lineHeight:1.6,color:"var(--ink-mute)"}}>
          // The backdrop holds still while every dynamic asset moves against it. Next we lift
          it into 3D.
        </p>
      </aside>
    </div>
  );
}

Object.assign(window,{ SCENE_IMG, StepTitle, IntroStep, UploadStep, CleanStep, BackdropStep });
