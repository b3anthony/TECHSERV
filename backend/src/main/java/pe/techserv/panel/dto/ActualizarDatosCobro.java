package pe.techserv.panel.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

@TransferenciaCompleta
public record ActualizarDatosCobro(
        @Pattern(regexp = "^9[0-9]{8}$", message = "El celular de Yape debe tener 9 dígitos y empezar por 9")
        String yapeNumero,
        @Pattern(regexp = "^9[0-9]{8}$", message = "El celular de Plin debe tener 9 dígitos y empezar por 9")
        String plinNumero,
        @Size(max = 60, message = "El banco no puede tener más de 60 caracteres")
        String banco,
        @Size(max = 120, message = "El titular no puede tener más de 120 caracteres")
        String titular,
        @Pattern(regexp = "^[0-9-]+$", message = "El número de cuenta solo puede contener dígitos y guiones")
        @Size(max = 30, message = "El número de cuenta no puede tener más de 30 caracteres")
        String numeroCuenta,
        @Pattern(regexp = "^[0-9]{20}$", message = "El CCI debe tener exactamente 20 dígitos")
        String cci) {

    public ActualizarDatosCobro {
        yapeNumero = normalizar(yapeNumero);
        plinNumero = normalizar(plinNumero);
        banco = normalizar(banco);
        titular = normalizar(titular);
        numeroCuenta = normalizar(numeroCuenta);
        cci = normalizar(cci);
    }

    private static String normalizar(String valor) {
        return valor == null || valor.isBlank() ? null : valor.trim();
    }
}
