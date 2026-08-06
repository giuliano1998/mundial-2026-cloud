sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/UIComponent",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/core/Fragment",
    "sap/ui/model/json/JSONModel",
    "mundial/model/formatter"
], function (Controller, UIComponent, Filter, FilterOperator, Fragment, JSONModel, formatter) {
    "use strict";

    return Controller.extend("mundial.controller.Selecciones", {

        formatter: formatter,

        /* ==============================================================
         * FILTRADO
         * ============================================================== */

        /**
         * Se dispara SOLO al apretar "Ir" (o Enter en el input).
         * Acá se lee el estado de los controles y sale UNA request.
         */
        onBuscar: function () {
            var aFilters = [];

            var sConfederacion = this.byId("filtroConfederacion").getSelectedKey();
            var sNombre        = this.byId("filtroNombre").getValue();

            // Solo se agrega el filtro si hay valor.
            // Array vacío = sin filtros = traer todo.
            if (sConfederacion) {
                aFilters.push(new Filter("confederacion", FilterOperator.EQ, sConfederacion));
            }

            if (sNombre) {
                // toUpperCase(): los datos están en mayúsculas y en HANA
                // el LIKE es case sensitive (en SQLite no: cuidado con eso).
                aFilters.push(new Filter("nombre", FilterOperator.Contains, sNombre.toUpperCase()));
            }

            // Varios Filter sueltos en un array se combinan con AND.
            this.byId("tablaSelecciones").getBinding("items").filter(aFilters);
        },

        /**
         * Botón "Borrar" del FilterBar. Limpia los controles Y el binding:
         * si solo limpiás los controles, la tabla queda filtrada y el
         * usuario no entiende por qué faltan registros.
         */
        onLimpiarFiltros: function () {
            this.byId("filtroConfederacion").setSelectedKey("");
            this.byId("filtroNombre").setValue("");
            this.byId("tablaSelecciones").getBinding("items").filter([]);
        },

        /* ==============================================================
         * GRÁFICO DE DISTRIBUCIÓN
         * ============================================================== */

        /**
         * Abre el diálogo con la distribución por confederación.
         *
         * El GROUP BY lo hace la BASE: la entidad DistribucionConfederaciones
         * devuelve 4 filas, no 50.000. Acá solo se leen esas 4.
         *
         * ¿Por qué se pasa por un JSONModel en vez de bindear el VizFrame
         * directo al OData? Porque sap.viz es de la generación OData V2:
         * su FlattenedDataset no resuelve los bindings de un
         * ODataListBinding V4. El síntoma es un gráfico VACÍO SIN ERROR,
         * y la pista está en el log: la request sale sin $select, porque
         * UI5 nunca reconoció las propiedades bindeadas del dataset.
         */
        onVerPorcentajes: async function () {
            try {
                // bindList: una lista "suelta" sobre el modelo OData,
                // no atada a ningún control de la vista.
                var oBinding  = this.getView().getModel()
                                    .bindList("/DistribucionConfederaciones");
                var aContexts = await oBinding.requestContexts(0, 100);

                // getObject() devuelve el objeto plano de cada fila.
                var aDatos = aContexts.map(function (oCtx) {
                    return oCtx.getObject();
                });

                // El porcentaje NO se puede calcular en el GROUP BY:
                // cada fila no conoce el total del conjunto. Se resuelve
                // acá, sobre las 4 filas ya agregadas.
                var iTotal = aDatos.reduce(function (acc, o) {
                    return acc + (o.cantidad || 0);
                }, 0);

                var aGrafico = aDatos.map(function (o) {
                    return {
                        confederacion: o.confederacion,
                        cantidad:      o.cantidad,
                        porcentaje:    iTotal > 0
                            ? Math.round((o.cantidad / iTotal) * 100)
                            : 0
                    };
                });

                this.getView().setModel(new JSONModel({ datos: aGrafico }), "grafico");

                var oDialog = await this._getDialogGrafico();
                oDialog.open();

            } catch (oError) {
                // Nunca dejar un catch mudo: sin este log, un fallo
                // en el binding se traduce en "no pasa nada" al hacer click.
                console.error("Error al armar el gráfico:", oError);
            }
        },

        /**
         * Carga el fragment UNA vez y cachea la promesa.
         * Sin cachear, cada click deja un diálogo colgado en el DOM.
         */
        _getDialogGrafico: function () {
            if (!this._pDialogGrafico) {
                this._pDialogGrafico = Fragment.load({
                    id:         this.getView().getId(),
                    name:       "mundial.view.GraficoDialog",
                    controller: this
                }).then(function (oDialog) {
                    // Sin addDependent el fragment no ve los modelos
                    // de la vista: ni el OData ni el i18n.
                    this.getView().addDependent(oDialog);
                    return oDialog;
                }.bind(this));
            }
            return this._pDialogGrafico;
        },

        onCerrarGrafico: function () {
            this._getDialogGrafico().then(function (oDialog) {
                oDialog.close();
            });
        },

        /* ==============================================================
         * NAVEGACIÓN
         * ============================================================== */

        /**
         * Navega al detalle de la selección tocada.
         */
        onSeleccionPress: function (oEvent) {
            // El binding context apunta al DATO de la fila, no al pixel.
            // NUNCA leas el valor de la celda con getCells()[0].getText():
            // si cambia el orden de columnas, se rompe.
            var oContext = oEvent.getSource().getBindingContext();
            var sId      = oContext.getProperty("seleccionId");

            UIComponent.getRouterFor(this).navTo("RouteDetalle", {
                seleccionId: sId
            });
        }

    });
});