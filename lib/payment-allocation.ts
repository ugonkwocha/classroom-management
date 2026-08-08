export function allocateConfirmedAmount(totalAmount: unknown, itemCount: number) {
  const numericAmount = typeof totalAmount === 'number' ? totalAmount : Number(totalAmount);
  const confirmedAmount = Number.isFinite(numericAmount) && numericAmount >= 0
    ? Math.round(numericAmount)
    : 0;

  if (!Number.isInteger(itemCount) || itemCount < 1) {
    throw new Error('At least one paid enrollment item is required');
  }

  if (confirmedAmount < itemCount) {
    throw new Error('Confirmed amount is too small to allocate across the selected enrollments');
  }

  const baseAmount = Math.floor(confirmedAmount / itemCount);
  const remainder = confirmedAmount % itemCount;

  return Array.from(
    { length: itemCount },
    (_, index) => baseAmount + (index < remainder ? 1 : 0)
  );
}
