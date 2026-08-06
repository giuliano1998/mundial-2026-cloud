namespace mundial;

/**
 * Selecciones nacionales del Mundial 2026.
 * Es igual a la tabla on-premise ZGR_SELECCIONES.
 */
entity Selecciones {
  key seleccionId   : String(3);
      nombre        : String(40);
      confederacion : String(10);
      grupo         : String(1);
      mundialesGanados : Integer default 0; // ← se suma un campo para mejor diseño
      // Lado "1" de la relación 1:N.
      // Composition = los jugadores PERTENECEN a la selección.
      jugadores     : Composition of many Jugadores
                        on jugadores.seleccionId = seleccionId;
}

/**
 * Jugadores. igual a ZGR_JUGADORES en on-premise.
 * Clave compuesta: jugadorId + seleccionId (igual que on-premise).
 */
 // En Selecciones: la selección CONTIENE su plantel jugadores
entity Jugadores {
  key jugadorId   : String(6);
  key seleccionId : String(3);
      nombre      : String(40);
      posicion    : String(3);
      dorsal      : String(2);
      altura      : Decimal(3,2); // ← se suma un campo para mejor logica

      // Lado "N". Association = referencia hacia el padre.
      seleccion   : Association to Selecciones
                      on seleccion.seleccionId = seleccionId;
}
// En Jugadores: el jugador REFERENCIA a su selección