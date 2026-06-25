import 'package:flutter/widgets.dart';

/// Motion tokens — one coherent language for the whole app. Tuned to feel like a
/// flagship consumer app: confident, decelerating, never bouncy-for-its-own-sake.
class Motion {
  const Motion._();

  static const Duration fast = Duration(milliseconds: 160);
  static const Duration base = Duration(milliseconds: 300);
  static const Duration slow = Duration(milliseconds: 560);

  /// Emphasized decelerate — enters fast, settles softly (Material 3 flavour).
  static const Curve emphasized = Cubic(0.16, 1.0, 0.3, 1.0);
  static const Curve standard = Curves.easeOutCubic;

  static bool reduced(BuildContext context) =>
      MediaQuery.maybeOf(context)?.disableAnimations ?? false;
}

/// One-shot entrance: fade + rise on first mount. Animates ONCE per element, so
/// data rebuilds don't re-trigger it — only a fresh mount (navigating to a
/// screen) does. Honors the platform "reduce motion" setting.
class Reveal extends StatefulWidget {
  final Widget child;
  final Duration delay;
  final double dy;
  final Duration duration;
  const Reveal({
    super.key,
    required this.child,
    this.delay = Duration.zero,
    this.dy = 14,
    this.duration = Motion.base,
  });

  @override
  State<Reveal> createState() => _RevealState();
}

class _RevealState extends State<Reveal> with SingleTickerProviderStateMixin {
  late final AnimationController _c;
  late final Animation<double> _a;

  @override
  void initState() {
    super.initState();
    // The delay is part of the animation (an Interval), not a separate Timer —
    // so there is no stray callback that could fire during teardown and rebuild
    // against a disposed element. The controller owns the whole lifetime.
    final total = widget.delay + widget.duration;
    _c = AnimationController(vsync: this, duration: total);
    final startFraction =
        total.inMicroseconds == 0 ? 0.0 : widget.delay.inMicroseconds / total.inMicroseconds;
    _a = CurvedAnimation(
      parent: _c,
      curve: Interval(startFraction.clamp(0.0, 1.0), 1.0, curve: Motion.emphasized),
    );
    _c.forward();
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (Motion.reduced(context)) return widget.child;
    return AnimatedBuilder(
      animation: _a,
      builder: (_, child) => Opacity(
        opacity: _a.value.clamp(0.0, 1.0),
        child: Transform.translate(
          offset: Offset(0, (1 - _a.value) * widget.dy),
          child: child,
        ),
      ),
      child: widget.child,
    );
  }
}

/// Wrap a list so its items cascade in with a stagger. Use for lists, action
/// rows, settings — anywhere content should feel like it arrives, not blinks.
List<Widget> staggered(
  List<Widget> children, {
  Duration start = Duration.zero,
  int stepMs = 52,
  double dy = 14,
  Duration duration = Motion.base,
}) {
  return [
    for (var i = 0; i < children.length; i++)
      Reveal(
        delay: start + Duration(milliseconds: i * stepMs),
        dy: dy,
        duration: duration,
        child: children[i],
      ),
  ];
}

/// Animates a number between values (count-up / count-down). Snaps on first
/// mount; animates on change — so the hero moment is when a balance actually
/// moves (e.g. the treasury dropping as a batch settles).
class AnimatedAmount extends StatefulWidget {
  final double value;
  final Widget Function(BuildContext context, double value) builder;
  final Duration duration;
  const AnimatedAmount({
    super.key,
    required this.value,
    required this.builder,
    this.duration = const Duration(milliseconds: 680),
  });

  @override
  State<AnimatedAmount> createState() => _AnimatedAmountState();
}

class _AnimatedAmountState extends State<AnimatedAmount>
    with SingleTickerProviderStateMixin {
  late final AnimationController _c;
  late Animation<double> _a;

  @override
  void initState() {
    super.initState();
    _c = AnimationController(vsync: this, duration: widget.duration);
    _a = AlwaysStoppedAnimation(widget.value);
  }

  @override
  void didUpdateWidget(AnimatedAmount old) {
    super.didUpdateWidget(old);
    if (old.value != widget.value) {
      _a = Tween<double>(begin: _a.value, end: widget.value)
          .animate(CurvedAnimation(parent: _c, curve: Motion.standard));
      _c
        ..reset()
        ..forward();
    }
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (Motion.reduced(context)) return widget.builder(context, widget.value);
    return AnimatedBuilder(
      animation: _a,
      builder: (ctx, _) => widget.builder(ctx, _a.value),
    );
  }
}
