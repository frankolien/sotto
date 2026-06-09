import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

/// The design's icon set: a 24-grid, round-capped stroke family (ui.jsx `PATHS`).
/// Rendered from SVG so the strokes match the prototype exactly.
const Map<String, String> _paths = {
  'back': '<path d="M15 5l-7 7 7 7"/>',
  'fwd': '<path d="M9 5l7 7-7 7"/>',
  'check': '<path d="M5 12.5l4.5 4.5L19 7"/>',
  'shield': '<path d="M12 3l7 2.5v5.5c0 4.6-3 8-7 9.5-4-1.5-7-4.9-7-9.5V5.5L12 3z"/>',
  'eye': '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.6"/>',
  'eyeoff': '<path d="M4 4l16 16"/><path d="M9.5 9.7a2.6 2.6 0 003.6 3.6"/><path d="M6.3 6.8C3.9 8.3 2.5 12 2.5 12s3.5 6.5 9.5 6.5c1.5 0 2.8-.3 4-.8"/><path d="M17.5 16.4C20 14.9 21.5 12 21.5 12S18 5.5 12 5.5c-.6 0-1.2.1-1.7.2"/>',
  'lock': '<rect x="5" y="11" width="14" height="9" rx="2.4"/><path d="M8 11V8a4 4 0 018 0v3"/>',
  'users': '<circle cx="9" cy="8.5" r="3"/><path d="M3.5 19c.6-3.1 2.9-5 5.5-5s4.9 1.9 5.5 5"/><path d="M16 6.2a3 3 0 010 5.6M17.4 14.2c2 .7 3.4 2.4 3.9 4.8"/>',
  'doc': '<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M10 12h6M10 16h6"/>',
  'bolt': '<path d="M13 3L5 13h5l-1 8 8-10h-5l1-8z"/>',
  'clock': '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  'x': '<path d="M6 6l12 12M18 6L6 18"/>',
  'plus': '<path d="M12 5v14M5 12h14"/>',
  'swap': '<path d="M7 4L3.5 7.5 7 11"/><path d="M3.5 7.5H17"/><path d="M17 20l3.5-3.5L17 13"/><path d="M20.5 16.5H7"/>',
  'building': '<rect x="5" y="3.5" width="14" height="17" rx="1.5"/><path d="M9 8h2M13 8h2M9 12h2M13 12h2M9 16h6"/>',
  'arrowdown': '<path d="M12 5v14M6 13l6 6 6-6"/>',
  'chevdown': '<path d="M6 9.5l6 6 6-6"/>',
  'home': '<path d="M4 11l8-7 8 7"/><path d="M6 9.4V20h12V9.4"/>',
  'person': '<circle cx="12" cy="8" r="3.4"/><path d="M5.5 19.5c.7-3.6 3.3-5.6 6.5-5.6s5.8 2 6.5 5.6"/>',
  'send': '<path d="M21 4L3 11l7 2.5L13 21l8-17z"/>',
  'dot': '<circle cx="12" cy="12" r="3.2"/>',
};

String _rgba(Color c) =>
    'rgba(${(c.r * 255).round()},${(c.g * 255).round()},${(c.b * 255).round()},${c.a})';

/// A stroke icon from the Sotto set. [weight] is the SVG stroke width.
class SottoIcon extends StatelessWidget {
  final String name;
  final double size;
  final double weight;
  final Color color;

  const SottoIcon(
    this.name, {
    super.key,
    this.size = 22,
    this.weight = 1.7,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    final inner = _paths[name] ?? '';
    final svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" '
        'fill="none" stroke="${_rgba(color)}" stroke-width="$weight" '
        'stroke-linecap="round" stroke-linejoin="round">$inner</svg>';
    return SvgPicture.string(svg, width: size, height: size);
  }
}
