export const metadata = {
  title: "Privacy Policy — LeadMax",
  description: "Privacy Policy for LeadMax lead management platform",
};

const LAST_UPDATED = "June 18, 2026";
const COMPANY_NAME = "LeadMax";
const CONTACT_EMAIL = "ai@7pinfomedia.com";

export default function PrivacyPolicyPage() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "#fff",
      color: "#111",
      fontFamily: "system-ui, -apple-system, sans-serif",
    }}>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "48px 24px 80px" }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 6 }}>Privacy Policy</h1>
        <p style={{ fontSize: 14, color: "#666", marginBottom: 40 }}>Last updated: {LAST_UPDATED}</p>

        <Section title="1. Introduction">
          <p>
            {COMPANY_NAME} (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) operates a sales lead management and
            customer engagement platform. This Privacy Policy explains how we collect, use, disclose,
            and safeguard your information when you use our platform, including data collected through
            Facebook Lead Ads and WhatsApp Business integrations.
          </p>
          <p>
            By using our services, you agree to the collection and use of information in accordance
            with this policy.
          </p>
        </Section>

        <Section title="2. Information We Collect">
          <h3 style={h3}>2.1 Lead Data from Facebook Lead Ads</h3>
          <p>
            When a user submits a Facebook Lead Ad form connected to our platform, we receive the
            information they provide in that form, which may include:
          </p>
          <ul>
            <li>Full name</li>
            <li>Phone number</li>
            <li>Email address</li>
            <li>Any additional fields included in the lead form</li>
          </ul>
          <p>
            This data is collected under the user&apos;s consent given at the time of form submission
            on Facebook&apos;s platform, in accordance with Meta&apos;s data policies.
          </p>

          <h3 style={h3}>2.2 WhatsApp Messaging Data</h3>
          <p>
            When customers message your business WhatsApp number, we receive and store the content
            of those messages to enable your sales team to respond. This includes:
          </p>
          <ul>
            <li>Phone number of the sender</li>
            <li>Message content (text, media type placeholders)</li>
            <li>Message timestamps and delivery status</li>
          </ul>

          <h3 style={h3}>2.3 Account and Usage Data</h3>
          <p>We collect information you provide when creating an account:</p>
          <ul>
            <li>Name, email address, and password (stored encrypted)</li>
            <li>Organization name and role within your company</li>
            <li>Activity logs and notes entered by your sales team</li>
          </ul>
        </Section>

        <Section title="3. How We Use Your Information">
          <p>We use the collected information to:</p>
          <ul>
            <li>Display and manage sales leads within your organization&apos;s CRM dashboard</li>
            <li>Enable your sales representatives to follow up with leads via call or WhatsApp</li>
            <li>Track sales activities, tasks, and engagement history</li>
            <li>Send notifications to your team about new leads and tasks</li>
            <li>Generate analytics and reports for your sales managers</li>
            <li>Improve the functionality and performance of our platform</li>
          </ul>
          <p>
            We do not sell, rent, or share your lead data with third parties for marketing purposes.
          </p>
        </Section>

        <Section title="4. Data Sharing">
          <p>We may share data in the following limited circumstances:</p>
          <ul>
            <li>
              <strong>Meta (Facebook/Instagram/WhatsApp):</strong> We exchange data with Meta&apos;s
              Graph API solely to retrieve lead information and send/receive WhatsApp messages on
              your behalf, as authorized by you during the integration setup.
            </li>
            <li>
              <strong>Service providers:</strong> We use infrastructure providers (cloud hosting,
              databases) who process data on our behalf under strict confidentiality agreements.
            </li>
            <li>
              <strong>Legal requirements:</strong> We may disclose data if required by law or to
              protect the rights and safety of our users.
            </li>
          </ul>
        </Section>

        <Section title="5. Data Retention">
          <p>
            Lead data, activity logs, and messages are retained for as long as your organization
            account remains active. You may request deletion of your data at any time by contacting
            us. Upon account termination, your data will be deleted within 30 days.
          </p>
        </Section>

        <Section title="6. Data Security">
          <p>
            We implement industry-standard security measures to protect your data:
          </p>
          <ul>
            <li>All OAuth access tokens are AES-encrypted at rest</li>
            <li>Passwords are bcrypt-hashed and never stored in plain text</li>
            <li>All data in transit is encrypted using TLS/HTTPS</li>
            <li>Access to data is restricted by role-based access controls</li>
          </ul>
        </Section>

        <Section title="7. Your Rights">
          <p>You have the right to:</p>
          <ul>
            <li>Access the personal data we hold about you</li>
            <li>Request correction of inaccurate data</li>
            <li>Request deletion of your data</li>
            <li>Withdraw consent for data processing at any time</li>
            <li>Export your data in a portable format</li>
          </ul>
          <p>
            To exercise any of these rights, contact us at{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: "#4338ca" }}>{CONTACT_EMAIL}</a>.
          </p>
        </Section>

        <Section title="8. Cookies">
          <p>
            Our platform uses session cookies strictly necessary for authentication. We do not use
            tracking or advertising cookies.
          </p>
        </Section>

        <Section title="9. Children's Privacy">
          <p>
            Our platform is intended for business use only and is not directed at anyone under the
            age of 18. We do not knowingly collect personal information from minors.
          </p>
        </Section>

        <Section title="10. Changes to This Policy">
          <p>
            We may update this Privacy Policy from time to time. We will notify you of any changes
            by updating the &quot;Last updated&quot; date at the top of this page. Continued use of
            the platform after changes constitutes acceptance of the updated policy.
          </p>
        </Section>

        <Section title="11. Contact Us">
          <p>
            If you have any questions about this Privacy Policy or how we handle your data, please
            contact us:
          </p>
          <p>
            <strong>{COMPANY_NAME}</strong><br />
            Email: <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: "#4338ca" }}>{CONTACT_EMAIL}</a>
          </p>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 36 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12, color: "#111" }}>{title}</h2>
      <div style={{ fontSize: 15, lineHeight: 1.75, color: "#333" }}>{children}</div>
    </section>
  );
}

const h3: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 600,
  margin: "16px 0 8px",
  color: "#111",
};
