import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/icons/mark.dart';
import '../../../core/icons/sotto_icon.dart';
import '../../../core/motion/motion.dart';
import '../../../core/theme/sotto_colors.dart';
import '../../../core/widgets/primitives.dart';
import '../../payouts/domain/entities/role.dart';
import '../../shell/presentation/state/shell_providers.dart';

/// The app's entry point: sign in as one identity. Each sign-in is a real Sotto
/// session — the backend scopes every read and write to whoever is signed in, so
/// you only ever see (and can only ever do) what that party may. The payer (the
/// org that just set up the rail) is the primary identity; the other three are
/// the counterparties you can step into to see the same batch differently.
class SignInScreen extends ConsumerWidget {
  const SignInScreen({super.key});

  // Pre-login labels: there's no session yet, so use the demo's known parties.
  static String _whoFor(Role r) => switch (r) {
        Role.payer => 'Lumen Studio',
        Role.recipient => 'Amara Okafor',
        Role.auditor => 'Hale & Co.',
        Role.approver => 'Priya Raman',
      };

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = context.sotto;
    final shell = ref.read(shellControllerProvider.notifier);
    final lenses = Role.values.where((r) => r != Role.payer).toList();

    return ColoredBox(
      color: c.bg,
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(22, 8, 22, 18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 20),
              Reveal(
                child: Align(
                  alignment: Alignment.centerLeft,
                  child: SottoMark(size: 50, color: c.text),
                ),
              ),
              const SizedBox(height: 22),
              Reveal(
                delay: const Duration(milliseconds: 40),
                child: Text('Sign in',
                    style: TextStyle(color: c.text, fontSize: 40, fontWeight: FontWeight.w700, letterSpacing: -0.6)),
              ),
              const SizedBox(height: 10),
              Reveal(
                delay: const Duration(milliseconds: 80),
                child: Text(
                  'You just saw the rail from all four sides. Step into any of them.',
                  style: TextStyle(color: c.sec, fontSize: 15.5, height: 1.5, letterSpacing: -0.1),
                ),
              ),
              const SizedBox(height: 26),

              // The primary identity — you, the org that set the rail up.
              Reveal(
                delay: const Duration(milliseconds: 150),
                dy: 18,
                child: _IdentityCard(
                  key: const ValueKey('signin-payer'),
                  role: Role.payer,
                  who: _whoFor(Role.payer),
                  featured: true,
                  onTap: () => shell.signInAs(Role.payer),
                ),
              ),
              const SizedBox(height: 22),
              Reveal(
                delay: const Duration(milliseconds: 220),
                child: const SectionLabel('Or view the same batch as'),
              ),
              const SizedBox(height: 13),
              for (var i = 0; i < lenses.length; i++) ...[
                Reveal(
                  delay: Duration(milliseconds: 270 + i * 60),
                  dy: 18,
                  child: _IdentityCard(
                    key: ValueKey('signin-${lenses[i].name}'),
                    role: lenses[i],
                    who: _whoFor(lenses[i]),
                    featured: false,
                    onTap: () => shell.signInAs(lenses[i]),
                  ),
                ),
                const SizedBox(height: 11),
              ],

              const Spacer(),
              Reveal(
                delay: const Duration(milliseconds: 480),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    SottoIcon('lock', size: 14, color: c.ter),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Demo · passwordless sign-in. In production each identity authenticates with a credential before a session is issued.',
                        style: TextStyle(color: c.ter, fontSize: 12.5, height: 1.45),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// An identity to sign in as. The `featured` payer is the inverse (primary)
/// card; the rest are soft surface cards. Both have a quiet lift in light mode.
class _IdentityCard extends StatelessWidget {
  final Role role;
  final String who;
  final bool featured;
  final VoidCallback onTap;
  const _IdentityCard({
    super.key,
    required this.role,
    required this.who,
    required this.featured,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.sotto;
    final fg = featured ? c.invText : c.text;
    final sub = featured ? c.invText.withValues(alpha: 0.66) : c.sec;
    final shadowOn = !c.dark;
    return Pressable(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.fromLTRB(14, 14, 14, 14),
        decoration: BoxDecoration(
          color: featured ? c.inv : c.surface,
          borderRadius: BorderRadius.circular(20),
          border: featured ? null : Border.all(color: c.hair2, width: 0.5),
          boxShadow: shadowOn
              ? [
                  BoxShadow(
                    color: featured ? const Color(0x29000000) : const Color(0x0D000000),
                    blurRadius: featured ? 26 : 16,
                    offset: Offset(0, featured ? 14 : 7),
                  ),
                ]
              : null,
        ),
        child: Row(
          children: [
            Container(
              width: 46,
              height: 46,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: featured ? const Color(0x24FFFFFF) : c.surface2,
                borderRadius: BorderRadius.circular(13),
                border: featured ? null : Border.all(color: c.hair, width: 0.5),
              ),
              child: SottoIcon(role.iconName, size: 21, color: fg),
            ),
            const SizedBox(width: 13),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text.rich(
                    TextSpan(children: [
                      TextSpan(text: role.label, style: TextStyle(color: fg, fontSize: 16.5, fontWeight: FontWeight.w600, letterSpacing: -0.3)),
                      TextSpan(text: '  ·  $who', style: TextStyle(color: sub, fontSize: 16.5, fontWeight: FontWeight.w400, letterSpacing: -0.2)),
                    ]),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 3),
                  Text(role.sees,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(color: sub, fontSize: 13.5, height: 1.2)),
                ],
              ),
            ),
            const SizedBox(width: 10),
            Container(
              width: 28,
              height: 28,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: featured ? const Color(0x1FFFFFFF) : c.surface2,
              ),
              child: SottoIcon('fwd', size: 15, weight: 2, color: featured ? c.invText : c.sec),
            ),
          ],
        ),
      ),
    );
  }
}
