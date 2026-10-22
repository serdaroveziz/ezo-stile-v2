/* Dry-run-only user/business/staff relationship audit. Never writes data. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function normalizePhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 10 && digits.startsWith('5')) return `90${digits}`;
  if (digits.length === 11 && digits.startsWith('05')) return `9${digits}`;
  return digits;
}

function maskPhone(value) {
  const phone = normalizePhone(value);
  return phone ? `${'*'.repeat(Math.max(0, phone.length - 2))}${phone.slice(-2)}` : null;
}

export function auditUserRoleLinks({ users = {}, businesses = {}, salon_applications: salonApplications = {}, staff: rootStaff = {} } = {}) {
  const findings = [];
  const ownerBusinesses = new Map();
  const staffByUid = new Map();
  for (const [businessId,business] of Object.entries(businesses || {})) {
    if (!business || typeof business !== 'object') continue;
    if (business.ownerUid) {
      const list=ownerBusinesses.get(business.ownerUid)||[];list.push(businessId);ownerBusinesses.set(business.ownerUid,list);
    }
  }
  for (const [businessId,business] of Object.entries(businesses || {})) {
    for (const [staffId,staff] of Object.entries((business && business.staff) || {})) {
      const uid = staff && (staff.userId || staff.uid);
      if (!uid || staff.active === false) continue;
      const links = staffByUid.get(uid) || [];
      links.push({ businessId, staffId, role:staff.role || null });
      staffByUid.set(uid, links);
    }
  }
  for (const [staffId,staff] of Object.entries(rootStaff || {})) {
    const uid = staff && (staff.userId || staff.uid);
    if (!uid || staff.active === false) continue;
    const links = staffByUid.get(uid) || [];
    links.push({ businessId:staff.businessId || null, staffId, role:staff.role || null, source:'root' });
    staffByUid.set(uid, links);
  }
  for (const [uid,user] of Object.entries(users || {})) {
    if (!user || typeof user !== 'object') continue;
    const businessId=String(user.businessId||''),business=businesses[businessId]||null,owned=ownerBusinesses.get(uid)||[];
    const staffLinks=staffByUid.get(uid)||[];
    if(user.role==='owner'&&(!business||business.ownerUid!==uid))findings.push({type:'OWNER_PROFILE_MISMATCH',uid,businessId:businessId||null});
    if(user.role==='customer'&&owned.length) findings.push({type:'CUSTOMER_IS_BUSINESS_OWNER',uid,businessIds:owned});
    if(owned.length>1)findings.push({type:'MULTIPLE_BUSINESS_OWNERSHIP',uid,businessIds:owned});
    if(owned.length&&staffLinks.length)findings.push({type:'OWNER_STAFF_CONFLICT',uid,ownerBusinessIds:owned,staffLinks});
    if(businessId&&!business)findings.push({type:'ORPHAN_BUSINESS_ID',uid,businessId});
    if(['barber','receptionist','manager'].includes(user.role)&&!staffLinks.some(link=>link.businessId===businessId&&link.role===user.role))findings.push({type:'STAFF_PROFILE_MISMATCH',uid,businessId:businessId||null,role:user.role});
  }

  const usersByPhone = new Map();
  for (const [uid,user] of Object.entries(users || {})) {
    const phone = normalizePhone(user && user.phone);
    if (!phone) continue;
    const uids = usersByPhone.get(phone) || [];
    uids.push(uid);
    usersByPhone.set(phone, uids);
  }
  for (const [phone,uids] of usersByPhone.entries()) {
    if (uids.length > 1) findings.push({type:'DUPLICATE_USER_PHONE_IDENTITY',phone:maskPhone(phone),uids});
  }

  for (const [applicationId,application] of Object.entries(salonApplications || {})) {
    if (!application || application.status !== 'approved') continue;
    const businessId = String(application.businessId || '');
    const business = businesses[businessId] || null;
    if (!business) {
      findings.push({type:'APPROVED_APPLICATION_MISSING_BUSINESS',applicationId,businessId:businessId || null,applicantUid:application.applicantUid || null});
    } else if (business.ownerUid !== application.applicantUid) {
      findings.push({type:'APPLICATION_OWNER_MISMATCH',applicationId,businessId,applicantUid:application.applicantUid || null,ownerUid:business.ownerUid || null});
    }
  }

  return {dryRun:true,userCount:Object.keys(users||{}).length,businessCount:Object.keys(businesses||{}).length,applicationCount:Object.keys(salonApplications||{}).length,findingCount:findings.length,findings};
}

async function loadInput(args){
  const inputAt=args.indexOf('--input');
  if(inputAt>=0&&args[inputAt+1])return JSON.parse(await fs.readFile(path.resolve(args[inputAt+1]),'utf8'));
  if(args.includes('--live')){
    const {getAdminDatabase}=await import('../server/firebase-admin.js');
    const [users,businesses,applications,staff]=await Promise.all([
      getAdminDatabase().ref('users').get(),
      getAdminDatabase().ref('businesses').get(),
      getAdminDatabase().ref('salon_applications').get(),
      getAdminDatabase().ref('staff').get()
    ]);
    return {users:users.val()||{},businesses:businesses.val()||{},salon_applications:applications.val()||{},staff:staff.val()||{}};
  }
  throw new Error('Dry-run veri kaynağı gerekli: --input <snapshot.json>. Canlı salt-okunur denetim için açıkça --live kullanın.');
}
const isMain=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(isMain){loadInput(process.argv.slice(2)).then(data=>console.log(JSON.stringify(auditUserRoleLinks(data),null,2))).catch(error=>{console.error(error.message);process.exitCode=1;});}
