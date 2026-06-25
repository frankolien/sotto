import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/icons/sotto_icon.dart';
import '../../../../core/theme/sotto_colors.dart';
import '../../../../core/utils/format.dart';
import '../../../../core/widgets/sheet.dart';
import '../../../shell/presentation/state/shell_providers.dart';
import '../../domain/entities/ledger_info.dart';
import '../state/ledger_providers.dart';

String _mid(String s, int head, int tail) =>
    s.length <= head + tail + 1 ? s : '${s.substring(0, head)}…${s.substring(s.length - tail)}';

void _copy(String value) {
  Clipboard.setData(ClipboardData(text: value));
  HapticFeedback.selectionClick();
}

/// "On the ledger" — the raw Canton truth for the signed-in party: its on-chain
/// identity, the live ledger offset, and the actual contracts it holds, each with
/// its real contract id (tap to copy). Proof the numbers are on-chain, not digits.
class LedgerSheet extends ConsumerWidget {
  const LedgerSheet({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = context.sotto;
    final shell = ref.read(shellControllerProvider.notifier);
    final info = ref.watch(ledgerInfoProvider);

    return SottoSheet(
      onClose: shell.closeLedger,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(4, 0, 4, 4),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('On the ledger',
                    style: TextStyle(color: c.text, fontSize: 21, fontWeight: FontWeight.w700, letterSpacing: -0.4)),
                const SizedBox(height: 3),
                Text('Real contracts on Canton, fetched live as your scoped party — not the app, the ledger.',
                    style: TextStyle(color: c.sec, fontSize: 14, height: 1.4)),
              ],
            ),
          ),
          const SizedBox(height: 16),
          info.when(
            loading: () => Padding(
              padding: const EdgeInsets.all(30),
              child: Center(
                child: SizedBox(
                  width: 22,
                  height: 22,
                  child: CircularProgressIndicator(strokeWidth: 2, color: c.text),
                ),
              ),
            ),
            error: (_, _) => _Note(icon: 'eyeoff', text: 'Couldn’t reach the ledger right now.'),
            data: (d) => _Body(info: d),
          ),
        ],
      ),
    );
  }
}

class _Body extends StatelessWidget {
  final LedgerInfo info;
  const _Body({required this.info});

  @override
  Widget build(BuildContext context) {
    final c = context.sotto;
    final n = info.contracts.length;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Container(
          padding: const EdgeInsets.all(15),
          decoration: BoxDecoration(
            color: c.surface,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: c.hair2, width: 0.5),
          ),
          child: Column(
            children: [
              _Kv(k: 'Your party', v: _mid(info.party, 14, 10), full: info.party),
              const SizedBox(height: 13),
              _Kv(k: 'Ledger offset', v: info.offset.toString(), full: info.offset.toString(), live: true),
            ],
          ),
        ),
        const SizedBox(height: 16),
        Padding(
          padding: const EdgeInsets.only(left: 4, bottom: 9),
          child: Text('$n ACTIVE CONTRACT${n == 1 ? '' : 'S'}',
              style: TextStyle(color: c.ter, fontSize: 12, fontWeight: FontWeight.w700, letterSpacing: 0.4)),
        ),
        if (info.contracts.isEmpty)
          const _Note(icon: 'eyeoff', text: 'Your party holds no contracts on this batch yet — there’s genuinely nothing for it to see.')
        else
          for (final ct in info.contracts)
            Padding(padding: const EdgeInsets.only(bottom: 9), child: _ContractCard(ct: ct)),
        const SizedBox(height: 4),
        const _Note(icon: 'lock', text: 'Each id is a real contract on Canton. Tap any value to copy.'),
      ],
    );
  }
}

class _Kv extends StatelessWidget {
  final String k;
  final String v;
  final String full;
  final bool live;
  const _Kv({required this.k, required this.v, required this.full, this.live = false});

  @override
  Widget build(BuildContext context) {
    final c = context.sotto;
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Row(children: [
          if (live) ...[
            Container(width: 6, height: 6, decoration: BoxDecoration(shape: BoxShape.circle, color: c.text)),
            const SizedBox(width: 7),
          ],
          Text(k, style: TextStyle(color: c.sec, fontSize: 13.5)),
        ]),
        const SizedBox(width: 12),
        Flexible(
          child: GestureDetector(
            onTap: () => _copy(full),
            child: Text(v,
                textAlign: TextAlign.right,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                    color: c.text, fontSize: 12.5, fontWeight: FontWeight.w600, fontFamily: 'monospace', letterSpacing: -0.2)),
          ),
        ),
      ],
    );
  }
}

class _ContractCard extends StatelessWidget {
  final ContractRef ct;
  const _ContractCard({required this.ct});

  @override
  Widget build(BuildContext context) {
    final c = context.sotto;
    return GestureDetector(
      onTap: () => _copy(ct.cid),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: c.surface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: c.hair2, width: 0.5),
        ),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(ct.label,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(color: c.text, fontSize: 14.5, fontWeight: FontWeight.w600, letterSpacing: -0.2)),
                  const SizedBox(height: 3),
                  Text('${ct.template} · ${_mid(ct.cid, 10, 6)}',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(color: c.ter, fontSize: 12, fontFamily: 'monospace', letterSpacing: -0.2)),
                ],
              ),
            ),
            if (ct.amount != null) ...[
              const SizedBox(width: 10),
              Text(fmt(ct.amount!),
                  style: TextStyle(
                      color: c.text,
                      fontSize: 14.5,
                      fontWeight: FontWeight.w700,
                      fontFeatures: const [FontFeature.tabularFigures()])),
            ],
          ],
        ),
      ),
    );
  }
}

class _Note extends StatelessWidget {
  final String icon;
  final String text;
  const _Note({required this.icon, required this.text});

  @override
  Widget build(BuildContext context) {
    final c = context.sotto;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 2, vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SottoIcon(icon, size: 14, color: c.ter),
          const SizedBox(width: 8),
          Expanded(child: Text(text, style: TextStyle(color: c.sec, fontSize: 12.5, height: 1.4))),
        ],
      ),
    );
  }
}
