export function logoCropGeometry(width,height,{zoom=1,x=0,y=0,size=384}={}){
 if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)throw Error('Görsel boyutu geçersiz.');
 const cover=Math.max(size/width,size/height),fit=Math.min(size/width,size/height)/cover;
 const scale=cover*Math.max(fit,Math.min(3,Number(zoom)||1)),w=width*scale,h=height*scale;
 return {width:w,height:h,left:(size-w)/2+Math.max(-1,Math.min(1,Number(x)||0))*Math.abs(w-size)/2,top:(size-h)/2+Math.max(-1,Math.min(1,Number(y)||0))*Math.abs(h-size)/2,fit};
}
// This editor writes a square raster; the app displays it inside a circular logo frame.
export async function openLogoCropper(file){
 if(!file||!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024)throw Error('En fazla 5 MB JPEG, PNG veya WebP seçin.');
 const url=URL.createObjectURL(file),img=new Image();
 try{await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error('Görsel okunamadı.'));img.src=url;});}catch(e){URL.revokeObjectURL(url);throw e;}
 return new Promise((resolve,reject)=>{
  const dialog=document.createElement('dialog');dialog.className='theme-picker logo-cropper';
  dialog.innerHTML=`<h2>Salon logosunu ayarla</h2><p>Resmi sürükleyerek ortala. Yuvarlak alanda görünen bölüm logon olacak.</p><canvas width="384" height="384" aria-label="Yuvarlak logo önizlemesi"></canvas><label>Yakınlaştır<input data-zoom type="range" min="0.1" max="3" step="0.01" value="1"></label><label>Yatay konum<input data-x type="range" min="-1" max="1" step="0.01" value="0"></label><label>Dikey konum<input data-y type="range" min="-1" max="1" step="0.01" value="0"></label><div class="logo-crop-actions"><button type="button" data-fit>Tüm resmi sığdır</button><button type="button" data-center>Ortala</button></div><p data-status role="status"></p><div class="logo-crop-actions"><button type="button" data-cancel>Vazgeç</button><button type="button" class="btn btn-gold" data-save>Bu logoyu kullan</button></div>`;
  document.body.append(dialog);const canvas=dialog.querySelector('canvas'),ctx=canvas.getContext('2d'),state={zoom:1,x:0,y:0};let finished=false,drag=null;
  const geometry=()=>logoCropGeometry(img.naturalWidth,img.naturalHeight,state);
  const zoom=dialog.querySelector('[data-zoom]');zoom.min=String(geometry().fit);
  function render(){const g=geometry();ctx.clearRect(0,0,384,384);ctx.drawImage(img,g.left,g.top,g.width,g.height);for(const key of ['zoom','x','y'])dialog.querySelector('[data-'+key+']').value=state[key];}
  function finish(value,error){if(finished)return;finished=true;URL.revokeObjectURL(url);dialog.close();dialog.remove();error?reject(error):resolve(value);}
  for(const key of ['zoom','x','y'])dialog.querySelector('[data-'+key+']').oninput=e=>{state[key]=Number(e.target.value);render();};
  dialog.querySelector('[data-fit]').onclick=()=>{state.zoom=geometry().fit;state.x=state.y=0;render();};
  dialog.querySelector('[data-center]').onclick=()=>{state.x=state.y=0;render();};
  canvas.onpointerdown=e=>{drag={id:e.pointerId,x:e.clientX,y:e.clientY,sx:state.x,sy:state.y};canvas.setPointerCapture(e.pointerId);};
  canvas.onpointermove=e=>{if(!drag||e.pointerId!==drag.id)return;const g=geometry(),ratio=384/canvas.getBoundingClientRect().width;state.x=Math.max(-1,Math.min(1,drag.sx+(e.clientX-drag.x)*ratio/Math.max(1,Math.abs(g.width-384)/2)));state.y=Math.max(-1,Math.min(1,drag.sy+(e.clientY-drag.y)*ratio/Math.max(1,Math.abs(g.height-384)/2)));render();};
  canvas.onpointerup=canvas.onpointercancel=()=>{drag=null;};
  dialog.querySelector('[data-cancel]').onclick=()=>finish(null);dialog.addEventListener('cancel',e=>{e.preventDefault();finish(null);});dialog.addEventListener('close',()=>finish(null));
  dialog.querySelector('[data-save]').onclick=()=>{try{finish(canvas.toDataURL('image/webp',.9));}catch(e){finish(null,e);}};
  try{render();dialog.showModal();}catch(e){finish(null,e);}
 });
}
