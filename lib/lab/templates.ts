/**
 * Starter result-field templates for common Nigerian hospital lab tests.
 * Loaded onto a test from Setup → Tests → Result fields, then edited.
 *
 * Reference ranges and critical limits are typical published adult values
 * (critical limits follow widely used laboratory "panic value" lists), in
 * the units most Nigerian labs report. They are a STARTING POINT ONLY —
 * each hospital's laboratory director must review them against their own
 * analysers, methods and local population before use.
 */
export interface ParameterTemplate {
  name: string;
  code?: string; // LOINC
  unit?: string;
  valueType: "numeric" | "choice" | "text";
  choices?: string[];
  abnormalChoices?: string[];
  refLow?: number | null;
  refHigh?: number | null;
  refRanges?: { sex?: "male" | "female"; minAgeYears?: number; maxAgeYears?: number; low?: number | null; high?: number | null }[];
  criticalLow?: number | null;
  criticalHigh?: number | null;
  decimals?: number;
}

export interface TestTemplate {
  key: string;
  name: string;
  /** Lower-case words that suggest this template for a test name. */
  matches: string[];
  parameters: ParameterTemplate[];
}

const GRADES = ["Negative", "Trace", "+", "++", "+++"];
const POS_NEG = ["Negative", "Positive"];

