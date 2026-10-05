// ===== Referencias al DOM =====
const formulario = document.getElementById("formulario");
const selectIntentos = document.getElementById("intentos");
const selectLetras = document.getElementById("letras");
const botonJugar = document.getElementById("btn-jugar");
const mensaje = document.getElementById("mensaje");
const juego = document.getElementById("juego");
const tablero = document.getElementById("tablero");
const teclado = document.getElementById("teclado");
const historial = document.getElementById("historial");

// ===== Estado del juego =====
let palabra = "";   // palabra secreta
let intentos = 0;   // nº de filas del tablero
let letras = 0;     // nº de columnas del tablero

let filaActual = 0;        // en qué intento estamos (0 = primera fila)
let intentoActual = "";    // letras escritas en la fila actual
let intentosHechos = [];   // palabras ya enviadas (las usaremos en el paso 5)
let juegoActivo = false;   // false = no se aceptan teclas

// Para el teclado: un color "mejor" no se debe pisar con uno "peor"
const PRIORIDAD = { no: 1, existe: 2, ok: 3 };

// Datos del historial
const CLAVE_STORAGE = "partidasWordle"; // nombre con el que guardamos en localStorage
const MAX_PARTIDAS = 10;                // solo guardamos las 10 últimas
const PAUSA_FINAL = 1500;               // ms para ver la última fila antes de quitar el tablero

// Filas del teclado virtual (igual que en el enunciado)
// split("") convierte un texto en un array de letras: "AB" -> ["A", "B"]
const FILAS_TECLADO = [
  ["Á", "É", "Í", "Ó", "Ú"],
  "QWERTYUIOP".split(""),
  "ASDFGHJKLÑ".split(""),
  ["Enter", ..."ZXCVBNM".split(""), "DEL"],
];

// Pide una palabra aleatoria a la API (función flecha + async/await)
const pedirPalabra = async (longitud) => {
  const url = `https://words-api-sy2x.onrender.com/api/word?lang=es&length=${longitud}&number=1`;
  const respuesta = await fetch(url);
  const datos = await respuesta.json();

  console.log(datos); // MIRA AQUÍ cómo llega la respuesta de la API

  // Suponemos que llega una lista de palabras. Si no, ajusta esta línea
  return datos[0].toUpperCase();
};

// PASO 2: crea la cuadrícula (filas = intentos, columnas = letras)
const crearTablero = () => {
  tablero.innerHTML = ""; // vaciamos por si había una partida anterior
  tablero.style.setProperty("--columnas", letras); // el CSS usa este valor

  for (let i = 0; i < intentos; i++) {
    const fila = document.createElement("div");
    fila.classList.add("fila");

    for (let j = 0; j < letras; j++) {
      const casilla = document.createElement("div");
      casilla.classList.add("casilla");
      fila.appendChild(casilla);
    }
    tablero.appendChild(fila);
  }
};

// PASO 2: crea el teclado virtual con un botón por tecla
const crearTeclado = () => {
  teclado.innerHTML = "";

  FILAS_TECLADO.forEach((teclasFila) => {
    const fila = document.createElement("div");
    fila.classList.add("fila-teclado");

    teclasFila.forEach((tecla) => {
      const boton = document.createElement("button");
      boton.textContent = tecla;
      boton.dataset.tecla = tecla; // así lo encontraremos luego para pintarlo
      boton.classList.add("tecla");

      // "Enter" y "DEL" tienen más de 1 carácter: son teclas anchas
      if (tecla.length > 1) {
        boton.classList.add("tecla-ancha");
      }

      boton.addEventListener("click", () => {
        pulsarTecla(tecla);
        boton.blur(); // evita que el Enter real vuelva a "pulsar" este botón
      });
      fila.appendChild(boton);
    });

    teclado.appendChild(fila);
  });
};

// Muestra un texto debajo del título
const mostrarMensaje = (texto) => {
  mensaje.textContent = texto;
};

