const assert=require('node:assert/strict');
(async()=>{
 const {buildOwnerCalendar,renderOwnerCalendar}=await import('./src/ui/owner-calendar.js');
 const business={services:{cut:{id:'cut',duration:45}},weeklySchedule:{start:'09:00',end:'12:00'},staff:{legacy:{id:'a',userId:'uid_a',name:'A',active:true,services:['all']},b:{id:'b',name:'B',active:true,services:['all']},off:{id:'off',name:'Off',active:true,timeOff:['2099-01-05']}}};
 const appointments=[{aptId:'one',businessId:'biz',staffId:'uid_a',date:'2099-01-05',time:'09:30',durationMinutes:45,status:'approved',customerName:'<script>'}];
 const options={business,businessId:'biz',appointments,date:'2099-01-05',serviceId:'cut',staffId:'all',now:new Date('2099-01-04T10:00Z')};
 let model=buildOwnerCalendar(options);const a=model.columns.find(c=>c.id==='a'),b=model.columns.find(c=>c.id==='b'),off=model.columns.find(c=>c.id==='off');
 assert.equal(a.blocks[0].end-a.blocks[0].start,45);assert(!a.cells.find(c=>c.time==='09:00').available);assert(!a.cells.find(c=>c.time==='10:00').available);assert(b.cells.find(c=>c.time==='09:30').available);assert(off.closed);assert(off.cells.every(c=>!c.available));
 assert.equal(buildOwnerCalendar({...options,staffId:'a'}).columns.length,1);
 assert.equal(buildOwnerCalendar({...options,appointments:[...appointments,{...appointments[0],businessId:'other',staffId:'b'}]}).columns[1].blocks.length,0);
 const html=renderOwnerCalendar({...options,canBook:true});assert(html.includes('&lt;script&gt;'));assert(!html.includes('<script>'));assert(html.includes('height:61px'));assert(html.includes('Tüm çalışanlar'));
 const past=buildOwnerCalendar({...options,date:'2000-01-01'});assert(past.columns.every(c=>c.cells.every(s=>!s.available)));
 console.log('OWNER CALENDAR RUNTIME PASS: staff aliases, duration, partial overlap, leave, tenant isolation, past slots, escaped output, single/all staff');
})().catch(error=>{console.error(error);process.exitCode=1});
