const CLAVE_PEDIDO = "pedidoCaldero"

let cartaProductos = []
let pedido = []

function formatearPrecio(precio) {
  return "$" + Number(precio || 0).toLocaleString("es-AR")
}

function escaparTexto(texto) {
  const elemento = document.createElement("span")
  elemento.textContent = texto
  return elemento.innerHTML
}

function mostrarAviso(mensaje) {
  Toastify({
    text: mensaje,
    duration: 2500,
    close: true,
    gravity: "bottom",
    position: "right",
    style: {
      background: "#1a3a2a",
      color: "#faf6f0",
      fontFamily: '"Source Sans 3", sans-serif'
    }
  }).showToast()
}

function guardarPedido() {
  localStorage.setItem(CLAVE_PEDIDO, JSON.stringify(pedido))
}

function cargarPedido() {
  try {
    const pedidoGuardado = JSON.parse(localStorage.getItem(CLAVE_PEDIDO)) || []
    pedido = Array.isArray(pedidoGuardado)
      ? pedidoGuardado.filter((item) => item && item.id && item.cantidad > 0)
      : []
  } catch (error) {
    pedido = []
    localStorage.removeItem(CLAVE_PEDIDO)
    mostrarAviso(error.message || "No se pudo leer el pedido guardado")
  }
}

function sincronizarPedidoConCarta() {
  if (cartaProductos.length === 0) {
    return
  }

  pedido = pedido.filter((item) =>
    cartaProductos.some((producto) => producto.id === item.id)
  )

  if (pedido.length === 0) {
    localStorage.removeItem(CLAVE_PEDIDO)
    return
  }

  guardarPedido()
}

function calcularTotal() {
  return pedido.reduce((acumulado, item) => {
    const producto = cartaProductos.find((plato) => plato.id === item.id) || { precio: 0 }
    const { precio } = producto
    const { cantidad } = item
    return acumulado + precio * cantidad
  }, 0)
}

function modificarCantidad(idProducto, nuevaCantidad) {
  const item = pedido.find((linea) => linea.id === idProducto)
  if (!item || nuevaCantidad < 1) {
    return
  }

  item.cantidad = nuevaCantidad
  guardarPedido()
  renderizarPedido()
}

function borrarProducto(idProducto) {
  const producto = cartaProductos.find((plato) => plato.id === idProducto) || {
    nombre: "El producto"
  }
  const { nombre } = producto

  pedido = pedido.filter((item) => item.id !== idProducto)

  if (pedido.length === 0) {
    localStorage.removeItem(CLAVE_PEDIDO)
  } else {
    guardarPedido()
  }

  renderizarPedido()
  mostrarAviso(`${nombre} se quitó del pedido`)
}

function vaciarPedido() {
  pedido = []
  localStorage.clear()
  renderizarPedido()
}

function agregarAlPedido(idProducto) {
  const producto = cartaProductos.find((item) => item.id === idProducto)
  if (!producto) {
    return
  }

  const { id, nombre } = producto
  const itemExistente = pedido.find((item) => item.id === id)

  if (itemExistente) {
    modificarCantidad(id, itemExistente.cantidad + 1)
  } else {
    pedido.push({ id, cantidad: 1 })
    guardarPedido()
    renderizarPedido()
  }

  mostrarAviso(`${nombre} se sumó al pedido`)
}

function crearLineaPedido(item) {
  const producto = cartaProductos.find((plato) => plato.id === item.id) || {
    nombre: "Producto no disponible",
    precio: 0
  }
  const { nombre, precio } = producto
  const { id, cantidad } = item
  const subtotal = precio * cantidad
  const etiquetaCantidad = cantidad === 1 ? "unidad" : "unidades"
  const deshabilitarRestar = cantidad === 1 ? "disabled" : ""

  return `
    <li class="linea-pedido">
      <div class="linea-pedido__datos">
        <h3 class="linea-pedido__nombre">${escaparTexto(nombre)}</h3>
        <p class="linea-pedido__detalle">${cantidad} ${etiquetaCantidad} × ${formatearPrecio(precio)}</p>
      </div>
      <p class="linea-pedido__subtotal">${formatearPrecio(subtotal)}</p>
      <div class="linea-pedido__acciones">
        <button type="button" class="cantidad__boton" data-accion="restar" data-id="${id}" aria-label="Quitar una unidad de ${escaparTexto(nombre)}" ${deshabilitarRestar}>−</button>
        <span class="cantidad__valor">${cantidad}</span>
        <button type="button" class="cantidad__boton" data-accion="sumar" data-id="${id}" aria-label="Sumar una unidad de ${escaparTexto(nombre)}">+</button>
        <button type="button" class="linea-pedido__quitar" data-accion="borrar" data-id="${id}">Quitar</button>
      </div>
    </li>
  `
}

