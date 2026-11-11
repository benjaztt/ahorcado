/* ============================================================
 *  LISTA DE PALABRAS  (editable a mano)
 * ============================================================
 *
 *  Formato: cada palabra es un objeto con dos campos:
 *
 *      { palabra: "guitarra", pista: "Instrumento de seis cuerdas" },
 *
 *  - "palabra": solo letras (se permiten tildes, ñ y espacios).
 *  - "pista":   opcional. Podés dejarla vacía: pista: ""
 *
 *  Para agregar una palabra, copiá una línea y cambiala.
 *  Para quitarla, borrá la línea entera (incluida la coma final).
 *
 *  IMPORTANTE: dejá la coma "," al final de cada línea menos
 *  de la última.
 *
 *  Si preferís no tocar código, abrí el juego, tocá el botón
 *  "⚙️ Palabras" y editá la lista desde ahí.
 * ============================================================ */

const PALABRAS_POR_DEFECTO = [
  { palabra: "javascript",   pista: "Lenguaje que hace interactivas las páginas web" },
  { palabra: "computadora",  pista: "Máquina que procesa información" },
  { palabra: "programacion", pista: "Arte de escribir instrucciones para una máquina" },
  { palabra: "murcielago",   pista: "Mamífero volador que sale de noche" },
  { palabra: "argentina",    pista: "País del mate y el dulce de leche" },
  { palabra: "oceano",       pista: "Gran masa de agua salada" },
  { palabra: "montaña",      pista: "Elevación natural del terreno" },
  { palabra: "mariposa",     pista: "Insecto que nace de una oruga" },
  { palabra: "guitarra",     pista: "Instrumento de seis cuerdas" },
  { palabra: "chocolate",    pista: "Dulce hecho de cacao" },
  { palabra: "universo",     pista: "Todo lo que existe: estrellas, planetas y galaxias" },
  { palabra: "biblioteca",   pista: "Lugar donde se guardan y prestan libros" },
  { palabra: "elefante",     pista: "El animal terrestre más grande" },
  { palabra: "pirata",       pista: "Marinero que buscaba tesoros" },
  { palabra: "volcan",       pista: "Montaña que hace erupción" },
  { palabra: "jirafa",       pista: "Animal con el cuello más largo" },
  { palabra: "refrigerador", pista: "Electrodoméstico que mantiene la comida fría" },
  { palabra: "abecedario",   pista: "Conjunto ordenado de letras" },
  { palabra: "medico",       pista: "Profesional que cura enfermos" },
  { palabra: "aventura",     pista: "Historia llena de desafíos y sorpresas" },
  { palabra: "astronauta",   pista: "Persona que viaja al espacio" },
  { palabra: "hipopotamo",   pista: "Gran mamífero africano que pasa mucho tiempo en el agua" },
  { palabra: "helicoptero",  pista: "Aeronave que puede despegar y aterrizar verticalmente" },
  { palabra: "karateca",     pista: "Practicante de un arte marcial japonés" },
  { palabra: "laberinto",    pista: "Camino complicado del que hay que encontrar la salida" },
  { palabra: "nebulosa",     pista: "Nube de gas y polvo en el espacio" },
  { palabra: "ornitorrinco", pista: "Mamífero ovíparo con pico de pato" },
  { palabra: "pinguino",     pista: "Ave no voladora que vive en climas fríos" },
  { palabra: "quimica",      pista: "Ciencia que estudia la materia y sus transformaciones" },
  { palabra: "robotica",     pista: "Rama de la tecnología que diseña y construye robots" },
  { palabra: "saxofon",      pista: "Instrumento de viento con forma curva" },
  { palabra: "telescopio",   pista: "Instrumento para observar objetos distantes" },
  { palabra: "veterinario",  pista: "Profesional que cuida la salud de los animales" },
  { palabra: "xerografia",   pista: "Proceso de impresión por medio de cargas eléctricas" },
  { palabra: "yacimiento",   pista: "Lugar donde se encuentran minerales o fósiles" },
  { palabra: "zancudo",      pista: "Insecto volador que puede transmitir enfermedades" },
  { palabra: "cangrejo",     pista: "Crustáceo con diez patas y pinzas" },
  { palabra: "delfin",       pista: "Mamífero marino muy inteligente" },
  { palabra: "flamenco",     pista: "Ave de largas patas con plumaje rosado" },
  { palabra: "gladiador",    pista: "Luchador de la antigua Roma" },
  { palabra: "hormiga",      pista: "Insecto social que vive en colonias" },
  { palabra: "iguana",       pista: "Reptil de piel escamosa que toma el sol" },
  { palabra: "jerarquia",    pista: "Orden de importancia o autoridad" },
  { palabra: "koala",        pista: "Marsupial australiano que se alimenta de eucalipto" },
];

/* Deja la lista disponible para el juego. No borres esta línea. */
window.PALABRAS_POR_DEFECTO = PALABRAS_POR_DEFECTO;
