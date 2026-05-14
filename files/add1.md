# Zadání pro VS Code AI agenta – TIPS2 frontend
Vytvoř webovou aplikaci TIPS2 v Next.js App Routeru napojenou na Supabase.
## Kontext
Aplikace slouží pro tipování sportovních zápasů v ligách. Uživatel se přihlašuje emailem a heslem přes Supabase Auth. Uvnitř aplikace vystupuje pod nickem z `profiles.display_name`.
Registrace běžného hráče nesmí být veřejná z hlavní login stránky. Registrace bude pouze přes pozvánku do ligy.
## Supabase
Projekt už má `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
Existuje klient:
- `lib/supabaseClient.ts`
Tabulky v Supabase:
- `profiles`
- `leagues`
- `league_members`
- `league_invites`
- `competitions`
- `league_competitions`
- `teams`
- `competition_teams`
- `matches`
- `match_results`
- `user_match_predictions`
- `user_competition_podium_predictions`
- `competition_results`
Existují scoring funkce:
- `calculate_match_points`
- `calculate_podium_points`
## Role
### Nepřihlášený uživatel
- vidí login stránku
- může se přihlásit emailem a heslem
- může resetovat heslo
- nemá veřejnou registraci
- registrace pouze přes invite link
### Běžný hráč
- vidí svoje ligy
- vidí soutěže v dané lize
- může tipovat zápasy
- může měnit tipy jen do začátku zápasu
- může tipovat top 3, pokud je to u soutěže zapnuté
- může měnit top 3 jen do začátku prvního zápasu soutěže
- vidí svoje body
- vidí žebříček ligy
- vidí tipy ostatních až po uzamčení zápasu
### Admin
- může vytvořit ligu
- může vytvořit pozvánku do ligy
- může vytvořit soutěž
- u soutěže nastaví sport: `football` nebo `hockey`
- nastaví, jestli se tipuje top 3
- může importovat zápasy z Excelu / CSV
- může přiřadit soutěž do ligy
- může editovat zápas
- může doplnit týmy do play-off zápasů
- může zadat nebo opravit výsledek zápasu
## Bodování
Fotbal:
- správný směr: 1 bod
- přesný výsledek: 3 body
Hokej:
- správná strana: 1 bod
- správný rozdíl: 2 body celkem
- přesný výsledek: 4 body
Top 3:
- přesná pozice: 10 bodů
- tým je v top 3, ale na jiné pozici: 5 bodů
## Požadované stránky
Vytvoř tyto routes:
- `/` login page
- `/leagues` seznam lig uživatele
- `/league/[leagueId]` seznam soutěží v lize
- `/league/[leagueId]/competition/[competitionId]` default leaderboard / pořadí
- `/league/[leagueId]/competition/[competitionId]/predict` tipování zápasů
- `/league/[leagueId]/competition/[competitionId]/grid` přehled tipů všech hráčů
- `/league/[leagueId]/admin/new-competition` admin vytvoření soutěže
- `/league/[leagueId]/admin/invites` admin pozvánky
- `/invite/[token]` přijetí pozvánky
## Technické požadavky
- Použij Next.js App Router.
- Použij TypeScript.
- Použij Supabase klienta z `lib/supabaseClient.ts`.
- Používej `use client` tam, kde je potřeba práce se session nebo formuláři.
- Neřeš zatím perfektní design. Důležité je funkční flow.
- Přidej jednoduché loading a error stavy.
- Po loginu přesměruj na `/leagues`.
- Pokud uživatel není přihlášený, chráněné stránky ho přesměrují na `/`.
- Admin prvky zobrazuj jen pokud `profiles.is_admin = true`.
## Důležité
Nepředpokládej veřejnou registraci.
Nepoužívej vlastní tabulku `users`.
Používej:
- `auth.users` pro login
- `profiles` pro nick a admin flag
- `league_members` pro členství v lize
Čas uzamčení tipů se musí řídit serverem/Supabase, ne lokálním časem prohlížeče.
Frontend může zobrazovat upozornění, ale finální ochrana bude přes Supabase RLS/RPC.
## Začni
Nejdřív vytvoř základní routing, login flow, načtení profilu a stránku `/leagues`.
Potom pokračuj soutěžemi, detailem soutěže, tipováním a gridem.

## Import zápasů z Excelu / CSV
Import soubor má sloupce přesně v tomto pořadí:
1. den
2. měsíc
3. rok
4. hodina
5. minuta
6. fáze turnaje
7. domácí tým
8. hostující tým
Při importu:
- den, měsíc, rok, hodina a minuta slož do jednoho datetime
- datetime ulož do `matches.kickoff_at` jako ISO string s timezone Europe/Prague
- fázi turnaje ulož do `matches.stage`
- domácí tým najdi/vytvoř v `teams.name`, jeho id ulož do `matches.home_team_id`
- hostující tým najdi/vytvoř v `teams.name`, jeho id ulož do `matches.away_team_id`
- nově vytvořené týmy zároveň vlož do `competition_teams`
- soutěž vezmi z právě vytvářené/editované soutěže a ulož jako `matches.competition_id`
- u play-off zápasů může být domácí nebo hostující tým prázdný; v tom případě ulož `NULL`