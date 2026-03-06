// ============================================
// FERRECONTROL - VERSIÓN LOCAL (SIN BACKEND)
// Almacenamiento: localStorage del navegador
// ============================================

// ============================================
// CAPA DE ALMACENAMIENTO LOCAL
// ============================================
const DB = {
    get:      (key)        => JSON.parse(localStorage.getItem('ferrecontrol_' + key) || 'null'),
    set:      (key, value) => localStorage.setItem('ferrecontrol_' + key, JSON.stringify(value)),
    getArray: (key)        => JSON.parse(localStorage.getItem('ferrecontrol_' + key) || '[]')
};

function generarId() {
    return Date.now() + Math.floor(Math.random() * 10000);
}

// ============================================
// PARTE 1: ESTADO GLOBAL
// ============================================
let AppState = {
    inventario: [],
    proveedores: [],
    facturas: [],
    cartera: [],
    ahorros: { total: 0, historial: [] },
    sesion: { usuario: 'Administrador', ultimoAcceso: new Date() }
};

let reporteState = { tipo: 'dia', busqueda: '' };
let carrito = [];
let stockMinimo = 3;
let filtroActual = { categoria: 'all', busqueda: '' };
let modalOrigen = 'general';
let filtroFacturas = { busqueda: '', fechaInicio: '', fechaFin: '', metodoPago: 'todos' };

// ============================================
// FUNCIONES DE PERSISTENCIA
// ============================================
function cargarInventario() {
    AppState.inventario = DB.getArray('inventario');
    llenarSelectCategorias();
    llenarSelectTubos();
}
function cargarProveedores() {
    AppState.proveedores = DB.getArray('proveedores');
    llenarSelectProveedores();
}
function cargarFacturas()  { AppState.facturas  = DB.getArray('facturas');  }
function cargarCartera()   { AppState.cartera   = DB.getArray('cartera');   actualizarSelectClientes(); return true; }
function cargarAhorros()   { AppState.ahorros   = DB.get('ahorros') || { total: 0, historial: [] }; }

function guardarInventario()  { DB.set('inventario',  AppState.inventario);  }
function guardarProveedores() { DB.set('proveedores', AppState.proveedores); }
function guardarFacturas()    { DB.set('facturas',    AppState.facturas);    }
function guardarCartera()     { DB.set('cartera',     AppState.cartera);     }
function guardarAhorros()     { DB.set('ahorros',     AppState.ahorros);     }

// ============================================
// SESIÓN
// ============================================
function mostrarHoraLogin() {
    const loginTime = document.getElementById('loginTime');
    const userName  = document.getElementById('userName');
    if (loginTime) loginTime.textContent = `Último acceso: ${new Date().toLocaleString('es-CO')}`;
    if (userName)  userName.textContent  = AppState.sesion.usuario;
}

function cerrarSesion() {
    if (confirm('¿Está seguro de cerrar sesión?')) window.location.reload();
}

// ============================================
// PARTE 2: NAVEGACIÓN
// ============================================
function configurarNavegacion() {
    const menuInv = document.getElementById('menu-inventario');
    const subMenu  = document.getElementById('sub-inventario');
    if (menuInv && subMenu) {
        menuInv.replaceWith(menuInv.cloneNode(true));
        const nuevoMenu = document.getElementById('menu-inventario');
        const nuevoSub  = document.getElementById('sub-inventario');
        const flecha    = nuevoMenu?.querySelector('.arrow-icon');
        if (nuevoMenu && nuevoSub && flecha) {
            nuevoMenu.addEventListener('click', function(e) {
                e.stopPropagation(); e.preventDefault();
                const visible = nuevoSub.style.display === 'block';
                nuevoSub.style.display = visible ? 'none' : 'block';
                flecha.classList.toggle('open', !visible);
                nuevoMenu.classList.toggle('active', !visible);
            });
            nuevoSub.addEventListener('click', e => e.stopPropagation());
        }
    }
    document.querySelectorAll('.nav-item[data-view]').forEach(item => {
        item.addEventListener('click', function() {
            const v = this.getAttribute('data-view');
            if (v && v !== 'view-inventario') {
                cambiarVista(v);
                const sub  = document.getElementById('sub-inventario');
                const menu = document.getElementById('menu-inventario');
                const arr  = menu?.querySelector('.arrow-icon');
                if (sub && menu && arr) { sub.style.display = 'none'; arr.classList.remove('open'); menu.classList.remove('active'); }
            }
        });
    });
    document.querySelectorAll('.sub-item[data-view]').forEach(item => {
        item.addEventListener('click', function(e) { e.stopPropagation(); const v = this.getAttribute('data-view'); if (v) cambiarVista(v); });
    });
}

function cambiarVista(viewId) {
    document.querySelectorAll('.nav-item').forEach(li => li.classList.remove('active'));
    const activeNav = document.querySelector(`[data-view="${viewId}"]`);
    if (activeNav) activeNav.classList.add('active');

    const titulos = {
        'view-dashboard': 'Dashboard', 'view-inventario': 'Inventario General',
        'view-tubos': 'Sección de Tubos', 'view-facturacion': 'Facturación',
        'view-proveedores': 'Proveedores', 'view-reportes': 'Reportes',
        'view-cartera': 'Cartera', 'view-ahorros': 'Fondo de Ahorro'
    };
    const tituloEl = document.getElementById('seccion-titulo');
    if (tituloEl) tituloEl.textContent = titulos[viewId] || 'Dashboard';

    document.querySelectorAll('.content-view').forEach(v => { v.classList.remove('active-view'); v.style.display = 'none'; });
    const vista = document.getElementById(viewId);
    if (vista) { vista.classList.add('active-view'); vista.style.display = 'flex'; }

    switch(viewId) {
        case 'view-dashboard':    cargarInventario(); cargarFacturas(); actualizarTablaDashboard(); break;
        case 'view-inventario':   cargarInventario(); actualizarVistaInventarioCompleto(); break;
        case 'view-tubos':        cargarInventario(); actualizarVistaTubos(); break;
        case 'view-facturacion':  cargarFacturas();   actualizarVistaFacturacion(); break;
        case 'view-proveedores':  cargarProveedores(); actualizarVistaProveedores(); break;
        case 'view-reportes':     cargarInventario(); cargarFacturas(); actualizarVistaReportes(); break;
        case 'view-cartera':      cargarCartera();    actualizarVistaCartera(); break;
        case 'view-ahorros':      cargarAhorros();    cargarFacturas(); actualizarVistaAhorros(); break;
    }
}

// ============================================
// PARTE 3: INICIALIZACIÓN
// ============================================
function inicializarAplicacion() {
    console.log('🚀 FerreControl iniciando en modo local...');
    mostrarHoraLogin();
    configurarNavegacion();
    configurarFiltros();
    inicializarCategoriasModal();
    cargarInventario(); cargarProveedores(); cargarFacturas(); cargarCartera(); cargarAhorros();
    actualizarTablaDashboard();
    llenarSelectProductos();
    console.log('✅ Aplicación lista');
}

// ============================================
// PARTE 4: INVENTARIO
// ============================================
function actualizarTablaDashboard() {
    const tabla = document.getElementById('inventoryTable');
    if (!tabla) return;
    tabla.innerHTML = '';
    const productos = AppState.inventario.filter(p => p.categoria !== 'Tubos');
    if (productos.length === 0) {
        tabla.innerHTML = '<tr><td colspan="4" class="text-center">No hay productos registrados</td></tr>';
        return;
    }
    productos.forEach(prod => {
        const tr = document.createElement('tr');
        const sc = (prod.cantidad||0) === 0 ? 'texto-stock-agotado' : (prod.cantidad||0) <= stockMinimo ? 'texto-stock-bajo' : 'texto-stock-normal';
        tr.innerHTML = `<td>${prod.referencia||'N/A'}</td><td>${prod.nombre||'Sin nombre'}</td><td>$${formatearMoneda(prod.precio_venta||0)}</td><td class="${sc}"><strong>${prod.cantidad||0}</strong></td>`;
        tabla.appendChild(tr);
    });
}

function actualizarVistaInventarioCompleto() {
    const tabla = document.getElementById('fullInventoryTableBody');
    if (!tabla) return;
    tabla.innerHTML = '';
    const productos = AppState.inventario.filter(p => p.categoria !== 'Tubos');
    if (productos.length === 0) { tabla.innerHTML = '<tr><td colspan="10" class="text-center">No hay productos en inventario</td></tr>'; return; }
    productos.forEach(prod => _renderFilaProducto(prod, tabla, 'general'));
}

function _renderFilaProducto(prod, tabla, origen) {
    const tr = document.createElement('tr');
    const cantidad = prod.cantidad || 0;
    const esEstancado = esProductoEstancado(prod);
    let badge = '<span class="badge badge-success">Disponible</span>', rowClass = '';
    if (esEstancado)             { badge = '<span class="badge badge-stagnant">Estancado</span>'; rowClass = 'stock-stagnant-ui'; }
    else if (cantidad === 0)     { badge = '<span class="badge badge-danger">Agotado</span>'; }
    else if (cantidad <= stockMinimo) { badge = '<span class="badge badge-warning">Bajo Stock</span>'; rowClass = 'stock-alert-ui'; }
    if (rowClass) tr.className = rowClass;
    const sc = cantidad === 0 ? 'texto-stock-agotado' : cantidad <= stockMinimo ? 'texto-stock-bajo' : esEstancado ? 'texto-stock-estancado' : 'texto-stock-normal';
    tr.innerHTML = `
        <td>${prod.referencia||'N/A'}</td><td><strong>${prod.nombre||'Sin nombre'}</strong></td>
        <td>${prod.categoria||'General'}</td><td>${prod.proveedor||'N/A'}</td><td>${prod.ubicacion||'N/A'}</td>
        <td>$${formatearMoneda(prod.precio_compra||0)}</td><td>$${formatearMoneda(prod.precio_venta||0)}</td>
        <td class="${sc}"><strong>${cantidad}</strong></td><td>${badge}</td>
        <td><div class="acciones-tabla">
            <button class="btn-icon" onclick="prepararEdicionProducto(${prod.id},'${origen}')" title="Editar">✏️</button>
            <button class="btn-icon" onclick="confirmarEliminarProducto(${prod.id})" title="Eliminar">🗑️</button>
        </div></td>`;
    tabla.appendChild(tr);
}

