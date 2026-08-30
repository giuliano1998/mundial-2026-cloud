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
            this.getView().setModel(new JSONModel({
                tituloDialog: "",
                modo:         "",
                jugador:      { nombre: "", dorsal: "", posicion: "MED" }
            }), "ui");

            UIComponent.getRouterFor(this)
                .getRoute("RouteDetalle")
                .attachPatternMatched(this._onObjectMatched, this);
        },

        _onObjectMatched: function (oEvent) {
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

            this._oContextEdicion = null;

            this._getDialog().then(function (oDialog) { oDialog.open(); });
        },

        onEditarJugador: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext();
            var oDatos   = oContext.getObject();
            var oUi      = this.getView().getModel("ui");

            oUi.setProperty("/modo",         "editar");
            oUi.setProperty("/tituloDialog", this._txt("dlgEditar"));

            oUi.setProperty("/jugador", {
                nombre:   oDatos.nombre,
                dorsal:   oDatos.dorsal,
                posicion: oDatos.posicion
            });

            this._oContextEdicion = oContext;

            this._getDialog().then(function (oDialog) { oDialog.open(); });
        },

        /* ==================================================================
         * GUARDAR
         * ================================================================== */

        onGuardarJugador: async function () {
            var oUi    = this.getView().getModel("ui");
            var oDatos = oUi.getProperty("/jugador");

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
         * CREATE 
         */
        _crearJugador: function (oDatos) {
            var that     = this;
            var oBinding = this.byId("tablaJugadores").getBinding("items");
            var oMM      = sap.ui.getCore().getMessageManager();

            // OJO: en OData V4, si el POST falla, oContext.created() NO se rechaza:
            // el modelo reintenta el alta solo y la promesa queda pendiente para
            // siempre. El evento que sí avisa del fallo es createCompleted.
            return new Promise(function (fnResolve, fnReject) {

                // Foto de los mensajes previos, para quedarnos solo con el que
                // deje ESTE alta y no con el error de un intento anterior.
                var aPrevios = oMM.getMessageModel().getData().slice();

                var fnCompletado = function (oEvent) {
                    oBinding.detachCreateCompleted(fnCompletado);

                    if (oEvent.getParameter("success")) {
                        // El contexto recién creado conserva los datos que mandó el
                        // cliente ("9"); refrescamos para mostrar lo que quedó en
                        // la base ("09") y evitar la fila repetida.
                        fnResolve();

                        // El refresh va en el proximo tick: si se lanza acá, el alta
                        // todavía figura como cambio pendiente y refresh() tira error.
                        setTimeout(function () {
                            try { oBinding.refresh(); } catch (oIgnorado) { /* la lista ya está al día */ }
                        }, 0);
                        return;
                    }

                    // El mensaje del backend se lee ANTES de limpiar, porque
                    // resetChanges() se lleva puestos los mensajes del alta.
                    var sMensaje = that._mensajeDelAlta(aPrevios);

                    // Cancela el alta pendiente: sin esto la fila fantasma queda
                    // en la tabla y V4 reintenta el POST una y otra vez.
                    oBinding.resetChanges();

                    fnReject(new Error(sMensaje));
                };

                oBinding.attachCreateCompleted(fnCompletado);

                var oContext = oBinding.create({
                    seleccionId: that._sSeleccionId,
                    nombre:      oDatos.nombre,
                    dorsal:      oDatos.dorsal,
                    posicion:    oDatos.posicion
                });

                // Al cancelar el alta, created() se rechaza con canceled = true.
                // Lo tragamos para no dejar una promesa rechazada sin manejar.
                oContext.created().catch(function () { /* cancelado a proposito */ });
            });
        },

        /**
         * Mensaje que dejó el backend para ESTE alta.
         * Los errores de un POST de V4 llegan al Message Manager, no a la promesa.
         */
        _mensajeDelAlta: function (aPrevios) {
            var aTodos   = sap.ui.getCore().getMessageManager().getMessageModel().getData() || [];
            var aNuevos  = aTodos.filter(function (oMsg) { return aPrevios.indexOf(oMsg) === -1; });
            var oMensaje = aNuevos[aNuevos.length - 1];

            if (oMensaje) {
                return oMensaje.message || (oMensaje.getMessage && oMensaje.getMessage()) || "";
            }
            return "No se pudo crear el jugador.";
        },

        /**
         * UPDATE 
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

            MessageBox.confirm(
                this._txt("msgConfirmarBorrado", [sNombre]),
                {
                    title: this._txt("tituloConfirmar"),
                    onClose: async function (sAccion) {
                        if (sAccion !== MessageBox.Action.OK) { return; }

                        try {
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
            if (!this._pDialog) {
                this._pDialog = Fragment.load({
                    id:         this.getView().getId(),
                    name:       "mundial.view.JugadorDialog",
                    controller: this
                }).then(function (oDialog) {
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

        _formatKey: function (sValue) {
            return "'" + String(sValue).replace(/'/g, "''") + "'";
        },

        _txt: function (sKey, aArgs) {
            return this.getOwnerComponent()
                       .getModel("i18n")
                       .getResourceBundle()
                       .getText(sKey, aArgs);
        },

        _extraerMensaje: function (oError) {
            console.error("Error crudo:", oError);

            if (oError && oError.message) {
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