"use strict";

/* ------------------------------------------------
 * Configuración
 * ------------------------------------------------ */
const MAX_FASES = 6;
const ABECEDARIO = "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ".split("");
const CLAVE_ALMACEN = "ahorcado.palabras.v1";
const CLAVE_HOJA = "ahorcado.hoja.url";
/* URL fija de Google Sheets (CSV publicado) */
const URL_HOJA_FIJA = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRdlG_AH0TRe9Qppp4f9C3UoVZ2XbZSdSTT5QQUv6FgzSAxlkisyC0pSpMKqr_bZO_tg4D6WKLOE8SJ/pub?gid=0&single=true&output=csv";

/* Lista por defecto: viene de palabras.js (editable a mano) */
const PALABRAS_DEFECTO =
  Array.isArray(window.PALABRAS_POR_DEFECTO) && window.PALABRAS_POR_DEFECTO.length
    ? window.PALABRAS_POR_DEFECTO
    : [{ palabra: "javascript", pista: "Lenguaje de programación" }];

/* ------------------------------------------------
 * Estado del juego
 * ------------------------------------------------ */
let listaPalabras = [];     // palabras que se usan actualmente
let palabraSecreta = "";     // en minúsculas, con tildes/ñ tal cual se escribió
let pistaActual = "";
let letrasAdivinadas = new Set();  // letras normalizadas acertadas
let letrasFalladas = new Set();    // letras normalizadas falladas
let fase = 0;
let terminado = false;
let revelarTodo = false;

/* ------------------------------------------------
 * Referencias al DOM
 * ------------------------------------------------ */
const elPalabra   = document.getElementById("palabra");
const elTeclado   = document.getElementById("teclado");
const elIntentos  = document.getElementById("intentos");
const elMensaje   = document.getElementById("mensaje");
const elPista     = document.getElementById("pista");
const btnNueva    = document.getElementById("btn-nueva");
const partesCuerpo = document.querySelectorAll(".parte, .cara");

const btnConfig   = document.getElementById("btn-config");
const panelConfig = document.getElementById("panel-config");
const textoPal    = document.getElementById("texto-palabras");
const avisoConfig = document.getElementById("aviso-config");
const btnRestaurar = document.getElementById("btn-restaurar");
const btnCerrar   = document.getElementById("btn-cerrar");
const inputSheet  = document.getElementById("input-sheet");
const btnCargarHoja = document.getElementById("btn-cargar-hoja");

/* ------------------------------------------------
 * Utilidades
 * ------------------------------------------------ */
function normalizar(texto) {
  // Pasa a minúsculas y quita tildes/diéresis, pero conserva la ñ.
  // La ñ se protege con un carácter temporal antes de quitar los acentos.
  return texto
    .toLowerCase()
    .replace(/\u00f1/g, "\u0001")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u0001/g, "\u00f1");
}

/** ¿La palabra secreta contiene esta letra (ignorando tildes)? */
function contiene(clave) {
  return [...palabraSecreta].some((c) => c !== " " && normalizar(c) === clave);
}

function estaResuelta() {
  return [...palabraSecreta].every(
    (c) => c === " " || letrasAdivinadas.has(normalizar(c))
  );
}

function juegoTerminado() {
  return fase >= MAX_FASES || estaResuelta();
}

/* ------------------------------------------------
 * Parseo / serialización de la lista de palabras
 * ------------------------------------------------ */
function parsearLinea(linea) {
  const s = linea.trim();
  if (!s || s.startsWith("#")) return null;

  let corte = s.indexOf("|");
  let largo = 1;
  if (corte === -1) {
    corte = s.indexOf(" - ");
    largo = 3;
  }

  const palabra = (corte === -1 ? s : s.slice(0, corte)).trim().toLowerCase();
  const pista = corte === -1 ? "" : s.slice(corte + largo).trim();

  if (!palabra) return { error: true };

  // Validación: solo letras (incluye tildes, ü, ñ) y espacios.
  if (!/^[a-záéíóúüñ ]+$/i.test(palabra)) {
    return { error: true, palabra };
  }

  return { palabra, pista };
}

