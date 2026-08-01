sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/UIComponent",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (Controller, UIComponent, Filter, FilterOperator) {
    "use strict";

    return Controller.extend("mundial.controller.Selecciones", {

        onBuscar: function (oEvent) {
            var sQuery  = oEvent.getParameter("newValue");
            var aFilter = [];

            if (sQuery) {
                aFilter.push(new Filter({
                    filters: [
                        new Filter("nombre", FilterOperator.Contains, sQuery),
                        new Filter("confederacion", FilterOperator.Contains, sQuery)
                    ],
                    and: false
                }));
            }

            this.byId("tablaSelecciones").getBinding("items").filter(aFilter);
        },

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