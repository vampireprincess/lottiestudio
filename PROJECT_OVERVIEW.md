# PROJECT_OVERVIEW

> Glavni izvor istine za viziju, arhitekturu, funkcionalnosti, ograničenja i standard kvaliteta projekta.

Želim da napraviš potpuno funkcionalan, napredan i profesionalan lokalni software React + Vite + Tailwind za kreiranje, uređivanje, animiranje, optimizaciju i export SVG i Lottie animacija.

Ovo ne treba da bude običan jednostavan Lottie editor niti minimalistički proof of concept. Želim ozbiljan vizuelni animation software koji je po načinu rada pristupačniji i jednostavniji od After Effects-a, ali dovoljno moćan za pravljenje profesionalnih jednostavnih i srednje kompleksnih SVG/Lottie animacija.

Interfejs može biti inspirisan alatima kao što su Adobe Animate, Figma, Cavalry, Rive i moderni vektorski editori, ali mora imati svoj originalan, veoma lep, čist, moderan i user-friendly dizajn.

Software je namenjen korisniku koji nije programer. Sve važne funkcije moraju biti vizuelne, intuitivne i lako razumljive bez pisanja koda.

## Veoma važan Project Overview dokument

Odmah na početku projekta kreiraj fajl:

`PROJECT_OVERVIEW.md`

U taj dokument detaljno upiši kompletnu viziju projekta, arhitekturu, sve funkcije iz ovog zahteva, način na koji treba da rade, važne tehničke odluke, ograničenja formata i trenutno stanje implementacije.

Ovaj dokument mora služiti kao glavni izvor istine za ceo projekat.

Kad god implementiraš ili izmeniš neku funkciju, dodaj u PROJECT_OVERVIEW_PROCESS.md u koji ces kreirati i jasno označiti:

- šta je potpuno implementirano;
- šta je delimično implementirano;
- šta još nije implementirano;
- gde se nalazi relevantan kod;
- koja poznata ograničenja postoje;
- šta je potrebno testirati;
- koje odluke ne smeju biti promenjene bez opravdanog razloga.
Ukoliko PROJECT_OVERVIEW_PROCESS.md ne postoji a ti dobijes postojeci projekat, onda je taj fajl namerno obrisan da bi ti napravio od nule detaljan pregled I test svih implementiranih funkicja I onda kreiraj novi PROJECT_OVERVIEW_PROCESS.md u koji ces kreirati i jasno označi:

- šta je potpuno implementirano;
- šta je implementirano a nije spomenut u PROJECT_OVERVIEW.md
- šta je delimično implementirano;
- šta još nije implementirano;
- gde se nalazi relevantan kod;
- koja poznata ograničenja postoje;
- šta je potrebno testirati;
- koje odluke ne smeju biti promenjene bez opravdanog razloga.
Dokument PROJECT_OVERVIEW.md mora omogućiti da drugi code agent ili drugi model otvori projekat, pročita samo taj dokument i odmah razume:

- šta je glavni cilj projekta;
- kako software treba da funkcioniše;
- koje funkcije ne smeju biti uklonjene ili pojednostavljene.
Nemoj brisati funkcije koje već rade kada dodaješ nove funkcije, I ukoliko vidis da ima nova funkcija implementovano a u PROJECT_OVERVIEW.md to ne pise, to je user kasnije trazio da se implementuje ni to nemoj brisati.

## Lokalni rad bez API-ja i cloud servisa

Software mora raditi potpuno lokalno.

Ne želim povezivanje sa spoljnim API-jima, cloud bazama, AI servisima, online render servisima niti obaveznim korisničkim nalogom.

Dozvoljeno je korišćenje lokalnih biblioteka i open-source paketa koji se instaliraju zajedno sa projektom, ali runtime funkcionalnost ne sme zavisiti od interneta.

Koristi lokalnu bazu za:

- projects metadata;
- thumbnails;
- preferences;
- user presets;
- gradient swatches;
- color palettes;
- recent files;
- export presets;
- custom animation presets;
- autosave podatke;
- project recovery podatke.
Sami veliki asseti mogu ostati kao lokalni fajlovi u project folderu, dok baza čuva njihove reference i metadata podatke.

Software mora imati pouzdan autosave i recovery sistem.

## Interni project format

Nemoj graditi editor tako da je interna struktura projekta direktno ograničena samo Lottie JSON formatom.

Napravi bogat interni project format koji može čuvati:

- SVG strukturu;
- layere;
- grupe;
- masks;
- keyframeove;
- easing;
- effects;
- editable glow;
- shadows;
- gradients;
- procedural animation settings;
- attachment points;
- motion paths;
- parent-child veze;
- export settings;
- exposed colors;
- custom presets;
- rendered effects;
- compatibility metadata.
Lottie, dotLottie, animated SVG, GIF i WebM treba da budu export formati, a ne ograničenje internog editora.

## Glavni interfejs

Interfejs mora biti moderan, pregledan i profesionalan.

Potrebne glavne oblasti:

- centralni canvas;
- toolbar;
- floating quick toolbar;
- layers panel;
- properties/inspector panel;
- timeline;
- asset library;
- color and gradient panel;
- animation presets panel;
- export panel;
- compatibility inspector;
- project browser.
Paneli treba da mogu da se:

- resize-uju;
- collapse-uju;
- dock-uju;
- po potrebi sakriju;
- vrate na default workspace.
Dodaj nekoliko gotovih workspace rasporeda, na primer:

- Animation;
- SVG Editing;
- Timeline Focus;
- Export;
- Compact Workspace.
UI mora biti vizuelno lep i imati jasnu hijerarhiju. Nemoj praviti interfejs koji izgleda kao developerski alat ili skup običnih HTML input polja.

Kontrole treba da koriste kvalitetne:

- sliders;
- number inputs;
- color pickere;
- bezier editore;
- visual handles;
- icons;
- tooltips;
- context menije;
- dropdown menije;
- preview thumbnails.
Dodaj light i dark mode.

## Canvas

Canvas mora podržavati:

