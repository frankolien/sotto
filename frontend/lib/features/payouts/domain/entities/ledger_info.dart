/// The raw ledger truth for the signed-in party — its on-chain identity, the
/// live ledger position, and the actual contracts it holds. Surfaced so the
/// numbers read as real on-ledger objects, not arbitrary digits.
class ContractRef {
  final String template; // Holding | PayoutMandate | LargePaymentProposal | DisbursementReceipt
  final String cid; // the on-ledger contract id
  final double? amount;
  final String label;
  const ContractRef({
    required this.template,
    required this.cid,
    required this.amount,
    required this.label,
  });
}

class LedgerInfo {
  final String party; // full Canton party id
  final int offset; // current ledger offset (live position)
  final List<ContractRef> contracts;
  const LedgerInfo({required this.party, required this.offset, required this.contracts});

  static const empty = LedgerInfo(party: '', offset: 0, contracts: []);
}
