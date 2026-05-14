# Databázové tabulky a sloupce — TIPS2

Přehled všech tabulek a sloupců, které se **skutečně používají** v aplikaci. Sloupce jsou vybírány z kódu a databáze.

---

## 1. `profiles`

Profil přihlášeného uživatele. Jeden záznam = jeden uživatel.

| Sloupec | Typ | Popis |
| --- | --- | --- |
| `id` | uuid | Identifikátor uživatele (reference na `auth.users`) |
| `display_name` | text | Veřejné jméno hráče (zobrazuje se v leaderboardu) |
| `is_admin` | boolean | Příznak admina (rozhoduje o přístupu k admin panelům) |

**Kde se používá:**
- Leaderboard: zobrazení jména hráče a jeho skóre
- Admin panel: ověření práva na správu lig
- Invite stránka: ověření identity přihlášeného uživatele

---

## 2. `leagues`

Liga/skupiny hráčů. Jeden záznam = jedna liga.

| Sloupec | Typ | Popis |
| --- | --- | --- |
| `id` | uuid | Identifikátor ligy |
| `name` | text | Název ligy (zobrazuje se v UI) |

**Kde se používá:**
- Výběr ligy
- Názvem se identifikuje v navigaci
- Filtruje se pro nalezení soutěží v dané lize

---

## 3. `league_members`

Členství uživatelů v ligách. Vztah N:N.

| Sloupec | Typ | Popis |
| --- | --- | --- |
| `user_id` | uuid | ID uživatele (FK → `profiles.id`) |
| `league_id` | uuid | ID ligy (FK → `leagues.id`) |

**Kde se používá:**
- Filtrování lig, do kterých patří přihlášený uživatel
- Kontrola přístupu k lize (má uživatel právo ji vidět?)
- Upsert pro přijetí pozvánky

---

## 4. `league_competitions`

Propojení lig a soutěží. Vztah N:N.

| Sloupec | Typ | Popis |
| --- | --- | --- |
| `league_id` | uuid | ID ligy (FK → `leagues.id`) |
| `competition_id` | uuid | ID soutěže (FK → `competitions.id`) |

**Kde se používá:**
- Filtrování soutěží, které patří do dané ligy
- Link/vytvoření propojení při vytváření nové soutěže v lize

---

## 5. `competitions`

Sportovní soutěže/turnaje. Jeden záznam = jeden turnaj.

| Sloupec | Typ | Popis |
| --- | --- | --- |
| `id` | uuid | Identifikátor soutěže |
| `name` | text | Název soutěže (např. "Euro 2024") |
| `sport` | text | Typ sportu: `football` nebo `hockey` (určuje bodování) |
| `tip_top3` | boolean | Zda se tipuje finální pódium (1., 2., 3. místo) |

**Kde se používá:**
- Výběr soutěže pro tipování
- Určení bodovacího systému (fotbal vs. hokej)
- Zobrazení informace, zda je pódium k tipování

---

## 6. `teams`

Globální seznam všech týmů.

| Sloupec | Typ | Popis |
| --- | --- | --- |
| `id` | uuid | Identifikátor týmu |
| `name` | text | Název týmu (zobrazuje se v zápasech) |

**Kde se používá:**
- Grid zápasů: převod `home_team_id` a `away_team_id` na jména
- Formulář pro tipování: zobrazení dostupných týmů
- Leaderboard: zobrazení týmů v tipech na pódium

---

## 7. `matches`

Jednotlivé zápasy v soutěži. Jeden záznam = jeden zápas.

| Sloupec | Typ | Popis |
| --- | --- | --- |
| `id` | uuid | Identifikátor zápasu |
| `competition_id` | uuid | ID soutěže (FK → `competitions.id`) |
| `stage` | text | Fáze turnaje (např. `group`, `semifinal`, `final`) |
| `kickoff_at` | timestamptz | Čas konání zápasu (rozhoduje o uzamčení tipů) |
| `home_team_id` | uuid | Domácí tým (FK → `teams.id`, může být NULL) |
| `away_team_id` | uuid | Hosté (FK → `teams.id`, může být NULL) |

**⚠️ POZOR:** Skóre (`home_score`, `away_score`) se ukládá **pouze** v tabulce `match_results`, nikoli v `matches`!

**Kde se používá:**
- Grid: zobrazení všech zápasů (metadata a týmy)
- Predict stránka: výběr zápasů pro tipování
- Filtrování: zápasy do budoucnosti (`kickoff_at`)

---

## 8. `match_results`

Výsledky zápasů. Jeden záznam = skóre jednoho zápasu.

