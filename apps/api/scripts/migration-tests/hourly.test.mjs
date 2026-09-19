import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { btree_gist } from '@electric-sql/pglite/contrib/btree_gist';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
// PostGIS isn't involved in this migration and isn't bundled with PGlite.
// All other SQL, including the real GiST exclusion constraints, runs unchanged.
const withoutPostgis = (sql) => sql.replace(/CREATE EXTENSION IF NOT EXISTS "postgis";/g, '');
const legacySchema = withoutPostgis(read('./fixtures/before-hourly.sql'));
const upgrade = read('../../prisma/sql/0006_hourly_slots_upgrade.sql');
const post = read('../../prisma/sql/0006_hourly_slots_post.sql');
const ledger = 'CREATE TABLE "_SqlMigrations" (filename text PRIMARY KEY, applied_at timestamptz DEFAULT now());';
const record = `INSERT INTO "_SqlMigrations"(filename) VALUES ('0006_hourly_slots_upgrade.sql') ON CONFLICT DO NOTHING;`;
const ids = {
  user: '00000000-0000-0000-0000-000000000001',
  listing: '00000000-0000-0000-0000-000000000002',
  booking: '00000000-0000-0000-0000-000000000003',
  conversation: '00000000-0000-0000-0000-000000000004',
};
const seed = `
INSERT INTO "User" (id,email,"firstName","lastName","updatedAt") VALUES ('${ids.user}','migration@example.test','Test','User',now());
INSERT INTO "Listing" (id,"hostId",type,title,description,"addressLine1",city,"postalCode",latitude,longitude,"pricingUnit","basePrice",amenities,"updatedAt")
VALUES ('${ids.listing}','${ids.user}','OFFICE','Bureau test','Migration fixture','1 rue Test','Paris','75001',48.8,2.3,'DAY',100,ARRAY['wifi'],now());
INSERT INTO "Booking" (id,"listingId","tenantId",status,"startDate","endDate","unitCount","baseAmount","serviceFee","totalAmount","updatedAt")
VALUES ('${ids.booking}','${ids.listing}','${ids.user}','CONFIRMED','2026-07-10','2026-07-12',2,200,24,224,now());
INSERT INTO "ListingAvailability" ("listingId","startDate","endDate","isAvailable") VALUES ('${ids.listing}','2026-01-10','2026-01-12',false);
INSERT INTO "Payment" ("bookingId",amount,"platformFee","hostPayout","updatedAt") VALUES ('${ids.booking}',224,24,200,now());
INSERT INTO "Deposit" ("bookingId",amount,"updatedAt") VALUES ('${ids.booking}',300,now());
INSERT INTO "Review" ("bookingId","authorId",target,rating,"listingId","updatedAt") VALUES ('${ids.booking}','${ids.user}','LISTING',5,'${ids.listing}',now());
INSERT INTO "Conversation" (id,"bookingId","listingId","tenantId","hostId") VALUES ('${ids.conversation}','${ids.booking}','${ids.listing}','${ids.user}','${ids.user}');
INSERT INTO "Message" ("conversationId","senderId","senderRole",content,"bookingId") VALUES ('${ids.conversation}','${ids.user}','TENANT','Keep this message','${ids.booking}');
`;
async function createDb(t, { constraints = true } = {}) {
  const db = new PGlite({ extensions: { btree_gist, pgcrypto } });
  t.after(() => db.close());
  await db.exec(legacySchema + ledger);
  if (constraints) await db.exec(read('../../prisma/sql/0003_booking_constraints.sql'));
  await db.exec(seed);
  return db;
}
async function migrate(db) {
  await db.exec('BEGIN');
  try {
    await db.exec(upgrade + post + record);
    await db.exec('COMMIT');
  } catch (error) {
    await db.exec('ROLLBACK');
    throw error;
  }
}
async function columns(db, table) {
  return (await db.query(`SELECT column_name FROM information_schema.columns WHERE table_name = $1`, [table])).rows.map((r) => r.column_name);
}
async function count(db, table) {
  return (await db.query(`SELECT count(*)::int AS n FROM "${table}"`)).rows[0].n;
}
const bookingInsert = (start, end, status = 'CONFIRMED') => `INSERT INTO "Booking" ("listingId","tenantId",status,"startAt","endAt","unitCount","baseAmount","serviceFee","totalAmount","updatedAt") VALUES ('${ids.listing}','${ids.user}','${status}','${start}','${end}',1,100,12,112,now());`;

