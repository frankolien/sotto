import 'package:flutter/material.dart';

import 'sotto_colors.dart';
import 'tweaks.dart';

/// Builds the Material theme from the current tweaks. We don't set a font family:
/// Flutter already renders San Francisco by default on Apple platforms (the
/// demo target), with a graceful system fallback elsewhere.
ThemeData buildSottoTheme(TweakSettings t) {
  final c = SottoColors.fromTweaks(t);
  final brightness = t.isDark ? Brightness.dark : Brightness.light;
  return ThemeData(
    useMaterial3: true,
    brightness: brightness,
    scaffoldBackgroundColor: c.bg,
    extensions: [c],
    colorScheme: ColorScheme.fromSeed(
      seedColor: c.accent,
      brightness: brightness,
      surface: c.surface,
    ),
    splashFactory: NoSplash.splashFactory,
    highlightColor: Colors.transparent,
    textSelectionTheme: TextSelectionThemeData(cursorColor: c.text),
  );
}