function actualizarVistaTubos() {
    const tabla = document.getElementById('tubosTableBody');
    if (!tabla) return;
    tabla.innerHTML = '';
    const tubos = AppState.inventario.filter(p => p.categoria === 'Tubos');
    if (tubos.length === 0) { tabla.innerHTML = '<tr><td colspan="12" class="text-center">No hay tubos registrados</td></tr>'; return; }
    tubos.forEach(tubo => {
        const tr = document.createElement('tr');
        const cantidad = tubo.cantidad || 0;
        const esEstancado = esProductoEstancado(tubo);
        let badge = '<span class="badge badge-success">Disponible</span>', rowClass = '';
        if (esEstancado)             { badge = '<span class="badge badge-stagnant">Estancado</span>'; rowClass = 'stock-stagnant-ui'; }
        else if (cantidad === 0)     { badge = '<span class="badge badge-danger">Agotado</span>'; }
        else if (cantidad <= stockMinimo) { badge = '<span class="badge badge-warning">Bajo Stock</span>'; rowClass = 'stock-alert-ui'; }
        if (rowClass) tr.className = rowClass;
        const sc = cantidad === 0 ? 'texto-stock-agotado' : cantidad <= stockMinimo ? 'texto-stock-bajo' : esEstancado ? 'texto-stock-estancado' : 'texto-stock-normal';
        tr.innerHTML = `
            <td>${tubo.referencia||'N/A'}</td><td><strong>${tubo.nombre||'Sin nombre'}</strong></td>
            <td>${tubo.material||'N/A'}</td><td>${tubo.diametro||'N/A'}</td><td>${tubo.longitud||'N/A'}</td>
            <td>${tubo.presion||'N/A'}</td><td>${tubo.proveedor||'N/A'}</td><td>${tubo.ubicacion||'N/A'}</td>
            <td>$${formatearMoneda(tubo.precio_compra||0)} / $${formatearMoneda(tubo.precio_venta||0)}</td>
            <td class="${sc}"><strong>${cantidad}</strong></td><td>${badge}</td>
            <td><div class="acciones-tabla">
                <button class="btn-icon" onclick="prepararEdicionProducto(${tubo.id},'tubos')" title="Editar">✏️</button>
                <button class="btn-icon" onclick="confirmarEliminarProducto(${tubo.id})" title="Eliminar">🗑️</button>
            </div></td>`;
        tabla.appendChild(tr);
    });
}

function esProductoEstancado(producto) {
    if (!producto.ultima_venta) return false;
    const dias = Math.floor((new Date() - new Date(producto.ultima_venta)) / (1000 * 60 * 60 * 24));
    return dias > 30 && (producto.cantidad || 0) > 0;
}

// ============================================
// PARTE 5: MODALES DE PRODUCTO
// ============================================
function abrirModalProducto(origen = 'general', event) {
    if (event) event.stopPropagation();
    modalOrigen = origen;
    const modal = document.getElementById('modalProducto');
    if (!modal) return;
    modal.querySelectorAll('input').forEach(i => { if (i.type !== 'button') i.value = ''; });
    modal.querySelectorAll('select').forEach(s => s.selectedIndex = 0);
    delete modal.dataset.productoId;
    const titulo = document.getElementById('modalProductoTitulo');
    const cG = document.getElementById('campos-generales');
    const cT = document.getElementById('campos-especificos-tubos');
    const cC = document.querySelector('.campo-categoria');
    if (origen === 'tubos') {
        if (titulo) titulo.textContent = '🚰 Nuevo Tubo';
        if (cG) cG.style.display = 'none'; if (cT) cT.style.display = 'block'; if (cC) cC.style.display = 'none';
        const sc = document.getElementById('prodCat'); if (sc) sc.value = 'Tubos';
    } else {
        if (titulo) titulo.textContent = '📦 Nuevo Producto';
        if (cG) cG.style.display = 'block'; if (cT) cT.style.display = 'none'; if (cC) cC.style.display = 'block';
    }
    modal.style.display = 'flex';
}

function prepararEdicionProducto(id, origen = 'general') {
    modalOrigen = origen;
    const prod = AppState.inventario.find(p => p.id === id);
    if (!prod) { mostrarNotificacion('Producto no encontrado', 'error'); return; }
    const modal = document.getElementById('modalProducto');
    if (!modal) return;
    modal.dataset.productoId = id;
    document.getElementById('prodRef').value   = prod.referencia || '';
    document.getElementById('prodNombre').value = prod.nombre    || '';
    document.getElementById('prodCat').value    = prod.categoria || '';
    const titulo = document.getElementById('modalProductoTitulo');
    const cG = document.getElementById('campos-generales');
    const cT = document.getElementById('campos-especificos-tubos');
    const cC = document.querySelector('.campo-categoria');
    if (origen === 'tubos' || prod.categoria === 'Tubos') {
        if (titulo) titulo.textContent = '✏️ Editar Tubo';
        if (cG) cG.style.display = 'none'; if (cT) cT.style.display = 'block'; if (cC) cC.style.display = 'none';
        document.getElementById('tuboMaterial').value  = prod.material    || 'PVC';
        document.getElementById('tuboDiametro').value  = prod.diametro    || '';
        document.getElementById('tuboLongitud').value  = prod.longitud    || '';
        document.getElementById('tuboPresion').value   = prod.presion     || '';
        document.getElementById('tuboProveedor').value = prod.proveedor_id || '';
        document.getElementById('tuboUbicacion').value = prod.ubicacion   || '';
        document.getElementById('tuboCompra').value    = prod.precio_compra || 0;
        document.getElementById('tuboVenta').value     = prod.precio_venta  || 0;
        document.getElementById('tuboStock').value     = prod.cantidad       || 0;
    } else {
        if (titulo) titulo.textContent = '✏️ Editar Producto';
        if (cG) cG.style.display = 'block'; if (cT) cT.style.display = 'none'; if (cC) cC.style.display = 'block';
        document.getElementById('prodCompra').value = prod.precio_compra || 0;
        document.getElementById('prodVenta').value  = prod.precio_venta  || 0;
        document.getElementById('prodStock').value  = prod.cantidad       || 0;
        document.getElementById('prodProv').value   = prod.proveedor_id  || '';
        document.getElementById('prodUbic').value   = prod.ubicacion     || '';
    }
    modal.style.display = 'flex';
}

function guardarProducto() {
    const modal = document.getElementById('modalProducto');
    const productoId = modal?.dataset.productoId ? parseInt(modal.dataset.productoId) : null;
    const esEdicion  = productoId !== null;
    const nombre     = document.getElementById('prodNombre')?.value.trim();
    const referencia = document.getElementById('prodRef')?.value.trim();
    if (!nombre || !referencia) { mostrarNotificacion('Nombre y referencia son obligatorios', 'warning'); return; }

    let datos = {};
    if (modalOrigen === 'tubos') {
        const provId = document.getElementById('tuboProveedor')?.value;
        const prov   = AppState.proveedores.find(p => p.id == provId);
        datos = {
            referencia, nombre, categoria: 'Tubos',
            material:       document.getElementById('tuboMaterial')?.value  || 'PVC',
            diametro:       document.getElementById('tuboDiametro')?.value.trim() || '',
            longitud:       document.getElementById('tuboLongitud')?.value.trim() || '',
            presion:        document.getElementById('tuboPresion')?.value.trim()  || '',
            precio_compra:  parseFloat(document.getElementById('tuboCompra')?.value)  || 0,
            precio_venta:   parseFloat(document.getElementById('tuboVenta')?.value)   || 0,
            cantidad:       parseInt(document.getElementById('tuboStock')?.value)     || 0,
            proveedor_id:   provId ? parseInt(provId) : null,
            proveedor:      prov?.nombre || '',
            ubicacion:      document.getElementById('tuboUbicacion')?.value.trim() || 'Bodega'
        };
    } else {
        const provId = document.getElementById('prodProv')?.value;
        const prov   = AppState.proveedores.find(p => p.id == provId);
        datos = {
            referencia, nombre,
            categoria:     document.getElementById('prodCat')?.value || 'General',
            precio_compra: parseFloat(document.getElementById('prodCompra')?.value) || 0,
            precio_venta:  parseFloat(document.getElementById('prodVenta')?.value)  || 0,
            cantidad:      parseInt(document.getElementById('prodStock')?.value)    || 0,
            proveedor_id:  provId ? parseInt(provId) : null,
            proveedor:     prov?.nombre || '',
            ubicacion:     document.getElementById('prodUbic')?.value.trim() || 'Bodega'
        };
    }
    if (datos.precio_venta <= 0) { mostrarNotificacion('El precio de venta debe ser mayor a cero', 'warning'); return; }

    if (esEdicion) {
        const idx = AppState.inventario.findIndex(p => p.id === productoId);
        if (idx !== -1) AppState.inventario[idx] = { ...AppState.inventario[idx], ...datos };
        mostrarNotificacion('✅ Producto actualizado correctamente', 'success');
    } else {
        datos.id = generarId();
        AppState.inventario.push(datos);
        mostrarNotificacion('✅ Producto creado correctamente', 'success');
    }
    guardarInventario();
    actualizarTablaDashboard();
    llenarSelectProductos();
    if (modalOrigen === 'tubos') actualizarVistaTubos(); else actualizarVistaInventarioCompleto();
    cerrarModal();
}

function confirmarEliminarProducto(id) {
    mostrarConfirmacion({
        mensaje: '¿Está seguro de eliminar este producto? Esta acción no se puede deshacer.',
        onConfirm: () => {
            AppState.inventario = AppState.inventario.filter(p => p.id !== id);
            guardarInventario();
            mostrarNotificacion('✅ Producto eliminado correctamente', 'success');
            actualizarTablaDashboard(); actualizarVistaInventarioCompleto(); actualizarVistaTubos(); llenarSelectProductos();
        }
    });
}

function cerrarModal() { const m = document.getElementById('modalProducto'); if (m) m.style.display = 'none'; }

// ============================================
// PARTE 6: CARRITO Y VENTAS
// ============================================
function llenarSelectProductos() {
    const select = document.getElementById('selectProducto');
    if (!select) return;
    select.innerHTML = '<option value="">-- Seleccione producto --</option>';
    AppState.inventario.filter(p => (p.cantidad || 0) > 0).forEach(prod => {
        const o = document.createElement('option');
        o.value = prod.id;
        o.textContent = `${prod.nombre} - $${formatearMoneda(prod.precio_venta||0)} (Stock: ${prod.cantidad})`;
        select.appendChild(o);
    });
}

function agregarAlCarrito(productoId) {
    if (!productoId) { mostrarNotificacion('Seleccione un producto', 'warning'); return; }
    const prod = AppState.inventario.find(p => p.id === productoId);
    if (!prod) { mostrarNotificacion('Producto no encontrado', 'error'); return; }
    const cantidad = parseInt(document.getElementById('cantProducto')?.value) || 1;
    if (cantidad <= 0) { mostrarNotificacion('La cantidad debe ser mayor a cero', 'warning'); return; }
    if (cantidad > (prod.cantidad || 0)) { mostrarNotificacion(`Stock insuficiente. Disponible: ${prod.cantidad}`, 'warning'); return; }
    const existente = carrito.find(i => i.id === productoId);
    if (existente) {
        const nueva = existente.cantidad + cantidad;
        if (nueva > (prod.cantidad || 0)) { mostrarNotificacion(`Stock insuficiente. Máximo: ${prod.cantidad}`, 'warning'); return; }
        existente.cantidad = nueva;
        existente.subtotal = nueva * existente.precio;
    } else {
        carrito.push({ id: prod.id, nombre: prod.nombre, precio: prod.precio_venta||0, precioCompra: prod.precio_compra||0, cantidad, subtotal: cantidad * (prod.precio_venta||0) });
    }
    actualizarVistaCarrito();
    mostrarNotificacion('Producto agregado al carrito', 'success');
    const ci = document.getElementById('cantProducto'); if (ci) ci.value = '1';
    document.getElementById('selectProducto').value = '';
}

