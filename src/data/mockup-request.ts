export const MOCKUP_TYPE_OPTIONS = [
  { value: "website", label: "Website", description: "Branded web storefront" },
  { value: "app", label: "App", description: "Custom iOS & Android" },
  { value: "both", label: "Both", description: "Website and app" },
] as const;

export type MockupType = (typeof MOCKUP_TYPE_OPTIONS)[number]["value"];

export const MOCKUP_TYPE_LABELS: Record<MockupType, string> = {
  website: "Website mockup",
  app: "App mockup",
  both: "Website + app mockup",
};

export const ORDERING_SETUP_OPTIONS = [
  "Third-party apps (DoorDash, Uber Eats, Grubhub)",
  "Own website or online ordering",
  "POS online ordering (Toast, Square, Clover, etc.)",
  "Phone or in-person only",
  "No online ordering yet",
  "Other",
] as const;

export type OrderingSetupOption = (typeof ORDERING_SETUP_OPTIONS)[number];

export const ORDERING_SETUP_OTHER = "Other" as const;

export function formatOrderingSetups(selected: string[], otherText: string): string[] {
  const trimmedOther = otherText.trim();
  return selected.map((item) =>
    item === ORDERING_SETUP_OTHER && trimmedOther ? `Other — ${trimmedOther}` : item,
  );
}
