sap.ui.define([
    "sap/ui/core/UIComponent"
], function (UIComponent) {
    "use strict";

    return UIComponent.extend("mundial.Component", {

        metadata: {
            manifest: "json"
        },

        init: function () {
            UIComponent.prototype.init.apply(this, arguments);

            // El router se instancia en el init del padre a partir del bloque
            // "routing" del manifest, pero no arranca solo. El orden importa:
            // invertido, getRouter() devuelve undefined.
            this.getRouter().initialize();
        }

    });
});