function actualizarVistaCarrito() {
    const tbody = document.getElementById('cartTableBody');
    const totalEl = document.getElementById('totalFactura');
    if (!tbody) return;
    tbody.innerHTML = '';
    let total = 0;
    carrito.forEach((item, i) => {
        total += item.subtotal;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.nombre}</td>
            <td><input type="number" value="${item.cantidad}" min="1" onchange="modificarCantidadCarrito(${i},this.value)" style="width:60px;padding:4px;"></td>
            <td>$${formatearMoneda(item.subtotal)}</td>
            <td><button class="btn-icon" onclick="eliminarDelCarrito(${i})" title="Eliminar">❌</button></td>`;
        tbody.appendChild(tr);
    });
    if (totalEl) totalEl.textContent = `$${formatearMoneda(total)}`;
}

function modificarCantidadCarrito(index, nuevaCantidad) {
    const cantidad = parseInt(nuevaCantidad);
    if (isNaN(cantidad) || cantidad <= 0) { mostrarNotificacion('Cantidad inválida', 'warning'); actualizarVistaCarrito(); return; }
    const item = carrito[index];
    const prod = AppState.inventario.find(p => p.id === item.id);
    if (!prod) return;
    if (cantidad > (prod.cantidad || 0)) { mostrarNotificacion(`Stock insuficiente. Disponible: ${prod.cantidad}`, 'warning'); actualizarVistaCarrito(); return; }
    item.cantidad = cantidad;
    item.subtotal = cantidad * item.precio;
    actualizarVistaCarrito();
}

function eliminarDelCarrito(index) {
    carrito.splice(index, 1);
    actualizarVistaCarrito();
    mostrarNotificacion('Producto eliminado del carrito', 'info');
}

function limpiarCarrito() {
    if (carrito.length === 0) return;
    mostrarConfirmacion({ mensaje: '¿Está seguro de vaciar el carrito?', onConfirm: () => { carrito = []; actualizarVistaCarrito(); mostrarNotificacion('Carrito vaciado', 'info'); } });
}

function toggleFechaCartera() {
    const m = document.getElementById('metodoPago')?.value;
    const g = document.getElementById('group-vencimiento');
    if (g) g.style.display = m === 'Credito' ? 'block' : 'none';
}

function toggleCamposCliente() {
    const tipo = document.querySelector('input[name="tipoVenta"]:checked')?.value;
    const cC = document.getElementById('camposCredito');
    const cCo = document.getElementById('camposContado');
    const mp  = document.getElementById('metodoPago');
    if (tipo === 'credito') {
        if (cC) cC.style.display = 'block'; if (cCo) cCo.style.display = 'none';
        if (mp) mp.value = 'Credito';
        document.getElementById('clienteIdentificacion').value = '';
    } else {
        if (cC) cC.style.display = 'none'; if (cCo) cCo.style.display = 'block';
        if (mp) mp.value = 'Efectivo';
        document.getElementById('selectClienteVenta').value = '';
    }
    toggleFechaCartera();
}

function procesarVenta() {
    if (carrito.length === 0) { mostrarNotificacion('El carrito está vacío', 'warning'); return; }
    const tipoVenta = document.querySelector('input[name="tipoVenta"]:checked')?.value || 'contado';
    let clienteId = null, clienteNombre = 'Mostrador', fechaVenc = null;
    if (tipoVenta === 'credito') {
        clienteId = document.getElementById('selectClienteVenta')?.value;
        if (!clienteId) { mostrarNotificacion('Debe seleccionar un cliente para venta a crédito', 'warning'); return; }
        const fechaInput = document.getElementById('fechaVencimiento')?.value;
        if (!fechaInput) { mostrarNotificacion('Debe especificar la fecha de vencimiento', 'warning'); return; }
        fechaVenc = fechaInput;
        const cli = AppState.cartera.find(c => c.id == clienteId);
        if (cli) clienteNombre = cli.nombre;
    } else {
        clienteNombre = document.getElementById('clienteIdentificacion')?.value.trim() || 'Mostrador';
    }

    const total         = carrito.reduce((a, i) => a + i.subtotal, 0);
    const costoMerc     = carrito.reduce((a, i) => a + (i.precioCompra * i.cantidad), 0);
    const fechaCreacion = new Date().toISOString();

    const factura = {
        id:              generarId(),
        fecha_creacion:  fechaCreacion,
        fecha:           fechaCreacion,
        cliente_nombre:  clienteNombre,
        cliente_id:      clienteId ? parseInt(clienteId) : null,
        metodo_pago:     tipoVenta === 'credito' ? 'Credito' : 'Efectivo',
        estado_pago:     tipoVenta === 'credito' ? 'Pendiente' : 'Pagado',
        fecha_vencimiento: fechaVenc,
        total,
        costo_mercancia: costoMerc,
        ganancia:        total - costoMerc,
        items:           carrito.map(i => ({ producto_id: i.id, nombre: i.nombre, cantidad: i.cantidad, precio_unitario: i.precio, subtotal: i.subtotal }))
    };
    AppState.facturas.push(factura);
    guardarFacturas();

    // Reducir stock
    carrito.forEach(item => {
        const prod = AppState.inventario.find(p => p.id === item.id);
        if (prod) { prod.cantidad = Math.max(0, (prod.cantidad||0) - item.cantidad); prod.ultima_venta = fechaCreacion; }
    });
    guardarInventario();

    // Actualizar cartera si es crédito
    if (tipoVenta === 'credito' && clienteId) {
        const cli = AppState.cartera.find(c => c.id == parseInt(clienteId));
        if (cli) {
            cli.saldo_pendiente = (cli.saldo_pendiente || 0) + total;
            cli.descripcion     = carrito.map(i => `${i.nombre} (x${i.cantidad})`).join(', ');
            cli.fecha_vencimiento = fechaVenc;
            cli.estado = 'Pendiente';
            guardarCartera();
        }
    }

    // Ahorro automático del 5%
    const ahorroAuto = total * 0.05;
    AppState.ahorros.total = (AppState.ahorros.total || 0) + ahorroAuto;
    AppState.ahorros.historial.push({ id: generarId(), tipo: 'ingreso', monto: ahorroAuto, concepto: `Ahorro automático 5% - Factura #${factura.id}`, created_at: fechaCreacion });
    guardarAhorros();

    mostrarNotificacion(`✅ Venta procesada. Factura #${factura.id}`, 'success');

    // Limpiar
    carrito = [];
    actualizarVistaCarrito();
    document.getElementById('clienteIdentificacion').value = '';
    document.getElementById('selectClienteVenta').value    = '';
    document.getElementById('fechaVencimiento').value      = '';
    const rc = document.querySelector('input[name="tipoVenta"][value="contado"]');
    if (rc) { rc.checked = true; toggleCamposCliente(); }
    actualizarTablaDashboard();
    llenarSelectProductos();
}

// ============================================
// PARTE 7: CARTERA Y CLIENTES
// ============================================
function abrirModalCliente(event) {
    if (event) event.stopPropagation();
    const modal = document.getElementById('modalCliente');
    if (!modal) return;
    ['clienteRegNombre','clienteRegNit','clienteRegTelefono','clienteRegEmail','clienteRegDireccion']
        .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    modal.style.display = 'flex';
}

function cerrarModalCliente() { const m = document.getElementById('modalCliente'); if (m) m.style.display = 'none'; }

function guardarCliente() {
    const nombre = document.getElementById('clienteRegNombre')?.value.trim();
    if (!nombre) { mostrarNotificacion('El nombre del cliente es obligatorio', 'warning'); return; }
    const nuevo = {
        id:              generarId(),
        nombre,
        nit:             document.getElementById('clienteRegNit')?.value.trim()       || '',
        telefono:        document.getElementById('clienteRegTelefono')?.value.trim()  || '',
        email:           document.getElementById('clienteRegEmail')?.value.trim()     || '',
        direccion:       document.getElementById('clienteRegDireccion')?.value.trim() || '',
        descripcion:     `NIT: ${document.getElementById('clienteRegNit')?.value.trim() || 'No registrado'}`,
        estado:          'Activo',
        saldo_pendiente: 0,
        fecha_registro:  new Date().toISOString(),
        historial_abonos: []
    };
    AppState.cartera.push(nuevo);
    guardarCartera();
    actualizarSelectClientes();
    mostrarNotificacion(`✅ Cliente ${nombre} registrado`, 'success');
    cerrarModalCliente();
    setTimeout(() => { const s = document.getElementById('selectClienteVenta'); if (s) s.value = nuevo.id; }, 200);
}

function actualizarSelectClientes() {
    const select = document.getElementById('selectClienteVenta');
    if (!select) return;
    const va = select.value;
    select.innerHTML = '<option value="">-- Seleccione un cliente --</option>';
    [...AppState.cartera].sort((a, b) => (a.nombre||'').localeCompare(b.nombre||'')).forEach(c => {
        const o = document.createElement('option');
        o.value = c.id;
        let texto = c.nombre;
        if (c.nit) texto += ` (${c.nit})`; if (c.telefono) texto += ` - ${c.telefono}`;
        o.textContent = texto;
        select.appendChild(o);
    });
    if (va && AppState.cartera.some(c => c.id == va)) select.value = va;
}

function actualizarVistaCartera() {
    const tabla   = document.getElementById('carteraTableBody');
    const resumen = document.getElementById('total-cartera');
    if (!tabla) return;
    tabla.innerHTML = '';
    if (!AppState.cartera || AppState.cartera.length === 0) {
        tabla.innerHTML = '<tr><td colspan="7" class="text-center">No hay clientes registrados</td></tr>';
        if (resumen) resumen.textContent = '$0';
        return;
    }
    let suma = 0;
    AppState.cartera.forEach(cli => {
        const saldo = cli.saldo_pendiente || 0;
        suma += saldo;
        const tr = document.createElement('tr');
        const fechaReg  = cli.fecha_registro    ? new Date(cli.fecha_registro).toLocaleDateString()    : '-';
        const fechaVenc = cli.fecha_vencimiento ? new Date(cli.fecha_vencimiento).toLocaleDateString() : 'Sin fecha';
        tr.innerHTML = `
            <td><strong>${cli.nombre||'Cliente'}</strong><br><small style="color:var(--color-text-secondary);">${cli.telefono||'Sin teléfono'}</small></td>
            <td>${cli.descripcion||'Sin descripción'}</td>
            <td>${fechaReg}</td><td>${fechaVenc}</td>
            <td class="${saldo>0?'deuda-pendiente':'al-dia'}"><strong>$${formatearMoneda(saldo)}</strong></td>
            <td><span class="badge-estado ${(cli.estado||'pendiente').toLowerCase()}">${cli.estado||'Pendiente'}</span></td>
            <td><div class="acciones-tabla">
                <button class="btn-action btn-success" onclick="abrirModalAbono(${cli.id})" style="padding:8px 12px;font-size:0.75rem;">💸 Abonar</button>
                <button class="btn-icon" onclick="verHistorialCliente(${cli.id})" title="Ver detalles">📜</button>
            </div></td>`;
        tabla.appendChild(tr);
    });
    if (resumen) resumen.textContent = `$${formatearMoneda(suma)}`;
}

function abrirModalAbono(clienteId = null, event) {
    if (event) event.stopPropagation();
    if (clienteId === null) {
        const conDeuda = AppState.cartera.filter(c => (c.saldo_pendiente||0) > 0);
        if (conDeuda.length === 0) { mostrarNotificacion('No hay clientes con deudas pendientes', 'info'); return; }
        clienteId = conDeuda[0].id;
    }
    const cli = AppState.cartera.find(c => c.id === clienteId);
    if (!cli) { mostrarNotificacion('Cliente no encontrado', 'error'); return; }
    mostrarModalPersonalizado({
        titulo: '💸 Registrar Abono',
        contenido: `
            <div class="form-group"><label>Cliente:</label><h3>${cli.nombre}</h3></div>
            <div class="form-group"><label>Saldo Actual:</label><h2 style="color:var(--color-error);">$${formatearMoneda(cli.saldo_pendiente||0)}</h2></div>
            <div class="form-group">
                <label>Monto a Abonar:</label>
                <input type="number" id="montoAbono" class="form-control" placeholder="0.00" min="0" step="0.01">
                <input type="hidden" id="clienteIdAbono" value="${cli.id}">
            </div>`,
        botones: [
            { texto: 'Cancelar', clase: 'btn-danger', onClick: () => cerrarModalPersonalizado() },
            { texto: '✅ Registrar Abono', clase: 'btn-success', onClick: () => procesarAbonoDesdeModal() }
        ]
    });
}

function procesarAbonoDesdeModal() {
    const clienteId = parseInt(document.getElementById('clienteIdAbono')?.value);
    const monto     = parseFloat(document.getElementById('montoAbono')?.value);
    if (isNaN(monto) || monto <= 0) { mostrarNotificacion('Ingrese un monto válido', 'warning'); return; }
    const cli = AppState.cartera.find(c => c.id === clienteId);
    if (!cli) { mostrarNotificacion('Cliente no encontrado', 'error'); return; }
    if (monto > (cli.saldo_pendiente||0)) { mostrarNotificacion('El abono no puede ser mayor al saldo', 'warning'); return; }
    registrarAbono(clienteId, monto);
    cerrarModalPersonalizado();
    setTimeout(() => actualizarVistaCartera(), 300);
}

function registrarAbono(clienteId, monto) {
    const cli = AppState.cartera.find(c => c.id === clienteId);
    if (!cli) return false;
    cli.saldo_pendiente = Math.max(0, (cli.saldo_pendiente||0) - monto);
    if (cli.saldo_pendiente === 0) cli.estado = 'Pagado';
    cli.historial_abonos = cli.historial_abonos || [];
    cli.historial_abonos.push({ id: generarId(), fecha: new Date().toISOString(), monto });
    guardarCartera();
    mostrarNotificacion(`✅ Abono de $${formatearMoneda(monto)} registrado`, 'success');
    return true;
}

function verHistorialCliente(clienteId) {
    const cli = AppState.cartera.find(c => c.id === clienteId);
    if (!cli) { mostrarNotificacion('Cliente no encontrado', 'error'); return; }
    const abonos = cli.historial_abonos || [];
    const html   = abonos.length > 0
        ? abonos.map(a => `<tr><td>${new Date(a.fecha).toLocaleDateString()}</td><td>$${formatearMoneda(a.monto)}</td></tr>`).join('')
        : '<tr><td colspan="2" class="text-center">Sin abonos registrados</td></tr>';
    mostrarModalPersonalizado({
        titulo: `📜 Historial de ${cli.nombre}`,
        contenido: `
            <div class="form-group"><label>Saldo Pendiente:</label><h3 style="color:var(--color-error);">$${formatearMoneda(cli.saldo_pendiente||0)}</h3></div>
            <div class="form-group"><label>Historial de Abonos:</label>
                <table class="table-standard"><thead><tr><th>Fecha</th><th>Monto</th></tr></thead><tbody>${html}</tbody></table></div>`,
        botones: [{ texto: 'Cerrar', clase: 'btn-action', onClick: () => cerrarModalPersonalizado() }]
    });
}

// ============================================
// PARTE 8: AHORROS
// ============================================
function actualizarVistaAhorros() {
    const totalIngresos = AppState.facturas.reduce((a, f) => a + (f.total||0), 0);
    const ahorroNeto    = AppState.ahorros?.total || 0;
    const elI = document.getElementById('ahorro-ingresos-totales');
    const elA = document.getElementById('ahorro-acumulado');
    const elC = document.getElementById('capital-operativo');
    if (elI) elI.textContent = `$${formatearMoneda(totalIngresos)}`;
    if (elA) elA.textContent = `$${formatearMoneda(ahorroNeto)}`;
    if (elC) elC.textContent = `$${formatearMoneda(totalIngresos * 0.95)}`;
    const tabla = document.getElementById('historialAhorroBody');
    if (!tabla) return;
    tabla.innerHTML = '';
    const historial = AppState.ahorros?.historial || [];
    if (historial.length === 0) { tabla.innerHTML = '<tr><td colspan="4" class="text-center">Sin movimientos registrados</td></tr>'; return; }
    [...historial].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).forEach(mov => {
        const tr = document.createElement('tr');
        const esRetiro = mov.tipo === 'retiro';
        const fecha    = mov.created_at ? new Date(mov.created_at).toLocaleString('es-CO') : '-';
        tr.innerHTML = `
            <td>${fecha}</td>
            <td>${mov.concepto || (esRetiro ? 'Retiro' : 'Ingreso')}</td>
            <td><span class="badge ${esRetiro ? 'badge-credito' : 'badge-contado'}">${esRetiro ? 'Retiro' : 'Ingreso'}</span></td>
            <td style="color:${esRetiro ? 'var(--color-error)' : 'var(--color-success)'};">
                <strong>${esRetiro ? '-' : '+'}$${formatearMoneda(Math.abs(mov.monto))}</strong></td>`;
        tabla.appendChild(tr);
    });
}

