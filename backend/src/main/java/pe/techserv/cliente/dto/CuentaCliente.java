package pe.techserv.cliente.dto;

import pe.techserv.usuario.Cliente;
import pe.techserv.usuario.Usuario;

/** Los datos del cliente tal como los ve en sus ajustes. */
public record CuentaCliente(String nombres,
                            String apellidos,
                            String email,
                            String telefono,
                            String direccion,
                            String referencia,
                            String distrito) {

    public static CuentaCliente de(Cliente c) {
        Usuario u = c.getUsuario();
        return new CuentaCliente(u.getNombres(), u.getApellidos(), u.getEmail(), u.getTelefono(),
                                 c.getDireccion(), c.getReferencia(), c.getDistrito());
    }
}
