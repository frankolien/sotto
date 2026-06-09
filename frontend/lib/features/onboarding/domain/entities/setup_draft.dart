import '../../../payouts/domain/entities/rail_config.dart';

/// Named candidates for the approver / auditor steps.
class NamedParty {
  final String name;
  final String role;
  const NamedParty(this.name, this.role);
}

const kApprovers = <NamedParty>[
  NamedParty('Priya Raman', 'Finance lead'),
  NamedParty('Daniel Cole', 'Operations lead'),
  NamedParty('Mei Lin', 'Controller'),
];

const kAuditors = <NamedParty>[
  NamedParty('Hale & Co.', 'External audit'),
  NamedParty('Brightford LLP', 'External audit'),
];

/// The wizard's working config. Maps to a [RailConfig] on finish.
class SetupDraft {
  final String org;
  final double treasury;
  final double cap;
  final double threshold;
  final String approver;
  final String approverRole;
  final String auditor;
  final String auditorRole;

  const SetupDraft({
    this.org = 'Lumen Studio',
    this.treasury = 500000,
    this.cap = 200000,
    this.threshold = 25000,
    this.approver = 'Priya Raman',
    this.approverRole = 'Finance lead',
    this.auditor = 'Hale & Co.',
    this.auditorRole = 'External audit',
  });

  SetupDraft copyWith({
    String? org,
    double? treasury,
    double? cap,
    double? threshold,
    String? approver,
    String? approverRole,
    String? auditor,
    String? auditorRole,
  }) =>
      SetupDraft(
        org: org ?? this.org,
        treasury: treasury ?? this.treasury,
        cap: cap ?? this.cap,
        threshold: threshold ?? this.threshold,
        approver: approver ?? this.approver,
        approverRole: approverRole ?? this.approverRole,
        auditor: auditor ?? this.auditor,
        auditorRole: auditorRole ?? this.auditorRole,
      );

  RailConfig toRailConfig() => RailConfig(
        org: org,
        treasury: treasury,
        cap: cap,
        threshold: threshold,
        approver: approver,
        approverRole: approverRole,
        auditor: auditor,
        auditorRole: auditorRole,
      );
}