export const LAB_TEMPLATES: TestTemplate[] = [
  {
    key: "fbc",
    name: "Full Blood Count (FBC)",
    matches: ["fbc", "full blood", "complete blood", "cbc", "blood count"],
    parameters: [
      { name: "Haemoglobin (Hb)", code: "718-7", unit: "g/dL", valueType: "numeric", decimals: 1,
        refRanges: [{ sex: "male", minAgeYears: 15, low: 13, high: 17 }, { sex: "female", minAgeYears: 15, low: 12, high: 15 }],
        refLow: 11, refHigh: 16, criticalLow: 7, criticalHigh: 20 },
      { name: "Packed Cell Volume (PCV)", code: "4544-3", unit: "%", valueType: "numeric", decimals: 0,
        refRanges: [{ sex: "male", minAgeYears: 15, low: 40, high: 52 }, { sex: "female", minAgeYears: 15, low: 36, high: 47 }],
        refLow: 33, refHigh: 48, criticalLow: 20, criticalHigh: 60 },
      { name: "White Blood Cells (WBC)", code: "6690-2", unit: "×10⁹/L", valueType: "numeric", decimals: 1, refLow: 4, refHigh: 11, criticalLow: 2, criticalHigh: 30 },
      { name: "Neutrophils", code: "770-8", unit: "%", valueType: "numeric", decimals: 0, refLow: 40, refHigh: 75 },
      { name: "Lymphocytes", code: "736-9", unit: "%", valueType: "numeric", decimals: 0, refLow: 20, refHigh: 45 },
      { name: "Platelets", code: "777-3", unit: "×10⁹/L", valueType: "numeric", decimals: 0, refLow: 150, refHigh: 400, criticalLow: 20, criticalHigh: 1000 },
    ],
  },
  {
    key: "malaria",
    name: "Malaria Parasite (MP / mRDT)",
    matches: ["malaria", "mp", "mrdt", "plasmodium"],
    parameters: [
      { name: "Malaria parasites", code: "32700-7", valueType: "choice",
        choices: ["Not seen", "Seen (+)", "Seen (++)", "Seen (+++)", "Seen (++++)"],
        abnormalChoices: ["Seen (+)", "Seen (++)", "Seen (+++)", "Seen (++++)"] },
      { name: "Species", valueType: "text" },
    ],
  },
  {
    key: "fbs",
    name: "Fasting Blood Sugar (FBS)",
    matches: ["fasting", "fbs", "fbg"],
    parameters: [
      { name: "Fasting glucose", code: "1558-6", unit: "mg/dL", valueType: "numeric", decimals: 0, refLow: 70, refHigh: 100, criticalLow: 50, criticalHigh: 450 },
    ],
  },
  {
    key: "rbs",
    name: "Random Blood Sugar (RBS)",
    matches: ["random blood sugar", "rbs", "rbg", "blood sugar", "glucose"],
    parameters: [
      { name: "Random glucose", code: "2345-7", unit: "mg/dL", valueType: "numeric", decimals: 0, refLow: 70, refHigh: 140, criticalLow: 50, criticalHigh: 450 },
    ],
  },
  {
    key: "eucr",
    name: "Electrolytes, Urea & Creatinine (E/U/Cr)",
    matches: ["electrolyte", "e/u/cr", "eucr", "urea", "creatinine", "u&e", "renal function"],
    parameters: [
      { name: "Sodium (Na⁺)", code: "2951-2", unit: "mmol/L", valueType: "numeric", decimals: 0, refLow: 135, refHigh: 145, criticalLow: 120, criticalHigh: 160 },
      { name: "Potassium (K⁺)", code: "2823-3", unit: "mmol/L", valueType: "numeric", decimals: 1, refLow: 3.5, refHigh: 5.1, criticalLow: 2.8, criticalHigh: 6.2 },
      { name: "Chloride (Cl⁻)", code: "2075-0", unit: "mmol/L", valueType: "numeric", decimals: 0, refLow: 98, refHigh: 107 },
      { name: "Bicarbonate (HCO₃⁻)", code: "1963-8", unit: "mmol/L", valueType: "numeric", decimals: 0, refLow: 22, refHigh: 29, criticalLow: 10, criticalHigh: 40 },
      { name: "Urea", code: "22664-7", unit: "mmol/L", valueType: "numeric", decimals: 1, refLow: 2.5, refHigh: 7.1 },
      { name: "Creatinine", code: "14682-9", unit: "µmol/L", valueType: "numeric", decimals: 0,
        refRanges: [{ sex: "male", minAgeYears: 15, low: 62, high: 115 }, { sex: "female", minAgeYears: 15, low: 53, high: 97 }],
        refLow: 45, refHigh: 110 },
    ],
  },
  {
    key: "calcium",
    name: "Serum Calcium",
    matches: ["calcium"],
    parameters: [
      { name: "Calcium (total)", code: "2000-8", unit: "mmol/L", valueType: "numeric", decimals: 2, refLow: 2.15, refHigh: 2.55, criticalLow: 1.75, criticalHigh: 3.5 },
    ],
  },
  {
    key: "lft",
    name: "Liver Function Test (LFT)",
    matches: ["lft", "liver function"],
    parameters: [
      { name: "Total bilirubin", code: "14631-6", unit: "µmol/L", valueType: "numeric", decimals: 0, refLow: 3, refHigh: 21 },
      { name: "Conjugated bilirubin", code: "14629-0", unit: "µmol/L", valueType: "numeric", decimals: 0, refLow: 0, refHigh: 5 },
      { name: "ALT", code: "1742-6", unit: "U/L", valueType: "numeric", decimals: 0, refLow: 7, refHigh: 56 },
      { name: "AST", code: "1920-8", unit: "U/L", valueType: "numeric", decimals: 0, refLow: 10, refHigh: 40 },
      { name: "ALP", code: "6768-6", unit: "U/L", valueType: "numeric", decimals: 0, refLow: 44, refHigh: 147 },
      { name: "Total protein", code: "2885-2", unit: "g/L", valueType: "numeric", decimals: 0, refLow: 60, refHigh: 80 },
      { name: "Albumin", code: "1751-7", unit: "g/L", valueType: "numeric", decimals: 0, refLow: 35, refHigh: 50 },
    ],
  },
  {
    key: "lipid",
    name: "Lipid Profile",
    matches: ["lipid", "cholesterol"],
    parameters: [
      { name: "Total cholesterol", code: "2093-3", unit: "mmol/L", valueType: "numeric", decimals: 1, refLow: null, refHigh: 5.2 },
      { name: "LDL cholesterol", code: "13457-7", unit: "mmol/L", valueType: "numeric", decimals: 1, refLow: null, refHigh: 3.4 },
      { name: "HDL cholesterol", code: "2085-9", unit: "mmol/L", valueType: "numeric", decimals: 1, refLow: 1.0, refHigh: null },
      { name: "Triglycerides", code: "2571-8", unit: "mmol/L", valueType: "numeric", decimals: 1, refLow: null, refHigh: 1.7 },
    ],
  },
  {
    key: "urinalysis",
    name: "Urinalysis",
    matches: ["urinalysis", "urine analysis", "urine dipstick", "urine test"],
    parameters: [
      { name: "Protein", code: "20454-5", valueType: "choice", choices: GRADES, abnormalChoices: ["+", "++", "+++"] },
      { name: "Glucose", code: "25428-4", valueType: "choice", choices: GRADES, abnormalChoices: ["+", "++", "+++"] },
      { name: "Blood", code: "5794-3", valueType: "choice", choices: GRADES, abnormalChoices: ["+", "++", "+++"] },
      { name: "Ketones", code: "2514-8", valueType: "choice", choices: GRADES, abnormalChoices: ["+", "++", "+++"] },
      { name: "pH", code: "5803-2", valueType: "numeric", decimals: 1, refLow: 4.5, refHigh: 8 },
      { name: "Specific gravity", code: "5811-5", valueType: "numeric", decimals: 3, refLow: 1.005, refHigh: 1.03 },
    ],
  },
  {
    key: "genotype",
    name: "Haemoglobin Genotype",
    matches: ["genotype", "hb electrophoresis", "electrophoresis"],
    parameters: [
      { name: "Genotype", code: "4547-6", valueType: "choice", choices: ["AA", "AS", "AC", "SS", "SC", "CC"], abnormalChoices: ["SS", "SC", "CC"] },
    ],
  },
  {
    key: "blood_group",
    name: "Blood Group",
    matches: ["blood group", "grouping", "abo"],
    parameters: [
      { name: "ABO / Rh group", code: "882-1", valueType: "choice", choices: ["A Rh+", "A Rh−", "B Rh+", "B Rh−", "AB Rh+", "AB Rh−", "O Rh+", "O Rh−"] },
    ],
  },
  {
    key: "hbsag",
    name: "Hepatitis B Surface Antigen (HBsAg)",
    matches: ["hbsag", "hepatitis b"],
    parameters: [{ name: "HBsAg", code: "5196-1", valueType: "choice", choices: POS_NEG, abnormalChoices: ["Positive"] }],
  },
  {
    key: "hcv",
    name: "Hepatitis C Antibody (HCV)",
    matches: ["hcv", "hepatitis c"],
    parameters: [{ name: "Anti-HCV", code: "16128-1", valueType: "choice", choices: POS_NEG, abnormalChoices: ["Positive"] }],
  },
  {
    key: "pregnancy",
    name: "Pregnancy Test (urine hCG)",
    matches: ["pregnancy", "hcg", "pt"],
    parameters: [{ name: "Urine hCG", code: "2106-3", valueType: "choice", choices: POS_NEG }],
  },
];

/** Templates whose keywords appear in a test's name (best guess first). */
export function suggestTemplates(testName: string): TestTemplate[] {
  const name = ` ${testName.toLowerCase()} `;
  return LAB_TEMPLATES.filter((t) => t.matches.some((m) => name.includes(m.length <= 3 ? ` ${m} ` : m)));
}
