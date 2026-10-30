package pe.techserv.panel.dto;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

/** La regla conjunta devuelve los errores en sus campos, igual que @Pattern. */
public class ValidadorTransferencia implements ConstraintValidator<TransferenciaCompleta, ActualizarDatosCobro> {

    @Override
    public boolean isValid(ActualizarDatosCobro datos, ConstraintValidatorContext contexto) {
        if (datos == null || (datos.banco() == null && datos.titular() == null
                && datos.numeroCuenta() == null && datos.cci() == null)) {
            return true;
        }

        contexto.disableDefaultConstraintViolation();
        boolean valido = true;
        if (datos.banco() == null) {
            error(contexto, "banco", "El banco es obligatorio para la transferencia");
            valido = false;
        }
        if (datos.titular() == null) {
            error(contexto, "titular", "El titular es obligatorio para la transferencia");
            valido = false;
        }
        if (datos.numeroCuenta() == null && datos.cci() == null) {
            String mensaje = "Escribe el número de cuenta o el CCI para la transferencia";
            error(contexto, "numeroCuenta", mensaje);
            error(contexto, "cci", mensaje);
            valido = false;
        }
        return valido;
    }

    private static void error(ConstraintValidatorContext contexto, String campo, String mensaje) {
        contexto.buildConstraintViolationWithTemplate(mensaje)
                .addPropertyNode(campo).addConstraintViolation();
    }
}
