(() => {
const $ = id => document.getElementById(id);
const sites = [
 {id:"site01",name:"Site01 — Connecting Ridge terrain",kind:"LOLA 5 m survey",lat:-89.463162834,lon:-137.489552922,type:"target"},
 {id:"apollo11",name:"Apollo 11",kind:"Historical landing",lat:0.6741,lon:23.4729,type:"historical"},
 {id:"apollo17",name:"Apollo 17",kind:"Historical landing",lat:20.1908,lon:30.7717,type:"historical"},
 {id:"luna16",name:"Luna 16",kind:"Historical landing",lat:-0.5137,lon:56.3638,type:"historical"},
 {id:"change4",name:"Chang'e 4",kind:"Historical landing",lat:-45.4446,lon:177.5991,type:"historical"},
 {id:"shackleton",name:"Shackleton Crater region",kind:"South-pole candidate region",lat:-89.9,lon:0,type:"target"},
 {id:"malapert",name:"Malapert Massif region",kind:"South-pole candidate region",lat:-85.99,lon:0,type:"target"}
];
window.lunaTerrainYaw=()=>terrainYaw;window.lunaTerrainPitch=()=>terrainPitch;window.lunaTerrainZoom=()=>terrainZoom;
let saved=[],activeCustom=null,lastResult=null,mode="2d",terrainGrid=null,terrainYaw=-0.55,terrainPitch=0.72,terrainZoom=1,dragTerrain=null;
const map=$("lunarMap"),globe=$("lunarGlobe"),ctx=map.getContext("2d"),gctx=globe.getContext("2d");
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const fmt=n=>Number(n).toFixed(1)+"°";
function current(){return {name:$("scenarioName").value.trim()||"Custom scenario",latitude:Number($("lat").value),longitude:Number($("lon").value),date:$("date").value,time:$("time").value,window_days:Number($("analysisDays").value),step_minutes:Number($("timeStep").value),observer_height_m:Number($("observerHeight").value),max_slope_deg:Number($("maxSlope").value),min_sun_hours:Number($("minSunHours").value),min_earth_hours:Number($("minEarthHours").value),solar_panel_area_m2:Number($("panelArea").value),solar_panel_efficiency:Number($("panelEfficiency").value)};}
function valid(s){return Number.isFinite(s.latitude)&&s.latitude>=-90&&s.latitude<=90&&Number.isFinite(s.longitude)&&s.longitude>=-180&&s.longitude<=180&&s.date&&s.time;}
function setSite(p){$("location").value=p.id||"custom";$("lat").value=p.lat;$("lon").value=p.lon;$("scenarioName").value=p.name||"Custom coordinates";activeCustom=p.id?null:{lat:p.lat,lon:p.lon};$("mapCoords").textContent=`LAT ${Number(p.lat).toFixed(4)}° · LON ${Number(p.lon).toFixed(4)}°`;draw();}
function draw(){
 const rect=map.getBoundingClientRect(),dpr=window.devicePixelRatio||1;map.width=Math.max(1,rect.width*dpr);map.height=Math.max(1,rect.height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
 const w=rect.width,h=rect.height;ctx.clearRect(0,0,w,h);
 const grad=ctx.createRadialGradient(w*.5,h*.5,20,w*.5,h*.5,Math.max(w,h)*.7);grad.addColorStop(0,"#526477");grad.addColorStop(.55,"#293e52");grad.addColorStop(1,"#0a1524");ctx.fillStyle=grad;ctx.fillRect(0,0,w,h);
 // Schematic equirectangular lunar coordinate grid (not surface imagery).
 ctx.strokeStyle="rgba(177,207,223,.18)";ctx.lineWidth=1;
 for(let lat=-60;lat<=60;lat+=30){let y=h*(.5-lat/180);ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
 for(let lon=-180;lon<=180;lon+=30){let x=w*(lon+180)/360;ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}
 ctx.fillStyle="rgba(226,236,242,.65)";ctx.font="10px monospace";ctx.fillText("90°N",8,14);ctx.fillText("0°",8,h/2-5);ctx.fillText("90°S",8,h-8);
 const point=(lat,lon,color,label)=>{let x=w*(lon+180)/360,y=h*(.5-lat/180);ctx.beginPath();ctx.arc(x,y,5,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();ctx.strokeStyle="#08111f";ctx.lineWidth=2;ctx.stroke();ctx.fillStyle="#f1f5fa";ctx.font="10px Manrope,Arial";ctx.fillText(label,x+8,y-8);};
 sites.forEach(p=>point(p.lat,p.lon,p.type==="historical"?"#f2c477":"#70dbe7",p.name));
 if(activeCustom)point(activeCustom.lat,activeCustom.lon,"#8dd7b0","Custom point");
 const s=current();if(valid(s))point(s.latitude,s.longitude,"#8dd7b0","Selected");
}
function drawGlobe(){
 const r=globe.getBoundingClientRect(),dpr=window.devicePixelRatio||1;globe.width=Math.max(1,r.width*dpr);globe.height=Math.max(1,r.height*dpr);gctx.setTransform(dpr,0,0,dpr,0,0);
 const w=r.width,h=r.height,cx=w/2,cy=h*.48;gctx.clearRect(0,0,w,h);gctx.fillStyle="#091624";gctx.fillRect(0,0,w,h);
 if(window.renderSite01Webgl?.(terrainGrid,terrainYaw,terrainPitch,terrainZoom))return;
 if(terrainGrid?.elevations_m){
  const grid=terrainGrid.elevations_m,n=grid.length,radius=terrainGrid.radius_m,values=grid.flat().filter(v=>v!==null&&Number.isFinite(v));
  if(!values.length){gctx.fillStyle="#dbe7ed";gctx.textAlign="center";gctx.fillText("No valid LOLA elevation samples",cx,cy);return;}
  const min=Math.min(...values),max=Math.max(...values),base=values.reduce((a,b)=>a+b,0)/values.length;
  const scale=Math.min(w,h)*.38/radius*terrainZoom,cyaw=Math.cos(terrainYaw),syaw=Math.sin(terrainYaw),cp=Math.cos(terrainPitch),sp=Math.sin(terrainPitch),exaggeration=2.2;
  const verts=grid.map((row,ri)=>row.map((e,ci)=>{
   if(e===null||!Number.isFinite(e))return null;
   const x=(ci/(n-1)*2-1)*radius,y=(1-ri/(n-1)*2)*radius,z=(e-base)*exaggeration;
   const xr=x*cyaw-y*syaw,yr=x*syaw+y*cyaw,yp=yr*cp-z*sp,depth=yr*sp+z*cp;
   return {x:cx+xr*scale,y:cy+yp*scale,depth,e};
  }));
  const tris=[];
  for(let y=0;y<n-1;y++)for(let x=0;x<n-1;x++){
   const a=verts[y][x],b=verts[y][x+1],c=verts[y+1][x+1],d=verts[y+1][x];
   if(a&&b&&c)tris.push({v:[a,b,c],depth:(a.depth+b.depth+c.depth)/3,e:(a.e+b.e+c.e)/3});
   if(a&&c&&d)tris.push({v:[a,c,d],depth:(a.depth+c.depth+d.depth)/3,e:(a.e+c.e+d.e)/3});
  }
  tris.sort((a,b)=>a.depth-b.depth);
  for(const t of tris){const level=max===min?.5:(t.e-min)/(max-min);gctx.beginPath();gctx.moveTo(t.v[0].x,t.v[0].y);gctx.lineTo(t.v[1].x,t.v[1].y);gctx.lineTo(t.v[2].x,t.v[2].y);gctx.closePath();gctx.fillStyle=`hsl(${198-level*42} ${30+level*22}% ${24+level*32}%)`;gctx.fill();gctx.strokeStyle="rgba(190,220,230,.10)";gctx.lineWidth=.45;gctx.stroke();}
  gctx.fillStyle="#e6f0f5";gctx.textAlign="left";gctx.font="11px monospace";gctx.fillText(`ACTUAL LOLA TERRAIN · ${terrainGrid.resolution_m} m/px`,16,22);gctx.fillStyle="#9fb4c3";gctx.fillText(`${terrainGrid.dataset} · ${terrainGrid.latitude.toFixed(3)}°, ${terrainGrid.longitude.toFixed(3)}°`,16,40);
  gctx.textAlign="right";gctx.fillText(`Elevation range ${min.toFixed(1)} to ${max.toFixed(1)} m`,w-16,22);
  return;
 }
 const rad=Math.min(w,h)*.30,grd=gctx.createRadialGradient(cx-rad*.3,cy-rad*.35,rad*.05,cx,cy,rad*1.15);grd.addColorStop(0,"#a7b3b2");grd.addColorStop(.45,"#697d89");grd.addColorStop(.85,"#354b5c");grd.addColorStop(1,"#0b1726");
 gctx.beginPath();gctx.arc(cx,cy,rad,0,Math.PI*2);gctx.fillStyle=grd;gctx.fill();
 for(let i=0;i<34;i++){let a=i*2.399,rr=rad*Math.sqrt((i+.5)/35),x=cx+Math.cos(a)*rr,y=cy+Math.sin(a)*rr,cr=2+(i%5)*1.7;gctx.beginPath();gctx.arc(x,y,cr,0,Math.PI*2);gctx.strokeStyle="rgba(20,35,48,.22)";gctx.lineWidth=2;gctx.stroke();}
 gctx.fillStyle="#dbe7ed";gctx.font="11px monospace";gctx.textAlign="center";gctx.fillText("SCHEMATIC ONLY · NO DEM LOADED",cx,cy+rad+27);
}
async function inspectSite01(){
 const output=$("site01Result");if(!output)return;
 const s=current();if(!valid(s)){output.textContent="Enter valid coordinates first.";return;}
 output.textContent="Reading installed Site01 raster measurements…";
 try{
  const qs=new URLSearchParams({latitude:String(s.latitude),longitude:String(s.longitude)});
  let payload;
  try {
   const response=await fetch(`/api/site01-point?${qs}`);
   payload=await response.json();
   if(!response.ok)throw new Error(payload.detail||payload.error||"Sample not available");
  } catch(error) {
   const site01=sites.find(p=>p.id==="site01");
   if(Math.abs(s.latitude-site01.lat)>0.000001||Math.abs(s.longitude-site01.lon)>0.000001)throw error;
   const staticResponse=await fetch("./data/site01-center-point.json");
   if(!staticResponse.ok)throw error;
   payload=await staticResponse.json();
  }
  const fmtSample=(v,units="")=>v===null||v===undefined?"not available":`${Number(v).toFixed(3)}${units}`;
  output.textContent=`ELEVATION: ${fmtSample(payload.elevation_m," m")}  |  SLOPE: ${fmtSample(payload.slope_deg,"°")}  |  ELEVATION UNCERTAINTY: ${fmtSample(payload.elevation_uncertainty_m," m")}  |  SLOPE UNCERTAINTY: ${fmtSample(payload.slope_uncertainty_deg,"°")}  |  LOLA COUNT: ${fmtSample(payload.lola_count)}  ·  ${payload.dataset}  ·  ${payload.pixel_size_m} m/pixel`;
 }catch(error){output.textContent=`Site01 inspection unavailable: ${error.message}`;}
}
async function loadTerrainGrid(){
 const s=current();if(!valid(s)){alert("Enter valid coordinates first.");return;}
 const status=$("terrain3dStatus");status.textContent="Loading real LOLA elevation samples…";
 try{
  const q=new URLSearchParams({latitude:String(s.latitude),longitude:String(s.longitude),radius_m:"5000",size:"65"});
  let payload,offline=false;
  try {
   const response=await fetch(`/api/lola-terrain?${q.toString()}`);
   payload=await response.json();
   if(!response.ok)throw new Error(payload.detail||payload.error||"LOLA terrain could not be loaded.");
  } catch(error) {
   const site01=sites.find(p=>p.id==="site01");
   if(Math.abs(s.latitude-site01.lat)>0.000001||Math.abs(s.longitude-site01.lon)>0.000001)throw error;
   const staticResponse=await fetch("./data/site01-preview-grid.json");
   if(!staticResponse.ok)throw error;
   payload=await staticResponse.json();offline=true;
  }
  terrainGrid=payload;drawGlobe();status.textContent=`Loaded ${payload.dataset} · ${payload.resolution_m} m/pixel · ${payload.size} × ${payload.size} samples · 10 km display window. ${offline?"Bundled Site01 snapshot from real uploaded raster; other locations require Python API. ":""}Display mesh is downsampled; WebGL defaults to true 1× height scale (canvas fallback uses 2.2×).`;
 }catch(error){terrainGrid=null;drawGlobe();status.textContent=`Terrain unavailable: ${error.message}`;}
}
function demoAssess(s){
 const dt=new Date(`${s.date}T${s.time}:00Z`),day=dt.getUTCDate(),hour=dt.getUTCHours()+dt.getUTCMinutes()/60;
 const lunarPhase=((dt.getTime()/86400000)%29.53059)/29.53059*Math.PI*2;
 const latFactor=Math.cos(Math.abs(s.latitude)*Math.PI/180);
 const sun=clamp(8+18*Math.sin((hour/24)*Math.PI*2-1.1)*Math.max(.18,latFactor)+5*Math.sin(lunarPhase),-15,35);
 const earth=clamp(12+18*Math.cos(lunarPhase+s.longitude*Math.PI/180*.15)*Math.cos(s.latitude*Math.PI/180),-20,35);
 return {name:s.name,latitude:s.latitude,longitude:s.longitude,datetime_utc:`${s.date}T${s.time}:00Z`,solar_elevation_deg:Number(sun.toFixed(1)),earth_elevation_deg:Number(earth.toFixed(1)),sun_visible_demo:sun>0,earth_visible_demo:earth>0,cache_status:"LOCAL DEMO",scientific_status:"Illustrative geometry only. Not a validated JPL ephemeris calculation.",terrain:{elevation_m:null,slope_deg:null,note:"No LOLA DEM is connected; terrain obstruction is not calculated."},communication:"No RF link budget or antenna model configured."};
}
async function assess(s){
 if(!valid(s)){alert("Enter valid latitude (−90 to 90), longitude (−180 to 180), date and time.");return null;}
 let result;
 try{const response=await fetch("/api/assess",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(s)});if(response.ok)result=await response.json();else{let problem={};try{problem=await response.json();}catch(_){}if(response.status===400||response.status===422){$("calculationState").textContent="Assessment blocked";$("assessmentNote").textContent=problem.detail||problem.error||"The selected site could not be assessed with the loaded scientific data.";return null;}throw Error(problem.error||"Science service unavailable");}}
 catch(_){result=demoAssess(s);}
 show(result);return result;
}
function show(r){
 lastResult=r;$("sunValue").textContent=fmt(r.solar_elevation_deg);$("earthValue").textContent=fmt(r.earth_elevation_deg);
 $("sunVisibility").textContent=(r.sun_visible??r.sun_visible_demo)?"VISIBLE":"OCCULTED";$("earthVisibility").textContent=(r.earth_visible??r.earth_visible_demo)?"VISIBLE":"OCCULTED";
 $("terrainElevation").textContent=r.terrain?.elevation_m==null?"Not connected":r.terrain.elevation_m+" m";
 $("terrainSlope").textContent=r.terrain?.slope_deg==null?"Not connected":r.terrain.slope_deg+"°";
 if($("terrainSource"))$("terrainSource").textContent=r.terrain?.dataset?`${r.terrain.dataset} · ${r.terrain.resolution_m} m/pixel`:"No LOLA coverage";
 if($("terrainUncertainty"))$("terrainUncertainty").textContent=r.terrain?.height_uncertainty_rms_m==null?"Not connected":r.terrain.height_uncertainty_rms_m+" m";
 if($("lolaCount"))$("lolaCount").textContent=r.terrain?.lola_return_count==null?"Not connected":r.terrain.lola_return_count;
 if($("sunHours"))$("sunHours").textContent=r.sunlight_hours==null?"Not calculated":`${r.sunlight_hours} h / ${r.analysis_window_hours||72} h`;
 if($("earthHours"))$("earthHours").textContent=r.earth_los_hours==null?"Not calculated":`${r.earth_los_hours} h / ${r.analysis_window_hours||72} h`;
 if($("missionAssessment"))$("missionAssessment").textContent=r.mission_assessment?.status||"Demo / not assessed";
 if($("missionCriteria")){const c=r.mission_assessment?.criteria;$("missionCriteria").textContent=c?`Slope: ${c.slope.status} (${c.slope.value_deg??"n/a"}° / ${c.slope.limit_deg}°) · Sunlight: ${c.sunlight.status} (${c.sunlight.visible_hours} h / ${c.sunlight.minimum_hours} h) · Earth LOS: ${c.earth_line_of_sight.status} (${c.earth_line_of_sight.visible_hours} h / ${c.earth_line_of_sight.minimum_hours} h)`:"Screening targets appear after assessment.";}
 $("sunsetTime").textContent=!r.calculation_mode?"Demo only":r.time_to_sunset_hours==null?(r.sun_visible_beyond_window?"Beyond analysis window":"Not visible at selected time"):r.time_to_sunset_hours+" h";
 $("earthsetTime").textContent=!r.calculation_mode?"Demo only":r.time_to_earthset_hours==null?(r.earth_visible_beyond_window?"Beyond analysis window":"Not visible at selected time"):r.time_to_earthset_hours+" h";
 $("solarEnergy").textContent=r.peak_horizontal_irradiance_w_m2==null?"Not calculated":r.peak_horizontal_irradiance_w_m2+" W/m²";
 if($("solarPanelEnergy"))$("solarPanelEnergy").textContent=r.solar_energy_estimate?.estimated_electric_wh==null?"Not calculated":`${r.solar_energy_estimate.estimated_electric_wh} Wh (assumptions)`;$("communication").textContent=r.communication||"Not assessed";
 if($('screeningScore')) $('screeningScore').textContent=r.screening_score?`${r.screening_score.score_0_100} / 100 (illustrative)`:'Not available — requires complete science data';
 drawMissionTimeline(r.calculation_mode?r.timeline:null);
 const modeLabel=r.calculation_mode?"SPICE · apparent":"illustrative demo";if($("sunMode"))$("sunMode").textContent=modeLabel;if($("earthMode"))$("earthMode").textContent=modeLabel;
 $("calculationState").textContent=r.calculation_mode||("Illustrative · "+(r.cache_status||"demo"));
 $("assessmentNote").textContent=(r.scientific_status||"") +" "+(r.terrain?.note||"");
 if(r.terrain?.horizon_profile)drawHorizon(r.terrain.horizon_profile);else drawHorizon(null);
 const sunX=clamp(50+(r.solar_azimuth_deg||180)/360*35,12,88),sunY=clamp(72-r.solar_elevation_deg*1.4,12,78);
 const earthX=clamp(50+(r.earth_azimuth_deg||90)/360*35,12,88),earthY=clamp(72-r.earth_elevation_deg*1.4,12,78);
 $("skySun").style.left=sunX+"%";$("skySun").style.top=sunY+"%";$("skyEarth").style.left=earthX+"%";$("skyEarth").style.top=earthY+"%";
}

function drawHorizon(profile){
 const canvas=$("horizonPlot");if(!canvas)return;const c=canvas.getContext("2d"),w=canvas.width,h=canvas.height,cx=w/2,cy=h/2+4,R=Math.min(w,h)*.39;
 c.clearRect(0,0,w,h);c.fillStyle="#0c1b2a";c.fillRect(0,0,w,h);
 c.strokeStyle="rgba(160,190,210,.22)";c.lineWidth=1;
 for(let deg of [0,10,20,30,40]){let rr=R*(deg+10)/55;c.beginPath();c.arc(cx,cy,rr,0,Math.PI*2);c.stroke();c.fillStyle="#91a8b8";c.font="10px monospace";c.fillText(`${deg}°`,cx+rr+4,cy-3);}
 for(let a=0;a<360;a+=45){let t=(a-90)*Math.PI/180;c.beginPath();c.moveTo(cx,cy);c.lineTo(cx+Math.cos(t)*R,cy+Math.sin(t)*R);c.stroke();c.fillStyle="#b6c8d5";c.fillText(`${a}°`,cx+Math.cos(t)*(R+15)-9,cy+Math.sin(t)*(R+15)+4);}
 if(!profile?.length){c.fillStyle="#91a8b8";c.font="13px monospace";c.textAlign="center";c.fillText("LOLA horizon profile unavailable",cx,cy);return;}
 c.beginPath();profile.forEach(([az,el],i)=>{const rr=R*(clamp(el,-10,45)+10)/55,t=(az-90)*Math.PI/180,x=cx+Math.cos(t)*rr,y=cy+Math.sin(t)*rr;i?c.lineTo(x,y):c.moveTo(x,y);});c.closePath();c.fillStyle="rgba(91,203,211,.22)";c.fill();c.strokeStyle="#6bd3d2";c.lineWidth=2;c.stroke();
 c.fillStyle="#e4edf4";c.textAlign="left";c.font="10px monospace";c.fillText("N ↑",cx+6,cy-R-9);
}

function safeSaveScenarios(){try{localStorage.setItem('luna_saved_scenarios_v1',JSON.stringify(saved));}catch(_){};idbStoreScenarios(saved);}
function loadSavedScenarios(){try{const v=JSON.parse(localStorage.getItem('luna_saved_scenarios_v1')||'[]');if(Array.isArray(v)) saved=v.filter(valid).slice(0,8);}catch(_){}}
function drawMissionTimeline(series){
 const canvas=$('missionTimeline');if(!canvas)return;
 const c=canvas.getContext('2d'),w=canvas.width,h=canvas.height;c.fillStyle='#0a192a';c.fillRect(0,0,w,h);
 c.fillStyle='#a7bfce';c.font='13px monospace';c.fillText('SUN',12,40);c.fillText('EARTH',12,105);
 if(!series||!series.length){c.fillText('Real SPICE + LOLA assessment required to plot visibility',125,80);return;}
 const left=80,span=w-left-16,bar=26;
 for(const [key,top,color] of [['sun_visible',22,'#64d9e4'],['earth_visible',86,'#f2bf72']]){
  c.fillStyle='#1f3446';c.fillRect(left,top,span,bar);
  series.slice(0,-1).forEach((v,i)=>{if(v[key]){c.fillStyle=color;c.fillRect(left+i*span/(series.length-1),top,Math.ceil(span/(series.length-1)),bar);}});
 }
 c.fillStyle='#9db2c3';c.fillText(series[0].datetime_utc.slice(0,16)+' UTC',left,150);
 c.textAlign='right';c.fillText(series.at(-1).datetime_utc.slice(0,16)+' UTC',w-16,150);c.textAlign='left';
}
function drawScienceGrid(payload,shadows=false){
 const canvas=$('slopeMap');if(!canvas)return;
 const context=canvas.getContext('2d'),map=shadows?payload.shadow_screening?.shadow_mask:payload.slope_deg;
 if(!map)return;const n=map.length,step=canvas.width/n;
 context.clearRect(0,0,canvas.width,canvas.height);
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){
  const v=map[y][x];context.fillStyle=v==null?'#111f30':shadows?(v?'#182436':'#e3cf83'):`hsl(${Math.round(186-Math.min(v,35)*5)} 62% ${Math.round(25+Math.min(v,35))}%)`;
  context.fillRect(x*step,y*step,Math.ceil(step),Math.ceil(step));
 }
}
async function analyzeTerrain(withSun){
 const s=current(),status=$('terrainAnalysisStatus');if(!valid(s)){status.textContent='Select a valid location';return;}
 const q=new URLSearchParams({latitude:s.latitude,longitude:s.longitude,radius_m:'900',size:'65'});
 if(withSun){if(!lastResult?.calculation_mode){status.textContent='Run a real SPICE + LOLA assessment first; illustrative Sun angles are not accepted for scientific shadows.';return;}
  q.set('sun_azimuth_deg',lastResult.solar_azimuth_deg);q.set('sun_elevation_deg',lastResult.solar_elevation_deg);
 }
 status.textContent='Analyzing installed LOLA elevation grid…';
 try{const r=await fetch('/api/lola-terrain-analysis?'+q);const d=await r.json();if(!r.ok)throw Error(d.detail||d.error||'Science service unavailable');drawScienceGrid(d,withSun);
  const v=d.slope_summary;status.textContent=`${d.product} · sampled grid ${d.size}×${d.size}, ${d.sample_spacing_m.toFixed(1)} m between samples · mean derived slope ${v.mean_deg??'n/a'}°, maximum ${v.max_deg??'n/a'}°. ${withSun?'Approximate ray shadows: '+d.shadow_screening?.shadowed_fraction_of_evaluable_cells:'False-color slope visualization; fixed-altitude hillshade is available in the API.'}`;
 }catch(e){status.textContent=`Terrain analysis requires the running Python API: ${e.message}`;}
}
function exportAssessment(){if(!lastResult?.calculation_mode){alert('A data-backed SPICE assessment is required before exporting scientific results.');return;}
 const blob=new Blob([JSON.stringify(lastResult,null,2)],{type:'application/json'}),u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download='LUNA_Site01_Science_Assessment.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),500);
}
function renderSaved(){
 const box=$("scenarioList");box.innerHTML="";
 if(!saved.length){box.innerHTML='<p class="hint">No scenarios saved yet.</p>';return;}
 saved.forEach((s,i)=>{const card=document.createElement("div");card.className="scenario-card";const del=document.createElement("button");del.className="button-quiet";del.textContent="Remove";del.onclick=()=>{saved.splice(i,1);safeSaveScenarios();renderSaved();};const b=document.createElement("b");b.textContent=s.name;const line=document.createElement("span");line.textContent=`${s.latitude.toFixed(4)}, ${s.longitude.toFixed(4)} · ${s.date} ${s.time} UTC`;card.append(del,b,line);box.append(card);});
}
async function compare(){
 if(!saved.length){alert("Save at least one scenario first.");return;}
 let results=[];
 try{const r=await fetch("/api/compare",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({scenarios:saved})});if(!r.ok){let problem={};try{problem=await r.json();}catch(_){}$("comparisonTable").textContent=problem.detail||problem.error||"Science API comparison unavailable.";return;}results=(await r.json()).results;}
 catch(_){results=saved.map(demoAssess);}
 results.sort((a,b)=>(b.screening_score?.score_0_100??-1)-(a.screening_score?.score_0_100??-1));
 const table=document.createElement("table");table.innerHTML="<thead><tr><th>SCENARIO</th><th>LOCATION</th><th>DATE / UTC</th><th>SUN ELEV.</th><th>EARTH ELEV.</th><th>SLOPE</th><th>SUN HOURS</th><th>EARTH LOS</th><th>SCREENING</th><th>EXPLORATORY SCORE</th></tr></thead>";
 const body=document.createElement("tbody");
 results.forEach((r,i)=>{const tr=document.createElement("tr");[r.name,`${Number(r.latitude??0).toFixed(2)}, ${Number(r.longitude??0).toFixed(2)}`,r.datetime_utc||"Demo / unknown",fmt(r.solar_elevation_deg),fmt(r.earth_elevation_deg),r.terrain?.slope_deg==null?"—":`${r.terrain.slope_deg}°`,r.sunlight_hours==null?"—":`${r.sunlight_hours} h`,r.earth_los_hours==null?"—":`${r.earth_los_hours} h`,r.mission_assessment?.status||"DEMO / NOT ASSESSED",r.screening_score?.score_0_100??"—"].forEach(v=>{const td=document.createElement("td");td.textContent=v;tr.append(td);});body.append(tr);});
 table.append(body);$("comparisonTable").replaceChildren(table);
}

let lunaDbPromise=null;
function lunaDb(){
 if(!("indexedDB" in window))return Promise.reject(new Error("IndexedDB unavailable"));
 if(lunaDbPromise)return lunaDbPromise;
 lunaDbPromise=new Promise((resolve,reject)=>{
  const req=indexedDB.open("LUNA_Navigator",1);
  req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains("workspace"))db.createObjectStore("workspace",{keyPath:"id"});};
  req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
 });return lunaDbPromise;
}
async function idbStoreScenarios(items){
 try{const db=await lunaDb();await new Promise((resolve,reject)=>{const tx=db.transaction("workspace","readwrite");tx.objectStore("workspace").put({id:"saved-scenarios",items,updated_at:new Date().toISOString()});tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});$("indexedDbStatus").textContent="Active · scenarios persisted";}catch(e){if($("indexedDbStatus"))$("indexedDbStatus").textContent="Unavailable · localStorage fallback";}
}
async function restoreIndexedDb(){
 try{const db=await lunaDb();const row=await new Promise((resolve,reject)=>{const tx=db.transaction("workspace","readonly"),r=tx.objectStore("workspace").get("saved-scenarios");r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
  if(row&&Array.isArray(row.items)&&row.items.length){saved=row.items.filter(valid).slice(0,8);try{localStorage.setItem("luna_saved_scenarios_v1",JSON.stringify(saved));}catch(_){}renderSaved();}
  $("indexedDbStatus").textContent="Active · browser database ready";
 }catch(_){if($("indexedDbStatus"))$("indexedDbStatus").textContent="Unavailable · localStorage fallback";}
}
async function queryHorizons(){
 const out=$("horizonsResult");out.textContent="Querying JPL Horizons…";
 try{const q=new URLSearchParams({start:$("horizonsStart").value,stop:$("horizonsStop").value});
  const r=await fetch("/api/horizons?"+q),d=await r.json();if(!r.ok)throw Error(d.detail||d.error||"Horizons request failed");
  out.textContent=JSON.stringify(d.result,null,2).slice(0,9000);
 }catch(e){out.textContent="JPL Horizons unavailable: "+e.message;}
}
async function queryLroc(){
 const s=current(),out=$("lrocImageLink");out.hidden=true;
 try{const q=new URLSearchParams({latitude:String(s.latitude),longitude:String(s.longitude),layer:$("lrocLayer").value});
  const r=await fetch("/api/lroc?"+q),d=await r.json();if(!r.ok)throw Error(d.detail||d.error||"LROC unavailable");
  out.href=d.image_url;out.hidden=false;out.textContent="Open LROC image request ("+d.layer+")";
 }catch(e){$("pdsResult").textContent="LROC adapter unavailable: "+e.message;}
}
async function queryPds(){
 const out=$("pdsResult");out.textContent="Searching NASA PDS Registry…";
 try{const q=new URLSearchParams({q:$("pdsQuery").value,limit:"10"}),r=await fetch("/api/pds?"+q),d=await r.json();
  if(!r.ok)throw Error(d.detail||d.error||"PDS search failed");out.textContent=JSON.stringify(d.results,null,2).slice(0,9000);
 }catch(e){out.textContent="NASA PDS search unavailable: "+e.message;}
}
async function queryFeatures(){
 const s=current(),out=$("featuresResult");out.textContent="Analyzing LOLA DEM morphology…";
 try{const q=new URLSearchParams({latitude:String(s.latitude),longitude:String(s.longitude),radius_m:"900",size:"65"});
  const r=await fetch("/api/lola-features?"+q),d=await r.json();if(!r.ok)throw Error(d.detail||d.error||"Feature analysis failed");
  out.textContent=JSON.stringify({product:d.product,sample_spacing_m:d.sample_spacing_m,crater_candidates:d.crater_candidates,ridge_candidates:d.ridge_candidates,method:d.method,limitations:d.limitations},null,2).slice(0,9000);
 }catch(e){out.textContent="Feature identification unavailable: "+e.message;}
}
async function queryRecommendations(){
 const s=current(),out=$("recommendResult");out.textContent="Assessing nearby alternative coordinates using real terrain and SPICE data…";
 // Small local candidate lattice. Candidates without actual DEM/SPICE coverage are
 // explicitly returned as unavailable and are not assigned invented scores.
 const offsets=[[-.04,0],[.04,0],[0,-.04],[0,.04],[-.04,-.04],[-.04,.04],[.04,-.04],[.04,.04]];
 const candidates=offsets.map((o,i)=>({...s,name:`Nearby alternative ${i+1}`,latitude:clamp(s.latitude+o[0],-90,90),longitude:((s.longitude+o[1]+540)%360)-180}));
 try{const r=await fetch("/api/recommendations",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({candidates})});
  const d=await r.json();if(!r.ok)throw Error(d.detail||d.error||"Recommendation request failed");
  out.textContent=JSON.stringify({recommendations:d.recommendations.map(x=>({candidate:x.candidate,latitude:x.latitude,longitude:x.longitude,score_0_100:x.score_0_100,status:x.status,reason:x.reason})),method:d.method,limitations:d.limitations},null,2);
 }catch(e){out.textContent="Alternative-site ranking requires the connected science API, compatible SPICE kernels and DEM coverage: "+e.message;}
}
async function loadObjectStorageStatus(){
 try{const r=await fetch("/api/storage-status");const d=await r.json();if($("objectStorageStatus"))$("objectStorageStatus").textContent=d.configured?"Configured":"Not configured";}
 catch(_){if($("objectStorageStatus"))$("objectStorageStatus").textContent="Science API not connected";}
}

function init(){
 loadSavedScenarios();renderSaved();restoreIndexedDb();loadObjectStorageStatus();
 $("horizonsBtn").onclick=queryHorizons;$("lrocBtn").onclick=queryLroc;$("pdsBtn").onclick=queryPds;$("featuresBtn").onclick=queryFeatures;$("recommendBtn").onclick=queryRecommendations;
 $("terrainAnalyzeBtn").onclick=()=>analyzeTerrain(false);$("terrainShadowBtn").onclick=()=>analyzeTerrain(true);$("exportScienceBtn").onclick=exportAssessment;drawMissionTimeline(null);
 $("location").innerHTML=sites.map(p=>`<option value="${p.id}">${p.name} · ${p.kind}</option>`).join("")+'<option value="custom">Custom coordinates</option>';
 $("location").addEventListener("change",()=>{const p=sites.find(x=>x.id===$("location").value);if(p)setSite({id:p.id,name:p.name,lat:p.lat,lon:p.lon});});
 $("assessBtn").onclick=()=>assess(current());
 $("saveBtn").onclick=()=>{const s=current();if(!valid(s)){alert("Complete valid location, date and time first.");return;}if(saved.length>=8){alert("Maximum 8 scenarios.");return;}saved.push(s);safeSaveScenarios();renderSaved();};
 $("compareBtn").onclick=compare;
 $("view2d").onclick=()=>{mode="2d";$("view2d").classList.add("active");$("view3d").classList.remove("active");$("mapWrap").classList.remove("hidden");$("globeWrap").classList.add("hidden");draw();};
 $("view3d").onclick=()=>{mode="3d";$("view3d").classList.add("active");$("view2d").classList.remove("active");$("mapWrap").classList.add("hidden");$("globeWrap").classList.remove("hidden");drawGlobe();};
 $("loadTerrainBtn").onclick=loadTerrainGrid;
 $("site01InspectBtn").onclick=inspectSite01;
 $("site01GoBtn").onclick=()=>{const p=sites.find(x=>x.id==="site01");setSite(p);$("view3d").click();loadTerrainGrid();inspectSite01();};
 globe.addEventListener("pointerdown",e=>{dragTerrain={x:e.clientX,y:e.clientY};globe.setPointerCapture(e.pointerId);});
 globe.addEventListener("pointermove",e=>{if(!dragTerrain||!terrainGrid)return;const dx=e.clientX-dragTerrain.x,dy=e.clientY-dragTerrain.y;terrainYaw+=dx*.008;terrainPitch=clamp(terrainPitch+dy*.006,.15,1.35);dragTerrain={x:e.clientX,y:e.clientY};drawGlobe();});
 globe.addEventListener("pointerup",()=>{dragTerrain=null;});globe.addEventListener("pointercancel",()=>{dragTerrain=null;});
 globe.addEventListener("wheel",e=>{if(!terrainGrid)return;e.preventDefault();terrainZoom=clamp(terrainZoom*(e.deltaY<0?1.08:.92),.55,2.5);drawGlobe();},{passive:false});
 map.addEventListener("click",e=>{const r=map.getBoundingClientRect(),lon=(e.clientX-r.left)/r.width*360-180,lat=90-(e.clientY-r.top)/r.height*180;setSite({lat:clamp(lat,-90,90),lon:clamp(lon,-180,180),name:"Custom coordinates"});});
 $("refreshBtn").onclick=async()=>{try{const r=await fetch("/api/data-refresh",{method:"POST"});const d=await r.json();$("updateMessage").textContent=d.message||"Manifest check completed.";setStatus(d);}catch(_){$("updateMessage").textContent="No Cloudflare API is connected in this static preview. Configure the Pages Function and LUNA_MANIFEST_URL to check a source manifest.";}}
 window.addEventListener("resize",()=>{draw();if(mode==="3d")drawGlobe();});
 setSite({id:"shackleton",name:"Shackleton Crater region",lat:-89.9,lon:0});drawGlobe();assess(current());loadStatus();
}
function setStatus(d){$("lastCheck").textContent=d.last_check||"—";$("lastSuccess").textContent=d.last_success||"—";if(d.cache)$("cacheStatus").textContent=d.cache.status||"Configured";if(d.terrain){$("lolaStatus").textContent=d.terrain.status||"Not configured";if($("lolaProductCount"))$("lolaProductCount").textContent=d.terrain.count??"—";if($("lolaStorage"))$("lolaStorage").textContent=d.terrain.bytes?`${(d.terrain.bytes/1e9).toFixed(2)} GB`:"—";}if(d.ephemeris)$("jplStatus").textContent=d.ephemeris.status||"Not connected";if(d.imagery)$("lrocStatus").textContent=d.imagery.status||"Not configured";if($("scienceApiStatus"))$("scienceApiStatus").textContent=d.science_api?.status||"Not configured";}
async function loadStatus(){try{const r=await fetch("/api/data-status");if(!r.ok)throw Error();const d=await r.json();setStatus(d);$("updateMessage").textContent=d.updater?.message||"Source manifest status available.";}catch(_){$("updateMessage").textContent="Static preview mode. Cloudflare Pages Functions provide API and cache when deployed.";}}
init();
})();