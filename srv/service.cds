using mundial from '../db/schema';

/**
 * Servicio OData V4 del Mundial.
 * Equivale al proyecto SEGW ZGR_MUNDIAL.
 */
service MundialService {

  entity Selecciones as projection on mundial.Selecciones;
  entity Jugadores   as projection on mundial.Jugadores;

}