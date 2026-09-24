package pe.techserv.panel.dto;

import pe.techserv.comun.Especialidad;

import java.util.Set;

public record TecnicoDisponible(Long id,
                                String nombreCompleto,
                                String nombres,
                                String apellidos,
                                String email,
                                String telefono,
                                boolean disponible,
                                Set<Especialidad> especialidades,
                                long ordenesHoy) {}
