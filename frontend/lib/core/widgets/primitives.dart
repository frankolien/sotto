import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../icons/sotto_icon.dart';
import '../theme/sotto_colors.dart';
import '../utils/format.dart';

/// Press-scale with a crisp selection haptic — the tactile base every tappable
/// surface is built on.
class Pressable extends StatefulWidget {
  final Widget child;
  final VoidCallback? onTap;
  final BorderRadius? radius;
  final bool haptic;
  final double scale;
  const Pressable({
    super.key,
    required this.child,
    this.onTap,
    this.radius,
    this.haptic = true,
    this.scale = 0.97,
  });

  @override
  State<Pressable> createState() => _PressableState();
}

class _PressableState extends State<Pressable> {
  bool _down = false;
  void _set(bool v) {
    if (mounted) setState(() => _down = v);
  }

  void _handleTap() {
    if (widget.haptic) HapticFeedback.selectionClick();
    widget.onTap!();
  }

  @override
  Widget build(BuildContext context) {
    final enabled = widget.onTap != null;
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTapDown: enabled ? (_) => _set(true) : null,
      onTapUp: enabled ? (_) => _set(false) : null,
      onTapCancel: enabled ? () => _set(false) : null,
      onTap: enabled ? _handleTap : null,
      child: AnimatedScale(
        scale: _down ? widget.scale : 1,
        duration: const Duration(milliseconds: 110),
        curve: Curves.easeOut,
        child: widget.child,
      ),
    );
  }
}

/// Surface card with hairline border.
class AppCard extends StatelessWidget {
  final Widget child;
  final double pad;
  final VoidCallback? onTap;
  const AppCard({super.key, required this.child, this.pad = 18, this.onTap});

  @override
  Widget build(BuildContext context) {
    final c = context.sotto;
    final card = Container(
      padding: EdgeInsets.all(pad),
      decoration: BoxDecoration(
        color: c.surface,
        borderRadius: BorderRadius.circular(c.radius),
        border: Border.all(color: c.hair, width: 0.5),
      ),
      child: child,
    );
    return onTap == null
        ? card
        : Pressable(onTap: onTap, child: card);
  }
}

/// A USDCx amount with greyed suffix.
class MoneyText extends StatelessWidget {
  final double value;
  final double size;
  final FontWeight weight;
  final String suffix;
  final Color? color;
  final Color? dim;
  const MoneyText(
    this.value, {
    super.key,
    this.size = 17,
    this.weight = FontWeight.w600,
    this.suffix = 'USDCx',
    this.color,
    this.dim,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.sotto;
    return Text.rich(
      TextSpan(children: [
        TextSpan(
          text: fmt(value),
          style: TextStyle(
            fontSize: size,
            fontWeight: weight,
            color: color ?? c.text,
            letterSpacing: -0.3,
            fontFeatures: const [FontFeature.tabularFigures()],
          ),
        ),
        if (suffix.isNotEmpty)
          TextSpan(
            text: '  $suffix',
            style: TextStyle(
              fontSize: size * 0.52,
              fontWeight: FontWeight.w600,
              color: dim ?? c.ter,
              letterSpacing: 0.2,
            ),
          ),
      ]),
      maxLines: 1,
      softWrap: false,
      overflow: TextOverflow.visible,
    );
  }
}

/// Initials avatar (mono).
class Avatar extends StatelessWidget {
  final String name;
  final double size;
  final bool you;
  const Avatar({super.key, required this.name, this.size = 38, this.you = false});

  @override
  Widget build(BuildContext context) {
    final c = context.sotto;
    final parts = name.trim().split(RegExp(r'\s+')).where((s) => s.isNotEmpty);
    final initials =
        parts.take(2).map((s) => s[0].toUpperCase()).join();
    return Container(
      width: size,
      height: size,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: you ? c.inv : c.surface2,
        border: Border.all(color: c.hair2, width: 0.5),
      ),
      child: Text(
        initials,
        style: TextStyle(
          color: you ? c.invText : c.sec,
          fontSize: size * 0.36,
          fontWeight: FontWeight.w600,
          letterSpacing: -0.2,
        ),
      ),
    );
  }
}

