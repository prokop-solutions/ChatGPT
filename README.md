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
│   ├── db.js                               # Initialisiert die lokale SQLite-DB
│   ├── index.js                            # Express-Server mit Auth-/Status-/Progress-Endpunkten
│   ├── middleware
│   │   └── authMiddleware.js               # JWT-Validierung für geschützte Routen
│   └── repositories
│       ├── sqliteUserRepository.js         # Implementierung für lokale SQLite-Speicherung
│       ├── supabaseUserRepository.js       # Implementierung für Supabase/Postgres
│       └── userRepository.js               # Wählt automatisch das passende Repository
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

## Benutzer-Service (Express + SQLite oder Supabase)

- Passwörter werden mit [bcryptjs](https://www.npmjs.com/package/bcryptjs) gehasht und niemals im Klartext gespeichert.
- Stati werden getrennt von Stammdaten versioniert (`user_statuses`).
- Lernstände (Leitner-Boxen, Flashcard-Index, kumulative Quizwerte) landen in `user_learning_states` und werden automatisch bei jeder Änderung gespeichert.
- Authentifizierung erfolgt via JWT (Gültigkeit standardmäßig 2 Stunden).
- Der Server entscheidet beim Start automatisch, ob er die lokale SQLite-DB oder Supabase/Postgres nutzt:
  - **Ohne Supabase-Umgebungsvariablen** wird `better-sqlite3` verwendet und die Datei `data/users.db` automatisch angelegt.
  - **Mit Supabase** (`SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`) wird die dortige Datenbank genutzt. Optional lassen sich die Tabellennamen anpassen.
- Das Health-Endpoint `GET /api/health` zeigt unter `storage`, welche Variante aktiv ist (`sqlite` oder `supabase`).
- Wichtige Environment-Variablen:

| Variable | Zweck | Standard |
| --- | --- | --- |
| `PORT` | Port des Express-Servers | `4000` |
| `CLIENT_ORIGIN` | Erlaubte Origins, kommasepariert | `http://localhost:5173` |
| `JWT_SECRET` | Secret für Token-Signierung | `dev-secret-change-me` |
| `USER_DB_PATH` | Pfad zur SQLite-Datei (nur SQLite) | `data/users.db` |
| `SUPABASE_URL` | URL deines Supabase-Projekts (aktiviert Supabase-Modus) | – |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-Role-Key mit Schreibrechten | – |
| `SUPABASE_USERS_TABLE` | (Optional) Name der Benutzer-Tabelle | `app_users` |
| `SUPABASE_USER_STATUSES_TABLE` | (Optional) Name der Status-Tabelle | `user_statuses` |
| `SUPABASE_USER_PROGRESS_TABLE` | (Optional) Name der Fortschritts-Tabelle | `user_learning_states` |

### Wichtige API-Endpunkte

- `POST /api/auth/register` – Benutzer registrieren (`email`, `password`, optional `status`), liefert initialen Fortschritt.
- `POST /api/auth/login` – Login, liefert JWT, aktuellen Status und Fortschritt.
- `GET /api/users/me` – Stammdaten & letzter Status des eingeloggten Users.
- `GET /api/users/me/statuses` – kompletter Statusverlauf.
- `POST /api/users/me/statuses` – neuen Status anhängen.
- `GET /api/users/me/progress` – aktuellen Lernfortschritt (Leitner-Boxen, Flashcards, Quiz) abrufen.
- `PUT /api/users/me/progress` – Lernfortschritt aktualisieren (wird vom Frontend automatisch angestoßen).

Für produktive Deployments sollte der Server hinter HTTPS laufen und `JWT_SECRET` unbedingt ersetzt werden.

### Supabase-Setup

1. Lege in deinem Supabase-Projekt folgende Tabellen an (SQL-Beispiel):

   ```sql
   create table public.app_users (
     id uuid primary key default gen_random_uuid(),
     email text not null unique,
     password_hash text not null,
     created_at timestamptz default now(),
     updated_at timestamptz default now()
   );

   create or replace function public.set_updated_at()
   returns trigger as $$
   begin
     new.updated_at = now();
     return new;
   end;
   $$ language plpgsql;

   create trigger trg_app_users_updated
   before update on public.app_users
   for each row execute function public.set_updated_at();

   create table public.user_statuses (
     id uuid primary key default gen_random_uuid(),
     user_id uuid references public.app_users(id) on delete cascade,
     status text not null,
     created_at timestamptz default now()
   );

   create table public.user_learning_states (
     user_id uuid primary key references public.app_users(id) on delete cascade,
     leitner_boxes jsonb not null default '{}'::jsonb,
     flashcard_index integer not null default 0,
     quiz_correct integer not null default 0,
     quiz_total integer not null default 0,
     updated_at timestamptz default now()
   );

   create trigger trg_user_learning_states_updated
   before update on public.user_learning_states
   for each row execute function public.set_updated_at();
   ```

2. Hinterlege `SUPABASE_URL` und `SUPABASE_SERVICE_ROLE_KEY` (z. B. via `.env`).
3. Starte den Server wie gewohnt mit `npm run server`. Das Health-Endpoint bestätigt, dass `storage: "supabase"` aktiv ist.