test('legacy upgrade preserves financial snapshots, related records and local calendar dates', async (t) => {
  const db = await createDb(t);
  const snapshots = {};
  for (const table of ['Payment','Deposit','Message','Conversation','User','ListingPhoto']) snapshots[table] = (await db.query(`SELECT * FROM "${table}" ORDER BY id`)).rows;
  await db.exec("SET TIME ZONE 'America/Los_Angeles'");
  await migrate(db);
  for (const [table, before] of Object.entries(snapshots)) assert.deepEqual((await db.query(`SELECT * FROM "${table}" ORDER BY id`)).rows, before);
  assert.equal(await count(db, 'Review'), 1);
  const b = (await db.query('SELECT * FROM "Booking"')).rows[0];
  assert.equal(b.id, ids.booking);
  assert.equal(b.startAt.toISOString(), '2026-07-09T22:00:00.000Z');
  assert.equal(b.endAt.toISOString(), '2026-07-11T22:00:00.000Z');
  assert.equal(b.totalAmount, '224.00');
  assert.equal(b.unitCount, 2);
  const a = (await db.query('SELECT * FROM "ListingAvailability"')).rows[0];
  assert.equal(a.startAt.toISOString(), '2026-01-09T23:00:00.000Z');
  assert.equal(a.isAvailable, false);
  assert.equal((await columns(db, 'Booking')).includes('startDate'), false);
  assert.equal(await count(db, '_SqlMigrations'), 1);
  assert.equal((await columns(db, 'Listing')).includes('openDays'), true);
  assert.equal((await columns(db, 'HostInvitation')).includes('token'), true);
});

test('hourly constraints reject overlaps and empty ranges, but permit adjacent and cancelled bookings', async (t) => {
  const db = await createDb(t);
  await migrate(db);
  await assert.rejects(db.exec(bookingInsert('2026-07-10T10:00:00Z', '2026-07-10T11:00:00Z')), (e) => e.code === '23P01');
  await assert.rejects(db.exec(bookingInsert('2026-07-15T10:00:00Z', '2026-07-15T10:00:00Z')), (e) => e.code === '23514');
  await db.exec(bookingInsert('2026-07-11T22:00:00Z', '2026-07-11T23:00:00Z'));
  await db.exec(bookingInsert('2026-07-10T10:00:00Z', '2026-07-10T11:00:00Z', 'CANCELLED'));
  assert.equal(await count(db, 'Booking'), 3);
});

test('replaying the upgrade and post is safe after an interrupted deployment', async (t) => {
  const db = await createDb(t);
  await migrate(db);
  const before = (await db.query('SELECT * FROM "Booking"')).rows;
  await migrate(db);
  assert.deepEqual((await db.query('SELECT * FROM "Booking"')).rows, before);
  assert.equal(await count(db, '_SqlMigrations'), 1);
});

test('constraint failure rolls back renames, added columns and the ledger together', async (t) => {
  const db = await createDb(t, { constraints: false });
  await db.exec(`INSERT INTO "Booking" ("listingId","tenantId","startDate","endDate","unitCount","baseAmount","serviceFee","totalAmount","updatedAt") VALUES ('${ids.listing}','${ids.user}','2026-07-10','2026-07-11',1,100,12,112,now());`);
  await assert.rejects(migrate(db), (e) => e.code === '23P01');
  assert.equal((await columns(db, 'Booking')).includes('startDate'), true);
  assert.equal((await columns(db, 'Booking')).includes('startAt'), false);
  assert.equal((await columns(db, 'Listing')).includes('openDays'), false);
  assert.equal(await count(db, 'Booking'), 2);
  assert.equal(await count(db, '_SqlMigrations'), 0);
});

test('ambiguous partial schemas stop without discarding either column', async (t) => {
  const db = await createDb(t);
  await db.exec('ALTER TABLE "Booking" ADD COLUMN "startAt" timestamptz;');
  await assert.rejects(migrate(db), /Ambiguous schema/);
  const names = await columns(db, 'Booking');
  assert(names.includes('startDate') && names.includes('startAt'));
  assert.equal(await count(db, 'Booking'), 1);
});

test('fresh current Prisma schema upgrades without referencing legacy date columns', async (t) => {
  const apiRoot = fileURLToPath(new URL('../../', import.meta.url));
  const schema = execFileSync(process.execPath, ['node_modules/prisma/build/index.js','migrate','diff','--from-empty','--to-schema-datamodel','prisma/schema.prisma','--script'], {cwd: apiRoot, encoding:'utf8'});
  const db = new PGlite({extensions:{btree_gist,pgcrypto}});
  t.after(() => db.close());
  await db.exec(withoutPostgis(schema) + ledger);
  await migrate(db);
  await migrate(db);
  assert.equal(await count(db, 'Booking'), 0);
  assert.equal(await count(db, '_SqlMigrations'), 1);
});
