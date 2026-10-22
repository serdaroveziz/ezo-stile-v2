import { openLogoCropper } from './logo-cropper.js';
import { normalizeBranding, brandingStyle, contrast, hexColor } from '../brand-colors.js';

async function readImage(file, maxSize) {
  if (!file || !['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 5*1024*1024) throw new Error('En fazla 5 MB JPEG, PNG veya WebP seçin.');
  const bitmap = await createImageBitmap(file, {resizeWidth:maxSize, resizeQuality:'high'});
  try {
    const ratio=Math.min(1,maxSize/bitmap.width,maxSize/bitmap.height);
    const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*ratio));canvas.height=Math.max(1,Math.round(bitmap.height*ratio));
    canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);
    return canvas.toDataURL('image/webp',.8);
  } finally {bitmap.close();}
}

export async function extractPalette(url) {
  // Only process local raster data previously validated and resized by this editor.
  if (!/^data:image\/(png|jpeg|webp);base64,/i.test(url || '')) throw new Error('Renk çıkarmak için önce logonuzu yükleyin.');
  const img=new Image();img.src=url;await img.decode();
  const canvas=document.createElement('canvas');canvas.width=48;canvas.height=48;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0,48,48);
  const pixels=ctx.getImageData(0,0,48,48).data,bins=new Map();
  for(let i=0;i<pixels.length;i+=4){if(pixels[i+3]<128)continue;const rgb=[pixels[i],pixels[i+1],pixels[i+2]].map(v=>Math.min(255,Math.round(v/32)*32));const key='#'+rgb.map(v=>v.toString(16).padStart(2,'0')).join('');if(contrast(key,'#ffffff')<1.15||contrast(key,'#000000')<1.15)continue;bins.set(key,(bins.get(key)||0)+1);}
  return [...bins].sort((a,b)=>b[1]-a[1]).slice(0,5).map(([color])=>color);
}

export function openSalonBrandKit(business, save) {
  document.getElementById('salon-brand-kit')?.remove();
  const dialog=document.createElement('dialog');dialog.id='salon-brand-kit';dialog.className='theme-picker salon-brand-kit';
  let branding=normalizeBranding(business.branding),media={...(business.media||{})}, changedMedia={};
  dialog.innerHTML=`<h2>Salon Marka Kiti</h2><p>Salon sayfanız ve randevu alanınız için. Patron panelinde kullanmak için Profil → Tema ve Salon Görünümü içinden seçin.</p>
    <label class="salon-logo-upload">Salon logosu<input data-file="logoUrl" type="file" accept="image/png,image/jpeg,image/webp"><small>Fotoğraf seç, yuvarlak önizlemede ortala ve kaydet.</small></label>
    <label>Kapak<input data-file="coverImageUrl" type="file" accept="image/png,image/jpeg,image/webp"></label>
    <label>Ana renk <input data-picker="primary" type="color"><input aria-label="Ana renk HEX" data-hex="primary" pattern="#[0-9a-fA-F]{6}" maxlength="7"></label>
    <label>İkinci renk (isteğe bağlı) <input data-picker="secondary" type="color"><input aria-label="İkinci renk HEX" data-hex="secondary" pattern="#[0-9a-fA-F]{6}" maxlength="7"></label>
    <label>Görünüm<select data-mode><option value="light">Açık</option><option value="dark">Koyu</option></select></label>
    <button type="button" data-extract>Logodan renk çıkar</button><div data-palette></div>
    <section class="salon-brand salon-brand-preview" data-preview aria-label="Canlı önizleme"><img data-cover alt="Kapak"><img data-logo alt="Logo"><h3 data-name></h3><p>Hizmet · Çalışan · Tarih/Saat</p><button type="button" class="btn btn-gold">Randevu Al</button><span data-secondary style="display:block;height:5px;margin-top:10px"></span></section>
    <p data-status role="status" aria-live="polite"></p><button type="button" data-save>Kaydet</button><button type="button" data-close>Kapat</button>`;
  document.body.append(dialog);
  const status=dialog.querySelector('[data-status]'),saveButton=dialog.querySelector('[data-save]');
  function preview(){
    dialog.querySelector('[data-preview]').setAttribute('style',brandingStyle(branding));
    dialog.querySelector('[data-name]').textContent=business.name||'Salonunuz';
    for(const [selector,value] of [['[data-logo]',media.logoUrl||business.logoUrl],['[data-cover]',media.coverImageUrl||business.coverPhoto]]){const el=dialog.querySelector(selector);el.hidden=!value;if(value)el.src=value;}
    dialog.querySelector('[data-secondary]').style.background=branding.secondary;
    for(const key of ['primary','secondary']){dialog.querySelector('[data-picker="'+key+'"]').value=branding[key];dialog.querySelector('[data-hex="'+key+'"]').value=branding[key];}
    dialog.querySelector('[data-mode]').value=branding.mode;
  }
  for(const input of dialog.querySelectorAll('[data-picker],[data-hex]')) input.oninput=()=>{
    if(!/^#[0-9a-f]{6}$/i.test(input.value)){input.setCustomValidity('HEX kodu #RRGGBB biçiminde olmalı.');saveButton.disabled=true;return;}
    input.setCustomValidity('');branding[input.dataset.picker||input.dataset.hex]=hexColor(input.value);saveButton.disabled=false;preview();
  };
  dialog.querySelector('[data-mode]').onchange=e=>{branding.mode=e.target.value;preview();};
  for(const input of dialog.querySelectorAll('[data-file]'))input.onchange=async()=>{saveButton.disabled=true;try{const prepared=input.dataset.file==='logoUrl'?await openLogoCropper(input.files[0]):await readImage(input.files[0],1200);if(!prepared)return;media[input.dataset.file]=prepared;changedMedia[input.dataset.file]=prepared;preview();status.textContent='Görsel hazır. Yazı ve simge kontrastı otomatik ayarlandı.';}catch(e){status.textContent=e.message;}finally{saveButton.disabled=false;input.value='';}};
  dialog.querySelector('[data-extract]').onclick=async()=>{try{const colors=await extractPalette(media.logoUrl);const host=dialog.querySelector('[data-palette]');host.replaceChildren();for(const color of colors){const b=document.createElement('button');b.type='button';b.textContent=color;b.style.borderColor=color;b.onclick=()=>{branding.primary=color;preview();};host.append(b);}status.textContent=colors.length?'Bir renk seçin.':'Renk bulunamadı; renk seçiciyi kullanın.';}catch(e){status.textContent=e.message;}};
  saveButton.onclick=async()=>{if([...dialog.querySelectorAll('input')].some(input=>!input.reportValidity()))return;saveButton.disabled=true;try{await save({branding:normalizeBranding(branding),...(Object.keys(changedMedia).length?{media:changedMedia}:{})});status.textContent='Marka kiti kaydedildi.';}catch(e){status.textContent=e.message;}finally{saveButton.disabled=false;}};
  dialog.querySelector('[data-close]').onclick=()=>dialog.close();dialog.addEventListener('close',()=>dialog.remove(),{once:true});preview();dialog.showModal();
}
