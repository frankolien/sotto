import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/config.dart';
import '../../../shell/presentation/state/shell_providers.dart';
import '../../data/repositories/http_ledger_repository.dart';
import '../../data/repositories/mock_ledger_repository.dart';
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

/// Holds the ledger state *as seen by the current role*. Refetches whenever the
/// role changes, so switching lenses shows exactly what that party can see.
class LedgerController extends Notifier<LedgerState> {
  late final LedgerRepository _repo;

  @override
  LedgerState build() {
    _repo = ref.watch(ledgerRepositoryProvider);
    ref.listen<Role>(currentRoleProvider, (_, role) => _load(role));
    Future.microtask(() => _load(ref.read(currentRoleProvider)));
    return LedgerState.seed(); // placeholder until the first fetch returns
  }

  Future<void> _load(Role role) async {
    try {
      state = await _repo.stateFor(role);
    } catch (_) {
      // keep the last good state; a transient backend hiccup shouldn't blank the UI
    }
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
