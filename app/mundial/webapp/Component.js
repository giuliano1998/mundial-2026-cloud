sap.ui.define([
    "sap/ui/core/UIComponent"
], function (UIComponent) {
    "use strict";

    return UIComponent.extend("mundial.Component", {

        metadata: {
            manifest: "json"   // lee toda la config del manifest.json
        },

        init: function () {
            // 1. OBLIGATORIO: llamar al init del padre.
            //    Instancia los modelos y el router declarados en el manifest.
            //    Si te lo salteás, no hay modelo OData ni router y todo falla.
            UIComponent.prototype.init.apply(this, arguments);

            // 2. Arrancar el router. Sin esto, la navegación no ocurre
            //    y ni siquiera se muestra la vista inicial.
            this.getRouter().initialize();
        }

    });
});