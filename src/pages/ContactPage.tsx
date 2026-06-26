import { useRef, useState } from "react";
import { ArrowRight, Check, Clock, Globe, Layers, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import {
  formatOrderingSetups,
  MOCKUP_TYPE_OPTIONS,
  ORDERING_SETUP_OPTIONS,
  ORDERING_SETUP_OTHER,
  type MockupType,
  type OrderingSetupOption,
} from "@/data/mockup-request";
import { formatUsPhoneDisplay, getPhoneValidationError, isValidUsPhone } from "@/lib/phone-validation";
import { submitMockupRequest } from "@/lib/submit-mockup-request";
import {
  MKT_BODY,
  MKT_DISPLAY,
  MKT_FIELD_ERROR_MESSAGE,
  MKT_FIELD_ERROR_SHELL,
  MKT_FORM_CARD,
  MKT_GROUP_ERROR_SHELL,
  MKT_HEADING,
  MKT_HERO_BADGE,
  MKT_ICON_WELL,
  MKT_INPUT,
  MKT_LABEL,
  MKT_MUTED,
  MKT_PANEL,
  MKT_PANEL_ACCENT,
  MKT_TRUST,
  mktPrimaryCtaClass,
} from "@/lib/marketingUi";
import { cn } from "@/lib/utils";

const RASVIA_SUPPORT_EMAIL = "support@rasvia.com";

const FIELD_INPUT =
  "w-full min-w-0 border-none bg-transparent px-4 py-3.5 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-100 dark:placeholder:text-zinc-500";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MOCKUP_TYPE_ICONS = {
  website: Globe,
  app: Smartphone,
  both: Layers,
} as const;

function MockupField({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string | null;
  children: React.ReactNode;
}) {
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <label htmlFor={id} className={cn("block leading-none", MKT_LABEL)}>
        {label}
      </label>
      {children}
      {error ? (
        <p id={errorId} role="alert" className={MKT_FIELD_ERROR_MESSAGE}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

function FormSection({
  title,
  description,
  error,
  errorId,
  errorPosition = "above",
  sectionRef,
  children,
}: {
  title: string;
  description?: string;
  error?: string | null;
  errorId?: string;
  errorPosition?: "above" | "below";
  sectionRef?: React.RefObject<HTMLElement | null>;
  children: React.ReactNode;
}) {
  const errorNode = error ? (
    <p id={errorId} role="alert" className={MKT_FIELD_ERROR_MESSAGE}>
      {error}
    </p>
  ) : null;

  return (
    <section ref={sectionRef} className="flex flex-col gap-4">
      <div className="space-y-1.5">
        <h2 className={cn("text-sm font-semibold leading-none", MKT_HEADING)}>{title}</h2>
        {description ? <p className={cn("text-sm leading-snug", MKT_BODY)}>{description}</p> : null}
      </div>
      {errorPosition === "above" ? errorNode : null}
      {children}
      {errorPosition === "below" ? errorNode : null}
    </section>
  );
}

function OrderingSetupCheckboxes({
  selected,
  onToggle,
  showError,
}: {
  selected: OrderingSetupOption[];
  onToggle: (option: OrderingSetupOption) => void;
  showError?: boolean;
}) {
  return (
    <div
      className={cn("flex flex-col gap-2", showError && MKT_GROUP_ERROR_SHELL)}
      role="group"
      aria-label="Current ordering setup"
    >
      {ORDERING_SETUP_OPTIONS.map((option) => {
        const checked = selected.includes(option);
        return (
          <label
            key={option}
            className={cn(
              "flex min-h-[44px] cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3 transition-[border-color,background-color] duration-150",
              checked
                ? "border-amber-500 bg-[var(--mkt-accent-bg-strong)]"
                : cn(
                    "border-[var(--mkt-border)] bg-[var(--mkt-surface-raised)] hover:border-[var(--mkt-accent-border)] hover:bg-[var(--mkt-accent-bg)]",
                    showError && "border-amber-600/70",
                  ),
            )}
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={() => onToggle(option)}
              className="sr-only"
            />
            <span
              className={cn(
                "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors",
                checked
                  ? "border-amber-600 bg-amber-600 text-white"
                  : "border-[var(--mkt-border)] bg-[var(--mkt-accent-bg)]",
              )}
              aria-hidden
            >
              {checked ? <Check size={12} strokeWidth={3} /> : null}
            </span>
            <span className={cn("text-sm leading-snug", checked ? "font-semibold text-[var(--mkt-ink)]" : MKT_BODY)}>
              {option}
            </span>
          </label>
        );
      })}
    </div>
  );
}

export default function ContactPage() {
  const restaurantFieldRef = useRef<HTMLDivElement>(null);
  const mockupSectionRef = useRef<HTMLElement>(null);
  const [restaurantName, setRestaurantName] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [orderingSetups, setOrderingSetups] = useState<OrderingSetupOption[]>([]);
  const [orderingOther, setOrderingOther] = useState("");
  const [mockupType, setMockupType] = useState<MockupType | "">("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneBlurred, setPhoneBlurred] = useState(false);
  const [showPhoneValidation, setShowPhoneValidation] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const shouldShowPhoneError = phoneBlurred || showPhoneValidation || submitAttempted;
  const phoneError = getPhoneValidationError(phone, shouldShowPhoneError);

  const mockupTypeError =
    submitAttempted && !mockupType ? "Choose website, app, or both so we can tailor your preview." : null;
  const restaurantNameError =
    submitAttempted && !restaurantName.trim() ? "Add your restaurant name." : null;
  const cuisineError = submitAttempted && !cuisine.trim() ? "Tell us your cuisine type." : null;
  const orderingError =
    submitAttempted && orderingSetups.length === 0
      ? "Select at least one way guests order from you today."
      : null;
  const orderingOtherError =
    submitAttempted && orderingSetups.includes(ORDERING_SETUP_OTHER) && !orderingOther.trim()
      ? "Tell us how guests order when you choose Other."
      : null;
  const contactError =
    submitAttempted && !email.trim() && !phone.trim()
      ? "Add an email or phone number so we can reach you."
      : null;
  const emailError =
    submitAttempted && email.trim() && !EMAIL_RE.test(email.trim())
      ? "Enter a valid email address."
      : null;

  function toggleOrderingSetup(option: OrderingSetupOption) {
    setOrderingSetups((prev) =>
      prev.includes(option) ? prev.filter((item) => item !== option) : [...prev, option],
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitAttempted(true);
    setShowPhoneValidation(true);
    setPhoneBlurred(true);

    const trimmedName = restaurantName.trim();
    const trimmedCuisine = cuisine.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();

    const hasNameError = !trimmedName;
    const hasCuisineError = !trimmedCuisine;
    const hasMockupError = !mockupType;
    const hasOrderingError = orderingSetups.length === 0;
    const hasOrderingOtherError =
      orderingSetups.includes(ORDERING_SETUP_OTHER) && !orderingOther.trim();
    const hasContactError = !trimmedEmail && !trimmedPhone;
    const hasEmailError = Boolean(trimmedEmail && !EMAIL_RE.test(trimmedEmail));
    const hasPhoneError = Boolean(trimmedPhone && !isValidUsPhone(trimmedPhone));

    if (
      hasNameError ||
      hasCuisineError ||
      hasMockupError ||
      hasOrderingError ||
      hasOrderingOtherError ||
      hasContactError ||
      hasEmailError ||
      hasPhoneError
    ) {
      const scrollOpts: ScrollIntoViewOptions = { behavior: "smooth", block: "center" };
      if (hasNameError) restaurantFieldRef.current?.scrollIntoView(scrollOpts);
      else if (hasMockupError) mockupSectionRef.current?.scrollIntoView(scrollOpts);
      return;
    }

    const orderingLabels = formatOrderingSetups(orderingSetups, orderingOther);
    const phoneForSubmit = trimmedPhone ? formatUsPhoneDisplay(trimmedPhone) : undefined;

    setLoading(true);
    try {
      await submitMockupRequest({
        restaurantName: trimmedName,
        cuisine: trimmedCuisine,
        orderingSetups: orderingLabels,
        mockupType,
        email: trimmedEmail || undefined,
        phone: phoneForSubmit,
      });
      setSubmitted(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <MarketingLayout>
      <div className="mx-auto max-w-xl px-6 py-12 sm:py-16">
        <div className="flex flex-col items-start gap-3">
          <span className={MKT_HERO_BADGE}>
            <Clock size={14} aria-hidden />
            We respond within an hour
          </span>
          <h1 className={cn("text-4xl text-balance sm:text-[2.5rem]", MKT_DISPLAY, MKT_HEADING)}>
            See your restaurant in a free mockup
          </h1>
          <p className={cn("max-w-lg text-pretty text-lg leading-relaxed", MKT_BODY)}>
            Tell us a bit about your place. We&apos;ll build a branded preview with your name and menu
            style — no commitment required.
          </p>
        </div>

        {submitted ? (
          <div className={cn("mt-10 px-6 py-8 sm:px-8", MKT_FORM_CARD)}>
            <div className="flex flex-col items-center gap-4 text-center">
              <span
                className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                aria-hidden
              >
                <Check size={24} />
              </span>
              <div>
                <h2 className={cn("text-xl font-bold", MKT_HEADING)}>Request sent</h2>
                <p className={cn("mt-2 text-sm leading-relaxed", MKT_BODY)}>
                  Thanks — we got your details and will reach out within an hour.
                </p>
              </div>
              <a href="/" className={cn("text-sm font-medium hover:text-zinc-900 dark:hover:text-white", MKT_MUTED)}>
                ← Back to home
              </a>
            </div>
          </div>
        ) : (
          <form noValidate onSubmit={handleSubmit} className={cn("mt-10", MKT_FORM_CARD)}>
            <div className="flex flex-col gap-8 px-6 py-8 sm:px-8">
              <div ref={restaurantFieldRef}>
                <MockupField id="mockup-restaurant" label="Restaurant name" error={restaurantNameError}>
                  <div className={cn(restaurantNameError ? MKT_FIELD_ERROR_SHELL : MKT_INPUT)}>
                    <input
                      id="mockup-restaurant"
                      type="text"
                      autoComplete="organization"
                      className={FIELD_INPUT}
                      placeholder="e.g. Harbor Bistro"
                      value={restaurantName}
                      aria-invalid={restaurantNameError ? true : undefined}
                      aria-describedby={restaurantNameError ? "mockup-restaurant-error" : undefined}
                      onChange={(e) => setRestaurantName(e.target.value)}
                    />
                  </div>
                </MockupField>
              </div>

              <FormSection
                sectionRef={mockupSectionRef}
                title="What mockup do you want?"
                description="Pick one — we'll tailor the preview to match."
                error={mockupTypeError}
                errorId="mockup-type-error"
                errorPosition="below"
              >
                <div
                  className={cn(
                    "grid grid-cols-1 gap-3 sm:grid-cols-3",
                    mockupTypeError && MKT_GROUP_ERROR_SHELL,
                  )}
                  role="radiogroup"
                  aria-label="Mockup type"
                  aria-invalid={mockupTypeError ? true : undefined}
                  aria-describedby={mockupTypeError ? "mockup-type-error" : undefined}
                >
                  {MOCKUP_TYPE_OPTIONS.map((option) => {
                    const selected = mockupType === option.value;
                    const Icon = MOCKUP_TYPE_ICONS[option.value];
                    return (
                      <label
                        key={option.value}
                        className={cn(
                          "group relative flex min-h-[128px] cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 px-3 py-4 text-center transition-[border-color,background-color,transform] duration-200 ease-[var(--mkt-ease-out)] motion-safe:hover:-translate-y-0.5",
                          selected
                            ? cn(MKT_PANEL_ACCENT, "border-amber-500 ring-2 ring-amber-500/35")
                            : cn(
                                "border-[var(--mkt-border)] bg-[var(--mkt-surface-raised)] hover:border-[var(--mkt-accent-border)] hover:bg-[var(--mkt-accent-bg-strong)]",
                                mockupTypeError && "border-amber-600/70 bg-[var(--mkt-accent-bg)]",
                              ),
                        )}
                      >
                        <input
                          type="radio"
                          name="mockup-type"
                          value={option.value}
                          checked={selected}
                          onChange={() => setMockupType(option.value)}
                          className="sr-only"
                        />
                        {selected ? (
                          <span
                            className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-amber-600 text-white"
                            aria-hidden
                          >
                            <Check size={12} strokeWidth={3} />
                          </span>
                        ) : null}
                        <span
                          className={cn(
                            "flex h-11 w-11 items-center justify-center rounded-xl transition-colors",
                            selected ? "bg-amber-600 text-white" : MKT_ICON_WELL,
                          )}
                        >
                          <Icon size={20} strokeWidth={selected ? 2.25 : 2} aria-hidden />
                        </span>
                        <span className="flex flex-col gap-0.5">
                          <span className={cn("text-sm font-bold leading-tight", MKT_HEADING)}>{option.label}</span>
                          <span className={cn("text-xs leading-snug", MKT_BODY)}>{option.description}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </FormSection>

              <div className="flex flex-col gap-4">
                <MockupField id="mockup-cuisine" label="Cuisine" error={cuisineError}>
                  <div className={cn(cuisineError ? MKT_FIELD_ERROR_SHELL : MKT_INPUT)}>
                    <input
                      id="mockup-cuisine"
                      type="text"
                      className={FIELD_INPUT}
                      placeholder="e.g. Italian, Mexican, American"
                      value={cuisine}
                      aria-invalid={cuisineError ? true : undefined}
                      aria-describedby={cuisineError ? "mockup-cuisine-error" : undefined}
                      onChange={(e) => setCuisine(e.target.value)}
                    />
                  </div>
                </MockupField>

                <FormSection
                  title="Current ordering setup"
                  description="Select all that apply."
                  error={orderingError}
                  errorId="ordering-setup-error"
                >
                  <OrderingSetupCheckboxes
                    selected={orderingSetups}
                    onToggle={toggleOrderingSetup}
                    showError={Boolean(orderingError)}
                  />
                </FormSection>

                {orderingSetups.includes(ORDERING_SETUP_OTHER) ? (
                  <MockupField id="mockup-ordering-other" label="Describe your setup" error={orderingOtherError}>
                    <div className={cn(orderingOtherError ? MKT_FIELD_ERROR_SHELL : MKT_INPUT)}>
                      <input
                        id="mockup-ordering-other"
                        type="text"
                        className={FIELD_INPUT}
                        placeholder="How do guests order from you today?"
                        value={orderingOther}
                        aria-invalid={orderingOtherError ? true : undefined}
                        aria-describedby={orderingOtherError ? "mockup-ordering-other-error" : undefined}
                        onChange={(e) => setOrderingOther(e.target.value)}
                      />
                    </div>
                  </MockupField>
                ) : null}
              </div>

              <FormSection
                title="How should we reach you?"
                description="Email or phone — at least one required."
                error={contactError}
                errorId="contact-error"
              >
                <div
                  className={cn(
                    "grid grid-cols-1 gap-4 sm:grid-cols-2",
                    contactError && MKT_GROUP_ERROR_SHELL,
                  )}
                >
                  <MockupField id="mockup-email" label="Email" error={emailError}>
                    <div className={cn(emailError ? MKT_FIELD_ERROR_SHELL : MKT_INPUT)}>
                      <input
                        id="mockup-email"
                        type="email"
                        autoComplete="email"
                        className={FIELD_INPUT}
                        placeholder="you@restaurant.com"
                        value={email}
                        aria-invalid={emailError ? true : undefined}
                        aria-describedby={emailError ? "mockup-email-error" : undefined}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                  </MockupField>

                  <MockupField id="mockup-phone" label="Phone number" error={phoneError}>
                    <div className={cn(phoneError ? MKT_FIELD_ERROR_SHELL : MKT_INPUT)}>
                      <input
                        id="mockup-phone"
                        type="tel"
                        autoComplete="tel"
                        inputMode="tel"
                        className={FIELD_INPUT}
                        placeholder="(555) 123-4567"
                        value={phone}
                        aria-invalid={phoneError ? true : undefined}
                        aria-describedby={phoneError ? "mockup-phone-error" : undefined}
                        onChange={(e) => setPhone(e.target.value)}
                        onBlur={(e) => {
                          const value = e.currentTarget.value;
                          setPhone(value);
                          setPhoneBlurred(true);
                          const trimmed = value.trim();
                          if (trimmed && isValidUsPhone(trimmed)) {
                            setPhone(formatUsPhoneDisplay(trimmed));
                          }
                        }}
                      />
                    </div>
                  </MockupField>
                </div>
              </FormSection>

              <div className="flex flex-col gap-4 border-t border-[var(--mkt-border)] pt-6">
                <p className={cn("flex items-center gap-2 text-xs font-medium", MKT_BODY)}>
                  <Check size={14} className={cn("shrink-0", MKT_TRUST)} aria-hidden />
                  No spam. We&apos;ll reach out within an hour to schedule your mockup.
                </p>

                <button
                  type="submit"
                  disabled={loading}
                  className={cn("w-full disabled:cursor-not-allowed disabled:opacity-70", mktPrimaryCtaClass())}
                >
                  {loading ? "Sending…" : "Request my free mockup"}
                  {!loading ? (
                    <ArrowRight
                      size={16}
                      className="transition-transform duration-200 ease-[var(--mkt-ease-out)] motion-safe:group-hover:translate-x-0.5"
                    />
                  ) : null}
                </button>
              </div>
            </div>
          </form>
        )}

        <div className="mt-10 flex flex-col gap-4">
          <p className={cn("text-sm font-medium", MKT_HEADING)}>Need something else?</p>
          <div className={cn("px-6 py-5", MKT_PANEL)}>
            <p className={cn("text-sm", MKT_BODY)}>
              For partner support or general questions, email{" "}
              <a
                href={`mailto:${RASVIA_SUPPORT_EMAIL}`}
                className="font-semibold text-amber-700 transition-colors hover:text-amber-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:text-amber-400 dark:hover:text-amber-300"
              >
                {RASVIA_SUPPORT_EMAIL}
              </a>{" "}
              or call{" "}
              <a
                href="tel:4698917169"
                className={cn(
                  "font-semibold transition-colors hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:hover:text-white",
                  MKT_HEADING,
                )}
              >
                469-891-7169
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </MarketingLayout>
  );
}
