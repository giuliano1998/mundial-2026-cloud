const cds = require('@sap/cds');

const CONFEDERACIONES = {
    UEFA:     'Europa',
    CONMEBOL: 'Sudamérica',
    CONCACAF: 'Norte y Centroamérica',
    CAF:      'África',
    AFC:      'Asia',
    OFC:      'Oceanía'
};

/**
 * Lógica de negocio del MundialService.
 * Equivale a la clase ZCL_ZGR_MUNDIAL_DPC_EXT del track on-premise.
 *
 * CAP detecta este archivo por convención de nombre:
 * srv/service.js  se asocia a  srv/service.cds
 */
/**
 * Normaliza el dorsal antes de compararlo y de guardarlo.
 * "1", " 1 " y "01" son EL MISMO dorsal: si no se normaliza, la validación
 * de unicidad compara strings distintos y deja pasar duplicados.
 * Devuelve el dorsal como String(2) con cero a la izquierda, o null si no es válido.
 */
function normalizarDorsal(valor) {
    if (valor === undefined || valor === null) return null;
    const texto = String(valor).trim();
    if (!/^[0-9]{1,2}$/.test(texto)) return null;
    const numero = Number(texto);
    if (numero < 1 || numero > 99) return null;
    return String(numero).padStart(2, '0');
}

