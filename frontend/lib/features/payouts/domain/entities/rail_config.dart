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

  const RailConfig({
    required this.org,
    required this.treasury,
    required this.cap,
    required this.threshold,
    required this.approver,
    required this.approverRole,
    required this.auditor,
    required this.auditorRole,
  });
}
