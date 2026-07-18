import * as z from 'zod';

export const userSchema = z.object({
    firstname:    z.string().min(1, 'First name is required'),
    lastname:     z.string().min(1, 'Last name is required'),
    gender:       z.string().min(1, 'Gender is required'),
    username:     z.string().min(1, 'Username is required').min(3, 'Username must be at least 3 characters'),
    email:        z.string().min(1, 'Email is required').email('Invalid email address'),
    password:     z.string().optional(),
    roleId:       z.string().optional(),
    departmentId: z.string().optional(),
    licenseNumber:  z.string().optional(),
    licenseCouncil: z.string().optional(),
});

export type UserFormData = z.infer<typeof userSchema>;

// Nigerian professional regulatory councils for health workers
// (NDHA / Nigeria Health Worker Registry alignment)
export const LICENSE_COUNCILS = [
    { value: "MDCN",  label: "MDCN — Medical & Dental Council of Nigeria" },
    { value: "NMCN",  label: "NMCN — Nursing & Midwifery Council of Nigeria" },
    { value: "PCN",   label: "PCN — Pharmacy Council of Nigeria" },
    { value: "MLSCN", label: "MLSCN — Medical Laboratory Science Council of Nigeria" },
    { value: "RRBN",  label: "RRBN — Radiographers Registration Board of Nigeria" },
    { value: "MRTB",  label: "MRTB — Medical Rehabilitation Therapists Board" },
    { value: "CHPRBN", label: "CHPRBN — Community Health Practitioners Registration Board" },
    { value: "OTHER", label: "Other council" },
];
