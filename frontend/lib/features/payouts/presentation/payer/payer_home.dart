import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/icons/sotto_icon.dart';
import '../../../../core/theme/sotto_colors.dart';
import '../../../../core/utils/format.dart';
import '../../../../core/widgets/layout.dart';
import '../../../../core/widgets/wallet.dart';
import '../../../shell/presentation/state/shell_providers.dart';
import '../../domain/entities/activity.dart';
import '../../domain/entities/ledger_state.dart';
import '../state/ledger_providers.dart';

class PayerHome extends ConsumerWidget {
  const PayerHome({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(ledgerControllerProvider);
    final shell = ref.read(shellControllerProvider.notifier);
    final b = s.batch;
    final isDone = b.status == BatchStatus.settled;

    final todayRows = isDone
        ? b.lines
            .map((l) => ActivityItem(
                  name: l.name,
                  sub: l.status == LineStatus.pending
                      ? 'Held · awaiting approval'
                      : l.status == LineStatus.rejected
                          ? 'Rejected'
                          : 'Contributor payout',
                  amount: l.amount,
                ))
            .toList()
        : <ActivityItem>[];
    final groups = [
      if (todayRows.isNotEmpty) ActivityGroup(day: 'Today', rows: todayRows),
      ...LedgerState.payerHistory,
    ];

    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          AccountHeader(
            name: s.org,
            sub: 'Payer · tap to switch view',
            onOpen: shell.openRoles,
          ),
          HomeBody(children: [
            BigBalance(label: 'Total balance', value: s.treasury),
            ActionRow(children: [
              ActionTile(icon: 'send', label: 'Pay out', onTap: () => shell.go(AppScreen.review)),
              ActionTile(
                  icon: 'arrowdown',
                  label: 'Fund',
                  onTap: () => shell.flash('Treasury funding settles in USDCx — not in this demo')),
              ActionTile(icon: 'shield', label: 'Mandate', onTap: () => shell.go(AppScreen.mandate)),
              ActionTile(icon: 'users', label: 'Roster', onTap: () => shell.go(AppScreen.mandate)),
            ]),
            if (!isDone) _BatchCta(label: b.label, count: b.lines.length, total: b.total, onTap: () => shell.go(AppScreen.review)),
            _Activity(groups: groups, isDone: isDone, onReceipt: () => shell.go(AppScreen.done)),
          ]),
        ],
      ),
    );
  }
}

class _BatchCta extends StatelessWidget {
  final String label;
  final int count;
  final double total;
  final VoidCallback onTap;
  const _BatchCta({required this.label, required this.count, required this.total, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final c = context.sotto;
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 15),
        decoration: BoxDecoration(
          color: c.inv,
          borderRadius: BorderRadius.circular(c.radius),
        ),
        child: Row(
          children: [
            Container(
              width: 38,
              height: 38,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: const Color(0x38808080),
                borderRadius: BorderRadius.circular(11),
              ),
              child: SottoIcon('bolt', size: 20, color: c.invText),
            ),
            const SizedBox(width: 13),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(label,
                      style: TextStyle(color: c.invText, fontSize: 15.5, fontWeight: FontWeight.w600, letterSpacing: -0.2)),
                  Text('$count recipients · ready to send',
                      style: TextStyle(color: c.invText.withValues(alpha: 0.65), fontSize: 12.5)),
                ],
              ),
            ),
            const SizedBox(width: 10),
            Text(fmt0(total),
                style: TextStyle(
                    color: c.invText,
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    fontFeatures: const [FontFeature.tabularFigures()])),
            const SizedBox(width: 6),
            SottoIcon('fwd', size: 16, weight: 2.2, color: c.invText.withValues(alpha: 0.6)),
          ],
        ),
      ),
    );
  }
}

class _Activity extends StatelessWidget {
  final List<ActivityGroup> groups;
  final bool isDone;
  final VoidCallback onReceipt;
  const _Activity({required this.groups, required this.isDone, required this.onReceipt});

  @override
  Widget build(BuildContext context) {
    final c = context.sotto;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('Activity',
                style: TextStyle(color: c.text, fontSize: 17, fontWeight: FontWeight.w700, letterSpacing: -0.3)),
            if (isDone)
              GestureDetector(
                onTap: onReceipt,
                child: Text('Batch receipt', style: TextStyle(color: c.sec, fontSize: 13)),
              ),
          ],
        ),
        for (final g in groups)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                DateLabel(g.day),
                for (var i = 0; i < g.rows.length; i++)
                  ActivityRow(
                    name: g.rows[i].name,
                    sub: g.rows[i].sub,
                    amount: g.rows[i].amount,
                    income: g.rows[i].dir == ActivityDir.income,
                    last: i == g.rows.length - 1,
                  ),
              ],
            ),
          ),
      ],
    );
  }
}
