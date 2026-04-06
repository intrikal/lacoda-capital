"use client"

import * as React from "react"
import Link from "next/link"
import { useSpring, animated, config } from "@react-spring/web"
import { ArrowLeft } from "lucide-react"
import { Logo } from "@/components/marketing/logo"
import { Badge } from "@/components/ui/badge"
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion"

const sections = [
  { id: "acceptance", title: "1. Acceptance of Terms" },
  { id: "services", title: "2. Description of Services" },
  { id: "accounts", title: "3. Account Registration and Security" },
  { id: "payments", title: "4. Fees and Payment Terms" },
  { id: "acceptable-use", title: "5. Acceptable Use Policy" },
  { id: "intellectual-property", title: "6. Intellectual Property Rights" },
  { id: "data-ownership", title: "7. Data Ownership and License" },
  { id: "confidentiality", title: "8. Confidentiality" },
  { id: "warranties", title: "9. Disclaimers and Warranties" },
  { id: "liability", title: "10. Limitation of Liability" },
  { id: "indemnification", title: "11. Indemnification" },
  { id: "termination", title: "12. Termination" },
  { id: "governing-law", title: "13. Governing Law and Dispute Resolution" },
  { id: "changes", title: "14. Changes to Terms" },
  { id: "contact", title: "15. Contact Information" },
]

