import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// On-device persistence of the app session: whether onboarding is done, and who
/// you're signed in as. Survives hot-restart and app kill, so the app reopens
/// where you left it instead of dropping you back at onboarding.
///
/// The role is stored as a plain string (no domain import) — the shell maps it
/// back to a Role. The default (no SharedPreferences) is an in-memory no-op, so
/// tests start clean without touching the platform.
class SessionStore {
  final SharedPreferences? _p;
  const SessionStore([this._p]);

  static const _kOnboarded = 'sotto.onboarded';
  static const _kRole = 'sotto.role';

  bool get onboarded => _p?.getBool(_kOnboarded) ?? false;
  String? get signedInRole => _p?.getString(_kRole);

  void markOnboarded() => _p?.setBool(_kOnboarded, true);

  void signIn(String role) {
    _p?.setBool(_kOnboarded, true);
    _p?.setString(_kRole, role);
  }

  void signOut() => _p?.remove(_kRole);

  void reset() {
    _p?.remove(_kRole);
    _p?.remove(_kOnboarded);
  }
}

/// Overridden in main() with a SharedPreferences-backed store. The default is an
/// in-memory no-op (used by tests, which then start at onboarding).
final sessionStoreProvider = Provider<SessionStore>((ref) => const SessionStore());
