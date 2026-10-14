import * as THREE from 'three';
import {TrackballControls} from './vendor/controls/TrackballControls.js';

const $=id=>document.getElementById(id);
const modelKey='current';
const palette=[[.08,.26,.52],[.31,.61,.82],[.96,.97,.96],[.97,.69,.28],[.74,.15,.11]].map(c=>new THREE.Color().setRGB(...c,THREE.SRGBColorSpace));
const views=[],cache=new Map(),scorePlots=[];
let meta,active,activeKey,loading=false,cameraSync=false,loadToken=0,lastTime=0,lastView;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const sdText=step=>`${step>20?'+':''}${((step-20)/10).toFixed(1)} SD`;
const icons=()=>window.lucide.createIcons();

function makeView(pc){
  const section=document.createElement('section');section.className='panel';
  section.innerHTML=`<div class="heading"><h2>PC${pc+1}<span class="variance" id="variance${pc}"></span></h2><output class="position" id="position${pc}" for="slider${pc}">0.0 SD</output></div><canvas class="surface" id="canvas${pc}" aria-label="PC${pc+1} decoded surface"></canvas><div class="slider-row"><button id="play${pc}" title="Play PC${pc+1}" aria-label="Play PC${pc+1}"><i data-lucide="play"></i></button><div class="slider-wrap"><input id="slider${pc}" type="range" min="0" max="40" step="1" value="20" aria-label="PC${pc+1} traversal position"><div class="slider-labels"><span>−2 SD</span><span>0</span><span>+2 SD</span></div></div><button id="zero${pc}" title="Reset PC${pc+1} to the mean" aria-label="Reset PC${pc+1} to the mean"><i data-lucide="rotate-ccw"></i></button></div><div class="quality" id="quality${pc}"></div>`;
  $('grid').append(section);
  const canvas=$('canvas'+pc),renderer=new THREE.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  const scene=new THREE.Scene();scene.background=new THREE.Color('#f2f6f7');
  scene.add(new THREE.HemisphereLight(0xffffff,0x939b9e,2));
  const light=new THREE.DirectionalLight(0xffffff,2);scene.add(light,light.target);
  const camera=new THREE.PerspectiveCamera(34,1,.001,50),controls=new TrackballControls(camera,canvas);
  controls.rotateSpeed=3;controls.zoomSpeed=1.1;controls.staticMoving=true;
  const v={pc,canvas,renderer,scene,light,camera,controls,step:20,playing:false,direction:1};
  controls.addEventListener('change',()=>{lastView=v;if(cameraSync||!$('sync-cameras').checked)return;copyCamera(v);});
  new ResizeObserver(()=>{const w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();controls.handleResize();}).observe(canvas);
  $('slider'+pc).addEventListener('input',event=>{stop();setStep(v,Number(event.target.value),true);});
  $('play'+pc).onclick=()=>{if(loading)return;const value=!v.playing;for(const o of $('sync-sliders').checked?views:[v]){o.playing=value;o.direction=v.direction;}updatePlay();};
  $('zero'+pc).onclick=()=>{stop();setStep(v,20,true);};
  return v;
}
for(let pc=0;pc<4;pc++)views.push(makeView(pc));

