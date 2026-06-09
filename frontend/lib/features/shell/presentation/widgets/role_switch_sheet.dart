import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/icons/sotto_icon.dart';
import '../../../../core/theme/sotto_colors.dart';
import '../../../../core/widgets/sheet.dart';
import '../../../payouts/domain/entities/role.dart';
import '../../../payouts/presentation/state/ledger_providers.dart';
import '../state/shell_providers.dart';

/// The "View as" sheet — role switching as a familiar account switcher.
class RoleSwitchSheet extends ConsumerWidget {
  const RoleSwitchSheet({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = context.sotto;
    final s = ref.watch(ledgerControllerProvider);
    final shell = ref.read(shellControllerProvider.notifier);
    final current = ref.watch(shellControllerProvider).role;

    // The who-labels must be stable across lenses: the current state is scoped to
    // one role and redacts the rest, so fall back to the known identities.
    String whoFor(Role r) => switch (r) {
          Role.payer => s.org.isNotEmpty ? s.org : 'Lumen Studio',
          Role.auditor => s.mandate.auditor.isNotEmpty ? s.mandate.auditor : 'Hale & Co.',
          Role.approver => s.mandate.approver.isNotEmpty ? s.mandate.approver : 'Priya Raman',
          Role.recipient => 'Amara Okafor',
        };

    return SottoSheet(
      onClose: shell.closeRoles,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(4, 0, 4, 4),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('View as', style: TextStyle(color: c.text, fontSize: 21, fontWeight: FontWeight.w700, letterSpacing: -0.4)),
                const SizedBox(height: 3),
                Text('One batch, four vantage points. The privacy is real — switch to see it.',
                    style: TextStyle(color: c.sec, fontSize: 14, height: 1.4)),
              ],
            ),
          ),
          const SizedBox(height: 14),
          for (final r in Role.values) ...[
            _RoleRow(role: r, who: whoFor(r), active: r == current, onTap: () => shell.setRole(r)),
            const SizedBox(height: 9),
          ],
          const SizedBox(height: 5),
          GestureDetector(
            onTap: () {
              ref.read(ledgerControllerProvider.notifier).reset();
              shell.toOnboarding();
            },
            child: Padding(
              padding: const EdgeInsets.all(10),
              child: Text('Reset demo',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: c.sec, fontSize: 14, fontWeight: FontWeight.w600)),
            ),
          ),
        ],
      ),
    );
  }
}

class _RoleRow extends StatelessWidget {
  final Role role;
  final String who;
  final bool active;
  final VoidCallback onTap;
  const _RoleRow({required this.role, required this.who, required this.active, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final c = context.sotto;
    final fg = active ? c.invText : c.text;
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 15, vertical: 14),
        decoration: BoxDecoration(
          color: active ? c.inv : c.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: active ? Colors.transparent : c.hair2, width: 0.5),
        ),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: active ? const Color(0x2E808080) : c.surface2,
                border: active ? null : Border.all(color: c.hair, width: 0.5),
              ),
              child: SottoIcon(role.iconName, size: 20, color: fg),
            ),
            const SizedBox(width: 13),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text.rich(
                    TextSpan(children: [
                      TextSpan(text: role.label, style: TextStyle(color: fg, fontSize: 16, fontWeight: FontWeight.w600, letterSpacing: -0.2)),
                      TextSpan(text: ' · $who', style: TextStyle(color: fg.withValues(alpha: 0.55), fontSize: 16, fontWeight: FontWeight.w400)),
                    ]),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 2),
                  Text(role.sees, style: TextStyle(color: active ? fg.withValues(alpha: 0.72) : c.sec, fontSize: 13)),
                ],
              ),
            ),
            if (active) ...[
              const SizedBox(width: 8),
              SottoIcon('check', size: 20, weight: 2.4, color: fg),
            ],
          ],
        ),
      ),
    );
  }
}