| Sloupec | Typ | Popis |
| --- | --- | --- |
| `match_id` | uuid | ID zápasu (FK → `matches.id`) |
| `home_score` | int | Konečné skóre domácích |
| `away_score` | int | Konečné skóre hostů |

**Kde se používá:**
- Grid: zobrazení výsledků zápasů
- Bodování: porovnání tipu s `home_score` a `away_score`
- Leaderboard: výpočet bodů na základě skutečných výsledků

---

## 9. `user_match_predictions`

Tipy uživatelů na jednotlivé zápasy. Vztah N:N.

| Sloupec | Typ | Popis |
| --- | --- | --- |
| `user_id` | uuid | ID uživatele (FK → `profiles.id`) |
| `match_id` | uuid | ID zápasu (FK → `matches.id`) |
| `home_score` | int | Tip na skóre doma |
| `away_score` | int | Tip na skóre venku |

**Kde se používá:**
- Predict stránka: vstup tipů uživatele
- Grid: zobrazení tipu a výpočet bodů
- Leaderboard: bodování a počet přesných tipů

---

## 10. `user_competition_podium_predictions`

Tipy uživatelů na finální pódium (1., 2., 3. místo).

| Sloupec | Typ | Popis |
| --- | --- | --- |
| `user_id` | uuid | ID uživatele (FK → `profiles.id`) |
| `competition_id` | uuid | ID soutěže (FK → `competitions.id`) |
| `first_team_id` | uuid | Tip na 1. místo (FK → `teams.id`) |
| `second_team_id` | uuid | Tip na 2. místo (FK → `teams.id`) |
| `third_team_id` | uuid | Tip na 3. místo (FK → `teams.id`) |

**Kde se používá:**
- Predict stránka: formulář pro tipy na podium (jen pokud `competitions.tip_top3 = true`)
- Leaderboard: bodování pódium tipů

---

## 11. `league_invites`

Pozvánky do lig.

| Sloupec | Typ | Popis |
| --- | --- | --- |
| `league_id` | uuid | ID ligy (FK → `leagues.id`) |
| `token` | text | Unikátní token pro invite link (např. `/invite/{token}`) |

**Kde se používá:**
- Vytvoření odkazu pro pozvánku (generates `token`)
- Validace invite linku (čtení `token` ze URL)

---

## Datové toky

### Registrace a login
```
auth.users (email, heslo)
    ↓
profiles (id, display_name, is_admin)
```

### Výběr ligy
```
profiles.id
    ↓
league_members (user_id)
    ↓
leagues (id, name)
```

### Výběr soutěže
```
leagues.id
    ↓
league_competitions (league_id, competition_id)
    ↓
competitions (id, name, sport, tip_top3)
```

### Tipování zápasu
```
competitions.id
    ↓
matches (competition_id, id, kickoff_at, home_team_id, away_team_id)
    ↓
teams (id, name) [pro home_team_id a away_team_id]
    ↓
profiles.id + match.id
    ↓
user_match_predictions (user_id, match_id, home_score, away_score)
```

### Bodování
```
user_match_predictions (home_score, away_score) [tip uživatele]
    ↓
match_results (home_score, away_score) [skutečný výsledek]
    ↓
competitions (sport) [určuje bodovací systém]
    ↓
Bodový výpočet
```

---

## ⛔ ZAKÁZANÉ SLOUPCE

Tyto sloupce **NEEXISTUJÍ** nebo se **NESMĚJÍ** používat:

| Tabulka | Sloupec | Důvod |
| --- | --- | --- |
| `profiles` | `email` | Email je v `auth.users`, ne v `profiles` |
| `league_members` | `role` | Sloupec neexistuje |
| `leagues` | `description` | Sloupec neexistuje |
| `matches` | `home_score` | Skóre je v `match_results`, ne v `matches` |
| `matches` | `away_score` | Skóre je v `match_results`, ne v `matches` |

**Správné alternativy:**
- Email → `auth.users.email` (přes Supabase Auth)
- Role → není v DB, řeší se přes `profiles.is_admin`
- Popis ligy → neexistuje, není plánován
- Skóre → `match_results.home_score`, `match_results.away_score`

---

## Poznámky ke sloupům

- Všechny `id` sloupce jsou **uuid** (identifikátory)
- Sloupce s prefixem `*_id` jsou **cizí klíče** (references)
- Sloupce s `_at` jsou **timestamptz** (časy v UTC)
- Skóre se vždy čte z `match_results`, nikoli z `matches`
- `sport` v `competitions` určuje bodovací systém:
  - `football` → 3 body za přesný tip, 1 bod za správný směr
  - `hockey` → 4 body za přesný tip, 2 body za správný rozdíl, 1 bod za správný směr
