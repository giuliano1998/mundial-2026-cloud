sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/UIComponent",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "mundial/model/formatter" 
], function (Controller, UIComponent, Filter, FilterOperator, formatter) {
    "use strict";

    return Controller.extend("mundial.controller.Selecciones", {

         formatter: formatter,  
         
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