import 'package:flutter/material.dart';

import '../motion/motion.dart';

List<Widget> _gap(List<Widget> children, double gap) {
  final out = <Widget>[];
  for (var i = 0; i < children.length; i++) {
    out.add(children[i]);
    if (i < children.length - 1) out.add(SizedBox(height: gap));
  }
  return out;
}

/// Body column for sub-screens (under a top bar). 14px gaps. Content cascades in.
class ScreenScroll extends StatelessWidget {
  final List<Widget> children;
  final bool stagger;
  const ScreenScroll({super.key, required this.children, this.stagger = true});
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 40),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: _gap(stagger ? staggered(children, dy: 12) : children, 14),
      ),
    );
  }
}

/// Body column for wallet home screens (under the account header). 22px gaps,
/// extra bottom padding to clear the tab bar. Content cascades in on entry.
class HomeBody extends StatelessWidget {
  final List<Widget> children;
  final bool stagger;
  const HomeBody({super.key, required this.children, this.stagger = true});
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 14, 20, 96),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: _gap(stagger ? staggered(children, dy: 16) : children, 22),
      ),
    );
  }
}
