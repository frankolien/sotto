import 'package:flutter/material.dart';

import 'tweaks.dart';

/// The design's `makeTheme` tokens, as a Flutter [ThemeExtension] so any widget
/// can read them with `context.sotto`. Pure black & white; ONE restrained hue
/// only if the signal accent is on.
@immutable
class SottoColors extends ThemeExtension<SottoColors> {
  final bool dark;
  final Color? signal;
  final double radius;
  final double scale;

  final Color bg;
  final Color surface;
  final Color surface2;
  final Color raise;
  final Color text;
  final Color sec;
  final Color ter;
  final Color hair;
  final Color hair2;
  final Color inv; // primary-action surface (flips with theme)
  final Color invText;
  final Color accent;

  const SottoColors({
    required this.dark,
    required this.signal,
    required this.radius,
    required this.scale,
    required this.bg,
    required this.surface,
    required this.surface2,
    required this.raise,
    required this.text,
    required this.sec,
    required this.ter,
    required this.hair,
    required this.hair2,
    required this.inv,
    required this.invText,
    required this.accent,
  });

  factory SottoColors.fromTweaks(TweakSettings t) {
    final dark = t.isDark;
    final signal = t.signalAccent ? t.signalColor : null;
    return SottoColors(
      dark: dark,
      signal: signal,
      radius: t.radius,
      scale: t.scale,
      bg: dark ? const Color(0xFF000000) : const Color(0xFFF3F3F1),
      surface: dark ? const Color(0xFF141416) : const Color(0xFFFFFFFF),
      surface2: dark ? const Color(0xFF1E1E21) : const Color(0xFFEBEBE8),
      raise: dark ? const Color(0xFF26262A) : const Color(0xFFE2E2DE),
      text: dark ? const Color(0xFFFFFFFF) : const Color(0xFF0A0A0B),
      sec: dark
          ? const Color.fromRGBO(235, 235, 245, 0.60)
          : const Color.fromRGBO(40, 40, 46, 0.62),
      ter: dark
          ? const Color.fromRGBO(235, 235, 245, 0.30)
          : const Color.fromRGBO(40, 40, 46, 0.34),
      hair: dark
          ? const Color.fromRGBO(255, 255, 255, 0.10)
          : const Color.fromRGBO(0, 0, 0, 0.10),
      hair2: dark
          ? const Color.fromRGBO(255, 255, 255, 0.16)
          : const Color.fromRGBO(0, 0, 0, 0.14),
      inv: dark ? const Color(0xFFFFFFFF) : const Color(0xFF0A0A0B),
      invText: dark ? const Color(0xFF000000) : const Color(0xFFFFFFFF),
      accent: signal ?? (dark ? const Color(0xFFFFFFFF) : const Color(0xFF0A0A0B)),
    );
  }

  /// The bottom-sheet surface (slightly off the page background).
  Color get sheetSurface => dark ? const Color(0xFF111113) : const Color(0xFFFFFFFF);

  @override
  SottoColors copyWith() => this;

  @override
  SottoColors lerp(ThemeExtension<SottoColors>? other, double t) {
    if (other is! SottoColors) return this;
    return t < 0.5 ? this : other;
  }
}

extension SottoColorsContext on BuildContext {
  SottoColors get sotto => Theme.of(this).extension<SottoColors>()!;
}
