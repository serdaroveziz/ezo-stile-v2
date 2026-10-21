import { appointmentHasEnded } from '../../../src/appointment-lifecycle.js';
import { getAdminDatabase } from '../../firebase-admin.js';
import { interpretBookingMessage } from '../../assistant-model.js';
import { signAssistantDraft,verifyAssistantDraft,reserveAssistantQuota } from '../../assistant-draft.js';
import { employeeSalonError } from '../../staff-tenant.js';
import { handleAvailabilityWithDatabase } from '../booking/availability.js';
import { handleBookingListWithDatabase } from '../booking/list.js';
import { createBookingHandler } from '../booking/create.js';
import { bookingDuration, istanbulNowParts, validBookingDate } from '../../booking-staff.js';
const workRoles=['owner','barber','manager','receptionist'];
const key=v=>typeof v==='string'&&/^biz_[a-z0-9_-]+$/i.test(v);
const fail=(message,statusCode=400)=>{throw Object.assign(Error(message),{statusCode})};
async function invoke(handler,req){let code=200,body;await handler(req,{setHeader(){},status(v){code=v;return this},json(v){body=v;return v}});if(code>=400)fail(body?.error||'Randevu işlemi tamamlanamadı.',code);return body;}
function modelCatalog(business){return {name:String(business.name||'Salon').slice(0,100),services:Object.entries(business.services||{}).filter(([,s])=>s&&s.active!==false).slice(0,50).map(([id,s])=>({id,name:String(s.name||'Hizmet').slice(0,100)})),staff:Object.entries(business.staff||{}).filter(([,s])=>s&&s.active!==false).slice(0,50).map(([id,s])=>({id:s.id||id,name:String(s.displayName||s.name||'Çalışan').slice(0,100)}))};}
export function createAssistantHandler({database=getAdminDatabase,interpret=interpretBookingMessage,quota=reserveAssistantQuota,secret=()=>process.env.UNELIVO_ASSISTANT_SECRET,enabled=()=>process.env.UNELIVO_ASSISTANT_ENABLED==='true',modelReady=()=>Boolean(process.env.UNELIVO_ASSISTANT_MODEL&&(process.env.AI_GATEWAY_API_KEY||process.env.VERCEL_OIDC_TOKEN)),createBooking=null}={}){
 return async(req,res)=>{
  res.setHeader('Cache-Control','no-store');
  try{
   if(req.method!=='POST')return res.status(405).json({error:'Method Not Allowed'});
   const auth=req.auth,profile=auth?.profile;if(!auth?.uid||!profile)fail('Oturum açın.',401);
   if(!['customer',...workRoles].includes(profile.role))fail('Bu hesap için randevu asistanı açık değil.',403);
   const db=database(),manual=workRoles.includes(profile.role),body=req.body||{};
   const configured=enabled()&&modelReady()&&String(secret()||'').length>=32;
   if(body.action==='catalog'){
    let businesses=[];
    if(manual){const id=profile.businessId;if(!key(id))fail('Salon bağlantısı bulunamadı.',403);const snap=await db.ref('businesses/'+id).get();const b=snap.val();if(!b||b.status==='suspended'||employeeSalonError(auth,id,b)||(profile.role==='owner'&&b.ownerUid!==auth.uid))fail('Salon erişimi reddedildi.',403);businesses=[{businessId:id,name:String(b.name||'Salon')}];}
    else {const snap=await db.ref('public_businesses').get();businesses=Object.entries(snap.val()||{}).filter(([id,b])=>key(id)&&b&&b.status==='active'&&b.discoveryEnabled===true&&b.bookingEnabled!==false&&!b.hiddenFromDiscovery).slice(0,100).map(([id,b])=>({businessId:id,name:String(b.name||'Salon')}));}
    return res.status(200).json({configured,businesses,manual});
   }
   if(!configured)fail('Yazılı asistan henüz etkinleştirilmedi. Model, güvenli onay anahtarı ve AI Gateway bağlantısı kurulmalı.',503);
   if(body.action==='my_appointments'){
    const result=await invoke((r,s)=>handleBookingListWithDatabase(r,s,db),{...req,body:manual?{businessId:profile.businessId}:{customer:true}});
    const today=istanbulNowParts().date;const records=(result.appointments||[]).filter(a=>a.date>=today&&!appointmentHasEnded(a)&&!['completed','cancelled','rejected','no_show'].includes(a.status)).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time)).slice(0,10).map(a=>({date:a.date,time:a.time,service:a.serviceNameSnapshot||a.serviceName,staff:a.staffNameSnapshot||a.staffName,status:a.status}));
    return res.status(200).json({message:manual?'Yetkili olduğunuz yaklaşan salon randevuları:':'Yaklaşan randevularınız:',appointments:records});
   }
   let draft=null;if(body.action==='confirm'){if(body.confirm!==true)fail('Açık onay gerekli.');draft=verifyAssistantDraft(body.token,secret(),auth.uid);if(draft.role!==profile.role)fail('Hesap yetkisi değişti; yeniden hazırlayın.',409);}
   else if(body.action!=='chat')fail('Bilinmeyen asistan işlemi.');
   const businessId=manual?profile.businessId:(draft?.booking.businessId||body.businessId);
   if(!key(businessId)||(manual&&body.businessId&&body.businessId!==businessId)||(draft&&draft.booking.businessId!==businessId))fail('Salon erişimi reddedildi.',403);
   const snap=await db.ref('businesses/'+businessId).get(),business=snap.val();
   if(!business||business.status==='suspended'||employeeSalonError(auth,businessId,business)||(manual&&profile.role==='owner'&&business.ownerUid!==auth.uid))fail('Salon erişimi reddedildi.',403);
   if(!manual){const pub=await db.ref('public_businesses/'+businessId).get();const b=pub.val();if(!b||b.status!=='active'||!b.discoveryEnabled||b.hiddenFromDiscovery||b.bookingEnabled===false)fail('Bu salon online randevuya açık değil.',403);}
   const catalog=modelCatalog(business);
   if(draft){
    const b=draft.booking,service=(business.services||{})[b.serviceId];
    if(!service||service.active===false||Number(service.price||0)!==draft.price||bookingDuration(service)!==draft.duration)fail('Hizmet fiyatı veya süresi değişti; yeniden onaylayın.',409);
    const create=createBooking||createBookingHandler({database:()=>db});
    const result=await invoke(create,{...req,body:b,assistantContext:{draftId:draft.draftId,uid:auth.uid,expectedPrice:draft.price,expectedDuration:draft.duration}});
    return res.status(200).json({message:'Randevu kaydedildi.',appointmentId:result.aptId||result.data?.aptId,status:result.data?.status,replayed:result.replayed===true});
   }
   const messages=body.messages;if(!Array.isArray(messages)||!messages.length||messages.length>12||messages.some(m=>!m||!['user','assistant'].includes(m.role)||typeof m.content!=='string'||m.content.length>1200)||messages.reduce((n,m)=>n+m.content.length,0)>6000)fail('Mesaj çok uzun. Yeni sohbet başlatın.');
   await quota(db,auth.uid);
   const plan=await interpret({messages,catalog,state:body.state&&typeof body.state==='object'?Object.fromEntries(['serviceId','staffId','date','time','customerName','customerPhone'].map(k=>[k,typeof body.state[k]==='string'?body.state[k].slice(0,100):null])):{},clock:istanbulNowParts(),manual});
   if(!plan||!['availability','book','clarify','my_appointments'].includes(plan.intent))fail('İsteği anlayamadım; normal randevu ekranını kullanabilirsiniz.',422);
   if(plan.intent==='my_appointments')return res.status(200).json({message:'Yaklaşan randevularınızı aşağıdaki düğmeden görebilirsiniz.',showAppointments:true});
   const state=Object.fromEntries(['serviceId','staffId','date','time','customerName','customerPhone'].map(k=>[k,typeof plan[k]==='string'?plan[k].slice(0,100):null]));
   const reply=message=>res.status(200).json({message,state});
   const serviceEntry=catalog.services.find(s=>s.id===state.serviceId);if(!serviceEntry)return reply('Hangi hizmeti istiyorsunuz? '+catalog.services.map(s=>s.name).join(', '));
   if(state.staffId!=='staff-any'&&!catalog.staff.some(s=>s.id===state.staffId))return reply('Hangi çalışanı istersiniz? '+catalog.staff.map(s=>s.name).join(', ')+'. İsterseniz “Fark etmez” yazın.');
   if(!validBookingDate(state.date))return reply('Hangi tarih için? Örneğin “yarın” veya “25 Ekim 2026” yazabilirsiniz.');
   const availability=await invoke((r,s)=>handleAvailabilityWithDatabase(r,s,db),{...req,body:{businessId,serviceId:state.serviceId,staffId:state.staffId,date:state.date,isManual:manual}});
   if(plan.intent!=='book'||!/^\d{2}:\d{2}$/.test(state.time||''))return res.status(200).json({message:availability.isClosed?'Seçilen çalışan bu tarihte kapalı.':state.date+' için müsait saatler:',state,slots:availability.slots,alternatives:availability.alternativesBySlot||{},nextAvailableTime:availability.nextAvailableTime});
   if(!availability.slots.includes(state.time))return res.status(200).json({message:state.time+' seçilen çalışan için uygun değil. Başka saat veya çalışan seçin.',state:{...state,time:null},slots:availability.slots,alternatives:availability.alternativesBySlot||{}});
   if(manual&&(!state.customerName||state.customerName.trim().length<2||!/^5\d{9}$/.test(String(state.customerPhone||'').replace(/\D/g,'').slice(-10))))return reply('Müşterinin adını ve telefonunu yazın.');
   if(!manual&&!profile.phone)return reply('Randevu için önce profilinizde telefon numaranızı tamamlayın.');
   const service=business.services[state.serviceId],duration=bookingDuration(service),price=Number(service.price||0);if(duration===null||!Number.isFinite(price)||price<0)fail('Hizmet bilgisi geçersiz.',409);
   const booking={businessId,serviceId:state.serviceId,staffId:state.staffId,date:state.date,time:state.time,isManual:manual,customerName:manual?state.customerName:(profile.name||profile.displayName||'Müşteri'),customerPhone:manual?state.customerPhone:profile.phone,...(!manual?{customerUid:auth.uid}:{})};
   const token=signAssistantDraft({uid:auth.uid,role:profile.role,booking,price,duration},secret());
   return res.status(200).json({message:'Henüz kayıt oluşturulmadı. Bilgileri kontrol edip Onayla düğmesine basın.',state,draft:{token,businessName:String(business.name||'Salon'),serviceName:serviceEntry.name,staffName:state.staffId==='staff-any'?'Fark Etmez':catalog.staff.find(s=>s.id===state.staffId).name,date:state.date,time:state.time,price,duration,customerName:booking.customerName,customerPhone:booking.customerPhone}});
  }catch(error){return res.status(error.statusCode||503).json({error:error.statusCode?error.message:'Asistan bağlantısı şu an kullanılamıyor. Normal randevu ekranından devam edebilirsiniz.'});}
 };
}
export default createAssistantHandler();