function parsearTexto(texto) {
  const palabras = [];
  const invalidas = [];
  for (const linea of texto.split(/\r?\n/)) {
    const r = parsearLinea(linea);
    if (!r) continue;
    if (r.error) {
      invalidas.push(linea.trim());
      continue;
    }
    palabras.push({ palabra: r.palabra, pista: r.pista });
  }
  return { palabras, invalidas };
}

function serializar(lista) {
  return lista
    .map((p) => (p.pista ? `${p.palabra} - ${p.pista}` : p.palabra))
    .join("\n");
}

/* ------------------------------------------------
 * Google Sheets (CSV)
 * ------------------------------------------------ */
function parsearCSV(csv) {
  const filas = [];
  let fila = [];
  let campo = "";
  let dentroComillas = false;

  for (let i = 0; i < csv.length; i++) {
    const c = csv[i];
    if (c === '"') {
      if (dentroComillas && csv[i + 1] === '"') {
        campo += '"';
        i++;
      } else {
        dentroComillas = !dentroComillas;
      }
    } else if (c === ',' && !dentroComillas) {
      fila.push(campo.trim());
      campo = "";
    } else if ((c === '\n' || c === '\r') && !dentroComillas) {
      if (c === '\r' && csv[i + 1] === '\n') i++;
      fila.push(campo.trim());
      campo = "";
      if (fila.some((v) => v !== "")) filas.push(fila);
      fila = [];
    } else {
      campo += c;
    }
  }
  if (campo.length > 0 || fila.length > 0) {
    fila.push(campo.trim());
    if (fila.some((v) => v !== "")) filas.push(fila);
  }
  return filas;
}

