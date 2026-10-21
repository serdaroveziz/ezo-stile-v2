// Additional defence at work endpoints; req.auth is established by requireAuth.
export const employeeRoles = ['barber','manager','receptionist'];
export function employeeSalonError(auth, businessId, business) {
 const profile=auth?.profile;
 if(!employeeRoles.includes(profile?.role))return null;
 if(!profile.businessId||profile.businessId!==businessId)return 'Çalışan yalnız kendi salonunda işlem yapabilir.';
 if(business!==undefined){
  const member=Object.values(business?.staff||{}).find(m=>m&&m.active!==false&&m.userId===auth.uid&&m.role===profile.role);
  if(!member)return 'Aktif salon çalışanı kaydı bulunamadı.';
 }
 return null;
}
