// Maps the backend JSON (which mirrors the LedgerState DTOs) to/from pure domain
// entities. Keeping this in the data layer leaves the domain free of JSON.

import '../domain/entities/activity.dart';
import '../domain/entities/ledger_info.dart';
import '../domain/entities/ledger_state.dart';
import '../domain/entities/rail_config.dart';

LedgerState ledgerStateFromJson(Map<String, dynamic> j) => LedgerState(
      treasury: (j['treasury'] as num).toDouble(),
      org: j['org'] as String,
      recipientName: j['recipientName'] as String? ?? '',
      mandate: _mandateFromJson(j['mandate'] as Map<String, dynamic>),
      batch: _batchFromJson(j['batch'] as Map<String, dynamic>),
      activity: _activityFromJson(j['activity'] as List? ?? const []),
    );

List<ActivityEntry> _activityFromJson(List raw) => raw.map((e) {
      final m = e as Map<String, dynamic>;
      return ActivityEntry(
        name: m['name'] as String,
        sub: m['sub'] as String,
        amount: (m['amount'] as num).toDouble(),
        income: m['dir'] == 'in',
        at: DateTime.tryParse(m['at'] as String? ?? '') ?? DateTime.fromMillisecondsSinceEpoch(0),
        cid: m['cid'] as String? ?? '',
      );
    }).toList();

Mandate _mandateFromJson(Map<String, dynamic> j) => Mandate(
      name: j['name'] as String,
      cap: (j['cap'] as num).toDouble(),
      threshold: (j['threshold'] as num).toDouble(),
      approver: j['approver'] as String,
      approverRole: j['approverRole'] as String,
      auditor: j['auditor'] as String,
      auditorRole: j['auditorRole'] as String,
      recipients: (j['recipients'] as num).toInt(),
    );

Batch _batchFromJson(Map<String, dynamic> j) => Batch(
      id: j['id'] as String,
      label: j['label'] as String,
      status: BatchStatus.values.byName(j['status'] as String),
      lines: (j['lines'] as List)
          .map((e) => _lineFromJson(e as Map<String, dynamic>))
          .toList(),
    );

PayoutLine _lineFromJson(Map<String, dynamic> j) => PayoutLine(
      id: j['id'] as String,
      name: j['name'] as String,
      role: j['role'] as String,
      handle: j['handle'] as String? ?? '',
      amount: (j['amount'] as num).toDouble(),
      status: LineStatus.values.byName(j['status'] as String),
      you: j['you'] as bool? ?? false,
      big: j['big'] as bool? ?? false,
    );

LedgerInfo ledgerInfoFromJson(Map<String, dynamic> j) => LedgerInfo(
      party: j['party'] as String,
      offset: (j['offset'] as num).toInt(),
      contracts: (j['contracts'] as List)
          .map((e) => ContractRef(
                template: e['template'] as String,
                cid: e['cid'] as String,
                amount: (e['amount'] as num?)?.toDouble(),
                label: e['label'] as String,
              ))
          .toList(),
    );

Map<String, dynamic> railConfigToJson(RailConfig c) => {
      'org': c.org,
      'treasury': c.treasury,
      'cap': c.cap,
      'threshold': c.threshold,
      'approver': c.approver,
      'approverRole': c.approverRole,
      'auditor': c.auditor,
      'auditorRole': c.auditorRole,
      'recipients': [
        for (final r in c.recipients) {'name': r.name, 'role': r.role, 'amount': r.amount},
      ],
    };
