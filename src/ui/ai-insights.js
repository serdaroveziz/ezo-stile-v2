import { authenticatedFetch } from '../firebase.js';
import { getCurrentUser } from '../auth.js';

// UNELIVO AI business assistant (owner: own salon, super admin: platform totals).
// Read-only chat; every answer is computed server-side from real records.
const SUGGESTIONS = {
  owner: ['Bu ay ciro nasıl gidiyor?', 'En yoğun gün ve saatlerim hangileri?', 'Boş saatleri nasıl doldurabilirim?', 'Hangi hizmet en çok kazandırıyor?', 'İptal ve gelmeme oranım nasıl?'],
  super_admin: ['Platform bu hafta nasıl gidiyor?', 'Bekleyen başvuru var mı?', 'Kaç salon son 30 günde randevu aldı?', 'Hangi şehirlerde salon yoğun?', 'Kullanıcı dağılımı nasıl?']
};

export async function openInsightsAssistant(user) {
  if (!user || !['owner', 'super_admin'].includes(user.role)) throw Error('UNELIVO AI işletme asistanı yalnız salon sahibi ve platform yöneticisi için açıktır.');
  document.getElementById('unelivo-insights-assistant')?.close();
  const dialog = document.createElement('dialog');
  dialog.id = 'unelivo-insights-assistant';
  dialog.className = 'theme-picker booking-assistant insights-assistant';
  dialog.innerHTML = '<header><h2>UNELIVO AI</h2><button type="button" data-close aria-label="Kapat">×</button></header>'
    + '<p class="assistant-notice">' + (user.role === 'owner' ? 'Salonunuzun gerçek randevu ve ciro verilerinden' : 'Platformun gerçek toplam verilerinden') + ' yanıt verir. Müşteri adı ve telefonu AI sağlayıcısına gönderilmez. Hiçbir işlem yapmaz, yalnız yorum ve öneri sunar.</p>'
    + '<div data-suggestions class="assistant-slots"></div><div data-messages class="assistant-messages" role="log" aria-label="Sohbet" aria-live="polite"></div><p data-status role="status"></p>'
    + '<form><label for="insights-question">Sorunuz</label><textarea id="insights-question" maxlength="600" rows="2" placeholder="Örnek: Bu hafta geçen haftaya göre nasıl?"></textarea><button class="btn btn-gold" type="submit">Sor</button></form>'
    + '<button class="btn btn-secondary" type="button" data-reset>Yeni sohbet</button>';
  document.body.append(dialog);
  dialog.showModal();

  let history = [], busy = false, configured = false, closed = false;
  const log = dialog.querySelector('[data-messages]'), status = dialog.querySelector('[data-status]'), form = dialog.querySelector('form'), input = dialog.querySelector('textarea'), chips = dialog.querySelector('[data-suggestions]');
  const current = () => !closed && getCurrentUser()?.uid === user.uid;
  const say = (role, content) => { const p = document.createElement('p'); p.className = 'assistant-message ' + role; p.textContent = content; log.append(p); p.scrollIntoView({ block: 'nearest' }); };
  const controls = () => { form.querySelector('button').disabled = busy || !configured; input.disabled = busy || !configured; chips.querySelectorAll('button').forEach(b => { b.disabled = busy || !configured; }); };

  async function request(body) {
    if (!current()) throw Error('Oturum değişti; sohbeti yeniden açın.');
    const response = await authenticatedFetch('/api/ai/insights', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await response.json().catch(() => ({}));
    if (!current()) { dialog.close(); throw Error('Oturum değişti.'); }
    if (!response.ok) throw Error(data.error || 'UNELIVO AI kullanılamıyor.');
    return data;
  }
  async function ask(question) {
    question = String(question || '').trim();
    if (busy || !configured || question.length < 2) return;
    busy = true; input.value = ''; say('user', question); status.textContent = 'Veriler hesaplanıyor…'; controls();
    try {
      const data = await request({ action: 'ask', question, history });
      say('assistant', data.message);
      history = [...history, { role: 'user', content: question }, { role: 'assistant', content: data.message }].slice(-6);
      status.textContent = '';
    } catch (error) { status.textContent = error.message; }
    finally { busy = false; controls(); }
  }

  for (const suggestion of SUGGESTIONS[user.role]) {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'btn btn-secondary'; button.textContent = suggestion;
    button.onclick = () => ask(suggestion);
    chips.append(button);
  }
  form.onsubmit = event => { event.preventDefault(); ask(input.value); };
  dialog.querySelector('[data-close]').onclick = () => dialog.close();
  dialog.querySelector('[data-reset]').onclick = () => { if (busy) return; history = []; log.replaceChildren(); status.textContent = configured ? 'Bir soru seçin veya yazın.' : status.textContent; };
  dialog.addEventListener('close', () => { closed = true; history = []; dialog.remove(); }, { once: true });

  busy = true; controls(); status.textContent = 'Hazırlanıyor…';
  try {
    configured = (await request({ action: 'status' })).configured === true;
    status.textContent = configured ? 'Bir soru seçin veya yazın.' : 'UNELIVO AI henüz etkinleştirilmedi.';
  } catch (error) { status.textContent = error.message; }
  finally { busy = false; controls(); }
}
