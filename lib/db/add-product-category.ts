import { db } from "./index";
import { sql } from "drizzle-orm";

async function migrate() {
  console.log("Adding category column to products…");
  await db.execute(sql`
    ALTER TABLE products
    ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'general';
  `);

  console.log("Categorising existing products…");
  // All current products are pharmacy drugs
  await db.execute(sql`
    UPDATE products
    SET category = 'pharmacy'
    WHERE id IN (1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20);
  `);

  console.log("Adding laboratory products…");
  await db.execute(sql`
    INSERT INTO products (name, description, cases_in_stock, units_per_case, loose_units_in_stock, reorder_level, price, category)
    VALUES
      ('EDTA Blood Collection Tubes (3mL)',   'For FBC/CBC and haematology tests',            10, 100, 0, 200, 150,  'laboratory'),
      ('SST Blood Collection Tubes (5mL)',    'Serum separator for biochemistry panels',       10, 100, 0, 200, 180,  'laboratory'),
      ('Urine Dipstick Reagent Strips',       '10-parameter urinalysis strips',               5,  100, 0, 100, 200,  'laboratory'),
      ('Malaria RDT Test Kits',               'Rapid diagnostic test — Pf/Pan antigen',       10, 25,  0, 50,  350,  'laboratory'),
      ('HIV Test Kits (Determine)',           'Rapid HIV 1/2 antibody test',                  5,  25,  0, 50,  500,  'laboratory'),
      ('Hepatitis B Surface Antigen Test Kits','HBsAg rapid test strips',                     5,  25,  0, 50,  400,  'laboratory'),
      ('Pregnancy Test Kits (hCG)',           'Urine-based qualitative hCG test',             5,  50,  0, 100, 250,  'laboratory'),
      ('Blood Glucose Test Strips',           'Compatible with OneTouch glucometers',         5,  50,  0, 100, 600,  'laboratory'),
      ('Microscope Glass Slides',             'Plain frosted-end glass slides (72-pack)',      10, 72,  0, 150, 350,  'laboratory'),
      ('Cover Slips 22×22mm',                'Borosilicate glass, pack of 100',              10, 100, 0, 200, 200,  'laboratory'),
      ('Giemsa Stain Solution',              'For malaria blood film staining, 500mL',        4,  6,   0, 12,  2500, 'laboratory'),
      ('Gram Stain Kit',                     'Crystal violet, iodine, safranin, decolouriser', 4, 4,   0, 8,   3500, 'laboratory'),
      ('Sample Collection Cups (30mL)',       'Sterile screw-cap urine/sputum containers',    10, 100, 0, 200, 80,   'laboratory'),
      ('Lancets (Safety, 21G)',               'Single-use safety lancets for capillary blood', 10, 100, 0, 200, 120,  'laboratory'),
      ('Nitrile Gloves (M, powder-free)',     'Examination gloves, box of 100',               20, 100, 0, 400, 4500, 'laboratory')
    ON CONFLICT DO NOTHING;
  `);

  console.log("Adding radiology products…");
  await db.execute(sql`
    INSERT INTO products (name, description, cases_in_stock, units_per_case, loose_units_in_stock, reorder_level, price, category)
    VALUES
      ('X-Ray Film 14×17 inch',              'Single-emulsion radiographic film, box of 100', 5,  100, 0, 100, 8500,  'radiology'),
      ('X-Ray Film 10×12 inch',              'Radiographic film for smaller field views',     5,  100, 0, 100, 7000,  'radiology'),
      ('Omnipaque 350 (Iohexol) 50mL',       'Non-ionic iodinated contrast agent for CT/angio', 4, 10, 0, 20, 15000, 'radiology'),
      ('Ultrasound Gel (250mL)',             'Aquasonic clear ultrasound transmission gel',   10, 12,  0, 24, 1800,  'radiology'),
      ('X-Ray Developer Solution (5L)',      'Ready-to-use developer for automatic processors', 4, 4,  0, 8,  9500,  'radiology'),
      ('X-Ray Fixer Solution (5L)',          'Rapid fixer for radiographic films',            4,  4,   0, 8,  8500,  'radiology'),
      ('Lead Protective Apron',             '0.5mm Pb equivalent, frontal protection',        1,  5,   0, 5,  85000, 'radiology'),
      ('Thyroid Collar (Lead)',              'Lead protection for thyroid during X-ray',      1,  10,  0, 10, 25000, 'radiology'),
      ('Radiation Dosimeter Badges',        'Personal radiation monitoring badge (monthly)',  1,  20,  0, 40, 3500,  'radiology'),
      ('CR Imaging Plate (Cassette) 14×17', 'Reusable computed radiography imaging plate',   1,  2,   0, 2,  120000,'radiology')
    ON CONFLICT DO NOTHING;
  `);

  console.log("Done ✓");
  process.exit(0);
}
migrate().catch(e => { console.error(e); process.exit(1); });
