import 'package:flutter/material.dart';

import '../../../../core/icons/sotto_icon.dart';
import '../../../../core/theme/sotto_colors.dart';

class SettlingScreen extends StatelessWidget {
  const SettlingScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final c = context.sotto;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(40),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox(
              width: 96,
              height: 96,
              child: Stack(
                alignment: Alignment.center,
                children: [
                  Container(
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(color: c.hair, width: 2),
                    ),
                  ),
                  SizedBox(
                    width: 96,
                    height: 96,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      valueColor: AlwaysStoppedAnimation(c.accent),
                      backgroundColor: Colors.transparent,
                    ),
                  ),
                  SottoIcon('bolt', size: 34, weight: 1.7, color: c.text),
                ],
              ),
            ),
            const SizedBox(height: 26),
            Text('Settling atomically',
                style: TextStyle(
                    color: c.text,
                    fontSize: 21,
                    fontWeight: FontWeight.w700,
                    letterSpacing: -0.4)),
            const SizedBox(height: 6),
            SizedBox(
              width: 240,
              child: Text(
                'One ledger transaction. Every payment clears, or none does.',
                textAlign: TextAlign.center,
                style: TextStyle(color: c.sec, fontSize: 14.5, height: 1.45),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
