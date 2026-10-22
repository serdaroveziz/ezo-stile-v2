/* Shared dependency-free outline icon system for gradual legacy UI migration. */
const PATHS=Object.freeze({
 home:'<path d="M3 11.5 12 4l9 7.5"/><path d="M5 10.5V20h14v-9.5"/><path d="M9 20v-6h6v6"/>',
 calendar:'<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><path d="m9 16 2 2 4-4"/>',
 userClock:'<circle cx="10" cy="8" r="4"/><path d="M3.5 21a6.5 6.5 0 0 1 13 0"/><circle cx="18" cy="17" r="4"/><path d="M18 15v2l1.3 1"/>',
 grid:'<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/>',
 user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/>',
 chart:'<path d="M3 3v18h18"/><path d="m7 16 4-5 4 3 5-7"/>',plus:'<path d="M12 5v14M5 12h14"/>',inbox:'<path d="M4 4h16v16H4z"/><path d="M4 14h4l2 3h4l2-3h4"/>',
 logout:'<path d="M10 17l5-5-5-5M15 12H3"/><path d="M14 3h7v18h-7"/>',chevron:'<path d="m9 18 6-6-6-6"/>',
 phone:'<path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.33 1.78.62 2.63a2 2 0 0 1-.45 2.11L8 9.73a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.85.29 1.73.5 2.63.62A2 2 0 0 1 22 16.92z"/>',
 calendarPlus:'<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M12 14v5M9.5 16.5h5"/>',
 compass:'<circle cx="12" cy="12" r="9"/><path d="m16 8-2.5 5.5L8 16l2.5-5.5z"/>',
 wallet:'<path d="M4 5h14a2 2 0 0 1 2 2v12H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"/><path d="M16 12h6v4h-6a2 2 0 0 1 0-4Z"/>',
 store:'<path d="M3 10h18M5 10v10h14V10M4 4h16l1 6H3z"/><path d="M9 20v-6h6v6"/>',
 file:'<path d="M6 2h9l5 5v15H6z"/><path d="M14 2v6h6M9 13h6M9 17h6"/>',
 settings:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21H9.6v-.1A1.7 1.7 0 0 0 8.5 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.1 15a1.7 1.7 0 0 0-1.1-1H3v-4h.1A1.7 1.7 0 0 0 4.6 8.5a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.1a1.7 1.7 0 0 0 1-1.1V3h4v.1A1.7 1.7 0 0 0 15.5 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.9 9c.2.4.6.8 1.1 1h.1v4H21a1.7 1.7 0 0 0-1.6 1Z"/>',
 search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
 check:'<path d="m5 12 4 4L19 6"/>',x:'<path d="M6 6l12 12M18 6 6 18"/>',
 pencil:'<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/>',
 trash:'<path d="M3 6h18M8 6V4h8v2M19 6l-1 15H6L5 6M10 11v6M14 11v6"/>',
 mapPin:'<path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2"/>',
 message:'<path d="M21 15a4 4 0 0 1-4 4H8l-5 3 1.5-5A8 8 0 1 1 21 15Z"/>',
 instagram:'<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".8" fill="currentColor" stroke="none"/>',
 whatsapp:'<path d="M20 11.5a8 8 0 0 1-11.8 7L3 20l1.5-5A8 8 0 1 1 20 11.5Z"/><path d="M8.5 8.2c.7 3 2.3 4.6 5.3 5.3l1.2-1.2 2 .8-.3 2c-4.8 1-8.8-3-7.8-7.8l2-.3.8 2-1.2 1.2"/>',
 music:'<path d="M9 18V5l10-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="16" cy="16" r="3"/>',
 globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/>',
 star:'<path d="m12 2 3 6 6.5 1-4.75 4.6 1.1 6.4L12 17l-5.85 3 1.1-6.4L2.5 9 9 8Z"/>',
 heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
 shield:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>'
 ,service:'<path d="m6 3 12 18M18 3 6 21"/><circle cx="5" cy="5" r="3"/><circle cx="19" cy="5" r="3"/>'
 ,sparkles:'<path d="m12 3 1.4 3.6L17 8l-3.6 1.4L12 13l-1.4-3.6L7 8l3.6-1.4z"/><path d="m19 14 .8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8zM5 14l.7 1.8L7.5 17l-1.8.7L5 19.5l-.7-1.8L2.5 17l1.8-.7z"/>'
 ,styleAi:'<path d="M7 20c-2-3-2-7 0-10 1-2 3-3 5-3s4 1 5 3c2 3 2 7 0 10"/><path d="M8 11c2-1 3-3 4-6 1 3 3 5 5 6"/><path d="m19 3 .7 1.8L22 5.5l-1.8.7L19.5 8l-.7-1.8-1.8-.7 1.8-.7z"/>'
});
export function uiIcon(name,className='',title=''){const label=String(title||'').replace(/[<>&"]/g,'');return `<svg class="ui-icon staff-icon ${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ${label?`role="img" aria-label="${label}"`:'aria-hidden="true"'}>${label?`<title>${label}</title>`:''}${PATHS[name]||PATHS.grid}</svg>`;}
