import 'package:flutter/material.dart';

void main() {
  runApp(const QuestHuntApp());
}

class Quest {
  final int id;
  final String title;
  final String description;
  final String icon;
  final String nfcId;
  bool completed;
  bool unlocked;

  Quest({
    required this.id,
    required this.title,
    required this.description,
    required this.icon,
    required this.nfcId,
    this.completed = false,
    this.unlocked = false,
  });
}

class QuestHuntApp extends StatelessWidget {
  const QuestHuntApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'QuestHunt',
      theme: ThemeData.dark().copyWith(
        scaffoldBackgroundColor:
            const LinearGradient(colors: [Colors.purple, Colors.indigo])
                .createShader(const Rect.fromLTWH(0, 0, 400, 800)),
      ),
      home: const QuestHuntHomePage(),
    );
  }
}

class QuestHuntHomePage extends StatefulWidget {
  const QuestHuntHomePage({Key? key}) : super(key: key);

  @override
  State<QuestHuntHomePage> createState() => _QuestHuntHomePageState();
}

class _QuestHuntHomePageState extends State<QuestHuntHomePage> {
  final List<Quest> quests = [
    Quest(
      id: 1,
      title: 'Startpunkt erreichen',
      description: 'Finde den ersten NFC-Tag am Startpunkt',
      icon: '🚀',
      nfcId: 'start_001',
      unlocked: true,
    ),
    Quest(
      id: 2,
      title: 'Geheime Nachricht',
      description: 'Entschlüssele die Nachricht am roten Briefkasten',
      icon: '📮',
      nfcId: 'mailbox_002',
    ),
    Quest(
      id: 3,
      title: 'Parkbank Rätsel',
      description: 'Löse das Rätsel an der Parkbank',
      icon: '🪑',
      nfcId: 'bench_003',
    ),
    Quest(
      id: 4,
      title: 'Brunnen Aufgabe',
      description: 'Erfülle die Aufgabe am alten Brunnen',
      icon: '⛲',
      nfcId: 'fountain_004',
    ),
    Quest(
      id: 5,
      title: 'Schatz gefunden!',
      description: 'Finde den finalen Schatz!',
      icon: '💎',
      nfcId: 'treasure_005',
    ),
  ];

  int currentIndex = 0;

  void simulateScan() {
    if (currentIndex >= quests.length) return;

    final quest = quests[currentIndex];
    setState(() {
      quest.completed = true;
      currentIndex++;
      if (currentIndex < quests.length) {
        quests[currentIndex].unlocked = true;
      }
    });
    _showSuccessDialog(quest);

    if (quests.every((q) => q.completed)) {
      Future.delayed(const Duration(milliseconds: 500), _showCompletionDialog);
    }
  }

  void _showSuccessDialog(Quest quest) {
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: Text('${quest.icon} ${quest.title} erfüllt!'),
          content: Text('${quest.description} - Gut gemacht!'),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Weiter'),
            ),
          ],
        );
      },
    );
  }

  void _showCompletionDialog() {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) {
        return AlertDialog(
          title: const Text('Glückwunsch!'),
          content: const Text(
              'Du hast alle Missionen erfolgreich abgeschlossen! Du bist ein wahrer Schatzjäger!'),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.of(context).pop();
                _resetGame();
              },
              child: const Text('Neue Schnitzeljagd'),
            ),
          ],
        );
      },
    );
  }

  void _resetGame() {
    setState(() {
      for (var i = 0; i < quests.length; i++) {
        quests[i].completed = false;
        quests[i].unlocked = i == 0;
      }
      currentIndex = 0;
    });
  }

  @override
  Widget build(BuildContext context) {
    final completed = quests.where((q) => q.completed).length;
    final progress = completed / quests.length;

    return Scaffold(
      appBar: AppBar(
        title: const Text('QuestHunt'),
        actions: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text('$completed/${quests.length}'),
                const Text('Punkte', style: TextStyle(fontSize: 12)),
              ],
            ),
          ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(12.0),
        child: Column(
          children: [
            LinearProgressIndicator(value: progress),
            const SizedBox(height: 8),
            Text(
              completed == 0
                  ? 'Bereit für das Abenteuer!'
                  : (completed == quests.length
                      ? 'Alle Missionen erfüllt! 🎉'
                      : '$completed von ${quests.length} Missionen erfüllt'),
            ),
            const SizedBox(height: 16),
            ElevatedButton.icon(
              onPressed: simulateScan,
              icon: const Icon(Icons.nfc),
              label: const Text('NFC Scannen'),
            ),
            const SizedBox(height: 16),
            Expanded(
              child: ListView.builder(
                itemCount: quests.length,
                itemBuilder: (context, index) {
                  final quest = quests[index];
                  return Card(
                    color: quest.completed
                        ? Colors.green.shade700
                        : quest.unlocked
                            ? Colors.blue.shade700
                            : Colors.grey.shade700,
                    child: ListTile(
                      leading: Text(
                        quest.icon,
                        style: const TextStyle(fontSize: 24),
                      ),
                      title: Text(quest.title),
                      subtitle: Text(quest.description),
                      trailing: Text(
                        quest.completed
                            ? '✅'
                            : quest.unlocked
                                ? '🔓'
                                : '🔒',
                        style: const TextStyle(fontSize: 24),
                      ),
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}
