# TIPS2 – Supabase schema dokumentace

NEVER ASSUME DATABASE COLUMNS.
SOURCE OF TRUTH:
tips2_supabase_schema_documentation.md

Before generating SQL or Supabase queries:
1. Verify exact table columns from documentation
2. Never invent columns
3. Never use common defaults like:
   - description
   - role
   - email
   unless explicitly documented

## Přehled architektury

Aplikace používá:

* `auth.users` → autentizace uživatelů přes Supabase Auth
* `profiles` → veřejný profil hráče
* `league_members` → členství hráče v lize
* `competitions` → soutěže
* `matches` → zápasy
* `user_match_predictions` → tipy uživatelů
  Důležité:
* Login probíhá přes email + heslo (`auth.users`)
* Veřejně se používá `profiles.display_name`
* Žádná vlastní tabulka `users` neexistuje

---

# Tabulky

## profiles

Veřejný profil uživatele.

| Sloupec      | Typ         | Poznámka                        |
| ------------ | ----------- | ------------------------------- |
| id           | uuid        | PK, reference na auth.users(id) |
| display_name | text        | veřejný nick hráče, unique      |
| is_admin     | boolean     | admin flag                      |
| created_at   | timestamptz | datum vytvoření                 |
| Použití:     |             |                                 |

* nick hráče
* admin oprávnění
* leaderboardy

---

## leagues

Ligy / skupiny hráčů.

| Sloupec    | Typ         | Poznámka         |
| ---------- | ----------- | ---------------- |
| id         | uuid        | PK               |
| name       | text        | název ligy       |
| created_by | uuid        | FK → profiles.id |
| created_at | timestamptz | datum vytvoření  |
| POZOR:     |             |                  |

* tabulka aktuálně NEMÁ sloupec `description`

---

## league_members

Členství uživatelů v ligách.

| Sloupec      | Typ         | Poznámka         |
| ------------ | ----------- | ---------------- |
| league_id    | uuid        | FK → leagues.id  |
| user_id      | uuid        | FK → profiles.id |
| joined_at    | timestamptz | datum připojení  |
| Primary key: |             |                  |

```txt
(league_id, user_id)
```

---

## league_invites

Pozvánky do lig.

| Sloupec     | Typ         | Poznámka            |
| ----------- | ----------- | ------------------- |
| id          | uuid        | PK                  |
| league_id   | uuid        | FK → leagues.id     |
| email       | text        | email pozvaného     |
| token       | text        | unique invite token |
| invited_by  | uuid        | FK → profiles.id    |
| accepted_by | uuid        | FK → profiles.id    |
| expires_at  | timestamptz | expirace            |
| accepted_at | timestamptz | datum přijetí       |
| created_at  | timestamptz | vytvoření           |

---

## competitions

Sportovní soutěže.

| Sloupec                | Typ         | Poznámka            |
| ---------------------- | ----------- | ------------------- |
| id                     | uuid        | PK                  |
| name                   | text        | název soutěže       |
| sport                  | text        | football / hockey   |
| tip_top3               | boolean     | zda se tipuje top 3 |
| created_by             | uuid        | FK → profiles.id    |
| created_at             | timestamptz | vytvoření           |
| Validní hodnoty sport: |             |                     |

```txt
football
hockey
```

---

## league_competitions

Propojení soutěží a lig.

| Sloupec        | Typ         | Poznámka             |
| -------------- | ----------- | -------------------- |
| league_id      | uuid        | FK → leagues.id      |
| competition_id | uuid        | FK → competitions.id |
| created_at     | timestamptz | vytvoření            |
| Primary key:   |             |                      |

```txt
(league_id, competition_id)
```

---

## teams

Týmy.

| Sloupec    | Typ         | Poznámka          |
| ---------- | ----------- | ----------------- |
| id         | uuid        | PK                |
| name       | text        | unique název týmu |
| created_at | timestamptz | vytvoření         |

---

## competition_teams

Týmy dostupné v soutěži.

| Sloupec        | Typ  | Poznámka             |
| -------------- | ---- | -------------------- |
| competition_id | uuid | FK → competitions.id |
| team_id        | uuid | FK → teams.id        |
| Primary key:   |      |                      |

```txt
(competition_id, team_id)
```

---

## matches

Zápasy.

| Sloupec        | Typ         | Poznámka             |
| -------------- | ----------- | -------------------- |
| id             | uuid        | PK                   |
| competition_id | uuid        | FK → competitions.id |
| stage          | text        | fáze turnaje         |
| kickoff_at     | timestamptz | datum a čas zápasu   |
| home_team_id   | uuid        | FK → teams.id        |
| away_team_id   | uuid        | FK → teams.id        |
| created_at     | timestamptz | vytvoření            |
| POZNÁMKY:      |             |                      |

* playoff zápasy mohou mít NULL týmy
* používá se `timestamptz`
* čas se kontroluje serverově přes `now()`
  Příklad stage:

