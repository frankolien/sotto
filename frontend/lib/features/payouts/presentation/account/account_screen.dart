import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/icons/sotto_icon.dart';
import '../../../../core/theme/sotto_colors.dart';
import '../../../../core/widgets/layout.dart';
import '../../../../core/widgets/primitives.dart';
import '../../../shell/presentation/state/shell_providers.dart';
import '../../domain/entities/role.dart';
import '../state/ledger_providers.dart';

class AccountScreen extends ConsumerWidget {
  const AccountScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = context.sotto;
    final s = ref.watch(ledgerControllerProvider);
    final shell = ref.read(shellControllerProvider.notifier);
    final role = ref.watch(shellControllerProvider).role;
    final who = switch (role) {
      Role.payer => s.org,
      Role.auditor => s.mandate.auditor,
      Role.approver => s.mandate.approver,
      Role.recipient => s.recipientName,
    };

    void reset() {
      ref.read(ledgerControllerProvider.notifier).reset();
      shell.toOnboarding();
    }

    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 50, 20, 6),
            child: Text('Account',
                style: TextStyle(color: c.text, fontSize: 32 * c.scale, fontWeight: FontWeight.w700, letterSpacing: -0.6)),
          ),
          HomeBody(children: [
            AppCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    children: [
                      Avatar(name: who, size: 48),
                      const SizedBox(width: 13),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(who, style: TextStyle(color: c.text, fontSize: 17, fontWeight: FontWeight.w600, letterSpacing: -0.3)),
                            const SizedBox(height: 1),
                            Text('Viewing as ${role.label}', style: TextStyle(color: c.sec, fontSize: 13)),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  AppButton(label: 'Switch view', icon: 'swap', variant: BtnVariant.secondary, onTap: shell.openRoles),
                ],
              ),
            ),
            AppCard(
              pad: 0,
              child: Column(
                children: [
                  _Row(k: 'Organisation', v: s.org),
                  if (role == Role.payer)
                    _Row(k: 'Mandate', v: s.mandate.name, onTap: () => shell.go(AppScreen.mandate)),
                  const _Row(k: 'Settlement asset', v: 'USDCx'),
                  const _Row(k: 'Network', v: 'Canton LocalNet', last: true),
                ],
              ),
            ),
            _ResetButton(onTap: reset),
            Center(
              child: Text('Sotto · confidential payouts on Canton',
                  style: TextStyle(color: c.ter, fontSize: 12)),
            ),
          ]),
        ],
      ),
    );
  }
}

class _Row extends StatelessWidget {
  final String k;
  final String v;
  final VoidCallback? onTap;
  final bool last;
  const _Row({required this.k, required this.v, this.onTap, this.last = false});

  @override
  Widget build(BuildContext context) {
    final c = context.sotto;
    final row = Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 15),
      decoration: BoxDecoration(
        border: last ? null : Border(bottom: BorderSide(color: c.hair, width: 0.5)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(k, style: TextStyle(color: c.sec, fontSize: 15)),
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(v, style: TextStyle(color: c.text, fontSize: 15, fontWeight: FontWeight.w600)),
              if (onTap != null) ...[
                const SizedBox(width: 8),
                SottoIcon('fwd', size: 15, color: c.ter),
              ],
            ],
          ),
        ],
      ),
    );
    return onTap == null ? row : GestureDetector(onTap: onTap, child: row);
  }
}

class _ResetButton extends StatelessWidget {
  final VoidCallback onTap;
  const _ResetButton({required this.onTap});
  @override
  Widget build(BuildContext context) {
    final c = context.sotto;
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(15),
        alignment: Alignment.center,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(c.radius < 18 ? c.radius : 18),
          border: Border.all(color: c.hair2, width: 1),
        ),
        child: Text('Reset demo', style: TextStyle(color: c.text, fontSize: 15, fontWeight: FontWeight.w600)),
      ),
    );
  }
}
