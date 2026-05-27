import 'dotenv/config';
import { db } from './index';
import { users, roles, patients, appointments, hmos } from './schema';
import { eq, and } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

const ORG_ID = 1; // Dleventh Clinic

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
    const hour = randomInt(8, 17);
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
    null, null, null,
];

const doctorData = [
    { username: 'dr.adebayo', email: 'adebayo@gxdapp.com', firstname: 'Adebayo', lastname: 'Ogundimu' },
    { username: 'dr.amina', email: 'amina@gxdapp.com', firstname: 'Amina', lastname: 'Bello' },
    { username: 'dr.chukwu', email: 'chukwu@gxdapp.com', firstname: 'Chukwuemeka', lastname: 'Obi' },
];

async function seedTestData() {
    console.log('🌱 Starting test data seed for Dleventh Clinic (org 1)...\n');

    const [doctorRole] = await db
        .select()
        .from(roles)
        .where(and(eq(roles.name, 'Doctor'), eq(roles.organisationId, ORG_ID)));

    if (!doctorRole) {
        console.error('❌ Doctor role not found for org 1. Create it first via /setup.');
        process.exit(1);
    }

    const allHmos = await db.select().from(hmos);
    const hmoIds = allHmos.map(h => h.id);

    console.log('👨‍⚕️ Creating 3 doctors...');
    const hashedPassword = await bcrypt.hash('Doctor@123', 10);
    const doctorIds: number[] = [];

    for (const doc of doctorData) {
        const existing = await db.select().from(users)
            .where(and(eq(users.username, doc.username), eq(users.organisationId, ORG_ID)));

        if (existing.length > 0) {
            doctorIds.push(existing[0].id);
            console.log(`   ✓ Doctor ${doc.firstname} ${doc.lastname} already exists (id: ${existing[0].id})`);
        } else {
            const [newDoc] = await db.insert(users).values({
                organisationId: ORG_ID,
                username: doc.username,
                email: doc.email,
                firstname: doc.firstname,
                lastname: doc.lastname,
                password: hashedPassword,
                roleId: doctorRole.id,
            }).returning();
            doctorIds.push(newDoc.id);
            console.log(`   ✓ Created Dr. ${doc.firstname} ${doc.lastname} (id: ${newDoc.id})`);
        }
    }

    console.log('\n🏥 Creating 50 patients...');
    const patientIds: number[] = [];
    const usedNames = new Set<string>();

    for (let i = 0; i < 50; i++) {
        let firstname: string, lastname: string, key: string;
        do {
            firstname = i < firstNames.length ? firstNames[i] : firstNames[randomInt(0, firstNames.length - 1)];
            lastname = i < lastNames.length ? lastNames[i] : lastNames[randomInt(0, lastNames.length - 1)];
            key = `${firstname}-${lastname}`;
        } while (usedNames.has(key));
        usedNames.add(key);

        const gender = randomItem(genders);
        const insurance = randomItem(insuranceTypes);
        const isHmo = insurance === 'hmo' && hmoIds.length > 0;

        const [patient] = await db.insert(patients).values({
            organisationId: ORG_ID,
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

    console.log('\n📅 Creating 200 appointments across the next 5 months...');

    const today = new Date();
    const fiveMonthsLater = new Date(today);
    fiveMonthsLater.setMonth(fiveMonthsLater.getMonth() + 5);

    let createdCount = 0;

    for (let i = 0; i < 200; i++) {
        const appointmentDay = randomDate(today, fiveMonthsLater);
        if (appointmentDay.getDay() === 0) appointmentDay.setDate(appointmentDay.getDate() + 1);
        if (appointmentDay.getDay() === 6) appointmentDay.setDate(appointmentDay.getDate() + 2);

        await db.insert(appointments).values({
            organisationId: ORG_ID,
            patientId: randomItem(patientIds),
            doctorId: randomItem(doctorIds),
            appointmentDate: formatDate(appointmentDay),
            appointmentTime: randomTime(),
            status: randomItem(statuses),
            visitType: randomItem(visitTypes),
            notes: randomItem(appointmentNotes),
        });

        createdCount++;
    }

    console.log(`   ✓ Created ${createdCount} appointments`);
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
