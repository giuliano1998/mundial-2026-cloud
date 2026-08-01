const cds = require('@sap/cds');

/**
 * Lógica de negocio del MundialService.
 * Equivale a la clase ZCL_ZGR_MUNDIAL_DPC_EXT del track on-premise.
 *
 * CAP detecta este archivo por convención de nombre:
 * srv/service.js  se asocia a  srv/service.cds
 */
module.exports = class MundialService extends cds.ApplicationService {

    init() {

        // Las entidades del servicio, desestructuradas del modelo
        const { Jugadores, Selecciones } = this.entities;

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