package pe.techserv.cliente;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;

import java.time.OffsetDateTime;

/**
 * Una vez al día, de madrugada, elimina las cuentas de cliente que llevan
 * desactivadas más de un mes. Si el servidor estaba apagado a esa hora, lo
 * hace la noche siguiente: mientras tanto el inicio de sesión ya no las
 * reactiva, porque comprueba el plazo por su cuenta.
 */
@Configuration
@EnableScheduling
public class LimpiezaCuentas {

    private final ServicioCuentaCliente cuentas;

    public LimpiezaCuentas(ServicioCuentaCliente cuentas) {
        this.cuentas = cuentas;
    }

    @Scheduled(cron = "0 15 3 * * *", zone = "America/Lima")
    public void eliminarVencidas() {
        cuentas.eliminarVencidas(OffsetDateTime.now());
    }
}
