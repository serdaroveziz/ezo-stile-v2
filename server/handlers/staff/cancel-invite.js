import { getAdminDatabase } from '../../firebase-admin.js';
import { staffPhoneIndexPath, staffPhoneOf } from '../../staff-phone.js';
import { hasPermission } from '../../../src/staff-permissions.js';

export async function cancelStaffInvite({db,caller,inviteId}){
  const canManage=caller&&(caller.role==='owner'||(caller.role==='manager'&&hasPermission(caller.permissions,'staff.manage')));
  if(!canManage||!caller.businessId)throw Object.assign(new Error('Davet iptal etme yetkiniz yok.'),{statusCode:403});
  if(!inviteId)throw Object.assign(new Error('Davet kimliği zorunludur.'),{statusCode:400});
  const ref=db.ref(`staff_invites/${inviteId}`),snapshot=await ref.get(),invite=snapshot.exists()?snapshot.val():null;
  if(!invite||invite.businessId!==caller.businessId||invite.used===true||invite.status!=='pending')throw Object.assign(new Error('Aktif davet bulunamadı.'),{statusCode:404});
  await ref.remove();const verification=await ref.get();if(verification.exists())throw Object.assign(new Error('Davet silinemedi. Lütfen tekrar deneyin.'),{statusCode:500});
  const indexPath=staffPhoneIndexPath(staffPhoneOf(invite));if(indexPath)await db.ref(indexPath).transaction(current=>current&&current.inviteId===inviteId&&current.businessId===caller.businessId?null:current);
  return{success:true,inviteId,deleted:true};
}

export default async function handler(req,res){
  if(req.method!=='POST')return res.status(405).json({error:'Method Not Allowed'});
  try{return res.status(200).json(await cancelStaffInvite({db:getAdminDatabase(),caller:req.auth&&req.auth.profile,inviteId:String((req.body&&req.body.inviteId)||'')}));}
  catch(error){return res.status(error.statusCode||500).json({error:error.message||'Davet iptal edilemedi.'});}
}
