sap.ui.define([], function () {
    "use strict";

    var ALTURA_ALTA = 1.85;
    var ALTURA_BAJA = 1.70;

    // Tabla de decisión: agregar una confederación es una línea acá,
    // no una rama nueva en tres funciones.
    var CONFEDERACIONES = {
        UEFA:     { estado: "Information", icono: "sap-icon://globe"   },
        CONMEBOL: { estado: "Success",     icono: "sap-icon://world"   },
        CONCACAF: { estado: "Warning",     icono: "sap-icon://map"     },
        CAF:      { estado: "Error",       icono: "sap-icon://tree"    },
        AFC:      { estado: "Information", icono: "sap-icon://map-2"   },
        OFC:      { estado: "None",        icono: "sap-icon://flight"  }
    };

    // Va en el closure y no como propiedad del objeto: dentro de un
    // formatter "this" es el control que dispara el binding.
    // El modelo V4 formatea Decimal según el locale antes de llamar acá,
    // así que con es-AR llega "1,62" y Number("1,62") es NaN.
    function aNumero(vValor) {
        if (vValor === null || vValor === undefined || vValor === "") {
            return NaN;
        }
        if (typeof vValor === "number") {
            return vValor;
        }
        return Number(String(vValor).replace(",", "."));
    }

    return {

        // ── Altura ──────────────────────────────────────────────

        alturaTexto: function (vAltura) {
            var fAltura = aNumero(vAltura);
            return isNaN(fAltura)
                ? ""
                : fAltura.toFixed(2).replace(".", ",") + " m";
        },

        alturaEstado: function (vAltura) {
            var fAltura = aNumero(vAltura);
            if (isNaN(fAltura))         { return "None"; }
            if (fAltura >= ALTURA_ALTA) { return "Success"; }
            if (fAltura <  ALTURA_BAJA) { return "Warning"; }
            return "None";
        },

        // ── Confederación ───────────────────────────────────────

        confederacionEstado: function (sConf) {
            var oConf = CONFEDERACIONES[sConf];
            return oConf ? oConf.estado : "None";
        },

        confederacionIcono: function (sConf) {
            var oConf = CONFEDERACIONES[sConf];
            return oConf ? oConf.icono : "sap-icon://question-mark";
        },

        // ── Mundiales ───────────────────────────────────────────

        mundialesTexto: function (iCantidad) {
            var n = Number(iCantidad) || 0;
            if (n === 0) { return "Sin títulos"; }
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