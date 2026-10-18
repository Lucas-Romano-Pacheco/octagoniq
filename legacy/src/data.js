/* =====================================================================
   OctagonIQ · base de dados
   ---------------------------------------------------------------------
   Rankings: release oficial de 25/08/2026 (UFC.com), com ajustes por
   eventos posteriores (Aspinall vagou o cinturão dos pesados em 14/09;
   Natália Silva conquistou o cinturão vago dos moscas em 03/10).
   Resultados: eventos de 2024 a 03/10/2026 (destaques de cada card).
   Agenda: cards anunciados até 17/10/2026.
   Estatísticas de carreira (SLpM, precisão etc.) e cartéis: valores
   aproximados, no formato do UFC Stats. Quem não tem perfil detalhado
   aparece com ranking e histórico, sem métricas.
   ===================================================================== */
const DATA_AS_OF = '2026-10-17';

const DIVS = [
  { id: 'fly', name: 'Mosca', en: 'Flyweight', lb: 125 },
  { id: 'bantam', name: 'Galo', en: 'Bantamweight', lb: 135 },
  { id: 'feather', name: 'Pena', en: 'Featherweight', lb: 145 },
  { id: 'light', name: 'Leve', en: 'Lightweight', lb: 155 },
  { id: 'welter', name: 'Meio-médio', en: 'Welterweight', lb: 170 },
  { id: 'middle', name: 'Médio', en: 'Middleweight', lb: 185 },
  { id: 'lightheavy', name: 'Meio-pesado', en: 'Light Heavyweight', lb: 205 },
  { id: 'heavy', name: 'Pesado', en: 'Heavyweight', lb: 265 },
  { id: 'wstraw', name: 'Palha (F)', en: "Women's Strawweight", lb: 115, w: true },
  { id: 'wfly', name: 'Mosca (F)', en: "Women's Flyweight", lb: 125, w: true },
  { id: 'wbantam', name: 'Galo (F)', en: "Women's Bantamweight", lb: 135, w: true }
];

/* Perfil detalhado:
   S(nome, apelido, país, divisão, nascimento, [V,D,E,NC], altura cm, envergadura cm, base, equipe,
     [SLpM, Precisão%, SApM, Defesa%, KD/15, Quedas/15, Precisão quedas%, Defesa quedas%, Fin./15],
     [vitórias KO, Fin., Decisão], extras) */
