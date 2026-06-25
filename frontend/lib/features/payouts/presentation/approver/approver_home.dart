import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/icons/sotto_icon.dart';
import '../../../../core/theme/sotto_colors.dart';
import '../../../../core/utils/format.dart';
import '../../../../core/widgets/layout.dart';
import '../../../../core/widgets/primitives.dart';
import '../../../../core/widgets/wallet.dart';
import '../../../shell/presentation/state/shell_providers.dart';
import '../../domain/entities/ledger_state.dart';
import '../state/ledger_providers.dart';
import '../widgets/sync_badge.dart';

class ApproverHome extends ConsumerWidget {
  const ApproverHome({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = context.sotto;
    final s = ref.watch(ledgerControllerProvider);
    final shell = ref.read(shellControllerProvider.notifier);
    final m = s.mandate;
    final pending = s.batch.lines.where((l) => l.status == LineStatus.pending).toList();

    void approve(PayoutLine l) {
      ref.read(ledgerControllerProvider.notifier).approve(l.id);
      shell.flash('Approved — settled on the ledger');
    }

    void reject(PayoutLine l) {
      ref.read(ledgerControllerProvider.notifier).reject(l.id);
      shell.flash('Rejected — payment cancelled');
    }

    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          AccountHeader(name: m.approver, sub: 'Approver · tap to switch view', onOpen: shell.openRoles, right: const SyncBadge()),
          HomeBody(children: [
            Text('Approvals',
                style: TextStyle(color: c.text, fontSize: 17, fontWeight: FontWeight.w700, letterSpacing: -0.3)),
            if (pending.isEmpty)
              _Empty()
            else
              for (final l in pending)
                _ProposalCard(
                  line: l,
                  mandateName: m.name,
                  threshold: m.threshold,
                  org: s.org,
                  batchId: s.batch.id,
                  onApprove: () => approve(l),
                  onReject: () => reject(l),
                ),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SottoIcon('shield', size: 16, color: c.ter),
                const SizedBox(width: 9),
                Expanded(
                  child: Text('The guardrail is enforced by the ledger — not by trusting an operator or a model.',
                      style: TextStyle(color: c.sec, fontSize: 13, height: 1.45)),
                ),
              ],
            ),
          ]),
        ],
      ),
    );
  }
}

class _Empty extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final c = context.sotto;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 50),
      child: Column(
        children: [
          Container(
            width: 56,
            height: 56,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(color: c.hair2, width: 1.5),
            ),
            child: SottoIcon('check', size: 28, weight: 2, color: c.ter),
          ),
          const SizedBox(height: 14),
          Text('Nothing awaiting you', style: TextStyle(color: c.text, fontSize: 18, fontWeight: FontWeight.w600)),
          const SizedBox(height: 4),
          Text('All over-threshold payments are cleared.',
              textAlign: TextAlign.center, style: TextStyle(color: c.sec, fontSize: 14)),
        ],
      ),
    );
  }
}

class _ProposalCard extends StatelessWidget {
  final PayoutLine line;
  final String mandateName;
  final double threshold;
  final String org;
  final String batchId;
  final VoidCallback onApprove;
  final VoidCallback onReject;
  const _ProposalCard({
    required this.line,
    required this.mandateName,
    required this.threshold,
    required this.org,
    required this.batchId,
    required this.onApprove,
    required this.onReject,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.sotto;
    final rows = [
      ('Mandate', mandateName),
      ('Threshold', '${fmt0(threshold)} USDCx'),
      ('Raised by', org),
      ('Batch', batchId),
    ];
    return Container(
      decoration: BoxDecoration(
        color: c.surface,
        borderRadius: BorderRadius.circular(c.radius),
        border: Border.all(color: c.hair, width: 0.5),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(18, 17, 18, 0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const SectionLabel('Awaiting your sign-off'),
                    const Tag('Over threshold', tone: TagTone.outline, icon: 'clock'),
                  ],
                ),
                const SizedBox(height: 14),
                Row(
                  children: [
                    Avatar(name: line.name, size: 46),
                    const SizedBox(width: 13),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(line.name, style: TextStyle(color: c.text, fontSize: 17, fontWeight: FontWeight.w600, letterSpacing: -0.3)),
                          Text(line.role, style: TextStyle(color: c.sec, fontSize: 13)),
                        ],
                      ),
                    ),
                    MoneyText(line.amount, size: 20, weight: FontWeight.w700, suffix: ''),
                  ],
                ),
                const SizedBox(height: 15),
                Container(
                  padding: const EdgeInsets.only(top: 14),
                  decoration: BoxDecoration(border: Border(top: BorderSide(color: c.hair, width: 0.5))),
                  child: Column(
                    children: [
                      for (final r in rows)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 9),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(r.$1, style: TextStyle(color: c.sec, fontSize: 13.5)),
                              Text(r.$2, style: TextStyle(color: c.text, fontSize: 13.5, fontWeight: FontWeight.w600)),
                            ],
                          ),
                        ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(18, 4, 18, 18),
            child: Row(
              children: [
                Expanded(child: AppButton(label: 'Reject', variant: BtnVariant.ghost, onTap: onReject)),
                const SizedBox(width: 10),
                Expanded(child: AppButton(label: 'Approve & settle', icon: 'check', onTap: onApprove)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
