// r2s-data.jsx — pipeline definition, equipment mesh library, DOF presets.

const STEPS = [
  { id:"intro",    n:"00", label:"Brief",        title:"Rehearse the failure before it happens" },
  { id:"upload",   n:"01", label:"Capture",      title:"Ingest one image of the terminal" },
  { id:"clean",    n:"02", label:"Clean Plate",  title:"Strip transient & irrelevant detail" },
  { id:"backdrop", n:"03", label:"Backdrop",     title:"Reconstruct the static environment" },
  { id:"splat",    n:"04", label:"Splat Field",  title:"Lift to 3D — gaussian splats & meshes" },
  { id:"place",    n:"05", label:"Asset Place",  title:"Drop equipment meshes into the scene" },
  { id:"dof",      n:"06", label:"Rig / DOF",    title:"Assign degrees of freedom per asset" },
  { id:"export",   n:"07", label:"Handoff",      title:"Export rig to URDF Studio" },
];

// Port-equipment "object meshes" the user places into the reconstructed scene.
const MESH_LIBRARY = [
  { id:"sts",  model:"crane",     name:"Ship-to-Shore Crane", code:"STS-04",
    tris:"184k", dof:5, note:"Quay container gantry", tags:["dynamic","critical"] },
  { id:"rtg",  model:"rtg",       name:"RTG Yard Crane",      code:"RTG-12",
    tris:"96k",  dof:3, note:"Rubber-tyred gantry",  tags:["dynamic"] },
  { id:"agv",  model:"agv",       name:"Automated Guided Veh.",code:"AGV-27",
    tris:"42k",  dof:2, note:"Horizontal transport",  tags:["dynamic","fleet"] },
  { id:"vsl",  model:"vessel",    name:"Container Vessel",     code:"VSL-01",
    tris:"310k", dof:1, note:"Berthed feeder ship",   tags:["static"] },
  { id:"box",  model:"container", name:"Container Stack",      code:"BOX-INF",
    tris:"12k",  dof:0, note:"Instanced TEU cargo",    tags:["static","instanced"] },
];

// Degrees of freedom for the STS crane (the rigged asset in the DOF step).
const CRANE_JOINTS = [
  { id:"gantry",  name:"Gantry Travel",  axis:"prismatic", unit:"m",  min:-14, max:14,  def:0,
    drive:"Rail bogies",  note:"Crane translates along the quay rail." },
  { id:"luff",    name:"Boom Luff",      axis:"revolute",  unit:"deg",min:0,   max:78,  def:0,
    drive:"Luffing winch",note:"Raises the boom clear of the vessel." },
  { id:"trolley", name:"Trolley Travel", axis:"prismatic", unit:"%",  min:0,   max:100, def:40,
    drive:"Trolley drive", note:"Carries the spreader along the boom." },
  { id:"hoist",   name:"Spreader Hoist", axis:"prismatic", unit:"%",  min:0,   max:100, def:50,
    drive:"Main hoist",    note:"Vertical lift of the spreader & load." },
  { id:"yaw",     name:"Spreader Skew",  axis:"revolute",  unit:"deg",min:-30, max:30,  def:0,
    drive:"Anti-snag servo",note:"Rotates the load to align with cells." },
];

// Failure scenarios surfaced on the brief screen — what the twin is FOR.
const FAILURES = [
  { code:"F-01", name:"Boom collision w/ vessel superstructure", sev:"critical" },
  { code:"F-02", name:"AGV path conflict at apron intersection",  sev:"high" },
  { code:"F-03", name:"Spreader twist-lock mis-seat under wind",   sev:"high" },
  { code:"F-04", name:"Power loss mid-hoist — load swing arrest",  sev:"critical" },
  { code:"F-05", name:"Sensor dropout on gantry travel limit",     sev:"moderate" },
];

const PIPELINE_LOG = {
  upload:   ["init capture buffer","EXIF / geo-tag parse","perspective estimate","scene graph alloc"],
  clean:    ["semantic segmentation","mask transient agents","inpaint occlusions","detail band filter"],
  backdrop: ["depth monodepth-v2","plane fit / quay+water","static geometry bake","albedo de-light"],
  splat:    ["SfM sparse cloud","densify / 2.6M splats","mesh proxy extract","collision hull"],
};

Object.assign(window, { STEPS, MESH_LIBRARY, CRANE_JOINTS, FAILURES, PIPELINE_LOG });