const PROFILES = [
  // ---- Mosca
  ['Joshua Van', 'The Fearless', 'Mianmar', 'fly', '2001-10-10', [17, 2, 0, 0], 165, 165, 'Ortodoxa', 'Fight Ready', [6.3, 51, 4.2, 57, .5, .9, 45, 78, .2], [9, 2, 6]],
  ['Alexandre Pantoja', 'The Cannibal', 'Brasil', 'fly', '1990-04-16', [30, 7, 0, 0], 165, 170, 'Ortodoxa', 'American Top Team', [4.3, 47, 3.7, 55, .3, 1.6, 41, 64, 1.1], [8, 12, 10]],
  ['Manel Kape', 'Starboy', 'Portugal', 'fly', '1993-11-14', [21, 7, 0, 0], 165, 173, 'Ortodoxa', 'Xtreme Couture', [3.7, 52, 2.9, 61, .6, .5, 40, 75, .2], [11, 4, 6]],
  ['Brandon Royval', 'Raw Dawg', 'EUA', 'fly', '1992-08-16', [18, 7, 0, 0], 175, 173, 'Canhota', 'Factory X', [4.6, 44, 4.6, 55, .4, .7, 35, 55, 1.4], [5, 9, 4]],
  ['Tatsuro Taira', '', 'Japão', 'fly', '2000-01-27', [17, 2, 0, 0], 170, 178, 'Ortodoxa', 'Theory MMA', [3.2, 55, 2.4, 58, .3, 3.1, 46, 80, 1.2], [5, 8, 4]],
  ['Kyoji Horiguchi', '', 'Japão', 'fly', '1990-10-12', [33, 5, 0, 1], 163, 168, 'Ortodoxa', 'American Top Team', [3.9, 47, 2.2, 62, .6, 1.7, 48, 80, .2], [16, 4, 13]],
  ['Brandon Moreno', 'The Assassin Baby', 'México', 'fly', '1993-12-07', [23, 9, 2, 0], 170, 178, 'Ortodoxa', 'Entram Gym', [3.9, 44, 3.7, 59, .3, 1.3, 44, 73, .8], [5, 10, 8]],
  ['Amir Albazi', 'The Prince', 'Iraque', 'fly', '1994-01-12', [17, 2, 0, 0], 165, 173, 'Ortodoxa', 'Allstars', [3.6, 43, 3.4, 58, .3, 1.6, 30, 60, 1.0], [3, 10, 4]],
  // ---- Galo
  ['Petr Yan', 'No Mercy', 'Rússia', 'bantam', '1993-02-11', [19, 5, 0, 0], 170, 170, 'Switch', 'Yan Team', [5.1, 54, 3.9, 60, .4, 1.6, 39, 85, .1], [7, 1, 11]],
  ['Merab Dvalishvili', 'The Machine', 'Geórgia', 'bantam', '1991-01-10', [21, 5, 0, 0], 168, 173, 'Ortodoxa', 'Serra-Longo Fight Team', [4.6, 42, 2.8, 52, .2, 6.1, 37, 77, .3], [3, 2, 16]],
  ["Sean O'Malley", 'Suga', 'EUA', 'bantam', '1994-10-24', [20, 3, 0, 1], 180, 183, 'Switch', 'MMA Lab', [6.3, 58, 3.5, 60, .9, 0, 0, 70, .2], [13, 1, 6]],
  ['Umar Nurmagomedov', '', 'Rússia', 'bantam', '1996-01-03', [19, 1, 0, 0], 173, 175, 'Canhota', 'American Kickboxing Academy', [4.1, 49, 1.9, 69, .2, 3.6, 46, 90, .6], [6, 6, 7]],
  ['Mario Bautista', '', 'EUA', 'bantam', '1993-06-02', [17, 2, 0, 0], 175, 175, 'Ortodoxa', 'MMA Lab', [4.8, 47, 3.4, 55, .2, 1.9, 46, 70, .8], [5, 6, 6]],
  ['Cory Sandhagen', 'Sandman', 'EUA', 'bantam', '1992-04-20', [18, 7, 0, 0], 180, 178, 'Switch', 'Elevation Fight Team', [6.1, 46, 3.9, 58, .4, 1.1, 40, 63, .6], [7, 4, 7]],
  ['Song Yadong', 'Kung Fu Kid', 'China', 'bantam', '1997-12-02', [22, 9, 1, 1], 173, 170, 'Ortodoxa', 'Team Alpha Male', [4.7, 40, 4.1, 58, .4, .3, 50, 76, .2], [9, 4, 9]],
  ['Deiveson Figueiredo', 'Deus da Guerra', 'Brasil', 'bantam', '1987-12-18', [24, 7, 1, 0], 165, 173, 'Ortodoxa', 'Elite Training Center', [3.6, 55, 3.8, 50, .6, 1.5, 44, 64, 1.5], [9, 9, 6]],
  ['Marlon Vera', 'Chito', 'Equador', 'bantam', '1992-12-02', [24, 10, 1, 0], 173, 178, 'Switch', 'Kings MMA', [4.4, 49, 4.1, 54, .3, .6, 40, 65, .6], [10, 8, 6]],
  ['Payton Talbott', '', 'EUA', 'bantam', '1998-09-28', [12, 1, 0, 0], 178, 178, 'Ortodoxa', 'Syndicate MMA', [6.5, 51, 3.5, 55, .8, .5, 40, 80, .3], [8, 1, 3]],
  // ---- Pena
  ['Alexander Volkanovski', 'The Great', 'Austrália', 'feather', '1988-09-29', [28, 4, 0, 0], 168, 182, 'Ortodoxa', 'City Kickboxing', [6.2, 56, 3.4, 59, .4, 1.6, 37, 70, .1], [13, 3, 12], { legs: .08 }],
  ['Movsar Evloev', '', 'Rússia', 'feather', '1994-02-11', [20, 0, 0, 0], 170, 183, 'Ortodoxa', 'American Top Team', [3.9, 48, 2.5, 60, 0, 4.6, 40, 80, .5], [3, 4, 13]],
  ['Diego Lopes', '', 'Brasil', 'feather', '1994-12-30', [27, 8, 0, 0], 180, 183, 'Ortodoxa', 'Lobo Gym', [4.1, 51, 3.4, 48, .7, .6, 25, 60, 1.6], [11, 12, 4]],
  ['Lerone Murphy', 'The Miracle', 'Inglaterra', 'feather', '1991-07-22', [16, 2, 1, 0], 175, 185, 'Ortodoxa', 'Manchester Top Team', [4.0, 58, 2.6, 63, .3, .8, 40, 85, .1], [7, 3, 6]],
  ['Aljamain Sterling', 'Funk Master', 'EUA', 'feather', '1989-07-31', [25, 5, 0, 0], 170, 180, 'Ortodoxa', 'Serra-Longo Fight Team', [4.5, 52, 1.9, 58, .1, 2.3, 34, 49, 1.2], [3, 8, 14]],
  ['Yair Rodríguez', 'El Pantera', 'México', 'feather', '1992-10-06', [19, 5, 0, 1], 180, 180, 'Ortodoxa', 'Entram Gym', [4.9, 47, 3.9, 58, .5, .6, 30, 70, .7], [8, 4, 7], { legs: .1 }],
  ['Jean Silva', 'Lord', 'Brasil', 'feather', null, [17, 3, 0, 0], 170, 175, 'Ortodoxa', 'Fighting Nerds', [5.3, 58, 3.9, 51, 1.3, .4, 40, 75, .3], [11, 3, 3]],
  ['Arnold Allen', 'Almighty', 'Inglaterra', 'feather', '1994-01-22', [20, 4, 0, 0], 173, 178, 'Canhota', 'Tristar Gym', [3.8, 49, 3.4, 58, .4, 1.3, 38, 72, .5], [7, 4, 9]],
  ['Brian Ortega', 'T-City', 'EUA', 'feather', '1991-02-21', [16, 4, 0, 1], 173, 175, 'Ortodoxa', 'Team Alpha Male', [4.2, 37, 4.8, 52, .1, 1.0, 22, 56, 1.5], [3, 8, 5]],
  // ---- Leve
  ['Justin Gaethje', 'The Highlight', 'EUA', 'light', '1988-11-14', [27, 5, 0, 0], 180, 178, 'Ortodoxa', 'Elevation Fight Team', [7.1, 60, 7.6, 53, .9, .1, 10, 73, 0], [20, 1, 6], { legs: .12 }],
  ['Ilia Topuria', 'El Matador', 'Espanha', 'light', '1997-01-21', [17, 1, 0, 0], 170, 175, 'Ortodoxa', 'Climent Club', [4.6, 48, 3.2, 63, .9, 2.0, 59, 92, 1.3], [7, 8, 2]],
  ['Arman Tsarukyan', 'Ahalkalakets', 'Armênia', 'light', '1996-10-11', [24, 3, 0, 0], 170, 183, 'Ortodoxa', 'Tsarukyan Team', [3.7, 49, 1.6, 59, .4, 3.3, 42, 75, .5], [11, 3, 10]],
  ['Charles Oliveira', 'do Bronx', 'Brasil', 'light', '1989-10-17', [37, 11, 0, 1], 178, 188, 'Ortodoxa', 'Chute Boxe Diego Lima', [3.4, 53, 3.2, 51, .4, 2.4, 41, 57, 2.5], [10, 22, 5]],
  ['Max Holloway', 'Blessed', 'EUA', 'light', '1991-12-04', [28, 9, 0, 0], 180, 175, 'Ortodoxa', 'Gracie Technics', [7.2, 47, 4.8, 59, .5, .3, 83, 84, .2], [13, 2, 13]],
  ['Paddy Pimblett', 'The Baddy', 'Inglaterra', 'light', '1995-01-03', [24, 4, 0, 0], 178, 185, 'Ortodoxa', 'Next Generation MMA', [5.1, 52, 4.4, 46, .3, 1.4, 39, 40, 1.6], [6, 12, 6]],
  ['Benoît Saint Denis', 'God of War', 'França', 'light', '1996-01-18', [16, 4, 0, 1], 180, 185, 'Canhota', 'Atch Academy', [5.4, 57, 4.9, 46, .6, 4.1, 40, 60, 1.8], [6, 9, 1]],
  ['Maurício Ruffy', '', 'Brasil', 'light', null, [14, 2, 0, 0], 180, 190, 'Ortodoxa', 'Fighting Nerds', [5.2, 57, 3.5, 58, 1.2, .3, 50, 80, .2], [11, 1, 2]],
  ['Mateusz Gamrot', 'Gamer', 'Polônia', 'light', '1990-12-11', [25, 4, 0, 1], 178, 178, 'Switch', 'American Top Team', [3.9, 43, 2.9, 59, .1, 5.3, 32, 88, .4], [8, 6, 11]],
  ['Dan Hooker', 'The Hangman', 'Nova Zelândia', 'light', '1990-02-13', [24, 13, 0, 0], 183, 191, 'Ortodoxa', 'City Kickboxing', [5.4, 48, 4.9, 54, .4, 1.0, 46, 73, .4], [11, 6, 7]],
  ['Renato Moicano', 'Money', 'Brasil', 'light', '1989-05-21', [20, 7, 1, 0], 180, 183, 'Ortodoxa', 'American Top Team', [4.7, 51, 3.8, 54, .3, 1.4, 41, 63, .9], [5, 9, 6]],
  ['Rafael Fiziev', 'Ataman', 'Azerbaijão', 'light', '1993-03-05', [13, 4, 0, 0], 173, 180, 'Switch', 'Tiger Muay Thai', [5.4, 52, 4.2, 61, .6, .2, 40, 77, 0], [7, 0, 6], { legs: .12 }],
  // ---- Meio-médio
  ['Islam Makhachev', '', 'Rússia', 'welter', '1991-10-27', [29, 1, 0, 0], 178, 179, 'Canhota', 'American Kickboxing Academy', [2.6, 60, 1.0, 62, .3, 3.1, 59, 90, 1.1], [5, 13, 11]],
  ['Ian Machado Garry', 'The Future', 'Irlanda', 'welter', '1997-11-17', [17, 2, 0, 0], 191, 188, 'Ortodoxa', 'Kill Cliff FC', [5.5, 57, 3.4, 56, .4, 1.0, 40, 76, .3], [9, 1, 7]],
  ['Carlos Prates', 'The Nightmare', 'Brasil', 'welter', null, [23, 7, 0, 0], 185, 193, 'Switch', 'Fighting Nerds', [5.8, 56, 3.8, 56, 1.4, .1, 0, 75, .1], [17, 2, 4]],
  ['Michael Morales', '', 'Equador', 'welter', null, [19, 0, 0, 0], 188, 201, 'Ortodoxa', '—', [4.8, 50, 2.6, 62, 1.1, .6, 45, 85, .2], [13, 1, 5]],
  ['Jack Della Maddalena', '', 'Austrália', 'welter', '1996-08-23', [18, 4, 0, 0], 180, 185, 'Ortodoxa', 'Scrappy MMA', [6.6, 49, 4.8, 58, 1.0, .3, 50, 66, .4], [12, 2, 4]],
  ['Gabriel Bonfim', 'Marretinha', 'Brasil', 'welter', null, [19, 1, 0, 0], 185, 188, 'Ortodoxa', 'Team Bonfim', [3.9, 56, 2.4, 56, .6, 2.2, 60, 70, 1.6], [5, 11, 3]],
  ['Sean Brady', '', 'EUA', 'welter', '1992-11-23', [18, 2, 0, 0], 178, 183, 'Ortodoxa', 'Renzo Gracie Philly', [4.2, 47, 3.2, 57, .1, 2.9, 35, 85, 1.1], [3, 7, 8]],
  ['Belal Muhammad', 'Remember the Name', 'EUA', 'welter', '1988-07-09', [24, 6, 0, 1], 178, 183, 'Ortodoxa', 'Valle Flow Striking', [4.5, 43, 3.9, 59, .1, 2.2, 35, 93, .1], [5, 1, 18]],
  ['Leon Edwards', 'Rocky', 'Inglaterra', 'welter', '1991-08-25', [22, 6, 0, 1], 183, 188, 'Canhota', 'Team Renegade', [2.6, 50, 2.1, 53, .4, 1.3, 36, 67, .5], [7, 3, 12]],
  ['Kamaru Usman', 'The Nigerian Nightmare', 'Nigéria', 'welter', '1987-05-11', [20, 5, 0, 0], 183, 193, 'Ortodoxa', 'Hard Knocks 365', [4.4, 52, 2.6, 54, .2, 2.8, 46, 97, .1], [9, 1, 10]],
  ['Joaquin Buckley', 'New Mansa', 'EUA', 'welter', '1994-04-27', [21, 8, 0, 0], 178, 193, 'Ortodoxa', 'Kill Cliff FC', [3.8, 44, 3.6, 56, .9, .8, 40, 65, .1], [15, 1, 5]],
  // ---- Médio
  ['Sean Strickland', 'Tarzan', 'EUA', 'middle', '1991-02-27', [31, 7, 0, 0], 185, 193, 'Ortodoxa', 'Xtreme Couture', [5.8, 42, 4.2, 64, .3, .9, 60, 85, .1], [11, 4, 16]],
  ['Khamzat Chimaev', 'Borz', 'EAU', 'middle', '1994-05-01', [15, 1, 0, 0], 188, 191, 'Ortodoxa', 'Allstars Training Center', [5.6, 58, 2.3, 52, .7, 5.4, 48, 100, 1.5], [6, 6, 3]],
  ['Dricus du Plessis', 'Stillknocks', 'África do Sul', 'middle', '1993-12-14', [24, 3, 0, 0], 185, 193, 'Switch', 'CIT Performance Institute', [6.3, 50, 4.6, 51, .6, 2.6, 45, 53, .9], [9, 11, 4]],
  ['Nassourdine Imavov', 'The Sniper', 'França', 'middle', '1995-03-01', [17, 4, 0, 1], 191, 191, 'Ortodoxa', 'MMA Factory', [4.5, 52, 3.2, 57, .5, .9, 40, 70, .2], [8, 3, 6]],
  ['Brendan Allen', 'All In', 'EUA', 'middle', '1995-12-28', [27, 6, 0, 0], 188, 191, 'Ortodoxa', 'Kill Cliff FC', [4.4, 52, 3.2, 48, .2, 1.8, 40, 60, 1.6], [6, 14, 7]],
  ['Caio Borralho', 'The Natural', 'Brasil', 'middle', '1993-01-16', [18, 1, 0, 1], 188, 191, 'Canhota', 'Fighting Nerds', [3.9, 57, 2.4, 58, .4, 2.2, 50, 92, .8], [6, 5, 7]],
  ['Joe Pyfer', 'Bodybagz', 'EUA', 'middle', null, [16, 3, 0, 0], 188, 191, 'Ortodoxa', 'Philadelphia Fight Factory', [4.6, 58, 3.6, 52, 1.1, 1.5, 50, 70, .8], [10, 4, 2]],
  ['Anthony Hernandez', 'Fluffy', 'EUA', 'middle', null, [15, 3, 0, 0], 183, 191, 'Ortodoxa', '—', [4.1, 52, 3.3, 55, .2, 3.8, 40, 60, 1.6], [3, 8, 4]],
  ['Israel Adesanya', 'The Last Stylebender', 'Nigéria / Nova Zelândia', 'middle', '1989-07-22', [24, 6, 0, 0], 193, 203, 'Switch', 'City Kickboxing', [3.9, 49, 2.9, 61, .5, 0, 0, 77, .1], [16, 1, 7], { legs: .1 }],
  ['Bo Nickal', '', 'EUA', 'middle', '1996-01-14', [9, 1, 0, 0], 185, 193, 'Ortodoxa', 'American Top Team', [3.5, 64, 2.5, 55, .5, 4.8, 60, 100, 2.4], [4, 5, 0]],
  // ---- Meio-pesado
  ['Carlos Ulberg', 'Black Jag', 'Nova Zelândia', 'lightheavy', '1990-11-07', [15, 1, 0, 0], 193, 196, 'Ortodoxa', 'City Kickboxing', [6.0, 54, 2.8, 60, 1.0, 0, 0, 75, 0], [10, 0, 5]],
  ['Magomed Ankalaev', '', 'Rússia', 'lightheavy', '1992-06-02', [22, 2, 1, 0], 191, 191, 'Canhota', 'Gorets', [3.7, 52, 2.4, 56, .6, .9, 33, 85, 0], [11, 0, 11], { legs: .06 }],
  ['Jiří Procházka', 'BJP', 'República Tcheca', 'lightheavy', '1992-10-14', [31, 6, 1, 0], 191, 203, 'Switch', 'Jetsaam Gym', [5.9, 55, 5.8, 43, 1.0, .4, 67, 63, .4], [26, 3, 2]],
  ['Alex Pereira', 'Poatan', 'Brasil', 'lightheavy', '1987-07-07', [13, 4, 0, 0], 193, 200, 'Ortodoxa', 'Teixeira MMA & Fitness', [5.1, 61, 3.7, 51, 1.5, .1, 50, 67, .1], [11, 0, 2], { legs: .14 }],
  ['Khalil Rountree Jr.', 'The War Horse', 'EUA', 'lightheavy', '1990-02-26', [14, 6, 0, 1], 185, 193, 'Canhota', 'Tiger Muay Thai', [3.6, 48, 3.4, 54, .8, 0, 0, 74, 0], [9, 0, 5], { legs: .14 }],
  ['Paulo Costa', 'Borrachinha', 'Brasil', 'lightheavy', '1991-03-21', [16, 4, 0, 0], 185, 183, 'Ortodoxa', 'Borrachinha MMA', [7.0, 57, 6.6, 49, 1.0, .4, 100, 80, .1], [12, 0, 4]],
  ['Jamahal Hill', 'Sweet Dreams', 'EUA', 'lightheavy', '1991-05-19', [12, 4, 0, 1], 193, 201, 'Canhota', '—', [7.0, 56, 4.6, 50, .9, 0, 0, 60, 0], [7, 0, 5]],
  ['Dominick Reyes', 'The Devastator', 'EUA', 'lightheavy', '1989-12-26', [15, 4, 0, 0], 193, 196, 'Canhota', '—', [4.8, 50, 4.2, 49, .9, .4, 20, 70, 0], [10, 0, 5]],
  ['Robert Whittaker', 'The Reaper', 'Austrália', 'lightheavy', '1990-12-20', [26, 9, 0, 0], 183, 185, 'Ortodoxa', 'Smeaton MMA', [4.4, 41, 3.3, 61, .4, .8, 42, 82, 0], [10, 5, 11]],
  // ---- Pesado
  ['Ciryl Gane', 'Bon Gamin', 'França', 'heavy', '1990-04-12', [14, 2, 0, 1], 193, 206, 'Ortodoxa', 'Fight Zone', [5.3, 59, 2.4, 58, .5, .6, 33, 46, .4], [7, 3, 4], { legs: .08 }],
  ['Tom Aspinall', '', 'Inglaterra', 'heavy', '1993-04-11', [15, 3, 0, 1], 196, 198, 'Ortodoxa', 'Team Kaobon', [7.7, 66, 2.8, 61, 1.4, 3.5, 80, 100, 1.0], [12, 3, 0]],
  ['Alexander Volkov', 'Drago', 'Rússia', 'heavy', '1988-10-24', [39, 11, 0, 0], 201, 203, 'Ortodoxa', 'Strela Team', [5.1, 57, 2.8, 59, .5, .3, 60, 70, .1], [24, 4, 11]],
  ['Sergei Pavlovich', '', 'Rússia', 'heavy', '1992-05-13', [19, 3, 0, 0], 191, 213, 'Ortodoxa', 'Fight Spirit Team', [4.5, 53, 2.5, 52, 1.6, .2, 50, 80, 0], [16, 0, 3]],
  ['Waldo Cortes-Acosta', 'Salsa Boy', 'República Dominicana', 'heavy', null, [15, 3, 0, 0], 193, 198, 'Ortodoxa', '—', [5.3, 51, 4.0, 57, .5, .3, 40, 80, 0], [10, 0, 5]],
  ['Curtis Blaydes', 'Razor', 'EUA', 'heavy', '1991-02-18', [19, 6, 0, 1], 193, 203, 'Ortodoxa', 'Elevation Fight Team', [3.6, 53, 1.6, 56, .8, 5.7, 51, 33, 0], [13, 0, 6]],
  ['Derrick Lewis', 'The Black Beast', 'EUA', 'heavy', '1985-02-07', [28, 14, 0, 1], 191, 201, 'Ortodoxa', '4oz Fight Club', [2.5, 51, 2.6, 40, .9, .5, 30, 55, .1], [23, 1, 4]],
  // ---- Palha (F)
  ['Mackenzie Dern', '', 'EUA / Brasil', 'wstraw', '1993-03-24', [17, 5, 0, 0], 163, 160, 'Ortodoxa', 'Dern Team', [3.2, 43, 3.6, 51, 0, 1.0, 15, 40, 1.5], [0, 9, 8]],
  ['Zhang Weili', 'Magnum', 'China', 'wstraw', '1989-08-13', [26, 5, 0, 0], 163, 160, 'Switch', 'Black Tiger Fight Club', [5.4, 54, 3.4, 58, .6, 3.0, 55, 73, .6], [11, 8, 7]],
  ['Virna Jandiroba', 'Carcará', 'Brasil', 'wstraw', '1988-05-30', [22, 4, 0, 0], 160, 163, 'Ortodoxa', '—', [2.6, 40, 2.4, 50, 0, 2.0, 30, 55, 1.8], [2, 11, 9]],
  ['Tatiana Suarez', '', 'EUA', 'wstraw', '1990-12-19', [12, 1, 0, 0], 165, 168, 'Ortodoxa', 'Millennia MMA', [2.9, 52, 1.4, 50, .1, 4.3, 45, 100, .9], [3, 5, 4]],
  ['Gillian Robertson', 'The Savage', 'Canadá', 'wstraw', '1995-05-04', [16, 9, 0, 0], 163, 165, 'Ortodoxa', 'American Top Team', [2.6, 47, 2.8, 44, 0, 2.6, 35, 50, 2.2], [2, 9, 5]],
  ['Yan Xiaonan', 'Fury', 'China', 'wstraw', '1989-12-23', [19, 5, 0, 1], 165, 160, 'Ortodoxa', '—', [5.6, 52, 4.1, 58, .3, .6, 50, 70, .1], [7, 0, 12]],
  // ---- Mosca (F)
  ['Natália Silva', '', 'Brasil', 'wfly', '1997-01-05', [20, 5, 1, 0], 163, 165, 'Ortodoxa', '—', [5.1, 61, 2.4, 65, .2, .8, 50, 80, .2], [6, 4, 10]],
  ['Valentina Shevchenko', 'Bullet', 'Quirguistão', 'wfly', '1988-03-07', [26, 4, 1, 0], 165, 170, 'Canhota', 'Bullet Team', [3.2, 53, 2.0, 66, .4, 2.1, 61, 70, .7], [8, 7, 11]],
  ['Manon Fiorot', 'The Beast', 'França', 'wfly', '1990-02-17', [13, 2, 0, 0], 170, 165, 'Ortodoxa', '—', [5.0, 45, 2.3, 70, .1, 1.6, 40, 70, .1], [5, 0, 8]],
  ['Alexa Grasso', '', 'México', 'wfly', '1993-08-09', [17, 5, 1, 0], 165, 168, 'Ortodoxa', 'Lobo Gym', [4.6, 43, 3.8, 57, .3, .4, 40, 66, .4], [5, 4, 8]],
  ['Erin Blanchfield', 'Cold Blooded', 'EUA', 'wfly', '1999-05-04', [14, 2, 0, 0], 163, 168, 'Ortodoxa', '—', [4.0, 47, 2.5, 58, 0, 2.3, 30, 80, 1.4], [2, 6, 6]],
  ['Rose Namajunas', 'Thug', 'EUA', 'wfly', '1992-06-29', [14, 7, 0, 0], 165, 165, 'Ortodoxa', '—', [3.9, 45, 3.0, 58, .2, 1.3, 40, 70, .5], [4, 5, 5]],
  ['Maycee Barber', 'The Future', 'EUA', 'wfly', '1998-05-18', [15, 3, 0, 0], 165, 165, 'Ortodoxa', '—', [4.3, 46, 3.4, 56, .2, 1.6, 40, 70, .2], [6, 1, 8]],
  // ---- Galo (F)
  ['Kayla Harrison', '', 'EUA', 'wbantam', '1990-07-02', [19, 1, 0, 0], 173, 168, 'Ortodoxa', 'American Top Team', [3.3, 54, 1.6, 62, .3, 4.5, 52, 100, 1.0], [6, 9, 4]],
  ['Julianna Peña', 'The Venezuelan Vixen', 'EUA', 'wbantam', '1989-08-19', [12, 6, 0, 0], 168, 175, 'Ortodoxa', '—', [4.2, 46, 4.6, 51, .1, 1.9, 40, 45, .5], [2, 5, 5]],
  ['Raquel Pennington', 'Rocky', 'EUA', 'wbantam', '1988-09-05', [16, 10, 0, 0], 170, 170, 'Ortodoxa', 'Altitude MMA', [4.4, 51, 3.8, 53, 0, .5, 40, 60, .2], [1, 5, 10]],
  ['Amanda Nunes', 'The Lioness', 'Brasil', 'wbantam', '1988-05-30', [23, 5, 0, 0], 173, 175, 'Ortodoxa', 'American Top Team', [4.6, 52, 2.6, 54, .7, 1.8, 48, 78, .7], [13, 4, 6]]
];

