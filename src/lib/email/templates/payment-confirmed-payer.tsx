import { Html, Head, Body, Container, Heading, Text, Link, Section, Hr } from "@react-email/components";

export interface PaymentConfirmedPayerProps {
  invoiceNumber: string | null;
  senderName: string;
  totalDisplay: string;
  txid: string;
  mempoolUrl: string;
  invoiceUrl: string;
}

export function PaymentConfirmedPayerEmail({
  invoiceNumber,
  senderName,
  totalDisplay,
  txid,
  mempoolUrl,
  invoiceUrl,
}: PaymentConfirmedPayerProps) {
  const label = invoiceNumber ? `invoice ${invoiceNumber}` : "the invoice";
  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: "system-ui, -apple-system, sans-serif", backgroundColor: "#f6f6f6", padding: "24px" }}>
        <Container style={{ backgroundColor: "#ffffff", padding: "32px", borderRadius: "8px", maxWidth: "560px" }}>
          <Heading style={{ fontSize: "20px", margin: "0 0 16px" }}>Your payment is confirmed</Heading>
          <Text>Your payment of <strong>{totalDisplay}</strong> to {senderName} for {label} is now confirmed on-chain. Thanks!</Text>
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
