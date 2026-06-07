// r2s-steps2.jsx — wizard screens 04–07 (Splat, Place, Rig/DOF, Handoff).

// 04 — SPLAT FIELD -------------------------------------------------------------
function SplatStep({ step, t, state, setState }){
  React.useEffect(()=>{ const id=setTimeout(()=>setState(s=>s.canNext?s:({...s,canNext:true})),2400); return ()=>clearTimeout(id); },[]);
  const proxies=[
    {m:"crane",k:"sts_quay.glb",v:"184k"},{m:"vessel",k:"feeder_hull.glb",v:"310k"},
    {m:"rtg",k:"rtg_yard.glb",v:"96k"},{m:"agv",k:"agv_unit.glb",v:"42k"},
  ];
  return (
    <div style={{display:"grid",gridTemplateColumns:"1fr 340px",gap:40,height:"100%"}} className="reveal">
      <div style={{display:"flex",flexDirection:"column"}}>
        <StepTitle step={step} t={t} />
        <Viewport label="gaussian splat field · 2.6M primitives" style={{flex:1,minHeight:0}}
          badge={<span className="chip"><span className="dot"/>3DGS</span>}>
          <SplatCanvas src={SCENE_IMG} count={t.splatCount} />
        </Viewport>
      </div>
      <aside style={{display:"flex",flexDirection:"column",gap:16,paddingTop:96}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:18}}>
          <Readout label="Splats" value="2.6M" sub="densified" accent />
          <Readout label="Mesh proxies" value="4" sub="collision-ready" />
        </div>
        <hr className="hr" />
        <span className="tag">Extracted meshes</span>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {proxies.map(p=>(
            <div key={p.k} style={{display:"grid",gridTemplateColumns:"56px 1fr auto",gap:12,
              alignItems:"center",border:"1px solid var(--line)",borderRadius:3,padding:"6px 10px 6px 6px"}}>
              <div style={{height:42,background:"#0f0d0a",borderRadius:2,overflow:"hidden"}}>
                <WireViewer model={p.m} ground={false} speed={0.01} fit={0.9} />
              </div>
              <span style={{fontFamily:"var(--mono)",fontSize:11.5,color:"var(--ink-dim)"}}>{p.k}</span>
              <span style={{fontFamily:"var(--mono)",fontSize:10.5,color:"var(--ink-mute)"}}>{p.v} △</span>
            </div>
          ))}
        </div>
        <PipeLog lines={PIPELINE_LOG.splat} active={true} />
      </aside>
    </div>
  );
}

// 05 — ASSET PLACE -------------------------------------------------------------
function PlaceStep({ step, t, state, setState }){
  const placed=state.placed;
  const sel=state.sel;
  function place(id){
    setState(s=>{
      const has=s.placed.includes(id);
      const np=has?s.placed:[...s.placed,id];
      return {...s,placed:np,sel:id,canNext:np.length>0};
    });
  }
  const selMesh=MESH_LIBRARY.find(m=>m.id===(sel||placed[placed.length-1]))||MESH_LIBRARY[0];
  return (
    <div style={{display:"grid",gridTemplateColumns:"1fr 340px",gap:40,height:"100%"}} className="reveal">
      <div style={{display:"flex",flexDirection:"column"}}>
        <StepTitle step={step} t={t} />
        <Viewport label={`scene · ${placed.length} asset${placed.length===1?"":"s"} placed`} style={{flex:1,minHeight:0}}
          badge={<span className="chip"><span className="dot"/>{selMesh.code}</span>}>
          <div style={{position:"absolute",inset:0,opacity:0.42}}>
            <SplatCanvas src={SCENE_IMG} count={Math.round(t.splatCount*0.6)} />
          </div>
          {placed.length>0
            ? <div style={{position:"absolute",inset:0}}>
                <WireViewer model={selMesh.model} ground={true} interactive={true} fit={1.05} />
              </div>
            : <div style={{position:"absolute",inset:0,display:"grid",placeItems:"center"}}>
                <span style={{fontSize:12.5,color:"var(--ink-mute)",textAlign:"center"}}>
                  Select an asset from the library →<br/><span className="tag">drop it onto the reconstructed quay</span>
                </span>
              </div>}
        </Viewport>
        {placed.length>0 && <span className="tag" style={{marginTop:12}}>drag viewport to orbit · click library to add more</span>}
      </div>
      <aside style={{display:"flex",flexDirection:"column",gap:14,paddingTop:96,minHeight:0}}>
        <span className="tag">Equipment mesh library</span>
        <div style={{display:"flex",flexDirection:"column",gap:8,overflowY:"auto",paddingRight:4}}>
          {MESH_LIBRARY.map(m=>{
            const on=placed.includes(m.id);
            return (
              <button key={m.id} onClick={()=>place(m.id)}
                style={{all:"unset",cursor:"pointer",display:"grid",gridTemplateColumns:"64px 1fr auto",
                  gap:12,alignItems:"center",border:`1px solid ${sel===m.id?"var(--accent-line)":"var(--line)"}`,
                  borderRadius:3,padding:8,background:sel===m.id?"var(--bg-2)":"transparent",transition:"all .15s"}}
                onMouseEnter={e=>{if(sel!==m.id)e.currentTarget.style.borderColor="var(--line-2)";}}
                onMouseLeave={e=>{if(sel!==m.id)e.currentTarget.style.borderColor="var(--line)";}}>
                <div style={{height:48,background:"#0f0d0a",borderRadius:2,overflow:"hidden"}}>
                  <WireViewer model={m.model} ground={false} speed={0.012} fit={0.85} />
                </div>
                <span style={{display:"flex",flexDirection:"column",gap:3,minWidth:0}}>
                  <span style={{fontSize:12.5,color:"var(--ink)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.name}</span>
                  <span style={{display:"flex",gap:6}}>
                    {m.tags.map(tg=><span key={tg} style={{fontFamily:"var(--mono)",fontSize:9,letterSpacing:"0.08em",
                      textTransform:"uppercase",color: tg==="critical"?"var(--bad)":"var(--ink-mute)"}}>{tg}</span>)}
                  </span>
                </span>
                <span style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:3}}>
                  <span style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--ink-mute)"}}>{m.dof} DOF</span>
                  <span style={{fontSize:10,color:on?"var(--good)":"var(--accent)",fontFamily:"var(--mono)",
                    letterSpacing:"0.08em"}}>{on?"✓ PLACED":"+ PLACE"}</span>
                </span>
              </button>
            );
          })}
        </div>
        <p style={{margin:0,fontSize:11.5,lineHeight:1.6,color:"var(--ink-mute)"}}>
          // Dynamic assets carry degrees of freedom. Next, rig the selected crane so it can move —
          and fail — under control.
        </p>
      </aside>
    </div>
  );
}

