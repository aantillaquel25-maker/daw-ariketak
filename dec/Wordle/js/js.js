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
let intentos = 0;   // para poner los intentos que va a tener la partida
let letras = 0;     // cuantas letras hayas elegido para la palabra

let filaActual = 0;        // la fila por la que empieza el juego a escibir 
let intentoActual = "";    // letras escritas en la fila que se ha empezado 
let intentosHechos = [];   // palabras intentadas 
let juegoActivo = false;   

// Para el teclado: darle prioridad al color del teclado para qe no se pierda el color de una letra que ya estaba en verde o amarillo o negro 
const PRIORIDAD = { no: 1, existe: 2, ok: 3 };

// Datos de los intentos 
const CLAVE_STORAGE = "partidasWordle"; // este es el nombre donde se van a guardar los intentos que se han hecho en localStorage
const MAX_PARTIDAS = 10;                // el programa solo guarda los 10 ultimos intentos que se han echio 
const PAUSA_FINAL = 1500;               // ms para ver la última fila antes de quitar el tablero

// Filas del teclado virtual
// split("") hace que el texto se convierta en un pto array 
const FILAS_TECLADO = [
  ["Á", "É", "Í", "Ó", "Ú"],
  "QWERTYUIOP".split(""),
  "ASDFGHJKLÑ".split(""),
  ["Enter", ..."ZXCVBNM".split(""), "DEL"],
];

// aqui se pide una palabra random a la api 
const pedirPalabra = async (longitud) => {
  const url = `https://words-api-sy2x.onrender.com/api/word?lang=es&length=${longitud}&number=1`;
  const respuesta = await fetch(url);
  const datos = await respuesta.json();

  console.log(datos); // aqui llega la palabra de la api a la consola y se puede ver desde el F12 

  return datos[0].toUpperCase();
};

// Cuadro del juego 
const crearTablero = () => {
  tablero.innerHTML = ""; // si hemos jugado antes de borra el tablero 
  tablero.style.setProperty("--columnas", letras); // css 

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

// TECLADO DEL JUGO 
const crearTeclado = () => {
  teclado.innerHTML = "";

  FILAS_TECLADO.forEach((teclasFila) => {
    const fila = document.createElement("div");
    fila.classList.add("fila-teclado");

    teclasFila.forEach((tecla) => {
      const boton = document.createElement("button");
      boton.textContent = tecla;
      boton.dataset.tecla = tecla; // luego esto se tiene que pintar de color como el teclado 
      boton.classList.add("tecla");

      // para qu el enter y el espacio se vean bien tienen que ser un caaracter grande por eso son diferentes al resto 
      if (tecla.length > 1) {
        boton.classList.add("tecla-ancha");
      }

      boton.addEventListener("click", () => {
        pulsarTecla(tecla);
        boton.blur(); // evita que el enter real vuelva a pulsa este botón
      });
      fila.appendChild(boton);
    });

    teclado.appendChild(fila);
  });
};

// enseñar el texcto debajo de la palabra que es 
const mostrarMensaje = (texto) => {
  mensaje.textContent = texto;
};

// devuelbe el div en la misma casilla 
const obtenerCasilla = (fila, columna) => tablero.children[fila].children[columna];




//para escribir las letras y quitarlas
const escribirLetra = (letra) => {
  if (intentoActual.length >= letras) return; // para ver si la fila ya esta lleba 

  obtenerCasilla(filaActual, intentoActual.length).textContent = letra;
  intentoActual += letra;
};

const borrarLetra = () => {
  if (intentoActual.length === 0) return; // mira si hay algo y si no lo hay no borra nada 

  intentoActual = intentoActual.slice(0, -1); // quita la ultima litra que este escrita 
  obtenerCasilla(filaActual, intentoActual.length).textContent = "";
};

// Punto para escrbir las letras y borrar las letras con el teclado virtual o el teclado real
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

// teclado real 
document.addEventListener("keydown", (evento) => {
  // Ignoramos atajos como Ctrl+R
  if (evento.ctrlKey || evento.metaKey || evento.altKey) return;

  const tecla = evento.key;

  if (tecla === "Enter") {
    pulsarTecla("Enter");
  } else if (tecla === "Backspace" || tecla === "Delete") {
    pulsarTecla("DEL"); // "del" y "supr" borran igual
  } else if (/^[a-zñáéíóú]$/i.test(tecla)) {
    pulsarTecla(tecla.toUpperCase()); // coge las letras y las pone mayusculas 
  }
});

// cuando devuelve un array lo que hace es mandar un array con los valores de cada letra de la palabra que se ha escrito y la palabra oculta y si es la que es o no
const evaluarIntento = (intento, secreta) => {
  const resultado = Array(letras).fill("no");
  const restantes = {}; // las letras de la palabra que es que todavia no se han puesto 

  // mira si en  el primer intento hay letras que coincidien y si es asi las pine en verde 
  for (let i = 0; i < letras; i++) {
    if (intento[i] === secreta[i]) {
      resultado[i] = "ok";
    } else {
      restantes[secreta[i]] = (restantes[secreta[i]] || 0) + 1;
    }
  }

  // mira si hay alguna letra que coincida si lo hay pero esta en otro sitio la pone en amarillo. 
  for (let i = 0; i < letras; i++) {
    if (resultado[i] === "ok") continue; // esta ya está en verde

    const letra = intento[i];
    if (restantes[letra] > 0) {
      resultado[i] = "existe";
      restantes[letra]--; 
    }
  }

  return resultado;
};

// cuando has adivinado una letra la pinta en el teclado del color que le hayas adivinado 
const pintarTecla = (letra, clase) => {
  const boton = teclado.querySelector(`[data-tecla="${letra}"]`);
  if (!boton) return; // si la tecla no la encuentra en el teclado hace el return y no hace nada 

  const claseActual = ["ok", "existe", "no"].find((c) => boton.classList.contains(c));

  if (!claseActual || PRIORIDAD[clase] > PRIORIDAD[claseActual]) {
    boton.classList.remove("ok", "existe", "no");
    boton.classList.add(clase);
  }
};

// pinta las letras deel intento segun lo hayas adivinado 
const pintarFila = (resultado) => {
  resultado.forEach((clase, i) => {
    obtenerCasilla(filaActual, i).classList.add(clase);
    pintarTecla(intentoActual[i], clase);
  });
};

// Se ejecuta al pulsar intro 
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
    terminarJuego(false); // es el ultimo intento si no lo addiinas vuelve a empezar 
  } else {
    filaActual++; // pasa al siguiente intento 
    intentoActual = "";
  }
};