```txt
group
quarterfinal
semifinal
final
bronze_match
```

---

## match_results

Výsledky zápasů.

| Sloupec    | Typ         | Poznámka            |
| ---------- | ----------- | ------------------- |
| match_id   | uuid        | PK, FK → matches.id |
| home_score | int         | skóre domácích      |
| away_score | int         | skóre hostů         |
| updated_at | timestamptz | aktualizace         |

---

## user_match_predictions

Tipy uživatelů na zápasy.

| Sloupec      | Typ         | Poznámka         |
| ------------ | ----------- | ---------------- |
| user_id      | uuid        | FK → profiles.id |
| match_id     | uuid        | FK → matches.id  |
| home_score   | int         | tip domácích     |
| away_score   | int         | tip hostů        |
| created_at   | timestamptz | vytvoření        |
| updated_at   | timestamptz | změna            |
| Primary key: |             |                  |

```txt
(user_id, match_id)
```

---

## user_competition_podium_predictions

Tipy na top 3.

| Sloupec        | Typ         | Poznámka             |
| -------------- | ----------- | -------------------- |
| user_id        | uuid        | FK → profiles.id     |
| competition_id | uuid        | FK → competitions.id |
| first_team_id  | uuid        | FK → teams.id        |
| second_team_id | uuid        | FK → teams.id        |
| third_team_id  | uuid        | FK → teams.id        |
| created_at     | timestamptz | vytvoření            |
| updated_at     | timestamptz | změna                |
| Primary key:   |             |                      |

```txt
(user_id, competition_id)
```

---

## competition_results

Finální výsledky soutěže.

| Sloupec        | Typ         | Poznámka                 |
| -------------- | ----------- | ------------------------ |
| competition_id | uuid        | PK, FK → competitions.id |
| first_team_id  | uuid        | FK → teams.id            |
| second_team_id | uuid        | FK → teams.id            |
| third_team_id  | uuid        | FK → teams.id            |
| updated_at     | timestamptz | změna                    |
| Důležité:      |             |                          |

* výsledky jsou na úrovni soutěže
* NE na úrovni ligy
* jedna soutěž může být v několika ligách

---

# Scoring funkce

## calculate_match_points

Výpočet bodů za zápas.
Parametry:

```txt
p_sport
p_pred_home
p_pred_away
p_actual_home
p_actual_away
```

Fotbal:

| Situace         | Body |
| --------------- | ---- |
| správný směr    | 1    |
| přesný výsledek | 3    |
| Hokej:          |      |
| Situace         | Body |
| ---             | ---  |
| správná strana  | 1    |
| správný rozdíl  | 2    |
| přesný výsledek | 4    |

---

## calculate_podium_points

Výpočet bodů za top 3.

| Situace                    | Body |
| -------------------------- | ---- |
| přesná pozice              | 10   |
| tým v top 3 na jiné pozici | 5    |

---

# Import Excel / CSV

Očekávané pořadí sloupců:

| Pořadí        | Význam               |
| ------------- | -------------------- |
| 1             | den                  |
| 2             | měsíc                |
| 3             | rok                  |
| 4             | hodina               |
| 5             | minuta               |
| 6             | fáze turnaje         |
| 7             | domácí tým           |
| 8             | hostující tým        |
| Mapování:     |                      |
| Excel         | DB                   |
| ---           | ---                  |
| datum + čas   | matches.kickoff_at   |
| fáze turnaje  | matches.stage        |
| domácí tým    | matches.home_team_id |
| hostující tým | matches.away_team_id |
| Důležité:     |                      |

* datetime ukládat jako ISO datetime
* timezone Europe/Prague
* playoff zápasy mohou mít NULL týmy
* nové týmy vložit do `teams`
* zároveň vložit do `competition_teams`

---

# Důležité architektonické principy

## Login

Používat:

```txt
auth.users
```

## NE vlastní users tabulku.

## Veřejná identita

Používat:

```txt
profiles.display_name
```

## NE email.

## Čas

Používat:

```txt
timestamptz
```

A serverový čas:

```sql
now()
```

## NE lokální čas browseru.

## League vs Competition

Datově:

* league = skupina hráčů
* competition = sportovní soutěž
  Leaderboard:

```txt
league + competition
```

Výsledky soutěže:

```txt
competition_results
```

## NE per liga.

# Frontend routes

Doporučené routes:

| Route                                          | Význam                      |
| ---------------------------------------------- | --------------------------- |
| /                                              | login nebo hlavní dashboard |
| /competition/[competitionId]                   | detail soutěže              |
| /competition/[competitionId]/predict           | tipování                    |
| /competition/[competitionId]/grid              | grid tipů                   |
| /competition/[competitionId]/league/[leagueId] | leaderboard ligy            |
| /invite/[token]                                | přijetí pozvánky            |
| /admin/...                                     | admin sekce                 |


IMPORTANT:
matches table DOES NOT contain:
- home_score
- away_score

Scores are stored ONLY in:
match_results