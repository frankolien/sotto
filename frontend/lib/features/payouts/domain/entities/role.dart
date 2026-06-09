/// The four vantage points on a single payout batch. Switching role does not
/// change the data — it changes *who is looking*, and the rail reveals only what
/// that party is entitled to see. That asymmetry is the product.
enum Role { payer, recipient, auditor, approver }

extension RoleX on Role {
  String get label => switch (this) {
        Role.payer => 'Payer',
        Role.recipient => 'Recipient',
        Role.auditor => 'Auditor',
        Role.approver => 'Approver',
      };

  /// One line on what this role is allowed to see.
  String get sees => switch (this) {
        Role.payer => 'Runs mandates and payout batches.',
        Role.recipient => 'Sees only their own payment.',
        Role.auditor => 'Sees every receipt in the batch.',
        Role.approver => 'Signs off payments over threshold.',
      };

  /// Icon used in the role-switch sheet.
  String get iconName => switch (this) {
        Role.payer => 'building',
        Role.recipient => 'arrowdown',
        Role.auditor => 'eye',
        Role.approver => 'shield',
      };
}
