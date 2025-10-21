# ICD-10 Lernplattform (F0–F9)

Diese Anwendung ist eine interaktive Lernplattform für die ICD-10-Kategorien F0 bis F9. Sie wurde mit [Vite](https://vitejs.dev/), React 18 und Tailwind CSS aufgebaut und bietet mehrere Lernmodi:

- **Explorer**: Hierarchische Navigation durch Haupt- und Unterkategorien.
- **Leitner-Box**: Spaced-Repetition-Training mit einem 5-Boxen-System.
- **Lernkarten**: Lineares Durcharbeiten aller Diagnosen.
- **Quiz**: Fallbasiertes Multiple-Choice-Training.

## Erste Schritte

```bash
npm install
npm run dev
```

Der Dev-Server startet standardmäßig auf [http://localhost:5173](http://localhost:5173) und öffnet sich automatisch im Browser.

## Produktion bauen

```bash
npm run build
npm run preview
```

Der Preview-Server dient zum Testen des optimierten Builds.

## Code-Qualität

- `npm run lint` prüft den Quellcode mit ESLint (Standard-Konfiguration).
- Tailwind CSS wird über PostCSS eingebunden. Die relevanten Dateien liegen unter `src/`.

## Projektstruktur

```
├── index.html
├── package.json
├── postcss.config.js
├── tailwind.config.js
├── vite.config.js
└── src
    ├── App.jsx
    ├── index.css
    ├── main.jsx
    └── components
        └── ICD10LearningSystem.jsx
```

Die komplette Logik und die ICD-10-Daten befinden sich in `src/components/ICD10LearningSystem.jsx`.
