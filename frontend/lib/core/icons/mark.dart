import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

/// The Sotto brand mark — a private aperture/lens (visibility + control).
class SottoMark extends StatelessWidget {
  final double size;
  final Color color;
  const SottoMark({super.key, this.size = 48, required this.color});

  @override
  Widget build(BuildContext context) {
    String rgba(double a) =>
        'rgba(${(color.r * 255).round()},${(color.g * 255).round()},${(color.b * 255).round()},$a)';
    final svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none">'
        '<rect x="5.5" y="5.5" width="37" height="37" rx="13" stroke="${rgba(color.a)}" stroke-width="2.4"/>'
        '<circle cx="24" cy="24" r="13" stroke="${rgba(0.38)}" stroke-width="2"/>'
        '<circle cx="24" cy="24" r="6.4" fill="${rgba(color.a)}"/>'
        '</svg>';
    return SvgPicture.string(svg, width: size, height: size);
  }
}
