// r2s-atoms.jsx — shared UI atoms for the wizard chrome.

// Glyph-scramble reveal for headline text (the "decoding" feel).
function ScrambleText({ text, active=true, speed=34, className="", style={} }){
  const [out,setOut]=React.useState(active?"":text);
  React.useEffect(()=>{
    if(!active){setOut(text);return;}
    const chars="ABCDEFGHJKLMNPRSTUVWXYZ0123456789#%*+=-<>/";
    let i=0,raf,last=0,done=false;
    const finish=()=>{ done=true; setOut(text); cancelAnimationFrame(raf); };
    const tick=(t)=>{
      if(done)return;
      if(t-last>speed){
        last=t; i+=1;
        const rev=Math.floor(i/2);
        setOut(text.split("").map((c,k)=>{
          if(c===" ")return" ";
          if(k<rev)return c;
          return chars[Math.floor(Math.random()*chars.length)];
        }).join(""));
        if(rev>=text.length){finish();return;}
      }
      raf=requestAnimationFrame(tick);
    };
    raf=requestAnimationFrame(tick);
    // guarantee the headline resolves even if rAF is throttled (bg tab / capture)
    const guard=setTimeout(finish, Math.max(900, text.length*70));
    return ()=>{cancelAnimationFrame(raf);clearTimeout(guard);};
  },[text,active,speed]);
  return <span className={className} style={style}>{out}</span>;
}

// Live terminal-style log that types in lines.
function PipeLog({ lines=[], active=true, accentLast=true }){
  const [shown,setShown]=React.useState(active?0:lines.length);
  React.useEffect(()=>{
    if(!active){setShown(lines.length);return;}
    setShown(0); let i=0;
    const iv=setInterval(()=>{ i++; setShown(i); if(i>=lines.length)clearInterval(iv); },360);
    return ()=>clearInterval(iv);
  },[lines,active]);
  return (
    <div style={{fontFamily:"var(--mono)",fontSize:11.5,lineHeight:1.85}}>
      {lines.slice(0,shown).map((l,i)=>{
        const done = i<shown-1 || shown>=lines.length;
        return (
          <div key={i} style={{display:"flex",gap:10,color: done?"var(--ink-mute)":"var(--ink)",
                                animation:"fadeIn .3s ease both"}}>
            <span style={{color:"var(--ink-faint)"}}>{String(i+1).padStart(2,"0")}</span>
            <span style={{color: done?"var(--good)":"var(--accent)"}}>{done?"OK":">>"}</span>
            <span style={{flex:1}}>{l}</span>
            {!done && <span className="cursor-blink" style={{color:"var(--accent)"}}>_</span>}
          </div>
        );
      })}
    </div>
  );
}

// Vertical step rail (persistent left nav, but flow is wizard-linear).
function StepRail({ steps, current, maxReached, onJump }){
  return (
    <nav style={{display:"flex",flexDirection:"column",gap:2}}>
      {steps.map((s,i)=>{
        const state = i===current?"on":(i<=maxReached?"done":"todo");
        const clickable = i<=maxReached;
        return (
          <button key={s.id} onClick={()=>clickable&&onJump(i)} disabled={!clickable}
            style={{all:"unset",cursor:clickable?"pointer":"default",
              display:"grid",gridTemplateColumns:"34px 1fr",alignItems:"center",gap:10,
              padding:"9px 12px",borderRadius:3,position:"relative",
              background: state==="on"?"var(--bg-2)":"transparent",
              opacity: state==="todo"?0.45:1, transition:"all .15s"}}
            onMouseEnter={e=>{if(clickable&&state!=="on")e.currentTarget.style.background="var(--bg-1)";}}
            onMouseLeave={e=>{if(state!=="on")e.currentTarget.style.background="transparent";}}>
            <span style={{fontFamily:"var(--mono)",fontSize:11,fontVariantNumeric:"tabular-nums",
              color: state==="on"?"var(--accent)":state==="done"?"var(--ink-mute)":"var(--ink-faint)"}}>
              {state==="done"&&i<current?"":""}{s.n}</span>
            <span style={{display:"flex",flexDirection:"column",lineHeight:1.25}}>
              <span style={{fontSize:12.5,color: state==="on"?"var(--ink)":"var(--ink-dim)",
                fontWeight: state==="on"?600:400}}>{s.label}</span>
            </span>
            {state==="on" && <span style={{position:"absolute",left:0,top:8,bottom:8,width:2,
              background:"var(--accent)",borderRadius:2}} />}
          </button>
        );
      })}
    </nav>
  );
}

// Small framed readout (label over big value).
function Readout({ label, value, sub, accent=false }){
  return (
    <div style={{display:"flex",flexDirection:"column",gap:3}}>
      <span className="tag">{label}</span>
      <span className="serif" style={{fontSize:26,lineHeight:1,color:accent?"var(--accent)":"var(--ink)",
        fontVariantNumeric:"tabular-nums"}}>{value}</span>
      {sub && <span style={{fontSize:11,color:"var(--ink-mute)"}}>{sub}</span>}
    </div>
  );
}

// Bracketed panel header.
function PanelHead({ idx, children, right }){
  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
      padding:"10px 14px",borderBottom:"1px solid var(--line)"}}>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        {idx && <span style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--accent)"}}>{idx}</span>}
        <span className="tag" style={{color:"var(--ink-dim)",letterSpacing:"0.18em"}}>{children}</span>
      </div>
      {right}
    </div>
  );
}

// Corner-bracket frame wrapper for canvas viewports.
function Viewport({ children, label, badge, style={} }){
  return (
    <div style={{position:"relative",border:"1px solid var(--line)",background:"#0f0d0a",
      borderRadius:3,overflow:"hidden",...style}}>
      {children}
      {["tl","tr","bl","br"].map(c=>{
        const pos={tl:{top:8,left:8},tr:{top:8,right:8},bl:{bottom:8,left:8},br:{bottom:8,right:8}}[c];
        const b=c[0]==="t"?"borderTop":"borderBottom"; const s=c[1]==="l"?"borderLeft":"borderRight";
        return <span key={c} style={{position:"absolute",width:12,height:12,
          [b]:"1px solid var(--accent-line)",[s]:"1px solid var(--accent-line)",...pos,opacity:0.7}} />;
      })}
      {label && <span style={{position:"absolute",bottom:10,left:14,fontFamily:"var(--mono)",
        fontSize:10,letterSpacing:"0.18em",textTransform:"uppercase",color:"var(--ink-mute)"}}>{label}</span>}
      {badge && <span style={{position:"absolute",top:10,right:14}}>{badge}</span>}
    </div>
  );
}

function Sev({ s }){
  const map={critical:"var(--bad)",high:"var(--warn)",moderate:"var(--ink-mute)"};
  return <span style={{display:"inline-flex",alignItems:"center",gap:6,fontSize:10,
    letterSpacing:"0.1em",textTransform:"uppercase",color:map[s]||"var(--ink-mute)"}}>
    <span style={{width:6,height:6,borderRadius:1,background:map[s]||"var(--ink-mute)"}} />{s}</span>;
}

Object.assign(window,{ ScrambleText, PipeLog, StepRail, Readout, PanelHead, Viewport, Sev });
