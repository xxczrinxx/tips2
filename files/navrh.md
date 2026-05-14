# Zadání pro AI agenta – architektura webu Tipovačka
## Cíl
Vytvořit webovou aplikaci pro tipování sportovních zápasů. Aplikace je postavená primárně kolem běžného hráče. Admin má navíc vlastní administrační funkce.
## 1. Pozvánka do ligy
Celý proces pro nového hráče začíná pozvánkou do konkrétní ligy.
Admin vytvoří pozvánku do ligy.
Pozvánka obsahuje unikátní odkaz.
Uživatel otevře pozvánkový odkaz.
Systém zobrazí stránku pro přijetí pozvánky.
Stránka musí uživateli nabídnout dvě možnosti:
A
zobrazi se mu protokol pro prihlaseni
tzn email a heslo a klik na prihlasit
Po přihlášení systém pozná existujícího uživatele.
Systém ho přidá do ligy podle pozvánkového odkazu.
Poté ho přesměruje do aplikace, ideálně na dashboard.
B
Pokud uživatel účet nemá,
pod protokolem pro prihlaseni bude tlacitko "registrace noveho uzivatele" 
po kliknuti se mu
Zobrazí registrační formulář.
Formulář obsahuje:
- e-mail
- heslo
- přezdívku / zobrazované jméno
Po registraci systém vytvoří uživatele.
Systém uloží jeho přezdívku do profilu.
Systém ho automaticky přidá do ligy podle pozvánkového odkazu.
Poté ho přesměruje do aplikace, ideálně na dashboard.
Ověření e-mailem není potřeba.
## 4. Přihlášení mimo pozvánku
První stránka webu je pouze přihlašovací stránka.
Přihlašovací stránka obsahuje:
- pole pro e-mail
- pole pro heslo
- tlačítko `Přihlásit se`
- odkaz `Zapomněl jsem heslo`
Na běžné přihlašovací stránce nemá být veřejná registrace.
Registrace probíhá pouze přes pozvánkový odkaz.
## 5. Zapomenuté heslo
Po kliknutí na `Zapomněl jsem heslo` se zobrazí formulář.
Formulář obsahuje:
- pole pro zadání e-mailové adresy
- tlačítko pro odeslání resetovacího odkazu
Po odeslání se uživateli pošle resetovací link na e-mail.
## 6. Hlavní layout po přihlášení
Po přihlášení se uživatel dostane do aplikace.
Aplikace má nahoře pevnou vodorovnou hlavní lištu.
Tato lišta je stejná pro všechny uživatele.
Hlavní horní lišta obsahuje zleva doprava:
1. Logo webu
2. Jméno přihlášeného uživatele
3. Tlačítko `Tipovat`
4. Tlačítko `Kompletní výsledky`
5. Vpravo bdue mit moznost výběru soutěže
Kliknutí na logo vrací uživatele na dashboard.
Tlačítko `Zpět` není potřeba.
## 7. Admin lišta
Pokud je uživatel admin, zobrazí se pod hlavní lištou druhá menší administrační lišta.
Běžný uživatel tuto lištu nevidí.
Admin lišta obsahuje:
- `Nová liga`
- `Nový turnaj`
- `Pozvanka`
- `Editovat výsledky`
## 8. Dashboard
Dashboard je první stránka po přihlášení.
Dashboard není detail konkrétní ligy.
Dashboard je základní přehled pro hráče.
Dashboard má dvě hlavní části.
Levá část zobrazuje pořadí všech lig ve kterých uživatel hraje pro danou soutěž, kterou si vybral vpravo na zakladni liste.
Pokud uživatel hraje jen v jedné skupině, zobrazí se pouze jedno pořadí.
Pořadí obsahuje:
- poradi
- jméno hráče
- body a v závorce počet spravnych tipu
Pravá část zobrazuje dnešní zápasy, které je potřeba natipovat.
U dnešních zápasů má být možné rovnou zadat tip přímo z dashboardu.
Každý dnešní zápas obsahuje:
- čas zápasu
- domácí tým
- hostující tým
- pole pro tip skóre domácích
- pole pro tip skóre hostů
- tlačítko `Uložit`
Plné tipování je stále na stránce `Tipovat`.
## 9. Stránka Tipovat
Po kliknutí na tlačítko `Tipovat` se zobrazí stránka pro zadávání tipů.
Stránka pracuje s aktuálně vybranou soutěží.
Soutěž lze přepínat vpravo nahoře.
Nahoře je tlačítko `Ulož tipy`.
Tlačítko `Ulož tipy` uloží najednou:
- tipy na všechny zápasy
- případný tip TOP 3
Pokud má soutěž zapnuté tipování TOP 3, zobrazí se tato část úplně nahoře nad zápasy.
TOP 3 obsahuje tři rozbalovací seznamy:
- 1. místo
- 2. místo
- 3. místo
Uživatel vybere týmy z nabídky.
Pod TOP 3 se vypíšou všechny zápasy dané soutěže.
Zápasy se vizuálně rozdělí podle fáze turnaje.
Příklad fází:
- Skupiny
- Osmifinále
- Čtvrtfinále
- Semifinále
- Finále
Každá fáze má vlastní nadpis.
Pod nadpisem jsou jednotlivé zápasy.
Každý zápas je na samostatném řádku.
Každý řádek zápasu obsahuje:
- datum zápasu
- čas zápasu
- domácí tým
- hostující tým
- pole pro tip skóre domácích
- pole pro tip skóre hostů
Datum a čas musí být viditelné, aby hráč věděl, dokdy může zápas tipovat.
## 10. Stránka Kompletní výsledky
Po kliknutí na tlačítko `Kompletní výsledky` se zobrazí mřížka všech zápasů a všech tipů hráčů.
Stránka pracuje s aktuálně vybranou soutěží.
Soutěž lze přepínat vpravo nahoře.
Řádky = zápasy.
Sloupce = soutěžící.
Soutěžící ve sloupcích jsou seřazení zleva doprava podle aktuálního počtu bodů.
Nejlepší hráč je nejvíce vlevo.
Řádek zápasu obsahuje:
- domácí tým
- hostující tým
- reálný výsledek, pokud už ho admin zadal
- tipy jednotlivých soutěžících
Hlavička sloupce soutěžícího obsahuje:
- jméno soutěžícího
- celkový počet bodů
- v závorce počet přesně trefených výsledků
Příklad:
`Tomáš`
`24 (5)`
Barevné hodnocení tipů: vždy bile pismo, meni se pozadi
- 0 bodů: zustava cerne
- 1 bod: zeleně
- 2 body: žlutě
- 3 nebo 4 body: červeně
Poznámka:
- fotbal může mít maximum 3 body
- hokej může mít maximum 4 body
## 11. Vytvoření ligy – admin
Po kliknutí na `Vytvořit ligu` se zobrazí jednoduchý formulář.
Formulář obsahuje:
- název ligy
- tlačítko `Vytvořit`
Po vytvoření ligy může admin do ligy pozývat hráče.
## 12. Pozvání hráče do ligy – admin
Po kliknutí na `Pozvat člověka do ligy` se zobrazí formulář.
Formulář obsahuje:
- výběr ligy
vygeneruje se odkaz, který prekopiruje admin a posle pozvanym
Po potvrzení systém vytvoří unikátní pozvánkový odkaz.
Pozvánka je vždy vázaná na konkrétní ligu.
Uživatel, který otevře pozvánku, se buď přihlásí, nebo registruje.
Po přihlášení nebo registraci je automaticky přidán do dané ligy.
## 13. Vytvoření turnaje / soutěže – admin
Po kliknutí na `Vytvořit soutěž / turnaj` se adminovi zobrazí formulář pro založení nové soutěže.
Formulář obsahuje:
1. Název turnaje / soutěže
2. Výběr sportu:
- fotbal
- hokej
3. Checkbox:
- tipovat TOP 3 ano/ne
4. Nahrání Excel souboru s rozpisem zápasů
Excel musí mít sloupce v tomto pořadí:
1. den
2. měsíc
3. rok
4. hodina
5. minuta
6. fáze turnaje
7. domácí tým
8. hostující tým
Příklad fáze turnaje:
- Skupiny
- Osmifinále
- Čtvrtfinále
- Semifinále
- Finále
Po nahrání Excelu se vytvoří soutěž a zápasy.
## 14. Editace výsledků – admin
Po kliknutí na `Editovat výsledky` se adminovi zobrazí stránka podobná stránce `Tipovat`, ale s administračními poli.
Stránka pracuje s aktuálně vybranou soutěží.
Soutěž lze přepínat vpravo nahoře.
Admin zde může:
- doplnit chybějící týmy pro playoff zápasy
- zadat reálné výsledky zápasů
- zadat konečné TOP 3 soutěže
- uložit všechny změny najednou
Nahoře bude tlačítko `Uložit`.
Řádek zápasu v admin editaci obsahuje:
- datum
- čas
- fázi turnaje
- domácí tým
- hostující tým
- editovatelný výsledek domácích
- editovatelný výsledek hostů
U playoff zápasů musí jít doplnit týmy později, protože při importu nemusí být ještě známé.
## 15. Obecná navigační logika
Logo vždy vede na dashboard.
Hlavní menu je stejné pro všechny.
Admin má navíc druhou lištu.
Výběr soutěže je vpravo nahoře.
Stránky `Tipovat`, `Kompletní výsledky` a `Editovat výsledky` mění obsah podle vybrané soutěže.
Dashboard ukazuje souhrn hráče napříč jeho ligami a dnešní zápasy k natipování.
Registrace není veřejná.
Registrace existuje pouze přes pozvánku do ligy.
## 16. Důležité UX zásady
Web má být jednoduchý.
Hráč má rychle vidět, co má dnes natipovat.
Hráč má mít možnost rychle uložit tipy.
Kompletní výsledky mají být přehledná mřížka.
Admin funkce mají být oddělené od běžných hráčských funkcí.
Běžný hráč nesmí vidět admin lištu.
Pozvánka do ligy musí být jasný vstupní bod pro nové hráče.
Logo je ve slozce files, logo.png
Logo bude zobrazene cele, nebude oriznute, nebo jen cast