export function TermsPage() {
  const reducedMotion = useReducedMotion()

  const heroSpring = useSpring({
    from: { opacity: 0, transform: "translateY(20px)" },
    to: { opacity: 1, transform: "translateY(0px)" },
    config: config.gentle,
    immediate: reducedMotion,
  })

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Simple Header */}
      <div className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 group">
              <Logo size="sm" showText={false} />
              <span className="text-zinc-100 font-semibold">Lacoda Capital</span>
            </Link>
            <Link
              href="/"
              className="flex items-center gap-2 text-sm text-zinc-400 hover:text-tiffany-500 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Link>
          </div>
        </div>
      </div>

      <div className="py-12 lg:py-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-[280px_1fr] lg:gap-12">
            {/* Table of Contents - Sticky Sidebar */}
            <aside className="hidden lg:block">
              <div className="sticky top-24">
                <h2 className="text-sm font-semibold text-zinc-100 mb-4">Table of Contents</h2>
                <nav className="space-y-1">
                  {sections.map((section) => (
                    <a
                      key={section.id}
                      href={`#${section.id}`}
                      className="block text-sm text-zinc-400 hover:text-tiffany-500 py-1.5 transition-colors border-l-2 border-transparent hover:border-tiffany-500 pl-3 -ml-px"
                    >
                      {section.title}
                    </a>
                  ))}
                </nav>
              </div>
            </aside>

            {/* Main Content */}
            <main className="bg-zinc-900 rounded-xl border border-zinc-800 p-8 lg:p-12">
              <animated.div style={heroSpring}>
                <Badge variant="secondary" className="mb-6">
                  Legal
                </Badge>
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-100">
                  Terms of Service
                </h1>
                <p className="mt-4 text-zinc-400">
                  Last updated: February 4, 2026
                </p>
                <p className="mt-2 text-sm text-zinc-500">
                  Effective date: February 1, 2024
                </p>

                {/* Mobile Table of Contents */}
                <div className="lg:hidden mt-8 p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
                  <h2 className="text-sm font-semibold text-zinc-100 mb-3">Table of Contents</h2>
                  <nav className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                    {sections.map((section) => (
                      <a
                        key={section.id}
                        href={`#${section.id}`}
                        className="text-sm text-zinc-400 hover:text-tiffany-500 py-1 transition-colors"
                      >
                        {section.title}
                      </a>
                    ))}
                  </nav>
                </div>

                <div className="mt-12 space-y-10">
                  {/* Section 1 */}
                  <section id="acceptance" className="scroll-mt-24">
                    <h2 className="text-xl font-semibold text-zinc-100 mb-4">
                      1. Acceptance of Terms
                    </h2>
                    <div className="space-y-4 text-zinc-300 leading-relaxed">
                      <p>
                        Welcome to Lacoda Capital Holdings (&quot;Lacoda,&quot; &quot;we,&quot; &quot;our,&quot; or &quot;us&quot;). By accessing or using our platform, website, applications, APIs, or any related services (collectively, the &quot;Service&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;).
                      </p>
                      <p>
                        If you are using the Service on behalf of an organization, you represent and warrant that you have the authority to bind that organization to these Terms, and &quot;you&quot; refers to both you individually and the organization.
                      </p>
                      <p>
                        If you do not agree to these Terms, you must not access or use the Service. We recommend that you print or save a copy of these Terms for your records.
                      </p>
                    </div>
                  </section>

                  {/* Section 2 */}
                  <section id="services" className="scroll-mt-24">
                    <h2 className="text-xl font-semibold text-zinc-100 mb-4">
                      2. Description of Services
                    </h2>
                    <div className="space-y-4 text-zinc-300 leading-relaxed">
                      <p>
                        Lacoda provides a comprehensive software platform designed for enterprises, asset managers, and holding companies. Our Service includes:
                      </p>
                      <ul className="list-disc pl-6 text-zinc-400 space-y-2">
                        <li>Portfolio management and asset tracking across multiple asset classes</li>
                        <li>Secure document storage and organization (the &quot;Vault&quot;)</li>
                        <li>Financial reporting, analytics, and performance measurement</li>
                        <li>Entity structure management and organizational charts</li>
                        <li>Stakeholder communication and collaboration tools</li>
                        <li>Integration with third-party financial data providers and custodians</li>
                        <li>AI-powered insights and automated data extraction</li>
                      </ul>
                      <p>
                        The specific features available to you depend on your subscription plan. We may modify, suspend, or discontinue any aspect of the Service at any time, with reasonable notice for material changes.
                      </p>
                    </div>
                  </section>

                  {/* Section 3 */}
                  <section id="accounts" className="scroll-mt-24">
                    <h2 className="text-xl font-semibold text-zinc-100 mb-4">
                      3. Account Registration and Security
                    </h2>
                    <div className="space-y-4 text-zinc-300 leading-relaxed">
                      <p>
                        To access the Service, you must create an account. When registering, you agree to:
                      </p>
                      <ul className="list-disc pl-6 text-zinc-400 space-y-2">
                        <li>Provide accurate, current, and complete information</li>
                        <li>Maintain and promptly update your account information</li>
                        <li>Keep your password and authentication credentials secure and confidential</li>
                        <li>Notify us immediately at security@lacodacapital.com of any unauthorized access or security breach</li>
                        <li>Be responsible for all activities that occur under your account</li>
                        <li>Not share account credentials or allow others to access your account</li>
                      </ul>
                      <p>
                        You must be at least 18 years old and have the legal capacity to enter into binding contracts. We may require additional verification for certain account types or access levels.
                      </p>
                      <p>
                        We reserve the right to suspend or terminate accounts that violate these Terms or pose security risks.
                      </p>
                    </div>
                  </section>

                  {/* Section 4 */}
                  <section id="payments" className="scroll-mt-24">
                    <h2 className="text-xl font-semibold text-zinc-100 mb-4">
                      4. Fees and Payment Terms
                    </h2>
                    <div className="space-y-4 text-zinc-300 leading-relaxed">
                      <p>
                        Access to the Service requires payment of applicable fees as described in your Order Form or on our pricing page. By subscribing, you agree to pay all fees according to the following terms:
                      </p>
                      <ul className="list-disc pl-6 text-zinc-400 space-y-2">
                        <li><strong className="text-zinc-300">Billing Cycle:</strong> Fees are billed in advance on a monthly or annual basis, depending on your selected plan</li>
                        <li><strong className="text-zinc-300">Payment Method:</strong> You authorize us to charge your designated payment method for all fees due</li>
                        <li><strong className="text-zinc-300">Taxes:</strong> All fees are exclusive of taxes. You are responsible for all applicable taxes, excluding taxes on our net income</li>
                        <li><strong className="text-zinc-300">Late Payments:</strong> Overdue amounts accrue interest at 1.5% per month or the maximum legal rate, whichever is lower</li>
                        <li><strong className="text-zinc-300">Price Changes:</strong> We may modify pricing with 30 days&apos; written notice. New prices apply at your next renewal</li>
                        <li><strong className="text-zinc-300">Refunds:</strong> Fees are non-refundable except as expressly stated or required by law</li>
                      </ul>
                      <p>
                        Failure to pay may result in suspension or termination of your access to the Service.
                      </p>
                    </div>
                  </section>

                  {/* Section 5 */}
                  <section id="acceptable-use" className="scroll-mt-24">
                    <h2 className="text-xl font-semibold text-zinc-100 mb-4">
                      5. Acceptable Use Policy
                    </h2>
                    <div className="space-y-4 text-zinc-300 leading-relaxed">
                      <p>
                        You agree to use the Service only for lawful purposes and in accordance with these Terms. You shall not:
                      </p>
                      <ul className="list-disc pl-6 text-zinc-400 space-y-2">
                        <li>Violate any applicable laws, regulations, or third-party rights</li>
                        <li>Upload, transmit, or store any content that is unlawful, harmful, threatening, abusive, defamatory, or otherwise objectionable</li>
                        <li>Attempt to gain unauthorized access to any portion of the Service or its related systems</li>
                        <li>Use the Service to transmit malware, viruses, or other harmful code</li>
                        <li>Interfere with or disrupt the integrity or performance of the Service</li>
                        <li>Reverse engineer, decompile, disassemble, or attempt to derive the source code of the Service</li>
                        <li>Use automated means (bots, scrapers) to access the Service without our written consent</li>
                        <li>Resell, sublicense, or redistribute the Service without authorization</li>
                        <li>Use the Service for competitive analysis or to build a competing product</li>
                        <li>Circumvent any access controls, usage limits, or security features</li>
                      </ul>
                      <p>
                        We reserve the right to investigate violations and take appropriate action, including suspending access or reporting to law enforcement.
                      </p>
                    </div>
                  </section>

                  {/* Section 6 */}
                  <section id="intellectual-property" className="scroll-mt-24">
                    <h2 className="text-xl font-semibold text-zinc-100 mb-4">
                      6. Intellectual Property Rights
                    </h2>
                    <div className="space-y-4 text-zinc-300 leading-relaxed">
                      <p>
                        The Service, including all content, features, functionality, software, designs, and documentation, is owned by Lacoda Capital Holdings and is protected by copyright, trademark, patent, trade secret, and other intellectual property laws.
                      </p>
                      <p>
                        &quot;Lacoda,&quot; &quot;Lacoda Capital,&quot; the Lacoda logo, and other marks are trademarks of Lacoda Capital Holdings. You may not use our trademarks without prior written permission.
                      </p>
                      <p>
                        Subject to your compliance with these Terms, we grant you a limited, non-exclusive, non-transferable, revocable license to access and use the Service for your internal business purposes during the subscription term.
                      </p>
                      <p>
                        We welcome feedback about the Service. Any feedback, suggestions, or ideas you provide become our property, and we may use them without obligation to you.
                      </p>
                    </div>
                  </section>

                  {/* Section 7 */}
                  <section id="data-ownership" className="scroll-mt-24">
                    <h2 className="text-xl font-semibold text-zinc-100 mb-4">
                      7. Data Ownership and License
                    </h2>
                    <div className="space-y-4 text-zinc-300 leading-relaxed">
                      <p>
                        You retain all ownership rights to the data, documents, and content you upload to the Service (&quot;Your Data&quot;). We do not claim ownership of Your Data.
                      </p>
                      <p>
                        By using the Service, you grant us a limited, worldwide, non-exclusive license to access, process, store, transmit, and display Your Data solely as necessary to:
                      </p>
                      <ul className="list-disc pl-6 text-zinc-400 space-y-2">
                        <li>Provide the Service to you</li>
                        <li>Maintain and improve the Service</li>
                        <li>Create anonymized, aggregated data for analytics and benchmarking (which will not identify you or your clients)</li>
                        <li>Comply with legal obligations</li>
                      </ul>
                      <p>
                        You represent that you have all necessary rights and permissions to upload Your Data and grant us these licenses. You are responsible for the accuracy and legality of Your Data.
                      </p>
                    </div>
                  </section>

                  {/* Section 8 */}
                  <section id="confidentiality" className="scroll-mt-24">
                    <h2 className="text-xl font-semibold text-zinc-100 mb-4">
                      8. Confidentiality
                    </h2>
                    <div className="space-y-4 text-zinc-300 leading-relaxed">
                      <p>
                        Each party agrees to maintain the confidentiality of the other party&apos;s Confidential Information. &quot;Confidential Information&quot; means non-public information designated as confidential or that reasonably should be understood to be confidential, including:
                      </p>
                      <ul className="list-disc pl-6 text-zinc-400 space-y-2">
                        <li>Your Data and financial information</li>
                        <li>Our proprietary technology, algorithms, and business methods</li>
                        <li>Pricing, contract terms, and business strategies</li>
                        <li>Security architecture and access credentials</li>
                      </ul>
                      <p>
                        Confidential Information does not include information that: (a) is or becomes publicly available without breach; (b) was known prior to disclosure; (c) is received from a third party without restriction; or (d) is independently developed.
                      </p>
                      <p>
                        These confidentiality obligations survive termination of these Terms for a period of three (3) years.
                      </p>
                    </div>
                  </section>

                  {/* Section 9 */}
                  <section id="warranties" className="scroll-mt-24">
                    <h2 className="text-xl font-semibold text-zinc-100 mb-4">
                      9. Disclaimers and Warranties
                    </h2>
                    <div className="space-y-4 text-zinc-300 leading-relaxed">
                      <p className="uppercase text-sm tracking-wide">
                        THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT.
                      </p>
                      <p>
                        We do not warrant that:
                      </p>
                      <ul className="list-disc pl-6 text-zinc-400 space-y-2">
                        <li>The Service will be uninterrupted, error-free, or completely secure</li>
                        <li>The Service will meet your specific requirements</li>
                        <li>Any data or calculations will be accurate or complete</li>
                        <li>Defects will be corrected within any timeframe</li>
                      </ul>
                      <p>
                        The Service is not intended to provide investment, legal, tax, or accounting advice. You should consult qualified professionals before making financial decisions based on information from the Service.
                      </p>
                    </div>
                  </section>

                  {/* Section 10 */}
                  <section id="liability" className="scroll-mt-24">
                    <h2 className="text-xl font-semibold text-zinc-100 mb-4">
                      10. Limitation of Liability
                    </h2>
                    <div className="space-y-4 text-zinc-300 leading-relaxed">
                      <p className="uppercase text-sm tracking-wide">
                        TO THE MAXIMUM EXTENT PERMITTED BY LAW, LACODA CAPITAL HOLDINGS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, BUSINESS OPPORTUNITIES, GOODWILL, OR OTHER INTANGIBLE LOSSES.
                      </p>
                      <p className="uppercase text-sm tracking-wide">
                        OUR TOTAL AGGREGATE LIABILITY FOR ALL CLAIMS ARISING OUT OF OR RELATED TO THESE TERMS OR THE SERVICE SHALL NOT EXCEED THE GREATER OF: (A) THE AMOUNTS PAID BY YOU TO US IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM, OR (B) ONE THOUSAND DOLLARS ($1,000).
                      </p>
                      <p>
                        These limitations apply regardless of the theory of liability (contract, tort, strict liability, or otherwise) and even if we have been advised of the possibility of such damages. Some jurisdictions do not allow certain limitations, so these may not apply to you.
                      </p>
                    </div>
                  </section>

                  {/* Section 11 */}
                  <section id="indemnification" className="scroll-mt-24">
                    <h2 className="text-xl font-semibold text-zinc-100 mb-4">
                      11. Indemnification
                    </h2>
                    <div className="space-y-4 text-zinc-300 leading-relaxed">
                      <p>
                        You agree to indemnify, defend, and hold harmless Lacoda Capital Holdings, its officers, directors, employees, agents, and affiliates from and against any claims, damages, losses, liabilities, costs, and expenses (including reasonable attorneys&apos; fees) arising from:
                      </p>
                      <ul className="list-disc pl-6 text-zinc-400 space-y-2">
                        <li>Your use of the Service</li>
                        <li>Your Data or content you upload</li>
                        <li>Your violation of these Terms</li>
                        <li>Your violation of any third-party rights</li>
                        <li>Any claim that Your Data infringes intellectual property rights</li>
                      </ul>
                      <p>
                        We will provide you with prompt notice of any such claim and reasonable cooperation in the defense. You may not settle any claim without our prior written consent.
                      </p>
                    </div>
                  </section>

                  {/* Section 12 */}
                  <section id="termination" className="scroll-mt-24">
                    <h2 className="text-xl font-semibold text-zinc-100 mb-4">
                      12. Termination
                    </h2>
                    <div className="space-y-4 text-zinc-300 leading-relaxed">
                      <p>
                        <strong className="text-zinc-100">By You:</strong> You may terminate your account at any time by providing written notice. No refunds will be provided for prepaid fees, and you remain responsible for any outstanding amounts.
                      </p>
                      <p>
                        <strong className="text-zinc-100">By Us:</strong> We may suspend or terminate your access immediately if you: (a) breach these Terms; (b) fail to pay fees when due; (c) become subject to bankruptcy proceedings; or (d) pose a security risk. For other reasons, we will provide 30 days&apos; notice.
                      </p>
                      <p>
                        <strong className="text-zinc-100">Effect of Termination:</strong> Upon termination:
                      </p>
                      <ul className="list-disc pl-6 text-zinc-400 space-y-2">
                        <li>Your right to access the Service ends immediately</li>
                        <li>You may request export of Your Data within 30 days</li>
                        <li>After 30 days, we may delete Your Data</li>
                        <li>Sections on confidentiality, liability, indemnification, and general provisions survive termination</li>
                      </ul>
                    </div>
                  </section>

                  {/* Section 13 */}
                  <section id="governing-law" className="scroll-mt-24">
                    <h2 className="text-xl font-semibold text-zinc-100 mb-4">
                      13. Governing Law and Dispute Resolution
                    </h2>
                    <div className="space-y-4 text-zinc-300 leading-relaxed">
                      <p>
                        These Terms are governed by the laws of the State of Delaware, United States, without regard to conflict of law principles.
                      </p>
                      <p>
                        <strong className="text-zinc-100">Informal Resolution:</strong> Before initiating formal proceedings, you agree to contact us at legal@lacodacapital.com and attempt to resolve any dispute informally for at least 30 days.
                      </p>
                      <p>
                        <strong className="text-zinc-100">Arbitration:</strong> Any dispute not resolved informally shall be resolved by binding arbitration administered by the American Arbitration Association under its Commercial Arbitration Rules. The arbitration shall be conducted in Wilmington, Delaware, in English.
                      </p>
                      <p>
                        <strong className="text-zinc-100">Class Action Waiver:</strong> You agree to resolve disputes with us on an individual basis and waive any right to participate in class actions or class arbitrations.
                      </p>
                      <p>
                        <strong className="text-zinc-100">Exceptions:</strong> Either party may seek injunctive relief in any court of competent jurisdiction to protect intellectual property rights or prevent irreparable harm.
                      </p>
                    </div>
                  </section>

                  {/* Section 14 */}
                  <section id="changes" className="scroll-mt-24">
                    <h2 className="text-xl font-semibold text-zinc-100 mb-4">
                      14. Changes to Terms
                    </h2>
                    <div className="space-y-4 text-zinc-300 leading-relaxed">
                      <p>
                        We may update these Terms from time to time to reflect changes in our practices, technology, legal requirements, or business operations.
                      </p>
                      <p>
                        For material changes, we will provide at least 30 days&apos; notice via email or a prominent notice within the Service. The updated Terms will indicate the &quot;Last updated&quot; date.
                      </p>
                      <p>
                        Your continued use of the Service after the effective date of updated Terms constitutes your acceptance of the changes. If you do not agree, you must stop using the Service and may terminate your account.
                      </p>
                    </div>
                  </section>

                  {/* Section 15 */}
                  <section id="contact" className="scroll-mt-24">
                    <h2 className="text-xl font-semibold text-zinc-100 mb-4">
                      15. Contact Information
                    </h2>
                    <div className="space-y-4 text-zinc-300 leading-relaxed">
                      <p>
                        If you have questions, concerns, or feedback about these Terms or the Service, please contact us:
                      </p>
                      <div className="bg-zinc-800/50 rounded-lg p-6 border border-zinc-700">
                        <p className="font-semibold text-zinc-100">Lacoda Capital Holdings, LLC</p>
                        <div className="mt-4 space-y-1">
                          <p>
                            <span className="text-zinc-500">Legal Inquiries:</span>{" "}
                            <a href="mailto:legal@lacodacapital.com" className="text-tiffany-500 hover:text-tiffany-400">
                              legal@lacodacapital.com
                            </a>
                          </p>
                          <p>
                            <span className="text-zinc-500">General Support:</span>{" "}
                            <a href="mailto:support@lacodacapital.com" className="text-tiffany-500 hover:text-tiffany-400">
                              support@lacodacapital.com
                            </a>
                          </p>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* General Provisions */}
                  <section className="pt-6 border-t border-zinc-700">
                    <h2 className="text-lg font-semibold text-zinc-100 mb-4">
                      General Provisions
                    </h2>
                    <div className="space-y-3 text-sm text-zinc-400 leading-relaxed">
                      <p>
                        <strong className="text-zinc-300">Entire Agreement:</strong> These Terms, together with any Order Form and our Privacy Policy, constitute the entire agreement between you and Lacoda regarding the Service.
                      </p>
                      <p>
                        <strong className="text-zinc-300">Severability:</strong> If any provision is found invalid or unenforceable, the remaining provisions continue in full force.
                      </p>
                      <p>
                        <strong className="text-zinc-300">Waiver:</strong> Our failure to enforce any right or provision does not constitute a waiver.
                      </p>
                      <p>
                        <strong className="text-zinc-300">Assignment:</strong> You may not assign these Terms without our written consent. We may assign our rights and obligations freely.
                      </p>
                      <p>
                        <strong className="text-zinc-300">Force Majeure:</strong> Neither party is liable for delays or failures due to circumstances beyond reasonable control.
                      </p>
                    </div>
                  </section>
                </div>
              </animated.div>
            </main>
          </div>
        </div>
      </div>
    </div>
  )
}
