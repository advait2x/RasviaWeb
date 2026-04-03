export default function PrivacyPage() {
  return (
    <div className="w-full min-h-screen overflow-x-hidden bg-[#0A0A0A] text-zinc-100">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <a
          href="/"
          className="mb-10 inline-flex items-center gap-2 text-sm text-neutral-500 transition-colors hover:text-amber-400"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          Back to Home
        </a>

        <img src="/rasvia-logo.png" alt="Rasvia" className="mb-4 h-6 w-auto" />
        <h1 className="text-4xl font-black tracking-tighter text-white">Privacy Policy</h1>
        <p className="mt-2 text-sm text-neutral-500">Effective Date: March 1, 2026 &middot; Last Updated: March 26, 2026</p>

        <div className="mt-10 flex flex-col gap-10 text-neutral-400 leading-relaxed">

          <section>
            <p className="text-sm">
              Rasvia, Inc. (&ldquo;Rasvia,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) is committed to protecting and respecting your privacy.
              This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our
              website, mobile applications, and related services (collectively, the &ldquo;Platform&rdquo;). By accessing or using
              the Platform, you agree to the terms of this Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-bold text-zinc-100">1. Information We Collect</h2>

            <h3 className="mb-1.5 text-sm font-semibold text-zinc-300">1.1 Information You Provide Directly</h3>
            <ul className="mb-4 list-disc pl-5 text-sm flex flex-col gap-1.5">
              <li><span className="text-zinc-300 font-medium">Account Information:</span> Name, email address, phone number, and password when you create a Rasvia account.</li>
              <li><span className="text-zinc-300 font-medium">Restaurant Partner Data:</span> Business name, address, tax identification numbers, banking/payout information, menu data, and staff credentials provided during onboarding.</li>
              <li><span className="text-zinc-300 font-medium">Guest Data:</span> Name, phone number, and party size submitted via our waitlist kiosk, mobile app, or web interface.</li>
              <li><span className="text-zinc-300 font-medium">Payment Information:</span> Credit/debit card numbers and billing details processed through our third-party payment processors. Rasvia does not store full card numbers on its servers.</li>
              <li><span className="text-zinc-300 font-medium">Communications:</span> Messages, feedback, and support requests you send to us.</li>
            </ul>

            <h3 className="mb-1.5 text-sm font-semibold text-zinc-300">1.2 Information Collected Automatically</h3>
            <ul className="mb-4 list-disc pl-5 text-sm flex flex-col gap-1.5">
              <li><span className="text-zinc-300 font-medium">Device &amp; Usage Data:</span> IP address, browser type, operating system, device identifiers, pages visited, features used, timestamps, and referring URLs.</li>
              <li><span className="text-zinc-300 font-medium">Location Data:</span> Approximate location derived from IP address. Precise GPS data is collected only with your explicit consent when using location-based features.</li>
              <li><span className="text-zinc-300 font-medium">Cookies &amp; Tracking Technologies:</span> We use cookies, web beacons, and similar technologies to maintain sessions, remember preferences, and analyze usage patterns.</li>
            </ul>

            <h3 className="mb-1.5 text-sm font-semibold text-zinc-300">1.3 Information from Third Parties</h3>
            <p className="text-sm">
              We may receive information from third-party services you connect to your Rasvia account (e.g., Stripe for payments,
              Google for authentication), as well as publicly available business data for restaurant verification.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-bold text-zinc-100">2. How We Use Your Information</h2>
            <p className="text-sm mb-3">We use the information we collect for the following purposes:</p>
            <ul className="list-disc pl-5 text-sm flex flex-col gap-1.5">
              <li><span className="text-zinc-300 font-medium">Service Delivery:</span> To operate and maintain the Platform, including waitlist management, group ordering, table management, and payment processing.</li>
              <li><span className="text-zinc-300 font-medium">Communications:</span> To send transactional notifications (e.g., &ldquo;Your table is ready&rdquo; SMS alerts), account updates, and customer support responses.</li>
              <li><span className="text-zinc-300 font-medium">Improvement &amp; Analytics:</span> To analyze usage trends, diagnose technical issues, and improve the performance, reliability, and user experience of the Platform.</li>
              <li><span className="text-zinc-300 font-medium">Security:</span> To detect, investigate, and prevent fraud, unauthorized access, and other illegal activities.</li>
              <li><span className="text-zinc-300 font-medium">Legal Compliance:</span> To comply with applicable laws, regulations, legal processes, or enforceable governmental requests.</li>
              <li><span className="text-zinc-300 font-medium">Marketing:</span> With your consent, to send promotional materials about new features, partner programs, or service updates. You may opt out at any time.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-bold text-zinc-100">3. How We Share Your Information</h2>
            <p className="text-sm mb-3">We do not sell your personal information. We may share your data in the following circumstances:</p>
            <ul className="list-disc pl-5 text-sm flex flex-col gap-1.5">
              <li><span className="text-zinc-300 font-medium">With Restaurant Partners:</span> Guest names, party sizes, and order details are shared with the restaurant you are interacting with to fulfill your service request.</li>
              <li><span className="text-zinc-300 font-medium">Service Providers:</span> We engage trusted third-party vendors (e.g., Supabase for infrastructure, Stripe for payments, Twilio for SMS) who process data on our behalf under strict contractual obligations.</li>
              <li><span className="text-zinc-300 font-medium">Legal Requirements:</span> We may disclose information if required by law, subpoena, court order, or governmental regulation, or if we believe disclosure is necessary to protect the rights, property, or safety of Rasvia, our users, or the public.</li>
              <li><span className="text-zinc-300 font-medium">Business Transfers:</span> In connection with a merger, acquisition, reorganization, or sale of assets, your information may be transferred as part of the transaction, subject to standard confidentiality agreements.</li>
              <li><span className="text-zinc-300 font-medium">With Your Consent:</span> We may share your information for other purposes if you have given us explicit consent to do so.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-bold text-zinc-100">4. Data Retention</h2>
            <p className="text-sm">
              We retain your personal information for as long as your account is active or as needed to provide services.
              We may also retain and use your information as necessary to comply with our legal obligations, resolve disputes,
              and enforce our agreements. When data is no longer required, it is securely deleted or anonymized in accordance
              with our data retention schedules. Restaurant partners may request bulk data deletion upon termination of their
              partner agreement.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-bold text-zinc-100">5. Data Security</h2>
            <p className="text-sm">
              We implement industry-standard technical and organizational measures to protect your information, including:
            </p>
            <ul className="mt-2 list-disc pl-5 text-sm flex flex-col gap-1.5">
              <li>Encryption of data in transit (TLS 1.2+) and at rest (AES-256).</li>
              <li>Infrastructure hosted on SOC 2 Type II compliant providers.</li>
              <li>Role-based access controls and audit logging for all administrative operations.</li>
              <li>Regular vulnerability assessments and penetration testing.</li>
            </ul>
            <p className="mt-3 text-sm">
              While we strive to protect your personal information, no method of transmission over the Internet or electronic
              storage is 100% secure. We cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-bold text-zinc-100">6. Your Rights &amp; Choices</h2>
            <p className="text-sm mb-3">Depending on your jurisdiction, you may have the following rights:</p>
            <ul className="list-disc pl-5 text-sm flex flex-col gap-1.5">
              <li><span className="text-zinc-300 font-medium">Access &amp; Portability:</span> Request a copy of the personal data we hold about you in a structured, machine-readable format.</li>
              <li><span className="text-zinc-300 font-medium">Correction:</span> Request correction of inaccurate or incomplete personal data.</li>
              <li><span className="text-zinc-300 font-medium">Deletion:</span> Request deletion of your personal data, subject to legal retention requirements.</li>
              <li><span className="text-zinc-300 font-medium">Opt-Out:</span> Opt out of marketing communications at any time by clicking &ldquo;unsubscribe&rdquo; in any email or contacting us directly.</li>
              <li><span className="text-zinc-300 font-medium">Restrict Processing:</span> Request that we limit the processing of your data in certain circumstances.</li>
              <li><span className="text-zinc-300 font-medium">Do Not Sell (CCPA):</span> California residents may opt out of the &ldquo;sale&rdquo; of personal information. Rasvia does not sell personal information as defined under CCPA.</li>
            </ul>
            <p className="mt-3 text-sm">
              To exercise any of these rights, contact us at{" "}
              <a href="mailto:support@rasvia.com" className="text-amber-400 hover:text-amber-300 transition-colors">support@rasvia.com</a>.
              We will respond within 30 days, or as required by applicable law.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-bold text-zinc-100">7. Cookies &amp; Tracking Technologies</h2>
            <p className="text-sm mb-3">We use the following categories of cookies:</p>
            <ul className="list-disc pl-5 text-sm flex flex-col gap-1.5">
              <li><span className="text-zinc-300 font-medium">Strictly Necessary:</span> Required for Platform functionality (e.g., session authentication).</li>
              <li><span className="text-zinc-300 font-medium">Analytics:</span> Help us understand usage patterns and improve the Platform (e.g., page views, feature adoption).</li>
              <li><span className="text-zinc-300 font-medium">Functional:</span> Remember your preferences and settings.</li>
            </ul>
            <p className="mt-3 text-sm">
              You can manage cookie preferences through your browser settings. Disabling certain cookies may limit Platform functionality.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-bold text-zinc-100">8. Children&rsquo;s Privacy</h2>
            <p className="text-sm">
              The Platform is not directed to children under the age of 13, and we do not knowingly collect personal information
              from children under 13. If we learn that we have collected personal data from a child under 13, we will take steps
              to delete such information promptly. If you believe a child has provided us with personal data, please contact us
              at <a href="mailto:support@rasvia.com" className="text-amber-400 hover:text-amber-300 transition-colors">support@rasvia.com</a>.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-bold text-zinc-100">9. International Data Transfers</h2>
            <p className="text-sm">
              Rasvia is based in the United States. If you access the Platform from outside the United States, your information may
              be transferred to, stored, and processed in the United States or other countries where our service providers operate.
              We ensure appropriate safeguards are in place for such transfers in compliance with applicable data protection laws.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-bold text-zinc-100">10. Third-Party Links</h2>
            <p className="text-sm">
              The Platform may contain links to third-party websites or services that are not operated by Rasvia. We are not responsible
              for the privacy practices or content of these third-party sites. We encourage you to review the privacy policies of any
              third-party services you access through the Platform.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-bold text-zinc-100">11. Changes to This Policy</h2>
            <p className="text-sm">
              We may update this Privacy Policy from time to time. When we make material changes, we will notify you by posting
              the updated policy on this page and updating the &ldquo;Last Updated&rdquo; date above. For significant changes, we may also
              send you an email notification. Your continued use of the Platform after such changes constitutes acceptance of the
              revised policy.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-bold text-zinc-100">12. Contact Us</h2>
            <p className="text-sm">
              If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:
            </p>
            <div className="mt-3 rounded-xl border border-white/10 bg-neutral-900/50 px-5 py-4 text-sm">
              <p className="font-semibold text-zinc-200">Rasvia, Inc.</p>
              <p className="text-neutral-400">Phone: <a href="tel:4698917169" className="hover:text-white transition-colors">469-891-7169</a></p>
              <p className="text-neutral-400">General Support: <a href="mailto:support@rasvia.com" className="text-amber-400 hover:text-amber-300 transition-colors">support@rasvia.com</a></p>
            </div>
          </section>

        </div>

        <div className="mt-16 border-t border-white/[0.06] pt-8">
          <p className="text-sm text-neutral-600">&copy; {new Date().getFullYear()} Rasvia, Inc. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}