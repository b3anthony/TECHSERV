package pe.techserv.panel;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import pe.techserv.BasePruebaIntegracion;
import pe.techserv.comun.Especialidad;
import pe.techserv.mype.*;
import pe.techserv.orden.OrdenServicioRepository;
import pe.techserv.usuario.Rol;
import pe.techserv.usuario.Usuario;
import pe.techserv.usuario.UsuarioRepository;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Pruebas de integración para las operaciones de administración del panel:
 * técnicos, tarifas y repuestos.
 */
@AutoConfigureMockMvc
class AdministracionTest extends BasePruebaIntegracion {

    private static final String ADMIN_DELGADO    = "jorge@serviciosdelgado.pe";
    private static final String ADMIN_TECNOHOGAR = "silvia@tecnohogar.pe";
    private static final String ADMIN_LIBERTAD   = "raul@reparacionesll.pe";
    private static final String CLIENTE          = "rosa.chavez@correo.pe";
    private static final String CLAVE            = "demo1234";

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired UsuarioRepository usuarios;
    @Autowired TecnicoRepository tecnicos;
    @Autowired MypeRepository mypes;
    @Autowired MypeEspecialidadRepository especialidades;
    @Autowired RepuestoRepository repuestos;
    @Autowired OrdenServicioRepository ordenes;

    @Test
    @DisplayName("Alta de técnico válida: responde 201 y aparece en el taller de Jorge con rol TECNICO y disponible = true")
    void altaTecnicoValida() throws Exception {
        String correo = "mario.bustamante@serviciosdelgado.pe";
        // Limpieza preventiva si se ejecuta varias veces
        tecnicos.findByUsuarioEmailIgnoreCase(correo).ifPresent(t -> {
            tecnicos.delete(t);
            usuarios.delete(t.getUsuario());
        });

        String cuerpo = """
                {
                    "nombres": "Mario",
                    "apellidos": "Bustamante",
                    "email": "%s",
                    "telefono": "988776655",
                    "especialidades": ["SERVICIOS_HOGAR"]
                }
                """.formatted(correo);

        mvc.perform(post("/api/panel/tecnicos")
                        .header("Authorization", "Bearer " + tokenDe(ADMIN_DELGADO))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(cuerpo))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.nombres").value("Mario"))
                .andExpect(jsonPath("$.apellidos").value("Bustamante"))
                .andExpect(jsonPath("$.email").value(correo))
                .andExpect(jsonPath("$.disponible").value(true));

        Tecnico creado = tecnicos.findByUsuarioEmailIgnoreCase(correo).orElseThrow();
        assertThat(creado.isDisponible()).isTrue();

        Usuario usuarioCreado = usuarios.findByEmailIgnoreCase(correo).orElseThrow();
        assertThat(usuarioCreado.getRol()).isEqualTo(Rol.TECNICO);
        assertThat(usuarioCreado.isActivo()).isTrue();

        Long jorgeMypeId = mypes.findAll().stream()
                .filter(m -> m.getRuc().equals("20601234567"))
                .findFirst().orElseThrow().getId();
        assertThat(tecnicos.findByIdAndMypeId(creado.getId(), jorgeMypeId)).isPresent();
    }

    @Test
    @DisplayName("Alta de técnico con un correo que ya existe en usuario: responde 400")
    void altaTecnicoConCorreoExistenteDa400() throws Exception {
        String cuerpo = """
                {
                    "nombres": "Otro",
                    "apellidos": "Técnico",
                    "email": "%s",
                    "telefono": "988776655",
                    "especialidades": ["SERVICIOS_HOGAR"]
                }
                """.formatted(ADMIN_DELGADO);

        mvc.perform(post("/api/panel/tecnicos")
                        .header("Authorization", "Bearer " + tokenDe(ADMIN_DELGADO))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(cuerpo))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.mensaje").value("Ya hay una cuenta con ese correo"));
    }

