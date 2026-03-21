import 'dotenv/config';
import { db } from './index';
import { users, roles, patients, appointments, hmos } from './schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

// ─── Helpers ────────────────────────────────────────────────
function randomItem<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function padZero(n: number): string {
    return n.toString().padStart(2, '0');
}

function randomDate(startDate: Date, endDate: Date): Date {
    const start = startDate.getTime();
    const end = endDate.getTime();
    return new Date(start + Math.random() * (end - start));
}

function formatDate(d: Date): string {
    return `${d.getFullYear()}-${padZero(d.getMonth() + 1)}-${padZero(d.getDate())}`;
}

function randomTime(): string {
    const hour = randomInt(8, 17); // 8 AM to 5 PM
    const minute = randomItem([0, 15, 30, 45]);
    return `${padZero(hour)}:${padZero(minute)}`;
}

function randomPhone(): string {
    return `${randomInt(800, 909)}${randomInt(1000000, 9999999)}`;
}

function randomDOB(): string {
    const year = randomInt(1950, 2005);
    const month = randomInt(1, 12);
    const day = randomInt(1, 28);
    return `${year}-${padZero(month)}-${padZero(day)}`;
}

// ─── Data ────────────────────────────────────────────────────
const firstNames = [
    'Adaeze', 'Chinedu', 'Fatima', 'Ibrahim', 'Ngozi', 'Oluwaseun', 'Yusuf', 'Amina',
    'Emeka', 'Halima', 'Obiora', 'Rashida', 'Tunde', 'Zainab', 'Chidera', 'Musa',
    'Aisha', 'Obinna', 'Funke', 'Abdullahi', 'Kemi', 'Idris', 'Bola', 'Usman',
    'Nkechi', 'Taiwo', 'Hauwa', 'Chukwuma', 'Adeola', 'Suleiman', 'Blessing',
    'Kabiru', 'Grace', 'Mohammed', 'Joy', 'Aliyu', 'Patience', 'Danjuma', 'Stella',
    'Garba', 'Chioma', 'Hassan', 'Mercy', 'Bello', 'Rita', 'Yakubu', 'Esther',
    'Sanusi', 'Vivian', 'Audu'
];

const lastNames = [
    'Okafor', 'Balogun', 'Abdullahi', 'Eze', 'Ogundipe', 'Ibrahim', 'Nnamdi', 'Abubakar',
    'Okonkwo', 'Adeyemi', 'Mohammed', 'Chukwu', 'Adekunle', 'Musa', 'Okoro', 'Lawal',
    'Nnadi', 'Afolabi', 'Sani', 'Igwe', 'Bakare', 'Yusuf', 'Nwachukwu', 'Ogunbiyi',
    'Danladi', 'Ojo', 'Haruna', 'Onuoha', 'Adebayo', 'Garba', 'Osagie', 'Shehu',
    'Uzoma', 'Oladipo', 'Buba', 'Anyanwu', 'Olawale', 'Tijani', 'Ibe', 'Jimoh',
    'Uche', 'Kolawole', 'Dauda', 'Achebe', 'Oladele', 'Ahmad', 'Ezeh', 'Fashola',
    'Aliyu', 'Obasi'
];

const relationships = ['parent', 'sibling', 'spouse', 'child', 'relative', 'friend'];
const genders = ['male', 'female'];
const insuranceTypes = ['private', 'hmo'];
const statuses = ['scheduled', 'completed', 'cancelled', 'no-show'];
const visitTypes = ['new visit', 'follow up', 'review', 'first visit after discharge', 'drug refill'];
const appointmentNotes = [
    'Routine checkup', 'Follow-up for blood pressure monitoring', 'Prescription refill needed',
    'Patient reports persistent headache', 'Post-surgery follow-up', 'Annual physical examination',
    'Lab results review', 'Referred by Dr. for specialist consultation', 'Chronic pain management',
    'Diabetes management review', 'Prenatal checkup', 'Vaccination appointment',
    'Wound dressing change', 'Eye examination referral', 'Chest pain evaluation',
    null, null, null, // some with no notes
];

const doctors = [
    { username: 'dr.adebayo', email: 'adebayo@gxdapp.com', firstname: 'Adebayo', lastname: 'Ogundimu' },
    { username: 'dr.amina', email: 'amina@gxdapp.com', firstname: 'Amina', lastname: 'Bello' },
    { username: 'dr.chukwu', email: 'chukwu@gxdapp.com', firstname: 'Chukwuemeka', lastname: 'Obi' },
];

