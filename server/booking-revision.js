import { randomUUID } from 'node:crypto';
import { getAdminDatabase } from './firebase-admin.js';
export async function publishBookingRevision(businessId) {
  await getAdminDatabase().ref('availability_revisions/'+businessId).set(randomUUID());
}
