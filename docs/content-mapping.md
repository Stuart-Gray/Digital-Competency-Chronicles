# Content mapping: element ↔ place ↔ puzzle

Keep this file up to date whenever a puzzle is added or changed.

Element codes follow the order of the elements on each Ministry sheet (the sheets do not number them).
Titles below are the Ministry's own wording from the English and French sheets.

## Elements

| Code | Sheet | Element (EN) | Élément (FR) | DCF dimensions |
|---|---|---|---|---|
| 1a | 1 | Recognize the social impacts of digital technology | Reconnaître des répercussions sociales du numérique | D1, D11 |
| 1b | 1 | Recognize the environmental impacts of digital technology | Reconnaître des répercussions environnementales du numérique | D1, D11 |
| 1c | 1 | Understand the factors that influence digital habits | Comprendre des facteurs influençant les habitudes numériques | D1, D11 |
| 2a | 2 | Understand digital identity | Comprendre l’identité numérique | D1, D11 |
| 2b | 2 | Understand personal information | Comprendre les renseignements personnels | D1, D11 |
| 2c | 2 | Understand online privacy protection | Comprendre la protection de la vie privée en ligne | D1, D11 |
| 3a | 3 | Understand digital tools and hardware components | Comprendre les outils numériques et les composantes matérielles | D2, D3, D8 |
| 3b | 3 | Understand the basic features of digital tools | Comprendre les fonctionnalités de base d’outils numériques | D2, D3, D8 |
| 4a | 4 | Develop organizational skills | Développer des habiletés liées à l’organisation | D2, D9 |
| 4b | 4 | Apply troubleshooting strategies | Appliquer des stratégies de dépannage | D2, D9 |
| 5a | 5 | Use a digital tool to interact and co-create | Utiliser un outil numérique afin d’interagir et de cocréer | D5 |
| 6a | 6 | Explore digital communication channels for interaction | Explorer des canaux de communication numérique pour interagir | D6 |
| 6b | 6 | Understand the impact of digital behaviours | Comprendre l’impact des comportements numériques | D6 |
| 7a | 7 | Integrate various multimodal elements into a production | Intégrer différents éléments modaux dans une production | D7, D10, D12 |
| 7b | 7 | Get started with computational thinking | Initier à la pensée informatique | D7, D10, D12 |

Titles checked against the English and French sheets on 6 November 2026.

## Puzzles

| Puzzle id | Place | Type | Cycle | Element | Sheet application (EN) | Application (FR) |
|---|---|---|---|---|---|---|
| `fixer_steps_c2` | Hub, Théo's Fix-it shop | sequence | 2 | 4b | Establish a troubleshooting procedure for the group. | Établir une procédure de dépannage en groupe. |
| `fixer_steps_c3` | Hub, Théo's Fix-it shop | sequence | 3 | 4b | Establish a troubleshooting procedure for the group. | Établir une procédure de dépannage en groupe. |
| `fixer_first_try_c2` | Hub, Théo's Fix-it shop | choice | 2 | 4b | Identify the steps to take to solve a technical problem in a given scenario, such as when an application stops responding. | Identifier l’action à entreprendre dans une mise en situation pour résoudre un problème technique, par exemple si l’application ne répond plus. |
| `fixer_first_try_c3` | Hub, Théo's Fix-it shop | choice | 3 | 4b | Identify the steps to take to solve a technical problem in a given scenario, such as when an application stops responding. | Identifier l’action à entreprendre dans une mise en situation pour résoudre un problème technique, par exemple si l’application ne répond plus. |

### The village's side quests (Framework dimensions 1 and 2, `content/hub.json`)

The Digital Competency Framework names two dimensions as central to all the others: **dimension 1, Exercising ethical citizenship in the digital age** (*Agir en citoyen éthique à l’ère du numérique*) and **dimension 2, Developing and mobilizing technological skills** (*Développer et mobiliser ses habiletés technologiques*). The village is where the player practises both by helping neighbours with everyday problems. Each side quest lists its dimension (`dcf`), its sheet element and its puzzle families in the `quests` block of `hub.json`. Dimension 1 quests use sheet 1 (social and environmental impacts, digital habits); dimension 2 quests use sheets 3 and 4 (hardware, basic features, organization, troubleshooting).