class _DashedRingPainter extends CustomPainter {
  final Color color;
  final double stroke;
  _DashedRingPainter(this.color, this.stroke);
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = stroke
      ..strokeCap = StrokeCap.round;
    final r = (size.width - stroke) / 2;
    final center = Offset(size.width / 2, size.height / 2);
    const dash = 0.5; // radians on
    const gap = 0.42;
    for (double a = 0; a < 2 * math.pi; a += dash + gap) {
      canvas.drawArc(
        Rect.fromCircle(center: center, radius: r),
        a,
        dash,
        false,
        paint,
      );
    }
  }

  @override
  bool shouldRepaint(_DashedRingPainter old) =>
      old.color != color || old.stroke != stroke;
}

/// Shape-coded status mark so it reads in pure monochrome.
class StatusMark extends StatelessWidget {
  final String status; // settled | pending | rejected | draft
  final double size;
  const StatusMark({super.key, required this.status, this.size = 20});

  @override
  Widget build(BuildContext context) {
    final c = context.sotto;
    switch (status) {
      case 'settled':
        return Container(
          width: size,
          height: size,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: c.signal ?? c.inv,
          ),
          child: SottoIcon('check',
              size: size * 0.62,
              weight: 2.4,
              color: c.signal != null ? Colors.white : c.invText),
        );
      case 'pending':
        return SizedBox(
          width: size,
          height: size,
          child: CustomPaint(
            painter: _DashedRingPainter(c.accent, 1.6),
            child: Center(
              child: SottoIcon('clock',
                  size: size * 0.6, weight: 2, color: c.accent),
            ),
          ),
        );
      case 'rejected':
        return Container(
          width: size,
          height: size,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            border: Border.all(color: c.ter, width: 1.4),
          ),
          child: SottoIcon('x', size: size * 0.56, weight: 2.2, color: c.sec),
        );
      default:
        return Container(
          width: size,
          height: size,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            border: Border.all(color: c.hair2, width: 1.4),
          ),
        );
    }
  }
}

String statusLabel(String s) => switch (s) {
      'settled' => 'Settled',
      'pending' => 'Held · approval',
      'rejected' => 'Rejected',
      _ => 'Queued',
    };

enum TagTone { normal, solid, outline }

/// Pill / tag.
class Tag extends StatelessWidget {
  final String text;
  final TagTone tone;
  final String? icon;
  const Tag(this.text, {super.key, this.tone = TagTone.normal, this.icon});

  @override
  Widget build(BuildContext context) {
    final c = context.sotto;
    final (bg, fg, bd) = switch (tone) {
      TagTone.normal => (c.surface2, c.sec, c.hair),
      TagTone.solid => (c.inv, c.invText, Colors.transparent),
      TagTone.outline => (Colors.transparent, c.text, c.hair2),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 5),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: bd, width: 0.5),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            SottoIcon(icon!, size: 13, weight: 2, color: fg),
            const SizedBox(width: 5),
          ],
          Text(text,
              style: TextStyle(
                  color: fg,
                  fontSize: 12.5,
                  fontWeight: FontWeight.w600,
                  letterSpacing: -0.1)),
        ],
      ),
    );
  }
}

enum BtnVariant { primary, secondary, ghost }

