import { uiIcon } from './icons.js';
import { brandingStyle } from '../brand-colors.js';
const preferenceKey=(uid,businessId)=>`unelivo_owner_appearance:${uid}:${businessId}`;
export function getOwnerAppearance(uid,businessId){try{return localStorage.getItem(preferenceKey(uid,businessId))==='salon'?'salon':'user';}catch{return 'user';}}
export function setOwnerAppearance(uid,businessId,value){try{localStorage.setItem(preferenceKey(uid,businessId),value==='salon'?'salon':'user');return true;}catch{return false;}}
export function ownerAppearanceStyle(business,useSalon){return useSalon&&business.branding?brandingStyle(business.branding)+'--text-primary:var(--salon-text);--bg-primary:var(--salon-bg);--bg:var(--salon-bg);--theme-on-accent:var(--salon-on-primary);':'';}
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function renderOwnerSalonLogo(business={}){
 const value=business.media?.logoUrl||business.logoUrl||'';
 const safe=/^data:image\/(?:jpeg|png|webp);base64,[a-z0-9+/=]+$/i.test(value)||/^https:\/\/[^\s<>"']+$/i.test(value);
 if(!safe)return `<span class="owner-salon-logo owner-salon-logo-empty" role="img" aria-label="Salon logosu henüz eklenmedi">${uiIcon('store')}</span>`;
 return `<img class="owner-salon-logo" src="${esc(value)}" alt="${esc(business.name||'Salon logosu')}" onerror="this.hidden=true;this.nextElementSibling.hidden=false;"><span class="owner-salon-logo owner-salon-logo-empty" hidden aria-label="Salon logosu yüklenemedi">${uiIcon('store')}</span>`;
}
