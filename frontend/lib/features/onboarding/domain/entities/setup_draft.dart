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

/// The roster the wizard starts from — editable, and the same set the backend
/// falls back to, so walking the wizard and skipping it land on the same demo.
/// One line (the score milestone) sits over the default threshold to exercise
/// the maker-checker approval path.
const kDefaultRoster = <RailRecipient>[
  RailRecipient(name: 'Amara Okafor', role: 'Sound design', amount: 4200),
  RailRecipient(name: 'Tobi Adeyemi', role: 'Motion', amount: 3850),
  RailRecipient(name: 'Chen Wei', role: 'Edit', amount: 5500),
  RailRecipient(name: 'Diego Marquez', role: 'Color', amount: 2900),
  RailRecipient(name: 'Fatima Bello', role: 'Production', amount: 4100),
  RailRecipient(name: 'Kwame Nyong', role: 'Score · milestone', amount: 32000),
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
  final List<RailRecipient> recipients;

  const SetupDraft({
    this.org = 'Lumen Studio',
    this.treasury = 312480, // matches the backend's seeded treasury (skip == wizard)
    this.cap = 200000,
    this.threshold = 25000,
    this.approver = 'Priya Raman',
    this.approverRole = 'Finance lead',
    this.auditor = 'Hale & Co.',
    this.auditorRole = 'External audit',
    this.recipients = kDefaultRoster,
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
    List<RailRecipient>? recipients,
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
        recipients: recipients ?? this.recipients,
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
        recipients: recipients,
      );
}
