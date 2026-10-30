package pe.techserv.visita.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import pe.techserv.pago.MetodoPago;
import pe.techserv.panel.dto.DatosCobro;

import java.util.Collection;

/** Solo se serializan los métodos ofrecidos que tienen datos configurados. */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record DatosCobroVisita(Billetera yape, Billetera plin, Transferencia transferencia) {

    @JsonInclude(JsonInclude.Include.ALWAYS)
    public record Billetera(String numero, String qr) {}
    @JsonInclude(JsonInclude.Include.ALWAYS)
    public record Transferencia(String banco, String titular, String numeroCuenta, String cci) {}

    public static DatosCobroVisita de(DatosCobro datos, Collection<MetodoPago> ofrecidos) {
        Billetera yape = ofrecidos.contains(MetodoPago.YAPE)
                && (datos.yapeNumero() != null || datos.yapeQr() != null)
                ? new Billetera(datos.yapeNumero(), datos.yapeQr()) : null;
        Billetera plin = ofrecidos.contains(MetodoPago.PLIN)
                && (datos.plinNumero() != null || datos.plinQr() != null)
                ? new Billetera(datos.plinNumero(), datos.plinQr()) : null;
        Transferencia transferencia = ofrecidos.contains(MetodoPago.TRANSFERENCIA)
                && (datos.numeroCuenta() != null || datos.cci() != null)
                ? new Transferencia(datos.banco(), datos.titular(), datos.numeroCuenta(), datos.cci()) : null;
        return new DatosCobroVisita(yape, plin, transferencia);
    }
}
