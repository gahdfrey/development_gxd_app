import { getCountries, getCountryCallingCode } from "libphonenumber-js";

export interface CountryCode {
  name: string;
  code: string;
  flag: string;
  countryCode: string; // ISO 3166-1 alpha-2 code (e.g., "US", "NG")
}

// Map of country codes to country names
const COUNTRY_NAMES: Record<string, string> = {
  US: "United States",
  CA: "Canada",
  GB: "United Kingdom",
  AU: "Australia",
  NZ: "New Zealand",
  NG: "Nigeria",
  GH: "Ghana",
  KE: "Kenya",
  ZA: "South Africa",
  EG: "Egypt",
  IN: "India",
  PK: "Pakistan",
  BD: "Bangladesh",
  CN: "China",
  JP: "Japan",
  KR: "South Korea",
  SG: "Singapore",
  MY: "Malaysia",
  TH: "Thailand",
  VN: "Vietnam",
  PH: "Philippines",
  ID: "Indonesia",
  DE: "Germany",
  FR: "France",
  IT: "Italy",
  ES: "Spain",
  NL: "Netherlands",
  BE: "Belgium",
  CH: "Switzerland",
  AT: "Austria",
  SE: "Sweden",
  NO: "Norway",
  DK: "Denmark",
  FI: "Finland",
  PL: "Poland",
  RU: "Russia",
  UA: "Ukraine",
  BR: "Brazil",
  AR: "Argentina",
  MX: "Mexico",
  CO: "Colombia",
  CL: "Chile",
  PE: "Peru",
  AE: "United Arab Emirates",
  SA: "Saudi Arabia",
  IL: "Israel",
  TR: "Turkey",
  GR: "Greece",
  PT: "Portugal",
  IE: "Ireland",
  CZ: "Czech Republic",
  HU: "Hungary",
  RO: "Romania",
  BG: "Bulgaria",
  HR: "Croatia",
  RS: "Serbia",
  SK: "Slovakia",
  SI: "Slovenia",
  LT: "Lithuania",
  LV: "Latvia",
  EE: "Estonia",
  IS: "Iceland",
  LU: "Luxembourg",
  MT: "Malta",
  CY: "Cyprus",
};

// Helper function to get flag emoji from country code
function getFlagEmoji(countryCode: string): string {
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

// Generate the complete list of country codes with flags
export const COUNTRY_CODES: CountryCode[] = getCountries()
  .map((isoCode) => {
    try {
      const callingCode = getCountryCallingCode(isoCode);
      return {
        name: COUNTRY_NAMES[isoCode] || isoCode,
        code: `+${callingCode}`,
        flag: getFlagEmoji(isoCode),
        countryCode: isoCode,
      };
    } catch (error) {
      return null;
    }
  })
  .filter((country) => country !== null)
  .sort((a, b) => {
    // Prioritize Nigeria, then sort alphabetically
    if ((a as CountryCode).countryCode === "NG") return -1;
    if ((b as CountryCode).countryCode === "NG") return 1;
    return (a as CountryCode).name.localeCompare((b as CountryCode).name);
  }) as CountryCode[];
