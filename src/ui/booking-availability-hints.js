const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Availability only: never expose appointment/customer details to other customers.
export function renderAvailabilityHints(data={}){
 const alternatives=Object.entries(data.alternativesBySlot||{}).filter(([,names])=>Array.isArray(names)&&names.length);
 if(!alternatives.length)return '';
 return `<details class="booking-alternatives"><summary>Seçilen çalışan doluysa diğer müsait çalışanlar</summary><p>Çalışan seçimini değiştirerek bu saatleri seçebilirsiniz. Kayıtta uygunluk tekrar kontrol edilir.</p>${alternatives.map(([time,names])=>`<div><strong>${esc(time)}</strong><span>${names.map(esc).join(', ')} müsait</span></div>`).join('')}</details>`;
}
