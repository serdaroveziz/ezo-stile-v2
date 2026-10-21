// Shared deterministic validation: browser previews and server projections agree.
export function hexColor(value, fallback = '#d9ad42') {
  return /^#[0-9a-f]{6}$/i.test(String(value || '')) ? value.toLowerCase() : fallback;
}
export function luminance(hex) {
  const c = hexColor(hex).slice(1).match(/../g).map(x => parseInt(x,16)/255).map(x => x <= .04045 ? x/12.92 : ((x+.055)/1.055)**2.4);
  return c[0]*.2126+c[1]*.7152+c[2]*.0722;
}
export function contrast(a,b) { const x=luminance(a),y=luminance(b); return (Math.max(x,y)+.05)/(Math.min(x,y)+.05); }
export function onColor(color) { return contrast(color,'#000000') >= contrast(color,'#ffffff') ? '#000000' : '#ffffff'; }
export function normalizeBranding(input = {}) {
  if (!input || typeof input !== 'object') input = {};
  return { version:1, primary:hexColor(input.primary), secondary:hexColor(input.secondary,hexColor(input.primary)), mode:input.mode === 'dark' ? 'dark' : 'light' };
}
export function brandingStyle(input) {
  if (!input) return '';
  const b=normalizeBranding(input),bg=b.mode==='dark'?'#171717':'#ffffff',fg=b.mode==='dark'?'#ffffff':'#171717';
  const accent=contrast(b.primary,bg)>=4.5?b.primary:fg;
  return '--salon-primary:'+b.primary+';--salon-secondary:'+b.secondary+';--salon-on-primary:'+onColor(b.primary)+';--salon-bg:'+bg+';--salon-text:'+fg+';--gold-primary:'+accent+';--gold:'+accent+';--gold-secondary:'+accent+';--text-main:'+fg+';--text-muted:'+fg+';--text:'+fg+';--bg-card:'+bg+';--surface:'+bg+';--surface-2:'+bg+';--border-color:'+(b.mode==='dark'?'#686868':'#777777')+';';
}