Two villagers need a hand at the start. The others move in, one at a time, each time the player comes home with a new piece of the Dungeon 2 badge, so the village and its problems grow together.

| Quest | Title (EN / FR) | Villager | Dimension | Element | Puzzle families | Appears |
|---|---|---|---|---|---|---|
| `q_fixit` | Théo's frozen app / L’application gelée de Théo | Théo | D2 Technological skills | 4b | `fixer_steps`, `fixer_first_try` | From the start |
| `q_sound` | Gus and the silent video / Gus et la vidéo muette | Gus | D2 Technological skills | 3a | `gus_parts`, `gus_volume` | From the start |
| `q_kind` | Kind words on the village board / Des mots gentils sur le babillard | Noor | D1 Ethical citizenship | 1a | `noor_board` | From the start |
| `q_files` | Zoé's lost poster / L’affiche perdue de Zoé | Zoé | D2 Technological skills | 4a | `zoe_files` | After the Lantern of Traces (first step into Dungeon 2) |
| `q_green` | Fern's garden sign / L’affiche du jardin de Fern | Fern | D1 Ethical citizenship | 1b | `fern_energy` | After the Hall of Traces |
| `q_real` | Sami and the giant duck / Sami et le canard géant | Sami | D1 Ethical citizenship | 1a | `sami_image`, `sami_share` | After the Vault of Keys |
| `q_wifi` | Pip's stuck email / Le courriel coincé de Pip | Pip | D2 Technological skills | 3a | `pip_network` | After the Window Gallery |
| `q_ding` | Bruno and the dinging game / Bruno et le jeu qui sonne | Bruno | D1 Ethical citizenship | 1c | `bruno_notify` | After the Digital Identity Badge |
| `q_voice` | Rosa's talking tablet / La tablette parlante de Rosa | Rosa | D2 Technological skills | 3b | `rosa_voice` | After the Digital Identity Badge |

