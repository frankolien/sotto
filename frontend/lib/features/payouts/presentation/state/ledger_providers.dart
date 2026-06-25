import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/config.dart';
import '../../../shell/presentation/state/shell_providers.dart';
import '../../data/repositories/http_ledger_repository.dart';
import '../../data/repositories/mock_ledger_repository.dart';
import '../../domain/entities/ledger_info.dart';
import '../../domain/entities/ledger_state.dart';
import '../../domain/entities/rail_config.dart';
import '../../domain/entities/role.dart';
import '../../domain/repositories/ledger_repository.dart';

/// The active rail: the real backend (REST over Canton's JSON Ledger API) by
/// default, or the in-memory mock with --dart-define=USE_MOCK=true.
final ledgerRepositoryProvider = Provider<LedgerRepository>((ref) {
  return AppConfig.useMock
      ? MockLedgerRepository()
      : HttpLedgerRepository(AppConfig.backendBaseUrl);
});

/// The role currently being viewed (drives which party's state we fetch).
final currentRoleProvider = Provider<Role>(
  (ref) => ref.watch(shellControllerProvider.select((s) => s.role)),
);

/// Live connection to the ledger. `live` = talking to the real backend (vs the
/// in-memory mock); `tick` increments on every successful sync (drives the
/// badge's heartbeat). The UI reads this to show "Live · Canton".
class SyncStatus {
  final bool live;
  final bool connected;
  final int tick;
  const SyncStatus({this.live = false, this.connected = false, this.tick = 0});
}

class SyncStatusController extends Notifier<SyncStatus> {
  @override
  SyncStatus build() => const SyncStatus();

  void mark({required bool live, required bool connected}) {
    state = SyncStatus(
      live: live,
      connected: connected,
      tick: connected ? state.tick + 1 : state.tick,
    );
  }
}

final syncStatusProvider =
    NotifierProvider<SyncStatusController, SyncStatus>(SyncStatusController.new);

/// Holds the ledger state *as seen by the current role*. Refetches whenever the
/// role changes, so switching lenses shows exactly what that party can see.
class LedgerController extends Notifier<LedgerState> {
  late final LedgerRepository _repo;
  Timer? _poll;

  @override
  LedgerState build() {
    _repo = ref.watch(ledgerRepositoryProvider);
    ref.listen<Role>(currentRoleProvider, (_, role) => _load(role));
    Future.microtask(() => _load(ref.read(currentRoleProvider)));
    // Real-time: poll the ledger so balances/activity move on their own — settle
    // a batch and watch a recipient's balance appear. Only against the real
    // backend; the mock changes solely via local actions (and a periodic timer
    // would hang `pumpAndSettle` in tests).
    if (_repo is HttpLedgerRepository) {
      _poll = Timer.periodic(const Duration(seconds: 3), (_) => _reloadCurrent());
      ref.onDispose(() => _poll?.cancel());
    }
    return LedgerState.seed(); // placeholder until the first fetch returns
  }

  Future<void> _load(Role role) async {
    try {
      state = await _repo.stateFor(role);
      _mark(connected: true);
    } catch (_) {
      // keep the last good state; a transient backend hiccup shouldn't blank the UI
      _mark(connected: false);
    }
  }

  void _mark({required bool connected}) {
    ref.read(syncStatusProvider.notifier).mark(
          live: _repo is HttpLedgerRepository,
          connected: connected,
        );
  }

  Future<void> _reloadCurrent() => _load(ref.read(currentRoleProvider));

  Future<void> configure(RailConfig config) async {
    await _repo.configure(config);
    await _reloadCurrent();
  }

  Future<void> settle() async {
    await _repo.settle();
    await _reloadCurrent();
  }

  Future<void> approve(String lineId) async {
    await _repo.approve(lineId);
    await _reloadCurrent();
  }

  Future<void> reject(String lineId) async {
    await _repo.reject(lineId);
    await _reloadCurrent();
  }

  Future<void> reset() async {
    await _repo.reset();
    await _reloadCurrent();
  }
}

final ledgerControllerProvider =
    NotifierProvider<LedgerController, LedgerState>(LedgerController.new);

/// The raw ledger detail (party id, offset, contracts) for the current role —
/// fetched on demand when the "On ledger" sheet opens.
final ledgerInfoProvider = FutureProvider.autoDispose<LedgerInfo>((ref) async {
  final repo = ref.watch(ledgerRepositoryProvider);
  final role = ref.watch(currentRoleProvider);
  return repo.ledgerInfo(role);
});