function abrirModalAbonoAhorro(event) {
    if (event) event.stopPropagation();
    mostrarModalPersonalizado({
        titulo: '💵 Abonar al Fondo de Ahorro',
        contenido: `
            <div class="form-group"><label>Monto a Abonar:</label><input type="number" id="montoAbonoAhorro" class="form-control" placeholder="0.00" min="0" step="0.01"></div>
            <div class="form-group"><label>Concepto / Motivo:</label><input type="text" id="conceptoAbonoAhorro" class="form-control" placeholder="Ej: Abono extra"></div>`,
        botones: [
            { texto: 'Cancelar', clase: 'btn-danger', onClick: () => cerrarModalPersonalizado() },
            { texto: '✅ Registrar Abono', clase: 'btn-success', onClick: () => procesarAbonoAhorro() }
        ]
    });
}

function procesarAbonoAhorro() {
    const monto   = parseFloat(document.getElementById('montoAbonoAhorro')?.value);
    const concepto = document.getElementById('conceptoAbonoAhorro')?.value.trim();
    if (isNaN(monto) || monto <= 0) { mostrarNotificacion('Ingrese un monto válido', 'warning'); return; }
    if (!concepto) { mostrarNotificacion('Ingrese el concepto del abono', 'warning'); return; }
    AppState.ahorros.total = (AppState.ahorros.total || 0) + monto;
    AppState.ahorros.historial.push({ id: generarId(), tipo: 'ingreso', monto, concepto, created_at: new Date().toISOString() });
    guardarAhorros();
    mostrarNotificacion('✅ Abono registrado correctamente', 'success');
    actualizarVistaAhorros();
    cerrarModalPersonalizado();
}

function solicitarRetiroAhorro(event) {
    if (event) event.stopPropagation();
    const disponible = AppState.ahorros?.total || 0;
    mostrarModalPersonalizado({
        titulo: '💸 Registrar Retiro del Ahorro',
        contenido: `
            <div class="form-group"><label>Ahorro Disponible:</label><h3 style="color:var(--color-success);">$${formatearMoneda(disponible)}</h3></div>
            <div class="form-group"><label>Monto a Retirar:</label><input type="number" id="montoRetiroAhorro" class="form-control" placeholder="0.00" min="0" step="0.01" max="${disponible}"></div>
            <div class="form-group"><label>Motivo:</label><textarea id="motivoRetiroAhorro" class="form-control" rows="3" placeholder="Ej: Pago de deuda..."></textarea></div>`,
        botones: [
            { texto: 'Cancelar', clase: 'btn-danger', onClick: () => cerrarModalPersonalizado() },
            { texto: '✅ Confirmar Retiro', clase: 'btn-success', onClick: () => procesarRetiroAhorro() }
        ]
    });
}

function procesarRetiroAhorro() {
    const monto  = parseFloat(document.getElementById('montoRetiroAhorro')?.value);
    const motivo = document.getElementById('motivoRetiroAhorro')?.value.trim();
    if (isNaN(monto) || monto <= 0)              { mostrarNotificacion('Ingrese un monto válido', 'warning');    return; }
    if (!motivo)                                  { mostrarNotificacion('Ingrese el motivo del retiro','warning'); return; }
    if (monto > (AppState.ahorros?.total || 0))  { mostrarNotificacion('No hay suficiente ahorro disponible','warning'); return; }
    AppState.ahorros.total = (AppState.ahorros.total || 0) - monto;
    AppState.ahorros.historial.push({ id: generarId(), tipo: 'retiro', monto, concepto: motivo, created_at: new Date().toISOString() });
    guardarAhorros();
    mostrarNotificacion('✅ Retiro registrado correctamente', 'success');
    actualizarVistaAhorros();
    cerrarModalPersonalizado();
}

