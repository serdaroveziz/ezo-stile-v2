const THEME_KEY = 'ezo_theme';
let themeUser = null;
const preferenceKey = () => themeUser ? THEME_KEY + ':' + themeUser : THEME_KEY;
export function setThemeUser(uid) {themeUser=uid||null;applyTheme(getTheme(),false);} // retain existing device preference
export const THEMES = Object.freeze([
 {id:'gold',label:'UNELIVO Gold',mode:'dark',bg:'#171717',surface:'#242424',accent:'#d9ad42',ink:'#f7f7f5'},
 {id:'light',label:'Light',mode:'light',bg:'#f7f7f5',surface:'#ffffff',accent:'#765500',ink:'#171717'},
 {id:'midnight',label:'Midnight',mode:'dark',bg:'#101725',surface:'#192338',accent:'#aecbff',ink:'#f5f7ff'},
 {id:'sage',label:'Sage',mode:'light',bg:'#f2f5ef',surface:'#ffffff',accent:'#345c43',ink:'#18251b'},
 {id:'rose',label:'Rose',mode:'light',bg:'#fbf2f3',surface:'#ffffff',accent:'#90394e',ink:'#30191e'},
 {id:'minimal',label:'Minimal',mode:'light',bg:'#ffffff',surface:'#f5f5f5',accent:'#242424',ink:'#171717'}
]);
const normalize = value => value==='dark'?'gold':value==='system'||THEMES.some(x=>x.id===value)?value:'gold';
export function getTheme(){try{return normalize((localStorage.getItem(preferenceKey()) || localStorage.getItem(THEME_KEY)));}catch{return normalize(document.documentElement.dataset.palette);}}
export function applyTheme(theme, persist=true){
 const choice=normalize(theme),id=choice==='system'?(window.matchMedia('(prefers-color-scheme: dark)').matches?'gold':'light'):choice;
 const p=THEMES.find(x=>x.id===id),root=document.documentElement;
 root.dataset.theme=p.mode;root.dataset.palette=id;root.style.colorScheme=p.mode;
 const vars={'--bg':p.bg,'--bg-primary':p.bg,'--surface':p.surface,'--surface-2':p.surface,'--bg-card':p.surface,'--bg-card-hover':p.surface,'--gold':p.accent,'--gold-primary':p.accent,'--gold-secondary':p.accent,'--gold-gradient':p.accent,'--gold-hover':p.accent,'--text':p.ink,'--text-main':p.ink,'--text-muted':p.mode==='dark'?'#c2c4cb':'#555555','--light-surface':p.surface,'--light-soft':p.bg,'--light-ink':p.ink,'--light-accent':p.accent,'--light-accent-text':p.accent,'--light-gold-secondary':p.accent,'--light-on-accent':p.mode==='dark'?'#171717':'#ffffff','--theme-on-accent':p.mode==='dark'?'#171717':'#ffffff'};
 for(const [key,value] of Object.entries(vars))root.style.setProperty(key,value);
 document.querySelector('meta[name="theme-color"]')?.setAttribute('content',p.bg);
 if(persist)try{localStorage.setItem(preferenceKey(),choice);}catch{}
 document.querySelectorAll('[data-theme-choice]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.themeChoice===choice)));
 return choice;
}
export function toggleTheme(){openThemePicker();}
export function openThemePicker(){
 let dialog=document.getElementById('unelivo-theme-picker');
 if(!dialog){dialog=document.createElement('dialog');dialog.id='unelivo-theme-picker';dialog.className='theme-picker';document.body.append(dialog);}
 dialog.innerHTML='<h2>Tema</h2><div class="theme-preview-grid">'+THEMES.map(p=>'<button type="button" data-theme-choice="'+p.id+'" aria-pressed="'+(getTheme()===p.id)+'"><span class="theme-mini" style="background:'+p.bg+';color:'+p.ink+'"><i style="background:'+p.surface+'">U✦ <b style="color:'+p.accent+'">•••</b></i><i style="background:'+p.accent+'"></i></span>'+p.label+'</button>').join('')+'</div><button type="button" data-theme-choice="system" aria-pressed="'+(getTheme()==='system')+'">Sistem Teması</button><button type="button" data-close>Kapat</button>';
 dialog.querySelectorAll('[data-theme-choice]').forEach(b=>b.onclick=()=>applyTheme(b.dataset.themeChoice));
 dialog.querySelector('[data-close]').onclick=()=>dialog.close();dialog.showModal();
}
let installed=false;
export function installThemeToggle(){if(installed)return;installed=true;
 window.openAppSettings=()=>{let dialog=document.getElementById('unelivo-app-settings');if(!dialog){dialog=document.createElement('dialog');dialog.id='unelivo-app-settings';dialog.className='theme-picker';document.body.append(dialog);}dialog.innerHTML='<h2>Ayarlar</h2><button type="button" data-appearance>Tema ve görünüm</button><button type="button" data-close>Kapat</button>';dialog.querySelector('[data-appearance]').onclick=()=>{dialog.close();openThemePicker();};dialog.querySelector('[data-close]').onclick=()=>dialog.close();dialog.showModal();};
 applyTheme(getTheme(),false);
 window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>{if(getTheme()==='system')applyTheme('system',false);});
 window.addEventListener('storage',e=>{if(e.key===preferenceKey()||e.key===THEME_KEY)applyTheme(getTheme(),false);});
}