/* Rankings oficiais (25/08/2026) com ajustes posteriores anotados em `note`. */
const RANKINGS = {
  fly: { champ: 'Joshua Van', list: ['Alexandre Pantoja', 'Manel Kape', 'Brandon Royval', 'Tatsuro Taira', 'Kyoji Horiguchi', "Lone'er Kavanagh", 'Asu Almabayev', 'Brandon Moreno', 'Amir Albazi', 'Ramazan Temirov', 'Alex Perez', 'Steve Erceg', 'Tim Elliott', 'Tagir Ulanbekov', 'Charles Johnson'], note: 'Van defendeu contra Pantoja no UFC 331 (19/09).' },
  bantam: { champ: 'Petr Yan', list: ['Merab Dvalishvili', "Sean O'Malley", 'Umar Nurmagomedov', 'Mario Bautista', 'Cory Sandhagen', 'Song Yadong', 'Aiemann Zahabi', 'David Martínez', 'Deiveson Figueiredo', 'Marlon Vera', 'Payton Talbott', 'Raul Rosas Jr.', 'Raoni Barcelos', 'Farid Basharat', 'Marcus McGhee'] },
  feather: { champ: 'Alexander Volkanovski', list: ['Movsar Evloev', 'Diego Lopes', 'Lerone Murphy', 'Aljamain Sterling', 'Yair Rodríguez', 'Jean Silva', 'Arnold Allen', 'Youssef Zalal', 'Kevin Vallejos', 'Steve Garcia', 'Brian Ortega', 'Aaron Pico', 'Melquizael Costa', 'David Onama', 'Patrício Pitbull'] },
  light: { champ: 'Justin Gaethje', list: ['Ilia Topuria', 'Arman Tsarukyan', 'Charles Oliveira', 'Max Holloway', 'Paddy Pimblett', 'Benoît Saint Denis', 'Maurício Ruffy', 'Quillan Salkilld', 'Mateusz Gamrot', 'Dan Hooker', 'Renato Moicano', 'Rafael Fiziev', 'Tom Nolan', 'Beneil Dariush', 'Manuel Torres'] },
  welter: { champ: 'Islam Makhachev', list: ['Ian Machado Garry', 'Carlos Prates', 'Michael Morales', 'Jack Della Maddalena', 'Gabriel Bonfim', 'Sean Brady', 'Belal Muhammad', 'Leon Edwards', 'Kamaru Usman', 'Joaquin Buckley', 'Yaroslav Amosov', 'Uroš Medić', 'Mike Malott', 'Daniel Rodriguez', 'Neil Magny'] },
  middle: { champ: 'Sean Strickland', list: ['Khamzat Chimaev', 'Dricus du Plessis', 'Nassourdine Imavov', 'Brendan Allen', 'Caio Borralho', 'Joe Pyfer', 'Gregory Rodrigues', 'Anthony Hernandez', 'Israel Adesanya', 'Christian Leroy Duncan', 'Jared Cannonier', 'Ikram Aliskerov', 'Bo Nickal', 'Abusupiyan Magomedov', 'Michael Page'] },
  lightheavy: { champ: 'Carlos Ulberg', list: ['Magomed Ankalaev', 'Jiří Procházka', 'Alex Pereira', 'Khalil Rountree Jr.', 'Navajo Stirling', 'Paulo Costa', 'Jamahal Hill', 'Azamat Murzakanov', 'Jan Błachowicz', 'Dominick Reyes', 'Bogdan Guskov', 'Robert Whittaker', 'Johnny Walker', 'Alonzo Menifield', 'Nikita Krylov'] },
  heavy: { champ: 'Ciryl Gane', list: ['Alexander Volkov', 'Sergei Pavlovich', 'Josh Hokit', 'Waldo Cortes-Acosta', 'Curtis Blaydes', 'Rizvan Kuniev', 'Vitor Petrino', 'Serghei Spivac', 'Ante Delija', 'Valter Walker', 'Derrick Lewis', 'Aleksandar Rakić', 'Tyrell Fortune', 'Marcin Tybura'], note: 'Gane venceu o cinturão interino (jun/2026) e é tratado como campeão desde que Aspinall vagou o título (14/09). O UFC 334 anuncia Gane × Hokit pelo cinturão.' },
  wstraw: { champ: 'Mackenzie Dern', list: ['Zhang Weili', 'Virna Jandiroba', 'Tatiana Suarez', 'Denise Gomes', 'Gillian Robertson', 'Fatima Kline', 'Alexia Thainara', 'Piera Rodriguez', 'Yan Xiaonan', 'Mizuki Inoue', 'Loopy Godinez', 'Tabatha Ricci', 'Jaqueline Amorim', 'Talita Alencar', 'Amanda Lemos'] },
  wfly: { champ: 'Natália Silva', list: ['Manon Fiorot', 'Alexa Grasso', 'Erin Blanchfield', 'Rose Namajunas', 'Maycee Barber', 'Jasmine Jasudavicius', 'Wang Cong', 'Tracy Cortez', 'Miranda Maverick', 'Karine Silva', "Casey O'Neill", 'Eduarda Moura', 'Gabriella Fernandes', 'JJ Aldrich'], note: 'Shevchenko vagou o cinturão por lesão; Natália Silva venceu Wang Cong pelo título vago no UFC 332 (03/10). Lista reordenada a partir do release de 25/08.' },
  wbantam: { champ: 'Kayla Harrison', list: ['Julianna Peña', 'Raquel Pennington', 'Joselyne Edwards', 'Norma Dumont', 'Ailín Pérez', 'Yana Santos', 'Luana Santos', 'Macy Chiasson', 'Jacqueline Cavalcanti', 'Karol Rosa', 'Beatriz Mesquita', 'Michelle Montague', 'Nora Cornolle', 'Miesha Tate', 'Melissa Croden'] }
};
const P4P = {
  men: ['Islam Makhachev', 'Alexander Volkanovski', 'Petr Yan', 'Justin Gaethje', 'Ilia Topuria', 'Tom Aspinall', 'Sean Strickland', 'Merab Dvalishvili', 'Alex Pereira', 'Ciryl Gane', 'Joshua Van', 'Khamzat Chimaev', 'Alexandre Pantoja', 'Arman Tsarukyan', 'Charles Oliveira'],
  women: ['Valentina Shevchenko', 'Kayla Harrison', 'Zhang Weili', 'Natália Silva', 'Mackenzie Dern', 'Manon Fiorot', 'Alexa Grasso', 'Erin Blanchfield', 'Julianna Peña', 'Tatiana Suarez', 'Virna Jandiroba', 'Raquel Pennington', 'Yan Xiaonan', 'Rose Namajunas', 'Maycee Barber']
};

