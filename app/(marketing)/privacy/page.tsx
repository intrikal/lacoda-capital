"use client"

import * as React from "react"
import Link from "next/link"
import { useSpring, animated, config } from "@react-spring/web"
import { ArrowLeft } from "lucide-react"
import { Logo } from "@/components/marketing/logo"
import { Badge } from "@/components/ui/badge"
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion"

const sections = [
  { id: "introduction", title: "1. Introduction" },
  { id: "information-collected", title: "2. Information We Collect" },
  { id: "how-we-use", title: "3. How We Use Your Information" },
  { id: "sharing", title: "4. Information Sharing and Disclosure" },
  { id: "cookies", title: "5. Cookies and Tracking Technologies" },
  { id: "data-security", title: "6. Data Security" },
  { id: "data-retention", title: "7. Data Retention" },
  { id: "your-rights", title: "8. Your Privacy Rights" },
  { id: "international", title: "9. International Data Transfers" },
  { id: "children", title: "10. Children's Privacy" },
  { id: "third-party", title: "11. Third-Party Links and Services" },
  { id: "changes", title: "12. Changes to This Policy" },
  { id: "contact", title: "13. Contact Us" },
]

export default function PrivacyPage() {
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
                  Privacy Policy
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
                  <section id="introduction" className="scroll-mt-24">
                    <h2 className="text-xl font-semibold text-zinc-100 mb-4">
                      1. Introduction
                    </h2>
                    <div className="space-y-4 text-zinc-300 leading-relaxed">
                      <p>
                        Lacoda Capital Holdings, LLC ("Lacoda," "we," "our," or "us") is committed to protecting the privacy and security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform, website, applications, and related services (collectively, the "Service").
                      </p>
                      <p>
                        We understand that as a platform for managing financial data and sensitive documents, privacy is paramount. We employ industry-leading security practices and maintain strict data handling procedures to protect your information.
                      </p>
                      <p>
                        By using the Service, you consent to the collection and use of your information as described in this Privacy Policy. If you do not agree with our policies and practices, please do not use the Service.
                      </p>
                    </div>
                  </section>

                  {/* Section 2 */}
                  <section id="information-collected" className="scroll-mt-24">
                    <h2 className="text-xl font-semibold text-zinc-100 mb-4">
                      2. Information We Collect
                    </h2>
                    <div className="space-y-4 text-zinc-300 leading-relaxed">
                      <p>
                        We collect information in several ways depending on how you interact with our Service:
                      </p>

                      <div className="mt-6">
                        <h3 className="text-lg font-medium text-zinc-100 mb-3">
                          2.1 Information You Provide Directly
                        </h3>
                        <ul className="list-disc pl-6 text-zinc-400 space-y-2">
                          <li><strong className="text-zinc-300">Account Information:</strong> Name, email address, phone number, company name, job title, and password when you register</li>
                          <li><strong className="text-zinc-300">Financial Data:</strong> Portfolio information, asset details, transaction records, and financial statements you upload</li>
                          <li><strong className="text-zinc-300">Documents:</strong> Files, contracts, and other documents stored in the Vault</li>
                          <li><strong className="text-zinc-300">Payment Information:</strong> Billing address and payment method details (processed by our payment provider)</li>
                          <li><strong className="text-zinc-300">Communications:</strong> Messages, support tickets, feedback, and correspondence with our team</li>
                          <li><strong className="text-zinc-300">Profile Information:</strong> Preferences, settings, and profile customizations</li>
                        </ul>
                      </div>

                      <div className="mt-6">
                        <h3 className="text-lg font-medium text-zinc-100 mb-3">
                          2.2 Information Collected Automatically
                        </h3>
                        <ul className="list-disc pl-6 text-zinc-400 space-y-2">
                          <li><strong className="text-zinc-300">Usage Data:</strong> Features used, pages viewed, actions taken, time spent, and interaction patterns</li>
                          <li><strong className="text-zinc-300">Device Information:</strong> Device type, operating system, browser type and version, screen resolution</li>
                          <li><strong className="text-zinc-300">Log Data:</strong> IP address, access times, referring URLs, error logs, and system activity</li>
                          <li><strong className="text-zinc-300">Location Data:</strong> General geographic location based on IP address (not precise location)</li>
                        </ul>
                      </div>

                      <div className="mt-6">
                        <h3 className="text-lg font-medium text-zinc-100 mb-3">
                          2.3 Information from Third Parties
                        </h3>
                        <ul className="list-disc pl-6 text-zinc-400 space-y-2">
                          <li><strong className="text-zinc-300">Connected Accounts:</strong> Data from financial institutions, custodians, or data providers you authorize</li>
                          <li><strong className="text-zinc-300">Identity Verification:</strong> Information from verification services for compliance purposes</li>
                          <li><strong className="text-zinc-300">Business Information:</strong> Publicly available company information from business databases</li>
                        </ul>
                      </div>
                    </div>
                  </section>

                  {/* Section 3 */}
                  <section id="how-we-use" className="scroll-mt-24">
                    <h2 className="text-xl font-semibold text-zinc-100 mb-4">
                      3. How We Use Your Information
                    </h2>
                    <div className="space-y-4 text-zinc-300 leading-relaxed">
                      <p>
                        We use the information we collect for the following purposes:
                      </p>

                      <div className="mt-4">
                        <h3 className="text-lg font-medium text-zinc-100 mb-3">Service Delivery</h3>
                        <ul className="list-disc pl-6 text-zinc-400 space-y-2">
                          <li>Provide, operate, and maintain the Service</li>
                          <li>Process transactions and manage your account</li>
                          <li>Display your portfolio and financial data</li>
                          <li>Store and organize your documents securely</li>
                          <li>Generate reports and analytics</li>
                        </ul>
                      </div>

                      <div className="mt-4">
                        <h3 className="text-lg font-medium text-zinc-100 mb-3">Communication</h3>
                        <ul className="list-disc pl-6 text-zinc-400 space-y-2">
                          <li>Send service notifications and updates</li>
                          <li>Respond to inquiries and support requests</li>
                          <li>Provide security alerts and important notices</li>
                          <li>Send marketing communications (with your consent)</li>
                        </ul>
                      </div>

                      <div className="mt-4">
                        <h3 className="text-lg font-medium text-zinc-100 mb-3">Improvement and Development</h3>
                        <ul className="list-disc pl-6 text-zinc-400 space-y-2">
                          <li>Analyze usage patterns to improve the Service</li>
                          <li>Develop new features and functionality</li>
                          <li>Conduct research and analytics</li>
                          <li>Train and improve our AI models (using anonymized data only)</li>
                        </ul>
                      </div>

                      <div className="mt-4">
                        <h3 className="text-lg font-medium text-zinc-100 mb-3">Security and Compliance</h3>
                        <ul className="list-disc pl-6 text-zinc-400 space-y-2">
                          <li>Detect, prevent, and respond to security threats</li>
                          <li>Verify identity and prevent fraud</li>
                          <li>Comply with legal and regulatory requirements</li>
                          <li>Enforce our Terms of Service</li>
                        </ul>
                      </div>
                    </div>
                  </section>

                  {/* Section 4 */}
                  <section id="sharing" className="scroll-mt-24">
                    <h2 className="text-xl font-semibold text-zinc-100 mb-4">
                      4. Information Sharing and Disclosure
                    </h2>
                    <div className="space-y-4 text-zinc-300 leading-relaxed">
                      <p>
                        We do not sell your personal information. We may share your information in the following circumstances:
                      </p>

                      <div className="mt-4">
                        <h3 className="text-lg font-medium text-zinc-100 mb-3">Service Providers</h3>
                        <p className="text-zinc-400">
                          We engage trusted third-party companies to perform services on our behalf, including cloud hosting (AWS, Google Cloud), payment processing (Stripe), email delivery, customer support tools, and analytics. These providers are contractually bound to protect your data and use it only for the services they provide to us.
                        </p>
                      </div>

                      <div className="mt-4">
                        <h3 className="text-lg font-medium text-zinc-100 mb-3">With Your Consent</h3>
                        <p className="text-zinc-400">
                          We may share information with third parties when you explicitly authorize such sharing, such as connecting to external financial data providers or sharing reports with advisors.
                        </p>
                      </div>

                      <div className="mt-4">
                        <h3 className="text-lg font-medium text-zinc-100 mb-3">Legal Requirements</h3>
                        <p className="text-zinc-400">
                          We may disclose information if required by law, court order, or government request, or if we believe disclosure is necessary to protect rights, safety, or property, or to respond to an emergency.
                        </p>
                      </div>

                      <div className="mt-4">
                        <h3 className="text-lg font-medium text-zinc-100 mb-3">Business Transfers</h3>
                        <p className="text-zinc-400">
                          In connection with a merger, acquisition, reorganization, or sale of assets, your information may be transferred to the acquiring entity. We will notify you of any such change.
                        </p>
                      </div>

                      <div className="mt-4">
                        <h3 className="text-lg font-medium text-zinc-100 mb-3">Aggregated Data</h3>
                        <p className="text-zinc-400">
                          We may share anonymized, aggregated data that cannot identify you for research, benchmarking, or marketing purposes.
                        </p>
                      </div>
                    </div>
                  </section>

                  {/* Section 5 */}
                  <section id="cookies" className="scroll-mt-24">
                    <h2 className="text-xl font-semibold text-zinc-100 mb-4">
                      5. Cookies and Tracking Technologies
                    </h2>
                    <div className="space-y-4 text-zinc-300 leading-relaxed">
                      <p>
                        We use cookies and similar tracking technologies to collect and store information about your interactions with the Service.
                      </p>

                      <div className="mt-4">
                        <h3 className="text-lg font-medium text-zinc-100 mb-3">Types of Cookies We Use</h3>
                        <ul className="list-disc pl-6 text-zinc-400 space-y-2">
                          <li><strong className="text-zinc-300">Essential Cookies:</strong> Required for the Service to function, including authentication and security</li>
                          <li><strong className="text-zinc-300">Functional Cookies:</strong> Remember your preferences and settings</li>
                          <li><strong className="text-zinc-300">Analytics Cookies:</strong> Help us understand how users interact with the Service</li>
                          <li><strong className="text-zinc-300">Performance Cookies:</strong> Monitor and improve Service performance</li>
                        </ul>
                      </div>

                      <div className="mt-4">
                        <h3 className="text-lg font-medium text-zinc-100 mb-3">Your Cookie Choices</h3>
                        <p className="text-zinc-400">
                          Most browsers allow you to control cookies through settings. You can refuse or delete cookies, but this may affect your ability to use certain features. We honor "Do Not Track" browser signals where required by law.
                        </p>
                      </div>

                      <div className="mt-4">
                        <h3 className="text-lg font-medium text-zinc-100 mb-3">Analytics Services</h3>
                        <p className="text-zinc-400">
                          We use analytics services such as Google Analytics and Mixpanel to understand usage patterns. These services may collect information about your activity across websites. You can opt out of Google Analytics at <a href="https://tools.google.com/dlpage/gaoptout" className="text-tiffany-500 hover:text-tiffany-400">tools.google.com/dlpage/gaoptout</a>.
                        </p>
                      </div>
                    </div>
                  </section>

                  {/* Section 6 */}
                  <section id="data-security" className="scroll-mt-24">
                    <h2 className="text-xl font-semibold text-zinc-100 mb-4">
                      6. Data Security
                    </h2>
                    <div className="space-y-4 text-zinc-300 leading-relaxed">
                      <p>
                        We implement comprehensive security measures to protect your information:
                      </p>

                      <div className="bg-zinc-800/50 rounded-lg p-6 border border-zinc-700 mt-4">
                        <h3 className="text-lg font-medium text-zinc-100 mb-4">Our Security Measures</h3>
                        <ul className="space-y-3 text-zinc-400">
                          <li className="flex items-start gap-3">
                            <span className="text-tiffany-500 mt-1">-</span>
                            <span><strong className="text-zinc-300">Encryption:</strong> AES-256 encryption for data at rest; TLS 1.3 for data in transit</span>
                          </li>
                          <li className="flex items-start gap-3">
                            <span className="text-tiffany-500 mt-1">-</span>
                            <span><strong className="text-zinc-300">Access Controls:</strong> Role-based access, multi-factor authentication, and principle of least privilege</span>
                          </li>
                          <li className="flex items-start gap-3">
                            <span className="text-tiffany-500 mt-1">-</span>
                            <span><strong className="text-zinc-300">Infrastructure:</strong> SOC 2 Type II certified data centers with physical security controls</span>
                          </li>
                          <li className="flex items-start gap-3">
                            <span className="text-tiffany-500 mt-1">-</span>
                            <span><strong className="text-zinc-300">Monitoring:</strong> 24/7 security monitoring, intrusion detection, and threat response</span>
                          </li>
                          <li className="flex items-start gap-3">
                            <span className="text-tiffany-500 mt-1">-</span>
                            <span><strong className="text-zinc-300">Audits:</strong> Regular penetration testing and third-party security assessments</span>
                          </li>
                          <li className="flex items-start gap-3">
                            <span className="text-tiffany-500 mt-1">-</span>
                            <span><strong className="text-zinc-300">Training:</strong> Security awareness training for all employees</span>
                          </li>
                        </ul>
                      </div>

                      <p className="mt-4 text-zinc-400">
                        While we strive to protect your information, no method of transmission or storage is completely secure. We cannot guarantee absolute security, but we commit to promptly notifying affected users in the event of a data breach as required by law.
                      </p>
                    </div>
                  </section>

                  {/* Section 7 */}
                  <section id="data-retention" className="scroll-mt-24">
                    <h2 className="text-xl font-semibold text-zinc-100 mb-4">
                      7. Data Retention
                    </h2>
                    <div className="space-y-4 text-zinc-300 leading-relaxed">
                      <p>
                        We retain your information for as long as necessary to fulfill the purposes described in this Privacy Policy:
                      </p>
                      <ul className="list-disc pl-6 text-zinc-400 space-y-2">
                        <li><strong className="text-zinc-300">Account Data:</strong> Retained while your account is active and for 30 days after deletion request to allow for data export</li>
                        <li><strong className="text-zinc-300">Financial Data:</strong> Retained according to your preferences and regulatory requirements (typically 7 years for tax-related records)</li>
                        <li><strong className="text-zinc-300">Usage Logs:</strong> Retained for up to 2 years for security and analytics purposes</li>
                        <li><strong className="text-zinc-300">Communications:</strong> Retained for up to 3 years for support and quality purposes</li>
                        <li><strong className="text-zinc-300">Backup Data:</strong> Retained in encrypted backups for up to 90 days after deletion</li>
                      </ul>
                      <p>
                        We may retain certain information longer if required by law, to resolve disputes, enforce agreements, or for other legitimate business purposes. Anonymized data may be retained indefinitely.
                      </p>
                    </div>
                  </section>

                  {/* Section 8 */}
                  <section id="your-rights" className="scroll-mt-24">
                    <h2 className="text-xl font-semibold text-zinc-100 mb-4">
                      8. Your Privacy Rights
                    </h2>
                    <div className="space-y-4 text-zinc-300 leading-relaxed">
                      <p>
                        Depending on your location, you may have certain rights regarding your personal information:
                      </p>

                      <div className="mt-4">
                        <h3 className="text-lg font-medium text-zinc-100 mb-3">General Rights</h3>
                        <ul className="list-disc pl-6 text-zinc-400 space-y-2">
                          <li><strong className="text-zinc-300">Access:</strong> Request a copy of the personal information we hold about you</li>
                          <li><strong className="text-zinc-300">Correction:</strong> Request correction of inaccurate or incomplete data</li>
                          <li><strong className="text-zinc-300">Deletion:</strong> Request deletion of your personal information, subject to legal retention requirements</li>
                          <li><strong className="text-zinc-300">Portability:</strong> Receive your data in a structured, machine-readable format</li>
                          <li><strong className="text-zinc-300">Objection:</strong> Object to certain processing of your information</li>
                          <li><strong className="text-zinc-300">Restriction:</strong> Request restriction of processing in certain circumstances</li>
                          <li><strong className="text-zinc-300">Withdraw Consent:</strong> Withdraw consent where processing is based on consent</li>
                        </ul>
                      </div>

                      <div className="mt-4">
                        <h3 className="text-lg font-medium text-zinc-100 mb-3">California Residents (CCPA/CPRA)</h3>
                        <p className="text-zinc-400">
                          California residents have additional rights including the right to know what personal information is collected, sold, or disclosed; the right to opt-out of sale of personal information (we do not sell personal information); and the right to non-discrimination for exercising privacy rights.
                        </p>
                      </div>

                      <div className="mt-4">
                        <h3 className="text-lg font-medium text-zinc-100 mb-3">European Residents (GDPR)</h3>
                        <p className="text-zinc-400">
                          If you are in the European Economic Area, you have additional rights under GDPR including the right to lodge a complaint with a supervisory authority. Our legal bases for processing include contract performance, legitimate interests, legal obligations, and consent.
                        </p>
                      </div>

                      <div className="mt-4">
                        <h3 className="text-lg font-medium text-zinc-100 mb-3">Exercising Your Rights</h3>
                        <p className="text-zinc-400">
                          To exercise any of these rights, please contact us at <a href="mailto:privacy@lacodacapital.com" className="text-tiffany-500 hover:text-tiffany-400">privacy@lacodacapital.com</a>. We will respond within 30 days (or sooner if required by law). We may need to verify your identity before processing your request.
                        </p>
                      </div>
                    </div>
                  </section>

                  {/* Section 9 */}
                  <section id="international" className="scroll-mt-24">
                    <h2 className="text-xl font-semibold text-zinc-100 mb-4">
                      9. International Data Transfers
                    </h2>
                    <div className="space-y-4 text-zinc-300 leading-relaxed">
                      <p>
                        Lacoda Capital Holdings is based in the United States. If you access the Service from outside the United States, your information may be transferred to, stored, and processed in the United States or other countries where our service providers operate.
                      </p>
                      <p>
                        For transfers from the European Economic Area, United Kingdom, or Switzerland, we rely on:
                      </p>
                      <ul className="list-disc pl-6 text-zinc-400 space-y-2">
                        <li>Standard Contractual Clauses approved by the European Commission</li>
                        <li>Adequacy decisions where applicable</li>
                        <li>Binding Corporate Rules for intra-group transfers</li>
                        <li>Your explicit consent where appropriate</li>
                      </ul>
                      <p>
                        We ensure that any international transfers are conducted with appropriate safeguards to protect your information.
                      </p>
                    </div>
                  </section>

                  {/* Section 10 */}
                  <section id="children" className="scroll-mt-24">
                    <h2 className="text-xl font-semibold text-zinc-100 mb-4">
                      10. Children's Privacy
                    </h2>
                    <div className="space-y-4 text-zinc-300 leading-relaxed">
                      <p>
                        The Service is not intended for individuals under the age of 18. We do not knowingly collect personal information from children under 18. If you are a parent or guardian and believe your child has provided us with personal information, please contact us at <a href="mailto:privacy@lacodacapital.com" className="text-tiffany-500 hover:text-tiffany-400">privacy@lacodacapital.com</a>.
                      </p>
                      <p>
                        If we become aware that we have collected personal information from a child under 18, we will take steps to delete such information promptly.
                      </p>
                    </div>
                  </section>

                  {/* Section 11 */}
                  <section id="third-party" className="scroll-mt-24">
                    <h2 className="text-xl font-semibold text-zinc-100 mb-4">
                      11. Third-Party Links and Services
                    </h2>
                    <div className="space-y-4 text-zinc-300 leading-relaxed">
                      <p>
                        The Service may contain links to third-party websites, applications, or services that are not operated by us. This Privacy Policy does not apply to third-party services, and we are not responsible for their privacy practices.
                      </p>
                      <p>
                        We encourage you to review the privacy policies of any third-party services you access through our platform. When you connect third-party financial accounts, those connections are governed by both our policy and the third party's policy.
                      </p>
                    </div>
                  </section>

                  {/* Section 12 */}
                  <section id="changes" className="scroll-mt-24">
                    <h2 className="text-xl font-semibold text-zinc-100 mb-4">
                      12. Changes to This Policy
                    </h2>
                    <div className="space-y-4 text-zinc-300 leading-relaxed">
                      <p>
                        We may update this Privacy Policy from time to time to reflect changes in our practices, technology, legal requirements, or other factors.
                      </p>
                      <p>
                        When we make material changes, we will:
                      </p>
                      <ul className="list-disc pl-6 text-zinc-400 space-y-2">
                        <li>Update the "Last updated" date at the top of this policy</li>
                        <li>Provide notice via email or a prominent notice in the Service</li>
                        <li>For significant changes, provide at least 30 days' notice before the changes take effect</li>
                      </ul>
                      <p>
                        We encourage you to review this Privacy Policy periodically. Your continued use of the Service after changes become effective constitutes acceptance of the updated policy.
                      </p>
                    </div>
                  </section>

                  {/* Section 13 */}
                  <section id="contact" className="scroll-mt-24">
                    <h2 className="text-xl font-semibold text-zinc-100 mb-4">
                      13. Contact Us
                    </h2>
                    <div className="space-y-4 text-zinc-300 leading-relaxed">
                      <p>
                        If you have questions, concerns, or complaints about this Privacy Policy or our privacy practices, please contact us:
                      </p>
                      <div className="bg-zinc-800/50 rounded-lg p-6 border border-zinc-700">
                        <p className="font-semibold text-zinc-100">Lacoda Capital Holdings, LLC</p>
                        <p className="text-sm text-zinc-500">Data Protection Team</p>
                        <div className="mt-4 space-y-1">
                          <p>
                            <span className="text-zinc-500">Privacy Inquiries:</span>{" "}
                            <a href="mailto:privacy@lacodacapital.com" className="text-tiffany-500 hover:text-tiffany-400">
                              privacy@lacodacapital.com
                            </a>
                          </p>
                          <p>
                            <span className="text-zinc-500">Data Protection Officer:</span>{" "}
                            <a href="mailto:dpo@lacodacapital.com" className="text-tiffany-500 hover:text-tiffany-400">
                              dpo@lacodacapital.com
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

                      <p className="mt-6 text-zinc-400">
                        We aim to respond to all privacy-related inquiries within 30 days. For EU residents, if you are not satisfied with our response, you have the right to lodge a complaint with your local data protection authority.
                      </p>
                    </div>
                  </section>

                  {/* Cookie Preferences */}
                  <section className="pt-6 border-t border-zinc-700">
                    <h2 className="text-lg font-semibold text-zinc-100 mb-4">
                      Cookie Preferences
                    </h2>
                    <p className="text-sm text-zinc-400 leading-relaxed">
                      You can manage your cookie preferences at any time through your browser settings or by contacting us. To opt out of analytics tracking, you can use browser extensions or visit the opt-out pages for specific analytics providers.
                    </p>
                  </section>

                  {/* Related Links */}
                  <section className="pt-6 border-t border-zinc-700">
                    <h2 className="text-lg font-semibold text-zinc-100 mb-4">
                      Related Policies
                    </h2>
                    <div className="flex flex-wrap gap-4">
                      <Link
                        href="/terms"
                        className="text-sm text-tiffany-500 hover:text-tiffany-400 transition-colors"
                      >
                        Terms of Service
                      </Link>
                      <Link
                        href="/security"
                        className="text-sm text-tiffany-500 hover:text-tiffany-400 transition-colors"
                      >
                        Security Overview
                      </Link>
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