| Puzzle id | Place | Type | Cycle | Element | Sheet application (EN) | Application (FR) |
|---|---|---|---|---|---|---|
| `gus_parts_c2` | Plaza, Gus's bench | match | 2 | 3a | Identify the external components of a digital device, such as the screen, mouse and keyboard. | Identifier les périphériques d’un outil numérique, tels que l’écran, la souris et le clavier. |
| `gus_parts_c3` | Plaza, Gus's bench | match | 3 | 3a | Identify the external components of a digital device, such as the screen, mouse and keyboard. | Identifier les périphériques d’un outil numérique, tels que l’écran, la souris et le clavier. |
| `gus_volume_c2` | Plaza, Gus's bench | choice | 2 | 3a | Adjust simple hardware settings, such as the speaker volume. | Ajuster des réglages matériels simples, comme régler le volume du haut-parleur. |
| `gus_volume_c3` | Plaza, Gus's bench | choice | 3 | 3a | Adjust simple hardware settings, such as the speaker volume. | Ajuster des réglages matériels simples, comme régler le volume du haut-parleur. |
| `noor_board_c2` | Plaza, Noor at the village board | sort | 2 | 1a | Compare examples of digital practices to identify which ones have beneficial effects on themselves and others. | Comparer des exemples d’usages numériques pour identifier lesquels ont des effets bénéfiques sur lui et sur ses pairs. |
| `noor_board_c3` | Plaza, Noor at the village board | sort | 3 | 1a | Compare examples of digital practices to identify which ones have beneficial effects on themselves and others. | Comparer des exemples d’usages numériques pour identifier lesquels ont des effets bénéfiques sur lui et sur ses pairs. |
| `zoe_files_c2` | By the pond, Zoé's cart | choice | 2 | 4a | Save a file with a meaningful name and ask a peer to find it. | Enregistrer un fichier avec un nom significatif et demander à un pair de le retrouver. |
| `zoe_files_c3` | By the pond, Zoé's cart | sequence | 3 | 4a | Save a file with a meaningful name and ask a peer to find it. | Enregistrer un fichier avec un nom significatif et demander à un pair de le retrouver. |
| `fern_energy_c2` | Community garden, Fern | sort | 2 | 1b | Identify actions that reduce the environmental impact of their use of digital technology. | Identifier des gestes qui diminuent les répercussions de son usage du numérique sur l’environnement. |
| `fern_energy_c3` | Community garden, Fern | match | 3 | 1b | Identify and explain the stages of the life cycle of a digital device, from design to the end of its useful life, as well as the environmental impact. | Identifier et expliquer les étapes du cycle de vie d’un appareil numérique, de sa conception à sa fin de vie utile, ainsi que les répercussions sur l’environnement. |
| `sami_image_c2` | Kite tree, Sami | spot | 2 | 1a | Examine and discuss an image produced by generative artificial intelligence (GenAI) provided by their teacher. Ask themselves, for example: Is this real? How might this image influence other people? | Observer une image générée par l’intelligence artificielle générative (IAG) fournie par son enseignante ou son enseignant et en discuter. Se demander, par exemple : est-ce réel? Comment cette image peut-elle influencer les autres? |
| `sami_image_c3` | Kite tree, Sami | spot | 3 | 1a | Examine and discuss an image produced by generative artificial intelligence (GenAI) provided by their teacher. Ask themselves, for example: Is this real? How might this image influence other people? | Observer une image générée par l’intelligence artificielle générative (IAG) fournie par son enseignante ou son enseignant et en discuter. Se demander, par exemple : est-ce réel? Comment cette image peut-elle influencer les autres? |
| `sami_share_c2` | Kite tree, Sami | choice | 2 | 1a | Examine and discuss an image produced by generative artificial intelligence (GenAI) provided by their teacher. Ask themselves, for example: Is this real? How might this image influence other people? | Observer une image générée par l’intelligence artificielle générative (IAG) fournie par son enseignante ou son enseignant et en discuter. Se demander, par exemple : est-ce réel? Comment cette image peut-elle influencer les autres? |
| `sami_share_c3` | Kite tree, Sami | choice | 3 | 1a | Examine and discuss an image produced by generative artificial intelligence (GenAI) provided by their teacher. Ask themselves, for example: Is this real? How might this image influence other people? | Observer une image générée par l’intelligence artificielle générative (IAG) fournie par son enseignante ou son enseignant et en discuter. Se demander, par exemple : est-ce réel? Comment cette image peut-elle influencer les autres? |
| `pip_network_c2` | Mail stall, Pip | spot | 2 | 3a | Determine whether a digital device is connected to a network. | Reconnaître si l’outil numérique est connecté ou non à un réseau. |
| `pip_network_c3` | Mail stall, Pip | spot | 3 | 3a | Determine whether a digital device is connected to a network. | Reconnaître si l’outil numérique est connecté ou non à un réseau. |
| `bruno_notify_c2` | Bakery, Bruno | choice | 2 | 1c | Identify strategies to minimize influencing factors, such as turning off sound notifications. | Identifier des stratégies qui lui permettent d’atténuer des facteurs d’influence, par exemple enlever les notifications sonores. |
| `bruno_notify_c3` | Bakery, Bruno | sort | 3 | 1c | Recognize the technological mechanisms that shape and guide their digital consumption, such as notifications and recommendation algorithms. | Reconnaître des mécanismes technologiques façonnant et orientant sa consommation du numérique, comme des notifications et des algorithmes de recommandation. |
| `rosa_voice_c2` | Pond, Rosa | match | 2 | 3b | Use assistive features, such as text-to-speech or voice dictation, to support text comprehension or production. | Utiliser des fonctions d’aide, par exemple la synthèse vocale ou la dictée vocale, pour soutenir sa compréhension ou sa production de textes. |
| `rosa_voice_c3` | Pond, Rosa | match | 3 | 3b | Use assistive features, such as text-to-speech or voice dictation, to support text comprehension or production. | Utiliser des fonctions d’aide, par exemple la synthèse vocale ou la dictée vocale, pour soutenir sa compréhension ou sa production de textes. |

