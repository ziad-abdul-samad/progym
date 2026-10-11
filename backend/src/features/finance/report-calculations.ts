// Minor units only. Opening balances are NOT new income; owner draws are NOT expenses.
export function reportDistribution(
  branchCode: string,
  clubNetMinor: number,
  barNetMinor: number,
  ownerWithdrawalMinor: number,
) {
  const baseMinor = Math.max(0, clubNetMinor);
  const fixedMinor = branchCode === 'b3' ? Math.round((baseMinor * 3) / 100) : 0;
  const combinedNetMinor = clubNetMinor + barNetMinor;
  const remainingMinor = combinedNetMinor - fixedMinor - ownerWithdrawalMinor;
  const halfMinor = Math.trunc(remainingMinor / 2),
    roundingMinor = remainingMinor - 2 * halfMinor;
  return {
    combinedNetMinor,
    fixedBaseMinor: baseMinor,
    fixedMinor,
    remainingMinor,
    halfMinor,
    roundingMinor,
  };
}