// ============================================
// PARTE 9: PROVEEDORES
// ============================================
function actualizarVistaProveedores() {
    const tabla = document.getElementById('suppliersTableBody');
    if (!tabla) return;
    tabla.innerHTML = '';
    if (!AppState.proveedores || AppState.proveedores.length === 0) {
        tabla.innerHTML = '<tr><td colspan="6" class="text-center">No hay proveedores registrados</td></tr>'; return;
    }
    AppState.proveedores.forEach(prov => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${prov.nombre||'Sin nombre'}</strong></td>
            <td>${prov.contacto||'N/A'}</td><td>${prov.telefono||'N/A'}</td><td>${prov.categoria||'General'}</td>
            <td><span class="badge-estado ${prov.estado?.toLowerCase()||'activo'}">${prov.estado||'Activo'}</span></td>
            <td><div class="acciones-tabla">
                <button class="btn-icon" onclick="prepararEdicionProveedor(${prov.id})" title="Editar">✏️</button>
                <button class="btn-icon" onclick="eliminarProveedor(${prov.id})" title="Eliminar">🗑️</button>
            </div></td>`;
        tabla.appendChild(tr);
    });
    llenarSelectProveedores();
    cargarComparativaProveedores();
}

function abrirModalProveedor(id = null, event) {
    if (event) event.stopPropagation();
    const modal = document.getElementById('modalProveedor');
    if (!modal) return;
    modal.querySelectorAll('input, select, textarea').forEach(el => { if (el.type !== 'button') el.value = ''; });
    const titulo = document.getElementById('modalProveedorTitulo');
    if (id) {
        const prov = AppState.proveedores.find(p => p.id === id);
        if (prov) {
            modal.dataset.proveedorId = id;
            document.getElementById('provNombre').value   = prov.nombre       || '';
            document.getElementById('provContacto').value = prov.contacto     || '';
            document.getElementById('provCategoria').value = prov.categoria   || '';
            document.getElementById('provTelefono').value = prov.telefono     || '';
            document.getElementById('provEmail').value    = prov.email        || '';
            document.getElementById('provEstado').value   = prov.estado       || 'Activo';
            const ri = document.getElementById('provRatingValue'); if (ri) ri.value = prov.calificacion || 0;
            if (titulo) titulo.textContent = '✏️ Editar Proveedor';
        }
    } else {
        delete modal.dataset.proveedorId;
        document.getElementById('provEstado').value = 'Activo';
        const ri = document.getElementById('provRatingValue'); if (ri) ri.value = 0;
        if (titulo) titulo.textContent = '🤝 Nuevo Proveedor';
    }
    setTimeout(() => inicializarRatingProveedor(), 100);
    modal.style.display = 'flex';
}

function guardarProveedor() {
    const modal      = document.getElementById('modalProveedor');
    const provId     = modal?.dataset.proveedorId ? parseInt(modal.dataset.proveedorId) : null;
    const esEdicion  = provId !== null;
    const datos = {
        nombre:          document.getElementById('provNombre')?.value.trim()         || '',
        contacto:        document.getElementById('provContacto')?.value.trim()       || '',
        telefono:        document.getElementById('provTelefono')?.value.trim()       || '',
        telefono2:       document.getElementById('provTelefono2')?.value.trim()      || '',
        email:           document.getElementById('provEmail')?.value.trim()          || '',
        direccion:       document.getElementById('provDireccion')?.value.trim()      || '',
        categoria:       document.getElementById('provCategoria')?.value             || 'General',
        productos:       document.getElementById('provProductos')?.value.trim()      || '',
        tiempoEntrega:   document.getElementById('provTiempoEntrega')?.value         || '',
        condicionesPago: document.getElementById('provCondicionesPago')?.value       || '',
        precioPromedio:  parseFloat(document.getElementById('provPrecioPromedio')?.value) || 0,
        descuento:       parseFloat(document.getElementById('provDescuento')?.value)      || 0,
        calificacion:    parseInt(document.getElementById('provRatingValue')?.value)      || 0,
        estado:          document.getElementById('provEstado')?.value                || 'Activo',
        notas:           document.getElementById('provNotas')?.value.trim()          || '',
        fechaRegistro:   document.getElementById('provFechaRegistro')?.value         || new Date().toISOString().split('T')[0]
    };
    if (!datos.nombre)   { mostrarNotificacion('El nombre de la empresa es obligatorio', 'warning'); return; }
    if (!datos.contacto) { mostrarNotificacion('El nombre del contacto es obligatorio',  'warning'); return; }

    if (esEdicion) {
        const idx = AppState.proveedores.findIndex(p => p.id === provId);
        if (idx !== -1) AppState.proveedores[idx] = { ...AppState.proveedores[idx], ...datos };
        mostrarNotificacion('✅ Proveedor actualizado correctamente', 'success');
    } else {
        datos.id = generarId();
        AppState.proveedores.push(datos);
        mostrarNotificacion('✅ Proveedor registrado correctamente', 'success');
    }
    guardarProveedores();
    actualizarVistaProveedores();
    llenarSelectProveedores();
    cerrarModalProv();
}

function eliminarProveedor(id) {
    mostrarConfirmacion({ mensaje: '¿Está seguro de eliminar este proveedor?', onConfirm: () => {
        AppState.proveedores = AppState.proveedores.filter(p => p.id !== id);
        guardarProveedores();
        mostrarNotificacion('Proveedor eliminado correctamente', 'success');
        actualizarVistaProveedores();
    }});
}

function cerrarModalProv() { const m = document.getElementById('modalProveedor'); if (m) m.style.display = 'none'; }
function prepararEdicionProveedor(id) { abrirModalProveedor(id); }

function llenarSelectProveedores() {
    ['prodProv', 'tuboProveedor'].forEach(sid => {
        const select = document.getElementById(sid);
        if (!select) return;
        const va = select.value;
        select.innerHTML = '<option value="">Seleccionar proveedor...</option>';
        AppState.proveedores.filter(p => p.estado === 'Activo').forEach(prov => {
            const o = document.createElement('option'); o.value = prov.id; o.textContent = prov.nombre; select.appendChild(o);
        });
        if (va) select.value = va;
    });
}

function inicializarRatingProveedor() {
    const stars = document.querySelectorAll('#provRating .star');
    const ri    = document.getElementById('provRatingValue');
    const rd    = document.getElementById('ratingValue');
    if (!stars.length || !ri) return;
    stars.forEach(s => { const n = s.cloneNode(true); s.parentNode.replaceChild(n, s); });
    const ns  = document.querySelectorAll('#provRating .star');
    const hl  = val => ns.forEach((s, i) => s.style.color = i < val ? '#f39c12' : '#ddd');
    ns.forEach(star => {
        star.addEventListener('mouseover', function() { hl(parseInt(this.getAttribute('data-value'))); });
        star.addEventListener('mouseout',  function() { hl(parseInt(ri.value) || 0); });
        star.addEventListener('click',     function() {
            const v = parseInt(this.getAttribute('data-value'));
            ri.value = v; if (rd) rd.textContent = `${v}/5`; hl(v);
        });
    });
    hl(parseInt(ri.value) || 0);
}

function verDetalleProveedor(id) {
    const prov = AppState.proveedores.find(p => p.id === id);
    if (!prov) { mostrarNotificacion('Proveedor no encontrado', 'error'); return; }
    mostrarModalPersonalizado({
        titulo: `🤝 Detalles de ${prov.nombre}`,
        contenido: `
            <div class="form-group"><label>Contacto:</label><p>${prov.contacto||'N/A'}</p></div>
            <div class="form-group"><label>Teléfono:</label><p>${prov.telefono||'N/A'}</p></div>
            <div class="form-group"><label>Email:</label><p>${prov.email||'N/A'}</p></div>
            <div class="form-group"><label>Categoría:</label><p>${prov.categoria||'N/A'}</p></div>
            <div class="form-group"><label>Estado:</label><p>${prov.estado||'Activo'}</p></div>`,
        botones: [{ texto: 'Cerrar', clase: 'btn-action', onClick: () => cerrarModalPersonalizado() }]
    });
}

function cargarComparativaProveedores() {
    const container = document.getElementById('supplierList');
    if (!container) return;
    container.innerHTML = '';
    const activos = AppState.proveedores.filter(p => p.estado === 'Activo');
    if (activos.length === 0) { container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--color-text-secondary);">🤝 No hay proveedores activos</div>'; return; }
    const cats = [...new Set(activos.map(p => p.categoria).filter(Boolean))];
    if (cats.length === 0) mostrarMejoresProveedores(activos, 'General', container);
    else cats.forEach(cat => mostrarMejoresProveedores(activos.filter(p => p.categoria === cat), cat, container));
}

function mostrarMejoresProveedores(proveedores, categoria, container) {
    const mejores = [...proveedores].sort((a, b) => (b.calificacion||0) - (a.calificacion||0)).slice(0, 3);
    if (mejores.length === 0) return;
    const div = document.createElement('div');
    div.innerHTML = `<h4 style="color:var(--color-primary);margin:15px 0 10px 0;border-bottom:1px solid var(--color-border);padding-bottom:5px;">${categoria} <small style="color:var(--color-text-secondary);">(${proveedores.length} proveedores)</small></h4>`;
    container.appendChild(div);
    mejores.forEach((prov, i) => {
        const item = document.createElement('div');
        item.style.cssText = `background:${i===0?'#f0f9ff':'white'};border:1px solid var(--color-border);border-radius:8px;padding:12px;margin-bottom:10px;cursor:pointer;transition:transform 0.2s;`;
        item.onmouseover = function() { this.style.transform = 'translateY(-2px)'; };
        item.onmouseout  = function() { this.style.transform = 'translateY(0)'; };
        item.onclick = function() { verDetalleProveedor(prov.id); };
        const estrellas = '★'.repeat(Math.floor(prov.calificacion||0)) + '☆'.repeat(5-Math.floor(prov.calificacion||0));
        item.innerHTML = `
            <div style="display:flex;justify-content:space-between;">
                <div><div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;">${i===0?'<span>🥇</span>':i===1?'<span>🥈</span>':'<span>🥉</span>'}<span style="font-weight:600;">${prov.nombre}</span></div><div style="font-size:0.85rem;color:var(--color-text-secondary);">${prov.contacto||'Sin contacto'}</div></div>
                <div style="text-align:right;color:#f39c12;">${estrellas} <span style="color:var(--color-text-secondary);">(${prov.calificacion||0})</span></div>
            </div>
            <div style="display:flex;justify-content:space-between;margin-top:10px;font-size:0.8rem;color:var(--color-text-secondary);"><div>📞 ${prov.telefono||'Sin teléfono'}</div><div>📁 ${prov.categoria||'General'}</div></div>`;
        container.appendChild(item);
    });
}

// ============================================
// PARTE 10: FACTURACIÓN
// ============================================
function actualizarVistaFacturacion() {
    if (!window.filtrosFacturasConfigurados) { configurarFiltrosFacturacion(); window.filtrosFacturasConfigurados = true; }
    const tabla = document.getElementById('historialFacturas');
    if (!tabla) return;
    if (!AppState.facturas || AppState.facturas.length === 0) {
        tabla.innerHTML = '<tr><td colspan="7" class="text-center">No hay facturas registradas</td></tr>';
        const te = document.getElementById('total-facturado'); if (te) te.textContent = '$0';
        return;
    }
    aplicarFiltrosFacturacion();
    const total = AppState.facturas.reduce((s, f) => s + (f.total||0), 0);
    const te = document.getElementById('total-facturado'); if (te) te.textContent = `$${formatearMoneda(total)}`;
}

function aplicarFiltrosFacturacion() {
    if (!AppState.facturas || AppState.facturas.length === 0) { actualizarTablaFacturasFiltradas([]); return; }
    let f = [...AppState.facturas];
    if (filtroFacturas.busqueda) f = f.filter(x => (x.id?.toString()||'').includes(filtroFacturas.busqueda) || (x.cliente_nombre||'').toLowerCase().includes(filtroFacturas.busqueda));
    if (filtroFacturas.fechaInicio) { const ini = new Date(filtroFacturas.fechaInicio); ini.setHours(0,0,0,0); f = f.filter(x => new Date(x.fecha_creacion||x.fecha) >= ini); }
    if (filtroFacturas.fechaFin)    { const fin = new Date(filtroFacturas.fechaFin);    fin.setHours(23,59,59,999); f = f.filter(x => new Date(x.fecha_creacion||x.fecha) <= fin); }
    if (filtroFacturas.metodoPago && filtroFacturas.metodoPago !== 'todos') f = f.filter(x => (x.metodo_pago||'').toLowerCase() === filtroFacturas.metodoPago.toLowerCase());
    actualizarTablaFacturasFiltradas(f);
}

function actualizarTablaFacturasFiltradas(facturas) {
    const tabla = document.getElementById('historialFacturas');
    if (!tabla) return;
    tabla.innerHTML = '';
    if (!facturas || facturas.length === 0) { tabla.innerHTML = '<tr><td colspan="7" class="text-center">No hay facturas que coincidan</td></tr>'; return; }
    [...facturas].reverse().forEach(factura => {
        const tr = document.createElement('tr');
        const costo    = factura.costo_mercancia || 0;
        const total    = factura.total            || 0;
        const ganancia = total - costo;
        let fecha = 'Sin fecha';
        if (factura.fecha_creacion || factura.fecha) { try { fecha = new Date(factura.fecha_creacion||factura.fecha).toLocaleDateString('es-CO',{year:'numeric',month:'2-digit',day:'2-digit'}); } catch(e){} }
        tr.innerHTML = `
            <td><strong>#${factura.id||'N/A'}</strong></td><td>${fecha}</td>
            <td>${factura.cliente_nombre||'Mostrador'}</td>
            <td class="text-right"><strong>$${formatearMoneda(total)}</strong></td>
            <td class="text-right">$${formatearMoneda(costo)}</td>
            <td class="text-right" style="color:${ganancia>=0?'var(--color-success)':'var(--color-error)'};font-weight:bold;">$${formatearMoneda(ganancia)}</td>
            <td class="text-center">
                <button class="btn-icon" onclick="mostrarDetalleFacturaModal(${factura.id})" title="Ver">👁️</button>
                <button class="btn-icon" onclick="imprimirFacturaPDF(${factura.id})" title="Imprimir">🖨️</button>
            </td>`;
        if (factura.metodo_pago === 'Credito') tr.classList.add('factura-credito');
        tabla.appendChild(tr);
    });
}

function configurarFiltrosFacturacion() {
    const sf  = document.getElementById('searchFacturas');    if (sf)  sf.addEventListener('input',  e => { filtroFacturas.busqueda    = e.target.value.toLowerCase().trim(); aplicarFiltrosFacturacion(); });
    const fi  = document.getElementById('filterFechaInicio'); if (fi)  fi.addEventListener('change', e => { filtroFacturas.fechaInicio  = e.target.value; aplicarFiltrosFacturacion(); });
    const ff  = document.getElementById('filterFechaFin');    if (ff)  ff.addEventListener('change', e => { filtroFacturas.fechaFin     = e.target.value; aplicarFiltrosFacturacion(); });
    const fmp = document.getElementById('filterMetodoPago');  if (fmp) fmp.addEventListener('change',e => { filtroFacturas.metodoPago   = e.target.value; aplicarFiltrosFacturacion(); });
    const bl  = document.getElementById('btnLimpiarFiltrosFacturas');
    if (bl) bl.addEventListener('click', () => {
        filtroFacturas = { busqueda: '', fechaInicio: '', fechaFin: '', metodoPago: 'todos' };
        ['searchFacturas','filterFechaInicio','filterFechaFin'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
        const m = document.getElementById('filterMetodoPago'); if (m) m.value = 'todos';
        aplicarFiltrosFacturacion();
        mostrarNotificacion('Filtros limpiados', 'info');
    });
}

function mostrarDetalleFacturaModal(facturaId) {
    const factura = AppState.facturas.find(f => f.id == facturaId);
    if (!factura) { mostrarNotificacion('Factura no encontrada', 'error'); return; }
    const prods = factura.items || [];
    const html  = prods.length > 0
        ? prods.map(p => `<tr><td>${p.nombre||'Producto'}</td><td>${p.cantidad}</td><td>$${formatearMoneda(p.precio_unitario||p.precio||0)}</td><td>$${formatearMoneda(p.subtotal||0)}</td></tr>`).join('')
        : '<tr><td colspan="4" class="text-center">Sin productos</td></tr>';
    let fecha = '-';
    try { fecha = new Date(factura.fecha_creacion||factura.fecha).toLocaleString(); } catch(e) {}
    mostrarModalPersonalizado({
        titulo: `🧾 Factura #${factura.id}`,
        contenido: `
            <div class="form-group"><label>Fecha:</label><p>${fecha}</p></div>
            <div class="form-group"><label>Cliente:</label><p>${factura.cliente_nombre||'Mostrador'}</p></div>
            <div class="form-group"><label>Método de Pago:</label><p>${factura.metodo_pago||'Efectivo'}</p></div>
            <div class="form-group"><label>Productos:</label>
                <table class="table-standard"><thead><tr><th>Producto</th><th>Cant.</th><th>Precio</th><th>Subtotal</th></tr></thead><tbody>${html}</tbody></table></div>
            <div class="form-group"><label>Total:</label><h2 style="color:var(--color-success);">$${formatearMoneda(factura.total||0)}</h2></div>
            <div class="form-group" style="text-align:center;">
                <button class="btn-action" onclick="imprimirFacturaPDF(${factura.id})" style="width:auto;padding:10px 20px;">🖨️ Imprimir Factura</button>
            </div>`,
        botones: [{ texto: 'Cerrar', clase: 'btn-action', onClick: () => cerrarModalPersonalizado() }]
    });
}