- transparent checkerboard;
- custom canvas background;
- zoom;
- pan;
- fit to screen;
- fit selection;
- actual size;
- rulers;
- guides;
- snapping;
- smart guides;
- alignment hints;
- grid;
- customizable grid size;
- pixel preview;
- outline view;
- safe zones;
- canvas clipping;
- artboard resizing;
- multiple common canvas presets;
- custom canvas size;
- frame-rate selection;
- background preview color.
Canvas mora imati izbor između različitih preview režima, uključujući:

- normal vector preview;
- Lottie compatibility preview;
- OBS/browser preview;
- transparent background preview;
- dark background preview;
- light background preview.

## Select Tool

Select Tool mora omogućiti:

- pomeranje;
- scale;
- rotation;
- bounding box resizing;
- multi-select;
- box select;
- duplicate by drag;
- snapping;
- align;
- distribute;
- transform origin editing;
- anchor point editing;
- numeric transform editing;
- lock proportions;
- transform multiple selected elements.

## Edit Shape Points / Node Tool

U interfejsu naziv kao što je:

Node Tool

Ovaj alat služi za uređivanje pojedinačnih vector points i Bezier krivih SVG/path elemenata.

Mora omogućiti:

- izbor pojedinačnih tačaka;
- izbor više tačaka;
- pomeranje tačaka;
- dodavanje tačke;
- brisanje tačke;
- convert point to corner;
- convert point to symmetric; (simmetrican smooth)
- convert point to asymmetric; (asimmetrican smooth)
- convert point to disconnect; (jedna strana corner a drugi smooth)
- uređivanje Bezier handles;
- break handles;
- join handles;
- close path;
- open path;
- reverse path direction;
- simplify path;
- smooth path;
- reduce excessive points;
- auto-smooth selected points.

## Pen, Pencil i Brush alati

Dodaj sledeće vektorske alate:

### Pen Tool

Pen Tool služi za precizno ručno crtanje vektorskih putanja pomoću anchor tačaka i Bezier ručica.

Treba da omogući:

- dodavanje novih anchor tačaka klikom na canvas;
- pravljenje ravnih segmenata između tačaka;
- pravljenje zakrivljenih segmenata klikom i povlačenjem;
- zatvaranje otvorene putanje;
- nastavak crtanja postojeće putanje;
- pomeranje anchor tačaka;
- pomeranje Bezier ručica;
- menjanje tačke između corner, smooth i symmetric tipa;
- dodavanje i uklanjanje anchor tačaka;
- spajanje i razdvajanje putanja;
- uređivanje otvorenih i zatvorenih shapeova;
- kreiranje putanja koje kasnije mogu da se koriste kao shape, maska ili motion path.
Pen Tool treba da bude glavni alat za precizno vektorsko crtanje i uređivanje putanja.

### Pencil Tool

Pencil Tool služi za slobodno ručno crtanje vektorskih linija povlačenjem miša ili olovke po canvasu.

Treba da omogući:

- slobodno crtanje otvorenih i zatvorenih putanja;
- automatsko pretvaranje nacrtane linije u vektorsku putanju;
- automatsko uklanjanje suvišnih anchor tačaka;
- smoothing kontrolu;
- kontrolu preciznosti u odnosu na originalni pokret ruke;
- automatsko zatvaranje putanje kada se kraj približi početnoj tački;
- nastavljanje postojeće Pencil putanje;
- prepravljanje dela postojeće putanje ponovnim crtanjem preko nje;
- izbor da li nacrtani objekat koristi stroke, fill ili oba.
Smoothing kontrola treba da određuje koliko će nacrtana linija biti izglađena:

- nizak smoothing zadržava više detalja i nepravilnosti pokreta;
- visok smoothing pravi čistiju putanju sa manjim brojem anchor tačaka.
Pencil Tool prvenstveno menja oblik putanje, a ne debljinu četkice kao Vector Brush.

### Vector Brush

Vector Brush služi za slobodno crtanje vektorskih poteza sa podesivom debljinom.

Za razliku od Pencil Toola, Brush treba da kreira vizuelni potez koji ima širinu, profil i izgled četkice.

Treba da omogući:

- slobodno crtanje vektorskih poteza;
- kontrolu veličine četkice;
- smoothing kontrolu;
- zaobljene ili ravne završetke;
- podešavanje stroke cap i stroke join opcija;
- izbor boje, gradijenta i opacity vrednosti;
- pretvaranje Brush poteza u editable vector shape;
- naknadno menjanje centralne putanje poteza;
- naknadno menjanje širine poteza;
- primenu animacije na nacrtani potez;
- podršku za Trim Paths animaciju.
Kontrola veličine treba da postoji pre crtanja, ali i da može naknadno da se promeni u Inspectoru.

### Mask Brush

Mask Brush služi za ručno crtanje maski kojima se delovi sloja otkrivaju ili skrivaju.

Treba da ima dva osnovna režima:

- Reveal Mask;
- Hide Mask.
Reveal Mask treba da otkriva deo selektovanog objekta preko kojeg korisnik crta.

Hide Mask treba da sakriva deo selektovanog objekta preko kojeg korisnik crta.

Mask Brush treba da omogući:

- ručno crtanje maske direktno preko selektovanog layera;
- kontrolu veličine četkice;
- smoothing kontrolu;
- kontrolu hardness vrednosti;
- kontrolu feather vrednosti;
- kontrolu opacity maske;
- dodavanje novih delova postojećoj maski;
- oduzimanje delova postojeće maske;
- kombinovanje više maski;
- invertovanje maske;
- brisanje delova maske;
- pretvaranje nacrtanog poteza u vektorsku mask path putanju;
- naknadno uređivanje mask patha preko anchor tačaka;
- keyframe animaciju mask patha;
- animaciju Mask Expansion, Feather i Opacity vrednosti.
Mask Brush mora da omogući pravljenje reveal animacija, na primer:

- postepeno pojavljivanje lijane;
- otkrivanje crteža kao da se upravo crta;
- pojavljivanje teksta potez po potez;
- skrivanje ili otkrivanje dela ilustracije;
- animirano pojavljivanje svetlosti, senke ili teksture.
Važno je da Mask Brush ne menja originalni objekat, već samo njegovu vidljivost.

### Eraser

Eraser služi za brisanje delova vektorskih shapeova, strokeova, Brush poteza i maski.

Treba da omogući različite režime brisanja:

- erase shape;
- erase stroke;
- erase mask;
- erase only selected object;
- erase all unlocked objects under cursor.
Treba da omogući:

- kontrolu veličine gumice;
- smoothing kontrolu;
- kontrolu hardness vrednosti;
- pressure sensitivity;
- brisanje samo dela vektorskog objekta;
- automatsko razdvajanje shapea nakon brisanja;
- zadržavanje editabilne vektorske strukture;
- brisanje dela strokea bez brisanja celog objekta;
- brisanje dela Mask Brush poteza;
- nedestruktivni način rada kada je moguće;
- undo i redo za svaki potez gumice.
Ako gumica preseče zatvoreni shape, aplikacija treba pravilno da napravi nove zatvorene ivice ili da ponudi opciju da rezultat ostane otvorena putanja.

### Line Tool

Line Tool služi za brzo crtanje pravih vektorskih linija.

Treba da omogući:

- crtanje linije od početne do krajnje tačke;
- držanje Shift tastera za zaključavanje ugla;
- zaključavanje na horizontalni, vertikalni i dijagonalni pravac;
- kontrolu stroke width vrednosti;
- izbor boje ili gradijenta;
- kontrolu opacity vrednosti;
- izbor stroke cap opcije;
- izbor dashed ili solid linije;
- dodavanje strelica ili drugih završetaka;
- pretvaranje linije u editable path;
- animiranje početne i krajnje tačke;
- korišćenje linije kao shapea, maske ili motion patha.
Line Tool treba da podrži snapping na grid, guides, anchor tačke i druge objekte.

### Curvature Tool

Curvature Tool služi za jednostavnije crtanje i uređivanje zakrivljenih vektorskih putanja bez ručnog podešavanja Bezier ručica.

Treba da omogući:

- dodavanje tačaka klikom;
- automatsko pravljenje glatke krive između tačaka;
- dodavanje ravnog segmenta preko posebne komande ili duplog klika;
- pomeranje tačaka uz automatsko prilagođavanje krive;
- pretvaranje smooth tačke u corner tačku;
- nastavak postojeće putanje;
- zatvaranje putanje;
- uređivanje postojećih shapeova;
- smanjivanje broja nepotrebnih anchor tačaka;
- kreiranje glatkih organskih formi;
- kreiranje putanja za lijane, talase, kablove, repove, trake i motion paths.
Curvature Tool treba da bude jednostavniji za početnike od Pen Toola, jer korisnik ne mora ručno da upravlja Bezier ručicama.

### Zajedničke kontrole

Za Pencil Tool, Vector Brush, Mask Brush i Eraser treba dodati zajednički floating toolbar sa sledećim kontrolama:

- Size;
- Smoothing;
- Hardness, kada je relevantno;
- Opacity;
- Pressure sensitivity;
- Stabilizer;
- Draw behind;
- Draw inside;
- Snap on/off;
- Close path automatically;
- Undo last stroke;
- Clear current stroke.
Smoothing i Size vrednosti treba da mogu da se menjaju:

- pre crtanja;
- tokom crtanja kada uređaj podržava pressure input;
- naknadno kroz Inspector.
Svaki nacrtani rezultat mora ostati vektorski editabilan i ne sme automatski da se pretvori u raster sliku.

## Ugrađeni shapes

Dodaj profesionalan set shape alata:

- rectangle;
- rounded rectangle;
- ellipse;
- circle;
- line;
- polygon;
- star;
- triangle;
- arrow;
dodaj import custom svg compound shape
Shapes moraju ostati parametric/editable sve dok korisnik ne odluči da ih pretvori u običan path.

## Floating Quick Toolbar

Dodaj floating toolbar koji se pojavljuje blizu selektovanog objekta ili može biti zakačen na određenu poziciju.

Treba da sadrži najvažnije brze komande:

- Flip Horizontal;
- Flip Vertical;
- Rotate 90° Left;
- Rotate 90° Right;
- Duplicate;
- Delete;
- Group;
- Ungroup;
- Bring Forward;
- Send Backward;
- Bring to Front;
- Send to Back;
- Align Left;
- Align Center;
- Align Right;
- Align Top;
- Align Middle;
- Align Bottom;
- Distribute Horizontally;
- Distribute Vertically;
- Lock;
- Hide;
- Set Anchor Point;
- Reset Transform;
- Fit to Canvas;
- Center on Canvas;
- Copy Style;
- Paste Style;
- Create Mask;
- Convert to Path;
- Add Keyframe.
Toolbar treba da se inteligentno prilagođava vrsti selektovanog elementa. Na primer, za path može prikazati path funkcije, a za gradient gradient kontrole.

## Layer sistem

Layers panel mora podržavati:

- nested groups;
- folders;
- shape layers;
- SVG groups;
- masks;
- clipping masks;
- adjustment/effect groups;
- parent-child veze;
- precompositions ili reusable groups;
- lock;
- hide;
- solo;
- rename;
- duplicate;
- color labels;
- drag-and-drop reorder;
- search;
- filtering po tipu;
- collapse all;
- expand all;
- select all children;
- show selected layer.
Korisnik mora moći da izabere da li će importovani SVG ostati:

- jedan objekat;
- organizovan prema postojećim SVG grupama;
- potpuno razbijen na pojedinačne elemente.

## SVG import

Pri importu SVG-a analiziraj strukturu i prikaži jasan import dijalog.

Prikaži:

- broj grupa;
- broj pathova;
- broj shapes;
- broj fillova;
- broj strokeova;
- gradients;
- clipping masks;
- embedded images;
- unsupported features;
- unnecessary metadata.
Ponudi opcije:

- Preserve Original Structure;
- Preserve Groups;
- Import as Single Object;
- Expand to Editable Elements;
- Flatten Unsupported Effects;
- Remove Unused Metadata;
- Optimize Paths;
- Preserve IDs and Layer Names.
Nakon importa korisnik mora moći naknadno da koristi:

- Ungroup;
- Ungroup All;
- Release Compound Path;
- Separate All Elements;
- Merge Shapes;
- Join Paths;
- Split Path;
- Boolean Union;
- Subtract;
- Intersect;
- Exclude;
- Divide;
- Outline Stroke;
- Convert Stroke to Path;
- Simplify Path;
- Clean SVG.

