/* Direct staff creation is disabled: identities must use the phone-unique invite flow. */
export default async function handler(req,res){
  if(req.method!=='POST')return res.status(405).json({error:'Method Not Allowed'});
  if(!req.auth||!req.auth.profile||!['owner','super_admin'].includes(req.auth.profile.role))return res.status(403).json({error:'Personel yönetimi yetkiniz yok.'});
  return res.status(410).json({error:'Doğrudan çalışan ekleme kapatıldı. Telefon doğrulamalı çalışan daveti oluşturun.'});
}
