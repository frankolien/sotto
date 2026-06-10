import 'activity.dart';

/// Settlement lifecycle of a single payout line.
enum LineStatus { draft, settled, pending, rejected }

extension LineStatusX on LineStatus {
  String get label => switch (this) {
        LineStatus.settled => 'Settled',
        LineStatus.pending => 'Held · approval',
        LineStatus.rejected => 'Rejected',
        LineStatus.draft => 'Queued',
      };
}

/// One recipient line in a batch.
class PayoutLine {
  final String id;
  final String name;
  final String role; // the contributor's job (e.g. "Sound design")
  final String handle;
  final double amount;
  final LineStatus status;
  final bool you; // the recipient the demo's Recipient lens represents
  final bool big; // flagged over-threshold in the seed

  const PayoutLine({
    required this.id,
    required this.name,
    required this.role,
    required this.handle,
    required this.amount,
    this.status = LineStatus.draft,
    this.you = false,
    this.big = false,
  });

  PayoutLine copyWith({LineStatus? status}) => PayoutLine(
        id: id,
        name: name,
        role: role,
        handle: handle,
        amount: amount,
        status: status ?? this.status,
        you: you,
        big: big,
      );
}

/// The on-ledger spending authority. Cap, threshold and allow-list are enforced
/// by the contract, not the app.
class Mandate {
  final String name;
  final double cap; // per cycle
  final double threshold; // above this → approver sign-off
  final String approver;
  final String approverRole;
  final String auditor;
  final String auditorRole;
  final int recipients;

  const Mandate({
    required this.name,
    required this.cap,
    required this.threshold,
    required this.approver,
    required this.approverRole,
    required this.auditor,
    required this.auditorRole,
    required this.recipients,
  });

  Mandate copyWith({
    double? cap,
    double? threshold,
    String? approver,
    String? approverRole,
    String? auditor,
    String? auditorRole,
  }) =>
      Mandate(
        name: name,
        cap: cap ?? this.cap,
        threshold: threshold ?? this.threshold,
        approver: approver ?? this.approver,
        approverRole: approverRole ?? this.approverRole,
        auditor: auditor ?? this.auditor,
        auditorRole: auditorRole ?? this.auditorRole,
        recipients: recipients,
      );
}

enum BatchStatus { draft, settled }

/// A batch of payout lines that settles atomically.
class Batch {
  final String id;
  final String label;
  final BatchStatus status;
  final List<PayoutLine> lines;

  const Batch({
    required this.id,
    required this.label,
    required this.status,
    required this.lines,
  });

  double get total => lines.fold(0, (a, l) => a + l.amount);

  Batch copyWith({BatchStatus? status, List<PayoutLine>? lines}) => Batch(
        id: id,
        label: label,
        status: status ?? this.status,
        lines: lines ?? this.lines,
      );
}

/// The single shared state every role views differently. Privacy is the
/// asymmetry of what each role is allowed to read off this one object.
class LedgerState {
  final double treasury;
  final String org;
  final String recipientName; // identity the Recipient lens represents
  final Mandate mandate;
  final Batch batch;

  const LedgerState({
    required this.treasury,
    required this.org,
    required this.mandate,
    required this.batch,
    this.recipientName = '',
  });

  /// A line needs a second signer when it exceeds the mandate threshold.
  bool isOver(PayoutLine line) => line.amount > mandate.threshold;

  /// Cap usage across the cycle = settled + pending in this batch.
  double get cycleUsed => batch.lines
      .where((l) => l.status == LineStatus.settled || l.status == LineStatus.pending)
      .fold(0, (a, l) => a + l.amount);

  LedgerState copyWith({
    double? treasury,
    String? org,
    String? recipientName,
    Mandate? mandate,
    Batch? batch,
  }) =>
      LedgerState(
        treasury: treasury ?? this.treasury,
        org: org ?? this.org,
        recipientName: recipientName ?? this.recipientName,
        mandate: mandate ?? this.mandate,
        batch: batch ?? this.batch,
      );

  /// The seed scenario: one batch where five lines auto-settle and one exceeds
  /// the threshold and is held for a second signer.
  static LedgerState seed() => const LedgerState(
        treasury: 312480,
        org: 'Lumen Studio',
        recipientName: 'Amara Okafor',
        mandate: Mandate(
          name: 'Contributor roster',
          cap: 200000,
          threshold: 25000,
          approver: 'Priya Raman',
          approverRole: 'Finance lead',
          auditor: 'Hale & Co.',
          auditorRole: 'External audit',
          recipients: 6,
        ),
        batch: Batch(
          id: 'BX-4471',
          label: 'May contributor payout',
          status: BatchStatus.draft,
          lines: [
            PayoutLine(id: 'r1', name: 'Amara Okafor', role: 'Sound design', handle: 'amara.lumen', amount: 4200, you: true),
            PayoutLine(id: 'r2', name: 'Tobi Adeyemi', role: 'Motion', handle: 'tobi.lumen', amount: 3850),
            PayoutLine(id: 'r3', name: 'Chen Wei', role: 'Edit', handle: 'chen.lumen', amount: 5500),
            PayoutLine(id: 'r4', name: 'Diego Marquez', role: 'Color', handle: 'diego.lumen', amount: 2900),
            PayoutLine(id: 'r5', name: 'Fatima Bello', role: 'Production', handle: 'fatima.lumen', amount: 4100),
            PayoutLine(id: 'r6', name: 'Kwame Nyong', role: 'Score · milestone', handle: 'kwame.lumen', amount: 32000, big: true),
          ],
        ),
      );

  /// Seeded activity so each wallet feed feels lived-in.
  static const List<ActivityGroup> payerHistory = [
    ActivityGroup(day: '12 Oct 2025', rows: [
      ActivityItem(name: 'Tobi Adeyemi', sub: 'Contractor payout', amount: 3850, dir: ActivityDir.out),
      ActivityItem(name: 'Chen Wei', sub: 'Contractor payout', amount: 5500, dir: ActivityDir.out),
    ]),
    ActivityGroup(day: '28 Sep 2025', rows: [
      ActivityItem(name: 'Treasury top-up', sub: 'USDCx deposit', amount: 250000, dir: ActivityDir.income),
      ActivityItem(name: 'Diego Marquez', sub: 'Contractor payout', amount: 2900, dir: ActivityDir.out),
    ]),
  ];

  static const List<ActivityGroup> recipientHistory = [
    ActivityGroup(day: '14 May 2025', rows: [
      ActivityItem(name: 'Lumen Studio', sub: 'April payout · Sound design', amount: 3900, dir: ActivityDir.income),
    ]),
    ActivityGroup(day: '02 Apr 2025', rows: [
      ActivityItem(name: 'Lumen Studio', sub: 'March payout · Sound design', amount: 3600, dir: ActivityDir.income),
    ]),
  ];
}
