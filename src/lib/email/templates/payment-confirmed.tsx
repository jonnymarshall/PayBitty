import { Html, Head, Body, Container, Heading, Text, Link, Section, Hr } from "@react-email/components";

export interface PaymentConfirmedProps {
  invoiceNumber: string | null;
  clientName: string;
  totalDisplay: string;
  txid: string;
  mempoolUrl: string;
  dashboardUrl: string;
}

export function PaymentConfirmedEmail({
  invoiceNumber,
  clientName,
  totalDisplay,
  txid,
  mempoolUrl,
  dashboardUrl,
}: PaymentConfirmedProps) {
  const label = invoiceNumber ? `Invoice ${invoiceNumber}` : "Your invoice";
  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: "system-ui, -apple-system, sans-serif", backgroundColor: "#f6f6f6", padding: "24px" }}>
        <Container style={{ backgroundColor: "#ffffff", padding: "32px", borderRadius: "8px", maxWidth: "560px" }}>
          <Heading style={{ fontSize: "20px", margin: "0 0 16px" }}>Payment confirmed</Heading>
          <Text>{label} from {clientName} — <strong>{totalDisplay}</strong> is now confirmed on-chain.</Text>
          <Section style={{ margin: "20px 0" }}>
            <Link href={mempoolUrl}>View transaction on mempool.space</Link>
          </Section>
          <Text style={{ fontSize: "12px", color: "#666", wordBreak: "break-all" }}>Txid: {txid}</Text>
          <Hr />
          <Section>
            <Link href={dashboardUrl}>Open in Paybitty</Link>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
