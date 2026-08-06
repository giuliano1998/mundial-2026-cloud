using mundial from '../db/schema';

service MundialService {

  /**
   * @cds.redirection.target: true
   * Esta es la entidad a la que apuntan las asociaciones hacia
   * Selecciones. Hace falta porque DistribucionConfederaciones
   * también proyecta sobre mundial.Selecciones y CAP no puede
   * elegir sola.
   */
  @cds.redirection.target: true
  entity Selecciones as projection on mundial.Selecciones {
    *,
    virtual null as confederacionTexto : String(30)
  };

  entity Jugadores as projection on mundial.Jugadores;

  /**
   * Entidad de solo lectura con la distribución por confederación.
   * El GROUP BY lo resuelve la BASE: esta vista se compila a SQL
   * y devuelve una fila por confederación, no 50.000.
   *
   * redirection.target: false — es una vista de reporting,
   * ninguna navegación debe apuntar acá.
   */
  @readonly
  @cds.redirection.target: false
  entity DistribucionConfederaciones as
    select from mundial.Selecciones {
      key confederacion,
          count(*) as cantidad : Integer
    }
    group by confederacion;
}