function imprimirFacturaPDF(facturaId) {
    const factura = AppState.facturas.find(f => f.id == facturaId);
    if (!factura) { mostrarNotificacion('Factura no encontrada', 'error'); return; }
    generarVentanaImpresion(factura, factura.items || []);
}

function generarVentanaImpresion(factura, productos) {
    const ventana = window.open('', '_blank');
    let fecha = '-';
    try { fecha = new Date(factura.fecha_creacion||factura.fecha).toLocaleString('es-CO'); } catch(e) {}
    const html = productos.length > 0
        ? productos.map(p => `<tr><td>${p.nombre||'Producto'}</td><td style="text-align:center">${p.cantidad}</td><td style="text-align:right">$${formatearMoneda(p.precio_unitario||p.precio||0)}</td><td style="text-align:right">$${formatearMoneda(p.subtotal||0)}</td></tr>`).join('')
        : '<tr><td colspan="4" style="text-align:center">No hay productos</td></tr>';
    ventana.document.write(`<!DOCTYPE html><html><head><title>Factura #${factura.id}</title>
    <style>body{font-family:Arial,sans-serif;padding:20px;max-width:800px;margin:0 auto}.header{text-align:center;margin-bottom:30px;border-bottom:2px solid #333;padding-bottom:20px}table{width:100%;border-collapse:collapse;margin-bottom:20px}th{background:#2c3e50;color:white;padding:10px;text-align:left}td{padding:8px;border-bottom:1px solid #ddd}.total{margin-top:20px;text-align:right;font-size:1.3em;font-weight:bold;border-top:2px solid #333;padding-top:10px}.btn{color:white;border:none;padding:10px 20px;border-radius:5px;cursor:pointer;margin:10px}.btn-p{background:#3498db}.btn-c{background:#e74c3c}.btns{text-align:center;margin:20px 0}@media print{button{display:none}}</style>
    </head><body>
    <div class="header"><h1>🛠 FERRECONTROL</h1><h2>Factura de Venta #${factura.id}</h2></div>
    <div style="background:#f9f9f9;padding:15px;border-radius:5px;margin-bottom:20px">
        <p><strong>Fecha:</strong> ${fecha}</p>
        <p><strong>Cliente:</strong> ${factura.cliente_nombre||'Mostrador'}</p>
        <p><strong>Método de Pago:</strong> ${factura.metodo_pago||'Efectivo'}</p>
    </div>
    <table><thead><tr><th>Producto</th><th>Cant.</th><th>Precio</th><th>Subtotal</th></tr></thead><tbody>${html}</tbody></table>
    <div class="total">TOTAL: $${formatearMoneda(factura.total||0)}</div>
    <div class="btns">
        <button class="btn btn-p" onclick="window.print()">🖨️ Imprimir</button>
        <button class="btn btn-c" onclick="window.close()">❌ Cerrar</button>
    </div>
    <div style="margin-top:50px;text-align:center;color:#7f8c8d"><p>¡Gracias por su compra!</p></div>
    </body></html>`);
    ventana.document.close();
}

// ============================================
// PARTE 11: REPORTES
// ============================================
function actualizarVistaReportes() {
    const el = document.getElementById('reporte-ganancia-total');
    if (el) el.textContent = `$${formatearMoneda(AppState.facturas.reduce((a,f)=>a+(f.total||0)-(f.costo_mercancia||0),0))}`;
    aplicarFiltrosReporte();
    renderizarTopVentas();
    renderizarAlertasInventario();
}

function cambiarTipoReporte() {
    reporteState.tipo = document.querySelector('input[name="tipoReporte"]:checked')?.value || 'dia';
    const el = document.getElementById('buscarFechaReporte'); if (el) el.value = '';
    reporteState.busqueda = '';
    aplicarFiltrosReporte();
}

function aplicarFiltrosReporte() {
    if (!AppState.facturas || AppState.facturas.length === 0) { actualizarTablaReportes([]); return; }
    reporteState.busqueda = document.getElementById('buscarFechaReporte')?.value.toLowerCase().trim() || '';
    const grupos = {};
    AppState.facturas.forEach(f => {
        const raw = f.fecha_creacion || f.fecha; if (!raw) return;
        try {
            const d = new Date(raw); if (isNaN(d.getTime())) return;
            let clave, fechaMostrar;
            if (reporteState.tipo === 'dia') { clave = d.toISOString().split('T')[0]; fechaMostrar = d.toLocaleDateString('es-CO',{year:'numeric',month:'2-digit',day:'2-digit'}); }
            else { clave = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; fechaMostrar = d.toLocaleDateString('es-CO',{year:'numeric',month:'long'}); }
            if (!grupos[clave]) grupos[clave] = { clave, fecha: fechaMostrar, totalVentas:0, totalCosto:0, cantidad:0 };
            grupos[clave].totalVentas += f.total||0; grupos[clave].totalCosto += f.costo_mercancia||0; grupos[clave].cantidad++;
        } catch(e) {}
    });
    let arr = Object.values(grupos);
    if (reporteState.busqueda) arr = arr.filter(g => g.fecha.toLowerCase().includes(reporteState.busqueda) || g.clave.includes(reporteState.busqueda));
    arr.sort((a, b) => b.clave.localeCompare(a.clave));
    actualizarTablaReportes(arr);
}