    @Test
    @DisplayName("Alta de técnico con una especialidad que el taller no atiende: responde 400")
    void altaTecnicoConEspecialidadNoAtendidaDa400() throws Exception {
        // En la semilla, Reparaciones La Libertad (Raúl) solo atiende
        // REPARACION_ELECTRODOMESTICOS y SERVICIOS_HOGAR; no atiende SOPORTE_INFORMATICO.
        Long raulMypeId = mypes.findAll().stream()
                .filter(m -> m.getRuc().equals("20605554443"))
                .findFirst().orElseThrow().getId();

        especialidades.findByMypeIdAndEspecialidad(raulMypeId, Especialidad.SOPORTE_INFORMATICO)
                .ifPresent(especialidades::delete);

        String cuerpo = """
                {
                    "nombres": "Especialista",
                    "apellidos": "Sistemas",
                    "email": "nuevo.soporte@reparacionesll.pe",
                    "telefono": "988776655",
                    "especialidades": ["SOPORTE_INFORMATICO"]
                }
                """;

        mvc.perform(post("/api/panel/tecnicos")
                        .header("Authorization", "Bearer " + tokenDe(ADMIN_LIBERTAD))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(cuerpo))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.mensaje").value("Tu taller no atiende Soporte Técnico e Informático"));
    }

    @Test
    @DisplayName("PATCH sobre el técnico de otro taller: responde 404, nunca 403 ni 200")
    void patchTecnicoDeOtroTallerDa404() throws Exception {
        // Pedro Salazar es técnico de TecnoHogar (Silvia).
        Tecnico pedro = tecnicos.findByUsuarioEmailIgnoreCase("pedro.salazar@tecnohogar.pe").orElseThrow();
        Long pedroId = pedro.getId();

        String cuerpo = """
                {
                    "nombres": "Pedro Modificado",
                    "apellidos": "Salazar",
                    "telefono": "988112233",
                    "disponible": true,
                    "especialidades": ["SERVICIOS_HOGAR"]
                }
                """;

        mvc.perform(patch("/api/panel/tecnicos/{id}", pedroId)
                        .header("Authorization", "Bearer " + tokenDe(ADMIN_DELGADO))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(cuerpo))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.estado").value(404));
    }

    @Test
    @DisplayName("Baja de un técnico sin órdenes abiertas: responde 204 y la fila sigue en la base con disponible = false")
    void bajaTecnicoSinOrdenesAbiertasDa204() throws Exception {
        String correo = "tecnico.sinordenes@serviciosdelgado.pe";
        // Limpieza preventiva
        tecnicos.findByUsuarioEmailIgnoreCase(correo).ifPresent(t -> {
            tecnicos.delete(t);
            usuarios.delete(t.getUsuario());
        });

        // Damos de alta un técnico nuevo para tener certeza absoluta de que no tiene órdenes
        String altaCuerpo = """
                {
                    "nombres": "Juan",
                    "apellidos": "Sin Órdenes",
                    "email": "%s",
                    "telefono": "911223344",
                    "especialidades": ["SERVICIOS_HOGAR"]
                }
                """.formatted(correo);

        String respuestaAlta = mvc.perform(post("/api/panel/tecnicos")
                        .header("Authorization", "Bearer " + tokenDe(ADMIN_DELGADO))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(altaCuerpo))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        Long tecnicoId = json.readTree(respuestaAlta).get("id").asLong();

        // Baja lógica
        mvc.perform(delete("/api/panel/tecnicos/{id}", tecnicoId)
                        .header("Authorization", "Bearer " + tokenDe(ADMIN_DELGADO)))
                .andExpect(status().isNoContent());

        Tecnico tecnicoEnBd = tecnicos.findById(tecnicoId).orElseThrow();
        assertThat(tecnicoEnBd.isDisponible()).isFalse();
        Usuario usuarioEnBd = usuarios.findByEmailIgnoreCase(correo).orElseThrow();
        assertThat(usuarioEnBd.isActivo()).isFalse();
    }

