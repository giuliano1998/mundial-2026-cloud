using mundial from '../db/schema';

service MundialService {

  entity Selecciones as projection on mundial.Selecciones {
    *,
    // virtual = NO se persiste, NO tiene columna en la base.
    // La llena el handler. Existe solo en el servicio.
    // Consecuencia: no se puede filtrar ni ordenar por este campo.
    virtual null as confederacionTexto : String(30)
  };

  entity Jugadores as projection on mundial.Jugadores;
}