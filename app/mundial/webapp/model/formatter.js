sap.ui.define([], function () {
    "use strict";

    // Umbral de altura. Una constante con nombre, no un número suelto
    // repetido en tres funciones. Si mañana cambia, se toca acá y listo.
    var ALTURA_ALTA = 1.85;
    var ALTURA_BAJA = 1.70;

    // Tabla de decisión. Un objeto en vez de un if/else de 20 líneas:
    // agregar AFC u OFC mañana es una línea, no tocar lógica.
    var CONFEDERACIONES = {
        UEFA:     { estado: "Information", icono: "sap-icon://globe"   },
        CONMEBOL: { estado: "Success",     icono: "sap-icon://world"   },
        CONCACAF: { estado: "Warning",     icono: "sap-icon://map"     },
        CAF:      { estado: "Error",       icono: "sap-icon://tree"    },
        AFC:      { estado: "Information", icono: "sap-icon://map-2"   },
        OFC:      { estado: "None",        icono: "sap-icon://flight"  }
    };

    return {

        // ── ALTURA ──────────────────────────────────────────────

        /**
         * 1.87 → "1,87 m"
         * OJO: vAltura puede llegar como número O como string "1.87",
         * según cómo serialice el Decimal. Number() cubre los dos casos.
         */
       
    _aNumero: function (vValor) {
    if (vValor === null || vValor === undefined || vValor === "") {
        return NaN;
    }
    if (typeof vValor === "number") {
        return vValor;
    }
    return Number(String(vValor).replace(",", "."));
},

alturaTexto: function (vAltura) {
    var fAltura = this._aNumero
        ? this._aNumero(vAltura)
        : Number(String(vAltura).replace(",", "."));
    if (isNaN(fAltura)) {
        return "";
    }
    return fAltura.toFixed(2).replace(".", ",") + " m";
},

alturaEstado: function (vAltura) {
    var fAltura = Number(String(vAltura).replace(",", "."));
    if (isNaN(fAltura))          { return "None"; }
    if (fAltura >= ALTURA_ALTA)  { return "Success"; }
    if (fAltura <  ALTURA_BAJA)  { return "Warning"; }
    return "None";
},

        // ── CONFEDERACIÓN ───────────────────────────────────────

        confederacionEstado: function (sConf) {
            var oConf = CONFEDERACIONES[sConf];
            return oConf ? oConf.estado : "None";
        },

        confederacionIcono: function (sConf) {
            var oConf = CONFEDERACIONES[sConf];
            return oConf ? oConf.icono : "sap-icon://question-mark";
        },

        // ── MUNDIALES ───────────────────────────────────────────

        /**
         * 0 → "Sin títulos" | 1 → "1 título" | 5 → "5 títulos"
         * El singular/plural es el detalle que separa una app
         * prolija de una que dice "1 títulos".
         */
        mundialesTexto: function (iCantidad) {
            var n = Number(iCantidad) || 0;
            if (n === 0) {
                return "Sin títulos";
            }
            return n === 1 ? "1 título" : n + " títulos";
        },

        mundialesEstado: function (iCantidad) {
            var n = Number(iCantidad) || 0;
            if (n >= 3) { return "Success"; }
            if (n >= 1) { return "Information"; }
            return "None";
        }
    };
});