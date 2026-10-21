import { renderAvailabilityHints } from './booking-availability-hints.js';
import { staffCanProvideService } from '../booking-selection.js';
import { authenticatedFetch } from '../firebase.js';
import { showErrorModal, showSuccessModal } from './portal.js';
import { t } from '../config.js';

const esc = value => String(value == null ? '' : value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
let staffManualSaving=false;
const days = [['monday','staffUi_9'],['tuesday','staffUi_10'],['wednesday','staffUi_11'],['thursday','staffUi_12'],['friday','staffUi_13'],['saturday','staffUi_14'],['sunday','staffUi_15']];

export function renderRequestOperations(appointments) {
  const pending = (appointments || []).filter(a => (a.status === 'cancel_requested' && (!a.cancelRequestStatus || a.cancelRequestStatus === 'pending')) || ((a.status === 'reschedule_requested' || (a.requestedDate && a.requestedTime)) && (!a.rescheduleRequestStatus || a.rescheduleRequestStatus === 'pending')));
  return `<section class="animate-fade" style="padding-bottom:92px;"><h2 style="font-size:17px;color:var(--gold-primary);"> ${t('staffUi_68')}</h2>${pending.map(a => `<div class="card" style="padding:13px;margin-bottom:9px;"><strong>${esc(a.customerName || a.customerNameSnapshot || t('staffUi_6'))}</strong><div style="font-size:11px;color:var(--text-muted);margin:5px 0;">${esc(a.date)} ${esc(a.time)}${a.requestedDate ? ` → ${esc(a.requestedDate)} ${esc(a.requestedTime)}` : t('staffUi_71')}</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:7px;"><button class="btn btn-gold" onclick="window.staffReviewRequest('${esc(a.aptId || a.appointmentId)}','approve','${esc(a.status)}')">${t('ownerUi_078')}</button><button class="btn btn-secondary" onclick="window.staffReviewRequest('${esc(a.aptId || a.appointmentId)}','reject','${esc(a.status)}')">${t('ownerUi_079')}</button></div></div>`).join('') || `<div class="card" style="padding:18px;text-align:center;color:var(--text-muted);">${t('staffUi_72')}</div>`}</section>`;
}

export function renderScheduleOperations(staffList) {
  return `<section class="animate-fade" style="padding-bottom:92px;"><h2 style="font-size:17px;color:var(--gold-primary);"> ${t('staffUi_39')}</h2>${(staffList || []).filter(s => s.active !== false).map(s => `<button class="card" style="display:block;width:100%;padding:13px;margin-bottom:8px;text-align:left;color:var(--theme-ink-ffffff, #fff);" onclick="window.openStaffScheduleEditor('${esc(s.id)}')"><strong>${esc(s.displayName || s.name || t('staffUi_18'))}</strong><div style="font-size:10px;color:var(--text-muted);margin-top:4px;">${t('staffUi_73')}</div></button>`).join('') || `<div class="card">${t('staffUi_74')}</div>`}</section>`;
}

export function renderStaffSlotGrid(data, selectable = false) {
  const open = new Set(data.slots || []);
  const busy = new Set(data.busySlots || []);
  const times = [...new Set([...open, ...busy])].sort();
  return times.map(time => {
    const available = open.has(time);
    const select = available && selectable;
    return `<button type="button" class="btn btn-secondary ${select ? 'staff-slot' : ''}" data-time="${esc(time)}" ${select ? `onclick="document.querySelectorAll('.staff-slot').forEach(b=>b.classList.remove('btn-gold'));this.classList.add('btn-gold')"` : 'disabled'} style="opacity:1;${available ? 'border-color:var(--gold-primary);' : 'color:var(--text-muted);text-decoration:line-through;'}" aria-label="${esc(time)} ${available ? 'Müsait' : 'Dolu'}">${esc(time)}<small style="display:block;font-size:10px;">${available ? 'Müsait' : 'Dolu'}</small></button>`;
  }).join('') + renderAvailabilityHints(data);
}

export function installStaffOperations({ user, business, staffList, appointments, rerender }) {
  const businessId = user.businessId;
  let availabilityRequest = 0;
  window.openStaffAvailability = () => {
    const root = document.getElementById('modal-root'); if (!root) return;
    const today = new Intl.DateTimeFormat('en-CA', {timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
    const services = Object.entries(business.services || {}).filter(([,s]) => s && s.active !== false);
    root.innerHTML = `<div class="modal-overlay" onclick="window.closeModal()"><section class="modal-card" onclick="event.stopPropagation()"><div class="modal-card__header"><h3>Dolu / Müsait Saatler</h3><button class="modal-close" onclick="window.closeModal()" aria-label="${t('close')}">×</button></div><label>Hizmet<select id="staff-availability-service" class="input-field" onchange="window.loadStaffAvailability()">${services.map(([id,s])=>`<option value="${esc(id)}">${esc(s.name)}</option>`).join('')}</select></label><label>Çalışan<select id="staff-availability-person" class="input-field" onchange="window.loadStaffAvailability()">${staffList.filter(s=>s.active!==false).map(s=>`<option value="${esc(s.id)}" ${s.userId===user.uid?'selected':''}>${esc(s.displayName||s.name)}</option>`).join('')}</select></label><label>Tarih<input id="staff-availability-date" type="date" class="input-field" min="${today}" value="${today}" onchange="window.loadStaffAvailability()"></label><button class="btn btn-secondary" onclick="window.loadStaffAvailability()">Yenile</button><p>Seçilen hizmetin süresine göre dolu ve müsait saatler.</p><div id="staff-availability-slots" style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;max-height:45vh;overflow:auto;"></div></section></div>`;
    document.body.classList.add('modal-open');
    window.loadStaffAvailability();
  };
  window.loadStaffAvailability = async () => {
    const target = document.getElementById('staff-availability-slots'); if (!target) return;
    const sequence = ++availabilityRequest;
    const serviceId = document.getElementById('staff-availability-service').value;
    const staffId = document.getElementById('staff-availability-person').value;
    const date = document.getElementById('staff-availability-date').value;
    if (!serviceId || !staffId || !date) {target.textContent='Hizmet, çalışan ve tarih seçin.';return;}
    target.textContent = t('staffUi_90');
    try {
      const response = await authenticatedFetch('/api/booking/availability', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({businessId,serviceId,staffId,date,internalView:true})});
      const data = await response.json();
      if (sequence !== availabilityRequest || !target.isConnected) return;
      if (!response.ok) throw new Error(data.error || t('staffUi_91'));
      target.innerHTML = data.isClosed ? esc(t('staffUi_92')) + renderAvailabilityHints(data) : renderStaffSlotGrid(data) || esc(t('staffUi_93'));
    } catch (error) {if(sequence===availabilityRequest && target.isConnected) target.textContent=error.message;}
  };
  window.openStaffScheduleEditor = staffId => {
    const staff = staffList.find(s => s.id === staffId); const root = document.getElementById('modal-root'); if (!staff || !root) return;
    const schedule = staff.weeklySchedule || business.weeklySchedule || {};
    root.innerHTML = `<div class="modal-overlay" onclick="window.closeModal()"><div class="modal-card" onclick="event.stopPropagation()" style="max-height:90vh;overflow:auto;"><h3 style="color:var(--gold-primary);">${esc(staff.displayName || staff.name)} ${t('staffUi_75')}</h3>${days.map(([key,label]) => { const d=schedule[key]||{isOpen:true,start:'09:00',end:'19:00'}; return `<div class="card" style="padding:9px;margin-bottom:7px;"><label><input id="staff-sch-${key}-open" type="checkbox" ${d.isOpen!==false?'checked':''}> ${t(label)}</label><div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:6px;"><input id="staff-sch-${key}-start" type="time" class="input-field" value="${esc(d.start||'09:00')}"><input id="staff-sch-${key}-end" type="time" class="input-field" value="${esc(d.end||'19:00')}"></div></div>`; }).join('')}<button class="btn btn-gold" style="width:100%;" onclick="window.saveStaffSchedule('${esc(staffId)}')">${t('ownerUi_184')}</button></div></div>`;
  };
  window.saveStaffSchedule = async staffId => {
    const weeklySchedule = Object.fromEntries(days.map(([key]) => [key,{isOpen:document.getElementById(`staff-sch-${key}-open`).checked,start:document.getElementById(`staff-sch-${key}-start`).value,end:document.getElementById(`staff-sch-${key}-end`).value}]));
    const response = await authenticatedFetch('/api/staff/update-schedule',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({staffId,weeklySchedule})}); const data=await response.json().catch(()=>({}));
    if(!response.ok)return showErrorModal(t('staffUi_77'),data.error||t('staffUi_78')); const target=staffList.find(s=>s.id===staffId); if(target)target.weeklySchedule=data.weeklySchedule; window.closeModal(); showSuccessModal(t('staffUi_79'),t('staffUi_80')); rerender();
  };
  window.staffReviewRequest = async (aptId, action, status) => {
    const endpoint = status === 'cancel_requested' ? '/api/booking/update-status' : '/api/booking/reschedule-approve';
    const payload = status === 'cancel_requested' ? {aptId,newStatus:action==='approve'?'cancelled':'approved',userUid:user.uid} : {aptId,action,userUid:user.uid};
    const response=await authenticatedFetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}); const data=await response.json().catch(()=>({}));
    if(!response.ok)return showErrorModal(t('staffUi_77'),data.error||t('staffUi_81')); showSuccessModal(t('staffUi_79'),action==='approve'?t('staffUi_82'):t('staffUi_83')); rerender();
  };

  window.openStaffManualBooking = () => {
    const root=document.getElementById('modal-root'); if(!root)return; const services=Object.entries(business.services||{}).filter(([,s])=>s&&s.active!==false);
    root.innerHTML=`<div class="modal-overlay" onclick="window.closeModal()"><div class="modal-card" onclick="event.stopPropagation()" style="max-height:90vh;overflow:auto;"><h3 style="color:var(--gold-primary);"> ${t('staffUi_35')}</h3><input id="staff-manual-name" class="input-field" placeholder="${t('staffUi_84')}"><input id="staff-manual-phone" class="input-field" placeholder="05XXXXXXXXX"><select id="staff-manual-service" class="input-field" onchange="window.changeStaffManualService()"><option value="">${t('staffUi_85')}</option>${services.map(([id,s])=>`<option value="${esc(id)}" data-duration="${Number(s.duration||s.durationMinutes||30)}">${esc(s.name)} • ${Number(s.price||0)} TL</option>`).join('')}</select><select id="staff-manual-staff" class="input-field" disabled onchange="window.changeStaffManualStaff()"><option value="">${t('staffUi_86')}</option></select><input id="staff-manual-date" onchange="window.loadStaffManualSlots()" disabled type="date" min="${new Date().toISOString().slice(0,10)}" class="input-field"><button class="btn btn-secondary" style="width:100%;" onclick="window.loadStaffManualSlots()">${t('staffUi_87')}</button><div id="staff-manual-slots" style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:10px 0;"></div><button class="btn btn-gold" style="width:100%;" onclick="window.submitStaffManualBooking()">${t('staffUi_88')}</button></div></div>`;
  };
  window.changeStaffManualService = () => {
    const serviceId = document.getElementById('staff-manual-service').value;
    const staff = document.getElementById('staff-manual-staff');
    staff.innerHTML = `<option value="">${t('staffUi_86')}</option><option value="staff-any">Fark Etmez</option>` + staffList.filter(s=>s.active!==false && staffCanProvideService(s,serviceId,business)).map(s=>`<option value="${esc(s.id)}">${esc(s.displayName||s.name)}</option>`).join('');
    staff.disabled = !serviceId;
    document.getElementById('staff-manual-date').disabled=true;
    document.getElementById('staff-manual-slots').replaceChildren();
    ++manualSlotRequest;
  };
  window.changeStaffManualStaff = () => {
    const date = document.getElementById('staff-manual-date');
    date.disabled = !document.getElementById('staff-manual-staff').value;
    if (!date.value) date.value=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
    window.loadStaffManualSlots();
  };
  let manualSlotRequest=0;
  window.loadStaffManualSlots = async () => {
    const service=document.getElementById('staff-manual-service'); const staffId=document.getElementById('staff-manual-staff').value; const date=document.getElementById('staff-manual-date').value; const durationMinutes=Number(service.selectedOptions[0]?.dataset.duration||30); const target=document.getElementById('staff-manual-slots');
    const request=++manualSlotRequest;
    if(!service.value||!staffId||!date)return showErrorModal(t('staffUi_77'),t('staffUi_89')); target.textContent=t('staffUi_90');
    const response=await authenticatedFetch('/api/booking/availability',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({businessId,staffId,serviceId:service.value,date,durationMinutes,isManual:true})}); const data=await response.json().catch(()=>({})); if(request!==manualSlotRequest || !target.isConnected)return; if(!response.ok)return showErrorModal(t('staffUi_77'),data.error||t('staffUi_91'));
    target.innerHTML=data.isClosed?`<div style="grid-column:1/-1;color:var(--theme-copy-ef4444, #ef4444);">${t('staffUi_92')}</div>`:renderStaffSlotGrid(data, true)||`<div style="grid-column:1/-1;">${t('staffUi_93')}</div>`;
  };
  window.submitStaffManualBooking = async () => {
    const name=document.getElementById('staff-manual-name').value.trim(), phone=document.getElementById('staff-manual-phone').value.trim(), serviceEl=document.getElementById('staff-manual-service'), staffId=document.getElementById('staff-manual-staff').value, date=document.getElementById('staff-manual-date').value, time=document.querySelector('.staff-slot.btn-gold')?.dataset.time;
    if(name.length<2||!/^5\d{9}$/.test(phone.replace(/\D/g,'').replace(/^90(?=5\d{9}$)/,'').replace(/^0(?=5\d{9}$)/,''))||!serviceEl.value||!staffId||!date||!time)return showErrorModal(t('staffUi_77'),t('staffUi_94'));
    if(staffManualSaving)return;staffManualSaving=true;const button=document.querySelector('[onclick="window.submitStaffManualBooking()"]');if(button)button.disabled=true;
    try {
    const service=(business.services||{})[serviceEl.value]||{}; const staff=staffList.find(s=>s.id===staffId)||{};
    const response=await authenticatedFetch('/api/booking/create',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({businessId,customerName:name,customerPhone:phone,serviceId:serviceEl.value,serviceName:service.name,servicePrice:service.price,serviceDuration:service.duration||service.durationMinutes||30,staffId,staffName:staff.displayName||staff.name,date,time,isManual:true})}); const data=await response.json().catch(()=>({})); if(!response.ok)return showErrorModal(t('staffUi_77'),data.error||t('staffUi_95')); window.closeModal(); showSuccessModal(t('staffUi_79'),t('staffUi_96')); rerender();
    } catch(error){showErrorModal(t('staffUi_77'),error);}finally{staffManualSaving=false;if(button?.isConnected)button.disabled=false;}
  };
}
