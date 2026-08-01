sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/UIComponent",
    "sap/ui/core/routing/History"
], function (Controller, UIComponent, History) {
    "use strict";

    return Controller.extend("mundial.controller.Detalle", {

        /* ==================================================================
         * CICLO DE VIDA
         * ================================================================== */

        onInit: function () {
            // Nos suscribimos al evento "esta ruta matcheó".
            //
            //  El binding NO va acá. onInit corre UNA sola vez, cuando
            //    la vista se crea. Si volvés atrás y entrás a otra selección,
            //    UI5 REUSA la misma instancia de vista y onInit no se repite.
            //    patternMatched sí se dispara en cada navegación.
            UIComponent.getRouterFor(this)
                .getRoute("RouteDetalle")
                .attachPatternMatched(this._onObjectMatched, this);
        },

        /**
         * Se dispara cada vez que la ruta RouteDetalle matchea.
         */
        _onObjectMatched: function (oEvent) {
            // 1. Leer el parámetro definido en el patrón del manifest.
            var sId = oEvent.getParameter("arguments").seleccionId;

            // 2. Armar el path OData.
            //    En V4 no existe createKey: lo construimos a mano.
            var sPath = "/Selecciones(" + this._formatKey(sId) + ")";

            // 3. Element binding: fija el CONTEXTO de toda la vista.
            //    Desde acá, {nombre} y {jugadores} se resuelven relativos.
            this.getView().bindElement({
                path: sPath,
                events: {
                    // Si la selección no existe (ej. #/seleccion/999),
                    // dataReceived llega con el contexto vacío.
                    dataReceived: function (oEv) {
                        var oCtx = this.getView().getBindingContext();
                        if (!oCtx || !oCtx.getObject()) {
                            console.warn("Selección no encontrada:", sId);
                        }
                    }.bind(this)
                }
            });
        },

        /* ==================================================================
         * NAVEGACIÓN
         * ================================================================== */

        onNavBack: function () {
            var sPrevHash = History.getInstance().getPreviousHash();

            if (sPrevHash !== undefined) {
                // Hay historial real → back del navegador (conserva scroll)
                window.history.go(-1);
            } else {
                // Entraron por link directo → vamos a la lista y REEMPLAZAMOS
                // el hash (true) para no dejar basura en el historial.
                UIComponent.getRouterFor(this).navTo("RouteSelecciones", {}, true);
            }
        },

        /* ==================================================================
         * UTILITARIOS
         * ================================================================== */

        /**
         * Formatea un valor como clave OData tipo String.
         * Es lo que oModel.createKey() hacía por nosotros en V2.
         *
         * En OData, una comilla simple dentro de un valor se escapa
         * DUPLICÁNDOLA:  O'Brien  →  'O''Brien'
         *
         * @param {string} sValue el valor de la clave
         * @returns {string} el valor entre comillas y escapado
         */
        _formatKey: function (sValue) {
            return "'" + String(sValue).replace(/'/g, "''") + "'";
        }

    });
});