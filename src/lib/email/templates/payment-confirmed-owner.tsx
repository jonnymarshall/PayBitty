import { Html, Head, Body, Container, Heading, Text, Link, Section, Hr } from "@react-email/components";

export interface PaymentConfirmedOwnerProps {
  invoiceNumber: string | null;
  clientName: string;
  totalDisplay: string;
  txid: string;
  mempoolUrl: string;
  dashboardUrl: string;
}

export function PaymentConfirmedOwnerEmail({
  invoiceNumber,
  clientName,
  totalDisplay,
  txid,
  mempoolUrl,
  dashboardUrl,
}: PaymentConfirmedOwnerProps) {
  const label = invoiceNumber ? `Invoice ${invoiceNumber}` : "Your invoice";
  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: "system-ui, -apple-system, sans-serif", backgroundColor: "#f6f6f6", padding: "24px" }}>
        <Container style={{ backgroundColor: "#ffffff", padding: "32px", borderRadius: "8px", maxWidth: "560px" }}>
          <Heading style={{ fontSize: "20px", margin: "0 0 16px" }}>Payment confirmed for {label}</Heading>
          <Text>{clientName}&apos;s payment of <strong>{totalDisplay}</strong> for {label} is now confirmed on-chain.</Text>
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
