import { supabase } from "@/lib/supabase";
import { extractFunctionError } from "@/lib/order-refund";
import type { MockupType } from "@/data/mockup-request";

export type MockupRequestPayload = {
  restaurantName: string;
  cuisine: string;
  orderingSetups: string[];
  mockupType: MockupType;
  email?: string;
  phone?: string;
};

const ERROR_MESSAGES: Record<string, string> = {
  missing_fields: "Please fill in all required fields.",
  missing_contact: "Please enter an email or phone number so we can reach you.",
  invalid_email: "Please enter a valid email address.",
  invalid_phone: "Please enter a valid 10-digit US phone number.",
  invalid_mockup_type: "Please choose website, app, or both.",
  invalid_ordering_setup: "Please choose at least one valid ordering option.",
  rate_limited: "Too many requests. Please wait a minute and try again.",
  email_send_failed: "We couldn't send your request right now. Please try again or call us.",
  server_misconfigured: "This form is temporarily unavailable. Please email support@rasvia.com.",
  invalid_json: "Something went wrong. Please try again.",
};

function messageForCode(code: string | undefined, fallback: string): string {
  if (!code) return fallback;
  return ERROR_MESSAGES[code] ?? fallback;
}

export async function submitMockupRequest(payload: MockupRequestPayload): Promise<void> {
  const { data, error } = await supabase.functions.invoke("submit-mockup-request", {
    body: {
      restaurant_name: payload.restaurantName.trim(),
      cuisine: payload.cuisine.trim(),
      ordering_setups: payload.orderingSetups,
      mockup_type: payload.mockupType,
      email: payload.email?.trim() ?? "",
      phone: payload.phone?.trim() ?? "",
      company_website: "",
    },
  });

  if (error) {
    const raw = await extractFunctionError(error);
    let code: string | undefined;
    try {
      const parsed = JSON.parse(raw) as { error?: string };
      if (parsed?.error) code = String(parsed.error);
    } catch {
      if (raw in ERROR_MESSAGES) code = raw;
    }
    throw new Error(messageForCode(code, raw));
  }

  if (data && typeof data === "object" && "error" in data && data.error) {
    throw new Error(messageForCode(String((data as { error: string }).error), "Request failed."));
  }
}
