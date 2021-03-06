/* eslint-disable @typescript-eslint/no-misused-promises */
import {service} from '@loopback/core';
import {
  Count,
  CountSchema,
  Filter,
  FilterExcludingWhere,
  repository,
  Where,
} from '@loopback/repository';
import {
  del,
  get,
  getModelSchemaRef,
  HttpErrors,
  param,
  patch,
  post,
  put,
  requestBody,
  response,
} from '@loopback/rest';
import {Keys} from '../config/keys';
import {Credenciales, ResetearClave, Usuario} from '../models';
import {UsuarioRepository} from '../repositories';
import {AutenticationService, NotificationService} from '../services';

export class UsuarioController {
  constructor(
    @repository(UsuarioRepository)
    public usuarioRepository: UsuarioRepository,
    @service(AutenticationService)
    public autenticationService: AutenticationService,
    @service(NotificationService)
    public notificationService: NotificationService,
  ) {}

  @post('/identificar', {
    responses: {
      '200': {
        description: 'Identificacion de usuarios',
      },
    },
  })
  async identificar(@requestBody() credenciales: Credenciales) {
    const user = await this.autenticationService.identificarPropietario(
      credenciales.usuario,
      credenciales.clave,
    );
    if (user) {
      const token = this.autenticationService.generateJwt(user);
      return {
        data: {
          id: user.id,
          uName: user.userName,
          role: user.rolId,
        },
        tk: token,
      };
    } else {
      throw new HttpErrors[401]('invalid user or password');
    }
  }

  @post('/usuarios')
  @response(200, {
    description: 'Usuario model instance',
    content: {'application/json': {schema: getModelSchemaRef(Usuario)}},
  })
  async create(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Usuario, {
            title: 'NewUsuario',
            exclude: ['id'],
          }),
        },
      },
    })
    usuario: Omit<Usuario, 'id'>,
  ): Promise<Usuario> {
    const clave = this.autenticationService.generarClave();
    console.log(clave);
    const claveCifrada = this.autenticationService.cifrarClave(clave);
    console.log(claveCifrada);
    usuario.clave = claveCifrada;
    const userAdded = await this.usuarioRepository.create(usuario);

    //user send email
    const body = `<strong>Hola, bienvenid@<strong><br />su correo ha sido registrado en el sistema de mascotas sus datos de accesso son:<br/><br/><ul><li>Usuario: ${usuario.userName}</li><li>clave: ${clave}</li></ul> `;
    this.notificationService.sendEmail(
      usuario.userName,
      Keys.subjectRegisterUser,
      body,
    );

    return userAdded;
  }

  @get('/usuarios/count')
  @response(200, {
    description: 'Usuario model count',
    content: {'application/json': {schema: CountSchema}},
  })
  async count(@param.where(Usuario) where?: Where<Usuario>): Promise<Count> {
    return this.usuarioRepository.count(where);
  }

  @get('/usuarios')
  @response(200, {
    description: 'Array of Usuario model instances',
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: getModelSchemaRef(Usuario, {includeRelations: true}),
        },
      },
    },
  })
  async find(
    @param.filter(Usuario) filter?: Filter<Usuario>,
  ): Promise<Usuario[]> {
    return this.usuarioRepository.find(filter);
  }

  @patch('/usuarios')
  @response(200, {
    description: 'Usuario PATCH success count',
    content: {'application/json': {schema: CountSchema}},
  })
  async updateAll(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Usuario, {partial: true}),
        },
      },
    })
    usuario: Usuario,
    @param.where(Usuario) where?: Where<Usuario>,
  ): Promise<Count> {
    return this.usuarioRepository.updateAll(usuario, where);
  }

  @get('/usuarios/{id}')
  @response(200, {
    description: 'Usuario model instance',
    content: {
      'application/json': {
        schema: getModelSchemaRef(Usuario, {includeRelations: true}),
      },
    },
  })
  async findById(
    @param.path.string('id') id: string,
    @param.filter(Usuario, {exclude: 'where'})
    filter?: FilterExcludingWhere<Usuario>,
  ): Promise<Usuario> {
    return this.usuarioRepository.findById(id, filter);
  }

  @patch('/usuarios/{id}')
  @response(204, {
    description: 'Usuario PATCH success',
  })
  async updateById(
    @param.path.string('id') id: string,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Usuario, {partial: true}),
        },
      },
    })
    usuario: Usuario,
  ): Promise<void> {
    await this.usuarioRepository.updateById(id, usuario);
  }

  @put('/usuarios/{id}')
  @response(204, {
    description: 'Usuario PUT success',
  })
  async replaceById(
    @param.path.string('id') id: string,
    @requestBody() usuario: Usuario,
  ): Promise<void> {
    await this.usuarioRepository.replaceById(id, usuario);
  }

  @del('/usuarios/{id}')
  @response(204, {
    description: 'Usuario DELETE success',
  })
  async deleteById(@param.path.string('id') id: string): Promise<void> {
    await this.usuarioRepository.deleteById(id);
  }

  @post('/reset-password')
  @response(200, {
    description: 'Usuario model instance',
    content: {'application/json': {schema: getModelSchemaRef(ResetearClave)}},
  })
  async resetPassword(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(ResetearClave),
        },
      },
    })
    resetearClave: ResetearClave,
  ): Promise<Object> {
    const user = await this.usuarioRepository.findOne({
      where: {userName: resetearClave.email},
    });
    if (!user) {
      throw new HttpErrors[401]('no se encuentra el usuario');
    }
    const clave = this.autenticationService.generarClave();
    console.log(clave);
    const claveCifrada = this.autenticationService.cifrarClave(clave);
    console.log(claveCifrada);
    user.clave = claveCifrada;
    await this.usuarioRepository.update(user);

    //notificar al usuario sms cambio de clave
    const content = `Hola, hemos Reseteado tu clave. Usuario: ${user.userName} y clave: ${clave}`;
    const send = this.notificationService.sendSms(user.telefono, content);
    if (send) {
      return {
        enviado: 'ok',
      };
    }
    return {
      enviado: 'KO',
    };
  }
}
