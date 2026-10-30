package pe.techserv.orden.dto;

import pe.techserv.comun.Especialidad;
import pe.techserv.orden.EstadoOrden;
import pe.techserv.orden.OrdenFoto;
import pe.techserv.orden.OrdenServicio;
import pe.techserv.orden.OrdenHistorial;
import pe.techserv.orden.OrigenFoto;
import pe.techserv.pago.MetodoPago;
import pe.techserv.orden.TipoOrden;
import pe.techserv.garantia.dto.GarantiaResumen;
import pe.techserv.garantia.dto.AntecedenteGarantia;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.function.Predicate;

/** Todo lo que hace falta para atender una orden, en una sola respuesta. */
public record OrdenDetalle(Long id,
                           String codigo,
                           EstadoOrden estado,
                           String etiquetaEstado,
                           Especialidad especialidad,
                           String etiquetaEspecialidad,
                           String descripcionFalla,
                           String clienteNombre,
                           String clienteTelefono,
                           String direccion,
                           String referencia,
                           String distrito,
                           String urlMapa,
                           LocalDate fechaProgramada,
                           LocalTime horaProgramada,
                           String tecnicoNombre,
                           Long tecnicoId,
                           String diagnostico,
                           BigDecimal precioManoObra,
                           BigDecimal total,
                           /** Cómo dijo el cliente que pagaría. NULL en órdenes antiguas. */
                           MetodoPago metodoPago,
                           OffsetDateTime creadaEn,
                           List<String> fotos,
                           List<String> fotosTrabajo,
                           List<PasoHistorial> historial,
                           List<RepuestoUsado> repuestos,
                           TipoOrden tipo,
                           Long mypeId,
                           GarantiaResumen garantia,
                           AntecedenteGarantia atencionGarantia) {

    public record RepuestoUsado(String nombre, int cantidad,
                                BigDecimal precioUnitario, BigDecimal subtotal) {}

    /** Las fotos de un origen, en el orden en que se subieron. */
    public static List<String> rutas(OrdenServicio o, OrigenFoto origen) {
        return o.getFotos().stream()
                .filter(f -> f.getOrigen() == origen)
                .map(OrdenFoto::getRuta)
                .toList();
    }

    /** La orden entera, para el taller. */
    public static OrdenDetalle de(OrdenServicio o) {
        return de(o, null, null);
    }

    public static OrdenDetalle de(OrdenServicio o, GarantiaResumen garantia, AntecedenteGarantia antecedente) {
        return componer(o, paso -> true, garantia, antecedente);
    }

    /** La orden como la ve quien la pidió: sin los rechazos del técnico, que son cosa del taller. */
    public static OrdenDetalle paraCliente(OrdenServicio o) {
        return paraCliente(o, null, null);
    }

    public static OrdenDetalle paraCliente(OrdenServicio o, GarantiaResumen garantia, AntecedenteGarantia antecedente) {
        return componer(o, paso -> !paso.esRechazoDelTecnico(), garantia, antecedente);
    }

    private static OrdenDetalle componer(OrdenServicio o, Predicate<OrdenHistorial> visible,
                                         GarantiaResumen garantia, AntecedenteGarantia antecedente) {
        return new OrdenDetalle(
                o.getId(), o.getCodigo(), o.getEstado(), o.getEstado().getEtiqueta(),
                o.getEspecialidad(), o.getEspecialidad().getTitulo(),
                o.getDescripcionFalla(),
                o.getCliente().getUsuario().getNombreCompleto(),
                o.getCliente().getUsuario().getTelefono(),
                o.getDireccion(), o.getReferencia(), o.getDistrito(), o.urlMapa(),
                o.getFechaProgramada(), o.getHoraProgramada(),
                o.getTecnico() == null ? null : o.getTecnico().getUsuario().getNombreCompleto(),
                o.getTecnico() == null ? null : o.getTecnico().getId(),
                o.getDiagnostico(), o.getPrecioManoObra(), o.getTotal(), o.getMetodoPago(), o.getCreadaEn(),
                rutas(o, OrigenFoto.CLIENTE),
                rutas(o, OrigenFoto.TECNICO),
                o.getHistorial().stream().filter(visible).map(PasoHistorial::de).toList(),
                o.getRepuestos().stream()
                 .map(r -> new RepuestoUsado(r.getRepuesto().getNombre(), r.getCantidad(),
                                             r.getPrecioUnitario(), r.subtotal()))
                 .toList(), o.getTipo(), o.getMype().getId(), garantia, antecedente);
    }
}