## Osnovno SVG uređivanje

Omogući uređivanje:

- fill boje;
- stroke boje;
- stroke width;
- stroke alignment gde je moguće;
- line cap;
- line join;
- dash pattern;
- opacity;
- blend mode;
- transform;
- path geometry;
- gradients;
- masks;
- clipping paths;
- groups.

## Profesionalni Gradient Editor

Ne želim običan CSS gradient generator sa dva ili tri stopa.

Napravi punokrvni profesionalni Gradient Editor na nivou modernih alata kao što su Figma i Photoshop.

Gradient mora da se uređuje direktno i vizuelno na canvasu, kao i kroz poseban detaljan panel.

Podrži:

- neograničen broj color stopova;
- dodavanje stopa klikom na gradient track;
- brisanje stopa;
- duplicate stop;
- drag-and-drop pomeranje stopova;
- precizno numeric position podešavanje;
- boju svakog stopa;
- opacity svakog stopa;
- midpoint između stopova;
- smoothness;
- interpolation mode;
- reverse gradient;
- distribute stops evenly;
- sort stops;
- randomize stops;
- copy/paste gradient;
- apply gradient to fill;
- apply gradient to stroke;
- live preview.
Podrži najmanje:

- Linear Gradient;
- Radial Gradient;
- Angular/Conic Gradient;
- Diamond Gradient;
- Reflected Gradient;
- Freeform Gradient, ukoliko je tehnički održivo u internom formatu.
Za linearni gradient omogući:

- angle;
- start point;
- end point;
- length;
- offset;
- scale;
- rotation;
- repeat/spread mode.
Za radialni gradient omogući:

- center point;
- radius;
- aspect ratio;
- focal point;
- focal radius;
- rotation;
- scale;
- elliptical mode.
Gradient mora imati direktne visual handles na canvasu.

Omogući animiranje:

- gradient stop boja;
- stop position;
- stop opacity;
- angle;
- center;
- radius;
- focal point;
- gradient transform.
Dodaj Gradient Swatches sistem.

Korisnik mora moći da:

- koristi unapred ugrađene profesionalne gradient swatcheve;
- sačuva svoj gradient kao swatch;
- preimenuje swatch;
- organizuje swatcheve u kolekcije;
- duplira swatch;
- obriše swatch;
- označi favorite;
- pretražuje swatcheve;
- importuje/exportuje swatch kolekcije;
- vidi thumbnail preview;
- primeni swatch jednim klikom.
Dodaj kvalitetne početne kategorije, na primer:

- Pastel;
- Neon;
- Metallic;
- Sunset;
- Ocean;
- Forest;
- Candy;
- Pink;
- Purple;
- Blue;
- Red;
- Gold;
- Silver;
- Holographic;
- Dark;
- Soft Shadow;
- Transparent Fade.
Nemoj hardkodovati swatcheve tako da se ne mogu menjati. Korisnički swatchevi moraju trajno ostati sačuvani u lokalnoj bazi.

## Color sistem i swatches

Dodaj profesionalni color picker sa:

- HEX;
- RGB;
- HSL;
- HSV/HSB;
- alpha;
- eyedropper;
- recent colors;
- saved colors;
- project colors;
- global colors;
- color history.
Korisnik mora moći da sačuva:

- pojedinačnu boju;
- paletu;
- gradient;
- neon preset;
- shadow preset.
Dodaj Global Color sistem.

Kada je više objekata povezano sa istom globalnom bojom, promena globalne boje mora menjati sve povezane elemente.

Omogući označavanje boja kao:

- Exposed Color;
- Global Color;
- Internal Color;
- Locked Color;
- Linked Color.

## Timeline

Napravi jednostavan, pregledan i moćan timeline inspirisan Adobe Animate pristupom.

Timeline mora podržavati:

- layers;
- frames;
- keyframes;
- blank keyframes;
- hold keyframes;
- tweened keyframes;
- markers;
- work area;
- in/out range;
- playhead;
- frame stepping;
- zoom timeline;
- horizontal scroll;
- snapping;
- multi-keyframe selection;
- box selection;
- copy/paste keyframes;
- duplicate keyframes;
- move keyframes;
- stretch timing;
- reverse keyframes;
- offset keyframes;
- stagger keyframes.
Omogući FPS podešavanje, najmanje:

- 12;
- 15;
- 24;
- 25;
- 30;
- 50;
- 60;
- custom FPS.
Prikaži:

- current frame;
- current time;
- total frames;
- total duration;
- selected range.
Omogući playback:

- Play;
- Pause;
- Stop;
- Previous Frame;
- Next Frame;
- Go to Start;
- Go to End;
- Loop;
- Ping Pong;
- Play Selected Range;
- Speed controls.

## Animatable properties

Omogući keyframe animaciju najmanje za:

- Position;
- Scale;
- Rotation;
- Skew;
- Opacity;
- Anchor Point;
- Path;
- Fill Color;
- Stroke Color;
- Stroke Width;
- Gradient Stops;
- Gradient Transform;
- Trim Path Start;
- Trim Path End;
- Trim Path Offset;
- Mask Path;
- Mask Expansion;
- Mask Feather;
- Glow Intensity;
- Glow Blur;
- Shadow parameters;
- effect opacity;
- attachment length;
- motion-path progress.
Kada korisnik promeni animatable property na drugom frameu, editor treba da može automatski dodati keyframe ako je Auto-Key uključen.

## Easing

Dodaj kvalitetan easing sistem:

- Linear;
- Ease In;
- Ease Out;
- Ease In-Out;
- Smooth;
- Strong Smooth;
- Back;
- Overshoot;
- Bounce;
- Elastic;
- Anticipation;
- Spring-like easing;
- Custom Cubic Bezier.
Svaki easing mora imati mali vizuelni preview.

Dodaj Graph Editor za precizno uređivanje easing curves.

Omogući:

- Copy Easing;
- Paste Easing;
- Apply to Selected Keyframes;
- Reverse Easing;
- Mirror Easing;
- Save Easing Preset;
- Smooth Selected Motion.

## Onion Skin

Dodaj Onion Skin sa:

- prethodnim frameovima;
- narednim frameovima;
- podesivim brojem frameova;
- opacity kontrolom;
- tint bojom;
- range markerima;
- uključivanjem samo za selektovane layere.

## Animation presets

Dodaj biblioteku gotovih animacija koje se mogu primeniti na ceo SVG, pojedinačni layer, grupu ili ručno definisani bounding box.

### Entrance presets

- Fade In;
- Scale In;
- Pop In;
- Bounce In;
- Slide In;
- Rotate In;
- Draw On;
- Wipe Reveal;
- Mask Reveal;
- Grow From Anchor;
- Unfold;
- Sparkle Reveal;
- Blur In;
- Elastic Appear.

### Idle presets

- Float;
- Gentle Sway;
- Strong Sway;
- Pulse;
- Breathing;
- Flicker;
- Neon Flicker;
- Wiggle;
- Pendulum Swing;
- Soft Rotation;
- Random Twinkle;
- Leaf Flutter;
- Hover;
- Gentle Bob;
- Random Micro Motion.

### Exit presets

- Fade Out;
- Shrink;
- Pop Out;
- Slide Out;
- Wipe Out;
- Retract Path;
- Falling Away;
- Spin Out;
- Collapse;
- Blur Out.
Pri primeni preseta korisnik mora moći da odredi:

- start frame;
- duration;
- easing;
- direction;
- anchor point;
- intensity;
- delay;
- loop;
- ping-pong;
- apply to whole object;
- apply only inside selected bounding box;
- apply to selected layers;
- preserve final state.

## Bounding Box Animation Region

Omogući korisniku da nacrta posebnu animation region/bounding box oblast i primeni efekat samo na deo SVG-a.

Program treba da može da pronađe:

- elemente čiji je centar unutar oblasti;
- elemente koji delimično dodiruju oblast;
- elemente potpuno unutar oblasti.
Korisnik mora moći ručno da potvrdi ili izmeni pronađene elemente.

Po potrebi program treba da može automatski napraviti clipping masku za izabranu oblast.

## Mask sistem

Dodaj napredne maske:

- Add;
- Subtract;
- Intersect;
- Difference;
- Invert;
- Feather;
- Expansion;
- Opacity;
- Animated Mask Path.
Mask Brush mora omogućiti da korisnik na svakom sledećem frameu ručno otkrije još jedan deo elementa.

Potrebni režimi:

- Reveal;
- Hide;
- Add to Mask;
- Subtract from Mask;
- Hard Edge;
- Soft Edge;
- Smooth Brush;
- Grow Mask;
- Animate Brush Stroke.
Dodaj opciju:

Reveal Along Painted Path

Korisnik nacrta pravac reveala, a software automatski animira masku duž tog pravca.

## Trim Paths

Dodaj punu podršku za:

- Trim Start;
- Trim End;
- Trim Offset;
- simultaneous;
- individually;
- reverse direction;
- animated trim;
- draw-on presets;
- retract presets.

## Glow, Neon i Shadow sistem

Glow, neon i shadow moraju prvenstveno biti napravljeni na principu koji radi kao testirani Sparkle.json.

To znači:

- originalni oštar vector layer;
- jedna ili više kopija istog vector elementa;
- Gaussian Blur na kopijama;
- različite opacity vrednosti;
- po potrebi različit scale;
- sve kopije povezane sa jednom glavnom bojom.
Nemoj koristiti samo CSS filtere u preview-u ako se taj efekat ne prenosi u pravi Lottie export.

Potrebni ugrađeni efekti:

- OBS Glow;
- Soft Glow;
- Strong Glow;
- Inner Glow;
- Outer Glow;
- Neon;
- Neon Tube;
- Colored Shadow;
- Soft Shadow;
- Long Shadow;
- Drop Shadow;
- Flickering Neon;
- Pulsing Glow;
- Sparkle Glow.
Kontrole treba da uključuju:

- Glow Color;
- Core Color;
- Glow Blur;
- Glow Spread;
- Glow Opacity;
- Number of Glow Copies;
- Inner Glow Strength;
- Outer Glow Strength;
- Scale per Copy;
- Shadow Color;
- Shadow Blur;
- Shadow Opacity;
- Shadow Offset X;
- Shadow Offset Y;
- Neon Core Width;
- Neon Glow Width;
- Flicker Amount;
- Flicker Speed;
- Random Flicker Seed.
Sve generisane glow kopije moraju biti logički povezane kao jedan efekat, kako korisnik ne bi morao ručno uređivati deset layera.

Kada se promeni glavna boja, automatski ažuriraj sve povezane glow i neon layere.

Korisnik mora moći da proširi efekat u pojedinačne layere samo kada izabere:

Expand Effect to Layers

Do tada se efekat ponaša kao jedan uređiv efekat.

Dodaj export upozorenje ako neki renderer možda neće identično podržati Gaussian Blur, ali nemoj automatski uklanjati efekat. Korisnik mora moći da izabere da ga zadrži zato što je testiran i radi u OBS-u.

## Organic Motion & Hanging Elements sistem

Ovo nije samo Growing Vine sistem.

Napravi opšti sistem za primenu gotovih proceduralnih i keyframe motion ponašanja na SVG assete koje korisnik sam uvozi.

Software ne treba da crta gotovog pauka, lijanu, lampu, list ili ukras. Korisnik će obezbediti svoje SVG assete.

Software treba da omogući da korisnik odredi:

- koji SVG element ima koju ulogu;
- gde je pivot;
- gde je hang point;
- gde je attachment point;
- koji element prati koji element;
- koji delovi imaju secondary motion;
- koji layer je glavni;
- koji layer je thread, vine, leaf, spider, light ili decoration.

## Attachment i Anchor sistem

Dodaj ručno postavljanje posebnih tačaka:

- Anchor Point;
- Pivot Point;
- Hang Point;
- Attachment Point;
- Path Start;
- Path End;
- Follow Point;
- Growth Origin;
- Rotation Origin.
Ove tačke moraju biti vizuelno prikazane i lako pomerljive.

## Growing Vine

Korisnik uploaduje SVG stabljike, grane, lijane i listova.

Omogući:

- reveal glavne stabljike maskom;
- Trim Path kada je stabljika stroke;
- rast od početne ka krajnjoj tački;
- automatsko pojavljivanje listova;
- stagger listova;
- scale grow;
- rotation grow;
- opacity grow;
- overshoot;
- automatski delay zasnovan na mestu lista duž stabljike;
- ručni grow keyframe mode.
U manual grow režimu korisnik može na svakom sledećem frameu:

- malo povećati list;
- malo ga rotirati;
- promeniti position;
- nastaviti dok potpuno ne izraste.

## Hanging Vine Swing

Korisnik uploaduje gotovu SVG lijanu.

Omogući:

- pivot na vrhu;
- gentle swing;
- strong swing;
- uneven swing;
- slow heavy swing;
- light bouncy swing;
- wind gust;
- random starting direction;
- secondary movement listova;
- loop bez vidljivog skoka;
- amplitude;
- speed;
- damping;
- delay;
- random seed.

## Spider Climb

Korisnik uploaduje SVG pauka i SVG/line nit.

Omogući:

- penjanje;
- spuštanje;
- pause na određenoj visini;
- brzo povlačenje nagore;
- loop;
- reverse;
- random delay između ciklusa;
- pomeranje pauka povezano sa krajem niti;
- skraćivanje i produžavanje niti;
- blagu rotaciju i njihanje pauka;
- optional secondary leg movement ako su noge odvojeni layeri.

## Hanging Spider Swing

Omogući:

- pivot na vrhu niti;
- swing cele niti;
- additional swing pauka;
- različit phase offset;
- pendulum easing;
- random start;
- loop.

## Hanging Sign

Za SVG table, konopaca, traka ili lanaca omogući:

- gentle idle sway;
- strong hit reaction;
- damped movement;
- different left/right response;
- independent sign rotation;
- separate movement za dva konopca ako su odvojeni;
- settling animation.

## Hanging Lantern

Korisnik uploaduje SVG lampe.

Omogući kombinovanje:

- swing;
- glow;
- pulsiranje svetla;
- flicker;
- random flicker;
- color change;
- light intensity;
- brief turn-off;
- relight animation.

## Fairy Lights i String Lights

Korisnik uploaduje SVG kabla i lampica.

Omogući:

- swing kabla;
- individual light flicker;
- random brightness;
- wave glow;
- chase animation;
- alternating lights;
- random colors;
- palette replacement;
- delayed color change;
- random starting frames;
- different light groups.

## Hanging Leaves

Omogući:

- movement cele grane;
- individual leaf delay;
- random small rotation;
- wind;
- wind gust;
- different amplitude by leaf;
- secondary motion;
- loop-safe movement.

## Hanging Flowers

Omogući:

- sway;
- opening flower;
- scale grow;
- petal stagger;
- petal fall;
- random small rotation;
- glow/pulse kombinaciju.

## Cobweb Movement

Korisnik uploaduje SVG paučine.

Omogući:

- blago istezanje;
- pomeranje jednog ugla;
- wave koji prolazi kroz mrežu;
- reaction na spider movement;
- gentle wind deformation;
- subtle bounce.

## Swinging Decorations

Za zvezde, mesece, srca, kristale, zvončiće, ključeve i druge ukrase omogući:

- pendulum swing;
- unequal swing;
- random delay;
- bounce;
- rotation offset;
- scale pulse;
- glow;
- secondary attached elements.

## Climbing Plant Around Object

Omogući korisniku da primeni growing/reveal animation oko:

- prozora;
- okvira;
- chat boxa;
- webcam framea;
- table;
- ogledala;
- bilo kog custom SVG objekta.

## Crawling Bug

Korisnik uploaduje SVG bubice, mrava ili pauka.

Omogući:

- follow motion path;
- orient to path;
- random speed;
- stops;
- pauses;
- reverse;
- hide behind mask;
- enter/exit path;
- random variation.

## Butterfly, Moth ili Flying Element

Korisnik uploaduje asset, po mogućnosti sa odvojenim krilima.

Omogući:

- wing flap;
- asymmetric flap;
- motion path;
- hovering;
- random floating;
- landing;
- takeoff;
- idle wing movement;
- path orientation;
- random offset.

## Dripping Element

Korisnik uploaduje SVG slime-a, vode, voska ili kapljice.

Omogući:

- stretch;
- bulge;
- drop separation;
- fall;
- reset;
- loop;
- random delay;
- random droplet size.

## Wind-Reactive Decorations

Za zavese, trake, lišće, lijane, lance i ukrase omogući:

- constant gentle wind;
- random gust;
- left/right direction;
- strength;
- turbulence;
- stagger;
- secondary motion;
- random seed.

## Parent, Follow i Secondary Motion

Dodaj jednostavan parent-child sistem.

Primeri:

- pauk prati kraj niti;
- list prati lijanu;
- ukras prati konopac;
- oči prate glavu;
- cvet prati granu.
Dodaj opcije:

- Parent;
- Unparent;
- Maintain World Position;
- Follow Position;
- Follow Rotation;
- Follow Scale;
- Follow with Delay;
- Follow with Damping;
- Secondary Motion;
- Rotation Limit;
- Distance Limit.

## Motion Paths

Dodaj Motion Path editor.

Korisnik mora moći da:

- nacrta path;
- pretvori postojeći SVG path u motion path;
- postavi objekat da prati path;
- menja početak i kraj;
- reverse path;
- orient to path;
- auto-rotate;
- offset rotation;
- constant speed;
- easing along path;
- loop;
- ping-pong;
- random start position;
- trim motion range.

## Color Randomizer

Dodaj napredan Color Randomizer namenjen lampicama, zvezdicama, listovima, ukrasima i drugim grupama elemenata.

Randomizer mora moći da radi na:

- selektovanim elementima;
- grupi;
- svim child elementima;
- elementima sa istim tagom;
- elementima unutar bounding boxa;
- elementima sa određenom postojećom bojom.

## Random iz postojećih boja

Omogući:

- random redistribution postojećih boja;
- preserve existing palette;
- allow duplicates;
- prevent duplicates next to each other;
- lock selected elements;
- randomize only unlocked elements;
- shuffle colors;
- regenerate seed.

## Shades Randomizer

Korisnik izabere osnovnu boju, na primer pink.

