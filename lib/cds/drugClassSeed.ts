/**
 * Built-in drug classes for class-level allergy matching (seeded with a null
 * organisationId by lib/db/add-allergies-problems.ts). Members are
 * lower-case active-ingredient names (and common combination names) matched
 * as whole words against drug_generics.name. A starting set covering the
 * families most often implicated in drug allergy, weighted to the Nigerian
 * essential medicines list — hospitals extend it via Setup → Drug classes.
 */
export const BUILT_IN_DRUG_CLASSES: {
  key: string;
  name: string;
  description: string;
  members: string[];
  crossReactsWith?: string[];
}[] = [
  {
    key: "penicillins",
    name: "Penicillins",
    description: "Beta-lactam antibiotics. Allergy is the most commonly reported drug allergy.",
    members: [
      "penicillin", "benzylpenicillin", "phenoxymethylpenicillin", "benzathine", "procaine penicillin",
      "amoxicillin", "co-amoxiclav", "ampicillin", "ampiclox", "cloxacillin", "flucloxacillin",
      "dicloxacillin", "piperacillin", "ticarcillin",
    ],
    crossReactsWith: ["cephalosporins", "carbapenems"],
  },
  {
    key: "cephalosporins",
    name: "Cephalosporins",
    description: "Beta-lactam antibiotics; low but real cross-reactivity with penicillins.",
    members: [
      "cefalexin", "cephalexin", "cefadroxil", "cefazolin", "cefuroxime", "cefaclor", "cefixime",
      "cefpodoxime", "ceftriaxone", "cefotaxime", "ceftazidime", "cefepime", "cefoperazone",
    ],
    crossReactsWith: ["penicillins"],
  },
  {
    key: "carbapenems",
    name: "Carbapenems",
    description: "Beta-lactam antibiotics.",
    members: ["meropenem", "imipenem", "ertapenem", "doripenem"],
    crossReactsWith: ["penicillins"],
  },
  {
    key: "sulfonamides",
    name: "Sulfonamide antibiotics (sulfa drugs)",
    description: "Includes co-trimoxazole and sulfadoxine–pyrimethamine (SP, used for IPTp in pregnancy).",
    members: [
      "sulfamethoxazole", "co-trimoxazole", "cotrimoxazole", "sulfadoxine", "sulfadiazine",
      "sulfasalazine", "sulfacetamide", "silver sulfadiazine",
    ],
  },
  {
    key: "nsaids",
    name: "NSAIDs (non-steroidal anti-inflammatory painkillers)",
    description: "Includes aspirin; can trigger asthma attacks and hives in sensitive patients.",
    members: [
      "ibuprofen", "diclofenac", "naproxen", "piroxicam", "meloxicam", "indomethacin", "indometacin",
      "ketoprofen", "ketorolac", "mefenamic acid", "aspirin", "acetylsalicylic acid", "celecoxib",
      "etoricoxib", "aceclofenac",
    ],
  },
  {
    key: "macrolides",
    name: "Macrolides",
    description: "Antibiotics.",
    members: ["erythromycin", "azithromycin", "clarithromycin"],
  },
  {
    key: "fluoroquinolones",
    name: "Fluoroquinolones",
    description: "Antibiotics.",
    members: ["ciprofloxacin", "levofloxacin", "ofloxacin", "moxifloxacin", "norfloxacin", "pefloxacin"],
  },
  {
    key: "tetracyclines",
    name: "Tetracyclines",
    description: "Antibiotics.",
    members: ["tetracycline", "doxycycline", "minocycline", "oxytetracycline"],
  },
  {
    key: "aminoglycosides",
    name: "Aminoglycosides",
    description: "Antibiotics.",
    members: ["gentamicin", "amikacin", "streptomycin", "tobramycin", "neomycin", "kanamycin"],
  },
  {
    key: "opioids",
    name: "Opioid analgesics",
    description: "Strong painkillers.",
    members: ["morphine", "codeine", "tramadol", "pethidine", "pentazocine", "fentanyl", "dihydrocodeine", "oxycodone", "tapentadol"],
  },
  {
    key: "artemisinins",
    name: "Artemisinin antimalarials",
    description: "Artemether, artesunate and related ACT components.",
    members: ["artemether", "artesunate", "dihydroartemisinin", "arteether", "artemisinin"],
  },
  {
    key: "quinoline_antimalarials",
    name: "Quinoline antimalarials",
    description: "Quinine, chloroquine, amodiaquine and related drugs.",
    members: ["quinine", "chloroquine", "hydroxychloroquine", "amodiaquine", "mefloquine", "primaquine", "piperaquine"],
  },
  {
    key: "aromatic_anticonvulsants",
    name: "Aromatic anticonvulsants",
    description: "Linked to severe skin reactions (SJS/TEN) with cross-sensitivity between members.",
    members: ["carbamazepine", "oxcarbazepine", "phenytoin", "phenobarbital", "phenobarbitone", "lamotrigine"],
  },
  {
    key: "ace_inhibitors",
    name: "ACE inhibitors",
    description: "Can cause angioedema (swelling of face, lips, throat).",
    members: ["lisinopril", "enalapril", "captopril", "ramipril", "perindopril"],
  },
  {
    key: "amide_local_anaesthetics",
    name: "Local anaesthetics (amide type)",
    description: "Lidocaine and related drugs.",
    members: ["lidocaine", "lignocaine", "bupivacaine", "ropivacaine", "prilocaine", "mepivacaine"],
  },
  {
    key: "iodinated_contrast",
    name: "Iodinated contrast media",
    description: "Contrast used in CT and X-ray studies.",
    members: ["iohexol", "iopamidol", "iodixanol", "iopromide", "ioversol", "diatrizoate", "contrast"],
  },
];
