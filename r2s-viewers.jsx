// r2s-viewers.jsx — canvas 3D wireframe viewers + gaussian-splat field.
// A tiny projector (yaw/pitch + perspective), parametric port-equipment
// models, a WireViewer that renders them, and a SplatCanvas that turns the
// source image into a rotating colored point/ellipse field.

// ── projector ────────────────────────────────────────────────────────────
function project(p, yaw, pitch, f) {
  const cy=Math.cos(yaw), sy=Math.sin(yaw);
  let x = p[0]*cy + p[2]*sy;
  let z = -p[0]*sy + p[2]*cy;
  const cx=Math.cos(pitch), sx=Math.sin(pitch);
  let y = p[1]*cx - z*sx;
  z = p[1]*sx + z*cx;
  const s = f/(f - z);
  return { x: x*s, y: -y*s, z, s };
}

// ── models ───────────────────────────────────────────────────────────────
// Each builder returns { segs:[[a,b,kind]], nodes:{} }. kind ∈
// frame|brace|cable|rail|payload|hi.  Coordinates ~meters, Y up.
function box(cx,cy,cz,w,h,d,kind="frame"){
  const x0=cx-w/2,x1=cx+w/2,y0=cy-h/2,y1=cy+h/2,z0=cz-d/2,z1=cz+d/2;
  const c=[[x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1],[x0,y1,z0],[x1,y1,z0],[x1,y1,z1],[x0,y1,z1]];
  const e=[[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
  return e.map(([a,b])=>[c[a],c[b],kind]);
}
function rotY(p,a,o=[0,0,0]){
  const c=Math.cos(a),s=Math.sin(a),x=p[0]-o[0],z=p[2]-o[2];
  return [o[0]+x*c+z*s, p[1], o[2]-x*s+z*c];
}

// Ship-to-shore (STS) quay crane, fully parametric on joints.
function buildCrane(j){
  const segs=[]; const gz = j.gantry||0;   // gantry travel along quay (Z)
  const T=(p)=>[p[0], p[1], p[2]+gz];
  const legX=4.2, baseZ=-3, frontZ=3, H=15;
  // four legs + portal
  const corners=[[-legX,baseZ],[legX,baseZ],[-legX,frontZ],[legX,frontZ]];
  corners.forEach(([x,z])=>segs.push([T([x,0,z]),T([x,H,z]),"frame"]));
  // sill beams (rails footprint)
  segs.push([T([-legX,0,baseZ]),T([-legX,0,frontZ]),"frame"]);
  segs.push([T([legX,0,baseZ]),T([legX,0,frontZ]),"frame"]);
  // portal top frame
  const top=[[-legX,baseZ],[legX,baseZ],[legX,frontZ],[-legX,frontZ]];
  for(let i=0;i<4;i++){const a=top[i],b=top[(i+1)%4];segs.push([T([a[0],H,a[1]]),T([b[0],H,b[1]]),"frame"]);}
  // leg cross-braces
  segs.push([T([-legX,0,baseZ]),T([-legX,H,frontZ]),"brace"]);
  segs.push([T([legX,0,frontZ]),T([legX,H,baseZ]),"brace"]);
  // A-frame apex
  const apex=[0,H+7,0];
  segs.push([T([-legX,H,baseZ]),T(apex),"frame"]);
  segs.push([T([legX,H,baseZ]),T(apex),"frame"]);
  segs.push([T([-legX,H,frontZ]),T(apex),"frame"]);
  segs.push([T([legX,H,frontZ]),T(apex),"frame"]);
  // boom: pivots at waterside top, luffs up by angle
  const a = (j.luff||0)*Math.PI/180;
  const pivot=[-legX,H, (baseZ+frontZ)/2];
  const L=22;
  const far=[pivot[0]-L*Math.cos(a), pivot[1]+L*Math.sin(a), pivot[2]];
  segs.push([T(pivot),T(far),"frame"]);
  segs.push([T([pivot[0],H-1.4,baseZ+1]),T([far[0],far[1]-1.4,baseZ+1]),"frame"]);
  segs.push([T([pivot[0],H-1.4,frontZ-1]),T([far[0],far[1]-1.4,frontZ-1]),"frame"]);
  // boom truss zig-zag
  const seg=8;
  for(let i=0;i<seg;i++){
    const t0=i/seg,t1=(i+1)/seg;
    const lerp=(t)=>[pivot[0]+(far[0]-pivot[0])*t, pivot[1]+(far[1]-pivot[1])*t, baseZ+1];
    const lerp2=(t)=>[pivot[0]+(far[0]-pivot[0])*t, pivot[1]-1.4+(far[1]-pivot[1])*t, frontZ-1];
    segs.push([T(lerp(t0)),T(lerp2(t1)),"brace"]);
  }
  // tie-back stays apex->far
  segs.push([T(apex),T(far),"cable"]);
  // landside back-reach
  const back=[legX+9,H,(baseZ+frontZ)/2];
  segs.push([T(pivot),T(back),"frame"]);
  segs.push([T(apex),T(back),"cable"]);
  // trolley along boom line (only horizontal travel portion)
  const tp=Math.max(0,Math.min(1,j.trolley??0.4));
  const tx=pivot[0]+(far[0]-pivot[0])*tp, ty=pivot[1]+(far[1]-pivot[1])*tp, tz=pivot[2];
  segs.push(...box(tx,ty+0.6,tz,1.6,1.2,3.2,"hi"));
  // hoist cables + spreader
  const drop=(j.hoist??0.5)*(ty-1.5);
  const sy_=ty-drop;
  [-0.7,0.7].forEach(o=>{segs.push([T([tx-0.7,ty,tz+o]),T([tx-0.7,sy_+0.4,tz+o]),"cable"]);
    segs.push([T([tx+0.7,ty,tz+o]),T([tx+0.7,sy_+0.4,tz+o]),"cable"]);});
  // spreader + container, yawed
  const yaw=(j.yaw||0)*Math.PI/180; const o=[tx,0,tz];
  const sp=box(tx,sy_,tz,2.6,0.5,6.0,"payload").map(([p,q,k])=>[rotY(p,yaw,o),rotY(q,yaw,o),k]);
  const ct=box(tx,sy_-1.0,tz,2.4,1.7,6.0,"payload").map(([p,q,k])=>[rotY(p,yaw,o),rotY(q,yaw,o),k]);
  segs.push(...sp.map(s=>[T(s[0]),T(s[1]),s[2]]));
  segs.push(...ct.map(s=>[T(s[0]),T(s[1]),s[2]]));
  // gantry rails (static, full length)
  segs.push([[-legX,0,-16],[-legX,0,16],"rail"]);
  segs.push([[legX,0,-16],[legX,0,16],"rail"]);
  const nodes={
    gantry:T([legX,0.2,frontZ]), luff:T(pivot), trolley:T([tx,ty+1.4,tz]),
    hoist:T([tx,sy_,tz]), yaw:T([tx,sy_-1.0,tz]),
  };
  return {segs,nodes};
}

function buildRTG(){
  const s=[]; const W=7,H=12,D=5;
  [[-W/2,-D/2],[W/2,-D/2],[-W/2,D/2],[W/2,D/2]].forEach(([x,z])=>s.push([[x,0,z],[x,H,z],"frame"]));
  const top=[[-W/2,-D/2],[W/2,-D/2],[W/2,D/2],[-W/2,D/2]];
  for(let i=0;i<4;i++){const a=top[i],b=top[(i+1)%4];s.push([[a[0],H,a[1]],[b[0],H,b[1]],"frame"]);}
  s.push([[-W/2,0,-D/2],[-W/2,H,D/2],"brace"]);
  s.push([[W/2,0,D/2],[W/2,H,-D/2],"brace"]);
  s.push(...box(0,H-1,0,2,1,D,"hi"));
  s.push([[0,H-1.5,0],[0,3,0],"cable"]);
  s.push(...box(0,2.2,0,2.4,1.7,6,"payload"));
  return {segs:s,nodes:{}};
}
function buildAGV(){
  const s=box(0,1.0,0,4,1.4,8,"frame");
  s.push(...box(0,2.6,0,3.6,1.4,6,"payload"));
  [[-1.6,-3],[1.6,-3],[-1.6,3],[1.6,3]].forEach(([x,z])=>s.push(...box(x,0.5,z,0.8,1,1.4,"hi")));
  return {segs:s,nodes:{}};
}
function buildContainer(){ return {segs:box(0,2,0,5,4,12,"payload"),nodes:{}}; }
function buildVessel(){
  const s=[]; const L=26,B=7,H=4;
  // hull (trapezoid prism)
  const hull=[[-L/2,0,0],[L/2-2,0,0]];
  s.push(...box(0,H/2,0,L-4,H,B,"frame"));
  // bow taper
  s.push([[L/2-2,0,-B/2],[L/2+3,H*0.6,0],"frame"]);
  s.push([[L/2-2,0,B/2],[L/2+3,H*0.6,0],"frame"]);
  s.push([[L/2-2,H,-B/2],[L/2+3,H*0.6,0],"frame"]);
  s.push([[L/2-2,H,B/2],[L/2+3,H*0.6,0],"frame"]);
  // container stacks on deck
  for(let i=-2;i<=2;i++) s.push(...box(i*4,H+1.6,0,3.4,3,B-1.4,"payload"));
  // bridge
  s.push(...box(-L/2+4,H+3,0,3,4,B-1,"hi"));
  return {segs:s,nodes:{}};
}
const MODELS={ crane:buildCrane, rtg:buildRTG, agv:buildAGV, container:buildContainer, vessel:buildVessel };

// ── WireViewer ─────────────────────────────────────────────────────────────
function WireViewer({ model="crane", joints=null, highlight=null, autoRotate=true,
                      ground=true, speed=0.0025, interactive=false, fit=1, className="", style={} }){
  const wrapRef=React.useRef(null), cvRef=React.useRef(null);
  const dragRef=React.useRef({on:false,yaw:0.7,pitch:0.32,lx:0,ly:0,auto:autoRotate});
  React.useEffect(()=>{
    const wrap=wrapRef.current, cv=cvRef.current; if(!wrap||!cv) return;
    const ctx=cv.getContext("2d"); const dpr=Math.min(2,window.devicePixelRatio||1);
    let raf; const st=dragRef.current; st.auto=autoRotate;
    function frame(){
      const W=wrap.clientWidth,H=wrap.clientHeight;
      if(!W||!H){raf=requestAnimationFrame(frame);return;}
      cv.width=W*dpr;cv.height=H*dpr;cv.style.width=W+"px";cv.style.height=H+"px";
      ctx.setTransform(dpr,0,0,dpr,0,0); ctx.clearRect(0,0,W,H);
      if(st.auto) st.yaw+=speed;
      const built = (MODELS[model]||buildContainer)(joints||{});
      let segs=built.segs.slice();
      const css=getComputedStyle(document.documentElement);
      const accent=css.getPropertyValue("--accent").trim()||"#e89b4c";
      // bounds
      let mnx=1e9,mxx=-1e9,mny=1e9,mxy=-1e9,mnz=1e9,mxz=-1e9;
      segs.forEach(([a,b])=>{[a,b].forEach(p=>{mnx=Math.min(mnx,p[0]);mxx=Math.max(mxx,p[0]);mny=Math.min(mny,p[1]);mxy=Math.max(mxy,p[1]);mnz=Math.min(mnz,p[2]);mxz=Math.max(mxz,p[2]);});});
      const cx=(mnx+mxx)/2,cyc=(mny+mxy)/2,cz=(mnz+mxz)/2;
      const span=Math.max(mxx-mnx,mxy-mny,mxz-mnz)||1;
      const f=620; const S=(Math.min(W,H)/span)*0.62*fit;
      const ox=W/2, oy=H*0.56;
      if(ground){
        ctx.strokeStyle="rgba(236,231,222,0.06)";ctx.lineWidth=1;
        for(let i=-6;i<=6;i++){
          const a=project([i*3-cx,-cyc,-18-cz],st.yaw,st.pitch,f), b=project([i*3-cx,-cyc,18-cz],st.yaw,st.pitch,f);
          ctx.beginPath();ctx.moveTo(ox+a.x*S,oy+a.y*S);ctx.lineTo(ox+b.x*S,oy+b.y*S);ctx.stroke();
          const c=project([-18-cx,-cyc,i*3-cz],st.yaw,st.pitch,f), d=project([18-cx,-cyc,i*3-cz],st.yaw,st.pitch,f);
          ctx.beginPath();ctx.moveTo(ox+c.x*S,oy+c.y*S);ctx.lineTo(ox+d.x*S,oy+d.y*S);ctx.stroke();
        }
      }
      // depth sort
      const drawn=segs.map(([a,b,k])=>{
        const pa=project([a[0]-cx,a[1]-cyc,a[2]-cz],st.yaw,st.pitch,f);
        const pb=project([b[0]-cx,b[1]-cyc,b[2]-cz],st.yaw,st.pitch,f);
        return {pa,pb,k,z:(pa.z+pb.z)/2};
      }).sort((m,n)=>m.z-n.z);
      const styleFor={
        frame:["rgba(236,231,222,0.62)",1.1],
        brace:["rgba(236,231,222,0.26)",0.8],
        cable:["rgba(232,155,76,0.45)",0.8],
        rail:["rgba(236,231,222,0.18)",1.0],
        payload:[accent,1.3],
        hi:["rgba(236,231,222,0.85)",1.4],
      };
      drawn.forEach(({pa,pb,k})=>{
        const [col,lw]=styleFor[k]||styleFor.frame;
        ctx.strokeStyle=col;ctx.lineWidth=lw;ctx.beginPath();
        ctx.moveTo(ox+pa.x*S,oy+pa.y*S);ctx.lineTo(ox+pb.x*S,oy+pb.y*S);ctx.stroke();
      });
      // joint nodes
      if(built.nodes){
        Object.entries(built.nodes).forEach(([id,p])=>{
          const pr=project([p[0]-cx,p[1]-cyc,p[2]-cz],st.yaw,st.pitch,f);
          const on=highlight===id;
          ctx.beginPath();ctx.arc(ox+pr.x*S,oy+pr.y*S,on?5.5:3.2,0,7);
          ctx.fillStyle=on?accent:"rgba(236,231,222,0.5)";ctx.fill();
          if(on){ctx.beginPath();ctx.arc(ox+pr.x*S,oy+pr.y*S,10,0,7);ctx.strokeStyle=accent;ctx.lineWidth=1;ctx.globalAlpha=0.5;ctx.stroke();ctx.globalAlpha=1;}
        });
      }
      raf=requestAnimationFrame(frame);
    }
    frame(); // synchronous first draw — robust to rAF throttling / bg tabs
    let cleanup=()=>{};
    if(interactive){
      const down=(e)=>{st.on=true;st.auto=false;st.lx=e.clientX;st.ly=e.clientY;};
      const move=(e)=>{if(!st.on)return;st.yaw+=(e.clientX-st.lx)*0.01;st.pitch=Math.max(-0.2,Math.min(0.9,st.pitch+(e.clientY-st.ly)*0.006));st.lx=e.clientX;st.ly=e.clientY;};
      const up=()=>{st.on=false;};
      cv.addEventListener("pointerdown",down);window.addEventListener("pointermove",move);window.addEventListener("pointerup",up);
      cv.style.cursor="grab";
      cleanup=()=>{cv.removeEventListener("pointerdown",down);window.removeEventListener("pointermove",move);window.removeEventListener("pointerup",up);};
    }
    return ()=>{cancelAnimationFrame(raf);cleanup();};
  },[model,joints,highlight,autoRotate,ground,speed,interactive,fit]);
  return <div ref={wrapRef} className={className} style={{position:"relative",width:"100%",height:"100%",...style}}>
    <canvas ref={cvRef} style={{display:"block",width:"100%",height:"100%"}} />
  </div>;
}

// ── SplatCanvas ──────────────────────────────────────────────────────────
// Samples the image to N colored points placed on a pseudo-depth surface, then
// rotates the field slowly — reads as a gaussian-splat capture.
function SplatCanvas({ src, count=2600, className="", style={}, autoRotate=true }){
  const wrapRef=React.useRef(null), cvRef=React.useRef(null), ptsRef=React.useRef(null);
  const [ready,setReady]=React.useState(false);
  React.useEffect(()=>{
    let alive=true;
    loadImage(src).then((img)=>{
      if(!alive)return;
      const cols=90, rows=Math.round(cols*img.height/img.width);
      const c=document.createElement("canvas");c.width=cols;c.height=rows;
      const x=c.getContext("2d",{willReadFrequently:true});x.drawImage(img,0,0,cols,rows);
      const d=x.getImageData(0,0,cols,rows).data;
      const pts=[];
      for(let i=0;i<count;i++){
        const px=Math.floor(Math.random()*cols), py=Math.floor(Math.random()*rows);
        const k=(py*cols+px)*4; const r=d[k],g=d[k+1],b=d[k+2];
        const lum=(0.299*r+0.587*g+0.114*b)/255;
        // depth from vertical position + luminance (brighter/lower = nearer)
        const wx=(px/cols-0.5)*40;
        const wy=(0.5-py/rows)*40*(rows/cols);
        const wz=(lum-0.5)*10 + (py/rows-0.5)*14;
        pts.push({p:[wx,wy*0.5-4,wz],c:`rgb(${r},${g},${b})`,s:1+lum*1.6});
      }
      ptsRef.current=pts;
      setReady(true);
    });
    return ()=>{alive=false;};
  },[src,count]);
  React.useEffect(()=>{
    const wrap=wrapRef.current,cv=cvRef.current;if(!wrap||!cv)return;
    const ctx=cv.getContext("2d");const dpr=Math.min(2,window.devicePixelRatio||1);
    let raf,yaw=0.2;
    function frame(){
      const W=wrap.clientWidth,H=wrap.clientHeight;
      if(!W||!H||!ptsRef.current){raf=requestAnimationFrame(frame);return;}
      cv.width=W*dpr;cv.height=H*dpr;cv.style.width=W+"px";cv.style.height=H+"px";
      ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,W,H);
      if(autoRotate)yaw+=0.0016;
      const f=520,S=Math.min(W,H)/44,ox=W/2,oy=H/2;
      const pr=ptsRef.current.map(pt=>{const q=project(pt.p,Math.sin(yaw)*0.5+0.2,0.18,f);return{...q,c:pt.c,s:pt.s};}).sort((a,b)=>a.z-b.z);
      ctx.globalCompositeOperation="lighter";
      pr.forEach(q=>{
        const r=q.s*q.s*0.9;
        ctx.globalAlpha=0.5;ctx.fillStyle=q.c;
        ctx.beginPath();ctx.arc(ox+q.x*S,oy+q.y*S,r,0,7);ctx.fill();
      });
      ctx.globalAlpha=1;ctx.globalCompositeOperation="source-over";
      raf=requestAnimationFrame(frame);
    }
    frame(); // synchronous first draw once points are ready
    return ()=>cancelAnimationFrame(raf);
  },[autoRotate,ready]);
  return <div ref={wrapRef} className={className} style={{position:"relative",width:"100%",height:"100%",...style}}>
    <canvas ref={cvRef} style={{display:"block",width:"100%",height:"100%"}} />
  </div>;
}

Object.assign(window,{ WireViewer, SplatCanvas, MODELS, buildCrane });