function actualizarTablaReportes(grupos) {
    const tabla = document.getElementById('tablaHistorialReportes');
    if (!tabla) return;
    tabla.innerHTML = '';
    if (!grupos || grupos.length === 0) { tabla.innerHTML = '<tr><td colspan="8" class="text-center">No hay ventas en este período</td></tr>'; return; }
    grupos.forEach(g => {
        const tr = document.createElement('tr');
        const gan = g.totalVentas - g.totalCosto;
        const mar = g.totalVentas > 0 ? ((gan/g.totalVentas)*100).toFixed(1) : 0;
        tr.innerHTML = `
            <td><strong>${reporteState.tipo==='dia'?'📆 Día':'📅 Mes'}</strong></td>
            <td><strong>${g.fecha}</strong></td>
            <td style="text-align:center;">${g.cantidad} factura${g.cantidad!==1?'s':''}</td>
            <td style="text-align:right;color:var(--color-success);font-weight:bold;">$${formatearMoneda(g.totalVentas)}</td>
            <td style="text-align:right;">$${formatearMoneda(g.totalCosto)}</td>
            <td style="text-align:right;color:${gan>=0?'var(--color-success)':'var(--color-error)'};font-weight:bold;">$${formatearMoneda(gan)}</td>
            <td style="text-align:center;"><span style="background:${mar>=30?'#d4edda':mar>=15?'#fff3cd':'#f8d7da'};color:${mar>=30?'#155724':mar>=15?'#856404':'#721c24'};padding:4px 8px;border-radius:4px;font-weight:bold;">${mar}%</span></td>
            <td style="text-align:center;"><button class="btn-icon" onclick="verDetalleReporte('${g.clave}')" title="Ver facturas">👁️</button></td>`;
        tabla.appendChild(tr);
    });
}

