import '../../domain/entities/ledger_state.dart';
import '../../domain/entities/rail_config.dart';
import '../../domain/entities/role.dart';
import '../../domain/repositories/ledger_repository.dart';

/// Offline stand-in for the backend. Holds the full batch and projects it
/// per-role exactly as the server does (recipient sees only their own line,
/// approver only the over-threshold lines), so the privacy behaves the same
/// without a running Canton node. Enable with --dart-define=USE_MOCK=true.
class MockLedgerRepository implements LedgerRepository {
  LedgerState _state = LedgerState.seed();

  Future<T> _async<T>(T value) =>
      Future.delayed(const Duration(milliseconds: 80), () => value);

  @override
  Future<void> configure(RailConfig c) async {
    final lines = [
      for (var i = 0; i < c.recipients.length; i++)
        PayoutLine(
          id: 'r${i + 1}',
          name: c.recipients[i].name,
          role: c.recipients[i].role,
          handle: '',
          amount: c.recipients[i].amount,
          you: i == 0, // the Recipient lens follows the first payee
          big: c.recipients[i].amount > c.threshold,
        ),
    ];
    _state = LedgerState(
      treasury: c.treasury,
      org: c.org,
      recipientName: lines.isEmpty ? '' : lines.first.name,
      mandate: Mandate(
        name: _state.mandate.name,
        cap: c.cap,
        threshold: c.threshold,
        approver: c.approver,
        approverRole: c.approverRole,
        auditor: c.auditor,
        auditorRole: c.auditorRole,
        recipients: lines.length,
      ),
      batch: Batch(
        id: _state.batch.id,
        label: _state.batch.label,
        status: BatchStatus.draft,
        lines: lines,
      ),
    );
    await _async(null);
  }

  @override
  Future<void> settle() async {
    var paid = 0.0;
    final lines = _state.batch.lines.map((l) {
      if (_state.isOver(l)) return l.copyWith(status: LineStatus.pending);
      paid += l.amount;
      return l.copyWith(status: LineStatus.settled);
    }).toList();
    _state = _state.copyWith(
      treasury: _state.treasury - paid,
      batch: _state.batch.copyWith(status: BatchStatus.settled, lines: lines),
    );
    await _async(null);
  }

  @override
  Future<void> approve(String lineId) => _setStatus(lineId, LineStatus.settled, debit: true);

  @override
  Future<void> reject(String lineId) => _setStatus(lineId, LineStatus.rejected);

  Future<void> _setStatus(String lineId, LineStatus status, {bool debit = false}) async {
    final lines = _state.batch.lines.toList();
    final i = lines.indexWhere((l) => l.id == lineId);
    if (i >= 0 && lines[i].status == LineStatus.pending) {
      if (debit) _state = _state.copyWith(treasury: _state.treasury - lines[i].amount);
      lines[i] = lines[i].copyWith(status: status);
      _state = _state.copyWith(batch: _state.batch.copyWith(lines: lines));
    }
    await _async(null);
  }

  @override
  Future<void> reset() async {
    _state = LedgerState.seed();
    await _async(null);
  }

  @override
  Future<LedgerState> stateFor(Role role) async {
    final s = _state;
    List<PayoutLine> lines;
    switch (role) {
      case Role.payer:
      case Role.auditor:
        lines = s.batch.lines;
      case Role.approver:
        lines = s.batch.lines.where(s.isOver).toList();
      case Role.recipient:
        final mine = s.batch.lines.where((l) => l.you).toList();
        lines = mine.isNotEmpty && mine.first.status == LineStatus.settled ? mine : [];
    }
    final visible = role != Role.recipient;
    return _async(LedgerState(
      treasury: role == Role.payer ? s.treasury : 0,
      org: s.org,
      recipientName: s.recipientName,
      mandate: visible
          ? s.mandate
          : const Mandate(
              name: '', cap: 0, threshold: 0, approver: '', approverRole: '',
              auditor: '', auditorRole: '', recipients: 0),
      batch: Batch(id: s.batch.id, label: s.batch.label, status: s.batch.status, lines: lines),
    ));
  }
}
