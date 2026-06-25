import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/sotto_colors.dart';
import '../../../shell/presentation/state/shell_providers.dart';
import '../state/ledger_providers.dart';

/// A small ledger-connection badge. "Live · Canton" pulses a heartbeat on every
/// sync; falls back to "Reconnecting" if the backend hiccups, or "Demo" on the
/// in-memory mock. Tap it to see the raw ledger (the "On the ledger" sheet).
class SyncBadge extends ConsumerWidget {
  const SyncBadge({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(syncStatusProvider);
    final Widget pill = !s.live
        ? const _Pill(label: 'Demo', filled: false)
        : !s.connected
            ? const _Pill(label: 'Reconnecting', filled: false)
            : _LivePill(tick: s.tick);
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: () {
        HapticFeedback.selectionClick();
        ref.read(shellControllerProvider.notifier).openLedger();
      },
      child: pill,
    );
  }
}

Widget _shell(SottoColors c, Widget dot, String label) => Container(
      padding: const EdgeInsets.fromLTRB(9, 5, 11, 5),
      decoration: BoxDecoration(
        color: c.surface,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: c.hair2, width: 0.5),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          dot,
          const SizedBox(width: 6),
          Text(label,
              style: TextStyle(color: c.sec, fontSize: 11.5, fontWeight: FontWeight.w600, letterSpacing: -0.1)),
        ],
      ),
    );

class _Pill extends StatelessWidget {
  final String label;
  final bool filled;
  const _Pill({required this.label, required this.filled});

  @override
  Widget build(BuildContext context) {
    final c = context.sotto;
    final dot = Container(
      width: 6,
      height: 6,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: filled ? c.text : Colors.transparent,
        border: filled ? null : Border.all(color: c.ter, width: 1.2),
      ),
    );
    return _shell(c, dot, label);
  }
}

class _LivePill extends StatefulWidget {
  final int tick;
  const _LivePill({required this.tick});
  @override
  State<_LivePill> createState() => _LivePillState();
}

class _LivePillState extends State<_LivePill> with SingleTickerProviderStateMixin {
  late final AnimationController _c =
      AnimationController(vsync: this, duration: const Duration(milliseconds: 1100));

  @override
  void initState() {
    super.initState();
    _c.forward(from: 0);
  }

  @override
  void didUpdateWidget(_LivePill old) {
    super.didUpdateWidget(old);
    if (old.tick != widget.tick) _c.forward(from: 0); // heartbeat on each sync
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = context.sotto;
    final dot = SizedBox(
      width: 8,
      height: 8,
      child: AnimatedBuilder(
        animation: _c,
        builder: (_, _) {
          final t = _c.value;
          return Stack(
            alignment: Alignment.center,
            children: [
              Container(
                width: 4 + t * 8,
                height: 4 + t * 8,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: c.text.withValues(alpha: (1 - t) * 0.35),
                ),
              ),
              Container(
                width: 6,
                height: 6,
                decoration: BoxDecoration(shape: BoxShape.circle, color: c.text),
              ),
            ],
          );
        },
      ),
    );
    return _shell(c, dot, 'Live · Canton');
  }
}