Notes on the side quests:

- **Wording.** Every `application` above is the Ministry's own wording from the English and French sheets (sheets 1, 3 and 4). Prompts, hints and villager lines borrow the sheets' vocabulary (for example "speaker volume", "connected to a network", "meaningful name", "sound notifications", "text-to-speech", "voice dictation"; in French « haut-parleur », « connecté à un réseau », « nom significatif », « notifications sonores », « synthèse vocale », « dictée vocale »).
- **Cycles.** Cycle 2 versions are short and concrete (3 or 4 items, one idea at a time, hints that point straight at the answer). Cycle 3 versions add a step of reasoning from the sheet's Cycle 3 column: Zoé's files become a save-and-find procedure, Fern's sign becomes the life cycle of a device, Bruno's phone becomes sorting the mechanisms that pull attention (notifications, autoplay, recommendations), and Pip's tablet adds airplane mode to the Wi-Fi sign.
- **AI.** Sami's quest is the sheet 1a application on a GenAI image ("Is this real? How might this image influence other people?"). The picture is drawn by the game (a duck bigger than a house, with three legs, under two suns); no AI service is used. Rosa's quest presents text-to-speech and voice dictation as helpers the tablet already has, the same Read&Write kind of tools students use in class.
- **Framework fit.** Dimension 1 quests ask about effects on oneself, on others and on the environment (Noor, Fern, Sami, Bruno). Dimension 2 quests ask the player to know the parts and features of a device and to solve a technical problem independently (Gus, Zoé, Pip, Rosa, Théo). Théo's Fix-it task is now counted as the first dimension 2 side quest (`q_fixit`); its puzzles did not change.
- **No scores.** A finished quest adds a line to the journal ("People you helped"), nothing else. The journal never lists what is not done.

### Dungeon 2: the Temple of Traces (sheet 2, `content/area2.json`)

Order of play: Atrium (Lumi gives the Lantern of Traces) → Hall of Traces (2a) → Vault of Keys (2b) → Window Gallery (2c) → Mask Hall (final room, one trick per element). Each wing ends with a chest holding one piece of the badge; the pieces open the next door.

