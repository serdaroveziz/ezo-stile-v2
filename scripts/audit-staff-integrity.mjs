#!/usr/bin/env node
/* Offline-only staff integrity audit. Reads an exported JSON file and never writes Firebase. */
import fs from 'fs';
import path from 'path';
import { normalizeStaffPhone, isValidPendingInvite, staffPhoneOf } from '../server/staff-phone.js';

const inputArg = process.argv.find(arg => arg.startsWith('--input='));
if (!inputArg) { console.error('Kullanım: node scripts/audit-staff-integrity.mjs --input=export.json'); process.exit(2); }
if (process.argv.includes('--apply')) { console.error('Bu araç yalnız dry-run çalışır; --apply desteklenmez.'); process.exit(2); }
const inputPath = path.resolve(inputArg.slice('--input='.length));
const data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const now = Date.now(), businesses = data.businesses || {}, users = data.users || {}, invites = data.staff_invites || {};
const findings = [];
const activeByPhone = new Map(), pendingByPhone = new Map();

for (const [businessId,business] of Object.entries(businesses)) for (const [staffId,staff] of Object.entries((business&&business.staff)||{})) {
  const phone=staffPhoneOf(staff); if(!phone)findings.push({type:'staff_missing_phoneNormalized',businessId,staffId});
  if(staff&&staff.active!==false&&phone){const prior=activeByPhone.get(phone);if(prior)findings.push({type:'duplicate_active_staff_phone',phone,records:[prior,{businessId,staffId}]});else activeByPhone.set(phone,{businessId,staffId});}
}
for(const [inviteId,invite] of Object.entries(invites)){
  const phone=staffPhoneOf(invite);
  if(!businesses[invite.businessId])findings.push({type:'invalid_businessId',inviteId,businessId:invite.businessId});
  if(!phone)findings.push({type:'invite_missing_phoneNormalized',inviteId});
  if(invite.status==='cancelled')findings.push({type:'cancelled_invite_not_deleted',inviteId});
  if(!isValidPendingInvite(invite,now)){findings.push({type:Number(invite.expiresAt||0)<=now?'expired_invite':'non_pending_invite_not_deleted',inviteId});continue;}
  if(phone){const prior=pendingByPhone.get(phone);if(prior)findings.push({type:'duplicate_pending_invite_phone',phone,records:[prior,{inviteId,businessId:invite.businessId}]});else pendingByPhone.set(phone,{inviteId,businessId:invite.businessId});}
  const linkedUser=Object.values(users).find(user=>user&&user.businessId===invite.businessId&&normalizeStaffPhone(user.phone)===phone&&['barber','manager','receptionist'].includes(user.role));
  const linkedStaff=Object.values((businesses[invite.businessId]&&businesses[invite.businessId].staff)||{}).find(staff=>staff&&staff.active!==false&&staffPhoneOf(staff)===phone);
  if(linkedUser||linkedStaff)findings.push({type:'linked_identity_invite_still_pending',inviteId,userLinked:Boolean(linkedUser),staffLinked:Boolean(linkedStaff)});
}
for(const [phone,index] of Object.entries(data.staff_phone_index||{})){
  if(!normalizeStaffPhone(phone))findings.push({type:'malformed_phone_index_key',phone});
  if(index&&index.state==='pending'&&!isValidPendingInvite(invites[index.inviteId],now))findings.push({type:'orphan_pending_phone_index',phone,inviteId:index.inviteId});
  if(index&&index.state==='active'&&!activeByPhone.has(normalizeStaffPhone(phone)))findings.push({type:'orphan_active_phone_index',phone,staffId:index.staffId});
}
console.log(JSON.stringify({mode:'DRY_RUN',input:inputPath,counts:{businesses:Object.keys(businesses).length,invites:Object.keys(invites).length,activePhones:activeByPhone.size,pendingPhones:pendingByPhone.size,findings:findings.length},findings},null,2));