/// Primary / secondary / ghost button.
class AppButton extends StatelessWidget {
  final String label;
  final VoidCallback? onTap;
  final BtnVariant variant;
  final bool full;
  final String? icon;
  final bool disabled;
  final bool large;
  const AppButton({
    super.key,
    required this.label,
    this.onTap,
    this.variant = BtnVariant.primary,
    this.full = true,
    this.icon,
    this.disabled = false,
    this.large = true,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.sotto;
    final (bg, fg, bd) = switch (variant) {
      BtnVariant.primary => (c.signal ?? c.inv, c.signal != null ? Colors.white : c.invText, Colors.transparent),
      BtnVariant.secondary => (c.surface2, c.text, c.hair),
      BtnVariant.ghost => (Colors.transparent, c.text, c.hair2),
    };
    final lift = variant == BtnVariant.primary && !disabled && !c.dark;
    final body = Container(
      height: large ? 54 : 44,
      width: full ? double.infinity : null,
      padding: const EdgeInsets.symmetric(horizontal: 18),
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(math.min(c.radius, 18)),
        border: Border.all(
            color: bd == Colors.transparent ? Colors.transparent : bd,
            width: variant == BtnVariant.ghost ? 1 : 0.5),
        // A whisper of depth under the primary CTA — just enough to lift it off
        // the page without breaking the flat monochrome language.
        boxShadow: lift
            ? const [BoxShadow(color: Color(0x1F000000), blurRadius: 16, offset: Offset(0, 6))]
            : null,
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            SottoIcon(icon!, size: 18, weight: 2, color: fg),
            const SizedBox(width: 8),
          ],
          Text(label,
              style: TextStyle(
                  color: fg,
                  fontSize: large ? 17 : 15,
                  fontWeight: FontWeight.w600,
                  letterSpacing: -0.2)),
        ],
      ),
    );
    return Opacity(
      opacity: disabled ? 0.4 : 1,
      child: Pressable(onTap: disabled ? null : onTap, child: body),
    );
  }
}

/// Uppercase section label.
class SectionLabel extends StatelessWidget {
  final String text;
  const SectionLabel(this.text, {super.key});
  @override
  Widget build(BuildContext context) {
    final c = context.sotto;
    return Text(text.toUpperCase(),
        style: TextStyle(
            color: c.ter,
            fontSize: 12.5,
            fontWeight: FontWeight.w600,
            letterSpacing: 0.3));
  }
}

/// Large screen header (title + optional sub + back + right slot).
class SottoTopBar extends StatelessWidget {
  final String? title;
  final String? sub;
  final VoidCallback? onBack;
  final Widget? right;
  const SottoTopBar({super.key, this.title, this.sub, this.onBack, this.right});

  @override
  Widget build(BuildContext context) {
    final c = context.sotto;
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 50, 20, 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            height: 34,
            child: Row(
              children: [
                if (onBack != null)
                  Padding(
                    padding: const EdgeInsets.only(left: 0),
                    child: Pressable(
                      onTap: onBack,
                      child: Padding(
                        padding: const EdgeInsets.all(6),
                        child: SottoIcon('back', size: 24, weight: 2, color: c.text),
                      ),
                    ),
                  ),
                const Spacer(),
                ?right,
              ],
            ),
          ),
          if (title != null) ...[
            const SizedBox(height: 6),
            Text(title!,
                style: TextStyle(
                    color: c.text,
                    fontSize: 32 * c.scale,
                    fontWeight: FontWeight.w700,
                    letterSpacing: -0.6,
                    height: 1.05)),
            if (sub != null) ...[
              const SizedBox(height: 5),
              Text(sub!,
                  style: TextStyle(
                      color: c.sec, fontSize: 15, letterSpacing: -0.2)),
            ],
          ],
        ],
      ),
    );
  }
}

/// The persistent "viewing as …" chip used in sub-screens (top-right).
class RoleChip extends StatelessWidget {
  final String roleLabel;
  final VoidCallback onTap;
  const RoleChip({super.key, required this.roleLabel, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final c = context.sotto;
    return Pressable(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.fromLTRB(13, 6, 8, 6),
        decoration: BoxDecoration(
          color: c.surface2,
          borderRadius: BorderRadius.circular(999),
          border: Border.all(color: c.hair, width: 0.5),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            SottoIcon('eye', size: 15, weight: 1.8, color: c.sec),
            const SizedBox(width: 6),
            Text(roleLabel,
                style: TextStyle(
                    color: c.text,
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    letterSpacing: -0.2)),
            const SizedBox(width: 8),
            Container(
              width: 24,
              height: 24,
              alignment: Alignment.center,
              decoration: BoxDecoration(shape: BoxShape.circle, color: c.inv),
              child: SottoIcon('swap', size: 13, weight: 2, color: c.invText),
            ),
          ],
        ),
      ),
    );
  }
}