function copyCamera(from){
  cameraSync=true;
  for(const v of views){if(v===from)continue;v.camera.position.copy(from.camera.position);v.camera.up.copy(from.camera.up);v.controls.target.copy(from.controls.target);v.camera.lookAt(v.controls.target);v.camera.updateMatrixWorld();}
  cameraSync=false;
}
function fit(){
  if(!meta||!active)return;
  const lo=new THREE.Vector3(...meta.bounds[0]),hi=new THREE.Vector3(...meta.bounds[1]),center=lo.clone().add(hi).multiplyScalar(.5);
  const normal=new THREE.Vector3(...meta.pose.view_normal).normalize(),up=new THREE.Vector3(...meta.pose.view_up).normalize(),right=up.clone().cross(normal).normalize();up.copy(normal.clone().cross(right));
  // Fit every decoded position in one fixed camera frame, using actual vertices.
  const tanY=Math.tan(THREE.MathUtils.degToRad(17)),tanX=tanY*Math.min(...views.map(v=>v.camera.aspect));
  let required=0;
  const vertices=active.vertices;
  for(let i=0;i<vertices.length;i+=3){
    const x=vertices[i]-center.x,y=vertices[i+1]-center.y,z=vertices[i+2]-center.z;
    const rx=x*right.x+y*right.y+z*right.z,uy=x*up.x+y*up.y+z*up.z,nz=x*normal.x+y*normal.y+z*normal.z;
    required=Math.max(required,Math.abs(rx)/tanX+nz,Math.abs(uy)/tanY+nz);
  }
  const d=required*1.1;
  cameraSync=true;
  for(const v of views){v.controls.target.copy(center);v.camera.position.copy(center).addScaledVector(normal,d);v.camera.up.copy(up);v.camera.lookAt(center);v.controls.update();}
  cameraSync=false;
}
async function array(record){
  const response=await fetch(record.path);if(!response.ok)throw new Error('Missing traversal data');
  const buffer=await response.arrayBuffer(),digest=await crypto.subtle.digest('SHA-256',buffer);
  const hash=Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join('');
  if(hash!==record.sha256)throw new Error('Traversal data checksum mismatch');
  return record.dtype==='uint32'?new Uint32Array(buffer):new Float32Array(buffer);
}
async function modelData(key){
  if(!cache.has(key))cache.set(key,(async()=>{const r=meta.models[key];const [vertices,signed,faces]=await Promise.all([array(r.vertices),array(r.signed),array(r.faces)]);
    if(vertices.length!==4*41*r.vertex_count*3||signed.length!==4*41*r.vertex_count||faces.length!==r.face_count*3)throw new Error('Traversal array length mismatch');
    return {vertices,signed,faces,record:r};})().catch(e=>{cache.delete(key);throw e;}));
  return cache.get(key);
}
function removeMeshes(v){for(const obj of [v.mesh,v.bad]){if(!obj)continue;v.scene.remove(obj);obj.geometry.dispose();obj.material.dispose();}v.mesh=v.bad=null;}
function makeMeshes(){
  for(const v of views){
    removeMeshes(v);
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(active.record.vertex_count*3),3));
    geometry.setAttribute('color',new THREE.BufferAttribute(new Float32Array(active.record.vertex_count*3),3));
    geometry.setIndex(new THREE.BufferAttribute(active.faces,1));
    v.mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.8,side:THREE.DoubleSide}));
    v.scene.add(v.mesh);
    $('variance'+v.pc).textContent=`${(100*active.record.variance_ratio[v.pc]).toFixed(1)}% variance`;
    renderStep(v);
  }
}
function renderStep(v){
  if(!active||!v.mesh)return;
  const n=active.record.vertex_count,offset=(v.pc*41+v.step)*n;
  v.mesh.geometry.attributes.position.array.set(active.vertices.subarray(offset*3,(offset+n)*3));
  v.mesh.geometry.attributes.position.needsUpdate=true;v.mesh.geometry.computeVertexNormals();v.mesh.geometry.computeBoundingSphere();
  const signed=$('color').value==='signed',limit=clamp(Number($('limit').value)||meta.default_limit_pct,.01,20);
  const colors=v.mesh.geometry.attributes.color.array;
  if(signed){const color=new THREE.Color();for(let i=0;i<n;i++){const t=clamp((active.signed[offset+i]/limit+1)*2,0,4),j=Math.min(3,Math.floor(t));color.copy(palette[j]).lerp(palette[j+1],t-j).toArray(colors,i*3);}v.mesh.geometry.attributes.color.needsUpdate=true;}
  v.mesh.material.vertexColors=signed;v.mesh.material.color.set(signed?0xffffff:0xb9cdca);v.mesh.material.wireframe=$('wire').checked;v.mesh.material.needsUpdate=true;
  if(v.bad){v.scene.remove(v.bad);v.bad.geometry.dispose();v.bad.material.dispose();v.bad=null;}
  const q=active.record.geometry[v.pc][v.step];
  if($('defects').checked&&q.bad_face_ids.length){const f=new Uint32Array(q.bad_face_ids.length*3);q.bad_face_ids.forEach((id,i)=>f.set(active.faces.subarray(id*3,id*3+3),i*3));const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(v.mesh.geometry.attributes.position.array,3));g.setIndex(new THREE.BufferAttribute(f,1));v.bad=new THREE.Mesh(g,new THREE.MeshBasicMaterial({color:'#df3463',side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}));v.scene.add(v.bad);}
  $('slider'+v.pc).value=String(v.step);$('slider'+v.pc).setAttribute('aria-valuetext',sdText(v.step));$('position'+v.pc).textContent=sdText(v.step);
  const range=active.record.ranges[v.pc][v.step],flag=q.interior_pairs||q.near_zero_faces||q.exact_degenerate_faces;
  $('quality'+v.pc).innerHTML=`Signed range: ${range[0].toFixed(3)} to ${range[1].toFixed(3)}% · Step ${v.step+1}/41<br>${flag?'<strong>':''}${q.interior_pairs} intersection pairs · ${q.near_zero_faces} near-zero faces · ${q.exact_degenerate_faces} degenerate faces${flag?'</strong>':''}`;
  v.canvas.dataset.step=String(v.step);v.canvas.dataset.model=activeKey;v.canvas.dataset.color=signed?'signed':'neutral';
}
function setStep(v,value,propagate=false){v.step=clamp(Math.round(value),0,40);renderStep(v);if(propagate&&$('sync-sliders').checked)for(const o of views){if(o===v)continue;o.step=v.step;renderStep(o);}updateScoreGuides();}
function stop(){for(const v of views)v.playing=false;updatePlay();}
function updatePlay(){
  for(const v of views){const b=$('play'+v.pc),text=`${v.playing?'Pause':'Play'} PC${v.pc+1}`;b.innerHTML=`<i data-lucide="${v.playing?'pause':'play'}"></i>`;b.title=text;b.setAttribute('aria-label',text);b.setAttribute('aria-pressed',String(v.playing));}
  const any=views.some(v=>v.playing),b=$('play-all'),text=any?'Pause all traversals':'Play all traversals';b.innerHTML=`<i data-lucide="${any?'pause':'play'}"></i>`;b.title=text;b.setAttribute('aria-label',text);b.setAttribute('aria-pressed',String(any));icons();
}
function scale(commit=true){const raw=Number($('limit').value);if(!commit&&(!Number.isFinite(raw)||raw<=0))return;const limit=clamp(raw||meta.default_limit_pct,.01,20);if(commit)$('limit').value=String(Number(limit.toFixed(3)));$('negative-label').textContent=`−${limit.toFixed(2)}%`;$('positive-label').textContent=`+${limit.toFixed(2)}%`;$('scale-bar').hidden=$('color').value!=='signed';for(const v of views)renderStep(v);}
function lock(value){loading=value;document.body.dataset.loaded=value?'loading':activeKey;for(const node of document.querySelectorAll('button,input,select'))node.disabled=value;}
async function loadModel(){
  const token=++loadToken,key=modelKey;stop();lock(true);$('status').textContent='Loading and checking decoded surfaces…';
  try{const next=await modelData(key);if(token!==loadToken)return;active=next;activeKey=key;makeMeshes();$('status').textContent=`${meta.model_labels[key]} · Four PCs · 41 decoded positions per axis · Frozen model`;
    lock(false);
  }catch(error){if(token!==loadToken)return;active=null;for(const v of views)removeMeshes(v);lock(false);document.body.dataset.loaded='error';$('status').textContent=error.message;console.error(error);}
}
function animate(time){
  requestAnimationFrame(animate);
  if(!loading&&active&&time-lastTime>=125){lastTime=time;for(const v of views){if(!v.playing)continue;if(v.step===40)v.direction=-1;if(v.step===0)v.direction=1;setStep(v,v.step+v.direction);}}
  for(const v of views){v.controls.update();v.light.position.copy(v.camera.position);v.light.target.position.copy(v.controls.target);v.renderer.render(v.scene,v.camera);}
}
$('color').onchange=()=>scale();$('limit').onchange=()=>scale();$('limit').oninput=()=>scale(false);
$('scale-reset').onclick=()=>{$('limit').value=String(meta.default_limit_pct);scale();};
for(const id of ['wire','defects'])$(id).onchange=()=>{for(const v of views)renderStep(v);};
$('sync-sliders').onchange=()=>{stop();if($('sync-sliders').checked)setStep(views[0],views[0].step,true);};
$('sync-cameras').onchange=()=>{if($('sync-cameras').checked)copyCamera(lastView||views[0]);};
$('fit').onclick=fit;
$('flip').onclick=()=>{cameraSync=true;for(const v of views){const offset=v.camera.position.clone().sub(v.controls.target);v.camera.position.copy(v.controls.target).sub(offset);v.camera.lookAt(v.controls.target);}cameraSync=false;};
$('zero-all').onclick=()=>{stop();for(const v of views)setStep(v,20);};
$('play-all').onclick=()=>{const value=!views.some(v=>v.playing);for(const v of views){v.playing=value;v.direction=1;}updatePlay();};
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
window.addEventListener('pagehide',stop);
icons();requestAnimationFrame(animate);
try{const response=await fetch('../traversals/data.json');if(!response.ok)throw new Error('Traversal data unavailable');meta=await response.json();$('limit').value=String(meta.default_limit_pct);await loadModel();scale();fit();makeScorePlots();}
catch(error){$('status').textContent=error.message;document.body.dataset.loaded='error';console.error(error);}

