import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/icons/sotto_icon.dart';
import '../../../../core/theme/sotto_colors.dart';
import '../../../../core/utils/format.dart';
import '../../../../core/widgets/primitives.dart';
import '../../../shell/presentation/state/shell_providers.dart';
import '../../domain/entities/ledger_state.dart';
import '../../domain/entities/role.dart';
import '../state/ledger_providers.dart';

class ReviewScreen extends ConsumerWidget {
  const ReviewScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = context.sotto;
    final s = ref.watch(ledgerControllerProvider);
    final shell = ref.read(shellControllerProvider.notifier);
    final role = ref.watch(shellControllerProvider).role;
    final b = s.batch;
    final bigLine = b.lines.where(s.isOver).firstOrNull;

    void settle() {
      shell.go(AppScreen.settling);
      Future.delayed(const Duration(seconds: 2), () {
        ref.read(ledgerControllerProvider.notifier).settle();
        ref.read(shellControllerProvider.notifier).completeSettle();
      });
    }

    return Column(
      children: [
        SottoTopBar(
          title: 'Run batch',
          sub: b.label,
          onBack: shell.back,
          right: RoleChip(roleLabel: role.label, onTap: shell.openRoles),
        ),
        Expanded(
          child: SingleChildScrollView(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 40),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  AppCard(
                    pad: 0,
                    child: Column(
                      children: [
                        for (var i = 0; i < b.lines.length; i++)
                          _LineRow(
                            line: b.lines[i],
                            over: s.isOver(b.lines[i]),
                            last: i == b.lines.length - 1,
                          ),
                      ],
                    ),
                  ),
                  if (bigLine != null) ...[
                    const SizedBox(height: 14),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                      decoration: BoxDecoration(
                        color: c.surface,
                        borderRadius: BorderRadius.circular(c.radius),
                        border: Border.all(color: c.hair2, width: 0.5),
                      ),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          SottoIcon('shield', size: 19, color: c.text),
                          const SizedBox(width: 11),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('One payment needs sign-off',
                                    style: TextStyle(color: c.text, fontSize: 14, fontWeight: FontWeight.w600, letterSpacing: -0.2)),
                                const SizedBox(height: 3),
                                Text(
                                  '${bigLine.name.split(' ').first}’s ${fmt0(bigLine.amount)} exceeds the ${fmt0(s.mandate.threshold)} threshold. It’s routed to the approver — the rest settle now.',
                                  style: TextStyle(color: c.sec, fontSize: 13, height: 1.45),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ),
        Container(
          padding: const EdgeInsets.fromLTRB(20, 14, 20, 22),
          decoration: BoxDecoration(
            color: c.bg,
            border: Border(top: BorderSide(color: c.hair, width: 0.5)),
          ),
          child: Column(
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const SectionLabel('Total'),
                      MoneyText(b.total, size: 22, weight: FontWeight.w700),
                    ],
                  ),
                  SizedBox(
                    width: 130,
                    child: Text('Settles atomically — all or none',
                        textAlign: TextAlign.right,
                        style: TextStyle(color: c.sec, fontSize: 12.5, height: 1.35)),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              AppButton(label: 'Settle batch', icon: 'bolt', onTap: settle),
            ],
          ),
        ),
      ],
    );
  }
}

class _LineRow extends StatelessWidget {
  final PayoutLine line;
  final bool over;
  final bool last;
  const _LineRow({required this.line, required this.over, required this.last});

  @override
  Widget build(BuildContext context) {
    final c = context.sotto;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 13),
      decoration: BoxDecoration(
        border: last ? null : Border(bottom: BorderSide(color: c.hair, width: 0.5)),
      ),
      child: Row(
        children: [
          Avatar(name: line.name, size: 36),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(line.name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(color: c.text, fontSize: 15.5, fontWeight: FontWeight.w600, letterSpacing: -0.2)),
                Text(line.role, style: TextStyle(color: c.sec, fontSize: 12.5)),
              ],
            ),
          ),
          const SizedBox(width: 12),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              MoneyText(line.amount, size: 15.5, suffix: ''),
              if (over)
                const Padding(
                  padding: EdgeInsets.only(top: 3),
                  child: Tag('Over threshold', tone: TagTone.outline, icon: 'clock'),
                ),
            ],
          ),
        ],
      ),
    );
  }
}
