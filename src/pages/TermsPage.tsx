export default function TermsPage() {
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
        <h1 className="text-4xl font-black tracking-tighter text-white">Terms of Service</h1>
        <p className="mt-2 text-sm text-neutral-500">Effective Date: March 1, 2026 &middot; Last Updated: March 26, 2026</p>

        <div className="mt-10 flex flex-col gap-10 text-neutral-400 leading-relaxed">

          <section>
            <p className="text-sm">
              These Terms of Service (&ldquo;Terms&rdquo;) constitute a legally binding agreement between you (&ldquo;you&rdquo; or &ldquo;User&rdquo;) and
              Rasvia, Inc. (&ldquo;Rasvia,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) governing your access to and use of the Rasvia website,
              mobile applications, APIs, and all related services (collectively, the &ldquo;Platform&rdquo;). By accessing or using the
              Platform, you acknowledge that you have read, understood, and agree to be bound by these Terms. If you do not agree,
              you must not use the Platform.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-bold text-zinc-100">1. Eligibility</h2>
            <p className="text-sm">
              You must be at least 18 years of age, or the age of legal majority in your jurisdiction, to use the Platform.
              By creating an account, you represent and warrant that you meet this requirement and that all information you provide
              is accurate, current, and complete. If you are accessing the Platform on behalf of a business entity, you represent
              that you have the authority to bind that entity to these Terms.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-bold text-zinc-100">2. Account Registration &amp; Security</h2>
            <ul className="list-disc pl-5 text-sm flex flex-col gap-1.5">
              <li>You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.</li>
              <li>You agree to notify Rasvia immediately of any unauthorized use of your account or any other breach of security.</li>
              <li>Rasvia reserves the right to suspend or terminate accounts that violate these Terms or exhibit suspicious activity.</li>
              <li>You may not create multiple accounts for the same individual or share account credentials with unauthorized parties.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-bold text-zinc-100">3. Platform Services</h2>
            <p className="text-sm mb-3">Rasvia provides a technology platform for restaurants and their guests, including but not limited to:</p>
            <ul className="list-disc pl-5 text-sm flex flex-col gap-1.5">
              <li><span className="text-zinc-300 font-medium">Waitlist Management:</span> Digital waitlist tools for walk-in and app-based guests.</li>
              <li><span className="text-zinc-300 font-medium">Group Ordering:</span> Real-time collaborative ordering for dining parties.</li>
              <li><span className="text-zinc-300 font-medium">Table Management:</span> Floor plan and seating management for restaurant operators.</li>
              <li><span className="text-zinc-300 font-medium">Menu &amp; Inventory Controls:</span> Real-time item availability management and 86 controls.</li>
              <li><span className="text-zinc-300 font-medium">Payment Processing:</span> Split payments, checkout, and payout facilitation through third-party processors.</li>
              <li><span className="text-zinc-300 font-medium">Notifications:</span> SMS and push notifications for table readiness, order updates, and operational alerts.</li>
            </ul>
            <p className="mt-3 text-sm">
              Rasvia acts as a technology provider and is not a party to any transaction between restaurants and their guests.
              We do not prepare, handle, or deliver food.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-bold text-zinc-100">4. Restaurant Partner Obligations</h2>
            <p className="text-sm mb-3">If you are a restaurant partner using the Platform, you agree to:</p>
            <ul className="list-disc pl-5 text-sm flex flex-col gap-1.5">
              <li>Provide accurate and up-to-date business information, including menu items, pricing, hours of operation, and tax details.</li>
              <li>Comply with all applicable local, state, and federal laws, including food safety regulations, health codes, and labor laws.</li>
              <li>Accept responsibility for the quality, safety, and legality of all food and services provided to guests.</li>
              <li>Maintain accurate banking and payout information to ensure timely settlement of transactions.</li>
              <li>Not use the Platform to engage in deceptive pricing, misleading advertising, or any other unfair business practices.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-bold text-zinc-100">5. Guest Obligations</h2>
            <p className="text-sm mb-3">If you are a guest using the Platform, you agree to:</p>
            <ul className="list-disc pl-5 text-sm flex flex-col gap-1.5">
              <li>Provide accurate information when joining a waitlist, placing an order, or creating an account.</li>
              <li>Honor your reservation or waitlist position. Repeated no-shows may result in account restrictions.</li>
              <li>Pay for all items ordered through the Platform. Chargebacks or payment disputes filed in bad faith may result in account suspension.</li>
              <li>Use the Platform in a lawful manner and refrain from abusive, harassing, or fraudulent behavior.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-bold text-zinc-100">6. Payments, Fees &amp; Billing</h2>
            <ul className="list-disc pl-5 text-sm flex flex-col gap-1.5">
              <li>Payment processing is facilitated by third-party payment processors (e.g., Stripe). By using payment features, you also agree to the payment processor&rsquo;s terms of service.</li>
              <li>Restaurant partners are subject to platform fees and transaction fees as outlined in their individual Partner Agreement. Fees are deducted from payouts or invoiced separately as agreed.</li>
              <li>All prices displayed on the Platform are set by the restaurant and may be subject to applicable taxes, service charges, and gratuity.</li>
              <li>Rasvia reserves the right to modify its fee structure with 30 days&rsquo; written notice to affected partners.</li>
              <li>Refunds and disputes related to food quality or service are handled directly between the guest and the restaurant. Rasvia may assist in facilitating resolution at its discretion.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-bold text-zinc-100">7. Intellectual Property</h2>
            <ul className="list-disc pl-5 text-sm flex flex-col gap-1.5">
              <li>The Platform, including all software, designs, text, graphics, logos, and trademarks, is the exclusive property of Rasvia, Inc. and is protected by United States and international intellectual property laws.</li>
              <li>You are granted a limited, non-exclusive, non-transferable, revocable license to access and use the Platform for its intended purpose.</li>
              <li>You may not copy, modify, distribute, sell, lease, reverse-engineer, or create derivative works from any portion of the Platform without prior written consent from Rasvia.</li>
              <li>Content you upload to the Platform (e.g., restaurant menus, images) remains yours. You grant Rasvia a non-exclusive, worldwide, royalty-free license to use, display, and distribute such content solely in connection with providing the Platform services.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-bold text-zinc-100">8. Prohibited Conduct</h2>
            <p className="text-sm mb-3">You agree not to:</p>
            <ul className="list-disc pl-5 text-sm flex flex-col gap-1.5">
              <li>Use the Platform for any unlawful purpose or in violation of these Terms.</li>
              <li>Attempt to gain unauthorized access to any part of the Platform, other user accounts, or connected systems.</li>
              <li>Introduce viruses, malware, or other harmful code to the Platform.</li>
              <li>Scrape, data-mine, or use automated tools to extract data from the Platform without authorization.</li>
              <li>Impersonate another person, business, or entity.</li>
              <li>Interfere with or disrupt the integrity, security, or performance of the Platform.</li>
              <li>Circumvent any rate limits, security measures, or access controls implemented by Rasvia.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-bold text-zinc-100">9. Service Availability &amp; Modifications</h2>
            <p className="text-sm">
              Rasvia strives to maintain high uptime but does not guarantee uninterrupted, error-free, or secure access to the Platform.
              We reserve the right to modify, suspend, or discontinue any feature or service at any time, with or without notice.
              Scheduled maintenance windows will be communicated in advance when feasible. Rasvia shall not be liable for any loss or
              damage arising from service interruptions or modifications.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-bold text-zinc-100">10. Disclaimer of Warranties</h2>
            <p className="text-sm uppercase font-semibold text-zinc-300 mb-2">
              THE PLATFORM IS PROVIDED ON AN &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; BASIS.
            </p>
            <p className="text-sm">
              TO THE FULLEST EXTENT PERMITTED BY LAW, RASVIA DISCLAIMS ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING BUT NOT
              LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. RASVIA
              MAKES NO WARRANTY THAT THE PLATFORM WILL MEET YOUR REQUIREMENTS, BE AVAILABLE ON AN UNINTERRUPTED, TIMELY, SECURE,
              OR ERROR-FREE BASIS, OR THAT THE RESULTS OBTAINED FROM USE OF THE PLATFORM WILL BE ACCURATE OR RELIABLE.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-bold text-zinc-100">11. Limitation of Liability</h2>
            <p className="text-sm">
              TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL RASVIA, ITS OFFICERS, DIRECTORS, EMPLOYEES,
              AGENTS, OR AFFILIATES BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING
              BUT NOT LIMITED TO LOSS OF PROFITS, DATA, USE, OR GOODWILL, ARISING OUT OF OR IN CONNECTION WITH YOUR USE OF THE PLATFORM,
              WHETHER BASED ON WARRANTY, CONTRACT, TORT (INCLUDING NEGLIGENCE), OR ANY OTHER LEGAL THEORY, EVEN IF RASVIA HAS BEEN
              ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
            </p>
            <p className="mt-3 text-sm">
              RASVIA&rsquo;S TOTAL AGGREGATE LIABILITY FOR ALL CLAIMS ARISING OUT OF OR RELATING TO THESE TERMS OR THE PLATFORM SHALL NOT
              EXCEED THE GREATER OF (A) THE AMOUNT YOU PAID TO RASVIA IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM, OR (B) ONE HUNDRED
              U.S. DOLLARS ($100.00).
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-bold text-zinc-100">12. Indemnification</h2>
            <p className="text-sm">
              You agree to indemnify, defend, and hold harmless Rasvia, its officers, directors, employees, and agents from and against
              any and all claims, liabilities, damages, losses, costs, and expenses (including reasonable attorneys&rsquo; fees) arising out
              of or in any way connected with your access to or use of the Platform, your violation of these Terms, or your infringement
              of any intellectual property or other rights of any third party.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-bold text-zinc-100">13. Termination</h2>
            <ul className="list-disc pl-5 text-sm flex flex-col gap-1.5">
              <li>You may terminate your account at any time by contacting us at <a href="mailto:support@rasvia.com" className="text-amber-400 hover:text-amber-300 transition-colors">support@rasvia.com</a>.</li>
              <li>Rasvia may suspend or terminate your access to the Platform at any time, with or without cause, and with or without notice.</li>
              <li>Upon termination, your right to use the Platform ceases immediately. Provisions that by their nature should survive termination (including Sections 7, 10, 11, 12, and 14) shall survive.</li>
              <li>Restaurant partners subject to a Partner Agreement will follow the termination provisions specified therein.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-bold text-zinc-100">14. Governing Law &amp; Dispute Resolution</h2>
            <ul className="list-disc pl-5 text-sm flex flex-col gap-1.5">
              <li>These Terms shall be governed by and construed in accordance with the laws of the State of Texas, without regard to its conflict of laws principles.</li>
              <li>Any dispute arising out of or relating to these Terms shall first be attempted to be resolved through good-faith negotiation.</li>
              <li>If negotiation fails, disputes shall be resolved through binding arbitration administered by the American Arbitration Association (AAA) under its Commercial Arbitration Rules, held in Dallas, Texas.</li>
              <li>YOU AND RASVIA AGREE THAT EACH MAY BRING CLAIMS AGAINST THE OTHER ONLY IN YOUR OR ITS INDIVIDUAL CAPACITY, AND NOT AS A PLAINTIFF OR CLASS MEMBER IN ANY PURPORTED CLASS OR REPRESENTATIVE PROCEEDING.</li>
              <li>Notwithstanding the above, either party may seek injunctive or equitable relief in any court of competent jurisdiction to prevent the actual or threatened infringement of intellectual property rights.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-bold text-zinc-100">15. General Provisions</h2>
            <ul className="list-disc pl-5 text-sm flex flex-col gap-1.5">
              <li><span className="text-zinc-300 font-medium">Entire Agreement:</span> These Terms, together with the Privacy Policy and any applicable Partner Agreement, constitute the entire agreement between you and Rasvia regarding the Platform.</li>
              <li><span className="text-zinc-300 font-medium">Severability:</span> If any provision of these Terms is found to be unenforceable, the remaining provisions shall remain in full force and effect.</li>
              <li><span className="text-zinc-300 font-medium">Waiver:</span> Rasvia&rsquo;s failure to enforce any right or provision of these Terms shall not constitute a waiver of such right or provision.</li>
              <li><span className="text-zinc-300 font-medium">Assignment:</span> You may not assign or transfer these Terms without Rasvia&rsquo;s prior written consent. Rasvia may assign its rights and obligations without restriction.</li>
              <li><span className="text-zinc-300 font-medium">Force Majeure:</span> Rasvia shall not be liable for any failure or delay in performance resulting from causes beyond its reasonable control, including natural disasters, war, terrorism, pandemics, strikes, or government actions.</li>
              <li><span className="text-zinc-300 font-medium">Notices:</span> We may provide notices to you via email, in-app notifications, or by posting on the Platform. You may provide notices to us at the contact information below.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-bold text-zinc-100">16. Changes to These Terms</h2>
            <p className="text-sm">
              Rasvia reserves the right to update or modify these Terms at any time. When we make material changes, we will update the
              &ldquo;Last Updated&rdquo; date and may notify you via email or through the Platform. Your continued use of the Platform after
              such changes constitutes your acceptance of the revised Terms. If you do not agree with any changes, you must discontinue
              use of the Platform.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-bold text-zinc-100">17. Contact Us</h2>
            <p className="text-sm">For questions or concerns about these Terms, please contact us:</p>
            <div className="mt-3 rounded-xl border border-white/10 bg-neutral-900/50 px-5 py-4 text-sm">
              <p className="font-semibold text-zinc-200">Rasvia, Inc.</p>
              <p className="mt-1 text-neutral-400">Email: <a href="mailto:legal@rasvia.com" className="text-amber-400 hover:text-amber-300 transition-colors">legal@rasvia.com</a></p>
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