//historial de los intentos 
// lee las partidas que has jugado para dar un historial de los intentos y si no hay ninguna devuelve una lista vacia 
const leerPartidas = () => JSON.parse(localStorage.getItem(CLAVE_STORAGE)) || [];

// pone la ultima partida que se ha jugado la primera y solo coje las ultimas 10 partidas que se han jugado 
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

// vuelve a la pantalla del formulario para jugar otra vez
const volverAlFormulario = () => {
  historial.classList.add("oculto");
  mostrarMensaje("");
  formulario.classList.remove("oculto");
};

// pone el historial con las últimas partidas y el botón de jugar de nuevo
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

// se llama cuando se acierta la palabra o se acaban los intentos
const terminarJuego = (haGanado) => {
  juegoActivo = false; // ya no se aceptan teclas
  mostrarMensaje(haGanado ? "¡Has ganado!" : `Has perdido. La palabra era ${palabra}`);
  guardarPartida(haGanado);

  // tiempo de espera para que se vea el color verde 
  setTimeout(() => {
    juego.classList.add("oculto"); // quita el tablero y teclado
    mostrarHistorial();
  }, PAUSA_FINAL);
};

// Oculta el formulario, enseña la zona de juego y la prepara
const empezarJuego = () => {
  // se reinicia l apartidf 
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

// cuando se da a jugar se coge la palabra de la api y se empieza el juego
formulario.addEventListener("submit", async (evento) => {
  evento.preventDefault(); // evita que la página se recargue

  intentos = Number(selectIntentos.value);
  letras = Number(selectLetras.value);

  // mientras se carga la palabra se desactiva el botón y se pone un texto de cargando
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
    //el boton se queda porsiaca 
    botonJugar.disabled = false;
    botonJugar.textContent = "Jugar";
  }

  // Fuera del try: si algo falla aquí, el error real se ve en la consola
  empezarJuego();
});