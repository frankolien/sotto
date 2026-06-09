/// One concept slide in the intro carousel.
class Concept {
  final String iconName;
  final String title;
  final String body;
  const Concept({required this.iconName, required this.title, required this.body});
}

const kConcepts = <Concept>[
  Concept(
    iconName: 'lock',
    title: 'Confidential by default',
    body: 'Disburse to a whole roster at once. No recipient can see another’s '
        'payment — and competitors see nothing at all.',
  ),
  Concept(
    iconName: 'eye',
    title: 'Auditable by permission',
    body: 'A named auditor gets read-only visibility into the entire batch. '
        'Visibility is granted, never assumed.',
  ),
  Concept(
    iconName: 'bolt',
    title: 'Atomic settlement',
    body: 'Every payment in a batch clears in a single ledger transaction — all '
        'of them, or none. No partial failures.',
  ),
];
