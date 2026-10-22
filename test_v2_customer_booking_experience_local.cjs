const assert = require('assert');
const fs = require('fs');

(async () => {
  const { chooseAvailableStaff, intervalOverlapsAppointment, staffCanProvideService } = await import('./server/booking-staff.js');
  const { buildAnyStaffAvailability, handleAvailabilityWithDatabase } = await import('./server/handlers/booking/availability.js');
  const { effectiveAppointmentStatus, isAppointmentUpcoming } = await import('./src/appointment-lifecycle.js');
  const publicModule = await import('./server/public-business.js');
  const customer = fs.readFileSync('src/ui/customer.js', 'utf8');
  const create = fs.readFileSync('server/handlers/booking/create.js', 'utf8');
  const rules = fs.readFileSync('database.rules.json', 'utf8');

  const business = { weeklySchedule: { monday: { isOpen: true, start: '09:00', end: '18:00' } }, staff: {
    b: { id: 'b', active: true, displayName: 'B', services: ['cut'], weeklySchedule: { monday: { isOpen: true, start: '09:00', end: '18:00' } } },
    a: { id: 'a', active: true, displayName: 'A', services: ['cut'], weeklySchedule: { monday: { isOpen: true, start: '09:00', end: '18:00' } } },
    c: { id: 'c', active: true, services: ['color'], weeklySchedule: { monday: { isOpen: true, start: '09:00', end: '18:00' } } }
  } };
  const bookingDate = '2099-01-05'; // Monday, deliberately future-proof against the local clock.
  const apt = (id, staffId, time) => ({ aptId:id, businessId:'biz', date:bookingDate, time, staffId, serviceDuration:45, status:'approved' });
  let appointments = { one: apt('one','a','14:00') };
  assert.equal(chooseAvailableStaff({ business, businessId:'biz', serviceId:'cut', date:bookingDate, startMinutes:840, endMinutes:885, appointments })[1].id, 'b', 'A busy/B free should choose B');
  appointments.two = apt('two','b','14:00');
  assert.equal(chooseAvailableStaff({ business, businessId:'biz', serviceId:'cut', date:bookingDate, startMinutes:840, endMinutes:885, appointments }), null, 'all busy should return no staff');
  assert.equal(chooseAvailableStaff({ business, businessId:'biz', serviceId:'cut', date:bookingDate, startMinutes:600, endMinutes:645, appointments:{} })[1].id, 'a', 'tie should use lexical id');
  const aliasBusiness = { ...business, services: { firebase_service_key: { id:'public-service-id', name:'Saç Kesimi' } }, staff: {
    kuvvat: { id:'kuvvat', active:true, services:['firebase_service_key'] },
    ata: { id:'ata', active:true, services:['public-service-id'] }
  } };
  const aliasAppointments = [{ businessId:'biz', date:bookingDate, time:'09:30', staffId:'kuvvat', serviceDuration:45, status:'approved' }];
  const aliasAvailability = buildAnyStaffAvailability({ business:aliasBusiness, businessId:'biz', serviceId:'public-service-id', appointments:aliasAppointments, date:bookingDate, durationMinutes:45, now:new Date('2099-01-04T08:00:00Z') });
  assert.ok(aliasAvailability.slots.includes('09:30'), 'Kuvvat busy/Ata free with service key-id alias must keep 09:30 open');
  const sameCustomerRecord = {...aliasAppointments[0], customerUid:'customer-1', customerPhone:'05550000000'};
  const anyWithCustomerHistory = buildAnyStaffAvailability({ business:aliasBusiness, businessId:'biz', serviceId:'public-service-id', appointments:[sameCustomerRecord], customerAppointments:[sameCustomerRecord], date:bookingDate, durationMinutes:45, now:new Date('2099-01-04T08:00:00Z') });
  assert.ok(anyWithCustomerHistory.slots.includes('09:30'), 'customer-level history must not prevent free Ata from being evaluated');
  const aliasAssigned = chooseAvailableStaff({ business:aliasBusiness, businessId:'biz', serviceId:'public-service-id', date:bookingDate, startMinutes:570, endMinutes:615, appointments:{one:aliasAppointments[0]} });
  assert.equal(aliasAssigned[1].id, 'ata', 'booking confirmation must assign Ata');
  assert.equal(staffCanProvideService(aliasBusiness.staff.ata, 'firebase_service_key', aliasBusiness), true, 'explicit Ata selection must accept canonical service key alias');
  assert.equal(intervalOverlapsAppointment(aliasAppointments[0], 'biz', bookingDate, 'ata', 570, 615), false, 'explicit Ata must not inherit Kuvvat conflict');
  const afterFirstAtomicReservation = { one:aliasAppointments[0], assigned:{...aliasAppointments[0],staffId:'ata'} };
  assert.equal(chooseAvailableStaff({ business:aliasBusiness, businessId:'biz', serviceId:'public-service-id', date:bookingDate, startMinutes:570, endMinutes:615, appointments:afterFirstAtomicReservation }), null, 'second same-slot transaction must not double-book');
  const bothBusy = { one:aliasAppointments[0], two:{...aliasAppointments[0],staffId:'ata'} };
  const closedAvailability = buildAnyStaffAvailability({ business:aliasBusiness, businessId:'biz', serviceId:'public-service-id', appointments:Object.values(bothBusy), date:bookingDate, durationMinutes:45, now:new Date('2099-01-04T08:00:00Z') });
  assert.ok(closedAvailability.busySlots.includes('09:30') && !closedAvailability.slots.includes('09:30'), 'all eligible busy must close 09:30');
  const completedAta = {...aliasAppointments[0],staffId:'ata',status:'completed'};
  const completedDoesNotBlock = buildAnyStaffAvailability({ business:aliasBusiness, businessId:'biz', serviceId:'public-service-id', appointments:[aliasAppointments[0],completedAta], date:bookingDate, durationMinutes:45, now:new Date('2099-01-04T08:00:00Z') });
  assert.ok(completedDoesNotBlock.slots.includes('09:30'), 'completed Ata appointment must not block availability');
  const durationGapBusiness = { weeklySchedule:{ monday:{ isOpen:true, start:'09:00', end:'12:00' } }, staff:{ only:{ id:'only', active:true, services:['cut'], weeklySchedule:{ monday:{ isOpen:true, start:'09:00', end:'12:00' } } } } };
  const durationGapAppointments = [{ businessId:'biz', date:bookingDate, time:'09:30', staffId:'only', serviceDuration:30, status:'approved' }];
  const durationGap = buildAnyStaffAvailability({ business:durationGapBusiness, businessId:'biz', serviceId:'cut', appointments:durationGapAppointments, date:bookingDate, durationMinutes:60, now:new Date('2099-01-04T08:00:00Z') });
  assert.ok(durationGap.candidateSlots.includes('09:00'), 'a direct-free 09:00 start remains visible for a 60 minute candidate');
  assert.ok(!durationGap.slots.includes('09:00') && durationGap.busySlots.includes('09:00'), 'the same 60 minute candidate remains server-duration unavailable');
  const shortDurationGap = buildAnyStaffAvailability({ business:durationGapBusiness, businessId:'biz', serviceId:'cut', appointments:durationGapAppointments, date:bookingDate, durationMinutes:30, now:new Date('2099-01-04T08:00:00Z') });
  assert.ok(shortDurationGap.slots.includes('09:00'), 'a 30 minute service fits before the 09:30 booking');
  const routeDb = { ref(path) { const value = path === 'appointments' ? { one:aliasAppointments[0] } : aliasBusiness; return { orderByChild(){return this;}, equalTo(){return this;}, async get() { return { exists:()=>true, val:()=>value }; } }; } };
  let routeStatus = 0, routeBody = null;
  const routeResponse = { setHeader(){}, status(code){ routeStatus=code; return this; }, json(body){ routeBody=body; return body; } };
  await handleAvailabilityWithDatabase({ method:'POST', auth:{profile:{role:'customer'}}, body:{ businessId:'biz', staffId:'staff-any', serviceId:'public-service-id', date:bookingDate, durationMinutes:45 } }, routeResponse, routeDb);
  assert.equal(routeStatus, 200, 'real availability route must respond 200');
  assert.ok(routeBody.slots.includes('09:30'), 'real availability route must expose 09:30 when Ata is free');
  const availability = buildAnyStaffAvailability({ business, businessId:'biz', serviceId:'cut', appointments:Object.values(appointments), date:bookingDate, durationMinutes:45, now:new Date('2099-01-04T08:00:00Z') });
  assert.ok(!availability.slots.includes('14:00') && availability.busySlots.includes('14:00'));
  assert.equal(effectiveAppointmentStatus({ date:'2020-01-01', time:'10:00', status:'pending', serviceDuration:30 }), 'expired');
  assert.equal(isAppointmentUpcoming({ date:'2099-01-01', time:'10:00', status:'approved' }), true);
  assert.equal(publicModule.sanitizePublicUrl('javascript:alert(1)'), undefined);
  assert.equal(publicModule.sanitizePublicUrl('data:text/html,x'), undefined);
  const projection = publicModule.buildPublicBusiness('biz', { status:'active', discoveryEnabled:true, socials:{ website:{active:true,value:'https://example.com'}, instagram:{active:false,value:'https://instagram.com/x'} } });
  assert.equal(projection.socials.website, 'https://example.com/');
  assert.equal(projection.socials.instagram, undefined);
  assert.match(create, /chooseAvailableStaff[\s\S]*transaction/);
  assert.match(create, /staffNameSnapshot: assignedName/);
  assert.match(customer, /startFavoriteAwareBooking/);
  assert.match(customer, /openCustomerNotification/);
  assert.match(rules, /"hiddenAppointments"[\s\S]*"\.write": false/);
  assert.match(customer, /candidateSlots/);
  assert.match(customer, /DURATION_UNAVAILABLE/);
  console.log('CUSTOMER BOOKING EXPERIENCE LOCAL: 30/30 kontrol geçti');
})().catch(error => { console.error(error); process.exit(1); });
