# Framekeeper — instalacija iz ZIP paketa

Ovaj ZIP već sadrži **izgrađenu Chrome ekstenziju** u `extension/dist`. Za instalaciju **ne treba Node.js**. Potrebni su Google Chrome 120+, Python 3.11+ i FFmpeg. Python jednom preuzima besplatni `yt-dlp` i njegove zavisnosti; videi se zatim čuvaju lokalno, bez plaćenog servisa.

## 1. Raspakuj ZIP

Raspakuj `Framekeeper-v0.1.0.zip` u stalni folder, npr. `Documents/Framekeeper` ili `C:\Users\TvojeIme\Documents\Framekeeper`. **Nemoj pomicati folder nakon instalacije**: Chromeov lokalni helper pamti njegovu putanju. U nastavku otvori terminal/PowerShell **unutar raspakovanog foldera `Framekeeper`** (onog koji sadrži `extension` i `helper`).

## 2. Instaliraj FFmpeg i Python

- **Windows:** instaliraj Python 3.11 ili noviji, pa u PowerShellu pokreni `winget install Gyan.FFmpeg`.
- **macOS:** instaliraj Python 3.11+ i FFmpeg, npr. `brew install python ffmpeg`.
- **Ubuntu/Debian:** `sudo apt install python3 python3-venv ffmpeg` (provjeri da je Python 3.11+).

Provjeri `python3 --version` na macOS/Linuxu ili `py -3 --version` na Windowsu, te `ffmpeg -version`. Nakon instalacije FFmpega otvori **novi terminal**.

## 3. Učitaj ekstenziju u Chrome

1. Otvori `chrome://extensions`.
2. Uključi **Developer mode** (način za programere).
3. Klikni **Load unpacked** / **Učitaj raspakovano**.
4. Odaberi **`Framekeeper/extension/dist`** iz raspakovanog ZIP-a — ne sam ZIP, `extension` ni korijenski `Framekeeper` folder.
5. Na kartici ekstenzije kopiraj njen **ID od 32 znaka**. Ako promijeniš lokaciju foldera, ID se može promijeniti i tada treba ponoviti idući korak.

## 4. Instaliraj lokalni helper (jednom)

Zamijeni `TVOJ_EXTENSION_ID` stvarnim ID-om. Komande pokreni iz foldera `Framekeeper`.

**Windows — PowerShell:**

```powershell
py -3 -m venv helper\.venv
.\helper\.venv\Scripts\python.exe -m pip install --upgrade pip
.\helper\.venv\Scripts\python.exe -m pip install -r helper\requirements.txt
.\helper\.venv\Scripts\python.exe -m helper.install --extension-id TVOJ_EXTENSION_ID
```

**macOS / Linux — Terminal:**

```bash
python3 -m venv helper/.venv
helper/.venv/bin/python -m pip install --upgrade pip
helper/.venv/bin/python -m pip install -r helper/requirements.txt
helper/.venv/bin/python -m helper.install --extension-id TVOJ_EXTENSION_ID
```

Ako `python3` pokazuje verziju stariju od 3.11, instaliraj noviji Python i u prvoj komandi upotrijebi npr. `python3.11 -m venv helper/.venv`. Helper se **ne pokreće ručno**: Chrome ga automatski pokreće kada otvoriš ekstenziju.

## 5. Koristi ekstenziju

Potpuno zatvori i ponovo pokreni Chrome. Otvori video na TikToku, Instagramu ili Facebooku i klikni ikonu Framekeeper. Status **LOCAL / READY** znači da je helper povezan. Izaberi kvalitet i klikni **Save video locally**. Možeš i zalijepiti link ili kliknuti desnom tipkom na video → **Download this video**.

Datoteke se spremaju u `Downloads/Framekeeper/TikTok`, `Instagram` ili `Facebook`. Napredak i greške vidiš u ekstenziji. Za drugi folder ponovo pokreni komandu `helper.install` s dodatkom `--output-dir "PUTANJA_DO_FOLDERA"`.

### Ako ne radi

- **Local helper not found:** provjeri da je ID tačan, da je ZIP raspakovan na stalnoj lokaciji, ponovo pokreni komandu `helper.install`, pa restartuj Chrome.
- **FFmpeg missing:** provjeri `ffmpeg -version` u novom terminalu i restartuj Chrome (na Windowsu Chrome mora vidjeti novi PATH).
- **Ne može izdvojiti video:** probaj javno dostupan pojedinačni video, ažuriraj yt-dlp komandom `...python -m pip install --upgrade -r helper/requirements.txt` s putanjom Python interpretera iz koraka 4, ili u Settings po potrebi izaberi kolačiće svog preglednika. Privatni sadržaj i svi Facebook Reels nisu zagarantovani.

Ekstenzija je namijenjena **ličnoj upotrebi**. Preuzimaj samo sadržaj za koji imaš pravo. Više detalja o arhitekturi i ograničenjima: `README.md` i `RESEARCH.md`.
