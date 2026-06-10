/// One payee in the editable roster. Each becomes its own Canton party.
class RailRecipient {
  final String name;
  final String role;
  final double amount;

  const RailRecipient({required this.name, required this.role, required this.amount});

  RailRecipient copyWith({String? name, String? role, double? amount}) => RailRecipient(
        name: name ?? this.name,
        role: role ?? this.role,
        amount: amount ?? this.amount,
      );
}

/// The configuration the onboarding flow writes into the live rail. Keeping it a
/// payouts-domain value object means onboarding depends on payouts (it sets the
/// rail up), not the other way around.
class RailConfig {
  final String org;
  final double treasury;
  final double cap;
  final double threshold;
  final String approver;
  final String approverRole;
  final String auditor;
  final String auditorRole;
  final List<RailRecipient> recipients;

  const RailConfig({
    required this.org,
    required this.treasury,
    required this.cap,
    required this.threshold,
    required this.approver,
    required this.approverRole,
    required this.auditor,
    required this.auditorRole,
    this.recipients = const [],
  });
}
