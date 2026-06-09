import 'package:flutter/material.dart';

List<Widget> _gap(List<Widget> children, double gap) {
  final out = <Widget>[];
  for (var i = 0; i < children.length; i++) {
    out.add(children[i]);
    if (i < children.length - 1) out.add(SizedBox(height: gap));
  }
  return out;
}

/// Body column for sub-screens (under a top bar). 14px gaps.
class ScreenScroll extends StatelessWidget {
  final List<Widget> children;
  const ScreenScroll({super.key, required this.children});
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 40),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: _gap(children, 14),
      ),
    );
  }
}

/// Body column for wallet home screens (under the account header). 22px gaps,
/// extra bottom padding to clear the tab bar.
class HomeBody extends StatelessWidget {
  final List<Widget> children;
  const HomeBody({super.key, required this.children});
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 14, 20, 96),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: _gap(children, 22),
      ),
    );
  }
}