| Puzzle id | Place | Type | Cycle | Element | Sheet application (EN) | Application (FR) |
|---|---|---|---|---|---|---|
| `d2_traces_c2` | Hall of Traces, Juno | match | 2 | 2a | Recognize situations where an online action reveals information about a person, even unintentionally. | Reconnaître des situations où une action en ligne donne des informations sur une personne, même sans qu’on le veuille. |
| `d2_traces_c3` | Hall of Traces, Juno | match | 3 | 2a | Recognize situations where an online action reveals information about a person, even unintentionally. | Reconnaître des situations où une action en ligne donne des informations sur une personne, même sans qu’on le veuille. |
| `d2_vanishing_c2` | Hall of Traces, the board | predict | 2 | 2a | Explain what can happen after they post something, even if they delete it later. | Expliquer ce qui peut arriver après avoir publié quelque chose, même si on l’efface ensuite. |
| `d2_vanishing_c3` | Hall of Traces, the board | predict | 3 | 2a | Explain what can happen after they post something, even if they delete it later. | Expliquer ce qui peut arriver après avoir publié quelque chose, même si on l’efface ensuite. |
| `d2_profile_c2` | Hall of Traces, the mirror | choice | 2 | 2a | Choose an image that doesn’t show their face or create an avatar as their profile picture. | Choisir une image qui ne montre pas son visage ou se créer un avatar comme photo de profil. |
| `d2_profile_c3` | Hall of Traces, the mirror | choice | 3 | 2a | Choose an image that doesn’t show their face or create an avatar as their profile picture. | Choisir une image qui ne montre pas son visage ou se créer un avatar comme photo de profil. |
| `d2_personal_c2` | Vault of Keys, Kai | sort | 2 | 2b | In certain situations or examples, identify what constitutes personal information and decide whether or not it can be shared. | Identifier, à partir de situations ou d’exemples, ce qui est une information personnelle et décider si elle peut être partagée ou non. |
| `d2_personal_c3` | Vault of Keys, Kai | sort | 3 | 2b | In certain situations or examples, identify what constitutes personal information and decide whether or not it can be shared. | Identifier, à partir de situations ou d’exemples, ce qui est une information personnelle et décider si elle peut être partagée ou non. |
| `d2_request_c2` | Vault of Keys, Kai (a message) | choice | 2 | 2b | Recognize messages or requests seeking personal information and explain what to do in such cases. | Reconnaître des messages ou des demandes qui visent à obtenir des informations personnelles et dire quoi faire dans ce cas. |
| `d2_request_c3` | Vault of Keys, Kai (a message) | choice | 3 | 2b | Recognize messages or requests seeking personal information and explain what to do in such cases. | Reconnaître des messages ou des demandes qui visent à obtenir des informations personnelles et dire quoi faire dans ce cas. |
| `d2_password_c2` | Vault of Keys, Kai | sort | 2 | 2b | Compare an easy-to-guess password with a harder-to-guess password for protecting personal information. | Comparer un mot de passe facile à deviner à un mot de passe plus difficile à deviner pour protéger des informations personnelles. |
| `d2_password_c3` | Vault of Keys, Kai | sort | 3 | 2b | Compare an easy-to-guess password with a harder-to-guess password for protecting personal information. | Comparer un mot de passe facile à deviner à un mot de passe plus difficile à deviner pour protéger des informations personnelles. |
| `d2_photo_c2` | Window Gallery, the easel | spot | 2 | 2c | Identify elements in an image that reveal personal information and explain what could be hidden or not shown. | Repérer dans une image des éléments qui révèlent des informations personnelles et dire ce qu’on pourrait cacher ou éviter de montrer. |
| `d2_photo_c3` | Window Gallery, the easel | spot | 3 | 2c | Identify elements in an image that reveal personal information and explain what could be hidden or not shown. | Repérer dans une image des éléments qui révèlent des informations personnelles et dire ce qu’on pourrait cacher ou éviter de montrer. |
| `d2_access_c2` | Window Gallery, Nova | sort | 2 | 2c | Recognize access requests (e.g. camera, microphone, location) and determine whether access should be granted or whether to ask for help. | Reconnaître des demandes d’accès (ex. : caméra, micro, localisation) et dire si elles devraient être acceptées ou s’il faudrait demander de l’aide. |
| `d2_access_c3` | Window Gallery, Nova | sort | 3 | 2c | Recognize access requests (e.g. camera, microphone, location) and determine whether access should be granted or whether to ask for help. | Reconnaître des demandes d’accès (ex. : caméra, micro, localisation) et dire si elles devraient être acceptées ou s’il faudrait demander de l’aide. |
| `d2_camera_c2` | Window Gallery, the laptop | predict | 2 | 2c | Recognize when a camera and microphone are active in order to decide whether it is appropriate to leave them on. | Reconnaître quand une caméra et un micro sont actifs afin de décider s’il est approprié de les laisser ouverts. |
| `d2_camera_c3` | Window Gallery, the laptop | predict | 3 | 2c | Recognize when a camera and microphone are active in order to decide whether it is appropriate to leave them on. | Reconnaître quand une caméra et un micro sont actifs afin de décider s’il est approprié de les laisser ouverts. |
| `d2_boss1_c2` | Mask Hall, Mask Merchant (trick 1) | choice | 2 | 2b | Recognize messages or requests seeking personal information and explain what to do in such cases. | Reconnaître des messages ou des demandes qui visent à obtenir des informations personnelles et dire quoi faire dans ce cas. |
| `d2_boss1_c3` | Mask Hall, Mask Merchant (trick 1) | choice | 3 | 2b | Explain what can happen to a person or a group if personal information is shared without permission. | Expliquer ce qui peut arriver à une personne ou à un groupe si des informations personnelles sont partagées sans permission. |
| `d2_boss2_c2` | Mask Hall, Mask Merchant (trick 2) | choice | 2 | 2a | Explain what can happen after they post something, even if they delete it later. | Expliquer ce qui peut arriver après avoir publié quelque chose, même si on l’efface ensuite. |
| `d2_boss2_c3` | Mask Hall, Mask Merchant (trick 2) | choice | 3 | 2a | Explain what can happen after they post something, even if they delete it later. | Expliquer ce qui peut arriver après avoir publié quelque chose, même si on l’efface ensuite. |
| `d2_boss3_c2` | Mask Hall, Mask Merchant (trick 3) | choice | 2 | 2c | Recognize access requests (e.g. camera, microphone, location) and determine whether access should be granted or whether to ask for help. | Reconnaître des demandes d’accès (ex. : caméra, micro, localisation) et dire si elles devraient être acceptées ou s’il faudrait demander de l’aide. |
| `d2_boss3_c3` | Mask Hall, Mask Merchant (trick 3) | choice | 3 | 2c | Determine, in a given situation, whether it is better to share or keep private information such as a photo of one’s home showing the address, a person’s full name or a favourite pet. | Dire, dans une situation donnée, s’il est préférable de partager ou de garder privée une information telle qu’une photo de la maison avec adresse, un nom complet ou un animal préféré. |