Software zatim generiše i raspoređuje nijanse unutar kontrolisanog raspona.

Kontrole:

- Base Hue;
- Hue Range;
- Saturation Min/Max;
- Brightness Min/Max;
- Alpha Min/Max;
- Contrast;
- Minimum Color Difference;
- Number of Generated Shades;
- Keep Within Color Family.
Na primer, korisnik mora moći da generiše samo različite pink nijanse bez slučajnog odlaska u braon, sivu ili narandžastu.

## Replace Palette

Na jednom keyframeu lampice mogu imati različite pink nijanse.

Na sledećem keyframeu korisnik može izabrati:

- Red Palette;
- Purple Palette;
- Blue Palette;
- Green Palette;
- Rainbow Palette;
- Custom Saved Palette.
Software treba da sačuva relativne brightness i saturation odnose.

Najsvetlija pink treba da postane najsvetlija nova boja, a najtamnija pink najtamnija nova boja.

Nemoj jednostavno zameniti sve jednom ravnom bojom.

## Color change animation

Dodaj režime:

- Instant Change;
- Smooth Transition;
- Flicker Change;
- Random Per Element;
- Left-to-Right Wave;
- Right-to-Left Wave;
- Center-Out Wave;
- Outside-In Wave;
- Chase;
- Alternate;
- Random Hold;
- Sequential;
- Pulse Then Change.
Korisnik mora moći jednim klikom da generiše novi color keyframe na trenutnoj poziciji timelinea.

## Random Seed

Sve random funkcije moraju koristiti seed.

Omogući:

- New Seed;
- Save Seed;
- Lock Seed;
- Reuse Seed;
- Regenerate;
- Variations from Current Seed.

## General Randomizer

Pored boja, dodaj opcioni randomizer za:

- rotation;
- scale;
- position offset;
- opacity;
- delay;
- duration;
- easing;
- start frame;
- glow intensity;
- flicker;
- swing amplitude;
- swing phase;
- animation speed.
Randomizer mora imati min/max vrednosti i mogućnost da se rezultat bake-uje u keyframeove.

## Stagger sistem

Dodaj Smart Stagger za više selektovanih elemenata.

Rasporedi keyframeove prema:

- layer order;
- left to right;
- right to left;
- top to bottom;
- bottom to top;
- from center;
- to center;
- along path;
- random;
- custom order.
Omogući:

- delay amount;
- overlap;
- reverse;
- random variation;
- preserve duration.

## Loop sistem

Dodaj alat za pravljenje savršenih loopova.

Potrebno:

- copy first state to end;
- match start and end;
- create seamless transition;
- ping-pong loop;
- cycle offset;
- loop preview;
- detect visible jump;
- warn about non-matching properties;
- auto-fix common loop problems.

## Markers i animation segments

Korisnik mora moći da kreira named markers i segmente, na primer:

- Intro;
- Loop;
- Outro;
- Grow;
- Idle;
- Flicker;
- Hover;
- Exit.
Omogući:

- marker color;
- marker name;
- start/end;
- loop flag;
- export flag;
- preview selected segment.

## Lottie import i editing

Omogući import postojećih Lottie JSON i dotLottie fajlova.

Pri importu analiziraj:

- layers;
- shapes;
- fills;
- strokes;
- gradients;
- masks;
- effects;
- precomps;
- images;
- fonts;
- keyframes;
- unsupported features;
- renderer compatibility.
Korisnik mora moći da:

- menja boje;
- menja stroke width;
- menja opacity;
- menja timing;
- menja easing;
- pomera keyframeove;
- menja transformacije;
- menja playback range;
- uređuje podržane paths;
- preimenuje layere;
- sakrije ili obriše layere;
- optimizuje animaciju.
Ne obećavaj savršeno uređivanje svakog mogućeg After Effects efekta. Unsupported elemente jasno označi i sačuvaj kad god je moguće.

## Exposed Properties

Dodaj sistem preko kojeg korisnik može označiti property kao kasnije promenljiv.

Podržati najmanje:

- colors;
- gradient colors;
- text;
- opacity;
- transform;
- stroke width;
- glow color;
- shadow color.
Properties mogu imati jasna imena, na primer:

- Primary Neon;
- Secondary Glow;
- Leaf Main;
- Leaf Shadow;
- Vine Color;
- Light Color;
- Highlight;
- Background.
Ove vrednosti koristi pri dotLottie themes/slots exportu kada format to podržava.

## Compatibility Inspector

Pre exporta prikaži detaljan Compatibility Report.

Podeli rezultate na:

### Fully Editable

Elementi i properties koji ostaju potpuno editabilni.

### Partially Editable

Elementi koji ostaju vektorski, ali zavise od renderer podrške.

### Not Editable After Export

Elementi koji će biti rasterizovani, flattened ili rendered.

### Compatibility Warnings

Prikaži konkretna upozorenja po layeru i propertyju.

Primeri:

- layer koristi Gaussian Blur;
- layer koristi unsupported blend mode;
- gradient animation možda nije podržana svuda;
- mask mode može izgledati drugačije;
- font nije embedded;
- raster image je uključena;
- effect mora biti rendered;
- animated SVG podrška se razlikuje od Lottie podrške.
Dodaj target profile opcije:

- Universal Safe Lottie;
- OBS Browser Source;
- Lottie Web;
- dotLottie Web;
- Android;
- iOS;
- Animated SVG;
- Rendered WebM;
- GIF.
Pošto je Gaussian Blur stil iz Sparkle fajla testiran u OBS-u, OBS profil ne treba automatski da ga blokira. Može prikazati informativno upozorenje, ali korisnik mora moći da nastavi export.

## Optimization Inspector

Prikaži šta najviše povećava veličinu fajla:

- duplicate paths;
- excessive keyframes;
- unnecessary precision;
- repeated glow copies;
- unused assets;
- hidden layers;
- unused precomps;
- redundant points;
- unnecessary metadata;
- raster assets;
- long static frame ranges.
Prikaži procenjenu uštedu.

Dodaj komande:

