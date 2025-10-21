# ICD-10 Lernplattform (F0–F9)

Diese Anwendung ist eine interaktive Lernplattform für die ICD-10-Kategorien F0 bis F9. Sie wurde mit [Vite](https://vitejs.dev/), React 18 und Tailwind CSS aufgebaut und bietet mehrere Lernmodi:

- **Explorer**: Hierarchische Navigation durch Haupt- und Unterkategorien.
- **Leitner-Box**: Spaced-Repetition-Training mit einem 5-Boxen-System.
- **Lernkarten**: Lineares Durcharbeiten aller Diagnosen.
- **Quiz**: Fallbasiertes Multiple-Choice-Training.
- **Benutzerverwaltung**: Registrieren, anmelden und Statusverläufe pro Benutzer pflegen.
- **Fortschritt-Sync**: Leitner-Boxen, Lernkarten-Stand und Quiz-Erfolge werden pro Benutzer gespeichert.

## Erste Schritte

```bash
npm install

# Terminal 1 – Express-API für Benutzer starten
npm run server

# Terminal 2 – Frontend entwickeln
npm run dev
```

Der React-Dev-Server läuft unter [http://localhost:5173](http://localhost:5173). Die Benutzer-API lauscht auf Port `4000` und ist über `http://localhost:4000` erreichbar.

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
├── data
│   └── users.db                # SQLite-Datenbank (wird automatisch erzeugt)
├── index.html
├── package.json
├── postcss.config.js
├── server
│   ├── db.js                   # Initialisiert DB und Tabellen (users, user_statuses, user_learning_states)
│   ├── index.js                # Express-Server mit Auth-/Status-/Progress-Endpunkten
│   ├── middleware
│   │   └── authMiddleware.js   # JWT-Validierung für geschützte Routen
│   └── repositories
│       └── userRepository.js   # CRUD-Operationen für Benutzer & Stati
├── tailwind.config.js
├── vite.config.js
└── src
    ├── App.jsx
    ├── index.css
    ├── main.jsx
    └── components
        ├── ICD10LearningSystem.jsx
        └── UserManagementPanel.jsx
```

Die ICD-10-Lernmodi leben in `ICD10LearningSystem.jsx`. Das neue `UserManagementPanel.jsx` bindet die Express-API ein und bietet Registrierung, Login, Statusverwaltung und synchronisierten Lernfortschritt.

## Benutzer-Service (Express + SQLite)

- Passwörter werden mit [bcryptjs](https://www.npmjs.com/package/bcryptjs) gehasht und niemals im Klartext gespeichert.
- Stati werden getrennt von Stammdaten in der Tabelle `user_statuses` versioniert und sind damit nachvollziehbar.
- Lernstände (Leitner-Boxen, Flashcard-Index, kumulative Quizwerte) landen in `user_learning_states` und werden automatisch bei jeder Änderung gespeichert.
- Authentifizierung erfolgt via JWT (Gültigkeit standardmäßig 2 Stunden).
- Standard-Ports und Pfade lassen sich per Environment-Variablen überschreiben:

| Variable | Zweck | Standard |
| --- | --- | --- |
| `PORT` | Port des Express-Servers | `4000` |
| `CLIENT_ORIGIN` | Erlaubte Origins, kommasepariert | `http://localhost:5173` |
| `JWT_SECRET` | Secret für Token-Signierung | `dev-secret-change-me` |
| `USER_DB_PATH` | Pfad zur SQLite-Datei | `data/users.db` |

### Wichtige API-Endpunkte

- `POST /api/auth/register` – Benutzer registrieren (`email`, `password`, optional `status`), liefert initialen Fortschritt.
- `POST /api/auth/login` – Login, liefert JWT, aktuellen Status und Fortschritt.
- `GET /api/users/me` – Stammdaten & letzter Status des eingeloggten Users.
- `GET /api/users/me/statuses` – kompletter Statusverlauf.
- `POST /api/users/me/statuses` – neuen Status anhängen.
- `GET /api/users/me/progress` – aktuellen Lernfortschritt (Leitner-Boxen, Flashcards, Quiz) abrufen.
- `PUT /api/users/me/progress` – Lernfortschritt aktualisieren (wird vom Frontend automatisch angestoßen).

Für produktive Deployments sollte der Server hinter HTTPS laufen und `JWT_SECRET` unbedingt ersetzt werden.
