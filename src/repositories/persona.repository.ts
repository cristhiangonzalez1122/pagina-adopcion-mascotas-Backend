import {inject, Getter} from '@loopback/core';
import {DefaultCrudRepository, repository, HasManyRepositoryFactory} from '@loopback/repository';
import {MysqldsDataSource} from '../datasources';
import {Persona, PersonaRelations, SolicitudAdopcion} from '../models';
import {SolicitudAdopcionRepository} from './solicitud-adopcion.repository';

export class PersonaRepository extends DefaultCrudRepository<
  Persona,
  typeof Persona.prototype.id,
  PersonaRelations
> {

  public readonly SolicitudesDeAdopcion: HasManyRepositoryFactory<SolicitudAdopcion, typeof Persona.prototype.id>;

  constructor(
    @inject('datasources.mysqlds') dataSource: MysqldsDataSource, @repository.getter('SolicitudAdopcionRepository') protected solicitudAdopcionRepositoryGetter: Getter<SolicitudAdopcionRepository>,
  ) {
    super(Persona, dataSource);
    this.SolicitudesDeAdopcion = this.createHasManyRepositoryFactoryFor('SolicitudesDeAdopcion', solicitudAdopcionRepositoryGetter,);
    this.registerInclusionResolver('SolicitudesDeAdopcion', this.SolicitudesDeAdopcion.inclusionResolver);
  }
}
