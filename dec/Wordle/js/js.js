// ===== Referencias al DOM =====
const formulario = document.getElementById("formulario");
const selectIntentos = document.getElementById("intentos");
const selectLetras = document.getElementById("letras");
const botonJugar = document.getElementById("btn-jugar");
const juego = document.getElementById("juego");

// ===== Estado del juego =====
let palabra = "";   // palabra secreta
let intentos = 0;   // nº de filas del tablero
let letras = 0;     // nº de columnas del tablero

// Pide una palabra aleatoria a la API (función flecha + async/await)
const pedirPalabra = async (longitud) => {
  const url = `https://words-api-sy2x.onrender.com/api/word?lang=es&length=${longitud}&number=1`;
  const respuesta = await fetch(url);
  const datos = await respuesta.json();

  console.log(datos); // MIRA AQUÍ cómo llega la respuesta de la API

  // Suponemos que llega una lista de palabras. Si no, ajusta esta línea
  return datos[0].toUpperCase();
};

// Oculta el formulario y enseña la zona de juego
const empezarJuego = () => {
  formulario.classList.add("oculto");
  juego.classList.remove("oculto");
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
    empezarJuego();
  } catch (error) {
    console.error(error);
    alert("No se pudo obtener la palabra. Inténtalo de nuevo.");
  } finally {
    // Pase lo que pase, dejamos el botón como estaba
    botonJugar.disabled = false;
    botonJugar.textContent = "Jugar";
  }
});