- Optimize Safely;
- Optimize Aggressively;
- Reduce Decimal Precision;
- Remove Unused Layers;
- Remove Hidden Layers;
- Simplify Paths;
- Deduplicate Geometry;
- Merge Identical Keyframes;
- Trim Empty Frames;
- Compress dotLottie;
- Preview Before/After.
Optimizacija ne sme vizuelno menjati animaciju bez jasnog upozorenja.

## Export

Podrži:

### Lottie

- Lottie JSON;
- Optimized Lottie JSON;
- Minified JSON;
- Pretty JSON.

### dotLottie

- dotLottie;
- Optimized dotLottie;
- dotLottie sa themes;
- dotLottie sa exposed properties/slots;
- paket sa više animacija ako je podržano.

### SVG

- Static SVG;
- Animated SVG;
- Optimized Animated SVG;
- Selected Frame as SVG.

### Rendered

- GIF;
- Animated WebP;
- WebM;
- Small Optimized WebM;
- WebM with Alpha;
- PNG Sequence;
- MP4 bez alpha kanala.
Omogući kontrolu:

- width;
- height;
- scale;
- FPS;
- duration;
- quality;
- transparent background;
- background color;
- loop count;
- selected segment;
- selected marker;
- selected work area;
- full animation.

## Segment export

Korisnik mora moći da exportuje:

- celu animaciju;
- trenutni work area;
- selected frame range;
- jedan named segment;
- više segmenata kao zasebne fajlove;
- intro;
- loop;
- outro;
- intro + loop;
- loop only.
Pri Lottie segment exportu ukloni nepotrebne frameove i pravilno prilagodi frame indekse.

## Export Presets

Dodaj ugrađene presetove:

- OBS Lottie;
- Universal Lottie;
- Small Web Lottie;
- dotLottie Optimized;
- Animated SVG;
- Transparent WebM;
- Small Transparent WebM;
- GIF Preview;
- Social Preview.
Korisnik mora moći da sačuva svoje export presetove.

## Asset Library

Dodaj lokalnu biblioteku za:

- SVG;
- Lottie;
- dotLottie;
- images;
- color palettes;
- gradient swatches;
- animation presets;
- easing presets;
- glow presets;
- shadow presets.
Podržati:

- folders;
- tags;
- favorites;
- search;
- thumbnail preview;
- recent;
- drag-and-drop to canvas;
- duplicate;
- rename;
- delete with confirmation;
- reveal in local folder.

## Custom Animation Presets

Korisnik mora moći da selektuje keyframeove ili animirane properties i sačuva ih kao svoj reusable preset.

Preset treba da može da čuva:

- properties;
- timing;
- easing;
- relative values;
- absolute values;
- anchor requirements;
- compatible element types;
- preview thumbnail.

## Undo i Redo

Undo/Redo mora raditi kroz ceo software.

Mora obuhvatiti:

- canvas transformacije;
- SVG editing;
- node editing;
- layer order;
- colors;
- gradients;
- gradient stops;
- masks;
- effects;
- keyframes;
- easing;
- timeline;
- parent links;
- motion paths;
- randomizer operations;
- presets;
- imports;
- export settings;
- project settings.
Nemoj dozvoliti da običan Undo slučajno trajno ukloni originalni asset sa diska.

Brisanje asseta iz lokalne biblioteke mora imati posebnu confirmation zaštitu.

Dodaj History panel sa imenovanim akcijama.

## Autosave i recovery

Dodaj:

- automatic autosave;
- configurable interval;
- recovery snapshots;
- crash recovery;
- restore previous version;
- manual save points;
- recent project backups.

## Contextual Help

Pošto software treba da bude pogodan za početnika, dodaj:

- tooltips;
- kratka objašnjenja funkcija;
- visual previews;
- empty-state uputstva;
- onboarding walkthrough;
- upozorenja napisana razumljivim jezikom;
- opcioni “What does this do?” help.
Nemoj pretrpavati interfejs tekstom. Koristi kontekstualnu pomoć.

## Performance

Software mora ostati responsivan i sa većim SVG i Lottie fajlovima.

Potrebno je:

- efficient canvas rendering;
- memoization/caching;
- virtualized layers list;
- virtualized timeline gde je potrebno;
- background/local worker processing za teške operacije;
- cancelable optimization/render operations;
- progress indicators;
- no UI freezing tokom exporta;
- safe handling velikih JSON fajlova.

## Testing

Nemoj samo vizuelno napraviti kontrole bez funkcionalnosti.

Svaka važna funkcija mora stvarno raditi.

Testiraj najmanje:

- SVG import;
- SVG structure preservation;
- layer separation;
- shape editing;
- gradient editing;
- unlimited gradient stops;
- saved swatches;
- timeline;
- keyframes;
- easing;
- masks;
- Trim Paths;
- OBS-style Gaussian Blur glow;
- color linking;
- color randomizer;
- palette replacement;
- random seed reproducibility;
- growing vine;
- hanging vine;
- spider climb;
- hanging swing;
- parent-child following;
- motion paths;
- segment export;
- Lottie JSON export;
- optimized JSON export;
- dotLottie export;
- animated SVG export;
- transparent WebM export;
- undo/redo;
- autosave;
- project recovery.
Ne predstavljaj nešto kao potpuno implementirano ako je samo UI placeholder.

U PROJECT_OVERVIEW.md jasno napiši kada neka funkcija još nema punu implementaciju.

## Glavni standard kvaliteta

Cilj nije da napraviš klon After Effects-a sa svim njegovim funkcijama.

Cilj je da napraviš najbolji mogući specijalizovani lokalni vizuelni editor za:

- SVG animacije;
- Lottie animacije;
- glow i neon;
- jednostavne keyframe animacije;
- growing i hanging dekoracije;
- motion paths;
- masks;
- color randomization;
- palette animation;
- gradients;
- brzi reusable presets;
- jednostavan export za OBS i web.
Software mora biti dovoljno jednostavan da početnik može brzo da napravi animaciju, ali dovoljno moćan da napredniji korisnik ima detaljnu kontrolu.

Nemoj pojednostavljivati profesionalni Gradient Editor, timeline, glow sistem, randomizer, Organic Motion sistem niti compatibility/export analizu na obične demo funkcije.

Sve treba da bude integrisano kao jedan konzistentan, stabilan i vizuelno kvalitetan proizvod.