function csvAFilas(csv) {
  const filas = parsearCSV(csv);
  if (filas.length === 0) return { palabras: [], invalidas: [] };
  const cabecera = filas[0].map((h) => h.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
  
  // Buscar columnas
  const idxPalabra = cabecera.findIndex((h) => h === "palabra" || h === "palabras" || h === "word" || h === "respuesta" || h === "respuesta" || h.includes("palab"));
  const idxPista = cabecera.findIndex((h) => h === "pista" || h === "pistas" || h === "clue" || h === "hint" || h === "descripcion" || h === "descripcion" || h.includes("pista") || h.includes("clue"));
  
  const palabras = [];
  const invalidas = [];
  
  for (let i = 1; i < filas.length; i++) {
    const f = filas[i];
    if (!f || f.length === 0) continue;
    let palabra = idxPalabra >= 0 ? f[idxPalabra] : f[0];
    let pista = idxPista >= 0 ? f[idxPista] : (f.length > 1 ? f[1] : "");
    
    if (!palabra) continue;
    palabra = palabra.trim().toLowerCase();
    pista = (pista || "").trim();
    
    if (!palabra) continue;
    if (!/^[a-záéíóúüñ ]+$/i.test(palabra)) {
      invalidas.push(palabra);
      continue;
    }
    palabras.push({ palabra, pista });
  }
  return { palabras, invalidas };
}

function construirUrlHoja(urlOrId) {
  const s = urlOrId.trim();
  if (!s) return "";
  // Si ya es una URL completa de publicación CSV
  if (s.includes("output=csv")) return s;
  if (s.includes("/pub?")) return s;
  // Si es un ID de Google Sheets
  if (/^[a-zA-Z0-9-_]{20,}$/.test(s) && !s.includes("/")) {
    return `https://docs.google.com/spreadsheets/d/e/${s}/pub?gid=0&single=true&output=csv`;
  }
  // Intentar extraer ID de URL
  const m = s.match(/\/spreadsheets\/d\/e\/([a-zA-Z0-9-_]+)/) || s.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (m && m[1]) {
    // Si es /d/e/ es publicado, si es /d/ es normal
    if (s.includes("/d/e/")) {
      return `https://docs.google.com/spreadsheets/d/e/${m[1]}/pub?gid=0&single=true&output=csv`;
    } else {
      // Para hojas no publicadas no funciona con CSV directo; intentamos publicar
      return `https://docs.google.com/spreadsheets/d/${m[1]}/export?format=csv`;
    }
  }
  return s;
}

async function cargarDesdeHoja(urlOrId) {
  const url = construirUrlHoja(urlOrId);
  if (!url) throw new Error("URL o ID inválido");
  try {
    const resp = await fetch(url, { cache: "no-store" });
    if (!resp.ok) throw new Error(`Error ${resp.status}`);
    const csv = await resp.text();
    const { palabras, invalidas } = csvAFilas(csv);
    if (!palabras.length) throw new Error("No se encontraron palabras válidas en la hoja");
    return { palabras, invalidas, url };
  } catch (e) {
    throw e;
  }
}

/* ------------------------------------------------
 * Persistencia
 * ------------------------------------------------ */
function cargarPalabras() {
  try {
    const guardado = localStorage.getItem(CLAVE_ALMACEN);
    if (guardado) {
      const { palabras } = parsearTexto(guardado);
      if (palabras.length) return palabras;
    }
  } catch (_) {
    /* localStorage no disponible */
  }
  return [];
}

function guardarPalabras(lista) {
  try {
    localStorage.setItem(CLAVE_ALMACEN, serializar(lista));
  } catch (_) {
    /* si no se puede guardar, la lista igual se usa en esta sesión */
  }
}

function borrarPalabrasGuardadas() {
  try {
    localStorage.removeItem(CLAVE_ALMACEN);
  } catch (_) {}
}

/* ------------------------------------------------
 * Render
 * ------------------------------------------------ */
function renderPalabra() {
  elPalabra.innerHTML = "";
  for (const letra of palabraSecreta) {
    const span = document.createElement("span");
    if (letra === " ") {
      span.className = "letra separador";
      elPalabra.appendChild(span);
      continue;
    }

    span.className = "letra";
    if (letrasAdivinadas.has(normalizar(letra))) {
      span.classList.add("revelada");
      span.textContent = letra;
    } else if (revelarTodo) {
      span.classList.add("perdida");
      span.textContent = letra;
    }
    elPalabra.appendChild(span);
  }
}

function renderTeclado() {
  elTeclado.innerHTML = "";
  for (const letra of ABECEDARIO) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tecla";
    btn.textContent = letra;
    btn.dataset.letra = letra;

    if (letrasAdivinadas.has(normalizar(letra))) {
      btn.disabled = true;
      btn.classList.add("usada-correcta");
    } else if (letrasFalladas.has(normalizar(letra))) {
      btn.disabled = true;
      btn.classList.add("usada-mala");
    }

    btn.addEventListener("click", () => intentar(letra));
    elTeclado.appendChild(btn);
  }
}

function renderAhorcado() {
  partesCuerpo.forEach((el) => {
    el.classList.toggle("visible", Number(el.dataset.fase) <= fase);
  });
}

function renderEstado() {
  elIntentos.textContent = String(MAX_FASES - fase);

  if (terminado) {
    const gano = fase < MAX_FASES;
    elMensaje.textContent = gano ? "🎉 ¡Ganaste!" : "☠️ Fin del juego";
    elMensaje.className = "mensaje " + (gano ? "ganado" : "perdido");
  } else {
    elMensaje.textContent = "";
    elMensaje.className = "mensaje";
  }
}

function renderTodo() {
  renderPalabra();
  renderTeclado();
  renderAhorcado();
  renderEstado();
}

/* ------------------------------------------------
 * Lógica del juego
 * ------------------------------------------------ */