// Devuelve el div de una casilla concreta (fila y columna)
const obtenerCasilla = (fila, columna) => tablero.children[fila].children[columna];

// ===== PASO 3: escribir y borrar letras =====
const escribirLetra = (letra) => {
  if (intentoActual.length >= letras) return; // la fila ya está llena

  obtenerCasilla(filaActual, intentoActual.length).textContent = letra;
  intentoActual += letra;
};

const borrarLetra = () => {
  if (intentoActual.length === 0) return; // no hay nada que borrar

  intentoActual = intentoActual.slice(0, -1); // quitamos la última letra
  obtenerCasilla(filaActual, intentoActual.length).textContent = "";
};

// Punto de entrada único: lo usan el teclado virtual y el real
const pulsarTecla = (tecla) => {
  if (!juegoActivo) return;

  if (tecla === "Enter") {
    comprobarIntento();
  } else if (tecla === "DEL") {
    borrarLetra();
  } else {
    escribirLetra(tecla);
  }
};

// Teclado real: traducimos cada tecla a lo que entiende pulsarTecla
document.addEventListener("keydown", (evento) => {
  // Ignoramos atajos como Ctrl+R
  if (evento.ctrlKey || evento.metaKey || evento.altKey) return;

  const tecla = evento.key;

  if (tecla === "Enter") {
    pulsarTecla("Enter");
  } else if (tecla === "Backspace" || tecla === "Delete") {
    pulsarTecla("DEL"); // "del" y "supr" borran igual
  } else if (/^[a-zñáéíóú]$/i.test(tecla)) {
    pulsarTecla(tecla.toUpperCase()); // solo letras válidas
  }
});

// ===== PASO 4: comprobar el intento =====
// Devuelve un array con "ok", "existe" o "no" para cada letra
const evaluarIntento = (intento, secreta) => {
  const resultado = Array(letras).fill("no");
  const restantes = {}; // letras de la secreta que aún no se han "usado"

  // 1ª pasada: letras en su sitio (verde)
  for (let i = 0; i < letras; i++) {
    if (intento[i] === secreta[i]) {
      resultado[i] = "ok";
    } else {
      restantes[secreta[i]] = (restantes[secreta[i]] || 0) + 1;
    }
  }

  // 2ª pasada: letras que están pero en otro sitio (amarillo)
  for (let i = 0; i < letras; i++) {
    if (resultado[i] === "ok") continue; // esta ya está en verde

    const letra = intento[i];
    if (restantes[letra] > 0) {
      resultado[i] = "existe";
      restantes[letra]--; // la "gastamos" para no repetirla de más
    }
  }

  return resultado;
};

// Pinta una tecla del teclado virtual (sin rebajar un color mejor)
const pintarTecla = (letra, clase) => {
  const boton = teclado.querySelector(`[data-tecla="${letra}"]`);
  if (!boton) return; // por si la letra no está en el teclado

  const claseActual = ["ok", "existe", "no"].find((c) => boton.classList.contains(c));

  if (!claseActual || PRIORIDAD[clase] > PRIORIDAD[claseActual]) {
    boton.classList.remove("ok", "existe", "no");
    boton.classList.add(clase);
  }
};

// Pinta las casillas de la fila actual y las teclas usadas
const pintarFila = (resultado) => {
  resultado.forEach((clase, i) => {
    obtenerCasilla(filaActual, i).classList.add(clase);
    pintarTecla(intentoActual[i], clase);
  });
};

// Se ejecuta al pulsar Enter
const comprobarIntento = () => {
  if (intentoActual.length < letras) {
    mostrarMensaje("Faltan letras");
    return;
  }

  mostrarMensaje("");
  pintarFila(evaluarIntento(intentoActual, palabra));
  intentosHechos.push(intentoActual);

  if (intentoActual === palabra) {
    terminarJuego(true);
  } else if (filaActual === intentos - 1) {
    terminarJuego(false); // era el último intento
  } else {
    filaActual++; // pasamos a la siguiente fila
    intentoActual = "";
  }
};

