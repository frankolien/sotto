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

class AuditorHome extends ConsumerWidget {
  const AuditorHome({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = context.sotto;
    final s = ref.watch(ledgerControllerProvider);
    final shell = ref.read(shellControllerProvider.notifier);
    final b = s.batch;
    final total = b.total;
    final settled = b.lines.where((l) => l.status == LineStatus.settled).length;
    final pending = b.lines.where((l) => l.status == LineStatus.pending).length;

    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          AccountHeader(name: s.mandate.auditor, sub: 'Auditor · read-only · tap to switch view', onOpen: shell.openRoles, right: const SyncBadge()),
          HomeBody(children: [
            BigBalance(label: 'Batch ${b.id} · full visibility', value: total),
            Padding(
              padding: const EdgeInsets.only(top: 0),
              child: Row(
                children: [
                  _Stat(value: '${b.lines.length}', label: 'receipts'),
                  const SizedBox(width: 26),
                  _Stat(value: '$settled', label: 'settled'),
                  const SizedBox(width: 26),
                  _Stat(value: '$pending', label: 'held'),
                ],
              ),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Receipts',
                    style: TextStyle(color: c.text, fontSize: 17, fontWeight: FontWeight.w700, letterSpacing: -0.3)),
                const SizedBox(height: 6),
                for (var i = 0; i < b.lines.length; i++)
                  _ReceiptRow(line: b.lines[i], last: i == b.lines.length - 1),
              ],
            ),
            Container(
              constraints: const BoxConstraints(minHeight: 48),
              padding: const EdgeInsets.symmetric(horizontal: 16),
              decoration: BoxDecoration(
                color: c.surface,
                borderRadius: BorderRadius.circular(c.radius),
                border: Border.all(color: c.hair, width: 0.5),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Row(
                      children: [
                        SottoIcon('check', size: 15, weight: 2.4, color: c.accent),
                        const SizedBox(width: 8),
                        Flexible(
                          child: Text('Receipts reconcile to total',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(color: c.sec, fontSize: 13)),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 10),
                  Text(fmt(total),
                      style: TextStyle(
                          color: c.text,
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          fontFeatures: const [FontFeature.tabularFigures()])),
                ],
              ),
            ),
          ]),
        ],
      ),
    );
  }
}

class _Stat extends StatelessWidget {
  final String value;
  final String label;
  const _Stat({required this.value, required this.label});
  @override
  Widget build(BuildContext context) {
    final c = context.sotto;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(value, style: TextStyle(color: c.text, fontSize: 20, fontWeight: FontWeight.w700)),
        Text(label, style: TextStyle(color: c.sec, fontSize: 12.5)),
      ],
    );
  }
}

class _ReceiptRow extends StatelessWidget {
  final PayoutLine line;
  final bool last;
  const _ReceiptRow({required this.line, required this.last});

  @override
  Widget build(BuildContext context) {
    final c = context.sotto;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 2, vertical: 12),
      decoration: BoxDecoration(
        border: last ? null : Border(bottom: BorderSide(color: c.hair, width: 0.5)),
      ),
      child: Row(
        children: [
          Avatar(name: line.name, size: 38),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(line.name, style: TextStyle(color: c.text, fontSize: 15, fontWeight: FontWeight.w600, letterSpacing: -0.2)),
                Text('${line.handle} · ${statusLabel(line.status.name)}', style: TextStyle(color: c.sec, fontSize: 12.5)),
              ],
            ),
          ),
          const SizedBox(width: 10),
          Text(fmt(line.amount),
              style: TextStyle(
                  color: line.status == LineStatus.rejected ? c.ter : c.text,
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                  fontFeatures: const [FontFeature.tabularFigures()])),
          const SizedBox(width: 10),
          StatusMark(status: line.status.name, size: 20),
        ],
      ),
    );
  }
}
