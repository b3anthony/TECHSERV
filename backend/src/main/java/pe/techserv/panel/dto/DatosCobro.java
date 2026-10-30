package pe.techserv.panel.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import pe.techserv.mype.MypeCobro;

/** DTO propio: los datos de cobro no forman parte de AjustesTaller. */
@JsonInclude(JsonInclude.Include.ALWAYS)
public record DatosCobro(String yapeNumero, String yapeQr, String plinNumero, String plinQr,
                         String banco, String titular, String numeroCuenta, String cci) {

    public static DatosCobro vacios() {
        return new DatosCobro(null, null, null, null, null, null, null, null);
    }

    public static DatosCobro de(MypeCobro cobro) {
        return new DatosCobro(cobro.getYapeNumero(), cobro.getYapeQr(),
                cobro.getPlinNumero(), cobro.getPlinQr(), cobro.getBanco(),
                cobro.getTitular(), cobro.getNumeroCuenta(), cobro.getCci());
    }
}
