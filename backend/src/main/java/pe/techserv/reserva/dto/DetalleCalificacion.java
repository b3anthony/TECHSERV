package pe.techserv.reserva.dto;

import pe.techserv.orden.Calificacion;

import java.time.OffsetDateTime;

public record DetalleCalificacion(int puntaje,
                                  String comentario,
                                  OffsetDateTime creadaEn) {

    public static DetalleCalificacion de(Calificacion c) {
        return new DetalleCalificacion(c.getPuntaje(), c.getComentario(), c.getCreadaEn());
    }
}
