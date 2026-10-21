import { scheduleForDate, toMinutes, staffKey, eligibleStaffEntries, intervalOverlapsAppointment, istanbulNowParts, bookingDuration } from '../booking-engine.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const jsArg=value=>esc(JSON.stringify(String(value??'')));
export function buildOwnerCalendar({business,businessId,appointments,date,staffId='all',serviceId,now=new Date()}) {
 const entries=Object.entries(business.staff||{}).filter(([,s])=>s&&s.active!==false);
 const selected=entries.filter(entry=>staffId==='all'||staffKey(entry)===staffId);
 const salon=scheduleForDate(business,null,date),start=toMinutes(salon.start),end=toMinutes(salon.end);
 const service=Object.entries(business.services||{}).find(([key,s])=>s&&[key,s.id,s.serviceId].includes(serviceId))?.[1];
 const duration=bookingDuration(service)||30;
 const clock=istanbulNowParts(now);
 const columns=selected.map(entry=>{
  const id=staffKey(entry),schedule=scheduleForDate(business,entry[1],date);
  const records=(appointments||[]).filter(a=>a&&a.businessId===businessId&&a.date===date&&!['cancelled','rejected','no_show','expired'].includes(a.status)&&[entry[0],id,entry[1].userId].filter(Boolean).some(key=>[a.staffId,a.staffUid,a.staffUserId].includes(key)));
  const blocks=records.map(a=>{
   const from=toMinutes(a.time||a.startTime),minutes=Number(a.serviceDuration||a.durationMinutes||a.durationMin||a.duration)||30;
   const until=Math.max(from+minutes,toMinutes(a.endTime));
   return {appointment:a,start:Math.max(start,from),end:Math.min(end,until)};
  }).filter(b=>b.end>b.start);
  const cells=[];
  for(let minute=start;minute<end;minute+=30){
   const time=String(Math.floor(minute/60)).padStart(2,'0')+':'+String(minute%60).padStart(2,'0');
   const eligible=serviceId && eligibleStaffEntries(business,serviceId,date,minute,minute+duration).some(e=>staffKey(e)===id);
   const busy=(appointments||[]).some(a=>intervalOverlapsAppointment(a,businessId,date,id,minute,minute+duration,business));
   const reserved=blocks.some(b=>minute<b.end&&minute+30>b.start);
   const past=date<clock.date||(date===clock.date&&minute<=clock.minutes);
   cells.push({minute,time,available:Boolean(eligible&&!busy&&!reserved&&!past),reserved,busy,past});
  }
  return {id,name:entry[1].displayName||entry[1].name||'Çalışan',closed:schedule.isClosed,blocks,cells};
 });
 return {start,end,closed:salon.isClosed,columns};
}
export function renderOwnerCalendar({business,businessId,appointments,date,staffId,serviceId,canBook=true}) {
 const model=buildOwnerCalendar({business,businessId,appointments,date,staffId,serviceId});
 const entries=Object.entries(business.staff||{}).filter(([,s])=>s&&s.active!==false);
 const services=Object.entries(business.services||{}).filter(([,s])=>s&&s.active!==false);
 const height=Math.max(0,model.end-model.start)*1.4;
 return `<section class="owner-calendar"><div class="owner-calendar-heading"><h2>Çalışan Takvimi</h2><button class="btn btn-secondary" onclick="window.refreshOwnerCalendar()">Yenile</button></div><div class="owner-calendar-controls"><label>Tarih<input class="input-field" type="date" value="${esc(date)}" onchange="window.setOwnerCalendarDate(this.value)"></label><label>Çalışan<select class="input-field" onchange="window.setOwnerCalendarStaff(this.value)">${entries.map(e=>`<option value="${esc(staffKey(e))}" ${staffId===staffKey(e)?'selected':''}>${esc(e[1].displayName||e[1].name)}</option>`).join('')}<option value="all" ${staffId==='all'?'selected':''}>Tüm çalışanlar</option></select></label><label>Hizmet<select class="input-field" onchange="window.setOwnerCalendarService(this.value)"><option value="">Hizmet seçin</option>${services.map(([key,s])=>`<option value="${esc(s.id||key)}" ${serviceId===(s.id||key)?'selected':''}>${esc(s.name||s.title)}</option>`).join('')}</select></label></div><p class="owner-calendar-help">Hizmet seçip müsait saate dokunarak manuel randevu oluşturabilirsiniz. Dolu · Müsait · Kapalı/İzinli</p>${model.closed?'<div class="card">Salon bu gün kapalı.</div>':!model.columns.length?'<div class="card">Aktif çalışan bulunamadı.</div>':`<div class="owner-calendar-scroll"><div class="owner-calendar-grid" style="grid-template-columns:52px repeat(${model.columns.length},minmax(160px,1fr));"><div class="owner-calendar-label">Saat</div>${model.columns.map(c=>`<div class="owner-calendar-label">${esc(c.name)}${c.closed?'<small>Kapalı / İzinli</small>':''}</div>`).join('')}<div class="owner-calendar-hours" style="height:${height}px;">${Array.from({length:Math.ceil((model.end-model.start)/30)},(_,i)=>`<span style="top:${i*42}px;">${String(Math.floor((model.start+i*30)/60)).padStart(2,'0')}:${String((model.start+i*30)%60).padStart(2,'0')}</span>`).join('')}</div>${model.columns.map(c=>`<div class="owner-calendar-column" style="height:${height}px;">${c.cells.map(cell=>`<button type="button" class="owner-calendar-cell" style="top:${(cell.minute-model.start)*1.4}px;height:42px;" ${cell.available&&canBook?`onclick="window.bookOwnerCalendarSlot(${jsArg(c.id)},${jsArg(cell.time)})"`:'disabled'} aria-label="${esc(c.name)} ${cell.time} ${cell.available?'Müsait':'Dolu veya uygun değil'}">${cell.reserved?'':c.closed?'Kapalı / İzinli':cell.available?'Müsait':cell.past?'Geçmiş':cell.busy?'Dolu':serviceId?'Uygun değil':'Hizmet seçin'}</button>`).join('')}${c.blocks.map(b=>`<button type="button" class="owner-calendar-booking" style="top:${(b.start-model.start)*1.4}px;height:${Math.max(28,Math.round((b.end-b.start)*1.4-2))}px;" onclick="window.openOwnerCalendarAppointment(${jsArg(b.appointment.aptId||b.appointment.appointmentId)})"><strong>${esc(b.appointment.time||b.appointment.startTime)} · ${esc(b.appointment.customerName||b.appointment.customerNameSnapshot||'Müşteri')}</strong><span>${esc(b.appointment.serviceName||b.appointment.serviceNameSnapshot||'Randevu')}</span><small>${b.appointment.status==='completed'?'Tamamlandı':b.appointment.status==='pending'?'Bekleyen':'Dolu'}</small></button>`).join('')}</div>`).join('')}</div></div>`}</section>`;
}