function verDetalleReporte(clave) {
    const filtradas = AppState.facturas.filter(f => {
        const raw = f.fecha_creacion||f.fecha; if (!raw) return false;
        try { const d = new Date(raw); if (isNaN(d.getTime())) return false;
            if (reporteState.tipo==='dia') return d.toISOString().split('T')[0] === clave;
            return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}` === clave;
        } catch(e) { return false; }
    });
    if (filtradas.length === 0) { mostrarNotificacion('No hay facturas en este período', 'info'); return; }
    const html = filtradas.map(f => `<tr><td>#${f.id}</td><td>${new Date(f.fecha_creacion||f.fecha).toLocaleDateString()}</td><td>${f.cliente_nombre||'Mostrador'}</td><td style="text-align:right;">$${formatearMoneda(f.total||0)}</td></tr>`).join('');
    mostrarModalPersonalizado({
        titulo: `📋 Facturas de ${clave}`,
        contenido: `<div style="max-height:400px;overflow-y:auto;"><table class="table-standard"><thead><tr><th># Factura</th><th>Fecha</th><th>Cliente</th><th>Total</th></tr></thead><tbody>${html}</tbody></table></div>`,
        botones: [{ texto: 'Cerrar', clase: 'btn-action', onClick: () => cerrarModalPersonalizado() }]
    });
}

function limpiarFiltrosReporte() {
    const el = document.getElementById('buscarFechaReporte'); if (el) el.value = '';
    reporteState.busqueda = '';
    aplicarFiltrosReporte();
}

function exportarReporteExcel() {
    if (!AppState.facturas || AppState.facturas.length === 0) { mostrarNotificacion('No hay datos para exportar', 'warning'); return; }
    const grupos = {};
    AppState.facturas.forEach(f => {
        const raw = f.fecha_creacion||f.fecha; if (!raw) return;
        try {
            const d = new Date(raw);
            const clave = reporteState.tipo==='dia' ? d.toISOString().split('T')[0] : `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
            if (!grupos[clave]) grupos[clave] = { fecha: clave, totalVentas:0, totalCosto:0, cantidad:0 };
            grupos[clave].totalVentas += f.total||0; grupos[clave].totalCosto += f.costo_mercancia||0; grupos[clave].cantidad++;
        } catch(e) {}
    });
    let csv = "\uFEFFPeríodo,Fecha,# Facturas,Total Ventas,Costo Total,Ganancia,Margen %\n";
    Object.values(grupos).sort((a,b)=>b.fecha.localeCompare(a.fecha)).forEach(g => {
        const gan = g.totalVentas - g.totalCosto;
        csv += `"${reporteState.tipo==='dia'?'Día':'Mes'}","${g.fecha}",${g.cantidad},${g.totalVentas},${g.totalCosto},${gan},${g.totalVentas>0?((gan/g.totalVentas)*100).toFixed(1):0}%\n`;
    });
    _descargarCSV(csv, `reporte_${reporteState.tipo}_${new Date().toISOString().slice(0,10)}.csv`);
    mostrarNotificacion('✅ Reporte exportado', 'success');
}

function renderizarTopVentas() {
    const tabla = document.getElementById('listaTopVentas');
    if (!tabla) return;
    tabla.innerHTML = '';
    if (!AppState.facturas || AppState.facturas.length === 0) { tabla.innerHTML = '<tr><td colspan="3" class="text-center">No hay ventas registradas</td></tr>'; return; }
    const ventas = {};
    AppState.facturas.forEach(f => {
        (f.items||[]).forEach(item => {
            const id = item.producto_id||item.id||`p${Math.random()}`;
            if (!ventas[id]) ventas[id] = { nombre: item.nombre||'Producto', cantidad:0, total:0 };
            ventas[id].cantidad += item.cantidad||0; ventas[id].total += item.subtotal||0;
        });
    });
    const ranking = Object.values(ventas).sort((a,b)=>b.cantidad-a.cantidad).slice(0,5);
    if (ranking.length === 0) { tabla.innerHTML = '<tr><td colspan="3" class="text-center">Sin datos de ventas</td></tr>'; return; }
    ranking.forEach((item, i) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td><span style="font-weight:bold;color:var(--color-primary);margin-right:8px;">${i+1}</span>${item.nombre}</td><td style="text-align:center;font-weight:bold;">${item.cantidad} und</td><td style="text-align:right;color:var(--color-success);font-weight:bold;">$${formatearMoneda(item.total)}</td>`;
        tabla.appendChild(tr);
    });
}

function renderizarAlertasInventario() {
    const cont = document.getElementById('listaAlertasReporte');
    if (!cont) return;
    cont.innerHTML = '';
    if (!AppState.inventario || AppState.inventario.length === 0) { cont.innerHTML = '<div style="text-align:center;padding:20px;color:#666;">No hay productos en inventario</div>'; return; }
    const criticos = AppState.inventario.filter(p => (p.cantidad||0) <= stockMinimo || esProductoEstancado(p)).sort((a,b)=>(a.cantidad||0)-(b.cantidad||0));
    if (criticos.length === 0) { cont.innerHTML = '<div style="text-align:center;padding:20px;color:#27ae60;">✅ Stock al día - No hay alertas</div>'; return; }
    criticos.forEach(prod => _renderAlerta(prod, cont));
}

function _renderAlerta(prod, cont) {
    const cantidad = prod.cantidad||0;
    const esEst = esProductoEstancado(prod);
    let texto = 'BAJO STOCK', fondo='#fff9e6', borde='#e67700', color='#e67700';
    if (cantidad === 0) { texto='AGOTADO'; fondo='#fff0f0'; borde='#c0392b'; color='#c0392b'; }
    else if (esEst) { texto='ESTANCADO'; fondo='#f3f0ff'; borde='#6741d9'; color='#6741d9'; }
    else if (cantidad <= 2) { texto='CRÍTICO'; }
    const div = document.createElement('div');
    div.style.cssText = `display:flex;justify-content:space-between;align-items:center;padding:15px;margin-bottom:10px;background:${fondo};border-radius:8px;border-left:5px solid ${borde};border:1px solid var(--color-border);`;
    div.innerHTML = `
        <div style="flex:1;"><strong style="font-size:1rem;color:var(--color-primary-dark);">${prod.nombre||'Producto'}</strong><div style="font-size:0.8rem;color:#666;margin-top:4px;">Ref: ${prod.referencia||'N/A'} | ${prod.categoria||'General'}</div></div>
        <div style="text-align:right;min-width:150px;"><div style="font-size:1.3rem;font-weight:bold;color:${color};">${cantidad} und</div><div style="margin-top:4px;"><span style="background:${fondo};color:${color};border:1px solid ${borde};padding:4px 12px;border-radius:20px;font-size:0.7rem;font-weight:bold;">${texto}</span></div></div>`;
    cont.appendChild(div);
}

// ============================================
// PARTE 12: FILTROS INVENTARIO
// ============================================
function configurarFiltros() {
    const si = document.getElementById('searchInventory'); if (si) si.addEventListener('input', function() { filtroActual.busqueda = this.value.toLowerCase(); aplicarFiltrosInventario(); });
    const fc = document.getElementById('filterCategory');  if (fc) { fc.addEventListener('change', function() { filtroActual.categoria = this.value; aplicarFiltrosInventario(); }); llenarSelectCategorias(); }
    const st = document.getElementById('searchTubos');    if (st) st.addEventListener('input', aplicarFiltrosTubos);
    const ft = document.getElementById('filterTuboType'); if (ft) ft.addEventListener('change', aplicarFiltrosTubos);
}

function llenarSelectCategorias() {
    const s = document.getElementById('filterCategory'); if (!s) return;
    const cats = [...new Set(AppState.inventario.filter(p=>p.categoria&&p.categoria!=='Tubos').map(p=>p.categoria))].sort();
    const va = s.value;
    s.innerHTML = '<option value="all">Todas las categorías</option>';
    cats.forEach(c => { const o = document.createElement('option'); o.value = c; o.textContent = c; s.appendChild(o); });
    if (va && va !== 'all') s.value = va;
}

function llenarSelectTubos() {
    const s = document.getElementById('filterTuboType'); if (!s) return;
    const mats = [...new Set(AppState.inventario.filter(p=>p.categoria==='Tubos'&&p.material).map(p=>p.material))].sort();
    const va = s.value;
    s.innerHTML = '<option value="all">Todos los tipos</option>';
    mats.forEach(m => { const o = document.createElement('option'); o.value = m; o.textContent = m; s.appendChild(o); });
    if (va && va !== 'all') s.value = va;
}

function aplicarFiltrosInventario() {
    const term = document.getElementById('searchInventory')?.value.toLowerCase()||'';
    const cat  = document.getElementById('filterCategory')?.value||'all';
    let f = AppState.inventario.filter(p => p.categoria !== 'Tubos');
    if (cat !== 'all') f = f.filter(p => p.categoria === cat);
    if (term) f = f.filter(p => (p.nombre||'').toLowerCase().includes(term)||(p.referencia||'').toLowerCase().includes(term)||(p.proveedor||'').toLowerCase().includes(term));
    const tabla = document.getElementById('fullInventoryTableBody');
    if (!tabla) return;
    tabla.innerHTML = '';
    if (f.length === 0) { tabla.innerHTML = '<tr><td colspan="10" class="text-center">No hay productos que coincidan</td></tr>'; return; }
    f.forEach(prod => _renderFilaProducto(prod, tabla, 'general'));
}

function aplicarFiltrosTubos() {
    const term = document.getElementById('searchTubos')?.value.toLowerCase()||'';
    const tipo = document.getElementById('filterTuboType')?.value||'all';
    let t = AppState.inventario.filter(p => p.categoria === 'Tubos');
    if (tipo !== 'all') t = t.filter(x => (x.material||'').toLowerCase() === tipo.toLowerCase());
    if (term) t = t.filter(x => (x.nombre||'').toLowerCase().includes(term)||(x.referencia||'').toLowerCase().includes(term)||(x.diametro||'').toLowerCase().includes(term)||(x.material||'').toLowerCase().includes(term));
    const tabla = document.getElementById('tubosTableBody');
    if (!tabla) return;
    tabla.innerHTML = '';
    if (t.length === 0) { tabla.innerHTML = '<tr><td colspan="12" class="text-center">No hay tubos que coincidan</td></tr>'; return; }
    t.forEach(tubo => {
        const tr = document.createElement('tr'); const cant = tubo.cantidad||0; const esEst = esProductoEstancado(tubo);
        let badge = '<span class="badge badge-success">Disponible</span>', rc = '';
        if (esEst) { badge = '<span class="badge badge-stagnant">Estancado</span>'; rc = 'stock-stagnant-ui'; }
        else if (cant === 0) { badge = '<span class="badge badge-danger">Agotado</span>'; }
        else if (cant <= stockMinimo) { badge = '<span class="badge badge-warning">Bajo Stock</span>'; rc = 'stock-alert-ui'; }
        if (rc) tr.className = rc;
        const sc = cant===0?'texto-stock-agotado':cant<=stockMinimo?'texto-stock-bajo':esEst?'texto-stock-estancado':'texto-stock-normal';
        tr.innerHTML = `<td>${tubo.referencia||'N/A'}</td><td><strong>${tubo.nombre||'Sin nombre'}</strong></td><td>${tubo.material||'N/A'}</td><td>${tubo.diametro||'N/A'}</td><td>${tubo.longitud||'N/A'}</td><td>${tubo.presion||'N/A'}</td><td>${tubo.proveedor||'N/A'}</td><td>${tubo.ubicacion||'N/A'}</td><td>$${formatearMoneda(tubo.precio_compra||0)} / $${formatearMoneda(tubo.precio_venta||0)}</td><td class="${sc}"><strong>${cant}</strong></td><td>${badge}</td><td><div class="acciones-tabla"><button class="btn-icon" onclick="prepararEdicionProducto(${tubo.id},'tubos')" title="Editar">✏️</button><button class="btn-icon" onclick="confirmarEliminarProducto(${tubo.id})" title="Eliminar">🗑️</button></div></td>`;
        tabla.appendChild(tr);
    });
}

// ============================================
// PARTE 13: EXPORTACIÓN CSV
// ============================================
function exportarInventarioExcel() {
    const prods = AppState.inventario.filter(p => p.categoria !== 'Tubos');
    if (prods.length === 0) { mostrarNotificacion('No hay productos para exportar', 'warning'); return; }
    let csv = "\uFEFFReferencia,Nombre,Categoría,Proveedor,Ubicación,Costo,Venta,Stock,Estado\n";
    prods.forEach(p => {
        const cant = p.cantidad||0; const esEst = esProductoEstancado(p);
        const est  = cant===0?'Agotado':esEst?'Estancado':cant<=stockMinimo?'Bajo Stock':'Disponible';
        csv += `"${p.referencia||''}","${p.nombre||''}","${p.categoria||'General'}","${p.proveedor||''}","${p.ubicacion||''}",${p.precio_compra||0},${p.precio_venta||0},${cant},"${est}"\n`;
    });
    _descargarCSV(csv, `inventario_${new Date().toISOString().slice(0,10)}.csv`);
    mostrarNotificacion(`✅ Exportados ${prods.length} productos`, 'success');
}

function exportarTubosExcel() {
    const tubos = AppState.inventario.filter(p => p.categoria === 'Tubos');
    if (tubos.length === 0) { mostrarNotificacion('No hay tubos para exportar', 'warning'); return; }
    let csv = "\uFEFFReferencia,Nombre,Material,Diámetro,Longitud,Presión,Proveedor,Ubicación,Costo,Venta,Stock,Estado\n";
    tubos.forEach(t => {
        const cant = t.cantidad||0; const esEst = esProductoEstancado(t);
        const est  = cant===0?'Agotado':esEst?'Estancado':cant<=stockMinimo?'Bajo Stock':'Disponible';
        csv += `"${t.referencia||''}","${t.nombre||''}","${t.material||''}","${t.diametro||''}","${t.longitud||''}","${t.presion||''}","${t.proveedor||''}","${t.ubicacion||''}",${t.precio_compra||0},${t.precio_venta||0},${cant},"${est}"\n`;
    });
    _descargarCSV(csv, `tubos_${new Date().toISOString().slice(0,10)}.csv`);
    mostrarNotificacion(`✅ Exportados ${tubos.length} tubos`, 'success');
}

function _descargarCSV(contenido, nombre) {
    const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.setAttribute('href', URL.createObjectURL(blob));
    link.setAttribute('download', nombre);
    link.style.visibility = 'hidden';
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
}

// ============================================
// PARTE 14: UTILIDADES GENERALES
// ============================================
function inicializarCategoriasModal() {
    const s = document.getElementById('prodCat'); if (!s) return;
    s.innerHTML = '<option value="">Seleccionar categoría...</option>';
    ['Herramientas','Electricidad','Grifería','Sanitarios','Pinturas','Tornillería','Seguridad','Tubos','Ferretería General']
        .forEach(cat => { const o = document.createElement('option'); o.value = cat; o.textContent = cat; s.appendChild(o); });
}

function formatearMoneda(valor) {
    return new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(valor);
}

function imprimirFactura(facturaId) { mostrarNotificacion('Función de impresión próximamente', 'info'); }

// ============================================
// PARTE 15: NOTIFICACIONES Y MODALES
// ============================================
if (!document.getElementById('toast-anims')) {
    const s = document.createElement('style'); s.id = 'toast-anims';
    s.textContent = '@keyframes tsIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}@keyframes tsOut{from{transform:translateX(0);opacity:1}to{transform:translateX(100%);opacity:0}}';
    document.head.appendChild(s);
}

function mostrarNotificacion(mensaje, tipo = 'info') {
    const t = document.createElement('div');
    const bg = tipo==='success'?'#27ae60':tipo==='error'?'#c0392b':tipo==='warning'?'#f39c12':'#3498db';
    t.style.cssText = `position:fixed;top:20px;right:20px;background:${bg};color:white;padding:15px 25px;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);z-index:10000;font-weight:500;min-width:250px;max-width:400px;animation:tsIn 0.3s ease;cursor:pointer;`;
    t.textContent = mensaje;
    document.body.appendChild(t);
    setTimeout(() => { t.style.animation = 'tsOut 0.3s ease'; setTimeout(() => t.remove(), 300); }, 3000);
    t.addEventListener('click', () => { t.style.animation = 'tsOut 0.3s ease'; setTimeout(() => t.remove(), 300); });
}

function mostrarConfirmacion(config) {
    mostrarModalPersonalizado({
        titulo: '⚠️ Confirmación',
        contenido: `<p style="text-align:center;font-size:1.1rem;">${config.mensaje}</p>`,
        botones: [
            { texto: 'Cancelar',   clase: 'btn-danger',  onClick: () => cerrarModalPersonalizado() },
            { texto: 'Confirmar',  clase: 'btn-success', onClick: () => { if (config.onConfirm) config.onConfirm(); cerrarModalPersonalizado(); } }
        ]
    });
}

function mostrarModalPersonalizado(config) {
    const modal = document.getElementById('modalNotificacion');
    if (!modal) return;
    if (modal.style.display === 'flex') modal.style.display = 'none';
    setTimeout(() => {
        const titulo    = document.getElementById('notificacionTitulo');
        const mensaje   = document.getElementById('notificacionMensaje');
        const contenido = document.getElementById('notificacionContenido');
        const icono     = document.getElementById('notificacionIcono');
        const bp        = document.getElementById('notificacionBtnPrimario');
        const bs        = document.getElementById('notificacionBtnSecundario');
        const bc        = modal.querySelector('.btn-close-modal');
        if (titulo)   titulo.textContent = config.titulo || '📢 Notificación';
        if (mensaje)  { mensaje.textContent = ''; mensaje.style.display = 'none'; }
        if (icono)    icono.style.display = 'none';
        if (bp)       bp.style.display   = 'none';
        if (bs)       bs.style.display   = 'none';
        if (contenido) { contenido.innerHTML = config.contenido || ''; contenido.style.display = 'block'; }
        if (bc) { const nb = bc.cloneNode(true); bc.parentNode.replaceChild(nb, bc); nb.onclick = e => { e.preventDefault(); e.stopPropagation(); cerrarModalPersonalizado(); }; }
        const footer = modal.querySelector('.modal-footer');
        if (footer) {
            footer.innerHTML = '';
            (config.botones || []).forEach(b => {
                const btn = document.createElement('button');
                btn.className = `btn-action ${b.clase||''}`; btn.textContent = b.texto;
                btn.onclick = e => { e.preventDefault(); e.stopPropagation(); b.onClick(); };
                footer.appendChild(btn);
            });
        }
        modal.style.display = 'flex';
    }, 50);
}

function cerrarModalPersonalizado() {
    const m = document.getElementById('modalNotificacion');
    if (m) { m.style.display = 'none'; const c = document.getElementById('notificacionContenido'); if (c) c.innerHTML = ''; }
}
function cerrarModalNotificacion() { cerrarModalPersonalizado(); }

// ============================================
// EVENTOS GLOBALES E INICIO
// ============================================
window.onclick = function(event) {
    if (event.target.classList.contains('modal-overlay')) event.target.style.display = 'none';
};

document.addEventListener('DOMContentLoaded', inicializarAplicacion);

// Exportar al scope global
[
    'agregarAlCarrito','procesarVenta','limpiarCarrito','eliminarDelCarrito','modificarCantidadCarrito',
    'toggleFechaCartera','toggleCamposCliente','abrirModalProducto','guardarProducto','cerrarModal',
    'prepararEdicionProducto','confirmarEliminarProducto','abrirModalProveedor','prepararEdicionProveedor',
    'guardarProveedor','cerrarModalProv','eliminarProveedor','verDetalleProveedor','abrirModalAbono',
    'registrarAbono','verHistorialCliente','solicitarRetiroAhorro','abrirModalAbonoAhorro',
    'mostrarDetalleFacturaModal','imprimirFactura','imprimirFacturaPDF','generarVentanaImpresion',
    'cerrarModalNotificacion','cerrarModalPersonalizado','cerrarSesion','exportarInventarioExcel',
    'exportarTubosExcel','exportarReporteExcel','esProductoEstancado','aplicarFiltrosTubos',
    'abrirModalCliente','cerrarModalCliente','guardarCliente','cambiarTipoReporte',
    'limpiarFiltrosReporte','verDetalleReporte'
].forEach(fn => { try { if (typeof eval(fn) === 'function') window[fn] = eval(fn); } catch(e){} });

console.log('✅ FerreControl modo local cargado correctamente');

// Hecho Por:
// Cristian Esteban Ruiz Parra Identificado con 1021673281
