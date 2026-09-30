/**
 * There's no bank-account-provisioning API integrated yet, so every
 * bank_transfer payment (wallet top-up or bill payment) is shown this same
 * static test account. A finance officer manually confirms receipt once the
 * transfer lands — see applyBankTransferPayment in lib/payments/apply.ts.
 * Replace this with a real virtual-account API when one is integrated.
 */
export const DUMMY_BANK_ACCOUNT = {
  bankName: "CareVault Test Bank",
  accountNumber: "0123456789",
  accountName: "CareVault Health Services",
} as const;
