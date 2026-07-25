export function calculateQuoteTotals(
  lines: { qty: number; priceHt: number; vatRate: number }[]
) {
  const amountHt = lines.reduce((acc, line) => acc + line.qty * line.priceHt, 0);
  const vatAmount = lines.reduce(
    (acc, line) => acc + line.qty * line.priceHt * (line.vatRate / 100),
    0
  );
  const amountTtc = amountHt + vatAmount;

  return {
    amountHt: Number(amountHt.toFixed(2)),
    vatAmount: Number(vatAmount.toFixed(2)),
    amountTtc: Number(amountTtc.toFixed(2)),
  };
}

export function generateSequentialInvoiceNumber(
  lastNumber: string | null,
  year: number
): string {
  if (!lastNumber) {
    return `FACT-${year}-0001`;
  }

  const parts = lastNumber.split("-");
  const sequenceStr = parts[parts.length - 1];
  const nextSeq = parseInt(sequenceStr, 10) + 1;

  const paddedSeq = String(nextSeq).padStart(4, "0");
  return `FACT-${year}-${paddedSeq}`;
}
