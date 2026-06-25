import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../theme/sotto_colors.dart';

/// A bottom sheet rendered inside the device bounds (overlay + slide-up panel),
/// matching the prototype's in-frame sheet.
class SottoSheet extends StatefulWidget {
  final Widget child;
  final VoidCallback onClose;
  const SottoSheet({super.key, required this.child, required this.onClose});

  @override
  State<SottoSheet> createState() => _SottoSheetState();
}

class _SottoSheetState extends State<SottoSheet>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ac = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 280),
  )..forward();

  @override
  void initState() {
    super.initState();
    HapticFeedback.lightImpact(); // the sheet announces itself
  }

  @override
  void dispose() {
    _ac.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = context.sotto;
    final curve = CurvedAnimation(parent: _ac, curve: Curves.easeOutCubic);
    return Positioned.fill(
      child: Stack(
        children: [
          GestureDetector(
            onTap: widget.onClose,
            child: FadeTransition(
              opacity: _ac,
              child: Container(color: const Color(0x80000000)),
            ),
          ),
          Align(
            alignment: Alignment.bottomCenter,
            child: SlideTransition(
              position: Tween(begin: const Offset(0, 1), end: Offset.zero)
                  .animate(curve),
              child: ConstrainedBox(
                constraints: BoxConstraints(
                  maxHeight: MediaQuery.of(context).size.height * 0.82,
                ),
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 30),
                  decoration: BoxDecoration(
                    color: c.sheetSurface,
                    borderRadius: const BorderRadius.vertical(
                        top: Radius.circular(30)),
                    border: Border.all(color: c.hair, width: 0.5),
                  ),
                  child: SingleChildScrollView(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          width: 38,
                          height: 5,
                          margin: const EdgeInsets.only(bottom: 14),
                          decoration: BoxDecoration(
                            color: c.hair2,
                            borderRadius: BorderRadius.circular(9),
                          ),
                        ),
                        widget.child,
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
