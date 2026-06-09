import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/icons/sotto_icon.dart';
import '../../../../core/theme/sotto_colors.dart';
import '../../../../core/widgets/layout.dart';
import '../../../../core/widgets/primitives.dart';
import '../../../../core/widgets/wallet.dart';
import '../../../shell/presentation/state/shell_providers.dart';
import '../../domain/entities/activity.dart';
import '../../domain/entities/ledger_state.dart';
import '../state/ledger_providers.dart';

class RecipientHome extends ConsumerWidget {
  const RecipientHome({super.key});

  static const _name = 'Amara Okafor';

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = context.sotto;
    final s = ref.watch(ledgerControllerProvider);
    final shell = ref.read(shellControllerProvider.notifier);

    // On real Canton this list holds only this recipient's own line — the rest
    // of the batch is not theirs to see, so it never reaches the client.
    final ownLines = s.batch.lines.where((l) => l.you).toList();
    final mine = ownLines.isEmpty ? null : ownLines.first;
    final settled = mine != null && mine.status == LineStatus.settled;

    final histIn = LedgerState.recipientHistory
        .expand((g) => g.rows)
        .where((r) => r.dir == ActivityDir.income)
        .fold<double>(0, (a, r) => a + r.amount);
    final balance = histIn + (settled ? mine.amount : 0);

    final groups = <ActivityGroup>[
      if (settled)
        ActivityGroup(day: 'Today', rows: [
          ActivityItem(name: s.org, sub: '${mine.role} · ${s.batch.id}', amount: mine.amount, dir: ActivityDir.income),
        ]),
      ...LedgerState.recipientHistory,
    ];

    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          AccountHeader(name: _name, sub: 'Recipient · tap to switch view', onOpen: shell.openRoles),
          HomeBody(children: [
            BigBalance(label: 'Total balance', value: balance),
            AppButton(
              label: 'Cash out to local currency',
              variant: BtnVariant.secondary,
              icon: 'arrowdown',
              onTap: () => shell.flash('Off-ramp via local partner — not in this demo'),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Activity',
                    style: TextStyle(color: c.text, fontSize: 17, fontWeight: FontWeight.w700, letterSpacing: -0.3)),
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
            ),
            const _PrivacyPanel(),
          ]),
        ],
      ),
    );
  }
}

/// What the recipient genuinely cannot see. The other payments in the batch are
/// not redacted on the client — they never arrive, because the ledger reveals a
/// payment only to its own recipient.
class _PrivacyPanel extends StatelessWidget {
  const _PrivacyPanel();

  @override
  Widget build(BuildContext context) {
    final c = context.sotto;
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: c.surface,
        borderRadius: BorderRadius.circular(c.radius),
        border: Border.all(color: c.hair, width: 0.5),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              SottoIcon('eyeoff', size: 17, color: c.text),
              const SizedBox(width: 9),
              Text('The rest of this batch is invisible to you',
                  style: TextStyle(color: c.text, fontSize: 14.5, fontWeight: FontWeight.w600, letterSpacing: -0.2)),
            ],
          ),
          const SizedBox(height: 10),
          // Redaction bars represent the absence of data, not hidden data the
          // client holds: even how many others were paid is not yours to know.
          for (var i = 0; i < 3; i++)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Row(
                children: [
                  Container(
                    width: 30, height: 30,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(shape: BoxShape.circle, color: c.surface2, border: Border.all(color: c.hair, width: 0.5)),
                    child: SottoIcon('lock', size: 15, weight: 1.8, color: c.ter),
                  ),
                  const SizedBox(width: 12),
                  Expanded(child: Container(height: 9, decoration: BoxDecoration(color: c.surface2, borderRadius: BorderRadius.circular(9)))),
                  const SizedBox(width: 12),
                  Container(width: 56, height: 9, decoration: BoxDecoration(color: c.surface2, borderRadius: BorderRadius.circular(9))),
                ],
              ),
            ),
          const SizedBox(height: 14),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SottoIcon('shield', size: 16, color: c.ter),
              const SizedBox(width: 9),
              Expanded(
                child: Text(
                  'Privacy is a property of the rail. Only the parties to a payment can see it — never another recipient, and never the payer’s roster.',
                  style: TextStyle(color: c.sec, fontSize: 13, height: 1.45),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
