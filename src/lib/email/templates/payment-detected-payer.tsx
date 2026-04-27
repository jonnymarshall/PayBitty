import { Html, Head, Body, Container, Heading, Text, Link, Section, Hr } from "@react-email/components";

export interface PaymentDetectedPayerProps {
  invoiceNumber: string | null;
  senderName: string;
  totalDisplay: string;
  txid: string;
  mempoolUrl: string;
  invoiceUrl: string;
}

export function PaymentDetectedPayerEmail({
  invoiceNumber,
  senderName,
  totalDisplay,
  txid,
  mempoolUrl,
  invoiceUrl,
}: PaymentDetectedPayerProps) {
  const label = invoiceNumber ? `invoice ${invoiceNumber}` : "the invoice";
  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: "system-ui, -apple-system, sans-serif", backgroundColor: "#f6f6f6", padding: "24px" }}>
        <Container style={{ backgroundColor: "#ffffff", padding: "32px", borderRadius: "8px", maxWidth: "560px" }}>
          <Heading style={{ fontSize: "20px", margin: "0 0 16px" }}>Your payment has been detected</Heading>
          <Text>Your payment of <strong>{totalDisplay}</strong> to {senderName} for {label} has been broadcast to the Bitcoin network.</Text>
          <Text>The transaction is currently unconfirmed. You&apos;ll get another email once it confirms on-chain.</Text>
          <Section style={{ margin: "20px 0" }}>
            <Link href={mempoolUrl}>View transaction on mempool.space</Link>
          </Section>
          <Text style={{ fontSize: "12px", color: "#666", wordBreak: "break-all" }}>Txid: {txid}</Text>
          <Hr />
          <Section>
            <Link href={invoiceUrl}>View invoice</Link>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
