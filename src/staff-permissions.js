export const STAFF_PERMISSION_LABELS = Object.freeze({
  'appointments.own.view':'Kendi randevularını gör','appointments.own.complete':'Kendi randevusunu tamamlandı yap','customer.phone.view':'Müşteri telefonunu gör','appointments.no_show':'No-show işaretle','appointments.notes.manage':'Randevu notunu düzenle','schedule.own.manage':'Kendi çalışma saatini düzenle','appointments.view':'Salon randevularını gör','appointments.create':'Manuel randevu oluştur','customers.view':'Müşterileri gör','appointments.manage':'Randevu onay/red ve yönetim','requests.manage':'İptal/değişiklik taleplerini yönet','schedule.view':'Çalışan programlarını gör','finance.view':'Ciroyu gör','schedule.manage':'Çalışan programlarını düzenle','services.manage':'Hizmetleri düzenle','staff.manage':'Çalışanları yönet','reports.view':'Raporları gör','business.manage':'Salon bilgilerini yönet'
});

export const ROLE_PERMISSION_KEYS=Object.freeze({
  barber:['appointments.create','appointments.own.view','appointments.own.complete','customer.phone.view','appointments.no_show','appointments.notes.manage','schedule.own.manage'],
  receptionist:['appointments.view','appointments.create','customers.view','appointments.manage','requests.manage','customer.phone.view'],
  manager:['appointments.view','appointments.create','appointments.manage','customers.view','schedule.view','requests.manage','finance.view','schedule.manage','services.manage','staff.manage','reports.view','business.manage']
});
export const ROLE_PERMISSION_DEFAULTS=Object.freeze({
  barber:['appointments.own.view','appointments.own.complete'],
  receptionist:['appointments.view','appointments.create','customers.view'],
  manager:['appointments.view','appointments.create','appointments.manage','customers.view','schedule.view','requests.manage']
});
const ALL_PERMISSIONS=new Set(Object.keys(STAFF_PERMISSION_LABELS));
const safeLegacyName=key=>ALL_PERMISSIONS.has(key)?key:Array.from(ALL_PERMISSIONS).find(name=>name.replace(/\./g,'_')===key)||'';

function collectLegacy(value,prefix='',output=[]){
  if(Array.isArray(value)){for(const item of value)if(typeof item==='string')output.push(item);else if(item!=null)output.push('__malformed__');return output;}
  if(!value||typeof value!=='object')return value==null?output:['__malformed__'];
  for(const [key,child] of Object.entries(value)){
    const direct=safeLegacyName(key); const nested=prefix?`${prefix}.${key}`:key;
    if(child===true)output.push(direct||safeLegacyName(nested)||nested);
    else if(child&&typeof child==='object')collectLegacy(child,nested,output);
    else if(child!==false&&child!=null)output.push('__malformed__');
  }
  return output;
}

export function normalizePermissions(value,{role=null,strict=false}={}){
  const candidates=collectLegacy(value); const allowed=role?new Set(ROLE_PERMISSION_KEYS[role]||[]):ALL_PERMISSIONS;
  const invalid=candidates.filter(name=>!ALL_PERMISSIONS.has(name)||!allowed.has(name));
  if(strict&&invalid.length){const error=new Error(`Geçersiz personel izni: ${invalid[0]}`);error.statusCode=400;throw error;}
  return Array.from(new Set(candidates.filter(name=>ALL_PERMISSIONS.has(name)&&allowed.has(name)))).sort();
}
export function hasPermission(permissions,name){return normalizePermissions(permissions).includes(name);}
export function getDefaultPermissionsForRole(role){return normalizePermissions(ROLE_PERMISSION_DEFAULTS[role]||[],{role});}
export function sanitizeStaffPermissions(role,permissions=[]){return normalizePermissions(permissions,{role,strict:true});}
export const staffPermissionPreset=getDefaultPermissionsForRole;
export function hasStaffPermission(user,key){if(key==='appointments.create'&&['barber','manager','receptionist'].includes(user?.role))return true;return Boolean(user&&hasPermission(user.permissions,key));}
export function staffOperationTabs(user){return[...(hasStaffPermission(user,'appointments.create')?['manual']:[]),...(hasStaffPermission(user,'requests.manage')?['requests']:[]),...(hasStaffPermission(user,'schedule.manage')?['staff_schedule']:[])];}
