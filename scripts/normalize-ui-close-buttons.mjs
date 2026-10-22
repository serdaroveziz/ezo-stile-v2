import fs from 'node:fs';

const files = [
  'index.html',
  'src/ui/customer.js',
  'src/ui/owner.js',
  'src/ui/portal.js',
  'src/ui/salon-application.js',
  'src/ui/staff-operations.js',
  'src/ui/staff.js',
  'src/ui/super-admin.js'
];

for (const file of files) {
  let source = fs.readFileSync(file, 'utf8');
  source = source.replace(/\p{Extended_Pictographic}|[\u{1F1E6}-\u{1F1FF}\uFE0F]/gu, '');
  source = source.replace(
    /<button([^>]*onclick="window\.(closeModal|closeManualBookingModal)\(\)"[^>]*)>\s*<\/button>/g,
    (_match, attributes) => `<button aria-label="Kapat"${attributes}>\${uiIcon('x')}</button>`
  );
  source = source.replace(
    /<button([^>]*onclick="window\.openProfilePhotoModal\(\)"[^>]*)>\s*<\/button>/g,
    (_match, attributes) => `<button aria-label="Profil fotoğrafını düzenle"${attributes}>\${uiIcon('pencil')}</button>`
  );
  fs.writeFileSync(file, source, 'utf8');
}
