import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// The design's "Tweaks" — appearance knobs. Defaults to the white-and-black
/// aesthetic the user landed on (light theme, monochrome accent, 18px radius).
enum SottoMode { light, dark }

class TweakSettings {
  final SottoMode mode;
  final bool signalAccent; // mono by default; one restrained hue when true
  final Color signalColor;
  final double radius;
  final double scale;

  const TweakSettings({
    this.mode = SottoMode.light,
    this.signalAccent = false,
    this.signalColor = const Color(0xFF3B82F6),
    this.radius = 18,
    this.scale = 1,
  });

  bool get isDark => mode == SottoMode.dark;

  TweakSettings copyWith({
    SottoMode? mode,
    bool? signalAccent,
    Color? signalColor,
    double? radius,
    double? scale,
  }) =>
      TweakSettings(
        mode: mode ?? this.mode,
        signalAccent: signalAccent ?? this.signalAccent,
        signalColor: signalColor ?? this.signalColor,
        radius: radius ?? this.radius,
        scale: scale ?? this.scale,
      );
}

class TweaksController extends Notifier<TweakSettings> {
  @override
  TweakSettings build() => const TweakSettings();

  void toggleMode() => state = state.copyWith(
        mode: state.isDark ? SottoMode.light : SottoMode.dark,
      );
  void setRadius(double r) => state = state.copyWith(radius: r);
  void setScale(double s) => state = state.copyWith(scale: s);
}

final tweaksProvider =
    NotifierProvider<TweaksController, TweakSettings>(TweaksController.new);
