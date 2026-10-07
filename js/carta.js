let categoriaActiva = "todas"

async function obtenerProductos() {
  const avisoCarga = document.querySelector("#aviso-carga")
  const avisoError = document.querySelector("#aviso-error")

  avisoError.hidden = true
  avisoCarga.hidden = false

  try {
    const respuesta = await fetch("data/productos.json")

    if (!respuesta.ok) {
      throw new Error("No se pudo leer la carta")
    }

    const datos = await respuesta.json()

    if (!Array.isArray(datos)) {
      throw new Error("La carta no tiene el formato esperado")
    }

    cartaProductos = datos
    renderizarFiltros()
    renderizarCarta()
  } catch (error) {
    const motivo = error.message || "error desconocido"
    avisoError.hidden = false
    avisoError.textContent = `No pudimos cargar la carta. Abrí el proyecto con un servidor local. Detalle: ${motivo}`
  } finally {
    avisoCarga.hidden = true
  }
}

function crearBotonFiltro(contenedor, categoria, etiqueta) {
  const boton = document.createElement("button")
  boton.type = "button"
  boton.className = "filtro"
  boton.dataset.categoria = categoria
  boton.textContent = etiqueta
  contenedor.appendChild(boton)
}

function renderizarFiltros() {
  const contenedor = document.querySelector("#filtros-carta")
  const categorias = [...new Set(cartaProductos.map((producto) => producto.categoria))]

  contenedor.innerHTML = ""
  crearBotonFiltro(contenedor, "todas", "Todas")
  categorias.forEach((categoria) => {
    crearBotonFiltro(contenedor, categoria, categoria)
  })
  actualizarFiltrosActivos()
}

function actualizarFiltrosActivos() {
  const botones = document.querySelectorAll("#filtros-carta button")

  botones.forEach((boton) => {
    const activo = boton.dataset.categoria === categoriaActiva
    boton.classList.toggle("filtro--activo", activo)
    boton.setAttribute("aria-pressed", activo ? "true" : "false")
  })
}

function obtenerProductosVisibles() {
  const textoBusqueda = document.querySelector("#busqueda-carta").value.trim().toLowerCase()
  const porCategoria = categoriaActiva === "todas"
    ? cartaProductos
    : cartaProductos.filter((producto) => producto.categoria === categoriaActiva)

  return porCategoria.filter((producto) => {
    const { nombre, descripcion } = producto
    const nombreNormalizado = nombre.toLowerCase()
    const descripcionNormalizada = (descripcion || "").toLowerCase()
    return nombreNormalizado.includes(textoBusqueda) || descripcionNormalizada.includes(textoBusqueda)
  })
}

function crearTarjeta(producto) {
  const { id, nombre, descripcion, precio, categoria, imagen, textoAlternativo } = producto

  return `
    <article class="tarjeta">
      <img class="tarjeta__imagen" src="${imagen}" width="400" height="300" alt="${escaparTexto(textoAlternativo || nombre)}">
      <p class="tarjeta__categoria">${escaparTexto(categoria)}</p>
      <h3 class="tarjeta__titulo">${escaparTexto(nombre)}</h3>
      <p class="tarjeta__texto">${escaparTexto(descripcion || "Sin descripción")}</p>
      <p class="tarjeta__precio">${formatearPrecio(precio)}</p>
      <button type="button" class="boton boton--cobre" data-accion="agregar" data-id="${id}">Agregar al pedido</button>
    </article>
  `
}

function renderizarCarta() {
  const grilla = document.querySelector("#grilla-carta")
  const productosVisibles = obtenerProductosVisibles()

  if (productosVisibles.length === 0) {
    grilla.innerHTML = `<p class="carta-vacia">No encontramos productos con esa búsqueda.</p>`
    return
  }

  grilla.innerHTML = productosVisibles.map((producto) => crearTarjeta(producto)).join("")
}

function prepararCarta() {
  document.querySelector("#filtros-carta").addEventListener("click", (evento) => {
    const boton = evento.target.closest("button")
    if (!boton) {
      return
    }

    categoriaActiva = boton.dataset.categoria
    actualizarFiltrosActivos()
    renderizarCarta()
  })

  document.querySelector("#busqueda-carta").addEventListener("input", () => {
    renderizarCarta()
  })

  document.querySelector("#grilla-carta").addEventListener("click", (evento) => {
    const boton = evento.target.closest("[data-accion='agregar']")
    if (!boton) {
      return
    }

    agregarAlPedido(Number(boton.dataset.id))
  })
}

async function iniciarAplicacion() {
  cargarPedido()
  prepararPedido()
  prepararCarta()
  await obtenerProductos()
  sincronizarPedidoConCarta()
  renderizarPedido()
}

iniciarAplicacion()