function svgElement(tag,attributes={},text){
  const element=document.createElementNS('http://www.w3.org/2000/svg',tag);
  for(const [key,value] of Object.entries(attributes))element.setAttribute(key,value);
  if(text!==undefined)element.textContent=text;
  return element;
}
function makeScorePlots(){
  for(const [id,xpc,ypc] of [['12',0,1],['34',2,3]]){
    const plot={id,xpc,ypc,svg:$('scores'+id)};scorePlots.push(plot);
    new ResizeObserver(()=>drawScorePlot(plot)).observe(plot.svg);
    drawScorePlot(plot);
  }
}
function drawScorePlot(plot){
  const {svg,xpc,ypc}=plot,w=Math.max(280,svg.clientWidth),h=360;
  svg.replaceChildren();svg.setAttribute('viewBox',`0 0 ${w} ${h}`);
  const left=54,right=w-20,top=18,bottom=h-46;
  const values=meta.scores.flatMap(row=>[row[`PC${xpc+1}_SD`],row[`PC${ypc+1}_SD`]]);
  const lo=Math.floor(Math.min(-2,...values)),hi=Math.ceil(Math.max(2,...values));
  const x=value=>left+(value-lo)/(hi-lo)*(right-left),y=value=>bottom-(value-lo)/(hi-lo)*(bottom-top);
  plot.x=x;plot.y=y;
  const step=hi-lo>8?2:1;
  for(let tick=lo;tick<=hi;tick+=step){
    const zero=tick===0,stroke=zero?'#a7b7bc':'#e8edef';
    svg.append(svgElement('line',{x1:x(tick),x2:x(tick),y1:top,y2:bottom,stroke}),svgElement('line',{x1:left,x2:right,y1:y(tick),y2:y(tick),stroke}));
    svg.append(svgElement('text',{x:x(tick),y:bottom+20,'text-anchor':'middle',class:'tick'},String(tick)),svgElement('text',{x:left-10,y:y(tick)+4,'text-anchor':'end',class:'tick'},String(tick)));
  }
  svg.append(svgElement('rect',{x:left,y:top,width:right-left,height:bottom-top,fill:'none',stroke:'#b9c6cb'}));
  svg.append(svgElement('text',{x:(left+right)/2,y:h-7,'text-anchor':'middle',class:'axis-label'},`PC${xpc+1} (${(100*active.record.variance_ratio[xpc]).toFixed(1)}%) | SD`));
  svg.append(svgElement('text',{transform:`translate(14 ${(top+bottom)/2}) rotate(-90)`,'text-anchor':'middle',class:'axis-label'},`PC${ypc+1} (${(100*active.record.variance_ratio[ypc]).toFixed(1)}%) | SD`));
  for(const row of meta.scores){
    const px=x(row[`PC${xpc+1}_SD`]),py=y(row[`PC${ypc+1}_SD`]),training=row.partition==='Training';
    const point=training?svgElement('circle',{cx:px,cy:py,r:3.5}):svgElement('path',{d:`M${px},${py-4.5}l4.5,8h-9Z`});
    point.setAttribute('class','score-point '+(training?'train':'tune'));
    const description=`${row.mesh_id} | ${row.partition} | PC${xpc+1}: ${row[`PC${xpc+1}_SD`].toFixed(3)} SD; PC${ypc+1}: ${row[`PC${ypc+1}_SD`].toFixed(3)} SD`;
    point.append(svgElement('title',{},description));
    point.addEventListener('pointerenter',event=>showScoreTooltip(description,event));
    point.addEventListener('pointermove',event=>showScoreTooltip(description,event));
    point.addEventListener('pointerleave',()=>{$('score-tooltip').hidden=true;});
    point.addEventListener('click',event=>showScoreTooltip(description,event));
    svg.append(point);
  }
  plot.guide=svgElement('path',{class:'score-guide',d:''});svg.append(plot.guide);updateScoreGuides();
}
function updateScoreGuides(){
  for(const plot of scorePlots){
    if(!plot.guide)continue;
    const sx=(views[plot.xpc].step-20)/10,sy=(views[plot.ypc].step-20)/10,px=plot.x(sx),py=plot.y(sy);
    plot.guide.setAttribute('d',`M${px-8},${py}h16M${px},${py-8}v16`);
    plot.guide.dataset.x=sx;plot.guide.dataset.y=sy;
    $('score-guide'+plot.id).textContent=`Slider coordinates: PC${plot.xpc+1} ${sx.toFixed(1)} SD | PC${plot.ypc+1} ${sy.toFixed(1)} SD`;
  }
}
function showScoreTooltip(description,event){
  const tip=$('score-tooltip');tip.textContent=description;tip.hidden=false;
  tip.style.left=`${clamp(event.clientX+12,8,innerWidth-tip.offsetWidth-8)}px`;
  tip.style.top=`${clamp(event.clientY+12,8,innerHeight-tip.offsetHeight-8)}px`;
}
document.addEventListener('scroll',()=>{$('score-tooltip').hidden=true;},{passive:true,capture:true});
