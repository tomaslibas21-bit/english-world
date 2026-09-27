# Žaidimo paskelbimas internete (GitHub Pages)

„English World“ yra paprasta svetainė. Jai nereikia serverio, duomenų bazės, paskyrų ar mokamų paslaugų. Ją nemokamai talpins **GitHub Pages**.

Viskas jau paruošta. Trūksta tik vieno dalyko: šiame „Mac“ kompiuteryje dar niekas neprisijungęs prie GitHub. Tai galite padaryti tik jūs. Užtruks apie 5 minutes, o visa kita padarys Claude.

## 1. Įdiekite GitHub įrankį (vieną kartą)

1. Atidarykite programą **Terminalas** (angl. *Terminal*): paspauskite Cmd + tarpas, įrašykite „Terminal“ ir paspauskite Enter.
2. Įklijuokite šią eilutę ir paspauskite Enter:

   ```bash
   brew install gh
   ```

3. Palaukite, kol diegimas baigsis (1–2 minutės). Terminalo neuždarykite.

## 2. Prisijunkite prie GitHub (vieną kartą)

1. Terminale įklijuokite šią eilutę ir paspauskite Enter:

   ```bash
   gh auth login
   ```

2. Įrankis užduos kelis klausimus angliškai. Atsakymą pasirinkite rodyklėmis ir patvirtinkite paspausdami Enter:

   | Klausimas | Ką pasirinkti |
   |---|---|
   | Where do you use GitHub? | **GitHub.com** |
   | What is your preferred protocol for Git operations on this host? | **HTTPS** |
   | Authenticate Git with your GitHub credentials? | **Yes** (tiesiog Enter) |
   | How would you like to authenticate GitHub CLI? | **Login with a web browser** |

   Trečiame klausime būtinai atsakykite **Yes**. Kitaip Claude negalės įkelti automatinio paskelbimo nustatymų.

3. Terminalas parodys vienkartinį kodą, pavyzdžiui, `A1B2-C3D4`. Įsidėmėkite jį ir paspauskite Enter. Atsidarys naršyklė.
4. Naršyklėje prisijunkite prie savo GitHub paskyros. Tai turi būti ta pati paskyra, kurioje yra „English Master“ svetainės kodas (`fluent-steps`). Įrašykite kodą ir patvirtinkite (mygtukai **Continue** ir **Authorize**).
5. Kai Terminale pasirodys užrašas **Logged in as …** su jūsų GitHub vardu, viskas paruošta. Tada pokalbyje parašykite, kad prisijungėte.

## 3. Ką tada padarys Claude

1. Paklaus, kaip pavadinti saugyklą (angl. *repository*; siūlomas pavadinimas `english-world`) ir ar ji gali būti vieša (žr. „Svarbu žinoti“).
2. Sukurs saugyklą jūsų GitHub paskyroje ir įkels į ją žaidimą. Tai apie 200 MB, todėl pirmą kartą įkėlimas užtrunka kelias minutes.
3. Įjungs GitHub Pages.
4. Palauks, kol GitHub pirmą kartą surinks ir paskelbs svetainę (apie 5 minutes). Tada patikrins, ar veikia pokalbiai, paveikslėliai ir balsai.
5. Atsiųs jums žaidimo adresą.

## Žaidimo adresas

```
https://<GitHub vardas>.github.io/<saugyklos pavadinimas>/
```

Pavyzdžiui, jei paskyra yra `tomaslibas21-bit`, o saugykla `english-world`, adresas bus:
**https://tomaslibas21-bit.github.io/english-world/**

Mokinių pažanga saugoma jų naršyklėje, atskirai kiekvienam domenui. Jei žaidimą vėliau perkeltumėte į kitą domeną (pavyzdžiui, į savo svetainės adresą), pažanga ten prasidėtų iš naujo. Todėl adresą verta pasirinkti iš karto.

## Kaip atnaujinama

Kiekvieną kartą, kai pakeitimai įkeliami (angl. *push*) į saugyklos pagrindinę šaką `main`, GitHub pats iš naujo surenka ir paskelbia svetainę. Tai trunka apie 3–5 minutes. Nieko spausti nereikia.

- Eigą galite matyti saugyklos puslapyje, skiltyje **Actions**: geltonas taškas – darbas vyksta, žalia varnelė – nauja versija paskelbta, raudonas kryžiukas – nepavyko.
- Jei nepavyko, internete toliau veikia ankstesnė versija. Claude pažiūrės, kas negerai.
- Mokiniams užtenka perkrauti puslapį. Kartais nauja versija pasirodo tik po kelių minučių.

## Nuoroda iš „English Master“ svetainės

Žaidimą geriausia atidaryti paprasta nuoroda naujame skirtuke, pavyzdžiui, meniu punktu ar mygtuku **„Žaidimas“**:

```html
<a href="https://tomaslibas21-bit.github.io/english-world/" target="_blank" rel="noopener">Žaisti „English World“</a>
```

