import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/icons/sotto_icon.dart';
import '../../../../core/theme/sotto_colors.dart';
import '../../../../core/utils/format.dart';
import '../../../../core/widgets/layout.dart';
import '../../../../core/widgets/primitives.dart';
import '../../../shell/presentation/state/shell_providers.dart';
import '../../domain/entities/role.dart';
import '../state/ledger_providers.dart';

class MandateScreen extends ConsumerWidget {
  const MandateScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = context.sotto;
    final s = ref.watch(ledgerControllerProvider);
    final shell = ref.read(shellControllerProvider.notifier);
    final role = ref.watch(shellControllerProvider).role;
    final m = s.mandate;
    final used = s.cycleUsed;
    final pct = (m.cap == 0 ? 0.0 : (used / m.cap)).clamp(0.0, 1.0);

    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SottoTopBar(
            title: 'Mandate',
            sub: 'On-ledger spending authority',
            onBack: shell.back,
            right: RoleChip(roleLabel: role.label, onTap: shell.openRoles),
          ),
          ScreenScroll(children: [
            AppCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SectionLabel('Cap used this cycle'),
                  const SizedBox(height: 10),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.baseline,
                    textBaseline: TextBaseline.alphabetic,
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      MoneyText(used, size: 22, weight: FontWeight.w700, suffix: ''),
                      Text('of ${fmt0(m.cap)}', style: TextStyle(color: c.sec, fontSize: 14)),
                    ],
                  ),
                  const SizedBox(height: 12),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(7),
                    child: LinearProgressIndicator(
                      value: pct,
                      minHeight: 7,
                      backgroundColor: c.surface2,
                      valueColor: AlwaysStoppedAnimation(c.accent),
                    ),
                  ),
                ],
              ),
            ),
            AppCard(
              child: Column(
                children: [
                  _Field(k: 'Per-cycle cap', v: '${fmt0(m.cap)} USDCx'),
                  _Field(k: 'Approval threshold', v: '${fmt0(m.threshold)} USDCx', sub: 'Above this → second signer'),
                  _Field(k: 'Approver', v: m.approver, sub: m.approverRole),
                  _Field(k: 'Auditor', v: m.auditor, sub: 'Read-only, full batch'),
                  _Field(k: 'Allow-list', v: '${m.recipients} recipients', last: true),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 4),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SottoIcon('lock', size: 16, color: c.ter),
                  const SizedBox(width: 9),
                  Expanded(
                    child: Text(
                      'The mandate, cap and allow-list live on the ledger. A payout that breaks any rule cannot settle.',
                      style: TextStyle(color: c.sec, fontSize: 13, height: 1.45, letterSpacing: -0.1),
                    ),
                  ),
                ],
              ),
            ),
          ]),
        ],
      ),
    );
  }
}

class _Field extends StatelessWidget {
  final String k;
  final String v;
  final String? sub;
  final bool last;
  const _Field({required this.k, required this.v, this.sub, this.last = false});

  @override
  Widget build(BuildContext context) {
    final c = context.sotto;
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 15),
      decoration: BoxDecoration(
        border: last ? null : Border(bottom: BorderSide(color: c.hair, width: 0.5)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Expanded(child: Text(k, style: TextStyle(color: c.sec, fontSize: 15.5))),
          const SizedBox(width: 12),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(v, style: TextStyle(color: c.text, fontSize: 16, fontWeight: FontWeight.w600)),
              if (sub != null)
                Padding(
                  padding: const EdgeInsets.only(top: 1),
                  child: Text(sub!, style: TextStyle(color: c.ter, fontSize: 12.5)),
                ),
            ],
          ),
        ],
      ),
    );
  }
}