/* Bout: [vencedor (canto vermelho), perdedor, divisão, método, detalhe, round, tempo, rounds agendados, opções]
   opções: t = disputa de título · nc = sem resultado · est = round/tempo não confirmados (estimados)
           cards = placares oficiais · label = rótulo do confronto */
const EVENTS = [
  ['UFC 332', '2026-10-03', 'Delta Center', 'Salt Lake City, EUA', [
    ['Natália Silva', 'Wang Cong', 'wfly', 'Decisão', 'Unânime', 5, '5:00', 5, { t: 1, cards: '48-47, 48-47, 49-46', label: 'Cinturão vago' }],
    ['Payton Talbott', 'Deiveson Figueiredo', 'bantam', 'KO/TKO', 'Golpes', 1, '2:09', 3],
    ['Esteban Ribovics', 'King Green', 'light', 'KO/TKO', 'Golpes', 1, '4:08', 3],
    ['Roman Kopylov', 'Ateba Gautier', 'middle', 'KO/TKO', 'Golpes', 1, '3:12', 3]]],
  ['UFC 331', '2026-09-19', 'Crypto.com Arena', 'Los Angeles, EUA', [
    ['Joshua Van', 'Alexandre Pantoja', 'fly', 'Decisão', 'Unânime', 5, '5:00', 5, { t: 1, cards: '49-46, 49-47, 50-45' }],
    ['Arman Tsarukyan', 'Maurício Ruffy', 'light', 'KO/TKO', 'Nocaute', 1, '4:56', 3],
    ['Patrício Pitbull', 'Doo Ho Choi', 'feather', 'KO/TKO', 'Nocaute', 1, '3:28', 3],
    ['Marlon Vera', 'Charles Jourdain', 'bantam', 'KO/TKO', 'Golpes', 3, '2:02', 3]]],
  ['UFC 330', '2026-08-15', 'Xfinity Mobile Arena', 'Filadélfia, EUA', [
    ['Islam Makhachev', 'Ian Machado Garry', 'welter', 'Decisão', 'Unânime', 5, '5:00', 5, { t: 1, cards: '49-46, 49-46, 48-47' }],
    ['Mackenzie Dern', 'Gillian Robertson', 'wstraw', 'Decisão', 'Unânime', 5, '5:00', 5, { t: 1, cards: '49-46, 49-46, 48-47' }],
    ['Jalin Turner', 'Kauê Fernandes', 'light', 'KO/TKO', 'Golpes', 1, '0:39', 3],
    ['Esteban Ribovics', 'Edson Barboza', 'light', 'KO/TKO', 'Golpes', 2, '1:32', 3]]],
  ['UFC Fight Night: Ankalaev vs. Guskov', '2026-07-25', 'Etihad Arena', 'Abu Dhabi, EAU', [
    ['Magomed Ankalaev', 'Bogdan Guskov', 'lightheavy', 'KO/TKO', 'Ground and pound', 5, '2:41', 5]]],
  ['UFC Fight Night: du Plessis vs. Usman', '2026-07-18', 'Paycom Center', 'Oklahoma City, EUA', [
    ['Dricus du Plessis', 'Kamaru Usman', 'middle', 'Decisão', 'Unânime', 5, '5:00', 5]]],
  ['UFC 329', '2026-07-11', 'T-Mobile Arena', 'Las Vegas, EUA', [
    ['Max Holloway', 'Conor McGregor', 'welter', 'KO/TKO', 'Lesão no joelho', 1, '1:09', 5],
    ['Paddy Pimblett', 'Benoît Saint Denis', 'light', 'Finalização', "D'Arce", 1, '0:52', 3],
    ['Mario Bautista', 'Cory Sandhagen', 'bantam', 'Decisão', 'Unânime', 3, '5:00', 3, { cards: '29-28, 29-28, 29-28' }],
    ['Brandon Royval', "Lone'er Kavanagh", 'fly', 'Finalização', 'Mata-leão', 3, '3:39', 3]]],
  ['UFC Freedom 250', '2026-06-14', 'Casa Branca (South Lawn)', 'Washington, EUA', [
    ['Justin Gaethje', 'Ilia Topuria', 'light', 'KO/TKO', 'Interrupção do córner', 4, '5:00', 5, { t: 1, label: 'Unificação' }],
    ['Ciryl Gane', 'Alex Pereira', 'heavy', 'KO/TKO', 'Golpes', 2, '1:27', 5, { t: 1, label: 'Interino vago' }],
    ["Sean O'Malley", 'Aiemann Zahabi', 'bantam', 'KO/TKO', 'Golpes', 2, '4:02', 3],
    ['Josh Hokit', 'Derrick Lewis', 'heavy', 'KO/TKO', 'Golpes', 2, '4:09', 3],
    ['Maurício Ruffy', 'Michael Chandler', 'light', 'KO/TKO', 'Golpes', 1, '4:29', 3],
    ['Bo Nickal', 'Kyle Daukaus', 'middle', 'KO/TKO', 'Golpes', 1, '4:34', 3],
    ['Diego Lopes', 'Steve Garcia', 'feather', 'KO/TKO', 'Nocaute', 2, '2:42', 3]]],
  ['UFC Fight Night: Muhammad vs. Bonfim', '2026-06-06', 'Meta Apex', 'Las Vegas, EUA', [
    ['Gabriel Bonfim', 'Belal Muhammad', 'welter', 'Decisão', 'Unânime', 5, '5:00', 5, { est: 1 }]]],
  ['UFC 328', '2026-05-09', 'Prudential Center', 'Newark, EUA', [
    ['Sean Strickland', 'Khamzat Chimaev', 'middle', 'Decisão', 'Dividida', 5, '5:00', 5, { t: 1, cards: '48-47, 47-48, 48-47' }],
    ['Joshua Van', 'Tatsuro Taira', 'fly', 'KO/TKO', 'Socos', 5, '2:30', 5, { t: 1, est: 1 }],
    ['Alexander Volkov', 'Waldo Cortes-Acosta', 'heavy', 'Decisão', 'Unânime', 3, '5:00', 3, { cards: '30-27, 29-28, 29-28' }],
    ['Sean Brady', 'Joaquin Buckley', 'welter', 'Decisão', 'Unânime', 3, '5:00', 3, { cards: '30-25, 30-25, 30-27' }]]],
  ['UFC Fight Night: Della Maddalena vs. Prates', '2026-05-02', 'RAC Arena', 'Perth, AUS', [
    ['Carlos Prates', 'Jack Della Maddalena', 'welter', 'KO/TKO', 'Golpes', 2, '3:00', 5, { est: 1 }]]],
  ['UFC 327', '2026-04-11', 'Kaseya Center', 'Miami, EUA', [
    ['Carlos Ulberg', 'Jiří Procházka', 'lightheavy', 'KO/TKO', 'Nocaute', 1, '3:45', 5, { t: 1, label: 'Cinturão vago' }],
    ['Josh Hokit', 'Curtis Blaydes', 'heavy', 'Decisão', 'Unânime', 3, '5:00', 3, { cards: '29-28, 29-28, 29-28' }],
    ['Paulo Costa', 'Azamat Murzakanov', 'lightheavy', 'KO/TKO', 'Nocaute', 3, '2:00', 3, { est: 1 }],
    ['Dominick Reyes', 'Johnny Walker', 'lightheavy', 'Decisão', 'Dividida', 3, '5:00', 3],
    ['Tatiana Suarez', 'Loopy Godinez', 'wstraw', 'Finalização', 'Finalização', 2, '2:30', 3, { est: 1 }]]],
  ['UFC Fight Night: Adesanya vs. Pyfer', '2026-03-28', 'Climate Pledge Arena', 'Seattle, EUA', [
    ['Joe Pyfer', 'Israel Adesanya', 'middle', 'KO/TKO', 'Golpes', 2, '4:18', 5],
    ['Alexa Grasso', 'Maycee Barber', 'wfly', 'KO/TKO', 'Nocaute', 1, '2:42', 3]]],
  ['UFC Fight Night: Evloev vs. Murphy', '2026-03-21', 'O2 Arena', 'Londres, ING', [
    ['Movsar Evloev', 'Lerone Murphy', 'feather', 'Decisão', 'Unânime', 5, '5:00', 5, { est: 1 }]]],
  ['UFC 326', '2026-03-07', 'T-Mobile Arena', 'Las Vegas, EUA', [
    ['Charles Oliveira', 'Max Holloway', 'light', 'Decisão', 'Unânime', 5, '5:00', 5, { cards: '50-45, 50-45, 50-45', label: 'Cinturão BMF' }]]],
  ['UFC Fight Night: Strickland vs. Hernandez', '2026-02-21', 'Toyota Center', 'Houston, EUA', [
    ['Sean Strickland', 'Anthony Hernandez', 'middle', 'KO/TKO', 'Golpes', 3, '3:00', 5, { est: 1 }]]],
  ['UFC 325', '2026-01-31', 'Qudos Bank Arena', 'Sydney, AUS', [
    ['Alexander Volkanovski', 'Diego Lopes', 'feather', 'Decisão', 'Unânime', 5, '5:00', 5, { t: 1 }],
    ['Benoît Saint Denis', 'Dan Hooker', 'light', 'KO/TKO', 'Golpes', 2, '4:45', 3],
    ['Maurício Ruffy', 'Rafael Fiziev', 'light', 'KO/TKO', 'Golpes', 2, '4:30', 3],
    ['Quillan Salkilld', 'Jamie Mullarkey', 'light', 'Finalização', 'Mata-leão', 1, '3:02', 3]]],
  ['UFC 324', '2026-01-24', 'T-Mobile Arena', 'Las Vegas, EUA', [
    ['Justin Gaethje', 'Paddy Pimblett', 'light', 'Decisão', 'Unânime', 5, '5:00', 5, { t: 1, cards: '48-47, 49-46, 49-46', label: 'Cinturão interino' }],
    ["Sean O'Malley", 'Song Yadong', 'bantam', 'Decisão', 'Unânime', 3, '5:00', 3, { cards: '29-28, 29-28, 29-28' }],
    ['Waldo Cortes-Acosta', 'Derrick Lewis', 'heavy', 'KO/TKO', 'Socos', 2, '2:30', 3, { est: 1 }],
    ['Natália Silva', 'Rose Namajunas', 'wfly', 'Decisão', 'Unânime', 3, '5:00', 3, { cards: '29-28, 29-28, 29-28' }],
    ['Jean Silva', 'Arnold Allen', 'feather', 'Decisão', 'Unânime', 3, '5:00', 3, { cards: '30-27, 29-28, 29-28' }],
    ['Umar Nurmagomedov', 'Deiveson Figueiredo', 'bantam', 'Decisão', 'Unânime', 3, '5:00', 3, { cards: '30-27, 30-27, 30-27' }]]],
  ['UFC 323', '2025-12-06', 'T-Mobile Arena', 'Las Vegas, EUA', [
    ['Petr Yan', 'Merab Dvalishvili', 'bantam', 'Decisão', 'Unânime', 5, '5:00', 5, { t: 1, cards: '49-46, 48-47, 48-47' }],
    ['Joshua Van', 'Alexandre Pantoja', 'fly', 'KO/TKO', 'Lesão no braço', 1, '0:26', 5, { t: 1, est: 1 }],
    ['Tatsuro Taira', 'Brandon Moreno', 'fly', 'KO/TKO', 'Socos', 2, '2:30', 3, { est: 1 }],
    ['Payton Talbott', 'Henry Cejudo', 'bantam', 'Decisão', 'Unânime', 3, '5:00', 3, { cards: '30-27, 30-27, 30-27' }]]],
  ['UFC 322', '2025-11-15', 'Madison Square Garden', 'Nova York, EUA', [
    ['Islam Makhachev', 'Jack Della Maddalena', 'welter', 'Decisão', 'Unânime', 5, '5:00', 5, { t: 1, cards: '50-45, 50-45, 50-45' }],
    ['Valentina Shevchenko', 'Zhang Weili', 'wfly', 'Decisão', 'Unânime', 5, '5:00', 5, { t: 1, cards: '50-45, 50-45, 50-45' }],
    ['Michael Morales', 'Sean Brady', 'welter', 'KO/TKO', 'Nocaute', 1, '3:27', 3, { est: 1 }],
    ['Carlos Prates', 'Leon Edwards', 'welter', 'KO/TKO', 'Nocaute', 2, '1:28', 3],
    ['Benoît Saint Denis', 'Beneil Dariush', 'light', 'KO/TKO', 'Nocaute', 1, '0:16', 3],
    ['Erin Blanchfield', 'Tracy Cortez', 'wfly', 'Finalização', 'Mata-leão', 2, '4:44', 3]]],
  ['UFC 321', '2025-10-25', 'Etihad Arena', 'Abu Dhabi, EAU', [
    ['Tom Aspinall', 'Ciryl Gane', 'heavy', 'Sem resultado', 'Dedo no olho', 1, '4:35', 5, { t: 1, nc: 1 }],
    ['Mackenzie Dern', 'Virna Jandiroba', 'wstraw', 'Finalização', 'Chave de braço', 1, '3:44', 5, { t: 1, est: 1, label: 'Cinturão vago' }]]],
  ['UFC 320', '2025-10-04', 'T-Mobile Arena', 'Las Vegas, EUA', [
    ['Alex Pereira', 'Magomed Ankalaev', 'lightheavy', 'KO/TKO', 'Socos e cotoveladas', 1, '1:20', 5, { t: 1 }],
    ['Merab Dvalishvili', 'Cory Sandhagen', 'bantam', 'Decisão', 'Unânime', 5, '5:00', 5, { t: 1 }]]],
  ['UFC 319', '2025-08-16', 'United Center', 'Chicago, EUA', [
    ['Khamzat Chimaev', 'Dricus du Plessis', 'middle', 'Decisão', 'Unânime', 5, '5:00', 5, { t: 1 }]]],
  ['UFC 318', '2025-07-19', 'Smoothie King Center', 'Nova Orleans, EUA', [
    ['Max Holloway', 'Dustin Poirier', 'light', 'Decisão', 'Unânime', 5, '5:00', 5, { label: 'Cinturão BMF' }]]],
  ['UFC 317', '2025-06-28', 'T-Mobile Arena', 'Las Vegas, EUA', [
    ['Ilia Topuria', 'Charles Oliveira', 'light', 'KO/TKO', 'Soco', 1, '2:27', 5, { t: 1, label: 'Cinturão vago' }],
    ['Alexandre Pantoja', 'Kai Kara-France', 'fly', 'Finalização', 'Mata-leão', 3, '1:55', 5, { t: 1 }],
    ['Joshua Van', 'Brandon Royval', 'fly', 'Decisão', 'Unânime', 3, '5:00', 3, { label: 'Luta do ano' }]]],
  ['UFC 316', '2025-06-07', 'Prudential Center', 'Newark, EUA', [
    ['Merab Dvalishvili', "Sean O'Malley", 'bantam', 'Finalização', 'Estrangulamento norte-sul', 3, '1:54', 5, { t: 1, est: 1 }],
    ['Kayla Harrison', 'Julianna Peña', 'wbantam', 'Finalização', 'Kimura', 2, '4:55', 5, { t: 1, est: 1 }]]],
  ['UFC 315', '2025-05-10', 'Bell Centre', 'Montreal, CAN', [
    ['Jack Della Maddalena', 'Belal Muhammad', 'welter', 'Decisão', 'Unânime', 5, '5:00', 5, { t: 1 }],
    ['Valentina Shevchenko', 'Manon Fiorot', 'wfly', 'Decisão', 'Unânime', 5, '5:00', 5, { t: 1 }]]],
  ['UFC 314', '2025-04-12', 'Kaseya Center', 'Miami, EUA', [
    ['Alexander Volkanovski', 'Diego Lopes', 'feather', 'Decisão', 'Unânime', 5, '5:00', 5, { t: 1, label: 'Cinturão vago' }]]],
  ['UFC 313', '2025-03-08', 'T-Mobile Arena', 'Las Vegas, EUA', [
    ['Magomed Ankalaev', 'Alex Pereira', 'lightheavy', 'Decisão', 'Unânime', 5, '5:00', 5, { t: 1 }]]],
  ['UFC 312', '2025-02-09', 'Qudos Bank Arena', 'Sydney, AUS', [
    ['Dricus du Plessis', 'Sean Strickland', 'middle', 'Decisão', 'Unânime', 5, '5:00', 5, { t: 1 }],
    ['Zhang Weili', 'Tatiana Suarez', 'wstraw', 'Decisão', 'Unânime', 5, '5:00', 5, { t: 1 }]]],
  ['UFC 311', '2025-01-18', 'Intuit Dome', 'Inglewood, EUA', [
    ['Islam Makhachev', 'Renato Moicano', 'light', 'Finalização', "D'Arce", 1, '4:05', 5, { t: 1 }],
    ['Merab Dvalishvili', 'Umar Nurmagomedov', 'bantam', 'Decisão', 'Unânime', 5, '5:00', 5, { t: 1 }]]],
  ['UFC 310', '2024-12-07', 'T-Mobile Arena', 'Las Vegas, EUA', [
    ['Alexandre Pantoja', 'Kai Asakura', 'fly', 'Finalização', 'Mata-leão', 2, '2:05', 5, { t: 1 }]]],
  ['UFC 308', '2024-10-26', 'Etihad Arena', 'Abu Dhabi, EAU', [
    ['Ilia Topuria', 'Max Holloway', 'feather', 'KO/TKO', 'Soco', 3, '1:34', 5, { t: 1 }],
    ['Khamzat Chimaev', 'Robert Whittaker', 'middle', 'Finalização', 'Face crank', 1, '3:34', 3]]],
  ['UFC 307', '2024-10-05', 'Delta Center', 'Salt Lake City, EUA', [
    ['Alex Pereira', 'Khalil Rountree Jr.', 'lightheavy', 'KO/TKO', 'Socos', 4, '4:32', 5, { t: 1 }],
    ['Kayla Harrison', 'Ketlen Vieira', 'wbantam', 'Decisão', 'Unânime', 3, '5:00', 3]]],
  ['UFC 306', '2024-09-14', 'Sphere', 'Las Vegas, EUA', [
    ['Merab Dvalishvili', "Sean O'Malley", 'bantam', 'Decisão', 'Unânime', 5, '5:00', 5, { t: 1 }],
    ['Valentina Shevchenko', 'Alexa Grasso', 'wfly', 'Decisão', 'Unânime', 5, '5:00', 5, { t: 1 }]]],
  ['UFC 305', '2024-08-18', 'RAC Arena', 'Perth, AUS', [
    ['Dricus du Plessis', 'Israel Adesanya', 'middle', 'Finalização', 'Mata-leão', 4, '3:38', 5, { t: 1 }]]],
  ['UFC 302', '2024-06-01', 'Prudential Center', 'Newark, EUA', [
    ['Islam Makhachev', 'Dustin Poirier', 'light', 'Finalização', "D'Arce", 5, '2:42', 5, { t: 1 }]]],
  ['UFC 300', '2024-04-13', 'T-Mobile Arena', 'Las Vegas, EUA', [
    ['Alex Pereira', 'Jamahal Hill', 'lightheavy', 'KO/TKO', 'Socos', 1, '3:14', 5, { t: 1 }],
    ['Zhang Weili', 'Yan Xiaonan', 'wstraw', 'Decisão', 'Unânime', 5, '5:00', 5, { t: 1 }],
    ['Max Holloway', 'Justin Gaethje', 'light', 'KO/TKO', 'Soco', 5, '4:59', 5, { label: 'Cinturão BMF' }],
    ['Arman Tsarukyan', 'Charles Oliveira', 'light', 'Decisão', 'Dividida', 3, '5:00', 3],
    ['Kayla Harrison', 'Holly Holm', 'wbantam', 'Finalização', 'Mata-leão', 2, '1:47', 3]]],
  ['UFC 298', '2024-02-17', 'Honda Center', 'Anaheim, EUA', [
    ['Ilia Topuria', 'Alexander Volkanovski', 'feather', 'KO/TKO', 'Soco', 2, '3:32', 5, { t: 1 }],
    ['Merab Dvalishvili', 'Henry Cejudo', 'bantam', 'Decisão', 'Unânime', 3, '5:00', 3]]]
];

