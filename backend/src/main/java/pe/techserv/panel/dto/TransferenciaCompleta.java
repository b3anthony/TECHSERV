package pe.techserv.panel.dto;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.Retention;
import java.lang.annotation.Target;

import static java.lang.annotation.ElementType.TYPE;
import static java.lang.annotation.RetentionPolicy.RUNTIME;

@Target(TYPE)
@Retention(RUNTIME)
@Constraint(validatedBy = ValidadorTransferencia.class)
public @interface TransferenciaCompleta {
    String message() default "Completa los datos de la transferencia";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}