    @Test
    @DisplayName("Baja de un técnico con una orden abierta: responde 409")
    void bajaTecnicoConOrdenAbiertaDa409() throws Exception {
        // Carlos Núñez en Servicios Delgado tiene la orden ORD-0140 en estado CONFIRMADA
        Tecnico carlos = tecnicos.findByUsuarioEmailIgnoreCase("carlos.nunez@serviciosdelgado.pe").orElseThrow();
        Long carlosId = carlos.getId();

        mvc.perform(delete("/api/panel/tecnicos/{id}", carlosId)
                        .header("Authorization", "Bearer " + tokenDe(ADMIN_DELGADO)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.mensaje").value("Reasigna sus órdenes abiertas antes de darlo de baja"));

        Tecnico tecnicoEnBd = tecnicos.findById(carlosId).orElseThrow();
        assertThat(tecnicoEnBd.isDisponible()).isTrue();
        Usuario usuarioEnBd = usuarios.findByEmailIgnoreCase("carlos.nunez@serviciosdelgado.pe").orElseThrow();
        assertThat(usuarioEnBd.isActivo()).isTrue();
    }

    @Test
    @DisplayName("PUT de una tarifa nueva pasa a atenderla; segundo PUT con otro importe la actualiza sin duplicar fila")
    void fijarTarifaCreaYActualizaSinDuplicar() throws Exception {
        Long raulMypeId = mypes.findAll().stream()
                .filter(m -> m.getRuc().equals("20605554443"))
                .findFirst().orElseThrow().getId();

        // Aseguramos que inicialmente no atienda SOPORTE_INFORMATICO
        especialidades.findByMypeIdAndEspecialidad(raulMypeId, Especialidad.SOPORTE_INFORMATICO)
                .ifPresent(especialidades::delete);

        try {
            // Primer PUT: alta de tarifa
            mvc.perform(put("/api/panel/tarifas/{especialidad}", Especialidad.SOPORTE_INFORMATICO)
                            .header("Authorization", "Bearer " + tokenDe(ADMIN_LIBERTAD))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {"tarifaBase": 75.00}
                                    """))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.especialidad").value("SOPORTE_INFORMATICO"))
                    .andExpect(jsonPath("$.tarifaBase").value(75.00));

            List<MypeEspecialidad> lista1 = especialidades.findByMypeId(raulMypeId).stream()
                    .filter(me -> me.getEspecialidad() == Especialidad.SOPORTE_INFORMATICO)
                    .toList();
            assertThat(lista1).hasSize(1);
            assertThat(lista1.get(0).getTarifaBase()).isEqualByComparingTo("75.00");

            // Segundo PUT: actualización de tarifa
            mvc.perform(put("/api/panel/tarifas/{especialidad}", Especialidad.SOPORTE_INFORMATICO)
                            .header("Authorization", "Bearer " + tokenDe(ADMIN_LIBERTAD))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {"tarifaBase": 89.90}
                                    """))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.especialidad").value("SOPORTE_INFORMATICO"))
                    .andExpect(jsonPath("$.tarifaBase").value(89.90));

            List<MypeEspecialidad> lista2 = especialidades.findByMypeId(raulMypeId).stream()
                    .filter(me -> me.getEspecialidad() == Especialidad.SOPORTE_INFORMATICO)
                    .toList();
            assertThat(lista2).hasSize(1);
            assertThat(lista2.get(0).getTarifaBase()).isEqualByComparingTo("89.90");
        } finally {
            // Restaurar estado de la semilla
            especialidades.findByMypeIdAndEspecialidad(raulMypeId, Especialidad.SOPORTE_INFORMATICO)
                    .ifPresent(especialidades::delete);
        }
    }

    @Test
    @DisplayName("DELETE de un repuesto: responde 204, no sale en el listado y queda activo = false en base")
    void deleteRepuestoBajaLogicaDa204() throws Exception {
        // Creamos un repuesto propio para el test
        String cuerpoAlta = """
                {
                    "nombre": "Fusible térmico 10A",
                    "descripcion": "Fusible para pruebas de eliminación",
                    "precio": 12.50,
                    "stock": 15
                }
                """;

        String respuestaAlta = mvc.perform(post("/api/panel/repuestos")
                        .header("Authorization", "Bearer " + tokenDe(ADMIN_DELGADO))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(cuerpoAlta))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        Long repuestoId = json.readTree(respuestaAlta).get("id").asLong();

        // Eliminación lógica
        mvc.perform(delete("/api/panel/repuestos/{id}", repuestoId)
                        .header("Authorization", "Bearer " + tokenDe(ADMIN_DELGADO)))
                .andExpect(status().isNoContent());

        // Ya no aparece en GET /api/panel/repuestos
        String listado = mvc.perform(get("/api/panel/repuestos")
                        .header("Authorization", "Bearer " + tokenDe(ADMIN_DELGADO)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        assertThat(listado).doesNotContain("Fusible térmico 10A");

        // Sigue existiendo en la base de datos con activo = false
        Repuesto repuestoEnBd = repuestos.findById(repuestoId).orElseThrow();
        assertThat(repuestoEnBd.isActivo()).isFalse();
    }

    @Test
    @DisplayName("PUT de un repuesto de otro taller: responde 404")
    void putRepuestoDeOtroTallerDa404() throws Exception {
        // Tomamos un repuesto perteneciente a TecnoHogar (Silvia)
        Long silviaMypeId = mypes.findAll().stream()
                .filter(m -> m.getRuc().equals("20609876543"))
                .findFirst().orElseThrow().getId();

        Repuesto repuestoAjeno = repuestos.findByMypeIdAndActivoTrueOrderByNombreAsc(silviaMypeId)
                .stream().findFirst().orElseThrow();
        Long repuestoAjenoId = repuestoAjeno.getId();

        // Jorge intenta modificarlo desde su sesión
        String cuerpo = """
                {
                    "nombre": "Nombre Alterado",
                    "descripcion": "Descripción alterada",
                    "precio": 99.00,
                    "stock": 3
                }
                """;

        mvc.perform(put("/api/panel/repuestos/{id}", repuestoAjenoId)
                        .header("Authorization", "Bearer " + tokenDe(ADMIN_DELGADO))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(cuerpo))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.estado").value(404));
    }

    @Test
    @DisplayName("DELETE de tarifa con órdenes abiertas: responde 409")
    void deleteTarifaConOrdenesAbiertasDa409() throws Exception {
        // En Servicios Delgado (Jorge), SERVICIOS_HOGAR tiene órdenes abiertas (ORD-0139, ORD-0138)
        mvc.perform(delete("/api/panel/tarifas/{especialidad}", Especialidad.SERVICIOS_HOGAR)
                        .header("Authorization", "Bearer " + tokenDe(ADMIN_DELGADO)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.mensaje").value("Hay órdenes en curso de esa especialidad"));
    }

    @Test
    @DisplayName("PUT de tarifa con importe fuera de rango responde 400")
    void putTarifaFueraDeRangoDa400() throws Exception {
        mvc.perform(put("/api/panel/tarifas/{especialidad}", Especialidad.SERVICIOS_HOGAR)
                        .header("Authorization", "Bearer " + tokenDe(ADMIN_DELGADO))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"tarifaBase": -10.00}
                                """))
                .andExpect(status().isBadRequest());

        mvc.perform(put("/api/panel/tarifas/{especialidad}", Especialidad.SERVICIOS_HOGAR)
                        .header("Authorization", "Bearer " + tokenDe(ADMIN_DELGADO))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"tarifaBase": 10000.00}
                                """))
                .andExpect(status().isBadRequest());
    }

    private String tokenDe(String email) throws Exception {
        String respuesta = mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                 {"email": "%s", "clave": "%s"}
                                 """.formatted(email, CLAVE)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return json.readTree(respuesta).get("token").asText();
    }
}