/* Agenda anunciada (sem horário oficial publicado: o painel mostra a data). */
const UPCOMING = [
  ['UFC Fight Night: Buckley vs. Malott', '2026-10-17', 'Rogers Place', 'Edmonton, CAN', [
    ['Joaquin Buckley', 'Mike Malott', 'welter', 5, 'Luta principal'],
    ['Melissa Croden', 'Chelsea Chandler', 'wbantam', 3, 'Co-principal'],
    ['Erin Blanchfield', 'Jasmine Jasudavicius', 'wfly', 3, ''],
    ['Marc-André Barriault', 'Kyle Daukaus', 'middle', 3, ''],
    ['Nate Landwehr', 'Mandel Nallo', 'feather', 3, ''],
    ['Tanner Boser', 'Jhonata Diniz', 'heavy', 3, '']]],
  ['UFC 333', '2026-10-24', 'Etihad Arena', 'Abu Dhabi, EAU', [
    ['Petr Yan', 'Merab Dvalishvili', 'bantam', 5, 'Cinturão · trilogia'],
    ['Alexander Volkanovski', 'Movsar Evloev', 'feather', 5, 'Cinturão'],
    ['Alexander Volkov', 'Rizvan Kuniev', 'heavy', 3, ''],
    ['Dominick Reyes', 'Azamat Murzakanov', 'lightheavy', 3, ''],
    ["Lone'er Kavanagh", 'Ramazan Temirov', 'fly', 3, ''],
    ['Abusupiyan Magomedov', 'Cam Rowston', 'middle', 3, ''],
    ['Aaron Pico', 'Losene Keita', 'feather', 3, ''],
    ['Grant Dawson', 'Nurullo Aliev', 'light', 3, '']]],
  ['UFC Fight Night: Bonfim vs. Brady', '2026-11-07', 'Meta Apex', 'Las Vegas, EUA', [
    ['Gabriel Bonfim', 'Sean Brady', 'welter', 5, 'Luta principal']]],
  ['UFC 334', '2026-11-14', 'Madison Square Garden', 'Nova York, EUA', [
    ['Ciryl Gane', 'Josh Hokit', 'heavy', 5, 'Cinturão'],
    ['Kayla Harrison', 'Amanda Nunes', 'wbantam', 5, 'Cinturão'],
    ['Caio Borralho', 'Yousri Belgaroui', 'middle', 3, ''],
    ['Uroš Medić', 'Kevin Holland', 'welter', 3, ''],
    ['Stephen Thompson', 'Charles Radtke', 'welter', 3, ''],
    ['Drew Dober', 'Chris Duncan', 'light', 3, ''],
    ['Jim Miller', 'Terrance McKinney', 'light', 3, ''],
    ['Beatriz Mesquita', 'Macy Chiasson', 'wbantam', 3, '']]],
  ['UFC 335', '2026-12-12', 'T-Mobile Arena', 'Las Vegas, EUA', [
    ['Charles Oliveira', 'Diego Lopes', 'light', 5, 'Cinturão BMF'],
    ['Alex Pereira', 'Sergei Pavlovich', 'heavy', 3, 'Co-principal'],
    ['Bo Nickal', 'Joe Pyfer', 'middle', 3, ''],
    ['Brandon Moreno', 'Charles Johnson', 'fly', 3, '']]]
];