function renderizarPedido() {
  const lista = document.querySelector("#lista-pedido")
  const avisoVacio = document.querySelector("#pedido-vacio")
  const total = document.querySelector("#total-pedido")
  const contador = document.querySelector("#contador-pedido")
  const unidades = pedido.reduce((acumulado, item) => acumulado + item.cantidad, 0)
  const estaVacio = pedido.length === 0

  contador.textContent = String(unidades)
  total.textContent = formatearPrecio(calcularTotal())
  avisoVacio.hidden = !estaVacio
  lista.hidden = estaVacio

  if (estaVacio) {
    lista.innerHTML = ""
    return
  }

  lista.innerHTML = pedido.map((item) => crearLineaPedido(item)).join("")
}

function armarResumen(nombre, modalidad, total) {
  const fraseModalidad = modalidad === "Para llevar" ? "Para llevar" : "En el local"
  const lineas = pedido.map((item) => {
    const producto = cartaProductos.find((plato) => plato.id === item.id) || {
      nombre: "Producto",
      precio: 0
    }
    const { nombre: nombreProducto, precio } = producto
    const { cantidad } = item
    return `<li>${escaparTexto(nombreProducto)} × ${cantidad}: ${formatearPrecio(precio * cantidad)}</li>`
  }).join("")

  return `
    <p><strong>Nombre:</strong> ${escaparTexto(nombre)}</p>
    <p><strong>Modalidad:</strong> ${fraseModalidad}</p>
    <ul class="resumen-pedido">${lineas}</ul>
    <p><strong>Total:</strong> ${formatearPrecio(total)}</p>
  `
}

async function confirmarPedido() {
  const botonConfirmar = document.querySelector("#boton-confirmar")
  const nombreIngresado = document.querySelector("#nombre-pedido").value.trim()
  const modalidad = document.querySelector("#modalidad-pedido").value

  if (pedido.length === 0) {
    await Swal.fire({
      icon: "info",
      title: "El pedido está vacío",
      text: "Elegí algo de la carta antes de confirmar.",
      confirmButtonColor: "#1a3a2a"
    })
    return
  }

  if (!nombreIngresado) {
    await Swal.fire({
      icon: "warning",
      title: "Falta el nombre",
      text: "Escribí a nombre de quién queda el pedido.",
      confirmButtonColor: "#1a3a2a"
    })
    document.querySelector("#nombre-pedido").focus()
    return
  }

  const total = calcularTotal()
  const fraseModalidad = modalidad === "Para llevar" ? "para llevar" : "en el local"

  try {
    botonConfirmar.disabled = true
    const { isConfirmed } = await Swal.fire({
      title: "¿Confirmás el pedido?",
      html: armarResumen(nombreIngresado, modalidad, total),
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Confirmar pedido",
      cancelButtonText: "Seguir eligiendo",
      confirmButtonColor: "#1a3a2a",
      cancelButtonColor: "#6b5e52"
    })

    if (!isConfirmed) {
      return
    }

    await Swal.fire({
      icon: "success",
      title: "Pedido confirmado",
      text: `${nombreIngresado}, tu pedido ${fraseModalidad} quedó registrado por ${formatearPrecio(total)}.`,
      confirmButtonColor: "#1a3a2a"
    })

    vaciarPedido()
    document.querySelector("#formulario-pedido").reset()
  } catch (error) {
    await Swal.fire({
      icon: "error",
      title: "No se pudo confirmar",
      text: error.message || "Intentá de nuevo en unos segundos.",
      confirmButtonColor: "#1a3a2a"
    })
  } finally {
    botonConfirmar.disabled = false
  }
}

async function solicitarVaciarPedido() {
  if (pedido.length === 0) {
    mostrarAviso("El pedido ya está vacío")
    return
  }

  const { isConfirmed } = await Swal.fire({
    title: "¿Vaciar el pedido?",
    text: "Se van a borrar todos los productos guardados en este navegador.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Sí, vaciar",
    cancelButtonText: "Cancelar",
    confirmButtonColor: "#1a3a2a",
    cancelButtonColor: "#6b5e52"
  })

  if (!isConfirmed) {
    return
  }

  vaciarPedido()
  mostrarAviso("Se vació el pedido")
}

function manejarClickPedido(evento) {
  const boton = evento.target.closest("button")
  if (!boton) {
    return
  }

  const idProducto = Number(boton.dataset.id)
  const accion = boton.dataset.accion
  const item = pedido.find((linea) => linea.id === idProducto)
  if (!item) {
    return
  }

  if (accion === "sumar") {
    modificarCantidad(idProducto, item.cantidad + 1)
  }

  if (accion === "restar" && item.cantidad > 1) {
    modificarCantidad(idProducto, item.cantidad - 1)
  }

  if (accion === "borrar") {
    borrarProducto(idProducto)
  }
}

function prepararPedido() {
  document.querySelector("#lista-pedido").addEventListener("click", manejarClickPedido)
  document.querySelector("#formulario-pedido").addEventListener("submit", (evento) => {
    evento.preventDefault()
    confirmarPedido()
  })
  document.querySelector("#boton-vaciar").addEventListener("click", () => {
    solicitarVaciarPedido()
  })
}
