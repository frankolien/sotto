import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/icons/sotto_icon.dart';
import '../../../core/theme/sotto_colors.dart';
import '../../../core/widgets/wallet.dart';
import '../../onboarding/presentation/onboarding_screen.dart';
import '../../payouts/presentation/account/account_screen.dart';
import '../../payouts/presentation/approver/approver_home.dart';
import '../../payouts/presentation/auditor/auditor_home.dart';
import '../../payouts/presentation/payer/done_screen.dart';
import '../../payouts/presentation/payer/mandate_screen.dart';
import '../../payouts/presentation/payer/payer_home.dart';
import '../../payouts/presentation/payer/review_screen.dart';
import '../../payouts/presentation/payer/settling_screen.dart';
import '../../payouts/presentation/recipient/recipient_home.dart';
import 'state/shell_providers.dart';
import 'widgets/role_switch_sheet.dart';

/// The running app: renders the active screen, the bottom tabs, the role-switch
/// sheet and toasts. The OS draws the status bar / home indicator — no fake
/// device frame. On wide screens the column is centred at a phone width.
class AppShell extends ConsumerWidget {
  const AppShell({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = context.sotto;
    final shell = ref.watch(shellControllerProvider);

    final Widget content = shell.phase == AppPhase.onboarding
        ? const OnboardingScreen()
        : _AppBody(shell: shell);

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: c.dark ? SystemUiOverlayStyle.light : SystemUiOverlayStyle.dark,
      // Material (not a bare ColoredBox) is the surface for every screen: without
      // a Material ancestor, MaterialApp's fallback text style paints debug yellow
      // underlines under all text. One root Material covers onboarding, the wallet
      // screens and the sheets — none of which use Scaffold.
      child: Material(
        color: c.bg,
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 480),
            child: SizedBox.expand(child: content),
          ),
        ),
      ),
    );
  }
}

Widget _screenFor(AppScreen s) => switch (s) {
      AppScreen.payerHome => const PayerHome(),
      AppScreen.mandate => const MandateScreen(),
      AppScreen.review => const ReviewScreen(),
      AppScreen.settling => const SettlingScreen(),
      AppScreen.done => const DoneScreen(),
      AppScreen.recipientHome => const RecipientHome(),
      AppScreen.auditorHome => const AuditorHome(),
      AppScreen.approverHome => const ApproverHome(),
      AppScreen.account => const AccountScreen(),
    };

class _AppBody extends ConsumerWidget {
  final ShellState shell;
  const _AppBody({required this.shell});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final ctrl = ref.read(shellControllerProvider.notifier);
    return Stack(
      children: [
        Positioned.fill(
          child: AnimatedSwitcher(
            duration: const Duration(milliseconds: 220),
            switchInCurve: Curves.easeOut,
            transitionBuilder: (child, anim) => FadeTransition(
              opacity: anim,
              child: SlideTransition(
                position: Tween(
                  begin: Offset(shell.dir == NavDir.back ? -0.02 : 0.02, 0),
                  end: Offset.zero,
                ).animate(anim),
                child: child,
              ),
            ),
            child: KeyedSubtree(
              key: ValueKey('${shell.role}_${shell.screen}'),
              child: _screenFor(shell.screen),
            ),
          ),
        ),
        if (shell.showTabs)
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: SottoTabBar(
              active: shell.accountTab ? 'account' : 'home',
              onTap: (id) => ctrl.selectTab(account: id == 'account'),
              items: const [
                TabItem('home', 'home', 'Home'),
                TabItem('account', 'person', 'Account'),
              ],
            ),
          ),
        if (shell.toast != null)
          Positioned(
            left: 16,
            right: 16,
            bottom: shell.showTabs ? 92 : 30,
            child: _Toast(message: shell.toast!),
          ),
        if (shell.rolesOpen) const RoleSwitchSheet(),
      ],
    );
  }
}

class _Toast extends StatelessWidget {
  final String message;
  const _Toast({required this.message});
  @override
  Widget build(BuildContext context) {
    final c = context.sotto;
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: 1),
      duration: const Duration(milliseconds: 280),
      curve: Curves.easeOut,
      builder: (context, t, child) => Opacity(
        opacity: t,
        child: Transform.translate(offset: Offset(0, (1 - t) * 16), child: child),
      ),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 13),
        decoration: BoxDecoration(
          color: c.dark ? Colors.white : const Color(0xFF0A0A0B),
          borderRadius: BorderRadius.circular(14),
          boxShadow: const [
            BoxShadow(color: Color(0x66000000), blurRadius: 34, offset: Offset(0, 12)),
          ],
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            SottoIcon('check', size: 17, weight: 2.6, color: c.dark ? Colors.black : Colors.white),
            const SizedBox(width: 10),
            Flexible(
              child: Text(message,
                  style: TextStyle(
                      color: c.dark ? Colors.black : Colors.white,
                      fontSize: 14.5,
                      fontWeight: FontWeight.w600,
                      letterSpacing: -0.2)),
            ),
          ],
        ),
      ),
    );
  }
}
