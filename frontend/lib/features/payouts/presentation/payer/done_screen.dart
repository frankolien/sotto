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

class DoneScreen extends ConsumerWidget {
  const DoneScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = context.sotto;
    final s = ref.watch(ledgerControllerProvider);
    final shell = ref.read(shellControllerProvider.notifier);
    final role = ref.watch(shellControllerProvider).role;
    final b = s.batch;
    final settled = b.lines.where((l) => l.status == LineStatus.settled).toList();
    final pending = b.lines.where((l) => l.status == LineStatus.pending).toList();
    final settledSum = settled.fold<double>(0, (a, l) => a + l.amount);

    return Column(
      children: [
        SottoTopBar(
          onBack: () => shell.go(AppScreen.payerHome),
          right: RoleChip(roleLabel: role.label, onTap: shell.openRoles),
        ),
        Expanded(
          child: SingleChildScrollView(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 30),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Column(
                    children: [
                      const SizedBox(height: 6),
                      Container(
                        width: 60,
                        height: 60,
                        alignment: Alignment.center,
                        decoration: BoxDecoration(shape: BoxShape.circle, color: c.signal ?? c.inv),
                        child: SottoIcon('check', size: 32, weight: 2.6, color: c.signal != null ? Colors.white : c.invText),
                      ),
                      const SizedBox(height: 14),
                      Text('Batch settled',
                          style: TextStyle(color: c.text, fontSize: 24, fontWeight: FontWeight.w700, letterSpacing: -0.5)),
                      const SizedBox(height: 5),
                      Text('${settled.length} of ${b.lines.length} paid · ${fmt(settledSum)} USDCx',
                          style: TextStyle(color: c.sec, fontSize: 14.5)),
                      const SizedBox(height: 8),
                    ],
                  ),
                  if (pending.isNotEmpty) ...[
                    const SizedBox(height: 8),
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
                          const StatusMark(status: 'pending', size: 22),
                          const SizedBox(width: 11),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('${pending.length} payment held for approval',
                                    style: TextStyle(color: c.text, fontSize: 14, fontWeight: FontWeight.w600)),
                                const SizedBox(height: 2),
                                Text('${pending.first.name} · ${fmt0(pending.first.amount)} USDCx — awaiting ${s.mandate.approver.split(' ').first}',
                                    style: TextStyle(color: c.sec, fontSize: 13)),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                  const SizedBox(height: 16),
                  AppCard(
                    pad: 0,
                    child: Column(
                      children: [
                        for (var i = 0; i < b.lines.length; i++)
                          _ResultRow(line: b.lines[i], last: i == b.lines.length - 1),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 4),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        SottoIcon('eye', size: 16, color: c.ter),
                        const SizedBox(width: 9),
                        Expanded(
                          child: Text('Switch role to see what each party sees of this exact batch.',
                              style: TextStyle(color: c.sec, fontSize: 13, height: 1.45)),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
        Container(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 22),
          decoration: BoxDecoration(
            color: c.bg,
            border: Border(top: BorderSide(color: c.hair, width: 0.5)),
          ),
          child: AppButton(
            label: 'See it as the recipient',
            icon: 'swap',
            variant: BtnVariant.secondary,
            onTap: () => shell.setRole(Role.recipient),
          ),
        ),
      ],
    );
  }
}

class _ResultRow extends StatelessWidget {
  final PayoutLine line;
  final bool last;
  const _ResultRow({required this.line, required this.last});

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
          StatusMark(status: line.status.name, size: 24),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(line.name, style: TextStyle(color: c.text, fontSize: 15, fontWeight: FontWeight.w600, letterSpacing: -0.2)),
                Text(statusLabel(line.status.name), style: TextStyle(color: c.sec, fontSize: 12.5)),
              ],
            ),
          ),
          MoneyText(line.amount, size: 15, suffix: '', color: line.status == LineStatus.rejected ? c.ter : c.text),
        ],
      ),
    );
  }
}