// ─── Main Seed ──────────────────────────────────────────────
async function seedTestData() {
    console.log('🌱 Starting test data seed...\n');

    // 1. Get doctor role ID
    const doctorRole = await db.select().from(roles).where(eq(roles.name, 'Doctor'));
    if (doctorRole.length === 0) {
        console.error('❌ Doctor role not found. Run the main seed first: npm run db:seed');
        process.exit(1);
    }
    const doctorRoleId = doctorRole[0].id;

    // 2. Get HMO IDs
    const allHmos = await db.select().from(hmos);
    const hmoIds = allHmos.map(h => h.id);

    // 3. Create 3 doctors
    console.log('👨‍⚕️ Creating 3 doctors...');
    const hashedPassword = await bcrypt.hash('Doctor@123', 10);
    const doctorIds: number[] = [];

    for (const doc of doctors) {
        const existing = await db.select().from(users).where(eq(users.username, doc.username));
        if (existing.length > 0) {
            doctorIds.push(existing[0].id);
            console.log(`   ✓ Doctor ${doc.firstname} ${doc.lastname} already exists (id: ${existing[0].id})`);
        } else {
            const [newDoc] = await db.insert(users).values({
                username: doc.username,
                email: doc.email,
                firstname: doc.firstname,
                lastname: doc.lastname,
                password: hashedPassword,
                roleId: doctorRoleId,
            }).returning();
            doctorIds.push(newDoc.id);
            console.log(`   ✓ Created Dr. ${doc.firstname} ${doc.lastname} (id: ${newDoc.id})`);
        }
    }

    // 4. Create 50 patients
    console.log('\n🏥 Creating 50 patients...');
    const patientIds: number[] = [];
    const usedNames = new Set<string>();

    for (let i = 0; i < 50; i++) {
        let firstname: string, lastname: string, key: string;
        do {
            firstname = firstNames[i % firstNames.length];
            lastname = lastNames[i % lastNames.length];
            if (i >= firstNames.length) {
                // Add a suffix for uniqueness
                firstname = firstNames[randomInt(0, firstNames.length - 1)];
                lastname = lastNames[randomInt(0, lastNames.length - 1)];
            }
            key = `${firstname}-${lastname}`;
        } while (usedNames.has(key));
        usedNames.add(key);

        const gender = randomItem(genders);
        const insurance = randomItem(insuranceTypes);
        const isHmo = insurance === 'hmo' && hmoIds.length > 0;

        const [patient] = await db.insert(patients).values({
            firstname,
            lastname,
            gender,
            dob: randomDOB(),
            maidenName: gender === 'female' ? randomItem(lastNames) : null,
            countryCode: '+234',
            phone: randomPhone(),
            insuranceType: insurance,
            hmoId: isHmo ? randomItem(hmoIds) : null,
            policyNumber: isHmo ? `HMO-${randomInt(100000, 999999)}` : null,
            nextOfKinFirstname: randomItem(firstNames),
            nextOfKinLastname: lastname,
            nextOfKinRelationship: randomItem(relationships),
            nextOfKinAddress: `${randomInt(1, 200)} ${randomItem(['Broad Street', 'Allen Avenue', 'Aba Road', 'Ahmadu Bello Way', 'Herbert Macaulay Road', 'Awolowo Road'])}, Lagos`,
            nextOfKinPhone: randomPhone(),
            nextOfKinEmail: `${firstname.toLowerCase()}.kin@email.com`,
        }).returning();

        patientIds.push(patient.id);
    }
    console.log(`   ✓ Created ${patientIds.length} patients`);

    // 5. Create 200 appointments spread across the next 5 months
    console.log('\n📅 Creating 200 appointments across the next 5 months...');

    const today = new Date();
    const fiveMonthsLater = new Date(today);
    fiveMonthsLater.setMonth(fiveMonthsLater.getMonth() + 5);

    let createdCount = 0;

    for (let i = 0; i < 200; i++) {
        const appointmentDay = randomDate(today, fiveMonthsLater);
        // Skip weekends
        if (appointmentDay.getDay() === 0) appointmentDay.setDate(appointmentDay.getDate() + 1);
        if (appointmentDay.getDay() === 6) appointmentDay.setDate(appointmentDay.getDate() + 2);

        const status = randomItem(statuses);

        await db.insert(appointments).values({
            patientId: randomItem(patientIds),
            doctorId: randomItem(doctorIds),
            appointmentDate: formatDate(appointmentDay),
            appointmentTime: randomTime(),
            status,
            visitType: randomItem(visitTypes),
            notes: randomItem(appointmentNotes),
        });

        createdCount++;
    }

    console.log(`   ✓ Created ${createdCount} appointments`);

    // Summary
    console.log('\n✅ Seed complete!');
    console.log(`   • 3 doctors (password: Doctor@123)`);
    console.log(`   • ${patientIds.length} patients`);
    console.log(`   • ${createdCount} appointments (next 5 months)`);

    process.exit(0);
}

seedTestData().catch((err) => {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
});
