sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/UIComponent",
    "sap/ui/core/routing/History",
    "sap/ui/core/Fragment",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "mundial/model/formatter" 
], function (Controller, UIComponent, History, Fragment, JSONModel, MessageBox, MessageToast, formatter) {
    "use strict";

    return Controller.extend("mundial.controller.Detalle", {

        formatter: formatter, 

        /* ==================================================================
         * CICLO DE VIDA
         * ================================================================== */

        onInit: function () {
            // Modelo local de ESTADO DE PANTALLA (no de negocio).
            this.getView().setModel(new JSONModel({
                tituloDialog: "",
                modo:         "",     // "crear" | "editar"
                jugador:      { nombre: "", dorsal: "", posicion: "MED" }
            }), "ui");

            UIComponent.getRouterFor(this)
                .getRoute("RouteDetalle")
                .attachPatternMatched(this._onObjectMatched, this);
        },

        _onObjectMatched: function (oEvent) {
            // Lo guardamos: el CREATE lo necesita
            this._sSeleccionId = oEvent.getParameter("arguments").seleccionId;

            this.getView().bindElement({
                path: "/Selecciones(" + this._formatKey(this._sSeleccionId) + ")"
            });
        },

        /* ==================================================================
         * ABRIR EL DIÁLOGO
         * ================================================================== */

        onNuevoJugador: function () {
            var oUi = this.getView().getModel("ui");

            oUi.setProperty("/modo",         "crear");
            oUi.setProperty("/tituloDialog", this._txt("dlgNuevo"));
            oUi.setProperty("/jugador",      { nombre: "", dorsal: "", posicion: "MED" });

            // Guardamos el contexto que se va a editar (null al crear)
            this._oContextEdicion = null;

            this._getDialog().then(function (oDialog) { oDialog.open(); });
        },

        onEditarJugador: function (oEvent) {
            // ⭐ El botón hereda el binding context de su fila.
            //    En V4 el Context NO es solo un puntero: es un objeto
            //    que sabe modificarse y borrarse a sí mismo.
            var oContext = oEvent.getSource().getBindingContext();
            var oDatos   = oContext.getObject();
            var oUi      = this.getView().getModel("ui");

            oUi.setProperty("/modo",         "editar");
            oUi.setProperty("/tituloDialog", this._txt("dlgEditar"));

            // COPIA, no referencia: si el usuario cancela, el
            // modelo OData queda intacto.
            oUi.setProperty("/jugador", {
                nombre:   oDatos.nombre,
                dorsal:   oDatos.dorsal,
                posicion: oDatos.posicion
            });

            // Guardamos el CONTEXTO, no el path.
            // En V4 el contexto es lo que sabe actualizarse.
            this._oContextEdicion = oContext;

            this._getDialog().then(function (oDialog) { oDialog.open(); });
        },

        /* ==================================================================
         * GUARDAR — acá está la diferencia real con V2
         * ================================================================== */

        onGuardarJugador: async function () {
            var oUi    = this.getView().getModel("ui");
            var oDatos = oUi.getProperty("/jugador");

            // Validación de UX. La de verdad está en service.js.
            if (!oDatos.nombre) {
                MessageBox.warning(this._txt("msgNombreObligatorio"));
                return;
            }

            try {
                if (oUi.getProperty("/modo") === "crear") {
                    await this._crearJugador(oDatos);
                    MessageToast.show(this._txt("msgCreado"));
                } else {
                    await this._modificarJugador(oDatos);
                    MessageToast.show(this._txt("msgModificado"));
                }
                this._cerrarDialog();

            } catch (oError) {
                MessageBox.error(this._extraerMensaje(oError));
            }
        },

        /**
         * CREATE en V4.
         *
         * V2:  oModel.create("/JugadorSet", datos, { success, error })
         * V4:  oBinding.create(datos)  →  devuelve un Context
         *
         * Se crea SOBRE EL BINDING de la tabla, que es relativo a
         * {jugadores}. UI5 postea a /Selecciones('111')/jugadores,
         * así que la fila aparece sola en la tabla: no hace falta refresh.
         */
        _crearJugador: function (oDatos) {
            var oBinding = this.byId("tablaJugadores").getBinding("items");

            // NO mandamos jugadorId: lo genera el handler de service.js
            var oContext = oBinding.create({
                seleccionId: this._sSeleccionId,
                nombre:      oDatos.nombre,
                dorsal:      oDatos.dorsal,
                posicion:    oDatos.posicion
            });

            // created() es una PROMESA que se resuelve cuando el POST
            // termina bien, y se rechaza si falla. Es el equivalente
            // de los callbacks { success, error } de V2.
            return oContext.created();
        },

        /**
         * UPDATE en V4.
         *
         * V2:  oModel.update(path, entidadCompleta, { success, error })
         * V4:  oContext.setProperty(campo, valor)  →  PATCH
         *
         * Con updateGroupId "$auto", los setProperty del mismo turno
         * se agrupan en UN SOLO PATCH con los campos cambiados.
         */
        _modificarJugador: function (oDatos) {
            var oCtx = this._oContextEdicion;

            return Promise.all([
                oCtx.setProperty("nombre",   oDatos.nombre),
                oCtx.setProperty("dorsal",   oDatos.dorsal),
                oCtx.setProperty("posicion", oDatos.posicion)
            ]);
        },

        /* ==================================================================
         * BORRAR
         * ================================================================== */

        onBorrarJugador: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext();
            var sNombre  = oContext.getProperty("nombre");
            var that     = this;

            // Toda acción destructiva se confirma. Siempre.
            MessageBox.confirm(
                this._txt("msgConfirmarBorrado", [sNombre]),
                {
                    title: this._txt("tituloConfirmar"),
                    onClose: async function (sAccion) {
                        if (sAccion !== MessageBox.Action.OK) { return; }

                        try {
                            // V2:  oModel.remove(path, { success, error })
                            // V4:  oContext.delete()  →  promesa
                            //      El contexto se borra a sí mismo y
                            //      desaparece de la tabla solo.
                            await oContext.delete();
                            MessageToast.show(that._txt("msgBorrado"));
                        } catch (oError) {
                            MessageBox.error(that._extraerMensaje(oError));
                        }
                    }
                }
            );
        },

        /* ==================================================================
         * DIÁLOGO
         * ================================================================== */

        _getDialog: function () {
            // Se carga UNA vez y se cachea la promesa.
            // Si lo cargás en cada apertura, acumulás diálogos en el DOM.
            if (!this._pDialog) {
                this._pDialog = Fragment.load({
                    id:         this.getView().getId(),
                    name:       "mundial.view.JugadorDialog",
                    controller: this
                }).then(function (oDialog) {
                    // addDependent conecta el diálogo al ciclo de vida de
                    // la vista y le pasa sus modelos.
                    // SIN ESTO, {ui>...} e {i18n>...} no resuelven nada.
                    this.getView().addDependent(oDialog);
                    return oDialog;
                }.bind(this));
            }
            return this._pDialog;
        },

        onCancelarDialog: function () {
            this._cerrarDialog();
        },

        _cerrarDialog: function () {
            this._getDialog().then(function (oDialog) { oDialog.close(); });
        },

        /* ==================================================================
         * UTILITARIOS
         * ================================================================== */

        onNavBack: function () {
            if (History.getInstance().getPreviousHash() !== undefined) {
                window.history.go(-1);
            } else {
                UIComponent.getRouterFor(this).navTo("RouteSelecciones", {}, true);
            }
        },

        /**
         * Formatea un valor como clave OData tipo String.
         * Es lo que oModel.createKey() hacía en V2.
         */
        _formatKey: function (sValue) {
            return "'" + String(sValue).replace(/'/g, "''") + "'";
        },

        /**
         * Atajo para leer textos del bundle i18n.
         */
        _txt: function (sKey, aArgs) {
            return this.getOwnerComponent()
                       .getModel("i18n")
                       .getResourceBundle()
                       .getText(sKey, aArgs);
        },

        /**
         * Extrae el mensaje que puso req.error() en service.js.
         */
        _extraerMensaje: function (oError) {
            console.error("Error crudo:", oError);

            // UI5 v4 suele traer el mensaje ya parseado
            if (oError && oError.message) {
                // A veces viene con el JSON completo embebido
                try {
                    var oJson = JSON.parse(oError.message);
                    if (oJson.error && oJson.error.message) {
                        return oJson.error.message;
                    }
                } catch (e) { /* no era JSON, usamos el message tal cual */ }
                return oError.message;
            }
            return "Ocurrió un error inesperado. Revisá la consola.";
        }

    });
});