/* Mudanças de título (para a linha do tempo do painel). */
const TITLE_CHANGES = [
  ['2025-03-08', 'lightheavy', 'Magomed Ankalaev', 'vence Pereira no UFC 313'],
  ['2025-04-12', 'feather', 'Alexander Volkanovski', 'recupera o cinturão vago no UFC 314'],
  ['2025-05-10', 'welter', 'Jack Della Maddalena', 'vence Belal Muhammad no UFC 315'],
  ['2025-06-07', 'wbantam', 'Kayla Harrison', 'finaliza Peña no UFC 316'],
  ['2025-06-28', 'light', 'Ilia Topuria', 'nocauteia Oliveira pelo cinturão vago'],
  ['2025-08-16', 'middle', 'Khamzat Chimaev', 'vence du Plessis no UFC 319'],
  ['2025-10-04', 'lightheavy', 'Alex Pereira', 'recupera o cinturão no UFC 320'],
  ['2025-10-25', 'wstraw', 'Mackenzie Dern', 'finaliza Jandiroba pelo título vago'],
  ['2025-11-15', 'welter', 'Islam Makhachev', 'campeão em segunda divisão no UFC 322'],
  ['2025-12-06', 'bantam', 'Petr Yan', 'vence Merab no UFC 323'],
  ['2025-12-06', 'fly', 'Joshua Van', 'campeão após lesão de Pantoja'],
  ['2026-01-24', 'light', 'Justin Gaethje', 'cinturão interino no UFC 324'],
  ['2026-04-11', 'lightheavy', 'Carlos Ulberg', 'nocauteia Procházka pelo título vago'],
  ['2026-05-09', 'middle', 'Sean Strickland', 'primeira derrota de Chimaev, UFC 328'],
  ['2026-06-14', 'light', 'Justin Gaethje', 'unifica o cinturão contra Topuria'],
  ['2026-06-14', 'heavy', 'Ciryl Gane', 'interino ao parar Pereira'],
  ['2026-09-14', 'heavy', 'Ciryl Gane', 'Aspinall vaga o cinturão por lesão no olho'],
  ['2026-10-03', 'wfly', 'Natália Silva', 'título vago no UFC 332']
];

