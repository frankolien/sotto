import '../entities/ledger_info.dart';
import '../entities/ledger_state.dart';
import '../entities/rail_config.dart';
import '../entities/role.dart';

/// The boundary between the app and the rail. `stateFor` returns the ledger as
/// seen *by that role* — for the real backend that means a per-party ACS query,
/// so the privacy is Canton's, enforced on the server, not trusted on the client.
abstract interface class LedgerRepository {
  Future<LedgerState> stateFor(Role role);
  Future<LedgerInfo> ledgerInfo(Role role);
  Future<void> configure(RailConfig config);
  Future<void> settle();
  Future<void> approve(String lineId);
  Future<void> reject(String lineId);
  Future<void> reset();
}
