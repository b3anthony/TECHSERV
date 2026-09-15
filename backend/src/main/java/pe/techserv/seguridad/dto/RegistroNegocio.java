package pe.techserv.seguridad.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import pe.techserv.comun.Especialidad;

import java.math.BigDecimal;
import java.util.List;

/**
 * "Quiero registrar mi negocio". Crea de una vez el usuario ADMIN_MYPE, el
 * taller y sus tarifas: sin tarifa no hay nada que ensenarle al cliente en el
 * catalogo, asi que se pide desde el principio.
 */
public record RegistroNegocio(
        @NotBlank(message = "Escribe tus nombres")
        @Size(max = 80) String nombres,

        @NotBlank(message = "Escribe tus apellidos")
        @Size(max = 80) String apellidos,

        @NotBlank(message = "Escribe tu correo")
        @Email(message = "El correo no tiene un formato válido")
        @Size(max = 160) String email,

        @NotBlank(message = "Escribe una contraseña")
        @Size(min = 8, message = "La contraseña debe tener al menos 8 caracteres")
        String clave,

        @Pattern(regexp = "^$|^[0-9]{9}$", message = "El teléfono debe tener 9 dígitos")
        String telefono,

        @NotBlank(message = "Escribe la razón social del negocio")
        @Size(max = 160) String razonSocial,

        @NotBlank(message = "Escribe el RUC")
        @Pattern(regexp = "^[0-9]{11}$", message = "El RUC tiene 11 dígitos")
        String ruc,

        @Size(max = 1000) String descripcion,

        @NotBlank(message = "Escribe la dirección del negocio")
        @Size(max = 200) String direccion,

        @NotBlank(message = "Escribe el distrito")
        @Size(max = 60) String distrito,

        @NotEmpty(message = "Elige al menos una especialidad y ponle su tarifa")
        @Valid List<TarifaEspecialidad> especialidades) {

    public record TarifaEspecialidad(
            @NotNull(message = "Falta la especialidad") Especialidad especialidad,

            @NotNull(message = "Falta la tarifa")
            @DecimalMin(value = "1.00", message = "La tarifa debe ser mayor que cero")
            @Digits(integer = 8, fraction = 2) BigDecimal tarifaBase) {
    }
}
