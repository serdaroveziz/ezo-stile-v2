/* UNELIVO - Tenant-safe, globally phone-unique staff invitations */
import crypto from 'crypto';
import { getAdminDatabase } from '../../firebase-admin.js';
import { hasPermission, sanitizeStaffPermissions, staffPermissionPreset } from '../../../src/staff-permissions.js';
import { canonicalStaffPhone, isValidPendingInvite, normalizeStaffPhone, reservePhoneAndWriteInvite, staffPhoneIndexPath, staffPhoneOf } from '../../staff-phone.js';

function activeStaffConflict(businesses, phone) {
  for (const [businessId, business] of Object.entries(businesses || {})) for (const [staffId, staff] of Object.entries((business && business.staff) || {})) if (staff && staff.active !== false && staffPhoneOf(staff) === phone) return { businessId, staffId };
  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error:'Method Not Allowed' });
  if (!req.auth || !req.auth.uid || !req.auth.profile) return res.status(401).json({ error:'Oturum doğrulaması gerekli.' });
  const caller=req.auth.profile; const canManage=caller.role==='owner'||(caller.role==='manager'&&hasPermission(caller.permissions,'staff.manage'));
  if (!canManage || !caller.businessId) return res.status(403).json({ error:'Personel daveti oluşturma yetkiniz yok.' });
  try {
    const {displayName,phone,role,services,permissions}=req.body||{};
    if(String(displayName||'').trim().length<2||!['manager','barber','receptionist'].includes(role))return res.status(400).json({error:'Geçerli çalışan adı ve rolü zorunludur.'});
    const phoneNormalized=normalizeStaffPhone(phone); if(!phoneNormalized)return res.status(400).json({error:'Geçerli çalışan telefonu zorunludur.'});
    const db=getAdminDatabase(), now=Date.now();
    const [businessesSnap,invitesSnap,indexSnap]=await Promise.all([db.ref('businesses').get(),db.ref('staff_invites').get(),db.ref(staffPhoneIndexPath(phoneNormalized)).get()]);
    const businesses=businessesSnap.val()||{}, invitations=invitesSnap.val()||{};
    const expiredIds=Object.entries(invitations).filter(([,invite])=>invite&&invite.businessId===caller.businessId&&!isValidPendingInvite(invite,now)&&invite.used!==true).map(([id])=>id);
    if(expiredIds.length)await db.ref().update(Object.fromEntries(expiredIds.map(id=>[`staff_invites/${id}`,null])));
    const active=activeStaffConflict(businesses,phoneNormalized); if(active)return res.status(409).json({error:active.businessId===caller.businessId?'Bu telefon bu salonda aktif bir çalışana bağlı.':'Bu telefon başka bir işletmede aktif çalışan hesabına bağlı.'});
    const pending=Object.entries(invitations).find(([,invite])=>isValidPendingInvite(invite,now)&&Boolean(businesses[invite.businessId])&&staffPhoneOf(invite)===phoneNormalized);
    if(pending){const [id,invite]=pending;if(invite.businessId!==caller.businessId)return res.status(409).json({error:'Bu telefon için başka bir işletmede bekleyen çalışan daveti bulunuyor.'});return res.status(200).json({success:true,alreadyPending:true,message:'Bu telefon için zaten bekleyen bir davet var.',inviteId:id,token:invite.token||invite.code,phone:canonicalStaffPhone(phoneNormalized),expiresAt:invite.expiresAt});}
    const indexRef=db.ref(staffPhoneIndexPath(phoneNormalized)), currentIndex=indexSnap.exists()?indexSnap.val():null;
    if(currentIndex){const referenced=currentIndex.inviteId&&invitations[currentIndex.inviteId];const stalePending=currentIndex.state==='pending'&&(!isValidPendingInvite(referenced,now)||!businesses[referenced.businessId]);const staleActive=currentIndex.state==='active'&&!active;if(stalePending||staleActive)await indexRef.transaction(current=>current&&current.inviteId===currentIndex.inviteId&&current.state===currentIndex.state?null:current);}
    const inviteId=`inv_rec_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,token=`inv_${crypto.randomBytes(16).toString('hex')}`,expiresAt=now+86400000;
    const reservation={state:'pending',phoneNormalized,businessId:caller.businessId,inviteId,createdAt:new Date().toISOString(),expiresAt};
    const invite={inviteId,token,businessId:caller.businessId,displayName:String(displayName).trim(),phone:canonicalStaffPhone(phoneNormalized),phoneNormalized,role,services:Array.isArray(services)&&services.length?services:['all'],permissions:sanitizeStaffPermissions(role,permissions??staffPermissionPreset(role)),createdBy:req.auth.uid,expiresAt,used:false,status:'pending',createdAt:new Date().toISOString()};
    const write=await reservePhoneAndWriteInvite({indexRef,inviteRef:db.ref(`staff_invites/${inviteId}`),reservation,invite}); if(!write.committed)return res.status(409).json({error:'Bu telefon başka bir işletmede kullanılıyor veya bekleyen davete sahip.'});
    return res.status(200).json({success:true,inviteId,token,phone:invite.phone,expiresAt});
  }catch(error){console.error('Create invite API error:',error);return res.status(error.statusCode||500).json({error:error.statusCode?error.message:'Çalışan daveti oluşturulamadı.'});}
}