module.exports = class MundialService extends cds.ApplicationService {

    init() {

       // Va primero: con const, usarlas antes de esta línea tira
       // "Cannot access 'X' before initialization".
       
        const { Jugadores, Selecciones } = this.entities;

        /* ==============================================================
         * READ de Selecciones — transformación de salida
         *
         * after: el dato YA se leyó de la base. Acá solo se modifica
         * el resultado antes de serializarlo a OData.
         *
         * En ABAP esto habría sido redefinir GET_ENTITYSET ENTERO.
         * Acá son 6 líneas: el SELECT, el $filter, el $orderby y el
         * paginado los sigue haciendo CAP.
         * ============================================================== */
        this.after('READ', Selecciones, (data) => {

            // El handler recibe un ARRAY en lecturas de colección
            // y un OBJETO en lecturas de una entidad (/Selecciones('111')).
            // Sin esta normalización, el deep-link revienta.
            const filas = Array.isArray(data) ? data : [data];

            filas.forEach((fila) => {
                // Guarda defensiva: con autoExpandSelect, si la vista
                // no usa 'confederacion' el campo directamente no viene.
                if (fila && fila.confederacion) {

                    // Se LLENA un campo virtual nuevo. NO se pisa
                    // 'confederacion': el valor técnico queda intacto
                    // para que el $filter y el $orderby sigan andando.
                    fila.confederacionTexto = CONFEDERACIONES[fila.confederacion]
                                           || fila.confederacion;
                }
            });
        });

        /* ==============================================================
         * CREATE de Jugadores
         * Equivale a JUGADORSET_CREATE_ENTITY
         * ============================================================== */
        this.before('CREATE', Jugadores, async (req) => {

            const datos = req.data;

            // ---- 1. Validaciones de obligatoriedad ------------------
            // SIEMPRE en el backend, aunque el front también valide:
            // el front se puede saltear con curl o Postman.
            // Los espacios no son un nombre: sin trim, "   " pasaba la validación.
            if (typeof datos.nombre === 'string') datos.nombre = datos.nombre.trim();

            if (!datos.nombre) {
                // El 3er argumento marca QUÉ campo falló: UI5 lo usa
                // para resaltar el input correspondiente.
                return req.error(400, 'El nombre es obligatorio', 'nombre');
            }

            if (!datos.seleccionId) {
                return req.error(400, 'Debe indicar la selección', 'seleccionId');
            }

            // ---- 2. Integridad referencial --------------------------
            const seleccion = await SELECT.one
                .from(Selecciones)
                .where({ seleccionId: datos.seleccionId });

            if (!seleccion) {
                return req.error(400, 'La selección indicada no existe', 'seleccionId');
            }

            // ---- 3. El dorsal no puede estar ocupado ----------------
            // LA validación que no se puede hacer en el front: requiere
            // conocer el estado actual de la base.
            // Va acá, al nivel de las demás: si estuviera dentro del if
            // de generación de ID, un POST que mande jugadorId se la
            // saltearía entera.
            // ---- 3.a Normalización: el dorsal se guarda SIEMPRE como String(2)
            // ("1" -> "01"). Sin esto conviven "1" y "01" en la misma selección
            // y la validación de unicidad no sirve para nada.
            datos.dorsal = normalizarDorsal(datos.dorsal);
            if (!datos.dorsal) {
                return req.error(400, 'El dorsal es obligatorio y debe ser un número entre 1 y 99', 'dorsal');
            }

            if (datos.dorsal) {

                // Los DOS campos en el where: el 10 puede existir en
                // Brasil y en Argentina a la vez. La unicidad es de
                // la COMBINACIÓN, no del dorsal solo.
                const ocupado = await SELECT.one
                    .from(Jugadores)
                    .where({
                        seleccionId: datos.seleccionId,
                        dorsal:      datos.dorsal
                    });

                if (ocupado) {
                    // El mensaje dice QUIÉN lo tiene: ya tenemos el
                    // registro en la mano, no cuesta una query extra.
                    return req.error(
                        400,
                        `El dorsal ${datos.dorsal} no está disponible: ya lo usa ${ocupado.nombre}`,
                        'dorsal'
                    );
                }
            }

            // ---- 4. Generar el próximo jugadorId --------------------
            // Solo si el cliente no lo mandó.
            if (!datos.jugadorId) {

                // SELECT MAX(jugadorId) — el mismo enfoque que en ABAP.
                // Caveat: no soporta concurrencia y reutiliza IDs tras
                // un borrado. En productivo iría UUID o secuencia.
                const fila = await SELECT.one
                    .from(Jugadores)
                    .columns('max(jugadorId) as maxId');

                const siguiente = Number(fila?.maxId || 0) + 1;

                if (siguiente > 999999) {
                    return req.error(400, 'Se agotó el rango de IDs de jugador');
                }

                // ACÁ está la diferencia con NUMC.
                // En ABAP se asignaba un entero a un NUMC(6) y el relleno
                // con ceros era automático. En CDS el campo es String(6),
                // así que el padding lo hacemos a mano.
                datos.jugadorId = String(siguiente).padStart(6, '0');
            }
        });

        /* ==============================================================
         * UPDATE de Jugadores
         * Equivale a JUGADORSET_UPDATE_ENTITY
         *
         * async porque ahora consulta la base para la unicidad.
         * ============================================================== */
        this.before('UPDATE', Jugadores, async (req) => {

            // OJO: en un PATCH, req.data trae SOLO los campos enviados.
            // Por eso se valida únicamente si el campo viene informado.
            if (typeof req.data.nombre === 'string') req.data.nombre = req.data.nombre.trim();
            if ('nombre' in req.data && !req.data.nombre) {
                return req.error(400, 'El nombre es obligatorio', 'nombre');
            }

            if ('dorsal' in req.data) {

                // Misma normalización que en el CREATE: si no, el chequeo compara
                // "1" contra "01" y deja pasar el duplicado.
                req.data.dorsal = normalizarDorsal(req.data.dorsal);
                if (!req.data.dorsal) {
                    return req.error(400, 'El dorsal es obligatorio y debe ser un número entre 1 y 99', 'dorsal');
                }

                // req.params trae las claves de la URL:
                // /Jugadores(jugadorId='000004',seleccionId='111')
                // Es un array: el último elemento es la entidad que se toca.
                const claves = req.params[req.params.length - 1];

                const ocupado = await SELECT.one
                    .from(Jugadores)
                    .where({
                        seleccionId: claves.seleccionId,
                        dorsal:      req.data.dorsal
                    });

                // El !== es lo que hace que esto funcione: si el
                // "ocupado" es él mismo, no hay conflicto. Sin esta
                // condición, guardar sin cambiar el dorsal falla
                // diciendo que el dorsal lo usa... él mismo.
                if (ocupado && ocupado.jugadorId !== claves.jugadorId) {
                    return req.error(
                        400,
                        `El dorsal ${req.data.dorsal} no está disponible: ya lo usa ${ocupado.nombre}`,
                        'dorsal'
                    );
                }
            }
        });

        // Sin esto el servicio no responde nada.
        return super.init();
    }
};

