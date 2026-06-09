import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../payouts/domain/entities/role.dart';

/// First-run vs the running app.
enum AppPhase { onboarding, app }

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
  final String? toast;
  final NavDir dir;

  const ShellState({
    this.phase = AppPhase.onboarding,
    this.role = Role.payer,
    this.screen = AppScreen.payerHome,
    this.stack = const [],
    this.rolesOpen = false,
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
    Object? toast = _sentinel,
    NavDir? dir,
  }) =>
      ShellState(
        phase: phase ?? this.phase,
        role: role ?? this.role,
        screen: screen ?? this.screen,
        stack: stack ?? this.stack,
        rolesOpen: rolesOpen ?? this.rolesOpen,
        toast: identical(toast, _sentinel) ? this.toast : toast as String?,
        dir: dir ?? this.dir,
      );

  static const _sentinel = Object();
}

/// Pure navigation / role / phase / toast. Holds no ledger data — screens read
/// the ledger from [ledgerControllerProvider] and the lens from here.
class ShellController extends Notifier<ShellState> {
  int _toastToken = 0;

  @override
  ShellState build() {
    // Dev entry point: `--dart-define=start=app` boots straight into the wallet,
    // skipping onboarding. Default (no define) shows onboarding.
    const start = String.fromEnvironment('start');
    if (start == 'app') return const ShellState(phase: AppPhase.app);
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

  void enterApp() => state = state.copyWith(
        phase: AppPhase.app,
        role: Role.payer,
        screen: AppScreen.payerHome,
        stack: const [],
        dir: NavDir.forward,
      );

  void toOnboarding() => state = const ShellState(phase: AppPhase.onboarding);

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