// ===== PASO 5: fin de partida e historial =====
// Lee las partidas guardadas (si no hay ninguna, devuelve una lista vacía)
const leerPartidas = () => JSON.parse(localStorage.getItem(CLAVE_STORAGE)) || [];

// Añade la partida al principio de la lista y se queda solo con las 10 últimas
const guardarPartida = (haGanado) => {
  const partidas = leerPartidas();

  partidas.unshift({
    palabra: palabra,
    intentos: intentosHechos,
    fecha: new Date().toISOString(),
    ganada: haGanado,
  });

  localStorage.setItem(CLAVE_STORAGE, JSON.stringify(partidas.slice(0, MAX_PARTIDAS)));
};

// Vuelve a la pantalla del formulario para jugar otra vez
const volverAlFormulario = () => {
  historial.classList.add("oculto");
  mostrarMensaje("");
  formulario.classList.remove("oculto");
};

// Dibuja el historial con las últimas partidas y el botón de jugar de nuevo
const mostrarHistorial = () => {
  historial.innerHTML = "";

  const titulo = document.createElement("h2");
  titulo.textContent = "Últimas partidas";

  const lista = document.createElement("ul");
  leerPartidas().forEach((partida) => {
    const item = document.createElement("li");
    item.classList.add(partida.ganada ? "ganada" : "perdida");

    const fecha = new Date(partida.fecha).toLocaleString("es-ES");
    const resultado = partida.ganada ? "Ganada" : "Perdida";
    item.textContent = `${fecha} · ${partida.palabra} · ${partida.intentos.join(", ")} · ${resultado}`;
    lista.appendChild(item);
  });

  const botonReiniciar = document.createElement("button");
  botonReiniciar.id = "btn-reiniciar";
  botonReiniciar.textContent = "Jugar de nuevo";
  botonReiniciar.addEventListener("click", volverAlFormulario);

  historial.append(titulo, lista, botonReiniciar);
  historial.classList.remove("oculto");
};

// Se llama cuando se acierta la palabra o se acaban los intentos
const terminarJuego = (haGanado) => {
  juegoActivo = false; // ya no se aceptan teclas
  mostrarMensaje(haGanado ? "¡Has ganado!" : `Has perdido. La palabra era ${palabra}`);
  guardarPartida(haGanado);

  // Esperamos un poco para que se vean los colores de la última fila
  setTimeout(() => {
    juego.classList.add("oculto"); // quitamos tablero y teclado
    mostrarHistorial();
  }, PAUSA_FINAL);
};

// Oculta el formulario, enseña la zona de juego y la prepara
const empezarJuego = () => {
  // Reiniciamos el estado de la partida
  filaActual = 0;
  intentoActual = "";
  intentosHechos = [];
  juegoActivo = true;
  mostrarMensaje("");

  formulario.classList.add("oculto");
  juego.classList.remove("oculto");
  crearTablero();
  crearTeclado();
};

// Al pulsar "Jugar" leemos los valores y pedimos la palabra
formulario.addEventListener("submit", async (evento) => {
  evento.preventDefault(); // evita que la página se recargue

  intentos = Number(selectIntentos.value);
  letras = Number(selectLetras.value);

  // Mientras espera, bloqueamos el botón (la API puede tardar en despertar)
  botonJugar.disabled = true;
  botonJugar.textContent = "Cargando...";

  try {
    palabra = await pedirPalabra(letras);
    console.log("Palabra secreta:", palabra); // solo para pruebas
  } catch (error) {
    console.error(error);
    alert("No se pudo obtener la palabra. Inténtalo de nuevo.");
    return; // sin palabra no hay partida
  } finally {
    // Pase lo que pase, dejamos el botón como estaba
    botonJugar.disabled = false;
    botonJugar.textContent = "Jugar";
  }

  // Fuera del try: si algo falla aquí, el error real se verá en la consola
  empezarJuego();
});