// 06 — RIG / DOF ---------------------------------------------------------------
function DofStep({ step, t, state, setState }){
  const [joints,setJoints]=React.useState(()=>Object.fromEntries(CRANE_JOINTS.map(j=>[j.id,j.def])));
  const [axes,setAxes]=React.useState(()=>Object.fromEntries(CRANE_JOINTS.map(j=>[j.id,j.axis])));
  const [hi,setHi]=React.useState(null);
  React.useEffect(()=>{ if(!state.canNext)setState(s=>({...s,canNext:true})); },[]);
  // normalize joint value to the WireViewer's expected ranges
  const rig=React.useMemo(()=>({
    gantry: joints.gantry,
    luff:   axes.luff==="fixed"?0:joints.luff,
    trolley:(joints.trolley)/100,
    hoist:  (joints.hoist)/100,
    yaw:    axes.yaw==="fixed"?0:joints.yaw,
  }),[joints,axes]);
  const activeDof=CRANE_JOINTS.filter(j=>axes[j.id]!=="fixed").length;
  const AX=["revolute","prismatic","fixed"];
  return (
    <div style={{display:"grid",gridTemplateColumns:"1fr 372px",gap:40,height:"100%"}} className="reveal">
      <div style={{display:"flex",flexDirection:"column"}}>
        <StepTitle step={step} t={t} />
        <Viewport label="STS-04 · live kinematic preview" style={{flex:1,minHeight:0}}
          badge={<span className="chip"><span className="dot"/>{activeDof} ACTIVE DOF</span>}>
          <WireViewer model="crane" joints={rig} highlight={hi} ground={true} interactive={true} fit={0.92} />
        </Viewport>
        <span className="tag" style={{marginTop:12}}>drag to orbit · adjust joints → rig responds in realtime</span>
      </div>
      <aside style={{display:"flex",flexDirection:"column",gap:14,paddingTop:96,minHeight:0}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline"}}>
          <span className="tag">Joint tree — Ship-to-Shore Crane</span>
          <span style={{fontFamily:"var(--mono)",fontSize:11,color:"var(--accent)"}}>{activeDof}/5</span>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:10,overflowY:"auto",paddingRight:4}}>
          {CRANE_JOINTS.map(j=>{
            const fixed=axes[j.id]==="fixed";
            return (
              <div key={j.id} onMouseEnter={()=>setHi(j.id)} onMouseLeave={()=>setHi(null)}
                style={{border:`1px solid ${hi===j.id?"var(--accent-line)":"var(--line)"}`,borderRadius:3,
                  padding:"11px 12px",display:"flex",flexDirection:"column",gap:9,transition:"border-color .15s",
                  opacity:fixed?0.6:1}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{width:7,height:7,borderRadius:axes[j.id]==="revolute"?"50%":"1px",
                      background: fixed?"var(--ink-faint)":"var(--accent)"}} />
                    <span style={{fontSize:12.5,color:"var(--ink)"}}>{j.name}</span>
                  </span>
                  <span style={{fontFamily:"var(--mono)",fontSize:11,color:"var(--ink-dim)",fontVariantNumeric:"tabular-nums"}}>
                    {fixed?"locked":`${j.id==="trolley"||j.id==="hoist"?Math.round(joints[j.id]):joints[j.id]}${j.unit==="%"?"%":" "+j.unit}`}</span>
                </div>
                <input type="range" min={j.min} max={j.max} value={joints[j.id]} disabled={fixed}
                  onChange={e=>setJoints(s=>({...s,[j.id]:+e.target.value}))}
                  style={{width:"100%",accentColor:"var(--accent)",opacity:fixed?0.4:1}} />
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--ink-mute)"}}>{j.drive}</span>
                  <div style={{display:"flex",gap:0,border:"1px solid var(--line)",borderRadius:3,overflow:"hidden"}}>
                    {AX.map(a=>(
                      <button key={a} onClick={()=>setAxes(s=>({...s,[j.id]:a}))}
                        style={{all:"unset",cursor:"pointer",padding:"3px 8px",fontFamily:"var(--mono)",fontSize:9,
                          letterSpacing:"0.06em",textTransform:"uppercase",
                          background:axes[j.id]===a?"var(--accent)":"transparent",
                          color:axes[j.id]===a?"#1b1206":"var(--ink-mute)"}}>{a.slice(0,4)}</button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </aside>
    </div>
  );
}

// 07 — HANDOFF -----------------------------------------------------------------
function ExportStep({ step, t, state }){
  const URL="https://www.urdfstudio.com/";
  const [count,setCount]=React.useState(5);
  const [auto,setAuto]=React.useState(true);
  const [phase,setPhase]=React.useState(0); // 0 packaging, 1 ready
  React.useEffect(()=>{ const id=setTimeout(()=>setPhase(1),1700); return ()=>clearTimeout(id); },[]);
  React.useEffect(()=>{
    if(phase<1||!auto)return;
    if(count<=0){ window.open(URL,"_blank","noopener"); setAuto(false); return; }
    const id=setTimeout(()=>setCount(c=>c-1),1000); return ()=>clearTimeout(id);
  },[phase,auto,count]);
  const pkg=["scene_graph.usd","splat_field.ply","sts_quay.urdf","joints.yaml","collision.obj","scenario_pack.json"];
  return (
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:48,height:"100%",alignItems:"center"}} className="reveal">
      <div style={{display:"flex",flexDirection:"column",gap:24,maxWidth:480}}>
        <StepTitle step={step} t={t} />
        <div style={{border:"1px solid var(--line)",borderRadius:3,overflow:"hidden"}}>
          <PanelHead idx="//" right={<span className="chip"><span className="dot"/>{phase?"READY":"PACKAGING"}</span>}>URDF export bundle</PanelHead>
          <div style={{padding:"6px 0"}}>
            {pkg.map((f,i)=>(
              <div key={f} style={{display:"grid",gridTemplateColumns:"28px 1fr auto",gap:12,alignItems:"center",
                padding:"7px 14px",animation:`fadeIn .4s ${i*0.12}s both`}}>
                <span style={{color:"var(--good)",fontFamily:"var(--mono)",fontSize:11}}>OK</span>
                <span style={{fontFamily:"var(--mono)",fontSize:12,color:"var(--ink-dim)"}}>{f}</span>
                <span style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--ink-mute)"}}>{(Math.random()*900+80|0)} KB</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:16}}>
          <a className="btn btn-primary" href={URL} target="_blank" rel="noopener"
             onClick={()=>setAuto(false)}>Open URDF Studio →</a>
          {auto&&phase===1
            ? <span className="tag">auto-redirecting in <span style={{color:"var(--accent)"}}>{count}s</span> · <button onClick={()=>setAuto(false)} style={{all:"unset",cursor:"pointer",color:"var(--ink-dim)",borderBottom:"1px solid var(--line-2)"}}>cancel</button></span>
            : <span className="tag">{phase?"handoff ready":"finalizing bundle…"}</span>}
        </div>
      </div>
      <Viewport label="urdfstudio.com · rigged crane handoff" style={{height:"min(64vh,520px)"}}
        badge={<span className="chip"><span className="dot"/>EXPORT</span>}>
        <div style={{position:"absolute",inset:0,opacity:0.3}}><SplatCanvas src={SCENE_IMG} count={1400} /></div>
        <div style={{position:"absolute",inset:0}}>
          <WireViewer model="crane" joints={{gantry:0,luff:34,trolley:0.55,hoist:0.32,yaw:8}} ground={true} speed={0.004} />
        </div>
        {phase===1 && <div style={{position:"absolute",inset:0,display:"grid",placeItems:"center",
          background:"radial-gradient(circle at 50% 60%, transparent 40%, rgba(20,17,13,0.55))"}}>
          <div style={{textAlign:"center",animation:"fadeIn .6s both"}}>
            <div className="serif" style={{fontSize:22,color:"var(--ink)"}}>Rig complete</div>
            <div className="tag" style={{marginTop:6}}>5 DOF · 2.6M splats · 5 assets</div>
          </div>
        </div>}
      </Viewport>
    </div>
  );
}

Object.assign(window,{ SplatStep, PlaceStep, DofStep, ExportStep });
