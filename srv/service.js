const cds = require('@sap/cds');

// Traducción de valor técnico → valor de presentación.
// En una app real esto saldría de una entidad de textos con
// 'localized', no de un objeto hardcodeado.
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
module.exports = class MundialService extends cds.ApplicationService {

    init() {

        // SIEMPRE PRIMERO. Todo lo de abajo depende de estas constantes.
        // Con const/let, usarlas antes de esta línea tira
        // "Cannot access 'X' before initialization" (temporal dead zone).
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

                    // ── Paso 2 del ejercicio (para ver el error) ──
                    // Descomentar esto y comentar lo de arriba:
                    // fila.confederacion = CONFEDERACIONES[fila.confederacion]
                    //                   || fila.confederacion;
                    // Resultado: la tabla muestra "Europa" pero el
                    // FilterBar sigue mandando 'UEFA'. Y si alineás el
                    // Select a "Europa", el $filter busca un valor que
                    // no existe en la base → cero resultados.
                }
            });
        });

        /* ==============================================================
         * CREATE de Jugadores
         * Equivale a JUGADORSET_CREATE_ENTITY
         * ============================================================== */
        this.before('CREATE', Jugadores, async (req) => {

            const datos = req.data;

            // ---- 1. Validaciones de negocio -------------------------
            // SIEMPRE en el backend, aunque el front también valide:
            // el front se puede saltear con curl o Postman.
            if (!datos.nombre) {
                // req.error acumula el error y devuelve HTTP 400.
                // El 3er argumento marca QUÉ campo falló: UI5 lo usa
                // para resaltar el input correspondiente.
                return req.error(400, 'El nombre es obligatorio', 'nombre');
            }

            if (!datos.seleccionId) {
                return req.error(400, 'Debe indicar la selección', 'seleccionId');
            }

            // Integridad referencial a nivel aplicación
            const seleccion = await SELECT.one
                .from(Selecciones)
                .where({ seleccionId: datos.seleccionId });

            if (!seleccion) {
                return req.error(400, 'La selección indicada no existe', 'seleccionId');
            }

            // ---- 2. Generar el próximo jugadorId --------------------
            // Solo si el cliente no lo mandó.
            if (!datos.jugadorId) {

                // SELECT MAX(jugadorId) — el mismo enfoque que en ABAP
                const fila = await SELECT.one
                    .from(Jugadores)
                    .columns('max(jugadorId) as maxId');

                const siguiente = Number(fila?.maxId || 0) + 1;

                if (siguiente > 999999) {
                    return req.error(400, 'Se agotó el rango de IDs de jugador');
                }

                // ACÁ está la diferencia con NUMC.
                // En ABAP asignabas un entero a un NUMC(6) y el relleno
                // con ceros era automático. En CDS el campo es String(6),
                // así que el padding lo hacemos a mano.
                datos.jugadorId = String(siguiente).padStart(6, '0');
            }
        });

        /* ==============================================================
         * UPDATE de Jugadores
         * Equivale a JUGADORSET_UPDATE_ENTITY
         * ============================================================== */
        this.before('UPDATE', Jugadores, (req) => {

            // OJO: en un PATCH, req.data trae SOLO los campos enviados.
            // Por eso validamos únicamente si el campo viene informado.
            // Si el cliente no manda "nombre", no lo está cambiando.
            if ('nombre' in req.data && !req.data.nombre) {
                return req.error(400, 'El nombre es obligatorio', 'nombre');
            }
        });

        // OBLIGATORIO: registra los handlers del framework.
        // Si te lo olvidás, el servicio no responde nada.
        return super.init();
    }
};