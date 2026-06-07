// r2s-app.jsx — wizard shell, navigation, state, tweaks, mount.

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#e89b4c",
  "charset": "ascii",
  "cols": 120,
  "colorAscii": false,
  "tint": true,
  "scramble": true,
  "grid": true,
  "splatCount": 2600
}/*EDITMODE-END*/;

const STEP_COMPONENTS = { intro:IntroStep, upload:UploadStep, clean:CleanStep, backdrop:BackdropStep,
  splat:SplatStep, place:PlaceStep, dof:DofStep, export:ExportStep };

function App(){
  const [t,setTweak]=useTweaks(TWEAK_DEFAULTS);
  const [cur,setCur]=React.useState(0);
  const [maxReached,setMax]=React.useState(0);
  // per-step transient state
  const [flow,setFlow]=React.useState({ uploaded:false, placed:[], sel:null });
  const step=STEPS[cur];

  const setStepState=React.useCallback((updater)=>{
    setFlow(prev=>{
      const next=typeof updater==="function"?updater(prev):updater;
      return next;
    });
  },[]);

  React.useEffect(()=>{ document.documentElement.style.setProperty("--accent",t.accent); },[t.accent]);
  React.useEffect(()=>{ document.documentElement.style.setProperty("--grid-op",t.grid?"1":"0"); },[t.grid]);

  function go(dir){
    const ni=Math.max(0,Math.min(STEPS.length-1,cur+dir));
    setCur(ni); setMax(m=>Math.max(m,ni));
  }
  function jump(i){ if(i<=maxReached){ setCur(i); } }

  const Comp=STEP_COMPONENTS[step.id];
  const canNext = step.id==="upload" ? flow.uploaded : true;
  const isLast = cur===STEPS.length-1;

  return (
    <div className="grid-bg noise" style={{position:"relative",height:"100vh",display:"grid",
      gridTemplateColumns:"232px 1fr",gridTemplateRows:"auto 1fr auto",overflow:"hidden"}}>

      {/* top bar */}
      <header style={{gridColumn:"1 / -1",display:"flex",alignItems:"center",justifyContent:"space-between",
        padding:"0 28px",height:58,borderBottom:"1px solid var(--line)",position:"relative",zIndex:3,
        background:"var(--bg)"}}>
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          <span style={{fontFamily:"var(--mono)",fontWeight:600,letterSpacing:"0.18em",fontSize:14}}>
            REAL<span style={{color:"var(--accent)"}}>2</span>SIM</span>
          <span style={{width:1,height:18,background:"var(--line-2)"}} />
          <span className="tag">Port digital-twin pipeline</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:18}}>
          <span className="tag">SESSION <span style={{color:"var(--ink-dim)"}}>KT-2291</span></span>
          <span className="chip"><span className="dot" style={{background:"var(--good)"}} />GPU 4×A100</span>
        </div>
      </header>

      {/* left rail */}
      <aside style={{borderRight:"1px solid var(--line)",padding:"22px 14px",display:"flex",
        flexDirection:"column",justifyContent:"space-between",position:"relative",zIndex:3,
        background:"var(--bg-1)"}}>
        <div>
          <span className="tag" style={{padding:"0 12px",display:"block",marginBottom:14}}>Pipeline</span>
          <StepRail steps={STEPS} current={cur} maxReached={maxReached} onJump={jump} />
        </div>
        <div style={{padding:"0 12px",display:"flex",flexDirection:"column",gap:10}}>
          <hr className="hr" />
          <div style={{display:"flex",flexDirection:"column",gap:5}}>
            <span className="tag">Progress</span>
            <div style={{height:3,background:"var(--bg-3)",borderRadius:2,overflow:"hidden"}}>
              <div style={{height:"100%",width:`${(cur/(STEPS.length-1))*100}%`,background:"var(--accent)",
                transition:"width .4s ease"}} />
            </div>
            <span style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--ink-mute)"}}>
              STAGE {step.n} / {STEPS[STEPS.length-1].n}</span>
          </div>
        </div>
      </aside>

      {/* center stage */}
      <main style={{position:"relative",zIndex:1,overflow:"hidden",padding:"30px 40px"}}>
        <div key={step.id} style={{height:"100%"}}>
          <Comp step={step} t={t} state={flow} setState={setStepState}
            onBegin={()=>go(1)} />
        </div>
      </main>

      {/* footer nav */}
      <footer style={{gridColumn:"2 / -1",display:"flex",alignItems:"center",justifyContent:"space-between",
        padding:"0 40px",height:66,borderTop:"1px solid var(--line)",position:"relative",zIndex:3,
        background:"var(--bg)"}}>
        <button className="btn btn-ghost" onClick={()=>go(-1)} disabled={cur===0}>← Back</button>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          {STEPS.map((s,i)=>(
            <span key={s.id} onClick={()=>jump(i)} style={{width:i===cur?22:7,height:7,borderRadius:4,
              cursor:i<=maxReached?"pointer":"default",transition:"all .3s",
              background:i===cur?"var(--accent)":i<=maxReached?"var(--ink-faint)":"var(--bg-3)"}} />
          ))}
        </div>
        {isLast
          ? <button className="btn" onClick={()=>{setCur(0);setMax(0);setFlow({uploaded:false,placed:[],sel:null});}}>↺ Restart</button>
          : <button className="btn btn-primary" onClick={()=>go(1)} disabled={!canNext}>
              {step.id==="dof"?"Export rig":"Continue"} →</button>}
      </footer>

      {/* Tweaks */}
      <TweaksPanel>
        <TweakSection label="Accent" />
        <TweakColor label="Signal color" value={t.accent}
          options={["#e89b4c","#ff6a1a","#4cc8e8","#e8694c","#7fb069"]}
          onChange={v=>setTweak("accent",v)} />
        <TweakSection label="ASCII render" />
        <TweakSelect label="Glyph ramp" value={t.charset}
          options={["ascii","blocks","dense","binary","dots"]}
          onChange={v=>setTweak("charset",v)} />
        <TweakSlider label="Glyph density" value={t.cols} min={60} max={180} step={4} unit="col"
          onChange={v=>setTweak("cols",v)} />
        <TweakToggle label="Color glyphs" value={t.colorAscii} onChange={v=>setTweak("colorAscii",v)} />
        <TweakToggle label="Accent hot cells" value={t.tint} onChange={v=>setTweak("tint",v)} />
        <TweakSection label="3D" />
        <TweakSlider label="Splat count" value={t.splatCount} min={1200} max={4200} step={200}
          onChange={v=>setTweak("splatCount",v)} />
        <TweakSection label="Chrome" />
        <TweakToggle label="Scramble headlines" value={t.scramble} onChange={v=>setTweak("scramble",v)} />
        <TweakToggle label="Engineering grid" value={t.grid} onChange={v=>setTweak("grid",v)} />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
