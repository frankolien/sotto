import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/persistence/session_store.dart';
import '../../../payouts/domain/entities/role.dart';

/// Onboarding (set up the rail) → sign in as an identity → the running app.
enum AppPhase { onboarding, signIn, app }

/// Every routable screen. Role homes + the payer sub-flow + Account.
enum AppScreen {
  payerHome,
  mandate,
  review,
  settling,
  done,
  recipientHome,
  auditorHome,
  approverHome,
  account,
}

AppScreen homeFor(Role role) => switch (role) {
      Role.payer => AppScreen.payerHome,
      Role.recipient => AppScreen.recipientHome,
      Role.auditor => AppScreen.auditorHome,
      Role.approver => AppScreen.approverHome,
    };

/// Direction of the last navigation, for slide transitions.
enum NavDir { forward, back }

class ShellState {
  final AppPhase phase;
  final Role role;
  final AppScreen screen;
  final List<AppScreen> stack;
  final bool rolesOpen;
  final bool ledgerOpen;
  final String? toast;
  final NavDir dir;

  const ShellState({
    this.phase = AppPhase.onboarding,
    this.role = Role.payer,
    this.screen = AppScreen.payerHome,
    this.stack = const [],
    this.rolesOpen = false,
    this.ledgerOpen = false,
    this.toast,
    this.dir = NavDir.forward,
  });

  bool get canBack => stack.isNotEmpty;
  bool get showTabs => screen == homeFor(role) || screen == AppScreen.account;
  bool get accountTab => screen == AppScreen.account;

  ShellState copyWith({
    AppPhase? phase,
    Role? role,
    AppScreen? screen,
    List<AppScreen>? stack,
    bool? rolesOpen,
    bool? ledgerOpen,
    Object? toast = _sentinel,
    NavDir? dir,
  }) =>
      ShellState(
        phase: phase ?? this.phase,
        role: role ?? this.role,
        screen: screen ?? this.screen,
        stack: stack ?? this.stack,
        rolesOpen: rolesOpen ?? this.rolesOpen,
        ledgerOpen: ledgerOpen ?? this.ledgerOpen,
        toast: identical(toast, _sentinel) ? this.toast : toast as String?,
        dir: dir ?? this.dir,
      );

  static const _sentinel = Object();
}

/// Pure navigation / role / phase / toast. Holds no ledger data — screens read
/// the ledger from [ledgerControllerProvider] and the lens from here.
class ShellController extends Notifier<ShellState> {
  int _toastToken = 0;
  late final SessionStore _store;

  @override
  ShellState build() {
    _store = ref.read(sessionStoreProvider);
    // Dev entry point: `--dart-define=start=app|signin` boots straight in.
    const start = String.fromEnvironment('start');
    if (start == 'app') return const ShellState(phase: AppPhase.app);
    if (start == 'signin') return const ShellState(phase: AppPhase.signIn);
    // Otherwise reopen where you left off (persisted across restarts).
    final roleName = _store.signedInRole;
    if (roleName != null) {
      final role = Role.values.asNameMap()[roleName] ?? Role.payer;
      return ShellState(phase: AppPhase.app, role: role, screen: homeFor(role));
    }
    if (_store.onboarded) return const ShellState(phase: AppPhase.signIn);
    return const ShellState();
  }

  void go(AppScreen s) => state = state.copyWith(
        screen: s,
        stack: [...state.stack, state.screen],
        dir: NavDir.forward,
      );

  void back() {
    if (state.stack.isEmpty) return;
    final stack = [...state.stack];
    final prev = stack.removeLast();
    state = state.copyWith(screen: prev, stack: stack, dir: NavDir.back);
  }

  void setRole(Role r) => state = state.copyWith(
        role: r,
        screen: homeFor(r),
        stack: const [],
        rolesOpen: false,
        dir: NavDir.forward,
      );

  void selectTab({required bool account}) => state = state.copyWith(
        screen: account ? AppScreen.account : homeFor(state.role),
        stack: const [],
        dir: account ? NavDir.forward : NavDir.back,
      );

  void openRoles() => state = state.copyWith(rolesOpen: true);
  void closeRoles() => state = state.copyWith(rolesOpen: false);

  void openLedger() => state = state.copyWith(ledgerOpen: true);
  void closeLedger() => state = state.copyWith(ledgerOpen: false);

  /// Onboarding is done (rail set up, or skipped) → the sign-in screen. Also the
  /// sign-out destination: the rail's already set up, you just pick who you are.
  void toSignIn() {
    _store.markOnboarded();
    _store.signOut(); // clear any persisted identity
    state = const ShellState(phase: AppPhase.signIn);
  }

  /// Sign in as an identity → that party's wallet. Persisted, so a restart
  /// reopens straight into this session. Each session is real — the backend
  /// scopes every read and write to whoever is signed in.
  void signInAs(Role r) {
    _store.signIn(r.name);
    state = ShellState(phase: AppPhase.app, role: r, screen: homeFor(r));
  }

  /// Full restart (Reset demo): back to the very beginning — onboarding.
  void restart() {
    _store.reset();
    state = const ShellState();
  }

  /// Used after the settling animation completes.
  void completeSettle() => state = state.copyWith(
        screen: AppScreen.done,
        stack: const [AppScreen.payerHome],
        dir: NavDir.forward,
      );

  void flash(String message) {
    final token = ++_toastToken;
    state = state.copyWith(toast: message);
    Future.delayed(const Duration(milliseconds: 2200), () {
      if (_toastToken == token) state = state.copyWith(toast: null);
    });
  }
}

final shellControllerProvider =
    NotifierProvider<ShellController, ShellState>(ShellController.new);
