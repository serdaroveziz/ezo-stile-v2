import { randomUUID } from 'node:crypto';
import { getAdminDatabase } from '../../firebase-admin.js';
import { validBookingDate } from '../../booking-staff.js';
const safeKey=v=>typeof v==='string'&&!['__proto__','constructor','prototype'].includes(v)&&/^[a-zA-Z0-9_-]{1,140}$/.test(v);
const text=(v,max=200)=>typeof v==='string'?v.trim().slice(0,max):'';
const fail=(message,statusCode=400)=>{throw Object.assign(new Error(message),{statusCode})};
const amount=v=>{const n=Number(v);if(!Number.isSafeInteger(n)||n<=0||n>100000000)fail('Tutar kuruş olarak pozitif tam sayı olmalı.');return n};
export function applyWorkspaceOperation(state,input,{uid,appointments=[],id,now}) {
 const next=structuredClone(state||{});next.customers||={};next.entries||={};next.packages||={};next.products||={};next.campaigns||={};next.requests||={};
 if(!safeKey(input.requestId))fail('İşlem kimliği zorunlu.');
 if(next.requests[input.requestId])return next;
 const customerExists=key=>safeKey(key)&&(next.customers[key]||appointments.some(a=>a.customerUid===key));
 const base={id,createdAt:now,createdBy:uid};
 switch(input.action){
 case 'customer': {
  const key=input.customerId;
  if(!safeKey(key)||(!key.startsWith('crm_')&&!customerExists(key)))fail('Salon müşterisi bulunamadı.');
  const name=text(input.name,100);if(name.length<2)fail('Müşteri adı zorunlu.');
  const phone=text(input.phone,20);if(phone&&!/^\+?[0-9 ()-]{10,20}$/.test(phone))fail('Telefon geçersiz.');
  const birthday=text(input.birthday,10);if(birthday&&!validBookingDate(birthday))fail('Doğum tarihi geçersiz.');
  if(input.smsConsent!==undefined&&typeof input.smsConsent!=='boolean')fail('İzin değeri geçersiz.');
  const previous=next.customers[key]||{};
  next.customers[key]={...previous,id:key,name,phone,birthday,note:text(input.note,1000),tags:text(input.tags,120),updatedAt:now};
  // Recording a declaration is not a claim of verified legal consent.
  if(typeof input.smsConsent==='boolean')next.customers[key].smsConsent={declared:input.smsConsent,recordedAt:now,recordedBy:uid};
  break;
 }
 case 'entry': {
  if(!['charge','receipt','expense'].includes(input.kind))fail('Kasa hareketi geçersiz.');
  if(!['cash','card','transfer'].includes(input.method))fail('Ödeme yöntemi geçersiz.');
  if(input.customerId&&!customerExists(input.customerId))fail('Müşteri bulunamadı.');
  if(input.kind==='charge'&&!input.customerId)fail('Borç kaydı için müşteri seçin.');
  const description=text(input.description,200);if(!description)fail('Açıklama zorunlu.');
  next.entries[id]={...base,kind:input.kind,method:input.method,amountMinor:amount(input.amountMinor),customerId:input.customerId||'',description};break;
 }
 case 'package': {
  if(!customerExists(input.customerId))fail('Müşteri bulunamadı.');
  const total=Number(input.total);if(!Number.isInteger(total)||total<1||total>1000)fail('Seans sayısı geçersiz.');
  const name=text(input.name,100);if(!name)fail('Paket adı zorunlu.');
  if(input.serviceId&&!safeKey(input.serviceId))fail('Hizmet kimliği geçersiz.');
  next.packages[id]={...base,customerId:input.customerId,name,total,used:0,uses:{},serviceId:input.serviceId||''};break;
 }
 case 'consume': {
  const plan=safeKey(input.packageId)&&next.packages[input.packageId];
  const appointment=appointments.find(a=>(a.aptId||a.appointmentId)===input.appointmentId);
  if(!plan||!appointment||appointment.status!=='completed'||appointment.customerUid!==plan.customerId)fail('Seans için aynı müşterinin tamamlanmış randevusu gerekli.');
  if(plan.serviceId&&appointment.serviceId!==plan.serviceId)fail('Randevu hizmeti paketle eşleşmiyor.');
  if(!safeKey(input.appointmentId))fail('Randevu kimliği geçersiz.');
  if(plan.uses[input.appointmentId])break;
  if(Object.values(next.packages).some(p=>p.uses?.[input.appointmentId]))fail('Bu randevu başka paketten düşülmüş.');
  if(plan.used>=plan.total)fail('Kalan seans yok.',409);
  plan.uses[input.appointmentId]={at:now,by:uid};plan.used++;break;
 }
 case 'product': {
  const name=text(input.name,100),stock=Number(input.stock);
  if(!name||!Number.isInteger(stock)||stock<0||stock>1000000)fail('Ürün adı ve stok geçersiz.');
  const productId=input.productId||id;if(!safeKey(productId))fail('Ürün kimliği geçersiz.');
  next.products[productId]={...base,id:productId,name,stock,updatedAt:now};break;
 }
 case 'stock': {
  const product=safeKey(input.productId)&&next.products[input.productId],delta=Number(input.delta);
  if(!product||!Number.isInteger(delta)||!delta||Math.abs(delta)>1000000)fail('Stok hareketi geçersiz.');
  if(product.stock+delta<0)fail('Stok yetersiz.',409);
  product.stock+=delta;product.updatedAt=now;break;
 }
 case 'campaign': {
  const title=text(input.title,100),message=text(input.message,480);
  if(!title||!message)fail('Başlık ve mesaj zorunlu.');
  next.campaigns[id]={...base,title,message,status:'draft',segment:['all','vip','inactive'].includes(input.segment)?input.segment:'all'};break;
 }
 default:fail('Bilinmeyen işlem.');
 }
 next.requests[input.requestId]={id,at:now};
 if(Object.keys(next.requests).length>5000)fail('İşlem sınırı aşıldı; arşivleme gerekli.',409);
 return next;
}
export async function handleWorkspace(req,res,db){
 res.setHeader('Cache-Control','no-store');
 try{
  if(req.method!=='POST')return res.status(405).json({error:'Method Not Allowed'});
  const profile=req.auth?.profile,uid=req.auth?.uid,businessId=profile?.businessId;
  if(profile?.role!=='owner'||!uid||!safeKey(businessId))return res.status(403).json({error:'Bu alan yalnız salon sahibine açık.'});
  if(req.body?.businessId&&req.body.businessId!==businessId)return res.status(403).json({error:'Başka salona erişilemez.'});
  const business=await db.ref(`businesses/${businessId}`).get();
  if(!business.exists()||business.val().ownerUid!==uid)return res.status(403).json({error:'Salon sahipliği doğrulanamadı.'});
  const node=db.ref(`salon_operations/${businessId}`);
  if(!req.body?.action||req.body.action==='read'){const snap=await node.get();return res.status(200).json({data:snap.val()||{},sms:{configured:false,reason:'SMS sağlayıcısı henüz bağlanmadı; kampanyalar taslak olarak kaydedilir.'}})}
  const snapshot=await db.ref('appointments').orderByChild('businessId').equalTo(businessId).get();
  const appointments=Object.entries(snapshot.val()||{}).map(([key,a])=>({...a,aptId:a.aptId||key})).filter(a=>a.businessId===businessId);
  const context={uid,appointments,id:randomUUID(),now:new Date().toISOString()};
  // Prime an absent operations tree before applying state-dependent operations.
  await node.transaction(current=>current||{schemaVersion:1});
  await node.transaction(current=>applyWorkspaceOperation(current,req.body,context));
  return res.status(200).json({success:true});
 }catch(error){return res.status(error.statusCode||500).json({error:error.statusCode?error.message:'İşlem kaydedilemedi.'})}
}
export default (req,res)=>handleWorkspace(req,res,getAdminDatabase());