- Kai duosite leidimą, Claude gali įdėti tokią nuorodą į „English Master“ svetainės meniu per GitHub, be Lovable kreditų.
- Neįterpkite žaidimo į kitą puslapį rėmeliu (*iframe*). Taip įterptam žaidimui naršyklės dažnai neleidžia naudoti mikrofono, be to, jam lieka mažiau vietos ekrane.

## Kodėl reikia https

Kalbos atpažinimas (mikrofonas) naršyklėse veikia tik saugiuose puslapiuose, kurių adresas prasideda `https://`. GitHub Pages visada naudoja https, todėl nieko papildomai daryti nereikia. Jei kada nors prijungtumėte savo domeną, nustatymuose turi likti įjungta parinktis **Enforce HTTPS**.

## Svarbu žinoti

- **Kaina.** GitHub Pages yra nemokamas. Svetainė gali užimti iki 1 GB (žaidimas užima apie 200 MB). Mėnesio srauto riba yra apie 100 GB. Per vieną pokalbį atsisiunčiama maždaug 1 MB duomenų, todėl to užtenka dešimtims tūkstančių pokalbių per mėnesį.
- **Viešumas.** Svetainę gali atsidaryti kiekvienas, kas žino adresą, nes slaptažodžio nėra. Su nemokama GitHub paskyra vieša turi būti ir pati saugykla: žaidimo kodas, tekstai ir garso įrašai. Kad saugykla būtų privati, reikia mokamos GitHub Pro paskyros, bet svetainė vis tiek liks vieša.
- **Pažanga** saugoma kiekvieno mokinio naršyklėje. Paskyrų nėra.

---

## Techninė dalis (Claude)

- **Paskelbimas:** `.github/workflows/deploy.yml`. Jis paleidžiamas po kiekvieno push į `main` arba rankiniu būdu (`gh workflow run deploy.yml`). Naudoja Node 22 ir `npm ci` (su `ONNXRUNTIME_NODE_INSTALL_CUDA=skip`, kad `onnxruntime-node` nesisiųstų CUDA failų). Tada paleidžia `npm run build` (tipų patikrinimas ir surinkimas) su `GAME_BASE=/<saugykla>/`, įkelia `dist/` ir paskelbia. Jei prijungiamas savas domenas, reikia nustatyti saugyklos kintamąjį `GAME_BASE=/` (`gh variable set GAME_BASE --body /`).
- **Kelias:** failai iš `public/` kraunami tik per `import.meta.env.BASE_URL` (žr. `src/game/audio.ts` ir `src/ui/scenes.ts`). Kelias nuo šaknies, pavyzdžiui, `/audio/…`, adrese `/<saugykla>/` neveiktų. Patikrinti galima taip:

  ```bash
  GAME_BASE=/english-world/ npx vite build --outDir /tmp/ew-pages
  GAME_BASE=/english-world/ npx vite preview --outDir /tmp/ew-pages   # tada atidaryti /english-world/
  ```

- **Pirmas paskelbimas** (kai `gh auth status` rodo prisijungimą ir savininkas patvirtino pavadinimą bei viešumą):

  ```bash
  cd ~/english-world
  git init -b main
  git config user.name "$(gh api user --jq .login)"
  git config user.email "$(gh api user --jq '"\(.id)+\(.login)@users.noreply.github.com"')"   # ne asmeninis el. paštas
  git add -A && git commit -m "English World"
  gh repo create english-world --public --source . --remote origin
  git push -u origin main
  gh api -X POST "repos/{owner}/{repo}/pages" -f build_type=workflow
  gh workflow run deploy.yml && sleep 10
  gh run watch "$(gh run list --workflow deploy.yml --limit 1 --json databaseId --jq '.[0].databaseId')" --exit-status
  ```

  Pages įjungiamas tik po pirmo push, nes tuščioje saugykloje GitHub jo gali neleisti įjungti. Todėl automatinis paleidimas po pirmo push gali nepavykti žingsnyje „Set up Pages“. Tai nieko blogo: rankinis paleidimas po to paskelbia svetainę.
- **Dydis:** saugykloje apie 260 MB ir 21 700 failų, iš jų apie 21 200 MP3 failų (apie 225 MB) ir 225 WebP paveikslėliai (18 MB). Didžiausias failas yra `tools/data/cmudict.json` (4,5 MB). GitHub neleidžia failų, didesnių nei 100 MB (įspėja nuo 50 MB), ir rekomenduoja saugyklą iki 1 GB, todėl Git LFS nereikia. `.gitignore` neleidžia įkelti `node_modules/` ir `dist/`.
- **Jei push nepavyksta:** klaidą `RPC failed; HTTP 400` dažniausiai išsprendžia `git config http.postBuffer 524288000` ir pakartotas push. Jei push atmetamas dėl `workflow` teisės, reikia paleisti `gh auth refresh -s workflow`.