const SOURCES = [
  ['UFC Rankings (Wikipedia, release de 25/08/2026)', 'https://en.wikipedia.org/wiki/UFC_rankings'],
  ['2026 in UFC (Wikipedia)', 'https://en.wikipedia.org/wiki/2026_in_UFC'],
  ['UFC 329 results (UFC.com)', 'https://www.ufc.com/news/ufc-329-mcgregor-vs-holloway-2-results'],
  ['UFC 330 results (UFC.com)', 'https://www.ufc.com/news/ufc-330-islam-makhachev-vs-ian-machado-garry-results'],
  ['UFC Freedom 250 full results (Cageside Press)', 'https://cagesidepress.com/2026/06/14/ufc-freedom-250-full-results/'],
  ['UFC 334 card (Cageside Press)', 'https://cagesidepress.com/2026/09/19/ciryl-gane-vs-josh-hokit-headlines-ufc-334-kayla-harrison-vs-amanda-nunes-co-main-at-msg/'],
  ['UFC 335 card (Cageside Press)', 'https://cagesidepress.com/2026/10/03/charles-oliveira-vs-diego-lopes-bmf-title-fight-tops-ufc-335/'],
  ['Aspinall vaga o título (Al Jazeera)', 'https://www.aljazeera.com/sports/2026/9/14/tom-aspinall-vacates-ufc-heavyweight-title-due-to-eye-injury']
];