function intentar(letra) {
  if (terminado) return;

  const clave = normalizar(letra);
  if (letrasAdivinadas.has(clave) || letrasFalladas.has(clave)) return;

  if (contiene(clave)) {
    letrasAdivinadas.add(clave);
  } else {
    letrasFalladas.add(clave);
    fase++;
  }

  terminado = juegoTerminado();
  if (terminado && fase >= MAX_FASES) revelarTodo = true;

  renderTodo();
}

function nuevaPartida() {
  if (!listaPalabras || !listaPalabras.length) {
    listaPalabras = [];
  }

  if (!listaPalabras.length) {
    // Sin palabras disponibles
    palabraSecreta = "ahorcado";
    pistaActual = "Cargá palabras desde la hoja de cálculo";
    letrasAdivinadas = new Set();
    letrasFalladas = new Set();
    fase = 0;
    terminado = false;
    revelarTodo = false;
    elPista.textContent = pistaActual ? "💡 Pista: " + pistaActual : "";
    elPalabra.innerHTML = "";
    // Mostrar guiones para una palabra de placeholder
    for (let i = 0; i < palabraSecreta.length; i++) {
      const span = document.createElement("span");
      span.className = "letra";
      elPalabra.appendChild(span);
    }
    renderTeclado();
    renderAhorcado();
    elIntentos.textContent = String(MAX_FASES - fase);
    elMensaje.textContent = "⚠️ Sin palabras. Abrí ⚙️ Palabras para cargar desde la hoja.";
    elMensaje.className = "mensaje perdido";
    return;
  }

  const elegida = listaPalabras[Math.floor(Math.random() * listaPalabras.length)];
  palabraSecreta = elegida.palabra.toLowerCase();
  pistaActual = elegida.pista || "";

  letrasAdivinadas = new Set();
  letrasFalladas = new Set();
  fase = 0;
  terminado = false;
  revelarTodo = false;

  elPista.textContent = pistaActual ? "💡 Pista: " + pistaActual : "";
  renderTodo();
}

/* ------------------------------------------------
 * Panel de configuración
 * ------------------------------------------------ */
function abrirPanel() {
  try { if (typeof textoPal !== 'undefined' && textoPal && typeof serializar === 'function') textoPal.value = serializar(listaPalabras || []); } catch(e){}
  if (typeof avisoConfig !== 'undefined' && avisoConfig) {
    avisoConfig.textContent = 'Tenés ' + (listaPalabras||[]).length + ' palabra(s) en juego.';
    avisoConfig.className = 'aviso';
  }
  try {
    const guardada = localStorage.getItem(CLAVE_HOJA);
    if (typeof inputSheet !== 'undefined' && inputSheet) inputSheet.value = guardada || URL_HOJA_FIJA || '';
  } catch(e){ if (typeof inputSheet !== 'undefined' && inputSheet) inputSheet.value = URL_HOJA_FIJA || ''; }
  if (typeof panelConfig !== 'undefined' && panelConfig) panelConfig.hidden = false;
}

function cerrarPanel() {
  panelConfig.hidden = true;
}

function guardarDesdePanel() {
  const { palabras, invalidas } = parsearTexto(textoPal.value);

  if (!palabras.length) {
    avisoConfig.textContent = "⚠️ Necesitás al menos una palabra válida.";
    avisoConfig.className = "aviso error";
    return;
  }

  listaPalabras = palabras;
  guardarPalabras(palabras);
  nuevaPartida();

  const extra = invalidas.length
    ? ` Se ignoraron ${invalidas.length} línea(s) con caracteres no válidos.`
    : "";
  avisoConfig.textContent = `✅ Guardadas ${palabras.length} palabra(s).${extra}`;
  avisoConfig.className = invalidas.length ? "aviso error" : "aviso ok";
}

function restaurarPorDefecto() {
  // Recargar exclusivamente desde la hoja de cálculo
  cargarDesdeHojaFija();
  if (inputSheet) inputSheet.value = URL_HOJA_FIJA;
  avisoConfig.textContent = "♻️ Recargando desde la hoja de cálculo...";
  avisoConfig.className = "aviso";
}

/* ------------------------------------------------
 * Teclado físico
 * ------------------------------------------------ */