Notes on the Dungeon 2 puzzles:

- Cycle 2 versions use the class message board, a classroom reading app, a cousin's photo and the class tablet, with 3 or 4 items and hints that point straight at the answer. Cycle 3 versions use the class blog and group chat, an online game account, a friend's photo run through an AI cartoon filter, and up to 6 items, with hints that give a clue to think about.
- The Cycle 3 final room uses the sheet 2b application about sharing someone's information without permission (trick 1) and the 2c application about keeping a house photo or full name private (trick 3), so Cycle 3 meets every application on the sheet at least once.
- The final room's three tricks are a chain of `choice` puzzles on purpose (build plan 5.5, rule 5). They are marked `"finale": true`, so the variety check skips them.
- Sort puzzles accept more than one box when more than one answer is reasonable (for example "Ask an adult first" is always accepted alongside "Keep private" or "Don't allow"), so a careful answer is never marked as a mistake.

World puzzles (no element, for pacing): the hidden door in the Hall of Traces (only the lantern shows it, after Juno's traces are matched) and the three key stones in the Vault of Keys (the lantern shows one, two and three footprints beside them).

## Flavour lines that are not puzzles

Some village dialogue touches sheet themes without being a puzzle, so it does not claim to cover an element:

- Rosa (pond): she is taking photos of the ducks with her tablet, then closes her apps, locks it and puts it in its case before crossing the bridge (device care near water; a "question to consider" on sheet 4, element 4a). After the Window Gallery she notices her house number in a duck photo and crops it out (a reminder of 2c, not a puzzle).
- Mika (gates): a teaser for the Lantern of Traces before Dungeon 2; once the player has the lantern, a line about likes and comments as traces (2a reminder).
- The well (four wishes, one each time), the village board (a note for whoever needs a hand right now), the floppy-disk statue (where the Save icon comes from), the mailbox, the scarecrow, the stump, and the signs on the empty lots that become the garden, the mail stall and the bakery: village life and jokes, tied to what is in front of the player. They are not puzzles.
- The animals (ducks, Pixel the cat, chickens, Pip's pigeon): a short funny line each. The pigeon carries "paper mail" (a wink at communication channels, sheet 6, not a puzzle).
- The secret grove: the Lantern of Traces shows duck tracks that lead through a thicket to a chest (a golden feather). It rewards exploring with the Dungeon 2 item and recalls that traces can be followed (2a reminder).
- Arrival scenes (`arrivals` in `hub.json`): one or two lines each time someone moves in, so the player knows who is new and where they are.
- Ada and Théo: point to the next thing to do (Théo's shop, the purple gate), and notice when the village grows after the Digital Identity Badge comes home.

Rule for all dialogue: what a character says must follow from where they are, what they are doing and how far the player has got. Characters change their lines with story flags (see `content-schema.md`, People), so nobody repeats advice the player has already acted on.
