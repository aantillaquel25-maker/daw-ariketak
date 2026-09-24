console.log(verdadero);

let falso = false;
console.log(falso);

let nulo = null;
console.log(nulo);

let edad = 18;
console.log(edad);

let temperatura = 22.5;
console.log(temperatura);

let saldo = -150.75;
console.log(saldo);


// Infinity
console.log(42 / 0);
// -Infinity
console.log(-42 / 0);

let nombre = "Rubén";
let ciudad = 'Bilbao';
let saludo = `Hola`;
console.log("Hola "+nombre)
console.log("Hola %s",nombre)
console.log(`Hola ${nombre}`)

let variable;
// undefined
console.log(variable);

const sym1 = Symbol();
console.log(sym1);
console.log(sym1.description);

const sym2 = Symbol(42);
console.log(sym2);
console.log(sym2.description);


const sym3 = Symbol("hola");
console.log(sym3);
console.log(sym3.description);