document.addEventListener("keydown", (e) => {
  // No interferir mientras se escribe en el editor
  if (!panelConfig.hidden) return;
  if (e.target instanceof HTMLTextAreaElement) return;
  if (e.ctrlKey || e.metaKey || e.altKey) return;

  const letra = normalizar(e.key).toUpperCase();
  if (letra.length === 1 && ABECEDARIO.includes(letra)) {
    e.preventDefault();
    intentar(letra);
  }
});

/* ------------------------------------------------
 * Eventos
 * ------------------------------------------------ */
btnNueva.addEventListener("click", nuevaPartida);
btnConfig.addEventListener("click", () =>
  panelConfig.hidden ? abrirPanel() : cerrarPanel()
);
btnRestaurar.addEventListener("click", restaurarPorDefecto);
btnCerrar.addEventListener("click", cerrarPanel);

if (btnCargarHoja && inputSheet) {
  btnCargarHoja.addEventListener("click", async () => {
    const val = inputSheet.value;
    if (!val.trim()) {
      avisoConfig.textContent = "⚠️ Pegá la URL o ID de la hoja publicada como CSV.";
      avisoConfig.className = "aviso error";
      return;
    }
    avisoConfig.textContent = "⏳ Cargando desde Google Sheets...";
    avisoConfig.className = "aviso";
    btnCargarHoja.disabled = true;
    try {
      const { palabras, invalidas, url } = await cargarDesdeHoja(val);
      listaPalabras = palabras;
      guardarPalabras(palabras);
      try { localStorage.setItem(CLAVE_HOJA, url); } catch (_) {}
      textoPal.value = serializar(palabras);
      nuevaPartida();
      const extra = invalidas.length
        ? ` Se ignoraron ${invalidas.length} fila(s) con caracteres no válidos.`
        : "";
      avisoConfig.textContent = `✅ Cargadas ${palabras.length} palabra(s) desde Google Sheets.${extra}`;
      avisoConfig.className = invalidas.length ? "aviso error" : "aviso ok";
    } catch (e) {
      avisoConfig.textContent = `⚠️ ${e.message || "Error al cargar la hoja"}. Verificá que esté publicada como CSV.`;
      avisoConfig.className = "aviso error";
    } finally {
      btnCargarHoja.disabled = false;
    }
  });
}

/* ------------------------------------------------
 * Arranque
 * ------------------------------------------------ */
listaPalabras = cargarPalabras();
nuevaPartida();

// Cargar exclusivamente desde la hoja de cálculo
async function cargarDesdeHojaFija() {
  if (!URL_HOJA_FIJA) return;
  try {
    const { palabras, url } = await cargarDesdeHoja(URL_HOJA_FIJA);
    if (palabras && palabras.length) {
      listaPalabras = palabras;
      guardarPalabras(palabras);
      try {
        localStorage.setItem(CLAVE_HOJA, url || URL_HOJA_FIJA);
      } catch (_) {}
      nuevaPartida();
      if (avisoConfig && !panelConfig.hidden) {
        avisoConfig.textContent = `✅ Cargadas ${palabras.length} palabra(s) desde la hoja.`;
        avisoConfig.className = "aviso ok";
      }
      return;
    }
  } catch (e) {
    if (avisoConfig && !panelConfig.hidden) {
      avisoConfig.textContent = `⚠️ No se pudo cargar desde la hoja: ${e.message || ""}`;
      avisoConfig.className = "aviso error";
    }
  }
  // Si no hay palabras guardadas localmente ni se pudo cargar desde la hoja
  if (!listaPalabras || listaPalabras.length === 0) {
    if (avisoConfig) {
      avisoConfig.textContent = "⚠️ No hay palabras disponibles. Cargalas desde la hoja de cálculo.";
      avisoConfig.className = "aviso error";
    }
  }
}

// Siempre intentar cargar desde la hoja fija (prioritario)
cargarDesdeHojaFija();
