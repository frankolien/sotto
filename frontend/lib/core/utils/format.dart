import 'package:intl/intl.dart';

final _two = NumberFormat('#,##0.00', 'en_US');
final _zero = NumberFormat('#,##0', 'en_US');

/// Amount with two decimals (e.g. 312,480.00) — matches the design's `fmt`.
String fmt(num n) => _two.format(n);

/// Amount with no decimals (e.g. 312,480) — matches the design's `fmt0`.
String fmt0(num n) => _zero.format(n);
